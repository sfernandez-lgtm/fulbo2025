import api from './api';

// Obtener lista de amigos
export const getFriends = async () => {
  const response = await api.get('/friends');
  return response.data;
};

// Obtener solicitudes pendientes recibidas
export const getPendingRequests = async () => {
  const response = await api.get('/friends/pending');
  return response.data;
};

// Obtener solicitudes enviadas
export const getSentRequests = async () => {
  const response = await api.get('/friends/sent');
  return response.data;
};

// Enviar solicitud de amistad
export const sendFriendRequest = async (userId: number) => {
  const response = await api.post(`/friends/request/${userId}`);
  return response.data;
};

// Aceptar solicitud
export const acceptFriendRequest = async (friendshipId: number) => {
  const response = await api.put(`/friends/accept/${friendshipId}`);
  return response.data;
};

// Rechazar solicitud o eliminar amigo
export const removeFriend = async (friendshipId: number) => {
  const response = await api.delete(`/friends/${friendshipId}`);
  return response.data;
};

// Buscar jugadores
export const searchPlayers = async (query: string) => {
  const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

// Obtener estado de amistad con un usuario
export const getFriendshipStatus = async (userId: number) => {
  const response = await api.get(`/friends/status/${userId}`);
  return response.data;
};
