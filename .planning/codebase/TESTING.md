</Coding Conventions>
<Testing Patterns>
**Analysis Date:** 2026-11-04

## Test Framework

**Runner:**
- Django Test Framework (`django.test.runner.DiscoverRunner`) with Django REST Framework test support (`rest_framework.test.APITestCase`)
- Runner execution engine: In-memory SQLite database (`file:memorydb_default?mode=memory&cache=shared`) configured dynamically per test run
- Config: `khalnayak/khalnayak/settings.py`

**Assertion Library:**
- Python standard `unittest` assertions provided through `rest_framework.test.APITestCase` and `django.test.TestCase` (`self.assertEqual`, `self.assertTrue`, `self.assertFalse`)

**Run Commands:**
```bash
python khalnayak/manage.py test game -v 2                               # Run all game test suites with verbose output
python khalnayak/manage.py test game.tests.GameLogicTests -v 2          # Run core algorithmic game logic unit tests
python khalnayak/manage.py test game.tests.BingoAPITests -v 2           # Run REST API integration test suite
coverage run --source=khalnayak/game khalnayak/manage.py test game     # Execute test suite with coverage collection
coverage report -m                                                     # Display test coverage breakdown by line
```

## Test File Organization

**Location:**
- Test suite is located directly within the Django app package at `khalnayak/game/tests.py`.

**Naming:**
- Module: `khalnayak/game/tests.py`
- Test suite classes: Suffix with `Tests` (`GameLogicTests`, `BingoAPITests`)
- Test methods: Prefix with `test_*` (e.g. `test_card_generation`, `test_room_creation_and_joining`, `test_claim_bingo_authoritative_validation`)

**Structure:**
```
khalnayak/
└── game/
    ├── tests.py              # Primary test suite (unit tests & API integration tests)
    ├── game_logic.py         # Authoritative math (5x5 generation, line calculation)
    ├── models.py             # Room, Player, CalledNumber, ChatMessage models
    ├── serializers.py        # Public and private DRF serializers
    ├── urls.py               # API route definitions
    └── views.py              # Endpoints exercised by BingoAPITests
```

## Test Structure

**Suite Organization:**
```python
from rest_framework.test import APITestCase
from rest_framework import status
from game.models import Room, Player, CalledNumber, ChatMessage
from game.game_logic import generate_card, calculate_lines

class GameLogicTests(APITestCase):
    """
    Unit tests for core 5x5 board generation and authoritative line math.
    """
    def test_card_generation(self):
        card = generate_card()
        self.assertEqual(len(card), 5)
        for row in card:
            self.assertEqual(len(row), 5)
        flat = [num for row in card for num in row]
        self.assertEqual(len(flat), 25)
        self.assertEqual(sorted(flat), list(range(1, 26)))

class BingoAPITests(APITestCase):
    """
    Integration tests covering the entire multiplayer REST API lifecycle.
    """
    def test_health_check(self):
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'ok')
```

**Patterns:**
- **Setup Pattern**: Tests run against an isolated in-memory test database automatically migrated before test execution. Test state is kept hermetic per test method.
- **Teardown Pattern**: Django's test runner automatically rolls back transactions and drops temporary tables between tests.
- **Assertion Pattern**: Assert status codes using `rest_framework.status` constants (`status.HTTP_200_OK`, `status.HTTP_201_CREATED`, `status.HTTP_400_BAD_REQUEST`, `status.HTTP_403_FORBIDDEN`, `status.HTTP_404_NOT_FOUND`), then assert specific keys in `response.data`.

## Mocking

**Framework:**
- Python standard library `unittest.mock` (used sparingly; integration tests prioritize end-to-end ORM and API routing accuracy).

**Patterns:**
```python
from unittest.mock import patch

# When external network calls or webhooks are added:
@patch('game.views.some_external_call')
def test_external_integration(self, mock_call):
    mock_call.return_value = {'status': 'success'}
    # test implementation
```

**What to Mock:**
- External third-party integrations (e.g. Supabase real-time client, external webhook dispatchers, third-party auth services).
- Slow I/O or network dependencies.

**What NOT to Mock:**
- Django ORM models (`Room`, `Player`, `CalledNumber`, `ChatMessage`).
- Core business logic in `khalnayak/game/game_logic.py` (`generate_card`, `calculate_lines`).
- REST Framework serializers and view dispatching logic.

