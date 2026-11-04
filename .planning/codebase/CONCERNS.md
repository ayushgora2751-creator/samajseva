# Codebase Concerns & Technical Debt

**Analysis Date:** 2026-11-04

## Tech Debt

**Polling vs WebSocket Duality & Broken Channels Implementation:**
- Issue: The production deployment relies on HTTP short-polling every 2000ms (`setInterval` in `frontend/app.js`) paired with an unauthenticated Supabase Realtime broadcast channel (`bingo-room-[CODE]`). Meanwhile, the repository contains a second, conflicting real-time architecture: Django Channels consumers (`khalnayak/game/consumers.py`), routing (`khalnayak/game/routing.py`), and ASGI configuration (`khalnayak/khalnayak/asgi.py`), alongside a React WebSocket client (`frontend/src/services/websocket.js`). This Channels implementation is broken: `khalnayak/game/consumers.py` imports non-existent models (`Game`, `Move`, `PlayerProfile`), `khalnayak/requirements.txt` does not include `channels` or `daphne`, and `khalnayak/Procfile` executes standard WSGI (`gunicorn khalnayak.wsgi`).
- Files: `frontend/app.js`, `frontend/src/services/websocket.js`, `khalnayak/game/consumers.py`, `khalnayak/game/routing.py`, `khalnayak/khalnayak/asgi.py`, `khalnayak/Procfile`, `khalnayak/requirements.txt`
- Impact: Dual real-time implementations create major developer confusion and cognitive load. The hybrid transport in production creates race conditions: if Supabase Realtime disconnects or drops events, game latency degrades to 2000ms polling; if polling and broadcast events arrive out of order, UI state flickers. Running short polling against Django also generates continuous request pressure on single-threaded Gunicorn workers.
- Fix approach: Standardize on a single, coherent real-time transport. Either:
  1. Retire the orphaned Django Channels code and commit fully to Supabase Realtime (Postgres Changes or authenticated Broadcast) as the real-time push mechanism, retaining Django solely as the authoritative REST validation engine with adaptive polling fallback.
  2. Or complete the Django Channels implementation by updating `khalnayak/game/consumers.py` to match current models (`Room`, `Player`), adding `channels` and `daphne` to `khalnayak/requirements.txt`, updating `khalnayak/Procfile` to run ASGI, and deploying a Redis channel layer.

**Dual Frontend Architecture Drift:**
- Issue: The repository contains two distinct frontend applications that have diverged:
  1. A zero-build Vanilla JavaScript SPA at `frontend/index.html`, `frontend/app.js`, `frontend/config.js`, and `frontend/style.css`, served directly by Django via `khalnayak/khalnayak/urls.py` (`serve_frontend`).
  2. A Vite + React application in `frontend/src/` (`App.jsx`, `components/`, `pages/`, `services/api.js`, `services/websocket.js`).
- Files: `frontend/index.html`, `frontend/app.js`, `frontend/src/App.jsx`, `frontend/src/services/api.js`, `khalnayak/khalnayak/urls.py`
- Impact: Bug fixes and features implemented in one frontend are missing from the other. For instance, the React client expects `/api/games/{code}/` and `/api/leaderboard/` (`frontend/src/services/api.js:52,73`), which do not exist in Django's `khalnayak/game/urls.py`. The Vanilla SPA uses Supabase Auth and Realtime broadcast, whereas the React app expects a custom WebSocket server.
- Fix approach: Formally deprecate and remove the obsolete frontend or designate one as the canonical client. If the Vanilla SPA is the production target, archive `frontend/src/` and `frontend/package.json`. If Vite/React is the target, replace `khalnayak/khalnayak/urls.py` static serving with built Vite assets (`frontend/dist/`), update React API calls to match Django's REST routes, and port Supabase authentication.

