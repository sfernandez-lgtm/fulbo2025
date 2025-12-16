import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMatches } from '../services/matches';

function PlayerHome() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const data = await getMatches();
        setMatches(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar partidos');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  // Formatear fecha para mostrar
  const formatDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-AR', options);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <Link to="/player/profile" className="text-2xl">👤</Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Partidos Disponibles</h1>

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
            No hay partidos disponibles
          </div>
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
