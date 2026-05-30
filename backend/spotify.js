const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getValidAccessToken } = require('./auth');

const SPOTIFY_BASE = 'https://api.spotify.com/v1';

// Helper: make an authenticated Spotify API call
async function spotifyGet(endpoint) {
  const token = await getValidAccessToken();
  const response = await axios.get(`${SPOTIFY_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ── GET /api/current-song ─────────────────────────────────────────────────────
router.get('/current-song', async (req, res) => {
  try {
    const data = await spotifyGet('/me/player/currently-playing');

    // Nothing is playing (204 No Content or empty body)
    if (!data || !data.item) {
      return res.json({ isPlaying: false });
    }

    const track = data.item;
    const artists = track.artists.map((a) => a.name).join(', ');

    // Pick the best album art (prefer ~300px)
    const images = track.album.images || [];
    const albumArt =
      images.find((img) => img.width >= 200 && img.width <= 400)?.url ||
      images[0]?.url ||
      null;

    res.json({
      isPlaying: data.is_playing,
      trackId: track.id,
      song: track.name,
      artist: artists,
      album: track.album.name,
      albumArt,
      progress: data.progress_ms,
      duration: track.duration_ms,
      explicit: track.explicit,
      spotifyUrl: track.external_urls?.spotify || null,
    });
  } catch (err) {
    if (err.message === 'Not authenticated') {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    // Spotify returns 204 when player is inactive — axios throws on 204 sometimes
    if (err.response?.status === 204) {
      return res.json({ isPlaying: false });
    }
    console.error('  ❌  /api/current-song error:', err.response?.data || err.message);
    res.status(500).json({ error: 'spotify_api_error', details: err.message });
  }
});

// ── GET /api/queue ────────────────────────────────────────────────────────────
// Requires Spotify Premium
router.get('/queue', async (req, res) => {
  try {
    const data = await spotifyGet('/me/player/queue');

    if (!data) {
      return res.json({ queue: [] });
    }

    // Return next 3 tracks from queue
    const next = (data.queue || []).slice(0, 3).map((track) => {
      const images = track.album?.images || [];
      const albumArt =
        images.find((img) => img.width >= 200 && img.width <= 400)?.url ||
        images[0]?.url ||
        null;
      return {
        trackId: track.id,
        song: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album?.name || '',
        albumArt,
        duration: track.duration_ms,
      };
    });

    res.json({ queue: next });
  } catch (err) {
    if (err.message === 'Not authenticated') {
      return res.status(401).json({ error: 'not_authenticated' });
    }
    if (err.response?.status === 403) {
      return res.status(403).json({ error: 'premium_required', message: 'Spotify Premium is required to access the queue.' });
    }
    console.error('  ❌  /api/queue error:', err.response?.data || err.message);
    res.status(500).json({ error: 'spotify_api_error', details: err.message });
  }
});

module.exports = router;
