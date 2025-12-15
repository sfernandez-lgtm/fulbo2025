import { Link, useParams } from 'react-router-dom'

function MatchDetail() {
  const { id } = useParams()

  // Datos hardcodeados del partido
  const partido = {
    id: id,
    cancha: 'Cancha Los Amigos',
    fecha: 'Sábado 21 Dic - 18:00',
    ubicacion: 'Av. del Libertador 4500, Palermo, CABA',
    precio: 5000,
    jugadoresActuales: 4,
    jugadoresTotales: 14
  }

  const jugadoresAnotados = [
    'Martín González',
    'Lucas Rodríguez',
    'Federico López',
    'Nicolás Fernández'
  ]

  const partidoLleno = partido.jugadoresActuales >= partido.jugadoresTotales
  const porcentajeOcupacion = (partido.jugadoresActuales / partido.jugadoresTotales) * 100

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-[#75AADB]">Fulvo</Link>
        <Link to="/player/profile" className="text-2xl">👤</Link>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <Link to="/player" className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4">
          ← Volver
        </Link>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{partido.cancha}</h1>
          
          <div className="space-y-3 text-gray-600 mb-6">
            <p className="flex items-center gap-2">
              <span>📅</span> {partido.fecha}
            </p>
            <p className="flex items-center gap-2">
              <span>📍</span> {partido.ubicacion}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Precio por jugador</p>
            <p className="text-3xl font-bold text-[#75AADB]">${partido.precio}</p>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Cupos</span>
              <span className="font-semibold">{partido.jugadoresActuales}/{partido.jugadoresTotales} jugadores</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-[#75AADB] h-3 rounded-full transition-all"
                style={{ width: `${porcentajeOcupacion}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Jugadores Anotados</h2>
          <div className="space-y-3">
            {jugadoresAnotados.map((jugador, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-700">
                <span>⚽</span>
                <span>{jugador}</span>
              </div>
            ))}
          </div>
        </div>

        {partidoLleno ? (
          <button
            disabled
            className="w-full bg-gray-300 text-gray-500 font-semibold py-4 rounded-xl cursor-not-allowed"
          >
            Partido Completo
          </button>
        ) : (
          <button
            className="w-full bg-[#75AADB] text-white font-semibold py-4 rounded-xl hover:bg-[#5a9ad4] transition-colors"
          >
            Anotarme a este partido
          </button>
        )}
      </main>
    </div>
  )
}

export default MatchDetail
