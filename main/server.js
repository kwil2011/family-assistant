const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const Store = require('electron-store');
const store = new Store();

// Middleware for rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all requests
app.use(limiter);

// Serve static files from the renderer directory
app.use(express.static(path.join(__dirname, '../renderer')));

// API endpoints
app.post('/api/register', express.json(), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Store user data
        const userData = {
            name,
            email,
            password,
            openaiApiKey: undefined,
            googleApiKey: undefined,
            selectedProvider: undefined,
            selectedModel: undefined,
            preferences: undefined
        };
        store.set(`userData-${email}`, userData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', express.json(), async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = store.get(`userData-${email}`);
        if (!userData || userData.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ success: true, userData: { ...userData, password: undefined } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
}); 