## Fixtures and Factories

**Test Data:**
Test state is constructed directly through DRF test client requests or ORM calls within the test methods:
```python
# REST client-based creation:
res = self.client.post('/api/rooms/create/', {'name': 'ApexHost', 'avatar': 'cyber-fox'}, format='json')
code = res.data['code']
host_id = res.data['player_id']

# Direct ORM creation when necessary:
room = Room.objects.create()
player = Player.objects.create(
    room=room,
    name='Host',
    avatar='cyber-fox',
    turn_order=1,
    card=generate_card(),
    marked=[],
)
```

**Location:**
- Created inline in `khalnayak/game/tests.py` to maintain explicit, self-contained test scenarios.

## Coverage

**Requirements:**
- Core game logic in `khalnayak/game/game_logic.py` requires 100% test coverage.
- Multiplayer game lifecycle API in `khalnayak/game/views.py` requires >90% route and status code coverage.
- CI gate requires 0 failing tests before deploying to Render or Netlify.

**View Coverage:**
```bash
coverage run --source=khalnayak/game khalnayak/manage.py test game
coverage report -m
```

## Test Types

**Unit Tests:**
- **Scope**: Algorithmic rules in `khalnayak/game/game_logic.py`.
- **Key Test Cases**:
  - `GameLogicTests.test_card_generation`: Verifies 5x5 matrix structure, 25 unique numbers strictly between 1 and 25 with 0 duplicates.
  - `GameLogicTests.test_row_and_diagonal_calculations`: Tests line detection across 5 rows, 5 columns, main diagonal (`[i][i]`), and anti-diagonal (`[i][4-i]`). Validates progressive active letters (`['B', 'I']` at 2 lines, `['B', 'I', 'N', 'G', 'O']` and `is_bingo: True` at 5 lines).

**Integration Tests:**
- **Scope**: Full HTTP lifecycle across `khalnayak/game/urls.py` and `khalnayak/game/views.py` using `self.client`.
- **Key Test Cases**:
  - `BingoAPITests.test_health_check`: Verifies `/api/health/` returns 200 OK and service status.
  - `BingoAPITests.test_room_creation_and_joining`: Tests room creation, 6-character code generation, player addition, and rejection (404) of non-existent room codes.
  - `BingoAPITests.test_custom_card_update_rules`: Validates custom 5x5 card layout updates (numbers 1-25 unique) before match start and rejects duplicate numbers (400).
  - `BingoAPITests.test_live_chat_and_emoji_reactions`: Validates text and emoji chat submissions (201 Created) and message retrieval in `/state/`.
  - `BingoAPITests.test_turn_rules_and_gameplay_flow`: Tests turn validation, non-host forbidden from starting (403), out-of-turn call rejection (400), out-of-range number rejection (400), duplicate number call rejection (400), and rematch restart (resets called numbers and regenerates cards).
  - `BingoAPITests.test_solo_start_game`: Validates host ability to start a match alone for solo testing and quick verification.
  - `BingoAPITests.test_claim_bingo_authoritative_validation`: Validates strict rejection of fraudulent or premature bingo claims (400 Bad Request with `verified: False`).
  - `BingoAPITests.test_chat_validation_empty_rejected`: Rejects chat requests containing empty whitespace or empty emoji.

**E2E Tests:**
- Frontend client interaction manual testing and live end-to-end verification via polling loop against local or deployed backend. Automated browser testing can be introduced with Playwright.

## Common Patterns

**Async Testing:**
- Django Channels or async consumers in `khalnayak/game/consumers.py` can be tested using `channels.testing.WebsocketCommunicator`. The primary game engine operates over synchronous REST polling endpoints via `APITestCase`.

**Error Testing:**
- Verify error response keys and HTTP status codes:
```python
# Test unauthorized action
res_bad_start = self.client.post(f'/api/rooms/{code}/start/', {'player_id': non_host_id}, format='json')
self.assertEqual(res_bad_start.status_code, status.HTTP_403_FORBIDDEN)
self.assertIn('error', res_bad_start.data)

# Test invalid payload
res_bad = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': [[1]*5 for _ in range(5)]}, format='json')
self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)
self.assertIn('error', res_bad.data)
```

---

*Testing analysis: 2026-11-04*
