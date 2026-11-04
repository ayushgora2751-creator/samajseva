<!-- refreshed: 2026-11-04 -->
</External Integrations>
<Architecture>
**Analysis Date:** 2026-11-04

## System Overview

BINGO ARENA implements a dual-layer, server-authoritative architecture designed for real-time multiplayer 1–25 Bingo matches. The system decouples authoritative match verification and persistence (hosted in a Django REST backend) from an ultra-responsive, zero-build client presentation layer (Vanilla JavaScript reactive SPA). Real-time synchronization blends short polling (2-second cycle) with instant Supabase Realtime broadcast acceleration over WebSockets.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client Browser (Vanilla JS SPA)                       │
│  `frontend/index.html` · `frontend/app.js` · `frontend/style.css`            │
│  - Reactive UI state machine (Home -> Lobby -> Card Builder -> Game Arena)   │
│  - SoundEngine (Web Audio API procedural sound synthesizer)                 │
│  - Local storage session tokens (`bingo_player_id`, `bingo_player_name`)     │
└──────────────┬──────────────────────────────────────────────▲───────────────┘
               │                                              │
               │ REST API (JSON)                              │ Broadcast Events
               │ Polling / Actions                            │ (`room_sync`, `reaction`)
               ▼                                              │
┌──────────────────────────────────────────────┐  ┌───────────┴───────────────┐
│     Django REST Framework Backend (Render)   │  │   Supabase Cloud Platform │
│     `khalnayak/khalnayak/`                   │  │   `frontend/config.js`    │
│  ├─ `UniversalCorsMiddleware`: Origin header │  ├─ Channel:                 │
│  ├─ `serve_frontend`: SPA fallback host      │  │  `bingo-room-[CODE]`      │
│  └─ API Endpoints (`khalnayak/game/views.py`)│  ├─ Zero-lag emoji reactions │
└──────────────────────┬───────────────────────┘  └─ Sub-second turn wakeups  │
                       │                                                      │
                       ▼                                                      │
┌──────────────────────────────────────────────┐                              │
│       Authoritative Domain Game Logic        │                              │
│       `khalnayak/game/game_logic.py`         │                              │
│  - 5x5 card validation (unique 1..25)         │                              │
│  - Line math (5 rows + 5 cols + 2 diags)     │                              │
│  - Server-verified B-I-N-G-O (>= 5 lines)    │                              │
└──────────────────────┬───────────────────────┘                              │
                       │                                                      │
                       ▼                                                      │
┌──────────────────────────────────────────────┐                              │
│          Database Persistence Layer          │                              │
│  `Room` · `Player` · `CalledNumber` · `Chat` │                              │
│  - SQLite (`db.sqlite3` in local dev)        │                              │
│  - PostgreSQL (Render/Railway via dj_db_url) │                              │
└──────────────────────────────────────────────┘──────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Client Game Engine** | Single-page lifecycle, DOM view routing, audio synthesis, optimistic click handling, 2s polling timer | `frontend/app.js` |
| **Client Configuration** | Backend base URL detection (`localhost:8080` vs Render `samajseva.onrender.com`), Supabase credentials | `frontend/config.js` |
| **Presentation & Screens** | HTML skeleton for Home, Lobby, 5x5 Builder, Game Arena, Chat sidebar, Rules & Winner modals | `frontend/index.html` |
| **Design System & Themes** | Neon cyberpunk styles, responsive CSS grid (5x5 boards), glowing orbs, button active states | `frontend/style.css` |
| **API Endpoints & Controllers** | Room creation/join, card builder commits, turn-calling validation, victory checks, chat storage | `khalnayak/game/views.py` |
| **Authoritative Game Logic** | Pure algorithmic evaluation of 5x5 board uniqueness, row/column/diagonal completion, BINGO detection | `khalnayak/game/game_logic.py` |
| **Data Models** | Relational schemas for rooms, player states, turn-ordered called numbers, and chat message history | `khalnayak/game/models.py` |
| **Serialization** | Serializers for public room lobbies, private player state, called numbers, and chat timestamps | `khalnayak/game/serializers.py` |
| **URL Routing** | REST endpoint registration and prefixing under `/api/` | `khalnayak/game/urls.py` |
| **CORS Middleware** | Injects universal `Access-Control-Allow-*` headers across all HTTP methods and error responses | `khalnayak/khalnayak/middleware.py` |
| **Project Settings** | Multi-environment config (WhiteNoise, dj-database-url, CORS, CSRF trusted domains, HSTS security) | `khalnayak/khalnayak/settings.py` |
| **Root Routing & SPA Host** | Routes `/api/`, `/admin/`, and serves static frontend assets or `index.html` fallback | `khalnayak/khalnayak/urls.py` |
| **Integration Test Suite** | Automated test coverage for board math, turns, duplicate prevention, chat, and victory assertions | `khalnayak/game/tests.py` |

