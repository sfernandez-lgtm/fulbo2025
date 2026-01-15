import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMatches, getMatchById } from '../services/matches';
import { getZones } from '../services/venues';
import { getCurrentUser } from '../services/auth';
import { getPositionData } from '../utils/positions';

function PublicHome() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para filtros
  const [zonaFilter, setZonaFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [horarioFilter, setHorarioFilter] = useState('');
  const [zonas, setZonas] = useState([]);

  // Estado para modal de preview
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Verificar si hay usuario logueado
  const currentUser = getCurrentUser();

  // Opciones de fecha - próximos 7 días
  const getDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const formatForAPI = date.toISOString().split('T')[0];

      let label;
      if (i === 0) {
        label = 'Hoy';
      } else if (i === 1) {
        label = 'Mañana';
      } else {
        label = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      options.push({ label, value: formatForAPI });
    }

    return options;
  };

  // Opciones de horario
  const horarioOptions = [
    { label: 'Mañana (6-12hs)', value: 'manana', min: 6, max: 12 },
    { label: 'Tarde (12-18hs)', value: 'tarde', min: 12, max: 18 },
    { label: 'Noche (18-24hs)', value: 'noche', min: 18, max: 24 },
  ];

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {};
      if (zonaFilter) filters.zona = zonaFilter;
      if (fechaFilter) filters.fecha = fechaFilter;

      let data = await getMatches(Object.keys(filters).length > 0 ? filters : undefined);

      // Filtrar por horario en el cliente
      if (horarioFilter) {
        const horario = horarioOptions.find(h => h.value === horarioFilter);
        if (horario) {
          data = data.filter(match => {
            if (!match.hora_inicio) return false;
            const hora = parseInt(match.hora_inicio.split(':')[0], 10);
            return hora >= horario.min && hora < horario.max;
          });
        }
      }

      setMatches(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const data = await getZones();
        setZonas(data);
      } catch (err) {
        console.error('Error cargando zonas:', err);
      }
    };
    fetchZones();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [zonaFilter, fechaFilter, horarioFilter]);

  const clearFilters = () => {
    setZonaFilter('');
    setFechaFilter('');
    setHorarioFilter('');
  };

  // Formatear fecha para mostrar
  const formatDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const options = { weekday: 'long', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('es-AR', options);
  };

  const formatTime = (horaInicio, horaFin) => {
    if (!horaInicio) return '';
    return horaFin ? `${horaInicio} - ${horaFin}` : horaInicio;
  };

  const hasActiveFilters = zonaFilter || fechaFilter || horarioFilter;

  // Determinar si es de día o noche según la hora
  const isDayTime = (horaInicio) => {
    if (!horaInicio) return true;
    const hora = parseInt(horaInicio.split(':')[0], 10);
    return hora < 18;
  };

  // Abrir preview del partido
  const handleMatchClick = async (matchId) => {
    setLoadingPreview(true);
    setShowPreview(true);
    try {
      const data = await getMatchById(matchId);
      setSelectedMatch(data);
    } catch (err) {
      console.error('Error cargando partido:', err);
      setSelectedMatch(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Cerrar preview
  const closePreview = () => {
    setShowPreview(false);
    setSelectedMatch(null);
  };

  // Ir al registro
  const handleRegister = () => {
    navigate('/register');
  };

  // Ir al login
  const handleLogin = () => {
    navigate('/login');
  };

  // Si el usuario está logueado, ir directo al partido
  const handleGoToMatch = (matchId) => {
    if (currentUser) {
      navigate(`/player/match/${matchId}`);
    } else {
      handleMatchClick(matchId);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/images/background-arg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 bg-black/50 fixed" />

      {/* Contenido */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-gray-800/90 backdrop-blur-sm shadow-sm px-6 py-4 flex justify-between items-center">
          <img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" />
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link to="/player" className="text-sky-400 hover:text-sky-300 font-medium">
                  Ir a mis partidos
                </Link>
                <Link to="/player/profile" className="text-2xl hover:scale-110 transition" title="Perfil">👤</Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="text-gray-300 hover:text-white font-medium px-4 py-2"
                >
                  Iniciar Sesión
                </button>
                <button
                  onClick={handleRegister}
                  className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-sky-600/90 to-blue-700/90 backdrop-blur-sm py-8 px-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Encontrá tu próximo partido
          </h1>
          <p className="text-sky-100 text-lg">
            Mirá los partidos disponibles y anotate para jugar
          </p>
        </div>

        <main className="p-6 max-w-4xl mx-auto">
          {/* Filtros */}
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400">Filtrar partidos:</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Filtro de Zona */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Zona</label>
                <select
                  value={zonaFilter}
                  onChange={(e) => setZonaFilter(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Todas las zonas</option>
                  {zonas.map((zona) => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Fecha */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                <select
                  value={fechaFilter}
                  onChange={(e) => setFechaFilter(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Todas las fechas</option>
                  {getDateOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Filtro de Horario */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horario</label>
                <select
                  value={horarioFilter}
                  onChange={(e) => setHorarioFilter(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Todos los horarios</option>
                  {horarioOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center text-gray-400 py-10">
              Cargando partidos...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && matches.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              <p className="text-5xl mb-4">⚽</p>
              <p className="text-xl mb-2">No hay partidos disponibles</p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="text-sky-400 hover:text-sky-300"
                >
                  Ver todos los partidos
                </button>
              ) : (
                <p className="text-gray-500">Volvé pronto para ver nuevos partidos</p>
              )}
            </div>
          )}

          {/* Results count */}
          {!loading && !error && matches.length > 0 && (
            <p className="text-sm text-gray-400 mb-4">
              {matches.length} partido{matches.length !== 1 ? 's' : ''} encontrado{matches.length !== 1 ? 's' : ''}
              {hasActiveFilters && ' con los filtros aplicados'}
            </p>
          )}

          {/* Matches list */}
          {!loading && !error && matches.length > 0 && (
            <div className="space-y-4">
              {matches.map((match) => {
                const cuposDisponibles = (match.max_jugadores || 14) - (match.jugadores_anotados || 0);
                const estaLleno = cuposDisponibles <= 0;
                const ultimosCupos = cuposDisponibles > 0 && cuposDisponibles <= 3;

                return (
                  <div
                    key={match.id}
                    onClick={() => handleGoToMatch(match.id)}
                    className="relative rounded-xl shadow-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-sky-500 transition-all"
                  >
                    {/* Imagen de fondo día/noche */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${isDayTime(match.hora_inicio) ? '/images/cancha-dia.png' : '/images/cancha-noche.png'})`
                      }}
                    />
                    {/* Overlay oscuro */}
                    <div className="absolute inset-0 bg-black/60" />

                    {/* Badge de cupos */}
                    {estaLleno && (
                      <div className="absolute top-3 right-3 z-20 bg-gray-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">
                        COMPLETO
                      </div>
                    )}
                    {ultimosCupos && (
                      <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg">
                        {cuposDisponibles === 1 ? 'ÚLTIMO LUGAR' : `ÚLTIMOS ${cuposDisponibles} LUGARES`}
                      </div>
                    )}

                    {/* Contenido */}
                    <div className="relative z-10 p-5">
                      <div className="flex justify-between items-start mb-3">
                        <h2 className="text-lg font-semibold text-white">{match.cancha_nombre}</h2>
                        <span className="text-lg font-bold text-sky-400 bg-black/40 px-2 py-1 rounded">
                          ${match.precio_por_jugador || 0}
                        </span>
                      </div>

                      <div className="space-y-2 text-gray-200 mb-4">
                        <p className="flex items-center gap-2">
                          <span>📅</span> {formatDate(match.fecha)}
                        </p>
                        <p className="flex items-center gap-2">
                          <span>🕐</span> {formatTime(match.hora_inicio, match.hora_fin)}
                        </p>
                        <p className="flex items-center gap-2">
                          <span>📍</span> {match.zona || match.direccion}
                        </p>
                        <p className="flex items-center gap-2">
                          <span>👥</span> {match.jugadores_anotados || 0}/{match.max_jugadores || 14} jugadores
                        </p>
                      </div>

                      <div
                        className={`block w-full text-center font-semibold py-2 rounded-lg ${
                          estaLleno
                            ? 'bg-gray-600 text-gray-400'
                            : 'bg-sky-500 text-white'
                        }`}
                      >
                        {estaLleno ? 'Ver Detalles' : 'Ver Partido'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA Banner para no logueados */}
          {!currentUser && matches.length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-sky-600 to-blue-700 rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                ¿Querés jugar?
              </h3>
              <p className="text-sky-100 mb-4">
                Registrate gratis y anotate a los partidos que te gusten
              </p>
              <button
                onClick={handleRegister}
                className="bg-white hover:bg-gray-100 text-sky-600 font-bold px-8 py-3 rounded-lg transition"
              >
                Crear cuenta gratis
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={closePreview}
        >
          <div
            className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingPreview ? (
              <div className="p-8 text-center text-gray-400">
                Cargando...
              </div>
            ) : selectedMatch ? (
              <>
                {/* Header del modal */}
                <div className="relative">
                  <div
                    className="h-32 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${isDayTime(selectedMatch.hora_inicio) ? '/images/cancha-dia.png' : '/images/cancha-noche.png'})`
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
                  <button
                    onClick={closePreview}
                    className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/70 rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                {/* Contenido */}
                <div className="p-6 -mt-8 relative">
                  <h2 className="text-2xl font-bold text-white mb-4">{selectedMatch.cancha_nombre}</h2>

                  {/* Info del partido */}
                  <div className="space-y-3 text-gray-300 mb-6">
                    <p className="flex items-center gap-3">
                      <span className="text-xl">📅</span>
                      <span>{formatDate(selectedMatch.fecha)}</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="text-xl">🕐</span>
                      <span>{formatTime(selectedMatch.hora_inicio, selectedMatch.hora_fin)}</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="text-xl">📍</span>
                      <span>{selectedMatch.direccion}, {selectedMatch.zona}</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="text-xl">💰</span>
                      <span className="text-sky-400 font-bold text-xl">${selectedMatch.precio_por_jugador || 0}</span>
                    </p>
                  </div>

                  {/* Cupos */}
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Cupos</span>
                      <span className="font-semibold text-white">
                        {selectedMatch.jugadores?.length || 0}/{selectedMatch.max_jugadores || 14} jugadores
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-sky-500 transition-all"
                        style={{
                          width: `${((selectedMatch.jugadores?.length || 0) / (selectedMatch.max_jugadores || 14)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Jugadores anotados */}
                  {selectedMatch.jugadores && selectedMatch.jugadores.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">
                        Jugadores anotados ({selectedMatch.jugadores.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedMatch.jugadores.map((jugador) => {
                          const posData = getPositionData(jugador.posicion);
                          return (
                            <div key={jugador.id} className="flex items-center gap-2 text-gray-300 text-sm">
                              <span>{posData?.icon || '⚽'}</span>
                              <span>{jugador.nombre}</span>
                              {posData && (
                                <span className={`text-xs px-2 py-0.5 rounded border ${posData.color}`}>
                                  {posData.label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleRegister}
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg"
                  >
                    Registrate para anotarte
                  </button>

                  <p className="text-center text-gray-500 text-sm mt-3">
                    ¿Ya tenés cuenta?{' '}
                    <button onClick={handleLogin} className="text-sky-400 hover:text-sky-300">
                      Iniciá sesión
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-red-400">
                Error al cargar el partido
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicHome;
