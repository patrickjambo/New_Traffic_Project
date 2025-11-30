// Dashboard Views - Police and Admin Dashboard Loaders
// This file contains functionality to load and initialize police and admin dashboards

/**
 * Load Police Dashboard content into police-view div
 */
async function loadPoliceDashboard() {
    const policeView = document.getElementById('police-view');
    if (!policeView) return;

    // For now, use iframe to load the existing police dashboard
    // In a full implementation, you would fetch and inject the HTML
    policeView.innerHTML = `
        <iframe src="/police-dashboard.html" style="width: 100%; height: 100vh; border: none;"></iframe>
    `;
}

/**
 * Load Admin Dashboard content into admin-view div
 */
async function loadAdminDashboard() {
    const adminView = document.getElementById('admin-view');
    if (!adminView) return;

    // For now, use iframe to load the existing admin dashboard
    // In a full implementation, you would fetch and inject the HTML
    adminView.innerHTML = `
        <iframe src="/admin-dashboard.html" style="width: 100%; height: 100vh; border: none;"></iframe>
    `;
}

// Make functions globally available
window.loadPoliceDashboard = loadPoliceDashboard;
window.loadAdminDashboard = loadAdminDashboard;
