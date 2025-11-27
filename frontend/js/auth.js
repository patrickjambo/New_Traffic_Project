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
        role: formData.get('role'),
    };

    // Show loading state
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';

    try {
        const response = await api.login(credentials);

        if (response.success) {
            // Save token and user info
            api.setToken(response.token);
            utils.saveUserInfo(response.user);

            utils.showNotification('Login successful! Redirecting...', 'success');

            // Redirect based on role
            setTimeout(() => {
                switch (credentials.role) {
                    case 'police':
                        window.location.href = '/police-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = '/admin-dashboard.html';
                        break;
                    default:
                        window.location.reload(); // Reload to show authenticated view
                }
            }, 1000);
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
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        role: 'public', // Default role for registration
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

            // Switch to login modal
            setTimeout(() => {
                hideRegistration();
                showLogin();

                // Pre-fill email
                document.getElementById('login-email').value = userData.email;
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
        await api.logout();
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local data and redirect
        utils.clearUserData();
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
