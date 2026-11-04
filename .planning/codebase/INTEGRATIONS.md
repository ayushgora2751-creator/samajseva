# External Integrations
**Analysis Date:** 2026-11-04

## APIs & External Services

**Realtime Synchronization & WebSockets:**
- **Supabase Realtime:** Low-latency multiplayer broadcast channel engine.
  - SDK/Client: `@supabase/supabase-js@2` (imported via jsDelivr CDN in `frontend/index.html`)
  - Integration: `frontend/app.js` creates room-scoped broadcast channels (`bingo-room-{code}`) via `supabaseClient.channel()`.
  - Events:
    - `room_sync`: Broadcasts instant state invalidation signals on turns, card changes, and host game starts to trigger client re-polling (`pollState()`) within <50ms.
    - `reaction`: Broadcasts live player emoji events (`spawnFloatingEmoji`) rendered asynchronously across peer viewports.
  - Auth: Public anonymous publishable key (`SUPABASE_ANON_KEY` in `frontend/config.js`).

**Authentication & User Profiles:**
- **Supabase GoTrue (Auth):** User authentication and identity provider.
  - SDK/Client: `@supabase/supabase-js@2`
  - Integration: `frontend/app.js` handles email/password registration (`signUpWithPassword`), sign-in (`signInWithPassword`), session state detection (`getSession()`), auth state subscriptions (`onAuthStateChange()`), and user metadata (custom player nicknames).
  - Auth: Public anon key configured in `frontend/config.js`.

**Social Sharing:**
- **WhatsApp Web API:** Social match invite sharing.
  - SDK/Client: Browser native `window.open`
  - Integration: `shareWhatsApp()` in `frontend/app.js` constructs deep-links (`https://api.whatsapp.com/send?text=...`) embedding room join codes and site origin URLs.
  - Auth: None (public standard web URL scheme).

**Content Delivery Networks (CDNs):**
- **jsDelivr CDN:**
  - Delivers `@supabase/supabase-js@2` and `canvas-confetti@1.9.2` directly to client browsers (`frontend/index.html`).
- **Google Fonts CDN:**
  - Serves font stylesheets and binary assets (`Plus Jakarta Sans`, `JetBrains Mono`) referenced in `frontend/index.html`.

## Data Storage

**Databases:**
- **PostgreSQL (Production):**
  - Hosted on Supabase or Render Managed Postgres.
  - Connection: Parsed from `DATABASE_URL` environment variable via `dj-database-url` in `khalnayak/khalnayak/settings.py`.
  - Client: Django ORM using `psycopg2-binary` driver (`django.db.backends.postgresql`).
- **SQLite 3 (Development):**
  - Stored locally at `khalnayak/db.sqlite3`.
  - Client: Django default SQLite database backend (`django.db.backends.sqlite3`).

**File Storage:**
- **Local Filesystem & WhiteNoise:**
  - Static frontend assets and collected Django admin assets are packaged locally during deployment via `python manage.py collectstatic --no-input` into `khalnayak/staticfiles`.
  - Served directly through WhiteNoise (`whitenoise.storage.CompressedManifestStaticFilesStorage`) with gzip/brotli compression and persistent caching headers. No third-party S3/GCS blob storage required.

**Caching:**
- **HTTP Cache & Short Polling:**
  - No distributed external cache layer (Redis/Memcached) is currently utilized.
  - Game state freshness is maintained via 2-second short polling (`setInterval` in `frontend/app.js`) backed by direct relational queries, augmented by Supabase Realtime WebSocket broadcast pings.

## Authentication & Identity

**Auth Provider:**
- **Hybrid Supabase GoTrue + Anonymous Guest Tokens:**
  - **Supabase GoTrue:** Handles persistent accounts for registered users with email/password credentials and persistent session tokens stored in browser `localStorage`.
  - **Anonymous Player Sessions:** Guest gameplay requires zero sign-up friction. The Django backend assigns each player an authoritative 32-character hexadecimal token (`player_id`) via `khalnayak/game/models.py` (`generate_player_id`), persisted locally in `localStorage.bingo_player_id` to validate player moves, turns, and bingo claims.

## Monitoring & Observability

**Error Tracking:**
- **None:** No external APM or error monitoring service (such as Sentry, Bugsnag, or Datadog) is installed.

**Logs:**
- **Standard Output (stdout):**
  - Gunicorn outputs all HTTP requests and error traces to `stdout` (`--log-file -` in `khalnayak/Procfile`).
  - Render runtime platform captures stdout/stderr streams into its dashboard log viewer.
  - Client-side application logs operational notices and backend connection targets to browser `console.log` / `console.warn` (`frontend/config.js`, `frontend/app.js`).

## CI/CD & Deployment

**Hosting:**
- **Backend API:** Render Web Service (`https://samajseva.onrender.com`).
  - Build script: `khalnayak/build.sh` (installs pip requirements, runs collectstatic, applies database migrations).
  - Runtime command: Gunicorn WSGI server (`khalnayak.wsgi`).
  - Free-tier cold starts: Handled client-side with a warning banner (`#server-status-banner` in `frontend/index.html`) and retry messaging upon network fetch timeouts.
- **Frontend SPA:** Netlify Edge Hosting (`netlify.toml`).
  - Deploys static files from the `frontend/` directory with zero build step overhead (`echo 'Static frontend ready - no build step needed'`).
  - Rewrites all non-asset requests (`/*`) to `/index.html` with HTTP 200 for client-side routing.
- **Self-Hosted Fallback:** Django backend includes `serve_frontend` in `khalnayak/khalnayak/urls.py` with directory traversal guards and SPA fallback to serve the frontend directly if Netlify is bypassed.

**CI Pipeline:**
- **Git-Driven Continuous Deployment:**
  - Connected directly to GitHub repository `origin/main` (`https://github.com/ayushgora2751-creator/samajseva.git`).
  - Render and Netlify automatically trigger redeployments on new commits pushed to `main`.

## Environment Configuration

**Required env vars:**
- **Backend (`khalnayak/khalnayak/settings.py`):**
  - `SECRET_KEY` / `DJANGO_SECRET_KEY`: Django cryptographic secret key.
  - `DEBUG`: Controls development debug mode and production security headers.
  - `ALLOWED_HOSTS`: Allowed HTTP host headers.
  - `DATABASE_URL`: Production PostgreSQL database connection string.
  - `CSRF_TRUSTED_ORIGINS`: Allowed origins for CSRF checks (`https://*.onrender.com`, `https://*.netlify.app`).
  - `SECURE_SSL_REDIRECT` / `SECURE_HSTS_SECONDS`: HTTPS enforcement in production.
- **Frontend (`frontend/config.js`):**
  - `SUPABASE_URL`: Supabase project URL (`https://rnrftpkfcorfhdrrabks.supabase.co`).
  - `SUPABASE_ANON_KEY`: Supabase public anonymous API key.

**Secrets location:**
- Stored as encrypted environment variables in the Render web dashboard for production backend.
- Committed `frontend/config.js` contains public publishable anon keys intended for client-side distribution.
- Development secret files (`.env`, `.env.local`) are excluded from git tracking via `.gitignore`.

## Webhooks & Callbacks

**Incoming:**
- **None:** The application does not expose external webhook receiver endpoints.

**Outgoing:**
- **None:** All outbound notifications and game state invalidations are dispatched through client-initiated Supabase WebSocket broadcast channels rather than server-side webhooks.

---

*Integration audit: 2026-11-04*
