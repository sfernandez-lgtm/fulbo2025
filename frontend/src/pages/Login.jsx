import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/auth';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);

      // Redirigir según el tipo de usuario
      if (response.user.tipo === 'dueno') {
        navigate('/owner');
      } else {
        navigate('/player');
      }
    } catch (err) {
      // Si la cuenta no está verificada, redirigir a verificación
      if (err.response?.data?.requiresVerification) {
        navigate('/verify-email', { state: { email: err.response.data.email } });
        return;
      }
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/logo-fulvo.png" alt="Fulvo" className="h-16 mx-auto" />
          <p className="text-gray-400 mt-2">Fútbol 7 en Argentina</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-gray-300 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded transition"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center text-gray-400 mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-sky-400 hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