## Pattern Overview

**Overall:** Server-Authoritative State Engine with Reactive Client Presentation & Hybrid Real-Time Synchronization.

**Key Characteristics:**
1. **Server-Authoritative Game Rules:** The client never dictates whether a number is valid, whose turn it is, how many lines have been formed, or who won. All mutations run through `khalnayak/game/views.py` and are validated against `khalnayak/game/game_logic.py`.
2. **Hybrid Real-Time Transport:** Combines resilient HTTP short polling (`setInterval` every 2000ms in `frontend/app.js`) with instant Supabase Realtime broadcast events (`bingo-room-[CODE]`). If Supabase is unavailable or firewalled, the game seamlessly falls back to 2s polling without breaking.
3. **Zero-Build Vanilla Web Architecture:** Production frontend requires zero Node bundler step (`netlify.toml` executes `echo 'Static frontend ready'`). All components, templates, and styles are executed directly by modern browser runtime engines via standard ES6 classes and CSS custom properties.
4. **Procedural Web Audio Engine:** Sound effects (clicks, number selections, turn bells, victory fanfares) are synthesized programmatically using the Web Audio API (`AudioContext` oscillators in `frontend/app.js`) rather than loading heavy external MP3/WAV assets.

## Layers

### 1. Presentation Layer (SPA Client)
- **Purpose:** Renders interactive screens, handles user inputs, plays procedural audio, updates 5x5 board state.
- **Location:** `frontend/` (`index.html`, `app.js`, `style.css`, `config.js`)
- **Contains:** `BingoArena` game manager class, `SoundEngine` audio synthesizer, DOM query selectors, modal triggers.
- **Depends on:** Supabase JS CDN (`@supabase/supabase-js@2`), Canvas Confetti CDN (`canvas-confetti@1.9.2`).
- **Used by:** End-user browsers across desktop and mobile viewports.

### 2. Transport & Acceleration Layer
- **Purpose:** Carries player actions to the server and broadcasts low-latency events to participants.
- **Location:** `frontend/config.js`, `frontend/app.js`, Supabase Realtime channel `bingo-room-[CODE]`.
- **Contains:** HTTP `fetch` requests with JSON bodies, Supabase WebSocket broadcast hooks (`room_sync`, `reaction`).
- **Depends on:** Django REST endpoints on `samajseva.onrender.com` / `localhost:8080`, Supabase Realtime cluster.
- **Used by:** `BingoArena` state listener and action dispatchers.

### 3. Middleware & Security Layer
- **Purpose:** Enforces universal CORS, manages cross-origin resource sharing, guarantees SSL enforcement in production.
- **Location:** `khalnayak/khalnayak/middleware.py`, `khalnayak/khalnayak/settings.py`.
- **Contains:** `UniversalCorsMiddleware`, WhiteNoise static file caching, HSTS headers, CSRF origin verification.
- **Depends on:** Django standard middleware stack.
- **Used by:** Every incoming HTTP request prior to reaching view dispatchers.

### 4. Authoritative Domain Game Logic Layer
- **Purpose:** Pure business logic calculations for board generation, custom card validation, and line math.
- **Location:** `khalnayak/game/game_logic.py`.
- **Contains:** `generate_card()`, `calculate_lines()`.
- **Depends on:** Python standard library (`random`, `typing`). No ORM or database dependencies.
- **Used by:** `khalnayak/game/views.py` and `khalnayak/game/tests.py`.

