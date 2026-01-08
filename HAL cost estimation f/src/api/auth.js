import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/users/login', {
      username,
      password,
    });
    return response.data;
  },

  register: async (username, email, password, fullName) => {
    const response = await api.post('/users/register', {
      username,
      email,
      full_name: fullName,
      password,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get('/users/');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};
