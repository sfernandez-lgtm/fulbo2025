import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMatchById, joinMatch, leaveMatch } from '../services/matches';
import { getCurrentUser } from '../services/auth';

function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [success, setSuccess] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const data = await getMatchById(id);
      setMatch(data);

      // Verificar si el usuario ya está anotado
      if (data.jugadores && currentUser) {
        const isJoined = data.jugadores.some(j => j.id === currentUser.id);
        setJoined(isJoined);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar el partido');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    setSuccess('');
    setJoining(true);

    try {
      await joinMatch(id);
      setJoined(true);
      setSuccess('¡Te anotaste al partido!');
      fetchMatch(); // Recargar datos
    } catch (err) {
      setError(err.response?.data?.error || 'Error al anotarse');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setError('');
    setSuccess('');
    setJoining(true);

    try {
      await leaveMatch(id);
      setJoined(false);
      setSuccess('Saliste del partido');
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al salir del partido');
    } finally {
      setJoining(false);
    }
  };

  // Formatear fecha
  const formatDate = (fecha) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('es-AR', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando partido...</p>
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="min-h-screen bg-gray-900">
        <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
          <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
          <Link to="/player/profile" className="text-2xl">👤</Link>
        </header>
        <main className="p-6 max-w-2xl mx-auto">
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
            {error}
          </div>
          <Link to="/player" className="inline-flex items-center text-gray-400 hover:text-white mt-4">
            ← Volver
          </Link>
        </main>
      </div>
    );
  }

  const jugadoresAnotados = match?.jugadores || [];
  const jugadoresActuales = jugadoresAnotados.length;
  const jugadoresTotales = match?.max_jugadores || 14;
  const partidoLleno = jugadoresActuales >= jugadoresTotales;
  const porcentajeOcupacion = (jugadoresActuales / jugadoresTotales) * 100;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <Link to="/player/profile" className="text-2xl">👤</Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Link to="/player" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
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

        {/* Match Info */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-4">{match?.cancha_nombre}</h1>

          <div className="space-y-3 text-gray-400 mb-6">
            <p className="flex items-center gap-2">
              <span>📅</span> {formatDate(match?.fecha)}
            </p>
            {match?.hora_inicio && (
              <p className="flex items-center gap-2">
                <span>🕐</span> {match.hora_inicio} - {match.hora_fin}
              </p>
            )}
            <p className="flex items-center gap-2">
              <span>📍</span> {match?.direccion}, {match?.zona}
            </p>
            {match?.organizador_nombre && (
              <p className="flex items-center gap-2">
                <span>👤</span> Organiza: {match.organizador_nombre}
              </p>
            )}
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400 mb-1">Precio por jugador</p>
            <p className="text-3xl font-bold text-sky-400">${match?.precio_por_jugador || 0}</p>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Cupos</span>
              <span className="font-semibold text-white">{jugadoresActuales}/{jugadoresTotales} jugadores</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${partidoLleno ? 'bg-green-500' : 'bg-sky-500'}`}
                style={{ width: `${porcentajeOcupacion}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Jugadores Anotados ({jugadoresActuales})
          </h2>
          {jugadoresAnotados.length > 0 ? (
            <div className="space-y-3">
              {jugadoresAnotados.map((jugador) => (
                <div key={jugador.id} className="flex items-center gap-3 text-gray-300">
                  <span>⚽</span>
                  <span>{jugador.nombre}</span>
                  {jugador.posicion && (
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-400">
                      {jugador.posicion}
                    </span>
                  )}
                  {jugador.id === currentUser?.id && (
                    <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded">
                      Vos
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Todavía no hay jugadores anotados</p>
          )}
        </div>

        {/* Action Button */}
        {joined ? (
          <div className="space-y-3">
            <div className="w-full bg-green-500/20 border border-green-500 text-green-400 font-semibold py-4 rounded-xl text-center">
              ✓ Ya estás anotado
            </div>
            <button
              onClick={handleLeave}
              disabled={joining}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white font-semibold py-3 rounded-xl transition"
            >
              {joining ? 'Saliendo...' : 'Salir del partido'}
            </button>
          </div>
        ) : partidoLleno ? (
          <button
            disabled
            className="w-full bg-gray-700 text-gray-500 font-semibold py-4 rounded-xl cursor-not-allowed"
          >
            Partido Completo
          </button>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-4 rounded-xl transition"
          >
            {joining ? 'Anotándote...' : 'Anotarme a este partido'}
          </button>
        )}
      </main>
    </div>
  );
}

export default MatchDetail;
