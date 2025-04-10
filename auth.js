import config from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Validate email and password
            if (!validateEmail(email)) {
                showError('Please enter a valid email address');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long');
                return;
            }

            try {
                const response = await fetch(`${config.apiUrl}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                // Store user data
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', data.user.name);
                
                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                }

                showSuccess('Login successful!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (error) {
                showError(error.message);
            }
        });
    }
    
    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            // Validate inputs
            if (name.length < 2) {
                showError('Please enter your full name');
                return;
            }
            
            if (!validateEmail(email)) {
                showError('Please enter a valid email address');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters long');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            if (!agreeTerms) {
                showError('Please agree to the Terms & Conditions');
                return;
            }

            try {
                const response = await fetch(`${config.apiUrl}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }

                showSuccess('Registration successful! Please log in.');
                setTimeout(() => {
                    toggleForm('login');
                }, 1500);
            } catch (error) {
                showError(error.message);
            }
        });
    }
    
    // Handle registration form submission
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Clear previous error messages
        clearErrors();

        // Validate inputs
        if (!email || !password || !confirmPassword) {
            showError('All fields are required');
            return;
        }

        if (!validateEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (!agreeTerms) {
            showError('Please agree to the Terms & Conditions');
            return;
        }

        try {
            const response = await fetch(`${config.apiUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Registration successful
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userEmail', email);
            
            // Show success message
            showSuccess('Registration successful! Redirecting...');
            
            // Redirect to home page after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            showError(error.message);
        }
    });

    // Helper Functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.textContent = message;
        showAlert(errorDiv);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.textContent = message;
        showAlert(successDiv);
    }

    function showAlert(alertDiv) {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Add the new alert before the form
        const form = document.querySelector('.auth-form.active');
        form.insertBefore(alertDiv, form.firstChild);

        // Remove the alert after 3 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    // Utility functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const form = document.getElementById('registerForm');
        const existingError = form.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        form.insertBefore(errorDiv, form.firstChild);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        const form = document.getElementById('registerForm');
        form.insertBefore(successDiv, form.firstChild);
    }

    function clearErrors() {
        const form = document.getElementById('registerForm');
        const errorMessages = form.querySelectorAll('.error-message, .success-message');
        errorMessages.forEach(msg => msg.remove());
    }

    // Check authentication status on page load
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userId && userEmail) {
        // User is logged in
        updateNavigation(true, userEmail);
    } else {
        // User is not logged in
        updateNavigation(false);
    }
});

function updateNavigation(isLoggedIn, email = '') {
    const authLinks = document.querySelectorAll('.auth-link');
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';

    if (isLoggedIn) {
        userInfo.innerHTML = `
            <span class="user-email">${email}</span>
            <button onclick="logout()" class="logout-btn">Logout</button>
        `;
        authLinks[0].parentNode.replaceChild(userInfo, authLinks[0]);
        authLinks[1].style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    window.location.reload();
}
