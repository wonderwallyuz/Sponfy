require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const authRouter = require('./auth');
const spotifyRouter = require('./spotify');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'spotify-overlay-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/api', spotifyRouter);

// ── Serve frontend ────────────────────────────────────────────────────────────
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Catch-all: serve index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🎵  Spotify Overlay Backend');
  console.log(`  ✅  Server running at http://127.0.0.1:${PORT}`);
  console.log(`  🔐  Authenticate at  http://127.0.0.1:${PORT}/auth/login`);
  console.log(`  🖥️   Overlay ready at  http://127.0.0.1:${PORT}`);
  console.log('');
});
