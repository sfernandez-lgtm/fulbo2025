import api from './api';

// Obtener perfil del jugador logueado
export const getMyProfile = async () => {
  const response = await api.get('/players/profile');
  return response.data;
};

// Actualizar perfil del jugador
export const updateProfile = async (data: {
  nombre?: string;
  posicion?: string;
}) => {
  const response = await api.put('/players/profile', data);
  return response.data;
};

// Obtener ranking de jugadores
export const getRanking = async () => {
  const response = await api.get('/players/ranking');
  return response.data;
};

// Obtener partidos del jugador (pasados y futuros)
export const getMyMatches = async () => {
  const response = await api.get('/players/matches');
  return response.data;
};

// Obtener perfil de un jugador específico
export const getPlayerById = async (id: string | number) => {
  const response = await api.get(`/players/${id}`);
  return response.data;
};
