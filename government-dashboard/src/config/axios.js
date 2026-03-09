import axios from 'axios';

// Configure axios defaults
// Note: baseURL is not set because Vite proxy handles /api requests
axios.defaults.timeout = 10000; // 10 seconds
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor to include auth token and debug logging
axios.interceptors.request.use(
    (config) => {
        // Attach auth token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
axios.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    (error) => {
        console.error(`❌ API Error: ${error.config?.url} - ${error.message}`);
        return Promise.reject(error);
    }
);

export default axios;