**Hardcoded Backend Production URLs in Frontend Client:**
- Issue: In `frontend/config.js:3-7`, the production API fallback URL is hardcoded as `'https://samajseva.onrender.com'`. If deployed under an alternate subdomain, custom domain, or staging environment, clients fail to resolve the backend unless manually edited.
- Files: `frontend/config.js`, `frontend/app.js`
- Impact: Breaks automated CI/CD pipeline deployments to preview environments and tightly couples frontend client scripts to a specific Render service instance name.
- Fix approach: Use dynamic origin detection (`window.location.origin`) as the primary default whenever the frontend is served from the same domain as Django, and inject external API URLs via server-rendered template context or window-level runtime configuration in `frontend/index.html`.

**Unmanaged Ephemeral SQLite Database in Repository:**
- Issue: `khalnayak/khalnayak/settings.py:70-76` falls back to SQLite (`BASE_DIR / 'db.sqlite3'`) if the `DATABASE_URL` environment variable is unset. A 180KB SQLite database binary file (`khalnayak/db.sqlite3`) is present in the workspace and actively committed.
- Files: `khalnayak/khalnayak/settings.py`, `khalnayak/db.sqlite3`, `khalnayak/.env.example`
- Impact: When deployed on Render free tier without a configured PostgreSQL instance, SQLite runs on an ephemeral container filesystem. Every deploy, restart, or cold start completely destroys match history, rooms, and players. Additionally, committing local database binaries causes git repo bloat and cross-developer merge conflicts.
- Fix approach: Add `*.sqlite3` and `db.sqlite3` to `.gitignore`, remove `khalnayak/db.sqlite3` from git tracking, and configure `settings.py` to enforce a PostgreSQL `DATABASE_URL` requirement in production (`if not DEBUG and 'DATABASE_URL' not in os.environ: raise ImproperlyConfigured(...)`).

---

## Known Bugs

**Django Channels Import Failure (`BingoGameConsumer` Crash):**
- Symptoms: If `khalnayak.asgi:application` is invoked, the application immediately crashes on startup with `ImportError`.
- Files: `khalnayak/game/consumers.py:5-6`, `khalnayak/khalnayak/asgi.py:17`
- Trigger: Launching an ASGI server (such as Daphne or Uvicorn) pointing to `khalnayak.asgi:application`.
- Workaround: The application currently survives in production only because `khalnayak/Procfile` executes WSGI (`gunicorn khalnayak.wsgi`) rather than ASGI, leaving the broken consumer file unimported at runtime.

**Race Conditions in Turn Progression (`call_number`):**
- Symptoms: Under simultaneous rapid clicks or high network latency, two players or the same player double-submitting a move can result in out-of-order turn progression, desynchronized `current_turn` indices, or duplicate `CalledNumber.order` sequence values.
- Files: `khalnayak/game/views.py:159-228`
- Trigger: Two HTTP POST requests hitting `/api/rooms/<code>/call/` concurrently.
- Workaround: The frontend disables cell clicks while awaiting a response, but malicious or concurrent network requests can bypass client-side button state.
- Fix approach: Wrap `call_number` in `transaction.atomic()` and lock the `Room` record using `Room.objects.select_for_update().get(code=code.upper())` before validating turns and mutating state.

**404 Not Found on Missing React Endpoints:**
- Symptoms: Features in the React frontend (`frontend/src/`) such as Leaderboard or Game State refresh trigger 404 errors or receive Django's SPA HTML fallback instead of JSON.
- Files: `frontend/src/services/api.js:52,73`, `khalnayak/game/urls.py:8-19`, `khalnayak/khalnayak/urls.py:50-54`
- Trigger: React client fetching `/api/games/{code}/` or `/api/leaderboard/`.
- Workaround: Currently none; the React application cannot fetch leaderboard data from the Django backend.
- Fix approach: Implement `/api/leaderboard/` and align endpoint paths between `frontend/src/services/api.js` and `khalnayak/game/urls.py`.

---

## Security Considerations

