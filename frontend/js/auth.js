// Authentication Functions

// Show login modal
function showLogin() {
    hideRegistration();
    const modal = document.getElementById('loginModal');
    modal.classList.add('show');
}

// Hide login modal
function hideLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('show');
    document.getElementById('loginForm').reset();
}

// Show registration modal
function showRegistration() {
    hideLogin();
    const modal = document.getElementById('registrationModal');
    modal.classList.add('show');
}

// Hide registration modal
function hideRegistration() {
    const modal = document.getElementById('registrationModal');
    modal.classList.remove('show');
    document.getElementById('registrationForm').reset();
}

// Handle login redirect with loop prevention
function handleLoginRedirect(role) {
    // Check if we're already on the right page
    const currentPage = window.location.pathname;
    
    console.log('🔄 handleLoginRedirect called');
    console.log('- User role:', role);
    console.log('- Current page:', currentPage);
    
    if (role === 'admin' && currentPage.includes('admin-dashboard')) {
        console.log('✅ Already on admin dashboard - NO REDIRECT');
        return;
    }
    
    if (role === 'police' && currentPage.includes('police-dashboard')) {
        console.log('✅ Already on police dashboard - NO REDIRECT');
        return;
    }
    
    if (role === 'public' && (currentPage.includes('index.html') || currentPage === '/')) {
        console.log('✅ Already on home page - NO REDIRECT');
        return;
    }
    
    // Clear any pending redirects
    if (window.redirectTimeout) {
        clearTimeout(window.redirectTimeout);
    }
    
    // Perform redirect with delay so you can see console
    console.log('🔄 Will redirect in 2 seconds to:', role + '-dashboard');
    window.redirectTimeout = setTimeout(() => {
        console.log('🔄 NOW REDIRECTING...');
        
        // Use replace to prevent back button issues
        if (role === 'admin') {
            window.location.replace('http://localhost:8080/admin-dashboard.html');
        } else if (role === 'police') {
            window.location.replace('http://localhost:8080/police-dashboard.html');
        } else {
            window.location.replace('http://localhost:8080/index.html');
        }
    }, 2000);
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password'),
    };

    // Show loading state
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const response = await api.login(credentials);

        if (response.success) {
            const user = response.data.user;
            const token = response.data.token;

            // Save token and user info
            api.setToken(token);
            localStorage.setItem('user', JSON.stringify(user));

            // Handle different possible name properties
            const userName = user.fullName || user.full_name || user.name || user.username || user.email || 'User';
            utils.showNotification(`Login successful! Welcome, ${userName}`, 'success');

            // Hide login modal
            hideLogin();

            // Use the new redirect handler
            handleLoginRedirect(user.role);
        }
    } catch (error) {
        console.error('Login error:', error);
        utils.showNotification(error.message || 'Login failed. Please try again.', 'error');

        // Reset loading state
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Handle registration form submission
async function handleRegistration(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const userData = {
        email: formData.get('email'),
        password: formData.get('password'),
        fullName: formData.get('name'),
        phone: formData.get('phone'),
        role: formData.get('role') || 'public', // Allow role selection during registration
    };

    // Show loading state
    const btnText = document.getElementById('reg-btn-text');
    const spinner = document.getElementById('reg-spinner');
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const response = await api.register(userData);

        if (response.success) {
            utils.showNotification('Registration successful! Please login.', 'success');

            // Auto-login after registration
            const loginData = {
                email: userData.email,
                password: userData.password,
            };

            setTimeout(async () => {
                try {
                    const loginResponse = await api.login(loginData);
                    if (loginResponse.success) {
                        const user = loginResponse.data.user;
                        api.setToken(loginResponse.data.token);
                        localStorage.setItem('user', JSON.stringify(user));

                        hideRegistration();
                        utils.showNotification('Logged in successfully!', 'success');

                        // Use the new redirect handler
                        setTimeout(() => {
                            handleLoginRedirect(user.role);
                        }, 500);
                    }
                } catch (loginError) {
                    console.log('Auto-login failed, user can login manually');
                    hideRegistration();
                    showLogin();
                    document.getElementById('login-email').value = userData.email;
                }
            }, 1500);
        }
    } catch (error) {
        console.error('Registration error:', error);
        utils.showNotification(error.message || 'Registration failed. Please try again.', 'error');

        // Reset loading state
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Logout function
function logout() {
    // Clear all storage immediately (no async, no waiting)
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies if any
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Force immediate navigation to home page
    window.location.replace('http://localhost:8080/index.html');
}

// Check authentication on page load
function checkAuth() {
    const userInfo = utils.getUserInfo();

    if (userInfo) {
        // Update UI for authenticated users
        updateAuthUI(userInfo);
    }
}

// Update UI for authenticated users
function updateAuthUI(user) {
    // Update ALL auth-buttons elements on the page
    const authButtons = document.querySelectorAll('.auth-buttons');

    if (authButtons.length > 0) {
        // Handle different possible user object properties (backend returns fullName in camelCase)
        const userName = user.fullName || user.full_name || user.name || user.username || user.email || 'User';
        
        const authHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--gray-700); font-size: 14px;">
                    Welcome, <strong>${userName}</strong>
                </span>
                <button class="btn btn-outline" onclick="logout()">
                    Logout
                </button>
            </div>
        `;
        
        // Update each auth-buttons element
        authButtons.forEach(element => {
            element.innerHTML = authHTML;
        });
    }
}

// Initialize auth on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}
