import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth';

function Register() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipo, setTipo] = useState('');
  const [posicion, setPosicion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = {
        nombre,
        email,
        password,
        tipo,
      };

      // Incluir posicion solo si es jugador
      if (tipo === 'jugador' && posicion) {
        userData.posicion = posicion;
      }

      // Incluir teléfono si se proporcionó
      if (telefono) {
        userData.telefono = telefono;
      }

      await register(userData);

      // Redirigir a verificación de email
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-sky-400">Crear Cuenta</h1>
          <p className="text-gray-400 mt-2">Unite a Fulvo</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 mb-2">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">
              Teléfono <span className="text-gray-500 text-sm">(opcional)</span>
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="+54 11 1234-5678"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="********"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Tipo de cuenta</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipo('jugador')}
                className={`flex-1 py-3 rounded font-semibold transition ${
                  tipo === 'jugador'
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Jugador
              </button>
              <button
                type="button"
                onClick={() => setTipo('dueno')}
                className={`flex-1 py-3 rounded font-semibold transition ${
                  tipo === 'dueno'
                    ? 'bg-sky-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Dueno de Cancha
              </button>
            </div>
          </div>

          {tipo === 'jugador' && (
            <div>
              <label className="block text-gray-300 mb-2">Posicion preferida</label>
              <select
                value={posicion}
                onChange={(e) => setPosicion(e.target.value)}
                className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="">Seleccionar posicion</option>
                <option value="arquero">Arquero</option>
                <option value="defensor">Defensor</option>
                <option value="mediocampista">Mediocampista</option>
                <option value="delantero">Delantero</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !tipo}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded transition"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-gray-400 mt-6">
          Ya tenes cuenta?{' '}
          <Link to="/" className="text-sky-400 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
