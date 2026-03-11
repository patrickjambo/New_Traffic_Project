import axios from 'axios';

// Configure axios defaults
// Note: baseURL is not set because Vite proxy handles /api requests
axios.defaults.timeout = 15000; // 15 seconds (increased for reliability)

// ============================================
// RETRY CONFIGURATION — Prevent transient failures from breaking the UI
// ============================================
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Add request interceptor to include auth token and debug logging
axios.interceptors.request.use(
    (config) => {
        // Initialize retry counter
        config._retryCount = config._retryCount || 0;
        
        // Attach auth token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Set Content-Type to JSON only if NOT sending FormData
        if (!(config.data instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }
        if (config._retryCount === 0) {
            console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor with automatic retry for transient failures
axios.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    async (error) => {
        const config = error.config;
        
        // Don't retry if no config, or if we've exhausted retries
        if (!config || config._retryCount >= MAX_RETRIES) {
            console.error(`❌ API Error (final): ${config?.url} - ${error.message}`);
            return Promise.reject(error);
        }

        // Retry on network errors (no response) or retryable status codes
        const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('Network Error') || error.message?.includes('timeout'));
        const isRetryableStatus = error.response && RETRYABLE_STATUS_CODES.includes(error.response.status);
        
        if (isNetworkError || isRetryableStatus) {
            config._retryCount += 1;
            const delay = RETRY_DELAY_MS * config._retryCount; // Linear backoff
            console.log(`🔄 Retry ${config._retryCount}/${MAX_RETRIES} for ${config.url} in ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return axios(config);
        }

        console.error(`❌ API Error: ${config?.url} - ${error.message}`);
        return Promise.reject(error);
    }
);

export default axios;
