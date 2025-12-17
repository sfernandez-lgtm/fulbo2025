import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatches } from '../services/matches';
import { getZones } from '../services/venues';

function PlayerHome() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para filtros
  const [zonaFilter, setZonaFilter] = useState('');
  const [fechaFilter, setFechaFilter] = useState('');
  const [zonas, setZonas] = useState([]);

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
        // Capitalizar primera letra
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      options.push({ label, value: formatForAPI });
    }

    return options;
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {};
      if (zonaFilter) filters.zona = zonaFilter;
      if (fechaFilter) filters.fecha = fechaFilter;

      const data = await getMatches(Object.keys(filters).length > 0 ? filters : undefined);
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
  }, [zonaFilter, fechaFilter]);

  const clearFilters = () => {
    setZonaFilter('');
    setFechaFilter('');
  };

  // Formatear fecha para mostrar
  const formatDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-AR', options);
  };

  const hasActiveFilters = zonaFilter || fechaFilter;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <Link to="/player/profile" className="text-2xl">👤</Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Partidos Disponibles</h1>

        {/* Filtros */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400">Filtrar por:</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <p className="mb-2">No hay partidos disponibles</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sky-400 hover:text-sky-300 text-sm"
              >
                Ver todos los partidos
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && !error && matches.length > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            {matches.length} partido{matches.length !== 1 ? 's' : ''} encontrado{matches.length !== 1 ? 's' : ''}
            {hasActiveFilters && ' con los filtros aplicados'}
          </p>
        )}

        {/* Matches list */}
        {!loading && !error && matches.length > 0 && (
          <div className="space-y-4">
            {matches.map((match) => (
              <div key={match.id} className="bg-gray-800 rounded-xl shadow-md p-5">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold text-white">{match.cancha_nombre}</h2>
                  <span className="text-lg font-bold text-sky-400">
                    ${match.precio_por_jugador || 0}
                  </span>
                </div>

                <div className="space-y-2 text-gray-400 mb-4">
                  <p className="flex items-center gap-2">
                    <span>📅</span> {formatDate(match.fecha)}
                  </p>
                  <p className="flex items-center gap-2">
                    <span>📍</span> {match.zona || match.direccion}
                  </p>
                  <p className="flex items-center gap-2">
                    <span>👥</span> {match.jugadores_anotados || 0}/{match.max_jugadores || 14} jugadores
                  </p>
                </div>

                <Link
                  to={`/player/match/${match.id}`}
                  className="block w-full text-center bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 rounded-lg transition"
                >
                  Ver Partido
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default PlayerHome;
