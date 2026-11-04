# Technology Stack
**Analysis Date:** 2026-11-04

## Languages

**Primary:**
- **Python 3.11+ / 3.12+ (CPython):** Used across the backend (`khalnayak/`) for authoritative game logic, REST APIs, database models, line calculation algorithms, and administrative interfaces.
- **JavaScript (ECMAScript 2020+ / ES Modules):** Used across the client application (`frontend/app.js`, `frontend/config.js`) implementing the `BingoArena` state machine, Web Audio API sound synthesis, DOM rendering, and Supabase integration.

**Secondary:**
- **HTML5:** Semantic markup structure for the single-page application (`frontend/index.html`).
- **CSS3:** Custom stylesheet with CSS custom properties (variables), responsive flex/grid layouts, animations, and neon cyberpunk aesthetic (`frontend/style.css`).
- **Bash:** Deployment and build scripts (`khalnayak/build.sh`).

## Runtime

**Environment:**
- **Python Runtime:** Python 3.11+ (local venv utilizes Python 3.12/3.14 via uv/pip; production deployed to Linux container on Render).
- **Browser Runtime:** Evergreen modern browsers (Chrome, Firefox, Safari, Edge) supporting ES6+, Web Audio API (`window.AudioContext`), WebSockets, and `localStorage`.
- **Node.js:** v24.19.0 (used strictly for optional local tooling, development server, and linting; not executed in production).

**Package Manager:**
- **Python:** `pip` / `uv` managing dependencies via `khalnayak/requirements.txt`.
- **JavaScript:** `npm` managing local lint and dev dependencies via `frontend/package.json`.
- Lockfile: `frontend/package-lock.json` is present.

## Frameworks

**Core:**
- **Django 6.1.x (`Django>=6.1.0,<7.0.0`):** Full-stack web framework configured in `khalnayak/khalnayak/settings.py`. Provides ORM models (`khalnayak/game/models.py`), URL routing (`khalnayak/khalnayak/urls.py`), security middleware, and static asset management.
- **Django REST Framework (`djangorestframework>=3.15.0`):** REST API framework providing view decorators (`@api_view`), JSON serializers (`khalnayak/game/serializers.py`), and response normalization for `/api/rooms/` endpoints.
- **WhiteNoise (`whitenoise>=6.6.0`):** Static file serving engine integrated directly into Django's WSGI stack (`whitenoise.middleware.WhiteNoiseMiddleware`), using `CompressedManifestStaticFilesStorage`.
- **Gunicorn (`gunicorn>=21.2.0`):** Production WSGI HTTP server defined in `khalnayak/Procfile` (`web: gunicorn khalnayak.wsgi --log-file -`).
- **Vanilla JS Engine:** Zero-framework client architecture in `frontend/app.js`. Implements an event-driven `BingoArena` class coordinating DOM state without React/Vue overhead in production.

**Testing:**
- **Django REST Framework Test Suite (`rest_framework.test.APITestCase`):** Configured in `khalnayak/game/tests.py`, exercising deterministic unit tests for 5x5 matrix generation, win validation math, and REST API integration flows.

**Build/Dev:**
- **Vite 8.3.x (`vite`):** Optional dev server configured in `frontend/package.json` and `frontend/vite.config.js`.
- **Oxlint 1.89.x (`oxlint`):** Fast JavaScript/TypeScript linter configured in `frontend/.oxlintrc.json`.
- **Pyrefly / Pyright:** Python static type check and path search tooling configured in `pyproject.toml` and `pyrefly.toml`.

## Key Dependencies

**Critical:**
- **`dj-database-url` (>=2.1.0):** Parses 12-factor `DATABASE_URL` environment variables in `khalnayak/khalnayak/settings.py`, allowing automatic switching between local SQLite and production PostgreSQL.
- **`django-cors-headers` (>=4.3.0):** Injected as the top middleware in `khalnayak/khalnayak/settings.py` along with `UniversalCorsMiddleware` in `khalnayak/khalnayak/middleware.py` to allow cross-origin requests from Netlify and local hosts.
- **`psycopg2-binary` (>=2.9.9):** Python PostgreSQL adapter enabling database connectivity to hosted PostgreSQL instances (Supabase / Render).
- **`@supabase/supabase-js` (v2 via jsDelivr CDN):** Client-side SDK in `frontend/index.html` and `frontend/app.js` providing GoTrue user authentication and WebSocket broadcast channels for instant room sync.
- **`canvas-confetti` (v1.9.2 via jsDelivr CDN):** Client-side particle physics celebration effects for player victory sequences in `frontend/app.js`.

**Infrastructure:**
- **Google Fonts CDN:** Remote asset loading for typography (`Plus Jakarta Sans` and `JetBrains Mono`) referenced in `frontend/index.html`.
- **Web Audio API:** Native browser API synthesized directly inside `SoundEngine` in `frontend/app.js` (oscillator and gain nodes for UI clicks, tile toggles, turn changes, and 4-tone victory chimes without external audio assets).

## Configuration

**Environment:**
- Backend configuration is managed through standard OS environment variables read in `khalnayak/khalnayak/settings.py`:
  - `SECRET_KEY` / `DJANGO_SECRET_KEY`: Django cryptographic signing secret.
  - `DEBUG`: Boolean flag (`True` for development, `False` for production).
  - `ALLOWED_HOSTS`: Comma-separated host whitelist (defaults to `*`).
  - `DATABASE_URL`: Connection string for PostgreSQL or fallback SQLite.
  - `CSRF_TRUSTED_ORIGINS`: Comma-delimited list of allowed CSRF origins.
  - `SECURE_SSL_REDIRECT` / `SECURE_HSTS_SECONDS`: Production SSL and HSTS controls.
- Frontend runtime configuration is declared in `frontend/config.js`:
  - `API_BASE`: Dynamically detects `localhost:8080`, same-origin Render, or fallback `https://samajseva.onrender.com`.
  - `SUPABASE_URL`: Supabase project URL (`window.SUPABASE_URL` override).
  - `SUPABASE_ANON_KEY`: Supabase public publishable key (`window.SUPABASE_ANON_KEY` override).

**Build:**
- `khalnayak/build.sh`: Runs `pip install -r requirements.txt`, `python manage.py collectstatic --no-input`, and `python manage.py migrate`.
- `khalnayak/Procfile`: Declares Gunicorn process definition for Render/Heroku container orchestration.
- `netlify.toml`: Directs Netlify static builder to publish the `frontend/` directory with a no-op build command and SPA redirect rules.

## Platform Requirements

**Development:**
- Python 3.11+ with virtual environment (`.venv/`).
- Node.js 18+ (optional, only for `npm run lint` or `npm run dev`).
- Local SQLite database automatically created at `khalnayak/db.sqlite3`.

**Production:**
- **Backend:** Render Web Service running Gunicorn WSGI on Linux container (`https://samajseva.onrender.com`).
- **Database:** PostgreSQL instance (Supabase or Render Managed Postgres).
- **Frontend:** Netlify Static Site edge deployment or Django self-hosted SPA fallback via `khalnayak/khalnayak/urls.py` (`serve_frontend`).

---

*Stack analysis: 2026-11-04*
