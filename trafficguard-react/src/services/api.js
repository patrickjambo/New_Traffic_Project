import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register', userData),
  getCurrentUser: () => api.get('/api/auth/me'),

  // Incidents
  getIncidents: (params) => api.get('/api/incidents', { params }),
  getIncidentById: (id) => api.get(`/api/incidents/${id}`),
  reportIncident: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'video' && data[key]) {
        formData.append('video', data[key]);
      } else if (key === 'image' && data[key]) {
        formData.append('image', data[key]);
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post('/api/incidents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateIncident: (id, data) => api.put(`/api/incidents/${id}`, data),
  deleteIncident: (id) => api.delete(`/api/incidents/${id}`),

  // Dashboard
  getDashboardData: () => api.get('/api/dashboard'),
  getStats: () => api.get('/api/dashboard/stats'),

  // Users (Admin only)
  getUsers: () => api.get('/api/admin/users'),
  updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),

  // AI Analysis
  analyzeVideo: (videoFile) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    return api.post('/api/ai/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // AI Video Analysis with Automatic Incident Creation
  analyzeVideoAndCreateIncident: (formData, config = {}) => {
    return api.post('/api/incidents/analyze-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    });
  },

  // Emergency
  createEmergency: (data) => api.post('/api/emergency', data),
  getEmergencies: (params) => api.get('/api/emergency', { params }),
  getEmergencyById: (id) => api.get(`/api/emergency/${id}`),
  getUserEmergencies: () => api.get('/api/emergency/my-emergencies'),
  updateEmergencyStatus: (id, data) => api.put(`/api/emergency/${id}/status`, data),
  getEmergencyStats: () => api.get('/api/emergency/stats'),

  // Notifications
  getNotifications: () => api.get('/api/notifications'),
  markNotificationAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  clearNotifications: () => api.delete('/api/notifications'),

  // Traffic Stats
  getTrafficStats: () => api.get('/api/stats/traffic'),

  // Route Planning
  calculateRoute: (start, destination) => 
    api.post('/api/route/calculate', { start, destination }),
};

export default api;
