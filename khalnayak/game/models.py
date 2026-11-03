import uuid
import random
import string
from django.db import models


def generate_room_code():
    """Generates a unique 6-character alphanumeric room code."""
    safe_chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(safe_chars, k=6))


def generate_player_id():
    """Generates a secure 32-character hex player ID token."""
    return uuid.uuid4().hex


class Room(models.Model):
    STATUS_WAITING = 'waiting'
    STATUS_PLAYING = 'playing'
    STATUS_FINISHED = 'finished'

    STATUS_CHOICES = [
        (STATUS_WAITING, 'Waiting for players'),
        (STATUS_PLAYING, 'Game in progress'),
        (STATUS_FINISHED, 'Match finished'),
    ]

    code = models.CharField(max_length=8, unique=True, default=generate_room_code, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_WAITING)
    host_player_id = models.CharField(max_length=64, blank=True, null=True)
    current_turn = models.PositiveSmallIntegerField(default=1)  # 1 to N (player turn index)
    winner_name = models.CharField(max_length=100, blank=True, null=True)
    max_players = models.PositiveSmallIntegerField(default=6)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Room {self.code} [{self.status}]"

    @property
    def player_count(self):
        return self.players.count()


class Player(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player_id = models.CharField(max_length=64, unique=True, default=generate_player_id, db_index=True)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=50)
    avatar = models.CharField(max_length=50, default='cyber-fox')
    turn_order = models.PositiveSmallIntegerField(default=1)  # 1, 2, 3...
    card = models.JSONField(default=list)  # 5x5 list of numbers 1-25
    marked = models.JSONField(default=list)  # List of numbers marked so far
    is_ready = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['turn_order']

    def __str__(self):
        return f"{self.name} in Room {self.room.code} (P{self.turn_order})"


class CalledNumber(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='called_numbers')
    number = models.PositiveSmallIntegerField()
    called_by = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        unique_together = ('room', 'order')

    def __str__(self):
        caller = self.called_by.name if self.called_by else 'Host'
        return f"#{self.order}: {caller} called {self.number} in {self.room.code}"
