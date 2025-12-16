import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyVenues, createVenue, createMatch } from '../services/venues';
import { getCurrentUser, logout } from '../services/auth';

function OwnerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms visibility
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [showCreateMatch, setShowCreateMatch] = useState(false);

  // Form states
  const [newVenue, setNewVenue] = useState({
    nombre: '',
    direccion: '',
    zona: '',
    precio_hora: ''
  });

  const [newMatch, setNewMatch] = useState({
    cancha_id: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    precio_por_jugador: '',
    max_jugadores: '14'
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await getMyVenues();
      setVenues(data);
      if (data.length > 0) {
        setNewMatch(prev => ({ ...prev, cancha_id: data[0].id }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar canchas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await createVenue({
        ...newVenue,
        precio_hora: Number(newVenue.precio_hora) || 0
      });
      setSuccess('Cancha creada exitosamente');
      setNewVenue({ nombre: '', direccion: '', zona: '', precio_hora: '' });
      setShowCreateVenue(false);
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear cancha');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await createMatch({
        cancha_id: Number(newMatch.cancha_id),
        fecha: newMatch.fecha,
        hora_inicio: newMatch.hora_inicio,
        hora_fin: newMatch.hora_fin,
        precio_por_jugador: Number(newMatch.precio_por_jugador) || 0,
        max_jugadores: Number(newMatch.max_jugadores) || 14
      });
      setSuccess('Partido creado exitosamente');
      setNewMatch({
        cancha_id: venues[0]?.id || '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
        precio_por_jugador: '',
        max_jugadores: '14'
      });
      setShowCreateMatch(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear partido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/owner" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <span className="text-gray-400 font-medium">{user?.nombre || 'Mi Cuenta'}</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-400 py-10">
            Cargando...
          </div>
        )}

        {/* No venues - show create venue form */}
        {!loading && venues.length === 0 && !showCreateVenue && (
          <div className="text-center py-10">
            <p className="text-gray-400 mb-4">No tenés canchas registradas</p>
            <button
              onClick={() => setShowCreateVenue(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-6 py-3 rounded-lg transition"
            >
              + Agregar mi primera cancha
            </button>
          </div>
        )}

        {/* Create Venue Form */}
        {showCreateVenue && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Nueva Cancha</h2>
            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newVenue.nombre}
                  onChange={(e) => setNewVenue({ ...newVenue, nombre: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Cancha Los Amigos"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Dirección</label>
                <input
                  type="text"
                  value={newVenue.direccion}
                  onChange={(e) => setNewVenue({ ...newVenue, direccion: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Av. del Libertador 4500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Zona</label>
                <input
                  type="text"
                  value={newVenue.zona}
                  onChange={(e) => setNewVenue({ ...newVenue, zona: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Palermo, CABA"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Precio por hora ($)</label>
                <input
                  type="number"
                  value={newVenue.precio_hora}
                  onChange={(e) => setNewVenue({ ...newVenue, precio_hora: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="50000"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition"
                >
                  {submitting ? 'Creando...' : 'Crear Cancha'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateVenue(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Venues List */}
        {!loading && venues.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">Mis Canchas</h1>
              <button
                onClick={() => setShowCreateVenue(true)}
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 rounded-lg transition"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {venues.map((venue) => (
                <div key={venue.id} className="bg-gray-800 rounded-xl shadow-md p-5">
                  <h2 className="text-lg font-semibold text-white mb-1">{venue.nombre}</h2>
                  <p className="text-gray-400 mb-2 flex items-center gap-2">
                    <span>📍</span> {venue.direccion}, {venue.zona}
                  </p>
                  {venue.precio_hora && (
                    <p className="text-sky-400 font-semibold">${venue.precio_hora}/hora</p>
                  )}
                </div>
              ))}
            </div>

            {/* Create Match Section */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Crear Partido</h2>
            </div>

            {!showCreateMatch ? (
              <button
                onClick={() => setShowCreateMatch(true)}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-4 rounded-xl transition mb-6"
              >
                + Crear Partido
              </button>
            ) : (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <form onSubmit={handleCreateMatch} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Cancha</label>
                    <select
                      value={newMatch.cancha_id}
                      onChange={(e) => setNewMatch({ ...newMatch, cancha_id: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      required
                    >
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Fecha</label>
                    <input
                      type="date"
                      value={newMatch.fecha}
                      onChange={(e) => setNewMatch({ ...newMatch, fecha: e.target.value })}
                      className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Hora inicio</label>
                      <input
                        type="time"
                        value={newMatch.hora_inicio}
                        onChange={(e) => setNewMatch({ ...newMatch, hora_inicio: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Hora fin</label>
                      <input
                        type="time"
                        value={newMatch.hora_fin}
                        onChange={(e) => setNewMatch({ ...newMatch, hora_fin: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Precio por jugador ($)</label>
                      <input
                        type="number"
                        value={newMatch.precio_por_jugador}
                        onChange={(e) => setNewMatch({ ...newMatch, precio_por_jugador: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="5000"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Máx. jugadores</label>
                      <input
                        type="number"
                        value={newMatch.max_jugadores}
                        onChange={(e) => setNewMatch({ ...newMatch, max_jugadores: e.target.value })}
                        className="w-full bg-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="14"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white font-semibold py-3 rounded-lg transition"
                    >
                      {submitting ? 'Creando...' : 'Crear Partido'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateMatch(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-xl transition"
        >
          Cerrar Sesión
        </button>
      </main>
    </div>
  );
}

export default OwnerDashboard;