### 5. Persistence & Schema Layer
- **Purpose:** Relational storage for active matches, players, turn history, and chat messages.
- **Location:** `khalnayak/game/models.py`.
- **Contains:** `Room`, `Player`, `CalledNumber`, `ChatMessage`.
- **Depends on:** Django ORM, SQLite (`db.sqlite3`) for local execution, PostgreSQL for cloud deployment via `dj_database_url`.
- **Used by:** Views, admin dashboard, and serialization layers.

## Data Flow

### Primary Request Path: Complete Match Lifecycle

```text
Host               Player 2              Django Backend                 Supabase Realtime
 │                    │                         │                              │
 ├─ Create Room ───────────────────────────────>│ `POST /api/rooms/create/`    │
 │<─ Code + player_id + card ───────────────────┤ (generates 6-char code)      │
 │                                              │                              │
 │   (shares code)                              │                              │
 │─── 6-char code ───>│                         │                              │
 │                    ├─ Join Room ────────────>│ `POST /api/rooms/join/`      │
 │                    │<─ player_id + card ─────┤ (assigns turn_order=2)       │
 │                    │                         │                              │
 ├── (Both customize 5x5 card in builder) ─────>│ `POST /api/rooms/CODE/card/` │
 │                    │                         │ (validates unique 1-25)      │
 │                    │                         │                              │
 ├─ Start Battle ──────────────────────────────>│ `POST /api/rooms/CODE/start/`│
 │                    │                         │ (room.status='playing')      │
 │                    │                         │                              │
 ├─ Broadcast room_sync ──────────────────────────────────────────────────────>│
 │                    │<────────────────────── Broadcast room_sync ────────────┤
 │                    │ (triggers instant poll) │                              │
 │                    │                         │                              │
 ├─ Turn 1: Call #12 ──────────────────────────>│ `POST /api/rooms/CODE/call/` │
 │                    │                         ├─ Validates caller is Turn 1  │
 │                    │                         ├─ Checks #12 uncalled         │
 │                    │                         ├─ Auto-marks on ALL cards     │
 │                    │                         ├─ Computes lines for all      │
 │                    │                         └─ Sets current_turn = 2       │
 ├─ Broadcast room_sync ──────────────────────────────────────────────────────>│
 │                    │<────────────────────── Broadcast room_sync ────────────┤
 │                    ├─ Turn 2: Call #7 ──────>│ `POST /api/rooms/CODE/call/` │
 │                    │                         │                              │
 │... (turns alternate until a player hits 5 lines)                            │
 │                                              │                              │
 ├─ Claim Bingo ───────────────────────────────>│ `POST /api/rooms/CODE/bingo/`│
 │                                              ├─ Recalculates card lines     │
 │                                              ├─ total_lines >= 5? Verified! │
 │                                              └─ room.status='finished'      │
 ├─ Broadcast room_sync ──────────────────────────────────────────────────────>│
 │                    │<────────────────────── Broadcast room_sync ────────────┤
 │ (Shows Winner Modal + Confetti)              │ (Shows Defeat / Result)      │
```

1. **Room Creation:**
   - Host submits name & avatar in `frontend/app.js:194` (`createRoom`).
   - `khalnayak/game/views.py:42` (`create_room`) creates `Room(code=..., host_player_id=...)`, generates a randomized 5x5 card (`game_logic.generate_card()`), and creates `Player(turn_order=1)`.
   - Returns 6-character room code, private `player_id`, initial card matrix, and serialized room info.

2. **Player Joining:**
   - Guest submits room code, nickname, avatar in `frontend/app.js:225` (`joinRoom`).
   - `khalnayak/game/views.py:73` (`join_room`) validates room existence and status (`waiting`), verifies `player_count < 6`, generates a fresh 5x5 card, and assigns `turn_order = player_count + 1`.
   - Reconnections with existing `player_id` are recognized automatically (`is_reconnection: true`).

