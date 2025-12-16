import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyProfile, getMyMatches } from '../services/players';
import { logout } from '../services/auth';

function PlayerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileData, matchesData] = await Promise.all([
        getMyProfile(),
        getMyMatches()
      ]);
      setProfile(profileData);
      setMatches(matchesData);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
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
    const options = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-AR', options);
  };

  // Separar partidos futuros y pasados
  const proximosPartidos = matches.filter(m => m.estado === 'futuro');
  const partidosPasados = matches.filter(m => m.estado === 'pasado');

  // Calcular estadísticas
  const partidosJugados = profile?.partidos_jugados || 0;
  const goles = profile?.goles || 0;
  const asistencias = profile?.asistencias || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <span className="text-2xl bg-sky-500 rounded-full w-10 h-10 flex items-center justify-center">👤</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Link to="/player" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          ← Volver
        </Link>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-white mb-1">{profile?.nombre}</h1>
          <p className="text-gray-400 mb-3">{profile?.email}</p>
          {profile?.posicion && (
            <span className="inline-block bg-sky-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
              {profile.posicion}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Estadísticas</h2>

          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-sky-400">{partidosJugados}</p>
              <p className="text-sm text-gray-400">Jugados</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-sky-400">{goles}</p>
              <p className="text-sm text-gray-400">Goles</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-2xl font-bold text-sky-400">{asistencias}</p>
              <p className="text-sm text-gray-400">Asistencias</p>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">Partidos anotados</p>
            <p className="text-3xl font-bold text-white">{matches.length}</p>
            <p className="text-sm text-gray-400">
              {proximosPartidos.length} próximos · {partidosPasados.length} jugados
            </p>
          </div>
        </div>

        {/* Upcoming Matches */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Próximos Partidos ({proximosPartidos.length})
          </h2>
          {proximosPartidos.length > 0 ? (
            <div className="space-y-3">
              {proximosPartidos.map((partido) => (
                <Link
                  key={partido.id}
                  to={`/player/match/${partido.id}`}
                  className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{partido.cancha_nombre}</p>
                      <p className="text-sm text-gray-400">{formatDate(partido.fecha)}</p>
                      <p className="text-sm text-gray-400">{partido.zona}</p>
                    </div>
                    <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded">
                      Próximo
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No tenés partidos próximos</p>
          )}
        </div>

        {/* Past Matches */}
        {partidosPasados.length > 0 && (
          <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Historial ({partidosPasados.length})
            </h2>
            <div className="space-y-3">
              {partidosPasados.slice(0, 5).map((partido) => (
                <div
                  key={partido.id}
                  className="p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{partido.cancha_nombre}</p>
                      <p className="text-sm text-gray-400">{formatDate(partido.fecha)}</p>
                      <p className="text-sm text-gray-400">{partido.zona}</p>
                    </div>
                    <span className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                      Jugado
                    </span>
                  </div>
                </div>
              ))}
              {partidosPasados.length > 5 && (
                <p className="text-center text-gray-500 text-sm">
                  +{partidosPasados.length - 5} partidos más
                </p>
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition"
        >
          Cerrar Sesión
        </button>
      </main>
    </div>
  );
}

export default PlayerProfile;
