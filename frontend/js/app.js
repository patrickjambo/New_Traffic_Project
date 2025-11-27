// Application Configuration
const CONFIG = {
    API_URL: 'http://localhost:3000',
    WS_URL: 'http://localhost:3000',
    DEFAULT_CENTER: [-1.9441, 30.0619], // Kigali, Rwanda
    DEFAULT_ZOOM: 13,
    MAX_ZOOM: 18,
    MIN_ZOOM: 10,
};

// API Client
class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async login(credentials) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    }

    async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async logout() {
        return this.request('/api/auth/logout', { method: 'POST' });
    }

    // Incident endpoints
    async getIncidents(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/api/incidents?${params}`);
    }

    async getIncidentById(id) {
        return this.request(`/api/incidents/${id}`);
    }

    async createIncident(incidentData) {
        return this.request('/api/incidents', {
            method: 'POST',
            body: JSON.stringify(incidentData),
        });
    }

    async updateIncident(id, updates) {
        return this.request(`/api/incidents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    // Police endpoints
    async getAssignedIncidents() {
        return this.request('/api/police/incidents');
    }

    async broadcastAlert(message) {
        return this.request('/api/police/broadcast', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }

    // Admin endpoints
    async getSystemMetrics() {
        return this.request('/api/admin/metrics');
    }

    async getUsers() {
        return this.request('/api/admin/users');
    }
}

// Utility Functions
const utils = {
    // Show notification toast
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    },

    // Format time ago
    formatTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const seconds = Math.floor((now - past) / 1000);

        if (seconds < 60) return `${seconds} sec ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    },

    // Get incident icon
    getIncidentIcon(type) {
        const icons = {
            congestion: '🚗',
            accident: '🚨',
            blockage: '🚧',
            default: '⚠️',
        };
        return icons[type] || icons.default;
    },

    // Get incident color
    getIncidentColor(type) {
        const colors = {
            congestion: '#FBBC05',
            accident: '#EA4335',
            blockage: '#5F6368',
            default: '#4285F4',
        };
        return colors[type] || colors.default;
    },

    // Update last update time
    updateLastUpdateTime() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = 'Updated just now';
        }
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Get user info
    getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    },

    // Save user info
    saveUserInfo(user) {
        localStorage.setItem('userInfo', JSON.stringify(user));
    },

    // Clear user data
    clearUserData() {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
    },
};

// Initialize API client
const api = new APIClient(CONFIG.API_URL);

// Export for use in other scripts
window.CONFIG = CONFIG;
window.api = api;
window.utils = utils;
