import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMyProfile, getMyMatches, getPlayerById } from '../services/players';
import { getFriendshipStatus, sendFriendRequest, removeFriend, acceptFriendRequest } from '../services/friends';
import { logout, getCurrentUser } from '../services/auth';
import { getPositionData } from '../utils/positions';

function PlayerProfile() {
  const navigate = useNavigate();
  const { id } = useParams(); // Si hay id, estamos viendo otro perfil
  const currentUser = getCurrentUser();

  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estado de amistad (solo cuando veo otro perfil)
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [friendshipId, setFriendshipId] = useState(null);
  const [processingFriendship, setProcessingFriendship] = useState(false);

  const isMyProfile = !id || (currentUser && parseInt(id) === currentUser.id);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      if (isMyProfile) {
        // Mi propio perfil
        const [profileData, matchesData] = await Promise.all([
          getMyProfile(),
          getMyMatches()
        ]);
        setProfile(profileData);
        setMatches(matchesData);
      } else {
        // Perfil de otro jugador
        const profileData = await getPlayerById(id);
        setProfile(profileData);
        setMatches(profileData.ultimos_partidos || []);

        // Obtener estado de amistad
        if (currentUser) {
          const status = await getFriendshipStatus(parseInt(id));
          setFriendshipStatus(status.relacion);
          setFriendshipId(status.amistad_id);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      setProcessingFriendship(true);
      setError('');
      await sendFriendRequest(parseInt(id));
      setFriendshipStatus('solicitud_enviada');
      setSuccess('Solicitud de amistad enviada');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setProcessingFriendship(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setProcessingFriendship(true);
      setError('');
      await acceptFriendRequest(friendshipId);
      setFriendshipStatus('amigo');
      setSuccess(`Ahora sos amigo de ${profile.nombre}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al aceptar solicitud');
    } finally {
      setProcessingFriendship(false);
    }
  };

  const handleRemoveFriend = async () => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar a ${profile.nombre} de tus amigos?`);
    if (!confirmar) return;

    try {
      setProcessingFriendship(true);
      setError('');
      await removeFriend(friendshipId);
      setFriendshipStatus('ninguna');
      setFriendshipId(null);
      setSuccess('Amigo eliminado');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar amigo');
    } finally {
      setProcessingFriendship(false);
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

  // Separar partidos futuros y pasados (solo para mi perfil)
  const proximosPartidos = isMyProfile ? matches.filter(m => m.estado === 'futuro') : [];
  const partidosPasados = isMyProfile ? matches.filter(m => m.estado === 'pasado') : matches;

  // Calcular estadísticas
  const partidosJugados = profile?.partidos_jugados || 0;
  const partidosGanados = profile?.partidos_ganados || 0;
  const ranking = profile?.ranking || 50;
  const porcentajeVictorias = profile?.porcentaje_victorias ||
    (partidosJugados > 0 ? Math.round((partidosGanados / partidosJugados) * 100) : 0);

  const getResultadoStyle = (resultado) => {
    switch (resultado) {
      case 'victoria': return 'bg-green-500/20 text-green-400';
      case 'derrota': return 'bg-red-500/20 text-red-400';
      case 'empate': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getResultadoText = (resultado) => {
    switch (resultado) {
      case 'victoria': return 'V';
      case 'derrota': return 'D';
      case 'empate': return 'E';
      default: return '-';
    }
  };

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
        <Link to="/player"><img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" /></Link>
        <span className="text-2xl bg-sky-500 rounded-full w-10 h-10 flex items-center justify-center">👤</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Link to={isMyProfile ? "/player" : "/amigos"} className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          ← Volver
        </Link>

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

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6 text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-white mb-1">{profile?.nombre}</h1>
          {isMyProfile && <p className="text-gray-400 mb-3">{profile?.email}</p>}
          {profile?.posicion && (() => {
            const posData = getPositionData(profile.posicion);
            return posData && (
              <span className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full mb-4 border ${posData.color}`}>
                <span className="text-lg">{posData.icon}</span>
                <span>{posData.label}</span>
              </span>
            );
          })()}

          {/* Botón de amistad (solo si estoy viendo otro perfil) */}
          {!isMyProfile && currentUser && (
            <div className="mt-4">
              {friendshipStatus === 'amigo' && (
                <div className="flex items-center justify-center gap-3">
                  <span className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg font-semibold">
                    Son amigos
                  </span>
                  <button
                    onClick={handleRemoveFriend}
                    disabled={processingFriendship}
                    className="text-gray-400 hover:text-red-400 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              )}
              {friendshipStatus === 'solicitud_enviada' && (
                <span className="bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg font-semibold">
                  Solicitud enviada
                </span>
              )}
              {friendshipStatus === 'solicitud_recibida' && (
                <button
                  onClick={handleAcceptRequest}
                  disabled={processingFriendship}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-800 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  {processingFriendship ? 'Procesando...' : 'Aceptar solicitud'}
                </button>
              )}
              {friendshipStatus === 'ninguna' && (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={processingFriendship}
                  className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  {processingFriendship ? 'Enviando...' : 'Agregar amigo'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Estadísticas</h2>

          <div className="grid grid-cols-4 gap-3 text-center mb-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-2xl font-bold text-sky-400">{ranking}</p>
              <p className="text-xs text-gray-400">Ranking</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{partidosJugados}</p>
              <p className="text-xs text-gray-400">PJ</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-400">{partidosGanados}</p>
              <p className="text-xs text-gray-400">PG</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <p className="text-2xl font-bold text-yellow-400">{porcentajeVictorias}%</p>
              <p className="text-xs text-gray-400">Victorias</p>
            </div>
          </div>

          {/* Últimos 5 partidos (historial rápido) */}
          {!isMyProfile && partidosPasados.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">Últimos partidos:</p>
              <div className="flex gap-2 justify-center">
                {partidosPasados.slice(0, 5).map((partido, index) => (
                  <div
                    key={partido.id || index}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getResultadoStyle(partido.resultado)}`}
                    title={`${partido.cancha_nombre} - ${formatDate(partido.fecha)}`}
                  >
                    {getResultadoText(partido.resultado)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Matches (solo mi perfil) */}
        {isMyProfile && (
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
        )}

        {/* Past Matches (solo mi perfil, con más detalle) */}
        {isMyProfile && partidosPasados.length > 0 && (
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

        {/* Logout (solo mi perfil) */}
        {isMyProfile && (
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition"
          >
            Cerrar Sesión
          </button>
        )}
      </main>
    </div>
  );
}

export default PlayerProfile;
