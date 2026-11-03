# 🎮 BINGO ARENA
> *"Pick Your Numbers. Challenge Your Friends. Make Your Move."*

BINGO ARENA is a premium, real-time multiplayer 1–25 Bingo gaming platform engineered with Django Channels, WebSockets, React, Vite, and Tailwind CSS.

---

## ✨ Features

- **Authoritative 5×5 Server Engine**: Unbiased random boards (1–25 unique numbers per player) with row, column, and dual-diagonal win calculations validated strictly on the backend.
- **Sub-10ms Real-Time Multiplayer**: Seamless WebSocket synchronization powered by Django Channels & Daphne ASGI.
- **Cyberpunk Gaming Aesthetics**: Deep purple background (`#100B24`), electric blue highlights, glowing neon borders, glassmorphic cards, and smooth animations.
- **Dynamic B-I-N-G-O Milestone Tracker**: Letters **B - I - N - G - O** light up with gold/cyan neon as players complete lines. First to 5 lines wins!
- **Interactive Emoji Reactions**: Real-time floating reactions (`🎯`, `🔥`, `😱`, `👏`, `💥`, `👑`) broadcast to both players.
- **Zero-Latency Audio Engine**: Pure Web Audio API synthesized retro arcade tones for clicks, moves, line completions, and victory fanfares without external audio dependencies.
- **Victory Confetti & Rematch Flow**: Instant rematch capability that generates new randomized boards and resets the match with one click.
- **Global Leaderboard**: Tracks persistent player profiles, wins, losses, ties, and win-rate percentages.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12, Django 6.1, Django REST Framework, Django Channels, Daphne |
| **Real-Time** | WebSockets (In-memory channel layer for local dev, Redis for production) |
| **Frontend** | React 19, Vite 8, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Database** | SQLite (development) / PostgreSQL (production) |

---

## 🚀 Quick Start (Local Development)

### 1. Start the Django ASGI Backend

In terminal 1:
```powershell
# Navigate to the workspace and activate virtual environment
cd C:\Users\Ayush\OneDrive\Documents\bingo
.venv\Scripts\activate

# Run Daphne ASGI development server on port 8080
python khalnayak\manage.py runserver 8080
```
*The backend API will be live at `http://127.0.0.1:8080/api/` and WebSockets at `ws://127.0.0.1:8080/ws/`.*

### 2. Start the React Frontend

In terminal 2:
```powershell
cd C:\Users\Ayush\OneDrive\Documents\bingo\frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Testing Multiplayer

1. Open `http://localhost:5173` in **Browser 1** (e.g. Chrome).
2. Click **Create Private Room**, enter nickname `Gladiator 1`, and choose an avatar.
3. You will enter the Lobby and receive a 6-character code (e.g. `AB12CD`).
4. Open an **Incognito Window** or a **second browser** (e.g. Edge).
5. Navigate to `http://localhost:5173`, click **Join Room**, enter code `AB12CD` and nickname `Gladiator 2`.
6. Both browsers will automatically connect, start a 3-second countdown, and launch into the 5x5 Bingo Arena!
7. Take turns selecting numbers. Watch the numbers mark across both screens and lines light up until someone achieves **B-I-N-G-O**!

---

## 🌐 Production Deployment

### Backend on Render (Web Service)
- **Environment**: Python 3.12
- **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
- **Start Command**: `daphne -b 0.0.0.0 -p $PORT khalnayak.asgi:application`
- **Environment Variables**:
  - `DJANGO_SECRET_KEY`: Secure random key
  - `DEBUG`: `False`
  - `ALLOWED_HOSTS`: `your-render-url.onrender.com`
  - `DATABASE_URL`: Hosted PostgreSQL connection string
  - `REDIS_URL`: Hosted Redis connection string (e.g. from Upstash or Render Redis)
  - `FRONTEND_URL`: `https://your-frontend.vercel.app`

### Frontend on Vercel
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://your-render-url.onrender.com`
  - `VITE_WS_HOST`: `your-render-url.onrender.com`

