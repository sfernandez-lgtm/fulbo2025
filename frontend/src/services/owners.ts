import api from './api';

// Obtener estadísticas del owner
export const getOwnerStats = async () => {
  const response = await api.get('/owners/stats');
  return response.data;
};

// Obtener ingresos mensuales (últimos 6 meses)
export const getMonthlyStats = async () => {
  const response = await api.get('/owners/stats/monthly');
  return response.data;
};
