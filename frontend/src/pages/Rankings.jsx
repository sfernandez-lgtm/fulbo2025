import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRankings, getMyRanking } from '../services/rankings';
import { getCurrentUser } from '../services/auth';

function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [myRanking, setMyRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    fetchRankings(user);
  }, []);

  const fetchRankings = async (user) => {
    try {
      setLoading(true);
      const data = await getRankings();
      setRankings(data);

      // Si el usuario está logueado y es jugador, obtener su ranking
      if (user && user.tipo === 'jugador') {
        try {
          const myData = await getMyRanking();
          // Solo mostrar si no está en el top 50
          const isInTop50 = data.some(r => r.id === user.id);
          if (!isInTop50) {
            setMyRanking(myData);
          }
        } catch (err) {
          console.error('Error obteniendo mi ranking:', err);
        }
      }
    } catch (err) {
      setError('Error al cargar rankings');
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (position) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const getPositionStyle = (position) => {
    if (position === 1) return 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/20 border-yellow-500';
    if (position === 2) return 'bg-gradient-to-r from-gray-400/30 to-gray-500/20 border-gray-400';
    if (position === 3) return 'bg-gradient-to-r from-amber-600/30 to-amber-700/20 border-amber-600';
    return 'bg-gray-800/50 border-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-900 via-gray-900 to-gray-900">
      {/* Header con colores Argentina */}
      <header className="bg-gradient-to-r from-sky-400 via-white to-sky-400 shadow-lg px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link to={currentUser?.tipo === 'jugador' ? '/player' : '/'} className="text-2xl font-bold text-sky-900">
            Fulvo
          </Link>
          <h1 className="text-xl font-bold text-sky-900 flex items-center gap-2">
            Ranking Global
          </h1>
          <Link
            to={currentUser?.tipo === 'jugador' ? '/player' : '/'}
            className="text-sky-900 hover:text-sky-700 font-semibold"
          >
            Volver
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        {/* Título decorativo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-sky-500/20 border border-sky-400 rounded-full px-6 py-3">
            <span className="text-3xl">⚽</span>
            <span className="text-sky-400 font-bold text-lg">Tabla de Posiciones</span>
            <span className="text-3xl">⚽</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-400 py-10">
            <div className="text-4xl mb-4 animate-bounce">⚽</div>
            Cargando rankings...
          </div>
        )}

        {/* Mi ranking si no estoy en top 50 */}
        {!loading && myRanking && (
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-2">Tu posición:</p>
            <div className="bg-sky-500/20 border-2 border-sky-400 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-sky-400 w-12 text-center">
                    #{myRanking.posicion_ranking}
                  </span>
                  <div>
                    <p className="text-white font-semibold">{myRanking.nombre}</p>
                    <p className="text-gray-400 text-sm">{myRanking.posicion || 'Sin posición'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sky-400 font-bold text-xl">{myRanking.ranking}</p>
                  <p className="text-gray-400 text-xs">
                    {myRanking.partidos_jugados} PJ · {myRanking.porcentaje_victorias}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de rankings */}
        {!loading && rankings.length > 0 && (
          <div className="space-y-2">
            {/* Header de la tabla */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-gray-400 text-xs font-semibold uppercase">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Jugador</div>
              <div className="col-span-2 text-center">Ranking</div>
              <div className="col-span-2 text-center">PJ</div>
              <div className="col-span-2 text-center">% Vic</div>
            </div>

            {/* Filas */}
            {rankings.map((player) => {
              const isCurrentUser = currentUser && currentUser.id === player.id;
              const medal = getMedal(player.posicion_ranking);

              return (
                <div
                  key={player.id}
                  className={`
                    grid grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border transition
                    ${getPositionStyle(player.posicion_ranking)}
                    ${isCurrentUser ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-gray-900' : ''}
                  `}
                >
                  {/* Posición */}
                  <div className="col-span-1">
                    {medal ? (
                      <span className="text-2xl">{medal}</span>
                    ) : (
                      <span className="text-gray-400 font-bold">{player.posicion_ranking}</span>
                    )}
                  </div>

                  {/* Nombre y posición */}
                  <div className="col-span-5">
                    <p className={`font-semibold ${isCurrentUser ? 'text-sky-400' : 'text-white'}`}>
                      {player.nombre}
                      {isCurrentUser && <span className="ml-2 text-xs">(Vos)</span>}
                    </p>
                    <p className="text-gray-400 text-xs">{player.posicion || 'Sin posición'}</p>
                  </div>

                  {/* Ranking */}
                  <div className="col-span-2 text-center">
                    <span className={`font-bold ${
                      player.posicion_ranking === 1 ? 'text-yellow-400' :
                      player.posicion_ranking === 2 ? 'text-gray-300' :
                      player.posicion_ranking === 3 ? 'text-amber-500' :
                      'text-sky-400'
                    }`}>
                      {player.ranking}
                    </span>
                  </div>

                  {/* Partidos jugados */}
                  <div className="col-span-2 text-center text-gray-300">
                    {player.partidos_jugados}
                  </div>

                  {/* Porcentaje victorias */}
                  <div className="col-span-2 text-center">
                    <span className={`font-semibold ${
                      player.porcentaje_victorias >= 70 ? 'text-green-400' :
                      player.porcentaje_victorias >= 50 ? 'text-yellow-400' :
                      player.porcentaje_victorias > 0 ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                      {player.porcentaje_victorias}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sin rankings */}
        {!loading && rankings.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            <div className="text-4xl mb-4">😕</div>
            <p>No hay jugadores en el ranking todavía</p>
          </div>
        )}

        {/* Leyenda */}
        {!loading && rankings.length > 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>PJ = Partidos Jugados · % Vic = Porcentaje de Victorias</p>
            <p className="mt-1">El ranking se actualiza después de cada partido</p>
          </div>
        )}
      </main>

      {/* Footer decorativo */}
      <footer className="mt-8 py-4 bg-gradient-to-r from-sky-400 via-white to-sky-400">
        <p className="text-center text-sky-900 font-semibold text-sm">
          Fulvo - Ranking Oficial 2025
        </p>
      </footer>
    </div>
  );
}

export default Rankings;
