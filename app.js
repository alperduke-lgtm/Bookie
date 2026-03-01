const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8002; // We'll continue using port 8002
const BOOKMARKS_FILE = path.join(__dirname, 'bookmarks.json');

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the current directory (webserver_root)
app.use(express.static(path.join(__dirname)));

// API endpoint to get bookmarks
app.get('/api/bookmarks', (req, res) => {
    fs.readFile(BOOKMARKS_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading bookmarks.json:', err);
            return res.status(500).json({ status: 'error', message: 'Failed to read bookmarks.' });
        }
        res.json(JSON.parse(data));
    });
});

// API endpoint to update bookmarks
app.post('/api/bookmarks', (req, res) => {
    const newBookmarks = req.body;
    fs.writeFile(BOOKMARKS_FILE, JSON.stringify(newBookmarks, null, 4), 'utf8', (err) => {
        if (err) {
            console.error('Error writing bookmarks.json:', err);
            return res.status(500).json({ status: 'error', message: 'Failed to save bookmarks.' });
        }
        res.json({ status: 'success' });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
    console.log(`Access your dashboard at http://192.168.0.26:${PORT}`);
});