import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            const { token, user } = response.data.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('user');
    },
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    },
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
};

export const dashboardService = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
    getRegionalOverview: async () => {
        const response = await api.get('/regions/overview');
        return response.data;
    },
};

export const deploymentService = {
    getAll: async () => {
        const response = await api.get('/deployments');
        return response.data;
    },
    create: async (deploymentData) => {
        const response = await api.post('/deployments', deploymentData);
        return response.data;
    },
    updateStatus: async (id, status) => {
        const response = await api.put(`/deployments/${id}/status`, { status });
        return response.data;
    },
    assignOfficer: async (officerId, incidentId, emergencyId = null) => {
        const response = await api.post('/deployments/assign', { officerId, incidentId, emergencyId });
        return response.data;
    },
    getAvailableOfficers: async () => {
        const response = await api.get('/deployments/officers/available');
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/deployments/${id}`);
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/deployments/stats');
        return response.data;
    },
    updateOfficers: async (id, officerIds) => {
        const response = await api.put(`/deployments/${id}/officers`, { officers: officerIds });
        return response.data;
    },
};

export const incidentService = {
    getAll: async (params) => {
        const response = await api.get('/incidents', { params });
        return response.data;
    },
};

export const emergencyService = {
    getAll: async (params) => {
        const response = await api.get('/emergency', { params });
        return response.data;
    },
};

export const trafficService = {
    getHeatmap: async () => {
        const response = await api.get('/traffic/heatmap');
        return response.data;
    },
};

export const notificationService = {
    getAll: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },
    markAsRead: async (id) => {
        const response = await api.put(`/notifications/${id}/read`);
        return response.data;
    },
};

export const adminService = {
    createOfficer: async (officerData) => {
        const response = await api.post('/admin/officers', officerData);
        return response.data;
    },
    getUsers: async (params) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },
};

export default api;
