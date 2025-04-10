const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

// Use environment port or default to 3000
const PORT = process.env.PORT || 3000;

// Configure CORS for production
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000']
}));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// Serve static files
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an audio file!'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Initialize SQLite database
const db = new sqlite3.Database(process.env.NODE_ENV === 'production' 
    ? '/tmp/music.db'  // Use /tmp for Render.com
    : 'music.db', 
    (err) => {
        if (err) {
            console.error('Error opening database:', err);
        } else {
            console.log('Connected to SQLite database');
            // Create users table if it doesn't exist
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Create tracks table if it doesn't exist
            db.run(`CREATE TABLE IF NOT EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                description TEXT,
                genre TEXT,
                price REAL,
                filename TEXT,
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
        }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (row) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into database
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', 
                [email, hashedPassword], 
                function(err) {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Error creating user' });
                    }

                    res.status(201).json({ 
                        message: 'User registered successfully',
                        userId: this.lastID 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user) {
                return res.status(400).json({ error: 'User not found' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid password' });
            }

            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// File upload endpoint
app.post('/api/upload', upload.single('audio'), async (req, res) => {
    try {
        const { title, description, genre, price, email } = req.body;
        
        // Get user ID from email
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user) {
                return res.status(400).json({ error: 'User not found' });
            }

            // Insert track info into database
            db.run(
                'INSERT INTO tracks (user_id, title, description, genre, price, filename) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, title, description, genre, price || 0, req.file.filename],
                (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error saving track info' });
                    }
                    res.json({
                        message: 'Track uploaded successfully',
                        filename: req.file.filename
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's tracks
app.get('/api/tracks/:email', (req, res) => {
    const { email } = req.params;
    
    db.all(
        `SELECT t.* FROM tracks t
        JOIN users u ON t.user_id = u.id
        WHERE u.email = ?
        ORDER BY t.upload_date DESC`,
        [email],
        (err, tracks) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(tracks);
        }
    );
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