3. **Custom Card Builder (1 to 25):**
   - In `frontend/app.js:287` (`initBuilderCard`, `renderBuilderGrid`), player can click empty squares to sequentially place numbers 1 to 25, or click "🎲 Randomize".
   - When all 25 numbers are placed, `frontend/app.js:391` (`saveBuilderCard`) sends `POST /api/rooms/[CODE]/card/` with `player_id` and the 5x5 array.
   - `khalnayak/game/views.py:343` (`update_card`) checks that the game has not started, validates the matrix dimensions (5x5), flattens the array, verifies that `sorted(flat) == list(range(1, 26))`, and updates `Player.card`.

4. **Start Battle:**
   - Host clicks "Start Battle" in `frontend/app.js:415` (`startGame`), hitting `POST /api/rooms/[CODE]/start/`.
   - `khalnayak/game/views.py:135` (`start_game`) checks `room.host_player_id == player_id`, sets `room.status = 'playing'`, `room.current_turn = 1`.
   - Host broadcasts `room_sync` via Supabase to wake up all other players instantly.

5. **Turn-by-Turn Number Calling:**
   - The active turn player clicks any uncalled tile on their board (`frontend/app.js:613` -> `callNumber`).
   - `khalnayak/game/views.py:159` (`call_number`) checks:
     - Game status is `playing`.
     - Requesting player's `turn_order == room.current_turn`.
     - Selected number is an integer between 1 and 25.
     - Number has not been previously called in this room (`room.called_numbers.filter(number=number).exists()`).
   - Creates `CalledNumber(room=room, number=number, called_by=player, order=...)`.
   - Automatically marks the number on every player's card in database: `p.marked = [n for n in all_called if n in card_nums]`.
   - Calls `calculate_lines(player.card, all_called)`.
   - If caller reached 5 lines, sets `room.status = 'finished'` and `room.winner_name = player.name`.
   - Otherwise, rotates `room.current_turn = (room.current_turn % total_players) + 1`.

6. **Line Computation (`calculate_lines` in `khalnayak/game/game_logic.py:20`):**
   - Evaluates:
     - 5 rows: `all(card[r][c] in called_set for c in range(5))`
     - 5 columns: `all(card[r][c] in called_set for r in range(5))`
     - Main diagonal: `all(card[i][i] in called_set for i in range(5))`
     - Anti diagonal: `all(card[i][4 - i] in called_set for i in range(5))`
   - Collects completed rows/cols/diagonals and unique winning cell coordinates (`"r,c"`).
   - Maps total line count to letters `['B', 'I', 'N', 'G', 'O'][:total_lines]`.
   - Flags `is_bingo = total_lines >= 5`.

7. **Server-Verified BINGO Victory:**
   - Player clicks "CLAIM BINGO" or auto-submits via `frontend/app.js:631` (`claimBingo`).
   - `khalnayak/game/views.py:288` (`claim_bingo`) re-computes `calculate_lines(player.card, all_called)` independently on the server.
   - If lines < 5, rejects claim with HTTP 400 (`"Need 5 lines for BINGO!"`).
   - If verified, sets `room.status = 'finished'`, returns `verified: True`, and broadcasts `room_sync`.
   - Client displays `WinnerModal` and triggers confetti animation (`frontend/app.js:649`).

### Secondary Flows

- **Live Chat & Emoji Reactions:**
  - Player taps emoji or types message (`frontend/app.js:688, 703`).
  - Broadcasts instantly via Supabase channel `bingo-room-[CODE]` with payload `{ emoji, sender }` (`frontend/app.js:955`).
  - Simultaneously posts to `POST /api/rooms/[CODE]/chat/` (`khalnayak/game/views.py:380`) to persist in `ChatMessage` model for late joiners or reconnecting players.
  - Floating emoji animation spawns on all screens (`frontend/app.js:725`).
- **Rematch / Restart:**
  - Host triggers `POST /api/rooms/[CODE]/restart/` (`khalnayak/game/views.py:321`).
  - Resets all players with fresh 5x5 boards, wipes `CalledNumber` table for room, resets `room.current_turn = 1`, `room.status = 'playing'`.
- **Render Cold Start Detection:**
  - On page load, `frontend/app.js:109` pings `GET /api/health/`. If response exceeds 2s (Render spin-up), a banner alerts the user: *"Waking up free-tier server on Render (may take 20-30s on first load)..."*.

