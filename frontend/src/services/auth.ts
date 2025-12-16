import api from './api';

// Registro de nuevo usuario
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

// Login
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });

  // Guardar token y datos del usuario en localStorage
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response.data;
};

// Logout
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Obtener usuario actual del localStorage
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Verificar si está logueado
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
