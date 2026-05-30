/* ═══════════════════════════════════════════════════════════════════
   Spotify Overlay — app.js
   Polls /api/current-song every 3s, animates transitions, interpolates
   the progress bar smoothly between polls using requestAnimationFrame.
   ═══════════════════════════════════════════════════════════════════ */

// ── Config ──────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 3000;  // How often to fetch from backend
const QUEUE_ENABLED     = true;  // Set false if you don't have Premium

// ── Element refs ─────────────────────────────────────────────────────
const $overlay        = document.getElementById('overlay');
const $setupBanner    = document.getElementById('setup-banner');
const $nothingPlaying = document.getElementById('nothing-playing');

const $albumArt       = document.getElementById('album-art');
const $albumArtPrev   = document.getElementById('album-art-prev');
const $albumGlow      = document.getElementById('album-glow');
const $explicitBadge  = document.getElementById('explicit-badge');

const $songTitle      = document.getElementById('song-title');
const $artistName     = document.getElementById('artist-name');
const $trackText      = document.getElementById('track-text');
const $playingInd     = document.getElementById('playing-indicator');

const $progressFill   = document.getElementById('progress-fill');
const $progressThumb  = document.getElementById('progress-thumb');
const $timeCurrent    = document.getElementById('time-current');
const $timeTotal      = document.getElementById('time-total');

const $nextTrack      = document.getElementById('next-track');
const $nextArt        = document.getElementById('next-art');
const $nextTitle      = document.getElementById('next-title');
const $nextArtist     = document.getElementById('next-artist');

// ── State ────────────────────────────────────────────────────────────
let currentTrackId    = null;
let progressMs        = 0;
let durationMs        = 1;
let isPlaying         = false;
let lastPollTimestamp = 0;
let rafId             = null;

// ── Helpers ──────────────────────────────────────────────────────────
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function show(el)  { el.classList.remove('hidden'); }
function hide(el)  { el.classList.add('hidden'); }

function setProgress(pct) {
  const clamped = Math.min(100, Math.max(0, pct));
  $progressFill.style.width  = `${clamped}%`;
  $progressThumb.style.left  = `${clamped}%`;
}

// Smooth progress interpolation between polls
function tickProgress() {
  if (!isPlaying) return;

  const elapsed = Date.now() - lastPollTimestamp;
  const simulated = progressMs + elapsed;
  const pct = (simulated / durationMs) * 100;

  setProgress(pct);
  $timeCurrent.textContent = formatTime(Math.min(simulated, durationMs));

  rafId = requestAnimationFrame(tickProgress);
}

function startProgressTick() {
  if (rafId) cancelAnimationFrame(rafId);
  lastPollTimestamp = Date.now();
  tickProgress();
}

function stopProgressTick() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

// ── Album Art Transition ──────────────────────────────────────────────
function transitionAlbumArt(newSrc) {
  // Copy current → prev layer (sits underneath)
  $albumArtPrev.src = $albumArt.src;

  // Clear animation classes so we can re-trigger
  $albumArt.classList.remove('fade-in', 'slide-in');
  void $albumArt.offsetWidth; // force reflow

  $albumArt.src = newSrc;
  $albumArt.classList.add('slide-in');

  // Sync glow colour — extract dominant color via canvas (best-effort)
  $albumArt.onload = () => extractAndApplyGlow($albumArt);
}

// Extract a rough dominant color from album art and apply as glow
function extractAndApplyGlow(imgEl) {
  try {
    const canvas  = document.createElement('canvas');
    canvas.width  = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, 4, 4);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    $albumGlow.style.background = `rgb(${r},${g},${b})`;
  } catch {
    // Cross-origin images may block canvas — fall back to Spotify green
    $albumGlow.style.background = '#1DB954';
  }
}

