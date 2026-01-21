import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Автоматаар token нэмэх
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (email, password) => 
    api.post('/auth/register', { email, password }),
  
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  getProfile: () => 
    api.get('/user/me'),
};

export const purchaseAPI = {
  buy: () => 
    api.post('/purchase/buy'),
  
  checkStatus: (orderId) => 
    api.get(`/purchase/order/${orderId}/status`),
};

export const downloadAPI = {
  generateLink: () => 
    api.post('/download/generate-link'),
};

export default api;