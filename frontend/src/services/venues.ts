import api from './api';

// Obtener canchas del dueño logueado
export const getMyVenues = async () => {
  const response = await api.get('/venues/my');
  return response.data;
};

// Crear una cancha nueva
export const createVenue = async (data: {
  nombre: string;
  direccion: string;
  zona: string;
  telefono?: string;
  precio_hora?: number;
  descripcion?: string;
  servicios?: string;
}) => {
  const response = await api.post('/venues', data);
  return response.data;
};

// Actualizar una cancha
export const updateVenue = async (id: string | number, data: {
  nombre?: string;
  direccion?: string;
  zona?: string;
  telefono?: string;
  precio_hora?: number;
  descripcion?: string;
  servicios?: string;
  activa?: boolean;
}) => {
  const response = await api.put(`/venues/${id}`, data);
  return response.data;
};

// Eliminar una cancha
export const deleteVenue = async (id: string | number) => {
  const response = await api.delete(`/venues/${id}`);
  return response.data;
};

// Crear un partido nuevo
export const createMatch = async (data: {
  cancha_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  max_jugadores?: number;
  precio_por_jugador?: number;
  descripcion?: string;
}) => {
  const response = await api.post('/matches', data);
  return response.data;
};

// Cancelar un partido
export const deleteMatch = async (id: string | number) => {
  const response = await api.delete(`/matches/${id}`);
  return response.data;
};

// Obtener partidos del dueño (organizador)
export const getMyMatches = async () => {
  const response = await api.get('/matches/mine');
  return response.data;
};

// Cargar resultado de un partido
export const setMatchResult = async (
  id: string | number,
  resultado_local: number,
  resultado_visitante: number
) => {
  const response = await api.put(`/matches/${id}/result`, {
    resultado_local,
    resultado_visitante
  });
  return response.data;
};