**Open & Unauthenticated Supabase Realtime Broadcast Channels:**
- Risk: In `frontend/app.js:930-963`, the application connects to a public broadcast channel named `'bingo-room-' + this.code` using the public `SUPABASE_ANON_KEY`. There are no authentication checks or channel subscription permissions required. Any user who knows or guesses a 6-character room code can:
  1. Eavesdrop on in-room chat reactions and player status broadcasts.
  2. Broadcast arbitrary fake `reaction` payloads or spoof user nicknames.
  3. Flood `room_sync` broadcasts, triggering repeated `pollState()` HTTP requests across all active room participants and creating an amplified Denial-of-Service (DoS) condition against the Django REST API.
- Files: `frontend/app.js:930-963`, `frontend/config.js:10-11`
- Current mitigation: Broadcast handlers ignore non-reaction payloads and only use `room_sync` as a trigger to poll the authoritative Django backend.
- Recommendations:
  - Migrate to authenticated Supabase Realtime channels using Row Level Security (RLS) policies on private broadcast channels, requiring a valid Supabase Auth JWT with match participant validation.
  - Apply client-side throttling to `room_sync`: enforce a minimum 1000ms debounce interval between consecutive `pollState()` executions in `frontend/app.js`.

**Client State Security vs Server Authority (User Metadata vs Dedicated Profiles Table):**
- Risk: User profile details (name, avatar) are stored strictly inside Supabase Auth `user.user_metadata` (`frontend/app.js:804-807, 897-903`). In Supabase Auth, `user_metadata` is editable directly by the client using `supabase.auth.updateUser()`. There is no authoritative PostgreSQL `public.profiles` table with foreign key constraints, column validations, or Row Level Security policies. Furthermore, match actions in Django (`create_room`, `join_room`, `call_number`, `claim_bingo`) accept client-supplied `player_id` strings (`khalnayak/game/views.py`) with zero Supabase JWT token verification. Any user can spoof their `player_id` to make moves or claim victories on behalf of other players.
- Files: `frontend/app.js:781-923`, `khalnayak/game/views.py:159-228`, `khalnayak/game/models.py:46-63`
- Current mitigation: Django calculates bingo line math and validates turn order authoritatively based on the `player_id` passed in the request body.
- Recommendations:
  - Create a dedicated `public.profiles` PostgreSQL table in Supabase (`id UUID REFERENCES auth.users ON DELETE CASCADE`, `username TEXT UNIQUE`, `avatar TEXT`, `games_played INT`, `games_won INT`) with strict RLS policies.
  - Implement Supabase JWT verification middleware in Django: extract the `Authorization: Bearer <token>` header, verify the signature using Supabase's JWT secret or JWKS endpoint, and bind requests to verified user identities.

**Universal CORS Origin Reflection with Credentials:**
- Risk: `khalnayak/khalnayak/middleware.py:19-25` implements `UniversalCorsMiddleware`, which dynamically reflects back the request's `Origin` header into `Access-Control-Allow-Origin` while simultaneously setting `Access-Control-Allow-Credentials: true`. This effectively disables CORS protections, allowing any malicious third-party site to make authenticated, credentialed cross-origin requests to the API on behalf of a victim user.
- Files: `khalnayak/khalnayak/middleware.py:4-26`, `khalnayak/khalnayak/settings.py:38-49, 107-109`
- Current mitigation: None; the middleware unconditionally returns the request origin.
- Recommendations:
  - Remove `UniversalCorsMiddleware` from `khalnayak/khalnayak/settings.py`.
  - Rely exclusively on `django-cors-headers` (`corsheaders.middleware.CorsMiddleware`) configured with explicit allowed origins (`CORS_ALLOWED_ORIGINS` loaded from environment variables). Set `CORS_ALLOW_ALL_ORIGINS = False` in production.

