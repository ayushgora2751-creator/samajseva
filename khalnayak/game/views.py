from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

try:
    from .models import Room, Player, CalledNumber, ChatMessage
    from .serializers import (
        RoomSerializer,
        PlayerPrivateSerializer,
        PlayerPublicSerializer,
        CalledNumberSerializer,
        ChatMessageSerializer,
    )
    from .game_logic import generate_card, calculate_lines
except (ImportError, ValueError):
    from game.models import Room, Player, CalledNumber, ChatMessage
    from game.serializers import (
        RoomSerializer,
        PlayerPrivateSerializer,
        PlayerPublicSerializer,
        CalledNumberSerializer,
        ChatMessageSerializer,
    )
    from game.game_logic import generate_card, calculate_lines


@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint for Render/Railway monitoring and cold start detection.
    """
    return Response({
        'status': 'ok',
        'project': 'BINGO ARENA',
        'version': '2.0.0',
    })


@api_view(['POST'])
def create_room(request):
    """
    Creates a new game room with 6-char code and registers the host.
    """
    name = request.data.get('name', '').strip() or 'Host'
    avatar = request.data.get('avatar', 'cyber-fox')

    room = Room.objects.create()
    card = generate_card()

    player = Player.objects.create(
        room=room,
        name=name,
        avatar=avatar,
        turn_order=1,
        card=card,
        marked=[],
    )

    room.host_player_id = player.player_id
    room.save(update_fields=['host_player_id'])

    return Response({
        'code': room.code,
        'player_id': player.player_id,
        'card': player.card,
        'room': RoomSerializer(room).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def join_room(request):
    """
    Joins an existing room by 6-char room code. Supports up to 6 players.
    """
    code = request.data.get('code', '').strip().upper()
    name = request.data.get('name', '').strip() or 'Player'
    avatar = request.data.get('avatar', 'neon-cat')
    existing_player_id = request.data.get('player_id')

    room = Room.objects.filter(code=code).first()
    if not room:
        return Response(
            {'error': f"Room '{code}' does not exist. Please check the 6-letter code."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Reconnection handling
    if existing_player_id:
        existing = room.players.filter(player_id=existing_player_id).first()
        if existing:
            return Response({
                'code': room.code,
                'player_id': existing.player_id,
                'card': existing.card,
                'room': RoomSerializer(room).data,
                'is_reconnection': True,
            })

    if room.status != Room.STATUS_WAITING:
        return Response(
            {'error': 'This game has already started or finished.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if room.player_count >= room.max_players:
        return Response(
            {'error': f"Room is full (max {room.max_players} players)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    card = generate_card()
    next_order = room.player_count + 1

    player = Player.objects.create(
        room=room,
        name=name,
        avatar=avatar,
        turn_order=next_order,
        card=card,
        marked=[],
    )

    return Response({
        'code': room.code,
        'player_id': player.player_id,
        'card': player.card,
        'room': RoomSerializer(room).data,
        'is_reconnection': False,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def start_game(request, code):
    """
    Starts the match. Allowed only for the host player.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.data.get('player_id')

    if room.host_player_id != player_id:
        return Response({'error': 'Only the room host can start the game.'}, status=status.HTTP_403_FORBIDDEN)

    if room.player_count < 1:
        return Response(
            {'error': 'At least 1 player is required to start.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    room.status = Room.STATUS_PLAYING
    room.current_turn = 1
    room.save(update_fields=['status', 'current_turn'])

    return Response({'message': 'Game started!', 'status': room.status})


@api_view(['POST'])
def call_number(request, code):
    """
    Validates turn, calls a number (1-25), marks it on all cards, checks win.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.data.get('player_id')
    raw_number = request.data.get('number')

    if room.status != Room.STATUS_PLAYING:
        return Response({'error': 'Game is not in progress.'}, status=status.HTTP_400_BAD_REQUEST)

    player = room.players.filter(player_id=player_id).first()
    if not player:
        return Response({'error': 'Player not found in this room.'}, status=status.HTTP_404_NOT_FOUND)

    if player.turn_order != room.current_turn:
        return Response(
            {'error': f"It's not your turn! Waiting for Player #{room.current_turn}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        number = int(raw_number)
    except (TypeError, ValueError):
        return Response({'error': 'Number must be an integer between 1 and 25.'}, status=status.HTTP_400_BAD_REQUEST)

    if number < 1 or number > 25:
        return Response({'error': 'Number must be between 1 and 25.'}, status=status.HTTP_400_BAD_REQUEST)

    if room.called_numbers.filter(number=number).exists():
        return Response({'error': f"Number {number} has already been called."}, status=status.HTTP_400_BAD_REQUEST)

    # Record the called number
    order = room.called_numbers.count() + 1
    called_obj = CalledNumber.objects.create(
        room=room,
        number=number,
        called_by=player,
        order=order,
    )

    # Auto-mark on all players' cards
    all_called = list(room.called_numbers.values_list('number', flat=True))

    for p in room.players.all():
        card_nums = {num for row in p.card for num in row}
        p.marked = [n for n in all_called if n in card_nums]
        p.save(update_fields=['marked'])

    # Check if caller or anyone reached 5 lines
    caller_lines = calculate_lines(player.card, all_called)
    if caller_lines['is_bingo']:
        room.status = Room.STATUS_FINISHED
        room.winner_name = player.name
        room.save(update_fields=['status', 'winner_name'])
    else:
        # Rotate turn to next player
        total_players = room.players.count()
        room.current_turn = (room.current_turn % total_players) + 1
        room.save(update_fields=['current_turn'])

    return Response({
        'success': True,
        'called_number': number,
        'called_by': player.name,
        'current_turn': room.current_turn,
        'winner': room.winner_name,
        'is_game_over': room.status == Room.STATUS_FINISHED,
    })


@api_view(['GET'])
def get_game_state(request, code):
    """
    Polling endpoint: Returns full game state for the requesting player.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.query_params.get('player_id')
    player = room.players.filter(player_id=player_id).first() if player_id else None

    called_objs = room.called_numbers.select_related('called_by').all()
    called_list = [c.number for c in called_objs]

    # Current turn player name
    active_player = room.players.filter(turn_order=room.current_turn).first()
    active_name = active_player.name if active_player else f"Player {room.current_turn}"

    # Calculate lines for this player
    my_lines = calculate_lines(player.card, called_list) if player and player.card else {
        'total_lines': 0, 'winning_cells': [], 'active_letters': [], 'is_bingo': False,
    }

    players_data = []
    for p in room.players.all():
        p_lines = calculate_lines(p.card, called_list)
        players_data.append({
            'name': p.name,
            'avatar': p.avatar,
            'turn_order': p.turn_order,
            'lines_count': p_lines['total_lines'],
            'is_turn': p.turn_order == room.current_turn,
            'is_host': p.player_id == room.host_player_id,
            'is_ready': p.is_ready,
        })

    recent_messages = list(room.messages.order_by('-created_at')[:25])
    recent_messages.reverse()
    messages_data = ChatMessageSerializer(recent_messages, many=True).data

    return Response({
        'code': room.code,
        'status': room.status,
        'host_player_id': room.host_player_id,
        'is_host': bool(player and player.player_id == room.host_player_id),
        'current_turn': room.current_turn,
        'active_player_name': active_name,
        'is_my_turn': bool(player and player.turn_order == room.current_turn and room.status == Room.STATUS_PLAYING),
        'winner_name': room.winner_name,
        'called_numbers': [CalledNumberSerializer(c).data for c in called_objs],
        'called_list': called_list,
        'players': players_data,
        'my_card': player.card if player else [],
        'my_marked': player.marked if player else [],
        'my_lines': my_lines,
        'messages': messages_data,
    })


@api_view(['POST'])
def claim_bingo(request, code):
    """
    Validates a player's claim of having completed 5 lines (BINGO).
    Never trusts client claim; calculates directly from card and called numbers.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.data.get('player_id')
    player = room.players.filter(player_id=player_id).first()

    if not player:
        return Response({'error': 'Player not found.'}, status=status.HTTP_404_NOT_FOUND)

    called_list = list(room.called_numbers.values_list('number', flat=True))
    line_stats = calculate_lines(player.card, called_list)

    if line_stats['total_lines'] >= 5:
        room.status = Room.STATUS_FINISHED
        room.winner_name = player.name
        room.save(update_fields=['status', 'winner_name'])
        return Response({
            'verified': True,
            'winner': player.name,
            'lines': line_stats['total_lines'],
        })
    else:
        return Response({
            'verified': False,
            'message': f"You currently have {line_stats['total_lines']} line(s). Need 5 lines for BINGO!",
            'lines': line_stats['total_lines'],
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def restart_game(request, code):
    """
    Resets room for a rematch with fresh boards and clears called numbers.
    """
    room = get_object_or_404(Room, code=code.upper())

    # Regenerate cards for all current players
    for p in room.players.all():
        p.card = generate_card()
        p.marked = []
        p.save(update_fields=['card', 'marked'])

    room.called_numbers.all().delete()
    room.status = Room.STATUS_PLAYING
    room.current_turn = 1
    room.winner_name = None
    room.save(update_fields=['status', 'current_turn', 'winner_name'])

    return Response({'message': 'Rematch started with fresh 5x5 boards!'})


@api_view(['POST'])
def update_card(request, code):
    """
    Allows a player to save their custom 5x5 card (filled by clicking order 1 to 25)
    before the match starts.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.data.get('player_id')
    card = request.data.get('card')

    if room.status != Room.STATUS_WAITING:
        return Response({'error': 'Cards can only be arranged before the match begins.'}, status=status.HTTP_400_BAD_REQUEST)

    player = room.players.filter(player_id=player_id).first()
    if not player:
        return Response({'error': 'Player not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Validate 5x5 card contains numbers 1..25 exactly once
    if not isinstance(card, list) or len(card) != 5:
        return Response({'error': 'Card must be a 5x5 matrix.'}, status=status.HTTP_400_BAD_REQUEST)

    flat = []
    for row in card:
        if not isinstance(row, list) or len(row) != 5:
            return Response({'error': 'Each row must contain exactly 5 numbers.'}, status=status.HTTP_400_BAD_REQUEST)
        flat.extend(row)

    if sorted(flat) != list(range(1, 26)):
        return Response({'error': 'Card must contain numbers 1 to 25 exactly once.'}, status=status.HTTP_400_BAD_REQUEST)

    player.card = card
    player.is_ready = True
    player.save(update_fields=['card', 'is_ready'])

    return Response({'success': True, 'card': player.card, 'is_ready': player.is_ready})


@api_view(['POST'])
def send_chat(request, code):
    """
    Sends an emoji reaction or text chat message in the room.
    """
    room = get_object_or_404(Room, code=code.upper())
    player_id = request.data.get('player_id')
    text = (request.data.get('text') or '').strip()[:200]
    emoji = (request.data.get('emoji') or '').strip()[:20]

    if not text and not emoji:
        return Response({'error': 'Message or emoji required.'}, status=status.HTTP_400_BAD_REQUEST)

    player = room.players.filter(player_id=player_id).first()
    player_name = player.name if player else 'Spectator'
    avatar = player.avatar if player else 'cyber-fox'

    msg = ChatMessage.objects.create(
        room=room,
        player_name=player_name,
        avatar=avatar,
        text=text,
        emoji=emoji,
    )

    return Response({
        'success': True,
        'message': ChatMessageSerializer(msg).data,
    }, status=status.HTTP_201_CREATED)
