from rest_framework.test import APITestCase
from rest_framework import status

try:
    from game.models import Room, Player, CalledNumber, ChatMessage
    from game.game_logic import generate_card, calculate_lines
except (ImportError, ValueError):
    from .models import Room, Player, CalledNumber, ChatMessage
    from .game_logic import generate_card, calculate_lines


class GameLogicTests(APITestCase):
    """
    Unit tests for core 5x5 board generation and authoritative line math.
    """
    def test_card_generation(self):
        """Card must be 5x5 and contain exactly numbers 1-25 with zero duplicates."""
        card = generate_card()
        self.assertEqual(len(card), 5)
        for row in card:
            self.assertEqual(len(row), 5)
        flat = [num for row in card for num in row]
        self.assertEqual(len(flat), 25)
        self.assertEqual(sorted(flat), list(range(1, 26)))

    def test_row_and_diagonal_calculations(self):
        """Validates line calculation across rows, columns, and diagonals."""
        card = [[(r * 5 + c + 1) for c in range(5)] for r in range(5)]

        # 1. No calls -> 0 lines
        res0 = calculate_lines(card, [])
        self.assertEqual(res0['total_lines'], 0)
        self.assertFalse(res0['is_bingo'])

        # 2. Mark Row 0 (1..5) and Main Diagonal (1, 7, 13, 19, 25) -> 2 lines ('B', 'I')
        called = [1, 2, 3, 4, 5, 7, 13, 19, 25]
        res2 = calculate_lines(card, called)
        self.assertEqual(res2['total_lines'], 2)
        self.assertEqual(res2['active_letters'], ['B', 'I'])
        self.assertFalse(res2['is_bingo'])

        # 3. Complete 5 lines -> 'B','I','N','G','O'
        called.extend([6, 8, 9, 10, 11, 16, 21, 12, 17, 22])
        res5 = calculate_lines(card, called)
        self.assertTrue(res5['total_lines'] >= 5)
        self.assertTrue(res5['is_bingo'])
        self.assertEqual(res5['active_letters'], ['B', 'I', 'N', 'G', 'O'])


