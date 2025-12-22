import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getMatchById, joinMatch, leaveMatch } from '../services/matches';
import { getCurrentUser } from '../services/auth';
import confetti from 'canvas-confetti';
import { getPositionData } from '../utils/positions';

function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [success, setSuccess] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  // Función para lanzar confetti argentino
  const launchConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#75AADB', '#FFFFFF', '#75AADB']; // Celeste y blanco

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleJoin = async () => {
    setError('');
    setSuccess('');
    setJoining(true);

    try {
      await joinMatch(id);
      setJoined(true);
      setShowSuccessModal(true);
      launchConfetti();
      fetchMatch();

      // Cerrar modal después de 3 segundos
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al anotarse');
    } finally {
      setJoining(false);
    }
  };

  // Calcular si faltan menos de 3 horas para el partido
  const getHorasHastaPartido = () => {
    if (!match?.fecha || !match?.hora_inicio) return null;

    const fechaPartido = new Date(match.fecha);
    const [horas, minutos] = match.hora_inicio.split(':');
    fechaPartido.setHours(parseInt(horas), parseInt(minutos), 0, 0);

    const ahora = new Date();
    const horasHasta = (fechaPartido - ahora) / (1000 * 60 * 60);
    return horasHasta;
  };

  const hayPenalizacion = () => {
    const horas = getHorasHastaPartido();
    return horas !== null && horas < 3 && horas > 0;
  };

  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirm = async () => {
    setError('');
    setSuccess('');
    setLeaving(true);

    try {
      const result = await leaveMatch(id);
      setJoined(false);
      setShowLeaveConfirm(false);
      setSuccess(result.message || 'Saliste del partido');
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al salir del partido');
    } finally {
      setLeaving(false);
    }
  };

  const handleLeaveCancel = () => {
    setShowLeaveConfirm(false);
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
      <div
        className="min-h-screen relative flex items-center justify-center"
        style={{
          backgroundImage: 'url(/images/background-arg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/50 fixed" />
        <p className="relative z-10 text-gray-400">Cargando partido...</p>
      </div>
    );
  }

  if (error && !match) {
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
        <div className="absolute inset-0 bg-black/50 fixed" />
        <div className="relative z-10">
          <header className="bg-gray-800/90 backdrop-blur-sm shadow-sm px-6 py-4 flex justify-between items-center">
            <Link to="/player"><img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" /></Link>
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
      </div>
    );
  }

  const jugadoresAnotados = match?.jugadores || [];
  const jugadoresActuales = jugadoresAnotados.length;
  const jugadoresTotales = match?.max_jugadores || 14;
  const partidoLleno = jugadoresActuales >= jugadoresTotales;
  const porcentajeOcupacion = (jugadoresActuales / jugadoresTotales) * 100;

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
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/50 fixed" />

      {/* Contenido */}
      <div className="relative z-10">
        <header className="bg-gray-800/90 backdrop-blur-sm shadow-sm px-6 py-4 flex justify-between items-center">
          <Link to="/player"><img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" /></Link>
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
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-md p-6 mb-6">
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

            <div className="bg-gray-700/80 rounded-lg p-4 mb-6">
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
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Jugadores Anotados ({jugadoresActuales})
            </h2>
            {jugadoresAnotados.length > 0 ? (
              <div className="space-y-3">
                {jugadoresAnotados.map((jugador) => {
                  const posData = getPositionData(jugador.posicion);
                  return (
                    <div key={jugador.id} className="flex items-center gap-3 text-gray-300">
                      <span>{posData?.icon || '⚽'}</span>
                      <span>{jugador.nombre}</span>
                      {posData && (
                        <span className={`text-xs px-2 py-1 rounded border ${posData.color}`}>
                          {posData.label}
                        </span>
                      )}
                      {jugador.id === currentUser?.id && (
                        <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded border border-sky-500/30">
                          Vos
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">Todavía no hay jugadores anotados</p>
            )}
          </div>

          {/* Action Button */}
          {joined ? (
            <div className="space-y-3">
              <div className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-xl text-center text-lg shadow-lg flex items-center justify-center gap-2">
                <span className="text-xl">✓</span> Ya estás anotado
              </div>
              {hayPenalizacion() && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-3 rounded-xl text-sm">
                  ⚠️ Te descontarán 15 puntos por salir tan cerca del partido
                </div>
              )}
              <button
                onClick={handleLeaveClick}
                disabled={leaving}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-red-800 disabled:to-rose-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span className="text-xl">🚪</span>
                {leaving ? 'Saliendo...' : 'Salir del partido'}
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
              className="w-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 hover:from-sky-500 hover:via-sky-600 hover:to-blue-600 disabled:from-sky-800 disabled:to-blue-900 text-white font-bold py-5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3 text-lg"
            >
              <span className="text-2xl">⚽</span>
              {joining ? 'Anotándote...' : 'Anotarme a este partido'}
            </button>
          )}
        </main>
      </div>

      {/* Modal de confirmación para salir */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">¿Salir del partido?</h3>

            {hayPenalizacion() ? (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
                <p className="font-semibold mb-1">⚠️ Atención</p>
                <p className="text-sm">
                  Faltan menos de 3 horas para el partido. Se te descontarán <strong>15 puntos</strong> de ranking por salir ahora.
                </p>
              </div>
            ) : (
              <p className="text-gray-400 mb-4">
                ¿Estás seguro que querés salir de este partido?
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLeaveConfirm}
                disabled={leaving}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white font-semibold py-3 rounded-lg transition"
              >
                {leaving ? 'Saliendo...' : hayPenalizacion() ? 'Salir (-15 pts)' : 'Sí, salir'}
              </button>
              <button
                onClick={handleLeaveCancel}
                disabled={leaving}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito con confetti */}
      {showSuccessModal && (
        <div className="fixed inset-0 flex items-end justify-center p-4 z-50 pointer-events-none">
          <div
            className="bg-gradient-to-r from-sky-500 via-white to-sky-500 rounded-t-3xl p-8 w-full max-w-md text-center shadow-2xl pointer-events-auto animate-slide-up"
            style={{
              animation: 'slideUp 0.5s ease-out'
            }}
          >
            <p className="text-6xl mb-4">🎉</p>
            <h3 className="text-3xl font-black text-sky-900 mb-2">¡ESTÁS DENTRO!</h3>
            <p className="text-sky-700 text-lg">Te anotaste al partido</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="text-4xl">⚽</span>
              <span className="text-4xl">🇦🇷</span>
              <span className="text-4xl">⚽</span>
            </div>
          </div>
        </div>
      )}

      {/* CSS para animación */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default MatchDetail;
