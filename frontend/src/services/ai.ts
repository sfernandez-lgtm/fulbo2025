import api from './api';

export const validateWithAI = async (type: 'match' | 'venue', data: any) => {
  const response = await api.post('/ai/validate', { type, data });
  return response.data;
};