## State Management

Authoritative room and player states reside solely on the backend database. The frontend maintains synchronized reactive local state:

- **Authoritative Server State:**
  - `Room`: `code`, `status`, `host_player_id`, `current_turn`, `winner_name`.
  - `Player`: `player_id` (token), `turn_order`, `card` (5x5 matrix), `marked` (called numbers on player's card).
  - `CalledNumber`: strictly ordered history of calls.
- **Client Reactive State (`BingoArena` in `frontend/app.js`):**
  - `this.code`: Active room code.
  - `this.playerId`: Unique player authentication token stored in `localStorage.getItem('bingo_player_id')`.
  - `this.card`: Active player's 5x5 number matrix.
  - `this.builderGrid`: Working 5x5 array during custom card placement.
  - `this.lastState`: Cached previous snapshot from `pollState()` to detect turn changes and play audio cues.
- **State Synchronization Mechanism:**
  - Short polling interval: `setInterval(() => this.pollState(), 2000)` in `frontend/app.js:437`.
  - Event acceleration: Whenever an action occurs (`card_save`, `start`, `call`, `claim`, `chat`), the caller immediately sends `broadcastRealtime('room_sync')`. All clients receiving `room_sync` immediately invoke `this.pollState()` bypassing the 2-second wait.

## Real-Time Architecture

The real-time layer leverages Supabase Realtime broadcast channels for zero-infrastructure WebSocket distribution:

- **Channel Pattern:** `bingo-room-[CODE]` (e.g. `bingo-room-7X8K2M`).
- **Subscribed Events:**
  - `room_sync`: Triggers immediate `pollState()` fetch on all subscribed clients.
  - `reaction`: Directly delivers floating emoji animation `{ emoji, sender }` without waiting for database writes.
- **Subscription Lifecycle:**
  - `subscribeRealtime()` (`frontend/app.js:927`) binds channel on lobby entry.
  - On status `SUBSCRIBED`, immediately triggers a sync.
  - `unsubscribeRealtime()` (`frontend/app.js:949`) detaches listeners upon returning to home or exiting the arena.

## Key Abstractions

- **5x5 Board Matrix:** A nested list of integers `List[List[int]]` where `len == 5` and each row `len == 5`. Every integer 1 through 25 appears exactly once. Handled in `khalnayak/game/game_logic.py:10` and `frontend/app.js:287`.
- **Line Statistics Result (`Dict[str, Any]`):** Uniform evaluation object containing `total_lines` (int), `winning_cells` (list of `"r,c"`), `active_letters` (e.g. `['B', 'I']`), and `is_bingo` (bool).
- **Session Player Token:** A 32-character hexadecimal string (`uuid.uuid4().hex`) passed in request payloads (`player_id`) identifying the caller without heavyweight session cookies.
- **Universal CORS Responder:** `UniversalCorsMiddleware` in `khalnayak/khalnayak/middleware.py` which intercepts every response (including OPTIONS preflights and 404s) and appends permissive CORS headers.

## Entry Points

- **Frontend SPA HTML:** `frontend/index.html` (Serves the entire UI, CSS links, Supabase and confetti script tags).
- **Frontend App Initializer:** `frontend/app.js:977` (`window.addEventListener('DOMContentLoaded', () => app.init())`).
- **Django WSGI Dispatcher:** `khalnayak/khalnayak/wsgi.py` (Entry point for Gunicorn web server on Render/Railway).
- **Django ASGI Dispatcher:** `khalnayak/khalnayak/asgi.py` (Exposes ASGI application with Channels ProtocolTypeRouter).
- **Django CLI Manager:** `khalnayak/manage.py` (Entry point for migrations, test execution, and runserver).
- **API Health Check:** `khalnayak/game/views.py:30` (`/api/health/`).

## Architectural Constraints

- **Strict Authoritative Integrity:** Clients cannot modify opponent state, advance turns, mark uncalled numbers, or declare victory without server validation.
- **Synchronous Web Workers:** Backend runs with Gunicorn WSGI workers. API endpoints are stateless, fast JSON transactions.
- **Database Agnosticism:** Uses standard Django ORM with `dj-database-url`. Supports SQLite (`khalnayak/db.sqlite3`) for zero-dependency local development and PostgreSQL for production.
- **Zero Local Secrets on Client:** Supabase anon key (`SUPABASE_ANON_KEY`) in `frontend/config.js` is public-safe. Django `SECRET_KEY` is loaded via environment variable with a fallback for local testing.
- **Decoupled Deployment Model:**
  - Frontend can be served standalone via Netlify (`frontend/netlify.toml`), GitHub Pages, or Vercel.
  - Backend is deployed as a Docker / Python web service on Render (`khalnayak/Procfile` runs `gunicorn khalnayak.wsgi`).
  - Alternatively, Django's `serve_frontend` view in `khalnayak/khalnayak/urls.py:11` allows running both backend and frontend from a single port (`http://localhost:8080/`).

## Anti-Patterns

### Anti-Pattern 1: Trusting Client-Side Victory Declarations
**What happens:** Sending `{ is_bingo: true }` from the browser and directly marking the game finished in the database.
**Why it's wrong:** Vulnerable to tampering via browser console; allows bad actors to win without calling valid numbers.
**Do this instead:** Always compute lines server-side using `calculate_lines(player.card, all_called)` as implemented in `khalnayak/game/views.py:301`.

### Anti-Pattern 2: Missing CORS Headers on Exception / Error Responses
**What happens:** Relying on default Django headers causes 400 or 500 error responses to lack CORS headers, which browsers mask as generic "CORS network error" rather than showing the true API error message.
**Why it's wrong:** Prevents frontend from displaying accurate error toasts (e.g. "It's not your turn!").
**Do this instead:** Use `UniversalCorsMiddleware` in `khalnayak/khalnayak/middleware.py` which intercepts all status codes and forcibly appends `Access-Control-Allow-Origin: *`.

### Anti-Pattern 3: Incomplete Card Validation
**What happens:** Accepting a 5x5 card where players duplicate high-probability numbers (e.g. multiple 1s or 7s).
**Why it's wrong:** Compromises fair game mechanics.
**Do this instead:** Flatten the 5x5 matrix and enforce `sorted(flat) == list(range(1, 26))` in `khalnayak/game/views.py:369`.

## Error Handling

**Strategy:** Explicit HTTP status codes with structured JSON error bodies `{ "error": "Human-readable message" }` from Django views, caught by `try / catch` blocks in `frontend/app.js` and displayed via non-blocking toast notifications (`this.toast(msg, isError)`).

**Key Error Handling Patterns:**
1. **Render Free-Tier Spin-up Timeout:** When Render spins down on inactivity, initial HTTP fetch attempts fail with `TypeError: Failed to fetch`. `frontend/app.js:216` catches this specific error and displays: *"Waking up server on Render... Free tier takes 20-30s on first load. Please try again in a few seconds!"*.
2. **Turn Desynchronization:** If a player clicks while it is not their turn, `khalnayak/game/views.py:175` returns HTTP 400 with `"It's not your turn! Waiting for Player #N."`, and client triggers an error toast without resetting local board state.
3. **Invalid Custom Card:** If card submission lacks 25 numbers or contains duplicates, `khalnayak/game/views.py:369` returns HTTP 400 with specific error text.

## Cross-Cutting Concerns

- **Logging:** Backend exceptions and worker activity log to standard output via Gunicorn (`--log-file -` in `khalnayak/Procfile`).
- **Validation:** Matrix integrity, turn order, range limits (1–25), and code uniqueness are validated at the view boundary prior to ORM commits.
- **Authentication:** Lightweight token-based identification via `player_id` (UUID hex) stored in client `localStorage` and validated in `Player` model queries. Optional user accounts managed via Supabase Auth (`frontend/app.js:781`).
- **Security:** In production (`DEBUG=False`), `khalnayak/khalnayak/settings.py:132` activates `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_BROWSER_XSS_FILTER`, `SECURE_CONTENT_TYPE_NOSNIFF`, and HSTS headers.

---

*Architecture analysis: 2026-11-04*
