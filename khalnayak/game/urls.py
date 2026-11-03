from django.urls import path

try:
    from . import views
except (ImportError, ValueError):
    from game import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('rooms/create/', views.create_room, name='create_room'),
    path('rooms/join/', views.join_room, name='join_room'),
    path('rooms/<str:code>/start/', views.start_game, name='start_game'),
    path('rooms/<str:code>/call/', views.call_number, name='call_number'),
    path('rooms/<str:code>/state/', views.get_game_state, name='game_state'),
    path('rooms/<str:code>/card/', views.update_card, name='update_card'),
    path('rooms/<str:code>/chat/', views.send_chat, name='send_chat'),
    path('rooms/<str:code>/bingo/', views.claim_bingo, name='claim_bingo'),
    path('rooms/<str:code>/restart/', views.restart_game, name='restart_game'),
]
