</Codebase Structure>
<Coding Conventions>
**Analysis Date:** 2026-11-04

## Naming Patterns

**Files:**
- Python modules use lowercase `snake_case.py`: e.g. `khalnayak/game/views.py`, `khalnayak/game/game_logic.py`, `khalnayak/game/models.py`, `khalnayak/khalnayak/middleware.py`.
- Frontend scripts use standard web naming: `frontend/app.js`, `frontend/config.js`, `frontend/vite.config.js`.
- Frontend component files in React use `PascalCase.jsx`: `frontend/src/App.jsx`, `frontend/src/main.jsx`.
- Style files use lowercase or component matching: `frontend/style.css`, `frontend/src/App.css`, `frontend/src/index.css`.
- Test files use standard Django naming: `khalnayak/game/tests.py`.

**Functions:**
- Python backend functions use lowercase `snake_case()`: e.g. `generate_card()`, `calculate_lines()`, `health_check()`, `create_room()`, `call_number()`, `claim_bingo()`, `serve_frontend()`.
- JavaScript frontend methods use `camelCase()`: e.g. `createRoom()`, `joinRoom()`, `renderAvatars()`, `showScreen()`, `playTone()`, `checkServerHealth()`.
- Django URL route names use `snake_case`: e.g. `'health_check'`, `'create_room'`, `'join_room'`, `'start_game'`.

**Variables:**
- Python local variables and model fields use `snake_case`: e.g. `room_code`, `player_id`, `called_numbers`, `winner_name`, `turn_order`, `is_ready`.
- Python global constants and Django model choices use `UPPER_SNAKE_CASE`: e.g. `STATUS_WAITING = 'waiting'`, `STATUS_CHOICES`, `BASE_DIR`, `SECRET_KEY`, `CSRF_TRUSTED_ORIGINS`.
- JavaScript variables, properties, and parameters use `camelCase`: e.g. `playerId`, `playerName`, `builderGrid`, `lastState`, `realtimeChannel`.
- JavaScript global constants use `UPPER_SNAKE_CASE`: e.g. `AVATARS`, `API_BASE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

**Types:**
- Python classes, Django models, serializers, and test suites use `PascalCase`: e.g. `Room`, `Player`, `CalledNumber`, `ChatMessage`, `UniversalCorsMiddleware`, `RoomSerializer`, `GameLogicTests`, `BingoAPITests`.
- Type hints use Python standard `typing` constructs: `List[List[int]]`, `Dict[str, Any]`, `Tuple`.
- JavaScript classes use `PascalCase`: e.g. `SoundEngine`, `BingoArena`.
- CSS custom properties use kebab-case with `--` prefix: e.g. `--bg-dark`, `--primary-purple`, `--electric-blue`, `--accent-pink`, `--text-white`, `--radius-xl`.
- CSS class selectors follow BEM-like and kebab-case naming: e.g. `.glass-panel`, `.nav-container`, `.brand-logo`, `.logo-icon`, `.avatar-btn`, `.toast-error`.

## Code Style

**Formatting:**
- **Python**: Strict PEP 8 standard indentation (4 spaces per indentation level), 2 blank lines separating top-level function/class definitions, 1 blank line between methods. Max line length is kept under 120 characters. Configured with type analysis and formatting tools in `pyproject.toml` and `pyrefly.toml`.
- **JavaScript**: Modern ES6+ syntax with 2-space indentation, semicolons enabled, template literals for string interpolation, object/array destructuring, and arrow functions for array iterations.
- **CSS**: Custom properties declared in `:root`, organized into logical visual blocks (glassmorphism panels, glowing orbs, responsive layouts).

**Linting:**
- **Python**: Configured via `pyproject.toml` using `pyrefly` (`tool.pyrefly`) and Pyright (`tool.pyright`) with paths set to `khalnayak`, `khalnayak/khalnayak`, and `khalnayak/game`.
- **JavaScript / Frontend**: Configured via `frontend/.oxlintrc.json` using Oxlint (`npm run lint`), targeting React and JSX rules (`react/rules-of-hooks: error`).
- **Webhint**: Configured via `.hintrc` for static frontend web quality standards.

## Import Organization

**Order:**
1. Standard library imports (e.g. `uuid`, `random`, `string`, `pathlib.Path`, `os`, `mimetypes`, `typing`).
2. Third-party package imports (e.g. `rest_framework.decorators.api_view`, `rest_framework.response.Response`, `rest_framework.status`, `dj_database_url`).
3. Django framework imports (e.g. `django.db.models`, `django.shortcuts.get_object_or_404`, `django.utils.timezone`).
4. Local application imports with graceful relative/absolute fallback:
   ```python
   try:
       from .models import Room, Player, CalledNumber, ChatMessage
       from .serializers import RoomSerializer, ChatMessageSerializer
       from .game_logic import generate_card, calculate_lines
   except (ImportError, ValueError):
       from game.models import Room, Player, CalledNumber, ChatMessage
       from game.serializers import RoomSerializer, ChatMessageSerializer
       from game.game_logic import generate_card, calculate_lines
   ```

**Path Aliases:**
- Backend relies on `BASE_DIR = Path(__file__).resolve().parent.parent` defined in `khalnayak/khalnayak/settings.py`.
- Frontend assets and HTML access is served via parent directory resolution `FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'` in `khalnayak/khalnayak/urls.py`.

## Error Handling

