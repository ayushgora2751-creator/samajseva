from rest_framework import serializers
try:
    from .models import Room, Player, CalledNumber
except (ImportError, ValueError):
    from game.models import Room, Player, CalledNumber


class PlayerPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['player_id', 'name', 'avatar', 'turn_order', 'is_ready']


class PlayerPrivateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['player_id', 'name', 'avatar', 'turn_order', 'card', 'marked', 'is_ready']


class CalledNumberSerializer(serializers.ModelSerializer):
    called_by_name = serializers.CharField(source='called_by.name', read_only=True, default='Host')

    class Meta:
        model = CalledNumber
        fields = ['number', 'order', 'called_by_name', 'created_at']


class RoomSerializer(serializers.ModelSerializer):
    players = PlayerPublicSerializer(many=True, read_only=True)
    player_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            'code',
            'status',
            'host_player_id',
            'current_turn',
            'winner_name',
            'max_players',
            'player_count',
            'players',
            'created_at',
        ]
