<!-- refreshed: 2026-11-04 -->
</Architecture>
<Codebase Structure>
**Analysis Date:** 2026-11-04

## Directory Layout

```
bingo/
├── .gitignore                      # Git ignore patterns (virtualenv, cache, node_modules)
├── .hintrc                         # Webhint linter configuration
├── README.md                       # Project overview and run instructions
├── netlify.toml                    # Root Netlify deployment config (publishes frontend/)
├── pyproject.toml                  # Python tooling & type checking paths (pyrefly/pyright)
├── pyrefly.toml                    # Pyrefly static analysis include/exclude rules
├── .planning/                      # Project planning and architectural knowledge base
│   ├── codebase/                   # Codebase map documents (ARCHITECTURE.md, STRUCTURE.md)
│   └── onboarding/                 # Onboarding specifications and audit records
├── frontend/                       # Static Vanilla JS Reactive Single Page Application (SPA)
│   ├── index.html                  # Main SPA markup, screen containers, modals, CDN scripts
│   ├── app.js                      # Core frontend client engine (BingoArena & SoundEngine)
│   ├── style.css                   # Cyberpunk neon UI design system and responsive grid
│   ├── config.js                   # API endpoint selector & Supabase client configuration
│   ├── manifest.json               # Progressive Web App (PWA) manifest
│   ├── favicon.svg                 # SVG application icon
│   ├── netlify.toml                # Netlify build override (zero-build static deploy)
│   ├── package.json                # Frontend package metadata and lint scripts
│   ├── vite.config.js              # Optional Vite bundler config for legacy/dev tooling
│   ├── .oxlintrc.json              # Oxlint JavaScript linter rules
│   ├── _redirects                  # Static hosting redirect rules for SPA routing
│   ├── public/                     # Public static assets (favicon, icons)
│   ├── dist/                       # Compiled assets output (if built via Vite)
│   └── src/                        # React component prototype (alternate frontend reference)
│       ├── App.jsx                 # React root component
│       ├── components/             # React modular UI components
│       ├── pages/                  # React page views
│       ├── services/               # React API and WebSocket clients
│       └── utils/                  # Helper utilities and avatar constants
└── khalnayak/                      # Server-authoritative Django REST backend
    ├── manage.py                   # Django CLI management executable
    ├── requirements.txt            # Python dependencies (Django, DRF, Gunicorn, dj-db-url)
    ├── Procfile                    # Render / Heroku process declaration (Gunicorn WSGI)
    ├── build.sh                    # Render automated deployment build script
    ├── db.sqlite3                  # Local SQLite database instance
    ├── .env.example                # Template for environment variables (DATABASE_URL, SECRET_KEY)
    ├── khalnayak/                  # Core Django project configuration package
    │   ├── __init__.py             # Python package marker
    │   ├── asgi.py                 # ASGI configuration with Django Channels router
    │   ├── wsgi.py                 # WSGI configuration for production Gunicorn workers
    │   ├── settings.py             # Project settings (database, CORS, security, WhiteNoise)
    │   ├── urls.py                 # Root URL router & SPA static fallback server
    │   ├── views.py                # Static frontend file server with directory traversal guard
    │   └── middleware.py           # UniversalCorsMiddleware (guarantees CORS on all responses)
    └── game/                       # Bingo Arena game application
        ├── __init__.py             # Python package marker
        ├── apps.py                 # Django application configuration (`GameConfig`)
        ├── admin.py                # Django admin registration for Room, Player, CalledNumber
        ├── models.py               # Database models (Room, Player, CalledNumber, ChatMessage)
        ├── serializers.py          # DRF serializers (RoomSerializer, Player serializers, Chat)
        ├── game_logic.py           # Authoritative 5x5 card generation and line evaluation math
        ├── views.py                # REST API views (create, join, card, start, call, bingo, poll)
        ├── urls.py                 # API endpoint routing table (`/api/...`)
        ├── tests.py                # Unit and integration test suite (math, API, turns, security)
        ├── consumers.py            # Channels WebSocket consumer (prototype/alternate real-time)
        ├── routing.py              # WebSocket routing definition (`ws/game/<room_code>/`)
        └── migrations/             # Database schema migrations
            ├── 0001_initial.py     # Initial database schema
            └── 0002_chatmessage.py # ChatMessage model migration
```

## Directory Purposes

