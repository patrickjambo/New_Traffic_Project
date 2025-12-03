// View Manager for Single Page Application Navigation
// Manages switching between public, police, and admin dashboards

const ViewManager = {
    views: ['public', 'police', 'admin'],
    currentView: 'public',
    initialized: false,

    /**
     * Switch to a specific view (public, police, or admin)
     */
    switchToView(viewName) {
        console.log(`[ViewManager] Switching to ${viewName} view`);

        // Validate view name
        if (!this.views.includes(viewName)) {
            console.error(`[ViewManager] Invalid view: ${viewName}`);
            return;
        }

        // Check access permissions
        if (viewName !== 'public' && !this.checkAccess(viewName)) {
            utils.showNotification('Access denied. Insufficient permissions.', 'error');
            this.switchToView('public');
            return;
        }

        // Hide all views
        this.views.forEach(view => {
            const element = document.getElementById(`${view}-view`);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            this.currentView = viewName;

            // Initialize view-specific functionality
            this.initializeViewFunctions(viewName);

            // Update page title
            this.updatePageTitle(viewName);
        } else {
            console.error(`[ViewManager] View element not found: ${viewName}-view`);
        }
    },

    /**
     * Check if current user has access to a specific view
     */
    checkAccess(requiredRole) {
        const userInfo = utils.getUserInfo();

        if (!userInfo || !userInfo.role) {
            return false;
        }

        // Admin has access to all views
        if (userInfo.role === 'admin') {
            return true;
        }

        // Police can access police view
        if (requiredRole === 'police' && userInfo.role === 'police') {
            return true;
        }

        return false;
    },

    /**
     * Initialize view-specific functions when switching views
     */
    initializeViewFunctions(viewName) {
        console.log(`[ViewManager] Initializing ${viewName} view functions`);

        // Load dashboard-specific content if needed
        switch (viewName) {
            case 'police':
                this.loadPoliceDashboard();
                break;

            case 'admin':
                this.loadAdminDashboard();
                break;

            case 'public':
                // Public view is already loaded, refresh incidents
                if (typeof refreshIncidents === 'function') {
                    refreshIncidents();
                }
                // Center map after a short delay to ensure it's initialized
                setTimeout(() => {
                    if (typeof centerMap === 'function') {
                        centerMap();
                    }
                }, 100);
                break;
        }
    },

    /**
     * Load police dashboard content
     */
    loadPoliceDashboard() {
        const policeView = document.getElementById('police-view');
        if (!policeView || policeView.dataset.loaded === 'true') return;

        policeView.innerHTML = `
            <iframe src="/police-dashboard.html" style="width: 100%; height: 100vh; border: none;"></iframe>
        `;
        policeView.dataset.loaded = 'true';
    },

    /**
     * Load admin dashboard content
     */
    loadAdminDashboard() {
        const adminView = document.getElementById('admin-view');
        if (!adminView || adminView.dataset.loaded === 'true') return;

        adminView.innerHTML = `
            <iframe src="/admin-dashboard.html" style="width: 100%; height: 100vh; border: none;"></iframe>
        `;
        adminView.dataset.loaded = 'true';
    },

    /**
     * Initialize the view manager and determine which view to show
     */
    initializeView() {
        if (this.initialized) {
            console.log('[ViewManager] Already initialized');
            return;
        }

        console.log('[ViewManager] Initializing view manager');

        const userInfo = utils.getUserInfo();

        if (userInfo && userInfo.role) {
            console.log(`[ViewManager] User authenticated as ${userInfo.role}`);
            this.switchToView(userInfo.role);
        } else {
            console.log('[ViewManager] No authenticated user, showing public view');
            this.switchToView('public');
        }

        this.initialized = true;
    },

    /**
     * Update page title based on current view
     */
    updatePageTitle(viewName) {
        const titles = {
            public: 'TrafficGuard AI - Smart Traffic Management',
            police: 'Police Dashboard - TrafficGuard AI',
            admin: 'Admin Dashboard - TrafficGuard AI'
        };

        document.title = titles[viewName] || titles.public;
    },

    /**
     * Reset to public view (used for logout)
     */
    resetToPublic() {
        console.log('[ViewManager] Resetting to public view');
        this.switchToView('public');
    }
};

// Initialize view manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ViewManager.initializeView();
    });
} else {
    ViewManager.initializeView();
}

// Make ViewManager globally accessible
window.ViewManager = ViewManager;
