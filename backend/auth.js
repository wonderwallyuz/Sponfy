require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://127.0.0.1:3000/auth/callback';

// Scopes we need from Spotify
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
].join(' ');

// ── In-memory token store (fine for single-user overlay) ──────────────────────
let tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

// ── Token helpers (exported for use in spotify.js) ────────────────────────────
function getTokenStore() {
  return tokenStore;
}

function setTokenStore(data) {
  tokenStore = { ...tokenStore, ...data };
}

async function refreshAccessToken() {
  if (!tokenStore.refreshToken) throw new Error('No refresh token available');

  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: tokenStore.refreshToken,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      },
    }
  );

  const { access_token, expires_in } = response.data;
  tokenStore.accessToken = access_token;
  tokenStore.expiresAt = Date.now() + expires_in * 1000;

  console.log('  🔄  Access token refreshed');
  return access_token;
}

async function getValidAccessToken() {
  if (!tokenStore.accessToken) throw new Error('Not authenticated');

  // Refresh if expiring within 60 seconds
  if (Date.now() >= tokenStore.expiresAt - 60_000) {
    await refreshAccessToken();
  }

  return tokenStore.accessToken;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Step 1: Redirect user to Spotify login
router.get('/login', (req, res) => {
  if (!CLIENT_ID || CLIENT_ID === 'your_client_id_here') {
    return res.status(500).send(`
      <h2>⚠️ Setup Required</h2>
      <p>You haven't configured your Spotify credentials yet.</p>
      <p>Please copy <code>backend/.env.example</code> to <code>backend/.env</code>
         and fill in your <strong>SPOTIFY_CLIENT_ID</strong> and <strong>SPOTIFY_CLIENT_SECRET</strong>.</p>
      <p>See the <a href="/">README</a> for step-by-step instructions.</p>
    `);
  }

  const params = querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Step 2: Spotify redirects back here with a code
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?auth=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?auth=error&reason=no_code');
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    setTokenStore({
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
    });

    console.log('  ✅  Successfully authenticated with Spotify!');
    res.redirect('/?auth=success');
  } catch (err) {
    console.error('  ❌  OAuth callback error:', err.response?.data || err.message);
    res.redirect('/?auth=error&reason=token_exchange_failed');
  }
});

// Auth status check (used by the overlay UI)
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!tokenStore.accessToken,
    expiresAt: tokenStore.expiresAt,
  });
});

// Logout / clear tokens
router.get('/logout', (req, res) => {
  tokenStore = { accessToken: null, refreshToken: null, expiresAt: null };
  res.redirect('/?auth=logged_out');
});

module.exports = router;
module.exports.getValidAccessToken = getValidAccessToken;
