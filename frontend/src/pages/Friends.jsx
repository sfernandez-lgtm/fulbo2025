import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFriends, getPendingRequests, acceptFriendRequest, removeFriend, searchPlayers, sendFriendRequest } from '../services/friends';

function Friends() {
  const [activeTab, setActiveTab] = useState('amigos');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal de búsqueda
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [friendsData, pendingData] = await Promise.all([
        getFriends(),
        getPendingRequests()
      ]);
      setFriends(friendsData);
      setPending(pendingData);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId, nombre) => {
    try {
      setError('');
      await acceptFriendRequest(friendshipId);
      setSuccess(`Ahora sos amigo de ${nombre}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al aceptar solicitud');
    }
  };

  const handleRejectRequest = async (friendshipId) => {
    try {
      setError('');
      await removeFriend(friendshipId);
      setSuccess('Solicitud rechazada');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al rechazar solicitud');
    }
  };

  const handleRemoveFriend = async (friendshipId, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar a ${nombre} de tus amigos?`);
    if (!confirmar) return;

    try {
      setError('');
      await removeFriend(friendshipId);
      setSuccess('Amigo eliminado');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar amigo');
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await searchPlayers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Error buscando:', err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (showSearchModal) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, showSearchModal]);

  const handleSendRequest = async (userId, nombre) => {
    try {
      setSendingRequest(userId);
      setError('');
      await sendFriendRequest(userId);
      setSuccess(`Solicitud enviada a ${nombre}`);
      // Actualizar resultados
      setSearchResults(prev =>
        prev.map(p => p.id === userId ? { ...p, relacion: 'solicitud_enviada' } : p)
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar solicitud');
    } finally {
      setSendingRequest(null);
    }
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getRelacionLabel = (relacion) => {
    switch (relacion) {
      case 'amigo': return { text: 'Amigos', color: 'bg-green-500/20 text-green-400' };
      case 'solicitud_enviada': return { text: 'Solicitud enviada', color: 'bg-yellow-500/20 text-yellow-400' };
      case 'solicitud_recibida': return { text: 'Te envió solicitud', color: 'bg-sky-500/20 text-sky-400' };
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/player" className="text-2xl font-bold text-sky-400">Fulvo</Link>
        <h1 className="text-lg font-semibold text-white">Amigos</h1>
        <Link to="/player" className="text-gray-400 hover:text-white">Volver</Link>
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

        {/* Botón agregar amigo */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl mb-6 transition flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span> Agregar Amigo
        </button>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('amigos')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              activeTab === 'amigos'
                ? 'bg-sky-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Mis Amigos ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 py-3 rounded-lg font-semibold transition relative ${
              activeTab === 'solicitudes'
                ? 'bg-sky-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Solicitudes
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-400 py-10">
            Cargando...
          </div>
        )}

        {/* Tab: Mis Amigos */}
        {!loading && activeTab === 'amigos' && (
          <div className="space-y-3">
            {friends.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <div className="text-4xl mb-4">👥</div>
                <p>No tenés amigos todavía</p>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="mt-4 text-sky-400 hover:text-sky-300"
                >
                  Buscar jugadores para agregar
                </button>
              </div>
            ) : (
              friends.map((friend) => (
                <Link
                  key={friend.id}
                  to={`/player/profile/${friend.id}`}
                  className="block bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-500/20 rounded-full flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div>
                        <p className="text-white font-semibold">{friend.nombre}</p>
                        <p className="text-gray-400 text-sm">
                          {friend.posicion || 'Sin posición'} · Ranking: {friend.ranking || 50}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveFriend(friend.amistad_id, friend.nombre);
                      }}
                      className="text-gray-500 hover:text-red-400 p-2"
                      title="Eliminar amigo"
                    >
                      ✕
                    </button>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Tab: Solicitudes */}
        {!loading && activeTab === 'solicitudes' && (
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <div className="text-4xl mb-4">📭</div>
                <p>No tenés solicitudes pendientes</p>
              </div>
            ) : (
              pending.map((request) => (
                <div key={request.amistad_id} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div>
                        <p className="text-white font-semibold">{request.nombre}</p>
                        <p className="text-gray-400 text-sm">
                          {request.posicion || 'Sin posición'} · Ranking: {request.ranking || 50}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.amistad_id, request.nombre)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.amistad_id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal de búsqueda */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center pt-20 p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Buscar Jugadores</h3>
              <button
                onClick={closeSearchModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Buscador */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribí un nombre..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500"
              autoFocus
            />

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {searching && (
                <div className="text-center text-gray-400 py-4">Buscando...</div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  No se encontraron jugadores
                </div>
              )}

              {!searching && searchResults.map((player) => {
                const relacionInfo = getRelacionLabel(player.relacion);

                return (
                  <div key={player.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
                        👤
                      </div>
                      <div>
                        <p className="text-white font-medium">{player.nombre}</p>
                        <p className="text-gray-400 text-xs">
                          {player.posicion || 'Sin posición'} · Ranking: {player.ranking || 50}
                        </p>
                      </div>
                    </div>

                    {relacionInfo ? (
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${relacionInfo.color}`}>
                        {relacionInfo.text}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(player.id, player.nombre)}
                        disabled={sendingRequest === player.id}
                        className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        {sendingRequest === player.id ? '...' : 'Agregar'}
                      </button>
                    )}
                  </div>
                );
              })}

              {!searching && searchQuery.length < 2 && (
                <div className="text-center text-gray-500 py-4 text-sm">
                  Escribí al menos 2 letras para buscar
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friends;
