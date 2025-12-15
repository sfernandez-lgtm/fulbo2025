import { Link } from 'react-router-dom'

function PlayerHome() {
  const partidos = [
    {
      id: 1,
      cancha: 'Cancha Los Amigos',
      fecha: 'Sábado 21 Dic - 18:00',
      ubicacion: 'Palermo, CABA',
      precio: 5000,
      jugadoresActuales: 4,
      jugadoresTotales: 14
    },
    {
      id: 2,
      cancha: 'Complejo El Gol',
      fecha: 'Domingo 22 Dic - 10:00',
      ubicacion: 'Núñez, CABA',
      precio: 4500,
      jugadoresActuales: 10,
      jugadoresTotales: 14
    },
    {
      id: 3,
      cancha: 'Fútbol 7 San Martín',
      fecha: 'Domingo 22 Dic - 16:00',
      ubicacion: 'San Martín, GBA',
      precio: 4000,
      jugadoresActuales: 7,
      jugadoresTotales: 14
    }
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-[#75AADB]">Fulvo</Link>
        <Link to="/player/profile" className="text-2xl">👤</Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Partidos Disponibles</h1>

        <div className="space-y-4">
          {partidos.map((partido) => (
            <div key={partido.id} className="bg-white rounded-xl shadow-md p-5">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-semibold text-gray-800">{partido.cancha}</h2>
                <span className="text-lg font-bold text-[#75AADB]">${partido.precio}</span>
              </div>
              
              <div className="space-y-2 text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <span>📅</span> {partido.fecha}
                </p>
                <p className="flex items-center gap-2">
                  <span>📍</span> {partido.ubicacion}
                </p>
                <p className="flex items-center gap-2">
                  <span>👥</span> {partido.jugadoresActuales}/{partido.jugadoresTotales} jugadores
                </p>
              </div>

              <Link
                to={`/player/match/${partido.id}`}
                className="block w-full text-center bg-[#75AADB] text-white font-semibold py-2 rounded-lg hover:bg-[#5a9ad4] transition-colors"
              >
                Ver Partido
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default PlayerHome
