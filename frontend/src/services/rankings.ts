import api from './api';

// Obtener top 50 rankings
export const getRankings = async () => {
  const response = await api.get('/rankings');
  return response.data;
};

// Obtener mi posición en el ranking
export const getMyRanking = async () => {
  const response = await api.get('/rankings/me');
  return response.data;
};
