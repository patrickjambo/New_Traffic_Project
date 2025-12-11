import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.timeout = 10000; // 10 seconds
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for debugging
axios.interceptors.request.use(
    (config) => {
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