// ── Text Transition ───────────────────────────────────────────────────
function transitionText(song, artist) {
  $trackText.classList.remove('animate-in');
  void $trackText.offsetWidth;
  $trackText.classList.add('animate-in');

  $songTitle.textContent   = song;
  $artistName.textContent  = artist;

  // Enable marquee if title overflows
  const titleWidth = $songTitle.scrollWidth;
  const containerWidth = $songTitle.parentElement.offsetWidth;
  if (titleWidth > containerWidth + 10) {
    const offset = -(titleWidth - containerWidth + 16);
    $songTitle.style.setProperty('--marquee-offset', `${offset}px`);
    $songTitle.classList.add('marquee');
  } else {
    $songTitle.style.removeProperty('--marquee-offset');
    $songTitle.classList.remove('marquee');
  }
}

// ── Queue fetch ───────────────────────────────────────────────────────
async function updateQueue() {
  if (!QUEUE_ENABLED) return;
  try {
    const res  = await fetch('/api/queue');
    if (!res.ok) { hide($nextTrack); return; }
    const data = await res.json();
    const next = data.queue?.[0];
    if (next) {
      $nextArt.src            = next.albumArt || '';
      $nextTitle.textContent  = next.song;
      $nextArtist.textContent = next.artist;
      show($nextTrack);
    } else {
      hide($nextTrack);
    }
  } catch {
    hide($nextTrack);
  }
}

// ── Main update loop ──────────────────────────────────────────────────
async function fetchCurrentSong() {
  try {
    const res  = await fetch('/api/current-song');

    // 401 = not authenticated yet
    if (res.status === 401) {
      hide($overlay);
      hide($nothingPlaying);
      show($setupBanner);
      stopProgressTick();
      return;
    }

    hide($setupBanner);
    const data = await res.json();

    // Nothing playing
    if (!data.isPlaying && !data.trackId) {
      hide($overlay);
      show($nothingPlaying);
      stopProgressTick();
      return;
    }

    // We have track data (possibly paused)
    hide($nothingPlaying);
    show($overlay);

    const trackChanged = data.trackId !== currentTrackId;

    // ── Track changed → animate transition ──────────────────────────
    if (trackChanged) {
      currentTrackId = data.trackId;

      if (data.albumArt) transitionAlbumArt(data.albumArt);
      transitionText(data.song, data.artist);

      // Explicit badge
      if (data.explicit) show($explicitBadge);
      else                hide($explicitBadge);

      // Reset progress immediately on track change
      progressMs  = data.progress  || 0;
      durationMs  = data.duration  || 1;
      $timeTotal.textContent = formatTime(durationMs);
      setProgress((progressMs / durationMs) * 100);

      // Fetch queue for next-up section
      updateQueue();
    } else {
      // Same track — update progress from server (corrects drift)
      progressMs = data.progress  || 0;
      durationMs = data.duration  || 1;
      $timeTotal.textContent = formatTime(durationMs);
    }

    // ── Playback state ───────────────────────────────────────────────
    isPlaying = data.isPlaying;
    lastPollTimestamp = Date.now();

    if (isPlaying) {
      $playingInd.classList.remove('paused');
      startProgressTick();
    } else {
      $playingInd.classList.add('paused');
      stopProgressTick();
      setProgress((progressMs / durationMs) * 100);
      $timeCurrent.textContent = formatTime(progressMs);
    }

  } catch (err) {
    console.warn('[overlay] fetch error:', err.message);
    // Don't flash the UI on transient network errors
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────
(async function init() {
  // Check auth status first — show setup banner fast if not logged in
  try {
    const statusRes  = await fetch('/auth/status');
    const statusData = await statusRes.json();
    if (!statusData.authenticated) {
      hide($overlay);
      hide($nothingPlaying);
      show($setupBanner);
    }
  } catch { /* backend not ready yet */ }

  // Start polling
  fetchCurrentSong();
  setInterval(fetchCurrentSong, POLL_INTERVAL_MS);
})();