class BingoAPITests(APITestCase):
    """
    Integration tests covering the entire multiplayer REST API lifecycle.
    """
    def test_health_check(self):
        """Health check returns 200 OK and healthy status."""
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'ok')

    def test_room_creation_and_joining(self):
        """Tests room creation, joining, and validation on invalid codes."""
        # 1. Create Room
        res = self.client.post('/api/rooms/create/', {'name': 'ApexHost', 'avatar': 'cyber-fox'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        code = res.data['code']
        self.assertEqual(len(code), 6)
        self.assertEqual(res.data['room']['players'][0]['name'], 'ApexHost')
        self.assertTrue('player_id' in res.data)

        # 2. Join Room
        res_join = self.client.post('/api/rooms/join/', {'code': code, 'name': 'ViperGuest'}, format='json')
        self.assertEqual(res_join.status_code, status.HTTP_200_OK)
        self.assertEqual(res_join.data['code'], code)
        self.assertFalse(res_join.data['is_reconnection'])

        # 3. Invalid Room Code
        res_bad = self.client.post('/api/rooms/join/', {'code': 'XXXXXX', 'name': 'Ghost'}, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_404_NOT_FOUND)

    def test_custom_card_update_rules(self):
        """Tests custom card ordering (1-25) validation before and after game start."""
        # Host creates room
        res = self.client.post('/api/rooms/create/', {'name': 'Host'}, format='json')
        code = res.data['code']
        host_id = res.data['player_id']

        # Valid custom card (reversed 25..1)
        valid_card = [list(range(i * 5 + 1, (i + 1) * 5 + 1)) for i in range(5)]
        valid_card.reverse()
        res_card = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': valid_card}, format='json')
        self.assertEqual(res_card.status_code, status.HTTP_200_OK)
        self.assertEqual(res_card.data['card'], valid_card)

        # Invalid card (duplicate number 1, missing 25)
        bad_card = [[1] * 5 for _ in range(5)]
        res_bad = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': bad_card}, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_live_chat_and_emoji_reactions(self):
        """Tests sending text messages and emoji reactions."""
        res = self.client.post('/api/rooms/create/', {'name': 'ChatHost'}, format='json')
        code = res.data['code']
        host_id = res.data['player_id']

        # Send emoji reaction
        res_emoji = self.client.post(f'/api/rooms/{code}/chat/', {'player_id': host_id, 'emoji': '🔥'}, format='json')
        self.assertEqual(res_emoji.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_emoji.data['message']['emoji'], '🔥')

        # Send text message
        res_text = self.client.post(f'/api/rooms/{code}/chat/', {'player_id': host_id, 'text': 'Good luck!'}, format='json')
        self.assertEqual(res_text.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_text.data['message']['text'], 'Good luck!')

        # Verify state includes messages
        res_state = self.client.get(f'/api/rooms/{code}/state/?player_id={host_id}')
        self.assertEqual(len(res_state.data['messages']), 2)

    def test_turn_rules_and_gameplay_flow(self):
        """Tests turn rotation, duplicate calls, out-of-range protection, and rematch."""
        # 1. Create Room & Join Player 2
        res_c = self.client.post('/api/rooms/create/', {'name': 'P1'}, format='json')
        code = res_c.data['code']
        p1_id = res_c.data['player_id']

        res_j = self.client.post('/api/rooms/join/', {'code': code, 'name': 'P2'}, format='json')
        p2_id = res_j.data['player_id']

        # 2. Non-host cannot start game
        res_bad_start = self.client.post(f'/api/rooms/{code}/start/', {'player_id': p2_id}, format='json')
        self.assertEqual(res_bad_start.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Host tries to start before Player 2 is ready -> Rejected (400)
        res_unready = self.client.post(f'/api/rooms/{code}/start/', {'player_id': p1_id}, format='json')
        self.assertEqual(res_unready.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Waiting for", res_unready.data['error'])

        # 4. Player 2 marks ready -> Success
        res_ready = self.client.post(f'/api/rooms/{code}/ready/', {'player_id': p2_id, 'is_ready': True}, format='json')
        self.assertEqual(res_ready.status_code, status.HTTP_200_OK)
        self.assertTrue(res_ready.data['is_ready'])
        self.assertTrue(res_ready.data['all_ready'])

        # 5. Host starts game successfully now that all are ready
        res_start = self.client.post(f'/api/rooms/{code}/start/', {'player_id': p1_id}, format='json')
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)

        # 4. Player 2 tries to call on Player 1's turn -> Rejected
        res_wrong_turn = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p2_id, 'number': 5}, format='json')
        self.assertEqual(res_wrong_turn.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Out of range number -> Rejected
        res_oor = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p1_id, 'number': 99}, format='json')
        self.assertEqual(res_oor.status_code, status.HTTP_400_BAD_REQUEST)

        # 6. Player 1 calls number 12 -> Success!
        res_call = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p1_id, 'number': 12}, format='json')
        self.assertEqual(res_call.status_code, status.HTTP_200_OK)
        self.assertEqual(res_call.data['called_number'], 12)

        # 7. Duplicate call of 12 -> Rejected
        res_dup = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p2_id, 'number': 12}, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

        # 8. Rematch restart
        res_restart = self.client.post(f'/api/rooms/{code}/restart/', {'player_id': p1_id}, format='json')
        self.assertEqual(res_restart.status_code, status.HTTP_200_OK)
        self.assertEqual(CalledNumber.objects.filter(room__code=code).count(), 0)

    def test_solo_start_game(self):
        """Host can start the game alone for solo testing/development."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'SoloPlayer'}, format='json')
        code = res_c.data['code']
        player_id = res_c.data['player_id']

        res_start = self.client.post(f'/api/rooms/{code}/start/', {'player_id': player_id}, format='json')
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)
        self.assertEqual(res_start.data['status'], 'playing')

    def test_claim_bingo_authoritative_validation(self):
        """Server strictly rejects fake claims and only awards win when 5 lines are completed."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'Winner'}, format='json')
        code = res_c.data['code']
        player_id = res_c.data['player_id']

        self.client.post(f'/api/rooms/{code}/start/', {'player_id': player_id}, format='json')

        # Fake bingo claim with 0 lines -> Rejected
        res_fake = self.client.post(f'/api/rooms/{code}/bingo/', {'player_id': player_id}, format='json')
        self.assertEqual(res_fake.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res_fake.data['verified'])

    def test_chat_validation_empty_rejected(self):
        """Rejects chat payloads where both text and emoji are empty."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'User'}, format='json')
        code = res_c.data['code']
        player_id = res_c.data['player_id']

        res = self.client.post(f'/api/rooms/{code}/chat/', {'player_id': player_id, 'text': '   ', 'emoji': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ready_toggle_and_state_endpoint(self):
        """Tests ready toggle states, presence of player_id in players list, and my_ready."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'HostPlayer'}, format='json')
        code = res_c.data['code']
        host_id = res_c.data['player_id']

        res_j = self.client.post('/api/rooms/join/', {'code': code, 'name': 'JoiningPlayer'}, format='json')
        p2_id = res_j.data['player_id']

        # Check state: Host is host, JoiningPlayer is unready
        res_s2 = self.client.get(f'/api/rooms/{code}/state/?player_id={p2_id}')
        self.assertEqual(res_s2.status_code, status.HTTP_200_OK)
        self.assertFalse(res_s2.data['is_host'])
        self.assertFalse(res_s2.data['my_ready'])
        # Verify player_id is serialized in players list
        players = res_s2.data['players']
        p2_entry = next((p for p in players if p['player_id'] == p2_id), None)
        self.assertIsNotNone(p2_entry)
        self.assertFalse(p2_entry['is_ready'])

        # Toggle ready
        res_toggle = self.client.post(f'/api/rooms/{code}/ready/', {'player_id': p2_id}, format='json')
        self.assertEqual(res_toggle.status_code, status.HTTP_200_OK)
        self.assertTrue(res_toggle.data['is_ready'])

        # State now reflects my_ready=True
        res_s2_after = self.client.get(f'/api/rooms/{code}/state/?player_id={p2_id}')
        self.assertTrue(res_s2_after.data['my_ready'])

    def test_custom_card_dimensions_and_game_started_lock(self):
        """Tests that invalid matrices (not 5x5 or missing numbers) and started game modifications are rejected."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'Host'}, format='json')
        code = res_c.data['code']
        host_id = res_c.data['player_id']

        # 4x5 card -> Rejected
        bad_dim = [[1, 2, 3, 4, 5] for _ in range(4)]
        res_dim = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': bad_dim}, format='json')
        self.assertEqual(res_dim.status_code, status.HTTP_400_BAD_REQUEST)

        # Numbers with 0 or 26 -> Rejected
        bad_nums = [[i * 5 + j for j in range(5)] for i in range(5)]  # starts with 0..24
        res_nums = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': bad_nums}, format='json')
        self.assertEqual(res_nums.status_code, status.HTTP_400_BAD_REQUEST)

        # Start game
        self.client.post(f'/api/rooms/{code}/start/', {'player_id': host_id}, format='json')

        # Try to update card when game has already started -> Rejected
        valid_card = [[(r * 5 + c + 1) for c in range(5)] for r in range(5)]
        res_after = self.client.post(f'/api/rooms/{code}/card/', {'player_id': host_id, 'card': valid_card}, format='json')
        self.assertEqual(res_after.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reconnection_and_max_players_limit(self):
        """Tests player reconnection idempotency and max room capacity rejection."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'Host'}, format='json')
        code = res_c.data['code']

        # Join 5 additional players to reach maximum 6 players
        guest_ids = []
        for i in range(2, 7):
            res_j = self.client.post('/api/rooms/join/', {'code': code, 'name': f'Player{i}'}, format='json')
            self.assertEqual(res_j.status_code, status.HTTP_200_OK)
            guest_ids.append(res_j.data['player_id'])

        # 7th player attempt -> Rejected (Room is full)
        res_overflow = self.client.post('/api/rooms/join/', {'code': code, 'name': 'Player7'}, format='json')
        self.assertEqual(res_overflow.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full", res_overflow.data['error'])

        # Existing player re-joins -> Reconnection success without increasing count
        res_reconnect = self.client.post('/api/rooms/join/', {'code': code, 'name': 'Player2', 'player_id': guest_ids[0]}, format='json')
        self.assertEqual(res_reconnect.status_code, status.HTTP_200_OK)
        self.assertTrue(res_reconnect.data['is_reconnection'])
        self.assertEqual(res_reconnect.data['player_id'], guest_ids[0])

    def test_five_line_bingo_completion_victory(self):
        """Simulates complete match where player completes 5 lines and triggers server victory."""
        res_c = self.client.post('/api/rooms/create/', {'name': 'Winner'}, format='json')
        code = res_c.data['code']
        p1_id = res_c.data['player_id']

        # Set arranged card: row 0..4 = 1..25
        card = [[(r * 5 + c + 1) for c in range(5)] for r in range(5)]
        self.client.post(f'/api/rooms/{code}/card/', {'player_id': p1_id, 'card': card}, format='json')

        # Start game solo
        self.client.post(f'/api/rooms/{code}/start/', {'player_id': p1_id}, format='json')

        # Call rows 0, 1, 2, 3, 4 (25 numbers in total, completing all 5 rows + columns + diagonals)
        for num in range(1, 26):
            res_call = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p1_id, 'number': num}, format='json')
            if res_call.data.get('is_game_over'):
                break

        # Verify room state is finished and winner is 'Winner'
        res_state = self.client.get(f'/api/rooms/{code}/state/?player_id={p1_id}')
        self.assertEqual(res_state.data['status'], 'finished')
        self.assertEqual(res_state.data['winner_name'], 'Winner')

        # Claim bingo endpoint also verifies win
        res_claim = self.client.post(f'/api/rooms/{code}/bingo/', {'player_id': p1_id}, format='json')
        self.assertEqual(res_claim.status_code, status.HTTP_200_OK)
        self.assertTrue(res_claim.data['verified'])
