import { useState } from 'react'
import { Link } from 'react-router-dom'

function Register() {
  const [tipoUsuario, setTipoUsuario] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#75AADB]">Crear Cuenta</h1>
          <p className="text-black mt-2">Unite a Fulvo</p>
        </div>

        <form className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div>
            <input
              type="text"
              placeholder="Nombre completo"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#75AADB] focus:border-transparent"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Email o teléfono"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#75AADB] focus:border-transparent"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#75AADB] focus:border-transparent"
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-3">Tipo de cuenta</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipoUsuario('jugador')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  tipoUsuario === 'jugador'
                    ? 'bg-[#75AADB] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Jugador
              </button>
              <button
                type="button"
                onClick={() => setTipoUsuario('dueno')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  tipoUsuario === 'dueno'
                    ? 'bg-[#75AADB] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Dueño de Cancha
              </button>
            </div>
          </div>

          {tipoUsuario === 'jugador' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">Posición preferida</p>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#75AADB] focus:border-transparent bg-white"
              >
                <option value="">Seleccionar posición</option>
                <option value="arquero">Arquero</option>
                <option value="defensor">Defensor</option>
                <option value="mediocampista">Mediocampista</option>
                <option value="delantero">Delantero</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#75AADB] text-white font-semibold py-3 rounded-lg hover:bg-[#5a9ad4] transition-colors"
          >
            Crear Cuenta
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿Ya tenés cuenta?{' '}
          <Link to="/" className="text-[#75AADB] font-semibold hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