**Insecure Default Django `SECRET_KEY` Fallback:**
- Risk: `khalnayak/khalnayak/settings.py:13-16` provides a hardcoded fallback secret key (`'django-insecure-j23tn2(lpj=jx)kgyf6#+&pey%7409_!pvugenj3f3#@$zp!ib'`) if `SECRET_KEY` or `DJANGO_SECRET_KEY` is not found in the environment. If deployed to production without an explicit environment variable, cryptographic signing, session cookies, and CSRF tokens can be forged by attackers.
- Files: `khalnayak/khalnayak/settings.py:13-16`
- Current mitigation: Settings attempt to read from `os.getenv('SECRET_KEY')` first.
- Recommendations:
  - In production (`DEBUG = False`), raise an immediate `ImproperlyConfigured` exception if `SECRET_KEY` is unset or matches the known insecure string.

---

## Performance Bottlenecks

**Render Free-Tier Cold Starts (Spins down after 15m inactivity):**
- Problem: The backend service on Render (`https://samajseva.onrender.com`) is hosted on a free compute instance that automatically spins down after 15 minutes of inactivity. When a new player accesses the site or opens an invite link, the initial HTTP request stalls for 20 to 50 seconds while the container boots, installs/verifies runtime layers, launches Gunicorn, and initializes Django.
- Files: `frontend/app.js:109-123`, `frontend/index.html:43-48`, `khalnayak/game/views.py:29-38`
- Cause: Platform compute suspension on zero-traffic free tiers.
- Improvement path:
  - Implement an external synthetic ping service (e.g. Cron-job.org, BetterStack, or GitHub Actions scheduled workflow) pinging `/api/health/` every 10 to 14 minutes to prevent container shutdown.
  - Upgrade the Render service to a persistent Starter web service tier ($7/month).
  - Enhance the frontend cold start experience: in `frontend/app.js`, show a non-blocking animated warmup progress bar and implement automated request retries with exponential backoff on `/api/health/` and `/api/rooms/create/`.

**Short Polling Request Overhead & Gunicorn Worker Saturation:**
- Problem: In `frontend/app.js:433-458`, every active room participant polls `/api/rooms/<code>/state/?player_id=...` every 2000ms. In a room with 6 players, this generates 3 requests per second per room. With 10 concurrent matches (60 players), the server must handle 30 requests/second. On Render free tier running Gunicorn with 1-2 workers, worker threads become saturated, leading to HTTP 502/504 gateway timeouts.
- Files: `frontend/app.js:433-458`, `khalnayak/game/views.py:230-285`
- Cause: Inefficient HTTP request-response cycle utilized for real-time multiplayer state synchronization.
- Improvement path:
  - Implement adaptive polling: decrease polling frequency to 5000ms-10000ms when the Supabase Realtime channel is healthy and connected (`status === 'SUBSCRIBED'`), falling back to 2000ms only if the WebSocket channel disconnects.
  - Implement Page Visibility API checks: pause or throttle polling when `document.hidden` is true (background tabs).
  - Offload read state distribution to Supabase Realtime state broadcasts or cached Redis keys.

**Database Lock Contention on SQLite:**
- Problem: When running on SQLite (local development or misconfigured production), all write operations lock the entire database file (`BEGIN IMMEDIATE`). Simultaneous requests to `/api/rooms/<code>/call/` or `/api/rooms/<code>/chat/` fail with `sqlite3.OperationalError: database is locked`.
- Files: `khalnayak/khalnayak/settings.py:70-76`, `khalnayak/game/views.py:159-228, 380-408`
- Cause: SQLite single-writer concurrency constraint.
- Improvement path:
  - Migrate all environments beyond local unit tests to PostgreSQL, utilizing row-level locking (`select_for_update`) and connection pooling.

---

## Fragile Areas

**Hybrid Polling and Realtime State Synchronization:**
- Files: `frontend/app.js:433-485, 927-963`
- Why fragile: Game state reconciliation relies on an uncoordinated mixture of periodic timer ticks (`setInterval`), Supabase broadcast event handlers (`room_sync`), and asynchronous `fetch` calls. Out-of-order network responses can cause a newer local state to be overwritten by a delayed older poll response, causing UI jumpiness or missed turn announcements.
- Safe modification: Introduce a sequence number or `updated_at` timestamp check in `handleStateUpdate(state)` to reject stale out-of-order state responses.
- Test coverage: Zero automated tests for state reconciliation or race handling.

