import api from './api';

// Obtener lista de partidos disponibles
export const getMatches = async (filters?: { fecha?: string; zona?: string }) => {
  const params = new URLSearchParams();
  if (filters?.fecha) params.append('fecha', filters.fecha);
  if (filters?.zona) params.append('zona', filters.zona);

  const query = params.toString();
  const response = await api.get(`/matches${query ? `?${query}` : ''}`);
  return response.data;
};

// Obtener detalle de un partido
export const getMatchById = async (id: string | number) => {
  const response = await api.get(`/matches/${id}`);
  return response.data;
};

// Unirse a un partido
export const joinMatch = async (id: string | number) => {
  const response = await api.post(`/matches/${id}/join`);
  return response.data;
};

// Salir de un partido (DELETE con penalización si es tarde)
export const leaveMatch = async (id: string | number) => {
  const response = await api.delete(`/matches/${id}/leave`);
  return response.data;
};

// Confirmar pago de un jugador (solo dueños)
export const confirmPayment = async (matchId: string | number, playerId: string | number) => {
  const response = await api.put(`/matches/${matchId}/players/${playerId}/confirm-payment`);
  return response.data;
};

// Bloquear jugador por no pagar (solo dueños)
export const blockPlayer = async (matchId: string | number, playerId: string | number) => {
  const response = await api.put(`/matches/${matchId}/players/${playerId}/block`);
  return response.data;
};
