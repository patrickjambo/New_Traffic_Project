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
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
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
        if (response.data && response.data.token) {
            // Store the whole response data which includes token and user
            localStorage.setItem('user', JSON.stringify(response.data));
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
        return JSON.parse(localStorage.getItem('user'));
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

export default api;
