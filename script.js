// User Management System
const AUTH_KEY = 'beats_web_auth';
const USERS_KEY = 'beats_web_users';
const ANALYTICS_KEY = 'beats_web_analytics';

// iCloud configuration
const ICLOUD_CONFIG = {
    container: 'beats-web-data',
    apiKey: 'YOUR_ICLOUD_API_KEY'  // Replace with your actual iCloud API key
};

// Analytics tracking
class Analytics {
    constructor() {
        this.visits = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '[]');
    }

    trackVisit() {
        const visit = {
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent
        };
        this.visits.push(visit);
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.visits));
        this.syncToiCloud(visit);
    }

    async syncToiCloud(data) {
        try {
            const response = await fetch('YOUR_ICLOUD_ENDPOINT', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ICLOUD_CONFIG.apiKey}`
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to sync with iCloud');
        } catch (error) {
            console.error('iCloud sync failed:', error);
        }
    }
}

// Auth Modal Functions
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    switchAuthTab(tab);
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return {
        score: strength,
        label: strength < 2 ? 'weak' : strength < 4 ? 'medium' : 'strong'
    };
}

// Auth System Class
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        this.currentUser = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
        this.analytics = new Analytics();
        this.restrictedFeatures = [
            '.upload-section',
            '.audio-player',
            '.file-upload',
            '.submit-upload',
            '.download-btn',
            '.play-sample-btn'
        ];
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login({
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value,
                remember: document.getElementById('rememberMe').checked
            });
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register({
                name: document.getElementById('registerName').value,
                email: document.getElementById('registerEmail').value,
                password: document.getElementById('registerPassword').value,
                confirmPassword: document.getElementById('confirmPassword').value,
                termsAccepted: document.getElementById('termsAgree').checked
            });
        });

        // Password strength indicator
        const registerPassword = document.getElementById('registerPassword');
        const strengthIndicator = document.querySelector('.password-strength');
        
        registerPassword.addEventListener('input', () => {
            const strength = checkPasswordStrength(registerPassword.value);
            strengthIndicator.className = `password-strength ${strength.label}`;
        });

        // Logout button
        document.querySelector('.logout-btn').addEventListener('click', () => this.logout());
    }

    updateUI() {
        const isLoggedIn = !!this.currentUser;
        document.body.classList.toggle('is-authenticated', isLoggedIn);
        
        // Update navigation
        const authContainer = document.querySelector('.auth-container');
        const userInfo = document.querySelector('.user-info');
        
        if (isLoggedIn && authContainer) {
            authContainer.innerHTML = `
                <div class="user-profile">
                    <span class="welcome">Welcome, ${this.currentUser.name}</span>
                    <button class="logout-btn">Logout</button>
                </div>
            `;
            
            const logoutBtn = authContainer.querySelector('.logout-btn');
            logoutBtn?.addEventListener('click', () => this.logout());
        }

        // Update restricted features visibility
        this.updateRestrictedFeatures(isLoggedIn);
    }

    setupFeatureRestrictions() {
        // Add login prompts to restricted features
        this.restrictedFeatures.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!this.currentUser) {
                    element.classList.add('restricted');
                    element.addEventListener('click', (e) => {
                        if (!this.currentUser) {
                            e.preventDefault();
                            e.stopPropagation();
                            showMessage('Please log in to access this feature', 'info');
                            document.querySelector('.auth-tab[data-tab="login"]')?.click();
                        }
                    }, true);
                }
            });
        });
    }

    updateRestrictedFeatures(isLoggedIn) {
        this.restrictedFeatures.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (isLoggedIn) {
                    element.classList.remove('restricted');
                    element.title = '';
                } else {
                    element.classList.add('restricted');
                    element.title = 'Login required';
                }
            });
        });
    }

    async register(userData) {
        try {
            // Validation
            if (!userData.name || !userData.email || !userData.password) {
                throw new Error('All fields are required');
            }

            if (userData.password !== userData.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (!userData.termsAccepted) {
                throw new Error('Please accept the terms and conditions');
            }

            const strength = checkPasswordStrength(userData.password);
            if (strength.score < 3) {
                throw new Error('Password is too weak. Please include uppercase, numbers, and special characters');
            }

            // Check if email already exists
            if (this.users.some(user => user.email === userData.email)) {
                throw new Error('Email already registered');
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name: userData.name,
                email: userData.email,
                password: await this.hashPassword(userData.password),
                createdAt: new Date().toISOString()
            };

            this.users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(this.users));

            // Auto login after registration
            this.currentUser = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(this.currentUser));

            this.updateUI();
            closeAuthModal();
            showMessage('Registration successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    async login(userData) {
        try {
            const user = this.users.find(u => u.email === userData.email);
            
            if (!user) {
                throw new Error('Invalid email or password');
            }

            const passwordMatch = await this.verifyPassword(userData.password, user.password);
            
            if (!passwordMatch) {
                throw new Error('Invalid email or password');
            }

            this.currentUser = {
                id: user.id,
                name: user.name,
                email: user.email
            };

            if (userData.remember) {
                localStorage.setItem(AUTH_KEY, JSON.stringify(this.currentUser));
            } else {
                sessionStorage.setItem(AUTH_KEY, JSON.stringify(this.currentUser));
            }

            this.updateUI();
            closeAuthModal();
            showMessage('Login successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(AUTH_KEY);
        this.updateUI();
        showMessage('Logged out successfully', 'success');
    }

    async hashPassword(password) {
        // In a real application, use a proper password hashing library
        // This is just for demonstration
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async verifyPassword(password, hash) {
        const newHash = await this.hashPassword(password);
        return newHash === hash;
    }

    async socialLogin(provider) {
        // Simulate social login
        const fakeUserData = {
            id: Date.now().toString(),
            name: 'User_' + Math.random().toString(36).substr(2, 9),
            email: `user_${Date.now()}@${provider}.com`,
            provider: provider,
            accessToken: 'fake_token_' + Date.now()
        };

        localStorage.setItem(AUTH_KEY, JSON.stringify(fakeUserData));
        this.currentUser = fakeUserData;
        this.updateUI();
        
        return fakeUserData;
    }

    async uploadFile(file) {
        try {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <div class="progress-bar">
                        <div class="progress"></div>
                    </div>
                </div>
            `;
            fileList.appendChild(fileItem);

            // Quality check
            const qualityCheck = await checkAudioQuality(file);
            if (!qualityCheck.passed) {
                throw new Error(qualityCheck.message);
            }

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('userEmail', this.currentUser.email);

            // Upload to server
            const response = await fetch(`${config.apiUrl}/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });

            if (!response.ok) throw new Error('Upload failed');
            
            const data = await response.json();
            
            // Sync to iCloud
            await this.analytics.syncToiCloud({
                type: 'file_upload',
                filename: file.name,
                timestamp: new Date().toISOString(),
                user: this.currentUser.email
            });

            // Send email notification
            await fetch(`${config.apiUrl}/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentUser.token}`
                },
                body: JSON.stringify({
                    type: 'file_upload',
                    filename: file.name,
                    userEmail: this.currentUser.email
                })
            });

            updateFileItemAfterUpload(fileItem, data.downloadUrl);
            showMessage('File uploaded successfully!', 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showMessage(error.message || 'Upload failed', 'error');
        }
    }
}

// Initialize auth system
const auth = new AuthSystem();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinksList = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const searchInput = document.querySelector('.search-container input');
    const searchButton = document.querySelector('.search-button');
    const fileList = document.getElementById('fileList');
    const audioPlayer = document.getElementById('audioPlayer');
    const audioFileInput = document.getElementById('audioFileInput');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const backToTopButton = document.getElementById('backToTop');
    const authLoginForm = document.getElementById('loginForm');
    const authRegisterForm = document.getElementById('registerForm');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const contactForm = document.getElementById('contactForm');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const submitUploadBtn = document.getElementById('submitUpload');
    const footerTeamLink = document.querySelector('.footer-team-link');
    const socialLinks = document.querySelectorAll('.social-icon');
    const socialButtons = document.querySelectorAll('.social-btn');

    // Content Map
    const contentMap = {
        'home': {
            keywords: ['home', 'welcome', 'community', 'music', 'production', 'theory'],
            section: 'home'
        },
        'software': {
            keywords: ['software', 'fl studio', 'flstudio', 'fl', 'studio', 'ableton', 'live', 'daw', 'production', 
                      'vst', 'plugin', 'plugins', 'instrument', 'effects', 'synth', 'synthesizer', 'kontakt', 'omnisphere', 'serum', 'massive'],
            section: 'music'
        },
        'beats': {
            keywords: ['beats', 'samples', 'packs', 'drum', 'drums', 'loops', 'melody', 'trap', 'rnb', 'r&b', 
                      '808', 'kicks', 'snares', 'percussion', 'guitar', 'piano', 'synth', 'vocal'],
            section: 'beats'
        },
        'about': {
            keywords: ['about', 'mission', 'courses', 'community', 'resources', 'tools'],
            section: 'about'
        },
        'contact': {
            keywords: ['contact', 'email', 'phone', 'address', 'message', 'touch'],
            section: 'contact'
        }
    };

    // Mobile Navigation
    const searchContainer = document.querySelector('.search-container');
    
    // Toggle menu
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        searchContainer.classList.remove('active');
    });

    // Toggle search on mobile
    searchButton.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            searchContainer.classList.toggle('active');
            navLinks.classList.remove('active');
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-links') && 
            !e.target.closest('.menu-toggle') && 
            !e.target.closest('.search-container') && 
            !e.target.closest('.search-button')) {
            navLinks.classList.remove('active');
            searchContainer.classList.remove('active');
        }
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navLinks.classList.remove('active');
            }
        });
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth > 768) {
                navLinks.classList.remove('active');
                searchContainer.classList.remove('active');
            }
        }, 250);
    });

    // Mobile Menu Toggle
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent document click from immediately closing menu
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
            
            // Change icon based on menu state
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = navLinks.classList.contains('active') ? 
                    'fas fa-times' : 'fas fa-bars';
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && 
                !navLinks.contains(e.target) && 
                navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });

        // Close menu when clicking a link
        navLinksList.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navLinks?.classList.remove('active');
            menuToggle?.classList.remove('active');
            const icon = menuToggle?.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }
    });

    // Active link highlighting
    function setActiveLink() {
        const scrollPosition = window.scrollY + 100; // Offset for header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinksList.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', setActiveLink);
    window.addEventListener('load', setActiveLink);

    function searchContent(query) {
        query = query.toLowerCase().trim();
        
        if (!query) return;

        // Search through the content map
        for (const [key, content] of Object.entries(contentMap)) {
            if (content.keywords.some(keyword => query.includes(keyword))) {
                // Navigate to the section
                const element = document.getElementById(content.section);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    // Highlight the section briefly
                    element.classList.add('highlight');
                    setTimeout(() => {
                        element.classList.remove('highlight');
                    }, 2000);
                    return;
                }
            }
        }

        // If no match found, show alert
        alert('No matching content found. Try different keywords.');
    }

    // Search when button is clicked
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            searchContent(searchInput.value);
        });
    }

    // Search when Enter key is pressed
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchContent(searchInput.value);
            }
        });
    }

    // Form toggle functionality
    function toggleForm(formType) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginBtn = document.querySelector('.toggle-btn:nth-child(1)');
        const registerBtn = document.querySelector('.toggle-btn:nth-child(2)');

        if (formType === 'login') {
            if (loginForm) loginForm.classList.add('active');
            if (registerForm) registerForm.classList.remove('active');
            if (loginBtn) loginBtn.classList.add('active');
            if (registerBtn) registerBtn.classList.remove('active');
        } else {
            if (registerForm) registerForm.classList.add('active');
            if (loginForm) loginForm.classList.remove('active');
            if (registerBtn) registerBtn.classList.add('active');
            if (loginBtn) loginBtn.classList.remove('active');
        }
    }

    window.toggleForm = toggleForm;  // Make toggleForm available globally

    // Register form submission handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (!agreeTerms) {
                showMessage('Please agree to the Terms & Conditions', 'error');
                return;
            }

            try {
                // Here you would typically make an API call to your backend
                // For now, we'll just simulate a successful registration
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
                
                showMessage('Registration successful! Please log in.', 'success');
                toggleForm('login'); // Switch to login form
                registerForm.reset(); // Clear the form
            } catch (error) {
                showMessage('Registration failed. Please try again.', 'error');
            }
        });
    }

    // Contact Form Handling
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('.submit-btn');
            const formStatus = contactForm.querySelector('.form-status');
            const formData = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value
            };
            
            // Disable submit button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            
            try {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // In a real implementation, you would make an API call here:
                // const response = await fetch('/api/contact', {
                //     method: 'POST',
                //     headers: { 'Content-Type': 'application/json' },
                //     body: JSON.stringify(formData)
                // });
                
                // Show success message
                formStatus.className = 'form-status success';
                formStatus.textContent = 'Message sent successfully! We will get back to you soon.';
                contactForm.reset();
                
                // Hide success message after 5 seconds
                setTimeout(() => {
                    formStatus.style.display = 'none';
                }, 5000);
            } catch (error) {
                // Show error message
                formStatus.className = 'form-status error';
                formStatus.textContent = 'Failed to send message. Please try again.';
            } finally {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }
        });
    }

    // File Upload Handling
    if (fileList) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileList.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop zone when dragging over it
        ['dragenter', 'dragover'].forEach(eventName => {
            fileList.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileList.addEventListener(eventName, unhighlight, false);
        });

        // Handle dropped files
        fileList.addEventListener('drop', handleDrop, false);

        // Handle selected files
        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', () => {
                audioFileInput.click();
            });
        }

        if (audioFileInput) {
            audioFileInput.addEventListener('change', function() {
                handleFiles(this.files);
            });
        }
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        fileList.classList.add('drag-over');
    }

    function unhighlight(e) {
        fileList.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    async function handleFiles(files) {
        if (files.length > 5) {
            showAlert('error', 'Maximum 5 files allowed at once');
            return;
        }

        for (const file of files) {
            if (!file.type.startsWith('audio/')) {
                showAlert('error', `${file.name} is not an audio file`);
                continue;
            }

            // Check file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                showAlert('error', `${file.name} exceeds 50MB size limit`);
                continue;
            }

            try {
                const isHighQuality = await checkAudioQuality(file);
                if (!isHighQuality) {
                    showAlert('error', `${file.name} does not meet quality requirements`);
                    continue;
                }

                // Add file to list with upload status
                const fileItem = await uploadFile(file);
                if (fileItem) {
                    fileList.appendChild(fileItem);
                }
            } catch (error) {
                showAlert('error', `Error processing ${file.name}: ${error.message}`);
            }
        }
    }

    async function uploadFile(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <i class="fas fa-music"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize} MB</div>
                    <div class="upload-progress">
                        <div class="progress-bar"></div>
                        <span class="progress-text">0%</span>
                    </div>
                </div>
            </div>
            <div class="file-actions">
                <button class="cancel-upload" title="Cancel">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const progressBar = fileItem.querySelector('.progress-bar');
        const progressText = fileItem.querySelector('.progress-text');
        const cancelButton = fileItem.querySelector('.cancel-upload');
        
        try {
            const formData = new FormData();
            formData.append('audio', file);

            const xhr = new XMLHttpRequest();
            let cancelled = false;

            cancelButton.addEventListener('click', () => {
                cancelled = true;
                xhr.abort();
                fileItem.remove();
            });

            await new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.textContent = percent + '%';
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        updateFileItemAfterUpload(fileItem, response.downloadUrl);
                        resolve();
                    } else {
                        reject(new Error('Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

                // For demo, simulate upload with setTimeout
                setTimeout(() => {
                    if (!cancelled) {
                        updateFileItemAfterUpload(fileItem, '#');
                        resolve();
                    }
                }, 2000);

                // In real implementation, uncomment this:
                // xhr.open('POST', '/api/upload');
                // xhr.send(formData);
            });

            return fileItem;
        } catch (error) {
            showAlert('error', `Failed to upload ${file.name}: ${error.message}`);
            fileItem.remove();
            return null;
        }
    }

    function updateFileItemAfterUpload(fileItem, downloadUrl) {
        const progressContainer = fileItem.querySelector('.upload-progress');
        const actionsContainer = fileItem.querySelector('.file-actions');
        
        // Update status
        progressContainer.innerHTML = '<span class="upload-status success">Published</span>';
        
        // Update actions
        actionsContainer.innerHTML = `
            <button onclick="downloadFile('${downloadUrl}')" class="download-btn" title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button onclick="removeFile(this)" class="remove-btn" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }

    function downloadFile(url) {
        // In a real implementation, this would be an actual URL
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function checkAudioQuality(file) {
        return new Promise((resolve) => {
            const audio = document.createElement('audio');
            const reader = new FileReader();
            
            reader.onload = function(e) {
                audio.src = e.target.result;
                
                audio.addEventListener('loadedmetadata', function() {
                    // For this example, we'll consider any audio file as high quality
                    // In a real implementation, you would check:
                    // - Actual bitrate using Web Audio API
                    // - Sample rate using audio.sampleRate
                    // - Audio format validation
                    resolve(true);
                });
                
                audio.addEventListener('error', function() {
                    resolve(false);
                });
            };
            
            reader.readAsDataURL(file);
        });
    }

    function showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.upload-container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => alertDiv.remove(), 3000);
    }

    function removeFile(button) {
        button.closest('.file-item').remove();
    }

    // File Upload Submit Button
    if (submitUploadBtn) {
        // Show/hide submit button based on file list content
        const observer = new MutationObserver(() => {
            submitUploadBtn.style.display = fileList.children.length > 0 ? 'flex' : 'none';
        });

        observer.observe(fileList, { childList: true });

        submitUploadBtn.addEventListener('click', async () => {
            const fileItems = fileList.querySelectorAll('.file-item');
            if (fileItems.length === 0) {
                showAlert('error', 'No files to upload');
                return;
            }

            submitUploadBtn.disabled = true;
            submitUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            try {
                // Simulate upload process
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                showAlert('success', 'All files uploaded successfully!');
                fileList.innerHTML = '';
                
                // In real implementation, you would:
                // 1. Create a FormData with all files
                // 2. Send to server
                // 3. Handle response
                // 4. Show appropriate success/error message
            } catch (error) {
                showAlert('error', 'Failed to upload files');
            } finally {
                submitUploadBtn.disabled = false;
                submitUploadBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Upload';
            }
        });
    }

    // Social Links Tracking
    socialLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const platform = link.classList.contains('youtube') ? 'YouTube' :
                           link.classList.contains('instagram') ? 'Instagram' :
                           link.classList.contains('soundcloud') ? 'SoundCloud' : 'Unknown';
            
            // In real implementation, you might want to track these clicks
            console.log(`Clicked ${platform} link`);
        });
    });

    // Footer Team Link Smooth Scroll
    if (footerTeamLink) {
        footerTeamLink.addEventListener('click', (e) => {
            e.preventDefault();
            const teamSection = document.getElementById('team');
            if (teamSection) {
                teamSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Back to top button functionality
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Utility functions
    function showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.content');
        container.insertBefore(messageDiv, container.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    function updateSearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No results found</p>';
            return;
        }

        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'search-result';
            resultElement.innerHTML = `
                <h3>${result.title}</h3>
                <p>${result.description}</p>
            `;
            resultsContainer.appendChild(resultElement);
        });
    }

    // Auth Tabs Functionality
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and forms
            authTabs.forEach(t => t.classList.remove('active'));
            authForms.forEach(f => f.classList.remove('active'));

            // Add active class to clicked tab and corresponding form
            tab.classList.add('active');
            const formId = `${tab.dataset.tab}Form`;
            document.getElementById(formId).classList.add('active');
        });
    });

    // Form Submissions
    authLoginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authLoginForm.querySelector('input[type="email"]').value;
        const password = authLoginForm.querySelector('input[type="password"]').value;

        try {
            await auth.login(email, password);
            showMessage('Login successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    authRegisterForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            name: authRegisterForm.querySelector('input[type="text"]').value,
            email: authRegisterForm.querySelector('input[type="email"]').value,
            password: authRegisterForm.querySelector('input[type="password"]').value,
            confirmPassword: authRegisterForm.querySelectorAll('input[type="password"]')[1].value
        };

        if (formData.password !== formData.confirmPassword) {
            showMessage('Passwords do not match!', 'error');
            return;
        }

        try {
            await auth.register(formData);
            showMessage('Registration successful!', 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    });

    // Social Authentication
    socialButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const provider = button.className.split(' ')[1]; // Get provider name from class
            try {
                await auth.socialLogin(provider);
                showMessage(`${provider} login successful!`, 'success');
            } catch (error) {
                showMessage(`${provider} login failed: ${error.message}`, 'error');
            }
        });
    });
});

// Close modal when clicking outside
document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeAuthModal();
    }
});

// Message system
function showMessage(message, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message ${type}`;
    messageContainer.textContent = message;
    
    document.body.appendChild(messageContainer);
    
    setTimeout(() => {
        messageContainer.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        messageContainer.classList.remove('show');
        setTimeout(() => messageContainer.remove(), 300);
    }, 3000);
}
