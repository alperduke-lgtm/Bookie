const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Import Pool from pg
const fs = require('fs'); // Keep fs for initial setup (if needed) but will be phased out

const app = express();
const PORT = process.env.PORT || 8002;

// --- DATABASE CONFIGURATION ---
// IMPORTANT: In production, this DATABASE_URL should be an environment variable on Render!
// For local testing, you can put it here or load from .env
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://bookie_database_user:MQSHGsFPEVzKiILyuFy5F2XrkGkSHo43@dpg-d6j645haae7s739d79f0-a/bookie_database";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's free PostgreSQL tier
    }
});

// Function to initialize the database table
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                url TEXT,
                color VARCHAR(7),
                hidden BOOLEAN DEFAULT FALSE
            );
        `);
        console.log('Bookmarks table checked/created successfully.');

        // Optionally, if bookmarks.json still exists and has data,
        // you could migrate it to the database here on first run.
        // For simplicity, we'll start with an empty DB if no data.
        // Or, you could ensure your first deploy has an empty bookmarks.json
        // to avoid conflicts.
        
        // For this scenario, we assume bookmarks.json is being deleted,
        // so we don't need a migration from it.
        
        client.release();
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Call database initialization on server start
initializeDatabase();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the current directory (webserver_root)
app.use(express.static(path.join(__dirname)));

// API endpoint to get bookmarks from DB
app.get('/api/bookmarks', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT id, title, url, color, hidden FROM bookmarks ORDER BY id'); // Order by id to maintain logical order
        client.release();
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching bookmarks from DB:', err);
        res.status(500).json({ status: 'error', message: 'Failed to fetch bookmarks.' });
    }
});

// API endpoint to update bookmarks in DB
app.post('/api/bookmarks', async (req, res) => {
    const newBookmarks = req.body;
    try {
        const client = await pool.connect();
        // Start a transaction for bulk updates
        await client.query('BEGIN');

        // Delete existing bookmarks
        await client.query('DELETE FROM bookmarks');

        // Insert new/updated bookmarks with sequential IDs based on array order
        for (let i = 0; i < newBookmarks.length; i++) {
            const bookmark = newBookmarks[i];
            await client.query(
                'INSERT INTO bookmarks (id, title, url, color, hidden) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET title = $2, url = $3, color = $4, hidden = $5;',
                [i + 1, bookmark.title, bookmark.url, bookmark.color, bookmark.hidden] // Use i+1 for new sequential IDs
            );
        }

        await client.query('COMMIT'); // Commit the transaction
        client.release();
        res.json({ status: 'success' });
    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Error saving bookmarks to DB:', err);
        res.status(500).json({ status: 'error', message: 'Failed to save bookmarks.' });
    }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
});