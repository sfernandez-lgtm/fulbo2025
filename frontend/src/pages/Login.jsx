import { Link } from 'react-router-dom'

function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-[#75AADB]">Fulvo</h1>
          <p className="text-black mt-2">Fútbol 7 en Argentina</p>
        </div>

        <form className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
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

          <button
            type="submit"
            className="w-full bg-[#75AADB] text-white font-semibold py-3 rounded-lg hover:bg-[#5a9ad4] transition-colors"
          >
            Iniciar Sesión
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-[#75AADB] font-semibold hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
