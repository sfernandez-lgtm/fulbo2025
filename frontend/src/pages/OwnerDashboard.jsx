import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyVenues, createVenue, createMatch, getMyMatches, setMatchResult, getMatchDetail, assignTeams } from '../services/venues';
import { getCurrentUser, logout } from '../services/auth';
import { validateWithAI } from '../services/ai';
import { createSubscription } from '../services/payments';
import { confirmPayment, blockPlayer } from '../services/matches';
import { getOwnerStats, getMonthlyStats } from '../services/owners';
import ChatWidget from '../components/ChatWidget';

function OwnerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [venues, setVenues] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms visibility
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchDetail, setShowMatchDetail] = useState(false);
  const [matchDetail, setMatchDetail] = useState(null);
  const [equipos, setEquipos] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assigningTeams, setAssigningTeams] = useState(false);

  // Form states
  const [newVenue, setNewVenue] = useState({
    nombre: '',
    direccion: '',
    zona: '',
    precio_hora: ''
  });

  const [newMatch, setNewMatch] = useState({
    cancha_id: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    precio_por_jugador: '',
    max_jugadores: '14'
  });

  // Result modal states
  const [resultadoLocal, setResultadoLocal] = useState('');
  const [resultadoVisitante, setResultadoVisitante] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [aiValidation, setAiValidation] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validating, setValidating] = useState(false);

  // Subscription states
  const [suscripcionActiva, setSuscripcionActiva] = useState(false);
  const [suscripcionVence, setSuscripcionVence] = useState(null);
  const [activandoSuscripcion, setActivandoSuscripcion] = useState(false);

  // Payment confirmation states
  const [confirmingPayment, setConfirmingPayment] = useState(null);
  const [blockingPlayer, setBlockingPlayer] = useState(null);

  // Stats states
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    fetchData();
    fetchSubscriptionStatus();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const [statsData, monthlyData] = await Promise.all([
        getOwnerStats(),
        getMonthlyStats()
      ]);
      setStats(statsData);
      setMonthlyStats(monthlyData);
    } catch (err) {
      console.error('Error cargando stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/payments/status/check`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuscripcionActiva(data.suscripcion_activa);
        setSuscripcionVence(data.suscripcion_vence);
      }
    } catch (err) {
      console.error('Error obteniendo estado de suscripción:', err);
    }
  };

  const handleActivarSuscripcion = async () => {
    setActivandoSuscripcion(true);
    setError('');

    try {
      const result = await createSubscription('dueno');
      // Redirigir a MercadoPago
      window.location.href = result.sandbox_init_point || result.init_point;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear suscripción');
      setActivandoSuscripcion(false);
    }
  };

  const formatSubscriptionDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [venuesData, matchesData] = await Promise.all([
        getMyVenues(),
        getMyMatches()
      ]);
      setVenues(venuesData);
      setMyMatches(matchesData);
      if (venuesData.length > 0) {
        setNewMatch(prev => ({ ...prev, cancha_id: venuesData[0].id }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await createVenue({
        ...newVenue,
        precio_hora: Number(newVenue.precio_hora) || 0
      });
      setSuccess('Cancha creada exitosamente');
      setNewVenue({ nombre: '', direccion: '', zona: '', precio_hora: '' });
      setShowCreateVenue(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear cancha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidating(true);

    const matchData = {
      cancha_id: Number(newMatch.cancha_id),
      fecha: newMatch.fecha,
      hora_inicio: newMatch.hora_inicio,
      hora_fin: newMatch.hora_fin,
      precio_por_jugador: Number(newMatch.precio_por_jugador) || 0,
      max_jugadores: Number(newMatch.max_jugadores) || 14
    };

    try {
      // Validar con IA primero
      const validation = await validateWithAI('match', matchData);
      setValidating(false);

      if (!validation.valid) {
        // Mostrar modal de confirmación
        setAiValidation(validation);
        setShowConfirmModal(true);
        return;
      }

      // Si es válido, crear directamente
      await createMatchDirectly(matchData);
    } catch (err) {
      setValidating(false);
      setError(err.response?.data?.error || 'Error al validar');
    }
  };

  const createMatchDirectly = async (matchData) => {
    setSubmitting(true);
    try {
      await createMatch(matchData);
      setSuccess('Partido creado exitosamente');
      setNewMatch({
        cancha_id: venues[0]?.id || '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        precio_por_jugador: '',
        max_jugadores: '14'
      });
      setShowCreateMatch(false);
      setShowConfirmModal(false);
      setAiValidation(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear partido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCreate = () => {
    const matchData = {
      cancha_id: Number(newMatch.cancha_id),
      fecha: newMatch.fecha,
      hora_inicio: newMatch.hora_inicio,
      hora_fin: newMatch.hora_fin,
      precio_por_jugador: Number(newMatch.precio_por_jugador) || 0,
      max_jugadores: Number(newMatch.max_jugadores) || 14
    };
    createMatchDirectly(matchData);
  };

  const openMatchDetail = async (match) => {
    setSelectedMatch(match);
    setShowMatchDetail(true);
    setLoadingDetail(true);
    setEquipos(null);
    setError('');

    try {
      const detail = await getMatchDetail(match.id);
      setMatchDetail(detail);

      // Verificar si ya hay equipos asignados
      const jugadoresConEquipo = detail.jugadores?.filter(j => j.equipo) || [];
      if (jugadoresConEquipo.length > 0) {
        const local = detail.jugadores.filter(j => j.equipo === 'local');
        const visitante = detail.jugadores.filter(j => j.equipo === 'visitante');
        setEquipos({ local, visitante });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar detalle del partido');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAssignTeams = async () => {
    if (!selectedMatch) return;

    setAssigningTeams(true);
    setError('');

    try {
      const result = await assignTeams(selectedMatch.id);
      setEquipos({
        local: result.equipos.local.jugadores,
        visitante: result.equipos.visitante.jugadores
      });
      setSuccess('Equipos asignados exitosamente');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al asignar equipos');
    } finally {
      setAssigningTeams(false);
    }
  };

  const closeMatchDetail = () => {
    setShowMatchDetail(false);
    setSelectedMatch(null);
    setMatchDetail(null);
    setEquipos(null);
  };

  // Handler para confirmar pago de un jugador
  const handleConfirmPayment = async (playerId) => {
    if (!selectedMatch) return;

    setConfirmingPayment(playerId);
    setError('');

    try {
      await confirmPayment(selectedMatch.id, playerId);
      // Actualizar el estado local del jugador
      setMatchDetail(prev => ({
        ...prev,
        jugadores: prev.jugadores.map(j =>
          j.id === playerId ? { ...j, pago_confirmado: true } : j
        )
      }));
      setSuccess('Pago confirmado');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al confirmar pago');
    } finally {
      setConfirmingPayment(null);
    }
  };

  // Handler para bloquear jugador por no pagar
  const handleBlockPlayer = async (playerId, playerName) => {
    if (!selectedMatch) return;

    const confirmar = window.confirm(`¿Estás seguro de bloquear a ${playerName}? No podrá anotarse a nuevos partidos.`);
    if (!confirmar) return;

    setBlockingPlayer(playerId);
    setError('');

    try {
      await blockPlayer(selectedMatch.id, playerId);
      setSuccess(`Cuenta de ${playerName} bloqueada`);
      // Refrescar detalle del partido
      const detail = await getMatchDetail(selectedMatch.id);
      setMatchDetail(detail);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al bloquear jugador');
    } finally {
      setBlockingPlayer(null);
    }
  };

  // Calcular totales de recaudación
  const calcularRecaudacion = () => {
    if (!matchDetail?.jugadores || !selectedMatch?.precio_por_jugador) return { recaudado: 0, esperado: 0 };
    const pagados = matchDetail.jugadores.filter(j => j.pago_confirmado).length;
    const total = matchDetail.jugadores.length;
    const precio = selectedMatch.precio_por_jugador || 0;
    return {
      recaudado: pagados * precio,
      esperado: total * precio,
      pagados,
      total
    };
  };

  const openResultFromDetail = () => {
    setShowMatchDetail(false);
    setResultadoLocal('');
    setResultadoVisitante('');
    setShowResultModal(true);
  };

  const openResultModal = (match) => {
    setSelectedMatch(match);
    setResultadoLocal(match.resultado_local?.toString() || '');
    setResultadoVisitante(match.resultado_visitante?.toString() || '');
    setShowResultModal(true);
  };

  const handleSaveResult = async () => {
    if (!selectedMatch) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await setMatchResult(
        selectedMatch.id,
        Number(resultadoLocal),
        Number(resultadoVisitante)
      );
      setSuccess('Resultado cargado exitosamente');
      setShowResultModal(false);
      setSelectedMatch(null);
      setResultadoLocal('');
      setResultadoVisitante('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar resultado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Formatear fecha
  const formatDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-AR', options);
  };

  // Separar partidos
  const partidosPendientes = myMatches.filter(m => m.estado_actual === 'pendiente');
  const partidosPasados = myMatches.filter(m => m.estado_actual === 'pasado' || m.estado_actual === 'jugado');

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/owner"><img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" /></Link>
        <span className="text-gray-400 font-medium">{user?.nombre || 'Mi Cuenta'}</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Subscription Banner */}
        {!loading && (
          suscripcionActiva && suscripcionVence ? (
            <div className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <p className="text-green-400 font-semibold">Suscripción activa</p>
                  <p className="text-green-400/70 text-sm">Vence el {formatSubscriptionDate(suscripcionVence)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-yellow-400 font-semibold">Tu suscripción está inactiva</p>
                    <p className="text-yellow-400/70 text-sm">No podés crear partidos hasta activarla</p>
                  </div>
                </div>
                <button
                  onClick={handleActivarSuscripcion}
                  disabled={activandoSuscripcion}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-800 text-black font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
                >
                  {activandoSuscripcion ? 'Procesando...' : 'Activar ($10.000/mes)'}
                </button>
              </div>
            </div>
          )
        )}

        {/* Stats Section - Solo si tiene pagos confirmados */}
        {!loadingStats && stats && stats.jugadores_pagaron > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Estadísticas
            </h2>

            {/* Cards de stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-400/70 text-xs mb-1">💰 Total Recaudado</p>
                <p className="text-green-400 text-xl font-bold">
                  ${stats.total_recaudado.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400/70 text-xs mb-1">📅 Este Mes</p>
                <p className="text-green-300 text-xl font-bold">
                  ${stats.recaudado_mes.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">⚽ Partidos</p>
                <p className="text-white text-xl font-bold">
                  {stats.partidos_total}
                  {stats.partidos_mes > 0 && (
                    <span className="text-sm text-gray-400 font-normal ml-1">
                      ({stats.partidos_mes} este mes)
                    </span>
                  )}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">👥 Jugadores únicos</p>
                <p className="text-white text-xl font-bold">{stats.jugadores_unicos}</p>
              </div>
            </div>

            {/* Mini gráfico de barras */}
            {monthlyStats.length > 0 && (
              <div>
                <p className="text-gray-400 text-sm mb-3">Ingresos últimos 6 meses</p>
                <div className="flex items-end justify-between gap-2 h-24">
                  {monthlyStats.map((month, index) => {
                    const maxIngresos = Math.max(...monthlyStats.map(m => m.ingresos), 1);
                    const height = month.ingresos > 0 ? Math.max((month.ingresos / maxIngresos) * 100, 8) : 4;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className={`w-full rounded-t transition-all ${month.ingresos > 0 ? 'bg-green-500' : 'bg-gray-600'}`}
                          style={{ height: `${height}%` }}
                          title={`$${month.ingresos.toLocaleString()}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">{month.mes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partido top */}
            {stats.partido_top && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-xs mb-1">🏆 Mejor partido</p>
                <p className="text-white font-medium">
                  {stats.partido_top.cancha_nombre || stats.partido_top.nombre}
                  <span className="text-green-400 ml-2">
                    ${stats.partido_top.recaudacion?.toLocaleString()}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-400 py-10">
            Cargando...
          </div>
        )}

        {/* No venues - show create venue form */}
        {!loading && venues.length === 0 && !showCreateVenue && (
          <div className="text-center py-10">
            <p className="text-gray-400 mb-4">No tenés canchas registradas</p>
            <button
              onClick={() => setShowCreateVenue(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              + Agregar mi primera cancha
            </button>
          </div>
        )}

        {/* Create Venue Form */}
        {showCreateVenue && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Cancha</h2>
            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newVenue.nombre}
                  onChange={(e) => setNewVenue({ ...newVenue, nombre: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Cancha Los Amigos"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Dirección</label>
                <input
                  type="text"
                  value={newVenue.direccion}
                  onChange={(e) => setNewVenue({ ...newVenue, direccion: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Av. del Libertador 4500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Zona</label>
                <input
                  type="text"
                  value={newVenue.zona}
                  onChange={(e) => setNewVenue({ ...newVenue, zona: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Palermo, CABA"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Precio por hora ($)</label>
                <input
                  type="number"
                  value={newVenue.precio_hora}
                  onChange={(e) => setNewVenue({ ...newVenue, precio_hora: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="50000"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition"
                >
                  {submitting ? 'Creando...' : 'Crear Cancha'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateVenue(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Venues List */}
        {!loading && venues.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Mis Canchas</h1>
              <button
                onClick={() => setShowCreateVenue(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {venues.map((venue) => (
                <div key={venue.id} className="bg-gray-800 rounded-xl shadow-md p-5">
                  <h2 className="text-lg font-semibold text-white mb-1">{venue.nombre}</h2>
                  <p className="text-gray-400 mb-2 flex items-center gap-2">
                    <span>📍</span> {venue.direccion}, {venue.zona}
                  </p>
                  {venue.precio_hora && (
                    <p className="text-sky-400 font-semibold">${venue.precio_hora}/hora</p>
                  )}
                </div>
              ))}
            </div>

            {/* Create Match Section */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Crear Partido</h2>
            </div>

            {!showCreateMatch ? (
              <button
                onClick={() => setShowCreateMatch(true)}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-4 rounded-xl transition mb-6"
              >
                + Crear Partido
              </button>
            ) : (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <form onSubmit={handleCreateMatch} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Cancha</label>
                    <select
                      value={newMatch.cancha_id}
                      onChange={(e) => setNewMatch({ ...newMatch, cancha_id: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      required
                    >
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Fecha</label>
                    <input
                      type="date"
                      value={newMatch.fecha}
                      onChange={(e) => setNewMatch({ ...newMatch, fecha: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Hora inicio</label>
                      <input
                        type="time"
                        value={newMatch.hora_inicio}
                        onChange={(e) => setNewMatch({ ...newMatch, hora_inicio: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Hora fin</label>
                      <input
                        type="time"
                        value={newMatch.hora_fin}
                        onChange={(e) => setNewMatch({ ...newMatch, hora_fin: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Precio por jugador ($)</label>
                      <input
                        type="number"
                        value={newMatch.precio_por_jugador}
                        onChange={(e) => setNewMatch({ ...newMatch, precio_por_jugador: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="5000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Máx. jugadores</label>
                      <input
                        type="number"
                        value={newMatch.max_jugadores}
                        onChange={(e) => setNewMatch({ ...newMatch, max_jugadores: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="14"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting || validating}
                      className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition"
                    >
                      {validating ? 'Validando...' : submitting ? 'Creando...' : 'Crear Partido'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateMatch(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* My Matches Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">Mis Partidos ({myMatches.length})</h2>

              {/* Pending Matches */}
              {partidosPendientes.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Próximos</h3>
                  <div className="space-y-3">
                    {partidosPendientes.map((match) => (
                      <div
                        key={match.id}
                        className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition"
                        onClick={() => openMatchDetail(match)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-white">{match.cancha_nombre}</p>
                            <p className="text-sm text-gray-400">
                              {formatDate(match.fecha)} · {match.hora_inicio} - {match.hora_fin}
                            </p>
                            <p className="text-sm text-gray-400">
                              👥 {match.jugadores_anotados}/{match.max_jugadores} jugadores
                            </p>
                          </div>
                          <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded">
                            Pendiente
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Matches */}
              {partidosPasados.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Finalizados</h3>
                  <div className="space-y-3">
                    {partidosPasados.map((match) => (
                      <div
                        key={match.id}
                        className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition"
                        onClick={() => openMatchDetail(match)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-white">{match.cancha_nombre}</p>
                            <p className="text-sm text-gray-400">
                              {formatDate(match.fecha)} · {match.hora_inicio} - {match.hora_fin}
                            </p>
                            <p className="text-sm text-gray-400">
                              👥 {match.jugadores_anotados}/{match.max_jugadores} jugadores
                            </p>
                          </div>
                          <div className="text-right">
                            {match.estado_actual === 'jugado' && match.resultado_local !== null ? (
                              <div className="bg-green-500/20 text-green-400 px-3 py-2 rounded">
                                <span className="font-bold">{match.resultado_local}</span>
                                <span className="mx-1">-</span>
                                <span className="font-bold">{match.resultado_visitante}</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openResultModal(match);
                                }}
                                className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-3 py-2 rounded text-sm font-semibold transition"
                              >
                                Cargar Resultado
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myMatches.length === 0 && (
                <p className="text-gray-500 text-center py-4">No tenés partidos creados</p>
              )}
            </div>
          </>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition"
        >
          Cerrar Sesión
        </button>
      </main>

      {/* Match Detail Modal */}
      {showMatchDetail && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedMatch.cancha_nombre}</h3>
                <p className="text-gray-400">
                  {formatDate(selectedMatch.fecha)} · {selectedMatch.hora_inicio} - {selectedMatch.hora_fin}
                </p>
              </div>
              <button
                onClick={closeMatchDetail}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {loadingDetail ? (
              <div className="text-center text-gray-400 py-8">Cargando...</div>
            ) : (
              <>
                {/* Resumen de recaudación */}
                {matchDetail?.jugadores?.length > 0 && (
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-400 text-sm">Recaudación</p>
                        <p className="text-white font-bold text-xl">
                          ${calcularRecaudacion().recaudado.toLocaleString()} / ${calcularRecaudacion().esperado.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Pagos confirmados</p>
                        <p className="text-white font-bold text-xl">
                          {calcularRecaudacion().pagados}/{calcularRecaudacion().total}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de jugadores con estado de pago */}
                {matchDetail?.jugadores?.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Jugadores ({matchDetail.jugadores.length}/{selectedMatch.max_jugadores})
                    </h4>
                    <div className="space-y-2">
                      {matchDetail.jugadores.map((j) => (
                        <div key={j.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-white font-medium">{j.nombre}</p>
                              <p className="text-gray-400 text-xs">
                                {j.posicion || 'Sin posición'}
                                {j.ranking && ` · Ranking: ${j.ranking}`}
                                {j.equipo && (
                                  <span className={j.equipo === 'local' ? ' text-blue-400' : ' text-red-400'}>
                                    {' '}· {j.equipo === 'local' ? 'Local' : 'Visitante'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {j.pago_confirmado ? (
                              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm font-semibold">
                                Pagó
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleConfirmPayment(j.id)}
                                  disabled={confirmingPayment === j.id}
                                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white px-3 py-1 rounded-lg text-sm font-semibold transition"
                                >
                                  {confirmingPayment === j.id ? '...' : 'Confirmar'}
                                </button>
                                <button
                                  onClick={() => handleBlockPlayer(j.id, j.nombre)}
                                  disabled={blockingPlayer === j.id}
                                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white px-3 py-1 rounded-lg text-sm font-semibold transition"
                                >
                                  {blockingPlayer === j.id ? '...' : 'No pagó'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipos si están asignados */}
                {equipos && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-white mb-3">Equipos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-500/20 rounded-lg p-3">
                        <h5 className="text-blue-400 font-semibold mb-2 text-center">Local</h5>
                        <ul className="space-y-1">
                          {equipos.local.map((j) => (
                            <li key={j.id} className="text-gray-300 text-sm">
                              {j.nombre}
                              {j.ranking && <span className="text-gray-500 ml-1">({j.ranking})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-red-500/20 rounded-lg p-3">
                        <h5 className="text-red-400 font-semibold mb-2 text-center">Visitante</h5>
                        <ul className="space-y-1">
                          {equipos.visitante.map((j) => (
                            <li key={j.id} className="text-gray-300 text-sm">
                              {j.nombre}
                              {j.ranking && <span className="text-gray-500 ml-1">({j.ranking})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resultado si ya está cargado */}
                {selectedMatch.estado_actual === 'jugado' && selectedMatch.resultado_local !== null && (
                  <div className="mb-6 text-center">
                    <h4 className="text-lg font-semibold text-white mb-2">Resultado</h4>
                    <div className="bg-green-500/20 text-green-400 px-6 py-3 rounded-lg inline-block">
                      <span className="text-3xl font-bold">{selectedMatch.resultado_local}</span>
                      <span className="mx-3 text-xl">-</span>
                      <span className="text-3xl font-bold">{selectedMatch.resultado_visitante}</span>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="space-y-3">
                  {/* Botón Asignar Equipos: solo si NO está jugado y tiene jugadores */}
                  {selectedMatch.estado_actual !== 'jugado' &&
                   matchDetail?.jugadores?.length >= 2 &&
                   !equipos && (
                    <button
                      onClick={handleAssignTeams}
                      disabled={assigningTeams}
                      className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-purple-800 text-white font-semibold py-3 rounded-lg transition"
                    >
                      {assigningTeams ? 'Asignando...' : 'Asignar Equipos'}
                    </button>
                  )}

                  {/* Botón Cargar Resultado: si tiene equipos y no está jugado */}
                  {equipos && selectedMatch.estado_actual !== 'jugado' && (
                    <button
                      onClick={openResultFromDetail}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-3 rounded-lg transition"
                    >
                      Cargar Resultado
                    </button>
                  )}

                  <button
                    onClick={closeMatchDetail}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-2">Cargar Resultado</h3>
            <p className="text-gray-400 mb-6">
              {selectedMatch.cancha_nombre} - {formatDate(selectedMatch.fecha)}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-300 mb-2 text-center">Equipo Local</label>
                <input
                  type="number"
                  min="0"
                  value={resultadoLocal}
                  onChange={(e) => setResultadoLocal(e.target.value)}
                  className="w-full bg-gray-700 text-white text-center text-2xl font-bold rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-center">Equipo Visitante</label>
                <input
                  type="number"
                  min="0"
                  value={resultadoVisitante}
                  onChange={(e) => setResultadoVisitante(e.target.value)}
                  className="w-full bg-gray-700 text-white text-center text-2xl font-bold rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveResult}
                disabled={submitting || resultadoLocal === '' || resultadoVisitante === ''}
                className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setSelectedMatch(null);
                  setResultadoLocal('');
                  setResultadoVisitante('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación IA */}
      {showConfirmModal && aiValidation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h3 className="text-xl font-bold text-white">Verificación IA</h3>
            </div>
            <p className="text-gray-300 mb-6">{aiValidation.message}</p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCreate}
                disabled={submitting}
                className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition"
              >
                {submitting ? 'Creando...' : 'Crear igual'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setAiValidation(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Corregir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget - Solo para dueños con suscripción activa */}
      {suscripcionActiva && <ChatWidget />}
    </div>
  );
}

export default OwnerDashboard;
