import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyVenues, createVenue, createMatch, getMyMatches, setMatchResult } from '../services/venues';
import { getCurrentUser, logout } from '../services/auth';
import { validateWithAI } from '../services/ai';

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

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    fetchData();
  }, []);

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
        <Link to="/owner" className="text-2xl font-bold text-sky-400">Fulvo</Link>
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
                      <div key={match.id} className="bg-gray-800 rounded-lg p-4">
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
                      <div key={match.id} className="bg-gray-800 rounded-lg p-4">
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
                                onClick={() => openResultModal(match)}
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
    </div>
  );
}

export default OwnerDashboard;
