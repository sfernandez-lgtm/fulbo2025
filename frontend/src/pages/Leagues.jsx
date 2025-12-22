import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyLeague, getLeagueStandings, getTopDiamond } from '../services/leagues';
import { getCurrentUser } from '../services/auth';
import PageWithAds from '../components/PageWithAds';

function Leagues() {
  const [myLeague, setMyLeague] = useState(null);
  const [standings, setStandings] = useState([]);
  const [topDiamond, setTopDiamond] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [leagueData, diamondData] = await Promise.all([
        getMyLeague(),
        getTopDiamond()
      ]);

      setMyLeague(leagueData);
      setTopDiamond(diamondData);

      // Cargar standings de mi liga
      if (leagueData.liga) {
        const standingsData = await getLeagueStandings(leagueData.liga);
        setStandings(standingsData.standings || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar datos de ligas');
    } finally {
      setLoading(false);
    }
  };

  // Colores por liga
  const getLeagueColors = (liga) => {
    switch (liga) {
      case 'diamante':
        return { bg: 'bg-cyan-500/20', border: 'border-cyan-400', text: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' };
      case 'platino':
        return { bg: 'bg-indigo-500/20', border: 'border-indigo-400', text: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-500' };
      case 'oro':
        return { bg: 'bg-yellow-500/20', border: 'border-yellow-400', text: 'text-yellow-400', gradient: 'from-yellow-500 to-amber-500' };
      case 'plata':
        return { bg: 'bg-gray-400/20', border: 'border-gray-400', text: 'text-gray-300', gradient: 'from-gray-400 to-gray-500' };
      case 'bronce':
        return { bg: 'bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-400', gradient: 'from-orange-500 to-amber-600' };
      default:
        return { bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-400', gradient: 'from-gray-500 to-gray-600' };
    }
  };

  // Nombre capitalizado de liga
  const getLeagueName = (liga) => {
    if (!liga) return '';
    return liga.charAt(0).toUpperCase() + liga.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando ligas...</p>
      </div>
    );
  }

  const colors = myLeague ? getLeagueColors(myLeague.liga) : getLeagueColors(null);

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player"><img src="/images/logo-fulvo.png" alt="Fulvo" className="h-10" /></Link>
        <span className="text-xl">Ligas</span>
      </header>

      <PageWithAds>
        <main className="p-6">
          <Link to="/player" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
            ← Volver
          </Link>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Temporada Header */}
        {myLeague?.temporada && (
          <div className="bg-gray-800 rounded-xl p-4 mb-6 text-center">
            <h1 className="text-xl font-bold text-white mb-1">{myLeague.temporada.nombre}</h1>
            <p className="text-gray-400">
              {myLeague.temporada.dias_restantes > 0
                ? `Quedan ${myLeague.temporada.dias_restantes} días`
                : 'Temporada finalizada'}
            </p>
          </div>
        )}

        {/* Mi Liga - Card Grande */}
        {myLeague && (
          <div className={`${colors.bg} border ${colors.border} rounded-xl p-6 mb-6`}>
            <div className="text-center mb-4">
              <span className="text-6xl mb-2 block">{myLeague.icono}</span>
              <h2 className={`text-2xl font-bold ${colors.text}`}>
                Liga {getLeagueName(myLeague.liga)}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Ranking: {myLeague.rangos?.min} - {myLeague.rangos?.max === Infinity ? '∞' : myLeague.rangos?.max}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className={`text-2xl font-bold ${colors.text}`}>{myLeague.ranking}</p>
                <p className="text-xs text-gray-400">Ranking</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-white">#{myLeague.posicion || '-'}</p>
                <p className="text-xs text-gray-400">Posición</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-400">{myLeague.puntos_temporada || 0}</p>
                <p className="text-xs text-gray-400">Pts Temp</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xl font-bold text-white">{myLeague.partidos_temporada || 0}</p>
                <p className="text-xs text-gray-400">Partidos Temp</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xl font-bold text-green-400">{myLeague.victorias_temporada || 0}</p>
                <p className="text-xs text-gray-400">Victorias Temp</p>
              </div>
            </div>

            {/* Premio de liga */}
            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400">Premio de temporada:</p>
              <p className={`font-semibold ${colors.text}`}>{myLeague.premio?.descripcion}</p>
            </div>
          </div>
        )}

        {/* Tabla de Posiciones de mi liga */}
        {standings.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {myLeague?.icono} Tabla de Liga {getLeagueName(myLeague?.liga)}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-700">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2">Jugador</th>
                    <th className="text-center py-2">Ranking</th>
                    <th className="text-center py-2">PJ</th>
                    <th className="text-center py-2">PG</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((player) => {
                    const isMe = currentUser && player.id === currentUser.id;
                    return (
                      <tr
                        key={player.id}
                        className={`border-b border-gray-700/50 ${isMe ? 'bg-sky-500/20' : ''}`}
                      >
                        <td className="py-3 px-2">
                          <span className={`font-semibold ${player.posicion <= 3 ? colors.text : 'text-gray-400'}`}>
                            {player.posicion}
                          </span>
                        </td>
                        <td className="py-3">
                          <Link
                            to={isMe ? '/player/profile' : `/player/profile/${player.id}`}
                            className="hover:text-sky-400 transition"
                          >
                            <span className={`font-medium ${isMe ? 'text-sky-400' : 'text-white'}`}>
                              {player.nombre}
                            </span>
                            {isMe && <span className="text-sky-400 text-xs ml-2">(Vos)</span>}
                          </Link>
                        </td>
                        <td className="text-center py-3">
                          <span className={colors.text}>{player.ranking}</span>
                        </td>
                        <td className="text-center py-3 text-gray-400">
                          {player.partidos_temporada || 0}
                        </td>
                        <td className="text-center py-3 text-green-400">
                          {player.victorias_temporada || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-center text-gray-500 text-xs mt-4">
              {myLeague?.total_jugadores || standings.length} jugadores en esta liga
            </p>
          </div>
        )}

        {/* Top Diamond Prize */}
        {topDiamond && topDiamond.top && topDiamond.top.length > 0 && (
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 text-center">
              Premio Liga Diamante
            </h3>

            {/* #1 Destacado */}
            <div className="bg-gray-800/70 rounded-xl p-4 mb-4 text-center">
              <span className="text-4xl mb-2 block">👑</span>
              <p className="text-cyan-400 font-bold text-xl">{topDiamond.top[0]?.nombre}</p>
              <p className="text-gray-400 text-sm">Ranking: {topDiamond.top[0]?.ranking}</p>
              <p className="text-yellow-400 text-sm mt-2">
                {topDiamond.premio?.descripcion}
              </p>
            </div>

            {/* Top 3-10 */}
            {topDiamond.top.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400 mb-2">Perseguidores:</p>
                {topDiamond.top.slice(1, 5).map((player, index) => (
                  <div key={player.id} className="flex justify-between items-center bg-gray-800/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">#{index + 2}</span>
                      <span className="text-white">{player.nombre}</span>
                    </div>
                    <span className="text-cyan-400">{player.ranking}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info de todas las ligas */}
        <div className="mt-6 bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Todas las Ligas</h3>
          <div className="space-y-3">
            {['diamante', 'platino', 'oro', 'plata', 'bronce'].map((liga) => {
              const ligaColors = getLeagueColors(liga);
              const rangos = {
                diamante: '1200+',
                platino: '1100-1199',
                oro: '1000-1099',
                plata: '900-999',
                bronce: '0-899'
              };
              const iconos = {
                diamante: '💎',
                platino: '🔷',
                oro: '🥇',
                plata: '🥈',
                bronce: '🥉'
              };
              const isMyLiga = myLeague?.liga === liga;

              return (
                <div
                  key={liga}
                  className={`flex justify-between items-center px-4 py-3 rounded-lg ${isMyLiga ? ligaColors.bg + ' ' + ligaColors.border + ' border' : 'bg-gray-700/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{iconos[liga]}</span>
                    <div>
                      <p className={`font-semibold ${isMyLiga ? ligaColors.text : 'text-white'}`}>
                        Liga {getLeagueName(liga)}
                        {isMyLiga && <span className="text-xs ml-2">(Tu liga)</span>}
                      </p>
                      <p className="text-xs text-gray-400">{rangos[liga]} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </main>
      </PageWithAds>
    </div>
  );
}

export default Leagues;