### `khalnayak/` (Server-Authoritative Django Backend)
- **Purpose:** Houses the authoritative game engine, database ORM models, validation logic, and REST API.
- **Contains:** Django application packages, database settings, migrations, static serving utilities, and test suites.
- **Key files:**
  - `khalnayak/manage.py`: Django command-line runner for migrations, testing, and dev servers.
  - `khalnayak/requirements.txt`: Python package requirements (`Django>=6.1.0`, `djangorestframework`, `django-cors-headers`, `whitenoise`, `gunicorn`, `dj-database-url`, `psycopg2-binary`).
  - `khalnayak/Procfile`: Production execution entry (`web: gunicorn khalnayak.wsgi --log-file -`).
  - `khalnayak/build.sh`: Automated deployment shell script running `pip install`, `collectstatic`, and `migrate`.
  - `khalnayak/khalnayak/settings.py`: Central configuration, CORS permissions, WhiteNoise storage, and security headers.
  - `khalnayak/khalnayak/middleware.py`: Custom `UniversalCorsMiddleware` ensuring CORS headers on all status codes.
  - `khalnayak/khalnayak/urls.py`: Dispatches `/api/` to `game.urls` and serves the frontend SPA for any unmatched path.
  - `khalnayak/game/models.py`: Defines schemas for `Room`, `Player`, `CalledNumber`, and `ChatMessage`.
  - `khalnayak/game/game_logic.py`: Pure algorithmic logic for 5x5 board generation and line completion calculations.
  - `khalnayak/game/views.py`: REST endpoint handlers for creating rooms, joining, setting custom cards, making moves, polling state, and verifying BINGO.
  - `khalnayak/game/tests.py`: Comprehensive test suite testing line math, turn rotation, custom card constraints, and victory verification.

### `frontend/` (Reactive Vanilla JavaScript SPA)
- **Purpose:** High-performance, zero-build client application rendering the Bingo Arena interface directly in the browser.
- **Contains:** HTML structure, CSS design system, client JavaScript game engine, static assets, and configuration.
- **Key files:**
  - `frontend/index.html`: Main HTML entry with DOM screen views (`#screen-home`, `#screen-lobby`, `#screen-game`), modal dialogues, and script loads.
  - `frontend/app.js`: Main client engine defining `BingoArena` state controller and `SoundEngine` Web Audio synthesizer.
  - `frontend/style.css`: Neon cyberpunk design tokens, glassmorphism cards, responsive 5x5 board grids, and animations.
  - `frontend/config.js`: Detects host environment (`localhost:8080` vs `https://samajseva.onrender.com`) and stores Supabase credentials.
  - `frontend/manifest.json`: Progressive Web App (PWA) configuration for standalone mobile installation.
  - `frontend/netlify.toml`: Directs Netlify to deploy the static files without executing build scripts.

### Root Configuration Files
- **Purpose:** Controls workspace tooling, repository settings, code analysis, and deployment configurations.
- **Key files:**
  - `netlify.toml`: Root Netlify deploy configuration pointing publish directory to `frontend/`.
  - `pyproject.toml`: Pyrefly and Pyright configuration specifying search paths for `khalnayak`, `khalnayak/khalnayak`, and `khalnayak/game`.
  - `pyrefly.toml`: Project inclusion (`khalnayak`) and exclusion rules (excludes `frontend/**`, `.venv/**`, `node_modules/**`).
  - `.hintrc`: Webhint HTML/browser compatibility configuration.
  - `.gitignore`: Specifies ignored build artifacts, local databases, virtual environments, and caches.

## Key File Locations

**Entry Points:**
- `frontend/index.html`: Entry document for web browsers.
- `frontend/app.js`: Entry controller for frontend state execution (`window.addEventListener('DOMContentLoaded', ...)`).
- `khalnayak/manage.py`: CLI entry point for local server and operational tasks (`python manage.py runserver 8080`).
- `khalnayak/khalnayak/wsgi.py`: Production WSGI entry point for Gunicorn web server.
- `khalnayak/khalnayak/asgi.py`: Production ASGI entry point for asynchronous protocol routing.

**Configuration:**
- `khalnayak/khalnayak/settings.py`: Backend configuration, database settings, CORS, and security policies.
- `frontend/config.js`: Frontend API base URL and Supabase connection constants.
- `netlify.toml`: Deployment and SPA redirect configuration for Netlify.
- `pyproject.toml` / `pyrefly.toml`: Python static analysis and type checking configuration.

**Core Logic:**
- `khalnayak/game/game_logic.py`: Authoritative line evaluation algorithm (`calculate_lines`) and card generator (`generate_card`).
- `khalnayak/game/views.py`: Match lifecycle, turn enforcement, and card validation endpoints.
- `frontend/app.js`: Client view manager, card builder drag/click logic, polling loop, and Supabase channel listener.

