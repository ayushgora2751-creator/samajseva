from django.contrib import admin
try:
    from .models import Room, Player, CalledNumber
except (ImportError, ValueError):
    from game.models import Room, Player, CalledNumber


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('code', 'status', 'current_turn', 'winner_name', 'player_count', 'created_at')
    search_fields = ('code',)
    list_filter = ('status',)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'room', 'turn_order', 'is_ready', 'joined_at')
    search_fields = ('name', 'room__code')


@admin.register(CalledNumber)
class CalledNumberAdmin(admin.ModelAdmin):
    list_display = ('room', 'order', 'number', 'called_by', 'created_at')
    list_filter = ('room',)