**API Response Patterns:**
All REST endpoints in `khalnayak/game/views.py` adhere to predictable, uniform JSON structures:
- **Error Responses**: Always return a JSON object with an `error` string property and the appropriate HTTP status code:
  - `400 BAD_REQUEST`: Validation errors, wrong turn order, out-of-range number, duplicate call, full room, empty message.
    ```python
    return Response({'error': 'Number must be between 1 and 25.'}, status=status.HTTP_400_BAD_REQUEST)
    ```
  - `403 FORBIDDEN`: Authorization/permission failures (e.g. non-host attempting to start the game).
    ```python
    return Response({'error': 'Only the room host can start the game.'}, status=status.HTTP_403_FORBIDDEN)
    ```
  - `404 NOT_FOUND`: Resource missing (unknown room code or unknown player ID).
    ```python
    return Response({'error': f"Room '{code}' does not exist."}, status=status.HTTP_404_NOT_FOUND)
    ```
- **Success Responses**: Always return typed payloads with explicit HTTP status codes:
  - `200 OK`: General updates, room join, number called, game state retrieval.
  - `201 CREATED`: Resource creation (room creation, chat message creation).
- **Client Fallback Handling**:
  - In `frontend/app.js`, network errors (`failed to fetch`) display informative user toasts indicating backend wake-up state on free-tier platforms.

## Security Conventions

**Middleware & Headers:**
- **Universal CORS Middleware**: Implemented in `khalnayak/khalnayak/middleware.py` (`UniversalCorsMiddleware`). Guarantees `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` are present on all responses, including errors and OPTIONS preflight requests (returning status 200 immediately).
- **CSRF Trusted Origins**: `CSRF_TRUSTED_ORIGINS` configured in `khalnayak/khalnayak/settings.py` for local dev (`localhost:5173`, `localhost:8080`) and cloud deployments (`https://*.onrender.com`, `https://*.netlify.app`), with environment variable expansion via `CSRF_TRUSTED_ORIGINS`.
- **Production Hardening**: Enforced when `DEBUG=False`:
  - `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`
  - `SECURE_SSL_REDIRECT = True`
  - `SESSION_COOKIE_SECURE = True`, `CSRF_COOKIE_SECURE = True`
  - `X_FRAME_OPTIONS = 'DENY'`, `SECURE_CONTENT_TYPE_NOSNIFF = True`, `SECURE_BROWSER_XSS_FILTER = True`
  - `SECURE_HSTS_SECONDS = 31536000` with subdomains and preload.
- **Server-Authoritative Win & State Logic**:
  - Client win claims (`/api/rooms/<code>/bingo/`) are never accepted unconditionally. The server recalculates completed lines directly from the player's card stored in the database and the validated `called_numbers` table using `calculate_lines()`.
  - Turns are strictly validated against `room.current_turn`; unauthorized numbers are rejected.
  - Directory traversal prevention in `serve_frontend` in `khalnayak/khalnayak/urls.py` verifies path boundaries before serving files.

## Logging

**Framework:** Standard browser console and Django server output.

**Patterns:**
- Frontend logs include an identification namespace:
  ```javascript
  console.log('[BINGO ARENA] Connected to backend API:', API_BASE);
  console.warn('[BINGO ARENA] Supabase init notice:', e.message);
  ```
- Backend uses explicit print / debug messages during server lifecycle and clean HTTP status returns without leaking internal stack traces.

## Comments

**When to Comment:**
- Header documentation on all models, serializers, views, and helper modules explaining their architectural role.
- Explanations of non-obvious game rules (e.g. 5x5 board matrix coordinates, diagonal math, turn rotation wrap-around).
- Step-by-step numbered comments inside test functions and complex handlers (e.g. `# 1. Create Room`, `# 2. Join Room`).

**JSDoc/TSDoc:**
- JavaScript modules include top-of-file descriptive blocks:
  ```javascript
  /**
   * BINGO ARENA - Vanilla JavaScript Game Engine
   * Short Polling (every 2s), Server Authoritative, Web Audio API Sound Synthesis
   */
  ```
- Major subsystem classes (`SoundEngine`, `BingoArena`) document constructor requirements and public interface methods.

## Function Design

**Size:**
- Core business functions are concise and focused (e.g., `generate_card()` in `khalnayak/game/game_logic.py` is 8 lines; `calculate_lines()` is 40 lines).
- View functions in `khalnayak/game/views.py` handle request parsing, model updates, and response rendering in under 35 lines per endpoint.

**Parameters:**
- View handlers accept standard `(request, code=None)` signature.
- Pure logic functions accept explicit primitive arguments (e.g. `calculate_lines(card: List[List[int]], called_numbers: List[int])`).

**Return Values:**
- REST views always return a `rest_framework.response.Response` wrapping a dictionary.
- Mathematical logic returns structured dictionaries containing computed state (`total_lines`, `completed_rows`, `completed_cols`, `completed_diags`, `winning_cells`, `active_letters`, `is_bingo`).

## Module Design

**Exports:**
- Python modules export functions, models, and classes directly at module level; imported specifically by name.
- Frontend uses standard ES6 modules (`import` / `export`) where applicable, and bundled scripts for lightweight vanilla browser runtime.

**Barrel Files:**
- Not used. Python modules import directly from specific sub-modules (`game.models`, `game.serializers`, `game.game_logic`) rather than monolithic `__init__.py` barrels to preserve fast test start-up and avoid circular dependencies.

---

*Convention analysis: 2026-11-04*
