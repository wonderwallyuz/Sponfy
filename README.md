# 🎵 Spotify Now Playing Overlay

A real-time Spotify overlay for **TikTok Live Studio** and **OBS**, featuring album art, animated transitions, and a live progress bar — all on a transparent background.

---

## ✨ Features

- 🎨 **Album art** with crossfade/slide-in animations on track change
- 🎵 **Song title & artist** with fade-in transitions
- 📊 **Live progress bar** — smooth interpolation between polls
- ⏭️ **"Up Next" section** (optional, requires Spotify Premium)
- 🌈 **Dynamic glow** — background glow matches album art color
- 🔤 **Marquee scrolling** for long track names
- 🪟 **Transparent background** — perfect as browser source overlay
- 🔄 **Auto-refresh** every 3 seconds

---

## 🛠️ Prerequisites

Before you start, make sure you have:

- [Node.js](https://nodejs.org/) **v18 or later** installed
- A **Spotify account** (Free or Premium)
- Spotify **Desktop app** installed and running

---

## Step 1 — Create a Spotify Developer App

This is a one-time setup to get your API credentials.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in the form:
   - **App name**: `My Overlay` (anything you like)
   - **App description**: `Spotify overlay for streaming`
   - **Redirect URI**: `http://127.0.0.1:3000/auth/callback`
     ⚠️ This must be **exactly** this — copy-paste it!
   - **Which API/SDKs are you planning to use?**: check **Web API**
5. Click **Save**
6. On your new app's page, click **Settings**
7. Copy your **Client ID** and **Client Secret** — you'll need these next

---

## Step 2 — Configure the Backend

1. Open a terminal and navigate to the `backend` folder:
   ```
   cd backend
   ```

2. Copy the example environment file:
   ```
   copy .env.example .env
   ```

3. Open `.env` in any text editor (Notepad, VS Code, etc.) and fill in your credentials:
   ```
   SPOTIFY_CLIENT_ID=paste_your_client_id_here
   SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here
   REDIRECT_URI=http://127.0.0.1:3000/auth/callback
   PORT=3000
   SESSION_SECRET=type_any_random_words_here
   ```
   > 💡 `SESSION_SECRET` can be anything — just change it from the default.

4. Install dependencies:
   ```
   npm install
   ```

---

## Step 3 — Start the Server

Still in the `backend` folder, run:

```
npm start
```

You should see:

```
  🎵  Spotify Overlay Backend
  ✅  Server running at http://127.0.0.1:3000
  🔐  Authenticate at  http://127.0.0.1:3000/auth/login
  🖥️   Overlay ready at  http://127.0.0.1:3000
```

---

## Step 4 — Authenticate with Spotify

1. Open your browser and go to:
   **[http://127.0.0.1:3000/auth/login](http://127.0.0.1:3000/auth/login)**

2. You'll be redirected to Spotify's login page — log in and click **Agree**

3. You'll be redirected back to `http://127.0.0.1:3000` — the overlay will appear!

> ✅ You only need to do this **once**. Tokens are refreshed automatically.

---

## Step 5 — Add to TikTok Live Studio

### Option A: Browser Source (Recommended)

1. Open **TikTok Live Studio**
2. In your scene, click **"+"** to add a source
3. Choose **"Browser"** or **"Browser Source"**
4. Set the URL to: `http://localhost.charlesproxy.com:3001`
   > TikTok Live Studio may reject `localhost` or `127.0.0.1`, but `localhost.charlesproxy.com` points back to your own computer.
5. Set width/height (recommended: **800 × 240**px)
6. ✅ Enable **"Transparent background"** or **"Allow transparency"**
7. Click OK — the overlay will appear in your scene!

### Option B: Window Capture

1. Open `http://127.0.0.1:3000` in **Chrome** or **Edge**
2. Press **F11** for fullscreen
3. In TikTok Live Studio, add a **Window Capture** source
4. Select the browser window
5. Use **Chroma Key** to remove the black background (key color: black)

---

## 🎛️ Customization

### Turn off "Up Next" section
Open `frontend/app.js` and set:
```js
const QUEUE_ENABLED = false;
```

> ⚠️ The queue feature requires **Spotify Premium**. If you're on Free, set this to `false`.

### Change refresh rate
In `frontend/app.js`:
```js
const POLL_INTERVAL_MS = 3000; // Change to 5000 for every 5 seconds
```

### Change overlay position
By default the overlay appears at the **bottom-left**.
Edit `frontend/style.css` and change:
```css
body {
  align-items: flex-end;      /* flex-start = top,    flex-end = bottom */
  justify-content: flex-start; /* flex-start = left, flex-end = right  */
}
```

---

## 📁 Project Structure

```
spotify-overlay/
├── backend/
│   ├── server.js      ← Express entry point
│   ├── auth.js        ← Spotify OAuth (login, callback, token refresh)
│   ├── spotify.js     ← /api/current-song and /api/queue endpoints
│   ├── .env           ← Your credentials (never share this file!)
│   ├── .env.example   ← Template for .env
│   └── package.json
│
├── frontend/
│   ├── index.html     ← Overlay HTML structure
│   ├── style.css      ← Glassmorphism dark theme + animations
│   └── app.js         ← Poll loop, transitions, progress bar
│
└── README.md
```

---

## 🔒 Security Notes

- **Never share your `.env` file** or commit it to GitHub
- The `.env` file contains your `Client Secret` — treat it like a password
- The overlay only works on your local machine (`127.0.0.1`) — it's not exposed to the internet

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `REDIRECT_URI_MISMATCH` error | Make sure `http://127.0.0.1:3000/auth/callback` is in your Spotify app's Redirect URIs |
| Overlay shows "Spotify not connected" | Visit `http://127.0.0.1:3000/auth/login` in your browser |
| Queue not showing | Make sure you have Spotify Premium and set `QUEUE_ENABLED = true` in `app.js` |
| Album art not loading | This is a Spotify image CDN issue — it resolves itself |
| Progress bar jumping | Normal — it resyncs with the real position every 3 seconds |
| Server crashes on start | Check that your `.env` file exists and has valid credentials |

---

## 🛑 Stopping the Server

Press `Ctrl+C` in the terminal window running the backend.

---

## 📄 License

MIT — free to use, modify, and share.
