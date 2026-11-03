from rest_framework.test import APITestCase
from rest_framework import status

try:
    from game.models import Room, Player, CalledNumber
    from game.game_logic import generate_card, calculate_lines
except (ImportError, ValueError):
    from .models import Room, Player, CalledNumber
    from .game_logic import generate_card, calculate_lines


class GameLogicTests(APITestCase):
    def test_card_generation(self):
        card = generate_card()
        self.assertEqual(len(card), 5)
        for row in card:
            self.assertEqual(len(row), 5)
        flat = [num for row in card for num in row]
        self.assertEqual(len(flat), 25)
        self.assertEqual(set(flat), set(range(1, 26)))

    def test_line_calculations(self):
        # 1-25 ordered card
        card = [[(r * 5 + c + 1) for c in range(5)] for r in range(5)]
        # Mark Row 0 (1, 2, 3, 4, 5) and Main Diagonal (1, 7, 13, 19, 25)
        called = [1, 2, 3, 4, 5, 7, 13, 19, 25]
        res = calculate_lines(card, called)
        self.assertEqual(res['total_lines'], 2)
        self.assertEqual(res['active_letters'], ['B', 'I'])
        self.assertFalse(res['is_bingo'])

        # Now complete 5 lines
        # Row 1 (6, 7, 8, 9, 10), Col 0 (1, 6, 11, 16, 21), Col 1 (2, 7, 12, 17, 22), Anti-diag (5, 9, 13, 17, 21)
        called.extend([6, 8, 9, 10, 11, 16, 21, 12, 17, 22])
        res5 = calculate_lines(card, called)
        self.assertTrue(res5['total_lines'] >= 5)
        self.assertTrue(res5['is_bingo'])
        self.assertEqual(res5['active_letters'], ['B', 'I', 'N', 'G', 'O'])


class BingoAPITests(APITestCase):
    def test_health_check(self):
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['status'], 'ok')

    def test_full_game_lifecycle(self):
        # 1. Host creates room
        res_create = self.client.post('/api/rooms/create/', {'name': 'HostPlayer'}, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        code = res_create.data['code']
        host_id = res_create.data['player_id']
        self.assertEqual(len(code), 6)

        # 2. Player 2 joins
        res_join = self.client.post('/api/rooms/join/', {'code': code, 'name': 'Challenger'}, format='json')
        self.assertEqual(res_join.status_code, status.HTTP_200_OK)
        p2_id = res_join.data['player_id']

        # 3. Host starts game
        res_start = self.client.post(f'/api/rooms/{code}/start/', {'player_id': host_id}, format='json')
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)

        # 4. Host calls a number (e.g. 7)
        res_call = self.client.post(f'/api/rooms/{code}/call/', {'player_id': host_id, 'number': 7}, format='json')
        self.assertEqual(res_call.status_code, status.HTTP_200_OK)
        self.assertEqual(res_call.data['called_number'], 7)

        # 5. Check state via polling endpoint
        res_state = self.client.get(f'/api/rooms/{code}/state/?player_id={p2_id}')
        self.assertEqual(res_state.status_code, status.HTTP_200_OK)
        self.assertEqual(res_state.data['called_list'], [7])
        self.assertTrue(res_state.data['is_my_turn'])  # Turn rotated to Player 2!

        # 6. Player 2 calls a number (e.g. 15)
        res_call2 = self.client.post(f'/api/rooms/{code}/call/', {'player_id': p2_id, 'number': 15}, format='json')
        self.assertEqual(res_call2.status_code, status.HTTP_200_OK)
        self.assertEqual(res_call2.data['called_number'], 15)

        # 7. Rematch restart
        res_restart = self.client.post(f'/api/rooms/{code}/restart/', {'player_id': host_id}, format='json')
        self.assertEqual(res_restart.status_code, status.HTTP_200_OK)
