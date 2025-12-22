import api from './api';

// Enviar mensaje al asistente IA (solo dueños)
export const sendChatMessage = async (mensaje: string) => {
  const response = await api.post('/chat/owner', { mensaje });
  return response.data;
};
