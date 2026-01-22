import { useState, useEffect } from 'react';
import { joinWaitlist, getWaitlistCount } from '../services/waitlist';

// Fecha de lanzamiento: 1 de febrero 2026 a las 00:00 hora Argentina
const LAUNCH_DATE = new Date('2026-02-01T00:00:00-03:00').getTime();

export default function PreLaunchLanding() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = LAUNCH_DATE - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Cargar count de waitlist
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await getWaitlistCount();
        setWaitlistCount(data.count);
      } catch (error) {
        console.error('Error fetching waitlist count:', error);
      }
    };
    fetchCount();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await joinWaitlist(email);
      setMessage({
        text: response.alreadyExists
          ? '¡Ya estás en la lista! Te avisaremos cuando lancemos.'
          : '¡Listo! Te sumaste a la lista de espera. Tendrás 3 MESES GRATIS.',
        type: 'success'
      });
      if (!response.alreadyExists) {
        setWaitlistCount(prev => prev + 1);
      }
      setEmail('');
    } catch (error) {
      setMessage({
        text: error.response?.data?.error || 'Error al procesar. Intentá de nuevo.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const TimeBlock = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4 min-w-[70px] sm:min-w-[90px]">
          <span className="text-3xl sm:text-5xl font-bold text-white tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
        </div>
        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#75AADB]/10 to-transparent pointer-events-none" />
      </div>
      <span className="text-gray-400 text-xs sm:text-sm mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Background con gradiente sutil */}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 via-black to-black" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#75AADB]/5 via-transparent to-transparent" />

      {/* Contenido principal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Logo */}
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <img
            src="/images/logo-fulvo.png"
            alt="Fulvo"
            className="h-20 sm:h-28 w-auto drop-shadow-[0_0_30px_rgba(117,170,219,0.3)]"
            onError={(e) => {
              // Fallback a texto si no carga la imagen
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <h1
            className="text-5xl sm:text-7xl font-black text-[#75AADB] tracking-tight hidden"
            style={{ textShadow: '0 0 40px rgba(117,170,219,0.4)' }}
          >
            Fulvo
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-gray-300 text-lg sm:text-xl mb-8 sm:mb-12 text-center max-w-md">
          La app de fútbol amateur que estabas esperando
        </p>

        {/* Countdown */}
        <div className="mb-8 sm:mb-12">
          <p className="text-[#75AADB] text-sm sm:text-base mb-4 text-center font-medium">
            Lanzamos el 1 de febrero
          </p>
          <div className="flex gap-2 sm:gap-4">
            <TimeBlock value={timeLeft.days} label="Días" />
            <div className="flex items-center text-2xl sm:text-4xl text-gray-600 font-light">:</div>
            <TimeBlock value={timeLeft.hours} label="Horas" />
            <div className="flex items-center text-2xl sm:text-4xl text-gray-600 font-light">:</div>
            <TimeBlock value={timeLeft.minutes} label="Min" />
            <div className="flex items-center text-2xl sm:text-4xl text-gray-600 font-light">:</div>
            <TimeBlock value={timeLeft.seconds} label="Seg" />
          </div>
        </div>

        {/* Formulario de waitlist */}
        <div className="w-full max-w-md">
          <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-white text-xl sm:text-2xl font-bold text-center mb-2">
              Sumate a la lista de espera
            </h2>
            <p className="text-[#75AADB] text-center mb-6 font-medium">
              y obtené <span className="text-white font-bold">3 MESES GRATIS</span> en vez de 2
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-[#75AADB] focus:border-transparent
                           placeholder-gray-500 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#75AADB] hover:bg-[#5a95c9] text-black font-bold py-3 px-6
                         rounded-lg transition-all duration-200 transform hover:scale-[1.02]
                         active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg shadow-[#75AADB]/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  'Unirme a la lista'
                )}
              </button>
            </form>

            {/* Mensaje de feedback */}
            {message.text && (
              <div
                className={`mt-4 p-3 rounded-lg text-center text-sm ${
                  message.type === 'success'
                    ? 'bg-green-900/50 text-green-300 border border-green-800'
                    : 'bg-red-900/50 text-red-300 border border-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Contador de personas en la lista */}
            {waitlistCount > 0 && (
              <p className="text-gray-500 text-sm text-center mt-4">
                Ya hay <span className="text-[#75AADB] font-semibold">{waitlistCount.toLocaleString('es-AR')}</span> personas en la lista
              </p>
            )}
          </div>
        </div>

        {/* Features preview */}
        <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 text-center max-w-lg">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-full flex items-center justify-center mb-2 sm:mb-3 border border-gray-700">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#75AADB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs sm:text-sm">Armá tu equipo</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-full flex items-center justify-center mb-2 sm:mb-3 border border-gray-700">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#75AADB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs sm:text-sm">Reservá cancha</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-800 rounded-full flex items-center justify-center mb-2 sm:mb-3 border border-gray-700">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#75AADB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-gray-400 text-xs sm:text-sm">Seguí tu ranking</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-gray-600 text-sm">
        <p>Fútbol 7 en Argentina</p>
      </footer>

      {/* CSS para animaciones */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
