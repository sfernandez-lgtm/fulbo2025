import api from './api';

// Crear preferencia de suscripción
export const createSubscription = async (tipo: 'dueno' | 'premium') => {
  const response = await api.post('/payments/create-subscription', { tipo });
  return response.data;
};

// Verificar estado de suscripción
export const getSubscriptionStatus = async () => {
  const response = await api.get('/payments/status/check');
  return response.data;
};