**Testing:**
- `khalnayak/game/tests.py`: Complete test suite with `GameLogicTests` and `BingoAPITests`. Run via `python manage.py test game`.

## Naming Conventions

**Files:**
- Python: `snake_case.py` (e.g., `game_logic.py`, `serializers.py`, `models.py`).
- JavaScript: `camelCase.js` or `kebab-case.js` (e.g., `app.js`, `config.js`, `vite.config.js`).
- Stylesheets & HTML: `kebab-case.css` / lowercase (e.g., `style.css`, `index.html`).
- Documentation: `UPPERCASE.md` (e.g., `ARCHITECTURE.md`, `STRUCTURE.md`, `README.md`).

**Directories:**
- Python modules and apps: `snake_case` / lowercase (e.g., `khalnayak/`, `game/`, `migrations/`).
- Frontend source and asset folders: `kebab-case` or lowercase (e.g., `public/`, `src/components/`, `src/pages/`).

**Variables & Functions:**
- Python: `snake_case` for functions, methods, and variables (e.g., `calculate_lines()`, `generate_room_code()`, `player_id`).
- Python Classes: `PascalCase` (e.g., `Room`, `Player`, `CalledNumber`, `UniversalCorsMiddleware`).
- JavaScript: `camelCase` for functions and variables (e.g., `createRoom()`, `pollState()`, `builderGrid`).
- JavaScript Classes: `PascalCase` (e.g., `BingoArena`, `SoundEngine`).
- CSS Classes: `kebab-case` (e.g., `bingo-tile`, `builder-grid`, `glow-orb`, `turn-badge`).

## Where to Add New Code

**New Feature (e.g., Private Passwords / Room Settings):**
- Database Schema: Add fields to `Room` model in `khalnayak/game/models.py`.
- Migration: Run `python manage.py makemigrations` and `python manage.py migrate`.
- API Endpoint: Update serializers in `khalnayak/game/serializers.py` and view logic in `khalnayak/game/views.py`.
- Frontend UI: Add input controls in `frontend/index.html` within `#modal-create-room` and wire handlers in `frontend/app.js`.

**New Game Rule or Victory Mechanic:**
- Rule Evaluation: Implement logic in `khalnayak/game/game_logic.py`.
- Validation Endpoint: Update `call_number` or `claim_bingo` in `khalnayak/game/views.py`.
- Unit Tests: Add test cases to `GameLogicTests` in `khalnayak/game/tests.py`.
- Frontend Rendering: Update `renderBoard` or letter status rendering in `frontend/app.js`.

**New Real-Time Broadcast Event:**
- Dispatcher: Add broadcast helper in `frontend/app.js` using `this.broadcastRealtime('event_name', payload)`.
- Listener: Add event handler inside `subscribeRealtime()` in `frontend/app.js`.
- Fallback: Ensure polling in `pollState()` still synchronizes state if the event is missed.

**New API Endpoint:**
- View Handler: Implement the DRF view function in `khalnayak/game/views.py` with `@api_view([...])`.
- Route: Map the view function in `khalnayak/game/urls.py`.
- Tests: Add integration test method to `BingoAPITests` in `khalnayak/game/tests.py`.

**New Audio Effect:**
- Method: Add synthesizer method to `SoundEngine` class in `frontend/app.js` using oscillator frequencies (`this.playTone(frequency, duration, type)`).

## Special Directories

**`frontend/src/`:**
- **Purpose:** Contains an earlier / alternate React prototype with Tailwind CSS and Lucide icons.
- **Generated:** No (Committed source code).
- **Status:** Inactive in current Netlify / Render production deployment (which serves `frontend/index.html` and `frontend/app.js`), but kept as reference implementation.

**`frontend/dist/`:**
- **Purpose:** Output directory if `npm run build` is invoked with Vite.
- **Generated:** Yes.
- **Status:** Retained for static preview fallback.

**`khalnayak/staticfiles/`:**
- **Purpose:** Target directory for `python manage.py collectstatic`, bundled and served by WhiteNoise in production.
- **Generated:** Yes (Generated during build via `khalnayak/build.sh`).
- **Committed:** Ignored in `.gitignore`.

**`.planning/`:**
- **Purpose:** Contains project knowledge maps (`.planning/codebase/`) and planning artifacts created by GSD workflows.
- **Generated:** Yes (By codebase mapper and planning agents).
- **Committed:** Yes.

---

*Structure analysis: 2026-11-04*