**Player Session Recovery via `localStorage`:**
- Files: `frontend/app.js:82-96`, `khalnayak/game/views.py:89-100`
- Why fragile: Reconnection relies on `bingo_player_id` stored in browser `localStorage`. If a player clears their cache, switches browsers, or opens the link on a secondary device, their identity cannot be reclaimed unless they were registered with Supabase Auth. Furthermore, room codes are not bound to user accounts, making session hijacking trivial if another user submits the UUID.
- Safe modification: Bind player tokens to authenticated Supabase user IDs.
- Test coverage: Tested in Django integration tests (`test_room_reconnection` in `khalnayak/game/tests.py:91-103`), but untested on frontend clients.

**SPA Static Serving Catch-All Route in Django:**
- Files: `khalnayak/khalnayak/urls.py:11-48, 53`
- Why fragile: `serve_frontend` catches all unmatched routes (`re_path(r'^(?P<path>.*)$')`) to serve static files and fallback to `index.html`. If an API endpoint is misspelled or missing (e.g. `/api/leaderboard/`), Django returns HTTP 200 with HTML content rather than an HTTP 404 JSON response. Frontend `fetch` calls attempting `res.json()` throw `SyntaxError: Unexpected token '<'`.
- Safe modification: Prefix the fallback route to exclude `/api/` prefixes explicitly, returning standard JSON 404 responses for invalid API routes.
- Test coverage: No automated tests for static routing edge cases or API 404 isolation.

---

## Scaling Limits

**Django Gunicorn Worker Throughput on Render:**
- Current capacity: Render Free Tier provides 0.1 CPU core and 512MB RAM. Gunicorn is configured with default sync workers (typically 1-2 workers).
- Limit: Saturates at approximately 15-25 concurrent polling requests per second (~5 to 8 concurrent active matches). Additional requests queue or timeout with HTTP 504.
- Scaling path: Transition from synchronous short-polling to persistent WebSocket connections (via Supabase Realtime or ASGI/Daphne), or scale Gunicorn workers with async workers (`gevent` or `uvicorn`) behind a CDN caching layer.

**Supabase Realtime Broadcast Rate Limits:**
- Current capacity: Supabase Free tier allows up to 200 concurrent peak WebSocket connections, 200 messages/second, and 100 channels.
- Limit: Will reject new channel subscriptions beyond 200 concurrent players or trigger client-side message rate drops if players spam reactions.
- Scaling path: Upgrade to Supabase Pro tier (up to 10,000 concurrent connections, 500 msgs/sec) and enforce client-side reaction cooldowns (e.g. maximum 1 reaction per 3 seconds per player).

**Database Connection Exhaustion:**
- Current capacity: `settings.py:75` sets `conn_max_age=600`. On cloud PostgreSQL (Render or Supabase Free), direct connections are capped at 20-60 connections.
- Limit: Spikes in concurrent players opening rooms will exceed PostgreSQL max connections, crashing the Django application with `OperationalError: FATAL: too many connections`.
- Scaling path: Use Supabase Transaction Pooler (Port 6543 / Supavisor) or deploy PgBouncer, setting `conn_max_age=0` in Django settings when behind a transaction pooler.

---

## Dependencies at Risk

**External CDN JavaScript Dependencies:**
- Risk: `frontend/index.html:25-27` loads critical runtime libraries (`@supabase/supabase-js@2` and `canvas-confetti@1.9.2`) directly from `cdn.jsdelivr.net` without Subresource Integrity (SRI) hashes.
- Impact: If the CDN suffers an outage, is blocked by client ad-blockers/firewalls, or is compromised via a supply chain attack, the entire frontend fails to initialize (`supabase is undefined`), rendering authentication, real-time broadcasts, and celebrations completely non-functional.
- Migration plan: Bundle dependencies locally via npm/Vite or vendor minified library scripts directly into `frontend/static/vendor/` with valid SRI hash attributes.

