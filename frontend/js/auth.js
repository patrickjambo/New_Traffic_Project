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
            utils.saveUserInfo(user);

            utils.showNotification(`Login successful! Welcome, ${user.full_name}`, 'success');

            // Hide login modal
            hideLogin();

            // Route based on user role (returned from backend)
            setTimeout(() => {
                switch (user.role) {
                    case 'police':
                        window.location.href = '/police-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = '/admin-dashboard.html';
                        break;
                    default:
                        // Public user stays on home page
                        window.location.reload();
                }
            }, 1500);
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
                        utils.saveUserInfo(user);

                        hideRegistration();
                        utils.showNotification('Logged in successfully!', 'success');

                        setTimeout(() => {
                            switch (user.role) {
                                case 'police':
                                    window.location.href = '/police-dashboard.html';
                                    break;
                                case 'admin':
                                    window.location.href = '/admin-dashboard.html';
                                    break;
                                default:
                                    window.location.reload();
                            }
                        }, 1000);
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
async function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    try {
        // Attempt to notify backend
        await api.logout().catch(() => {
            // Logout might fail if session expired, continue anyway
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local data
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Clear API token
        api.setToken(null);

        // Redirect to home page
        window.location.href = '/';
    }
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
    const authButtons = document.querySelector('.auth-buttons');

    if (authButtons) {
        authButtons.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="color: var(--gray-700); font-size: 14px;">
                    Welcome, <strong>${user.name}</strong>
                </span>
                <button class="btn btn-outline" onclick="logout()">
                    Logout
                </button>
            </div>
        `;
    }
}

// Initialize auth on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}
