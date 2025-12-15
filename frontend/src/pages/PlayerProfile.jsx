import { Link } from 'react-router-dom'

function PlayerProfile() {
  const jugador = {
    nombre: 'Santiago Fernández',
    email: 'santiago@email.com',
    posicion: 'Mediocampista',
    ranking: 1250,
    partidosJugados: 23,
    partidosGanados: 14
  }

  const proximosPartidos = [
    {
      id: 1,
      cancha: 'Cancha Los Amigos',
      fecha: 'Sábado 21 Dic - 18:00',
      ubicacion: 'Palermo, CABA'
    },
    {
      id: 3,
      cancha: 'Fútbol 7 San Martín',
      fecha: 'Domingo 22 Dic - 16:00',
      ubicacion: 'San Martín, GBA'
    }
  ]

  const porcentajeVictorias = Math.round((jugador.partidosGanados / jugador.partidosJugados) * 100)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-[#75AADB]">Fulvo</Link>
        <span className="text-2xl bg-[#75AADB] rounded-full w-10 h-10 flex items-center justify-center">👤</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Link to="/player" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4">
          ← Volver
        </Link>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{jugador.nombre}</h1>
          <p className="text-gray-500 mb-3">{jugador.email}</p>
          <span className="inline-block bg-[#75AADB] text-white text-sm font-semibold px-4 py-1 rounded-full">
            {jugador.posicion}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Estadísticas</h2>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Ranking Actual</p>
            <p className="text-4xl font-bold text-[#75AADB]">{jugador.ranking}</p>
            <p className="text-sm text-gray-500">puntos</p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">{jugador.partidosJugados}</p>
              <p className="text-sm text-gray-500">Jugados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{jugador.partidosGanados}</p>
              <p className="text-sm text-gray-500">Ganados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{porcentajeVictorias}%</p>
              <p className="text-sm text-gray-500">Victorias</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Próximos Partidos</h2>
          <div className="space-y-4">
            {proximosPartidos.map((partido) => (
              <Link 
                key={partido.id} 
                to={`/player/match/${partido.id}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="font-semibold text-gray-800">{partido.cancha}</p>
                <p className="text-sm text-gray-500">{partido.fecha}</p>
                <p className="text-sm text-gray-500">{partido.ubicacion}</p>
              </Link>
            ))}
          </div>
        </div>

        <button className="w-full bg-red-500 text-white font-semibold py-4 rounded-xl hover:bg-red-600 transition-colors">
          Cerrar Sesión
        </button>
      </main>
    </div>
  )
}

export default PlayerProfile