**Orphaned Channels/Daphne Dependencies in Local Virtual Environment:**
- Risk: The virtual environment (`.venv`) contains `channels` and `asgiref`, but `khalnayak/requirements.txt` does not specify `channels`, `daphne`, or `channels-redis`.
- Impact: New developers or cloud build pipelines running `pip install -r requirements.txt` cannot run ASGI or execute tests that reference Channels modules.
- Migration plan: Clean up dependency manifests: either add tested versions of `channels` and `daphne` to `khalnayak/requirements.txt` or eliminate all references to Channels from the codebase.

**Unpinned Direct Dependencies:**
- Risk: `khalnayak/requirements.txt` specifies open upper bounds for core packages (e.g. `Django>=6.1.0,<7.0.0`, `djangorestframework>=3.15.0`).
- Impact: Future minor releases can introduce breaking changes or deprecations during automated deployment builds on Render.
- Migration plan: Generate a pinned lockfile (`requirements.lock` or `pip-tools` / Poetry) for deterministic production builds.

---

## Missing Critical Features

**Dedicated Supabase `public.profiles` Table with RLS:**
- Problem: User stats (wins, games played, total lines) are not tracked in a persistent database table. Player data is ephemeral to each individual room.
- Blocks: Persistent player progression, global leaderboards, win/loss history, and user statistics across multiple game sessions.

**Supabase JWT Authentication on Django Backend:**
- Problem: The Django REST API lacks authentication backends to validate Supabase Auth access tokens.
- Blocks: Verifying player identity server-side, preventing impersonation, and securing match actions.

**Leaderboard REST API Endpoint:**
- Problem: `/api/leaderboard/` is requested by the React frontend (`frontend/src/services/api.js:73`), but no corresponding route or view exists in `khalnayak/game/urls.py` or `views.py`.
- Blocks: Viewing top players or ranking data in the game UI.

**Automated Inactive Room Cleanup Cron:**
- Problem: Rooms and associated records (`Player`, `CalledNumber`, `ChatMessage`) persist indefinitely in the database. There is no background task or scheduled job to expire stale rooms older than 24 hours.
- Blocks: Long-term database hygiene; table sizes will grow continuously, slowing queries on `Room.objects.filter(code=code)`.

---

## Test Coverage Gaps

**Real-Time Broadcast & WebSocket Synchronization:**
- What's not tested: Supabase Realtime channel subscription, `room_sync` broadcast reception, reaction handling, and WebSocket reconnection flows.
- Files: `frontend/app.js:925-964`, `frontend/src/services/websocket.js`
- Risk: Silent failures in real-time notification delivery causing players to remain desynchronized indefinitely without error alerts.
- Priority: High

**Frontend Client Logic & State Machine Tests:**
- What's not tested: Card generator builder grid (`builderGrid`), auto-marking logic, modal visibility toggles, sound synthesizer fallback, and auth state listeners.
- Files: `frontend/app.js`, `frontend/src/App.jsx`
- Risk: UI regressions, broken modal interactions, or unhandled exceptions breaking match flow on unsupported mobile browsers.
- Priority: High

**Concurrent Turn Submission & Race Condition Tests:**
- What's not tested: Simultaneous calls to `/api/rooms/<code>/call/` from multiple threads or simulated concurrent players.
- Files: `khalnayak/game/views.py:159-228`
- Risk: Turn order corruptions, double-called numbers, or erroneous winner determinations under real-world multi-client load.
- Priority: High

**PostgreSQL Compatibility & Production Settings Tests:**
- What's not tested: Running test suites against actual PostgreSQL instances; verifying `SECURE_SSL_REDIRECT`, HSTS, and CORS headers under production settings (`DEBUG = False`).
- Files: `khalnayak/khalnayak/settings.py:130-150`
- Risk: Configuration errors discovered only after production deployment to Render.
- Priority: Medium

---

*Concerns audit: 2026-11-04*
