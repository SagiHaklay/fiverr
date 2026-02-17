"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const crypto_1 = __importDefault(require("crypto"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize the database with required tables
async function initializeDatabase() {
    try {
        // Create the links table if it doesn't exist
        await db_1.db.none(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        target_url TEXT NOT NULL,
        short_code VARCHAR(10) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0
      )
    `);
        console.log("Database initialized successfully");
    }
    catch (error) {
        console.error("Error initializing database:", error);
        process.exit(1);
    }
}
// Generate a random short code
function generateShortCode(length = 6) {
    // Use crypto for better randomness
    return crypto_1.default.randomBytes(length).toString('base64url').substring(0, length);
}
// GET endpoint to redirect short links to their target URLs
app.get('/:shortCode', async (req, res) => {
    try {
        const { shortCode } = req.params;
        // Find the target URL for this short code
        const link = await db_1.db.oneOrNone('SELECT target_url FROM links WHERE short_code = $1', [shortCode]);
        if (!link) {
            return res.status(404).json({ error: "Short link not found" });
        }
        // Update the access count
        await db_1.db.none('UPDATE links SET access_count = access_count + 1 WHERE short_code = $1', [shortCode]);
        // Redirect to the target URL
        res.redirect(link.target_url);
    }
    catch (error) {
        console.error("Error redirecting short link:", error);
        res.status(500).json({ error: "Failed to redirect short link" });
    }
});
// POST endpoint to create a new short link
app.post('/links', async (req, res) => {
    try {
        const { targetUrl } = req.body;
        if (!targetUrl) {
            return res.status(400).json({ error: "Target URL is required" });
        }
        // Check if URL already exists in the database
        const existingLink = await db_1.db.oneOrNone('SELECT short_code FROM links WHERE target_url = $1', [targetUrl]);
        if (existingLink) {
            // Return existing short URL if found
            return res.status(200).json({
                targetUrl,
                shortCode: existingLink.short_code,
                shortUrl: `${req.protocol}://${req.get('host')}/${existingLink.short_code}`,
                isNew: false
            });
        }
        // Generate a new short code
        let shortCode;
        let isUnique = false;
        // Keep generating until we find a unique code
        while (!isUnique) {
            shortCode = generateShortCode();
            // Check if the generated code already exists
            const exists = await db_1.db.oneOrNone('SELECT id FROM links WHERE short_code = $1', [shortCode]);
            if (!exists) {
                isUnique = true;
            }
        }
        // Save the new mapping
        await db_1.db.none('INSERT INTO links(target_url, short_code) VALUES($1, $2)', [targetUrl, shortCode]);
        // Return the new short URL
        res.status(201).json({
            targetUrl,
            shortCode,
            shortUrl: `${req.protocol}://${req.get('host')}/${shortCode}`,
            isNew: true
        });
    }
    catch (error) {
        console.error("Error creating short link:", error);
        res.status(500).json({ error: "Failed to create short link" });
    }
});
// GET endpoint to retrieve statistics for a short link
app.get('/links/:shortCode/stats', async (req, res) => {
    try {
        const { shortCode } = req.params;
        // Find the link information
        const link = await db_1.db.oneOrNone('SELECT target_url, short_code, created_at, access_count FROM links WHERE short_code = $1', [shortCode]);
        if (!link) {
            return res.status(404).json({ error: "Short link not found" });
        }
        // Return the stats
        res.json({
            targetUrl: link.target_url,
            shortCode: link.short_code,
            shortUrl: `${req.protocol}://${req.get('host')}/${link.short_code}`,
            createdAt: link.created_at,
            accessCount: link.access_count
        });
    }
    catch (error) {
        console.error("Error retrieving link statistics:", error);
        res.status(500).json({ error: "Failed to retrieve link statistics" });
    }
});
// Initialize the database before starting the server
initializeDatabase().then(() => {
    app.listen(3000, () => {
        console.log("Server running on http://localhost:3000");
    });
});
//# sourceMappingURL=server.js.map