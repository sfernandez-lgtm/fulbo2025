import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verificarCodigo, reenviarCodigo } from '../services/auth';

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const inputRefs = useRef([]);

  // Redirigir si no hay email
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // Countdown para reenvío
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index, value) => {
    // Solo permitir dígitos
    if (value && !/^\d$/.test(value)) return;

    const newCodigo = [...codigo];
    newCodigo[index] = value;
    setCodigo(newCodigo);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: borrar y volver al anterior
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCodigo = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setCodigo(newCodigo);
      // Focus en el último dígito pegado o el último input
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const codigoCompleto = codigo.join('');
    if (codigoCompleto.length !== 6) {
      setError('Ingresá el código de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      const response = await verificarCodigo(email, codigoCompleto);

      if (response.user?.tipo === 'dueno') {
        navigate('/owner');
      } else {
        navigate('/player');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al verificar código');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      await reenviarCodigo(email);
      setSuccess('Código reenviado. Revisá tu email.');
      setCountdown(60); // 60 segundos de espera
      setCodigo(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reenviar código');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sky-400">Verificá tu email</h1>
          <p className="text-gray-400 mt-2">
            Enviamos un código de 6 dígitos a
          </p>
          <p className="text-white font-semibold">{email}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Código inputs */}
          <div className="flex justify-center gap-2">
            {codigo.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-bold bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || codigo.join('').length !== 6}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded transition"
          >
            {loading ? 'Verificando...' : 'Verificar cuenta'}
          </button>
        </form>

        {/* Reenviar código */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm mb-2">
            ¿No recibiste el código?
          </p>
          <button
            onClick={handleResend}
            disabled={resending || countdown > 0}
            className="text-sky-400 hover:text-sky-300 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold"
          >
            {resending
              ? 'Reenviando...'
              : countdown > 0
              ? `Reenviar en ${countdown}s`
              : 'Reenviar código'}
          </button>
        </div>

        {/* Volver */}
        <p className="text-center text-gray-400 mt-6 text-sm">
          ¿Email incorrecto?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-sky-400 hover:underline"
          >
            Volver al registro
          </button>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;
