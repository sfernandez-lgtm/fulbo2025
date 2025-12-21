import api from './api';

// Obtener temporada activa
export const getCurrentSeason = async () => {
  const response = await api.get('/leagues/current-season');
  return response.data;
};

// Obtener mi liga actual
export const getMyLeague = async () => {
  const response = await api.get('/leagues/my-league');
  return response.data;
};

// Obtener standings de una liga específica
export const getLeagueStandings = async (liga: string) => {
  const response = await api.get(`/leagues/${liga}/standings`);
  return response.data;
};

// Obtener top 10 de diamante
export const getTopDiamond = async () => {
  const response = await api.get('/leagues/top-diamond');
  return response.data;
};

// Obtener info de todas las ligas
export const getLeaguesInfo = async () => {
  const response = await api.get('/leagues/info');
  return response.data;
};
