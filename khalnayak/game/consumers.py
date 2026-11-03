import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Room, Player, Game, Move, PlayerProfile
from .game_logic import (
    validate_number,
    calculate_completed_lines,
    check_winner,
    generate_board,
)


class BingoGameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code'].upper()
        self.room_group_name = f'game_{self.room_code}'
        self.player_token = None

        # Join the channel group for this room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Notify room if player went offline
        if self.player_token:
            player_info = await self.set_player_offline(self.player_token)
            if player_info:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_status_change',
                        'player_number': player_info['player_number'],
                        'nickname': player_info['nickname'],
                        'is_online': False,
                    },
                )

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name,
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON format.'}))
            return

        action = data.get('action')

        if action == 'authenticate':
            await self.handle_authenticate(data)
        elif action == 'make_move':
            await self.handle_make_move(data)
        elif action == 'send_reaction':
            await self.handle_reaction(data)
        elif action == 'rematch':
            await self.handle_rematch(data)
        else:
            await self.send(text_data=json.dumps({'error': f"Unknown action: {action}"}))

    async def handle_authenticate(self, data):
        token = data.get('session_token')
        auth_result = await self.authenticate_player(token)

        if not auth_result['valid']:
            await self.send(text_data=json.dumps({
                'type': 'auth_error',
                'error': auth_result.get('error', 'Authentication failed.'),
            }))
            return

        self.player_token = token
        state = await self.get_full_game_state(token)

        # Notify room that player is online and ready
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_status_change',
                'player_number': auth_result['player_number'],
                'nickname': auth_result['nickname'],
                'is_online': True,
            },
        )

        # Send full synced state to current player
        await self.send(text_data=json.dumps({
            'type': 'initial_state',
            **state,
        }))

        # If both players are now connected and game was waiting, start the game
        start_result = await self.check_and_start_game()
        if start_result.get('started'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_started',
                    'current_turn': 1,
                    'message': 'Both players are ready! The battle begins!',
                },
            )

    async def handle_make_move(self, data):
        token = data.get('session_token') or self.player_token
        number = data.get('number')

        if not token:
            await self.send(text_data=json.dumps({'error': 'Unauthorized: Missing session token.'}))
            return

        # Perform authoritative move processing in database
        result = await self.process_move(token, number)

        if not result['success']:
            await self.send(text_data=json.dumps({
                'type': 'move_error',
                'error': result['error'],
            }))
            return

        # Broadcast the validated move & updated scores to all players
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_update',
                'last_move': result['last_move'],
                'called_numbers': result['called_numbers'],
                'current_turn': result['current_turn'],
                'p1_stats': result['p1_stats'],
                'p2_stats': result['p2_stats'],
                'game_status': result['game_status'],
                'winner': result['winner'],
            },
        )

    async def handle_reaction(self, data):
        token = data.get('session_token') or self.player_token
        emoji = data.get('emoji', '🎯')
        player_info = await self.get_player_info(token)
        if player_info:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'reaction_broadcast',
                    'player_number': player_info['player_number'],
                    'nickname': player_info['nickname'],
                    'emoji': emoji,
                },
            )

    async def handle_rematch(self, data):
        token = data.get('session_token') or self.player_token
        rematch_data = await self.reset_game_for_rematch()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'rematch_started',
                'current_turn': 1,
                'called_numbers': [],
            },
        )

    # Channel layer group message handlers
    async def game_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def player_status_change(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_started(self, event):
        await self.send(text_data=json.dumps(event))

    async def reaction_broadcast(self, event):
        await self.send(text_data=json.dumps(event))

    async def rematch_started(self, event):
        # When a rematch starts, send each player their new personalized board
        if self.player_token:
            state = await self.get_full_game_state(self.player_token)
            await self.send(text_data=json.dumps({
                'type': 'initial_state',
                **state,
            }))
        await self.send(text_data=json.dumps(event))

    # Database synchronization helpers
    @database_sync_to_async
    def authenticate_player(self, token):
        if not token:
            return {'valid': False, 'error': 'Missing token.'}
        try:
            player = Player.objects.select_related('room').get(
                session_token=token,
                room__room_code=self.room_code,
            )
            player.is_online = True
            player.save(update_fields=['is_online', 'last_seen'])
            return {
                'valid': True,
                'player_number': player.player_number,
                'nickname': player.nickname,
            }
        except Player.DoesNotExist:
            return {'valid': False, 'error': 'Player not found in this room.'}

    @database_sync_to_async
    def set_player_offline(self, token):
        try:
            player = Player.objects.get(session_token=token)
            player.is_online = False
            player.save(update_fields=['is_online'])
            return {'player_number': player.player_number, 'nickname': player.nickname}
        except Player.DoesNotExist:
            return None

    @database_sync_to_async
    def get_player_info(self, token):
        try:
            player = Player.objects.get(session_token=token)
            return {'player_number': player.player_number, 'nickname': player.nickname}
        except Player.DoesNotExist:
            return None

    @database_sync_to_async
    def check_and_start_game(self):
        room = Room.objects.filter(room_code=self.room_code).first()
        if not room or room.players.count() < 2:
            return {'started': False}

        game = getattr(room, 'game', None)
        if not game:
            return {'started': False}

        if game.game_status == Game.STATUS_WAITING:
            game.game_status = Game.STATUS_ACTIVE
            game.current_turn = 1
            game.save(update_fields=['game_status', 'current_turn'])
            room.status = Room.STATUS_PLAYING
            room.started_at = timezone.now()
            room.save(update_fields=['status', 'started_at'])
            return {'started': True}

        return {'started': False}

    @database_sync_to_async
    def process_move(self, token, number):
        room = Room.objects.filter(room_code=self.room_code).first()
        if not room:
            return {'success': False, 'error': 'Room not found.'}

        player = room.players.filter(session_token=token).first()
        if not player:
            return {'success': False, 'error': 'Player not found in this room.'}

        game = getattr(room, 'game', None)
        if not game or game.game_status != Game.STATUS_ACTIVE:
            return {'success': False, 'error': 'Game is not in active state.'}

        # Check turn
        if game.current_turn != player.player_number:
            return {'success': False, 'error': f"It is not your turn! Waiting for Player {game.current_turn}."}

        called = list(game.called_numbers or [])
        valid, err_msg = validate_number(number, called)
        if not valid:
            return {'success': False, 'error': err_msg}

        # Add number
        called.append(number)
        game.called_numbers = called

        # Fetch both players to calculate scores
        players = list(room.players.order_by('player_number'))
        p1 = players[0] if len(players) > 0 else None
        p2 = players[1] if len(players) > 1 else None

        p1_stats = calculate_completed_lines(p1.board, called) if p1 else {}
        p2_stats = calculate_completed_lines(p2.board, called) if p2 else {}

        # Record move in Move model
        move_count = game.moves.count() + 1
        Move.objects.create(
            game=game,
            player=player,
            selected_number=number,
            move_number=move_count,
            player1_lines=p1_stats.get('total_lines', 0),
            player2_lines=p2_stats.get('total_lines', 0),
        )

        # Check for winner
        target = game.target_lines
        has_winner, winner_key = check_winner(
            player1_lines=p1_stats.get('total_lines', 0),
            player2_lines=p2_stats.get('total_lines', 0),
            target_lines=target,
            last_player_turn=player.player_number,
        )

        winner_name = None
        if has_winner:
            if winner_key == 'player1' and p1:
                game.winner = p1
                game.game_status = Game.STATUS_COMPLETED
                winner_name = p1.nickname
                self._record_match_result(winner=p1, loser=p2, is_tie=False)
            elif winner_key == 'player2' and p2:
                game.winner = p2
                game.game_status = Game.STATUS_COMPLETED
                winner_name = p2.nickname
                self._record_match_result(winner=p2, loser=p1, is_tie=False)
            elif winner_key == 'tie':
                game.game_status = Game.STATUS_TIE
                winner_name = 'tie'
                self._record_match_result(winner=p1, loser=p2, is_tie=True)

            game.completed_at = timezone.now()
            room.status = Room.STATUS_FINISHED
            room.finished_at = timezone.now()
            room.save(update_fields=['status', 'finished_at'])
        else:
            # Switch turn
            game.current_turn = 2 if game.current_turn == 1 else 1

        game.save()

        return {
            'success': True,
            'last_move': {
                'number': number,
                'player_number': player.player_number,
                'nickname': player.nickname,
            },
            'called_numbers': game.called_numbers,
            'current_turn': game.current_turn,
            'p1_stats': p1_stats,
            'p2_stats': p2_stats,
            'game_status': game.game_status,
            'winner': winner_name,
        }

    def _record_match_result(self, winner, loser, is_tie=False):
        """Updates persistent profiles for leaderboard tracking."""
        if is_tie:
            if winner:
                p_win, _ = PlayerProfile.objects.get_or_create(nickname=winner.nickname)
                p_win.games_played += 1
                p_win.ties += 1
                p_win.save()
            if loser:
                p_lose, _ = PlayerProfile.objects.get_or_create(nickname=loser.nickname)
                p_lose.games_played += 1
                p_lose.ties += 1
                p_lose.save()
        else:
            if winner:
                p_win, _ = PlayerProfile.objects.get_or_create(nickname=winner.nickname)
                p_win.games_played += 1
                p_win.wins += 1
                p_win.save()
            if loser:
                p_lose, _ = PlayerProfile.objects.get_or_create(nickname=loser.nickname)
                p_lose.games_played += 1
                p_lose.losses += 1
                p_lose.save()

    @database_sync_to_async
    def reset_game_for_rematch(self):
        room = Room.objects.filter(room_code=self.room_code).first()
        if not room:
            return None
        game = getattr(room, 'game', None)
        if not game:
            return None

        for p in room.players.all():
            p.board = generate_board()
            p.save()

        game.called_numbers = []
        game.current_turn = 1
        game.game_status = Game.STATUS_ACTIVE
        game.winner = None
        game.completed_at = None
        game.save()
        game.moves.all().delete()

        room.status = Room.STATUS_PLAYING
        room.save()
        return True

    @database_sync_to_async
    def get_full_game_state(self, token):
        room = Room.objects.filter(room_code=self.room_code).first()
        if not room:
            return {}

        current_player = room.players.filter(session_token=token).first()
        game = getattr(room, 'game', None)

        players = list(room.players.order_by('player_number'))
        p1 = players[0] if len(players) > 0 else None
        p2 = players[1] if len(players) > 1 else None

        called = game.called_numbers if game else []
        p1_stats = calculate_completed_lines(p1.board, called) if p1 and p1.board else {}
        p2_stats = calculate_completed_lines(p2.board, called) if p2 and p2.board else {}

        winner_name = None
        if game and game.winner:
            winner_name = game.winner.nickname
        elif game and game.game_status == Game.STATUS_TIE:
            winner_name = 'tie'

        return {
            'room_code': room.room_code,
            'room_status': room.status,
            'current_player': {
                'id': str(current_player.id),
                'nickname': current_player.nickname,
                'avatar': current_player.avatar,
                'player_number': current_player.player_number,
                'board': current_player.board,
            } if current_player else None,
            'p1': {
                'nickname': p1.nickname,
                'avatar': p1.avatar,
                'player_number': 1,
                'is_online': p1.is_online,
                'stats': p1_stats,
            } if p1 else None,
            'p2': {
                'nickname': p2.nickname,
                'avatar': p2.avatar,
                'player_number': 2,
                'is_online': p2.is_online,
                'stats': p2_stats,
            } if p2 else None,
            'current_turn': game.current_turn if game else 1,
            'called_numbers': called,
            'game_status': game.game_status if game else 'waiting',
            'winner': winner_name,
        }

