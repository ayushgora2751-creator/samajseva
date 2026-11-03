"""
ASGI config for khalnayak project - BINGO ARENA.

It exposes the ASGI callable as a module-level variable named ``application``.
Handles both standard HTTP requests and real-time WebSocket connections.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'khalnayak.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import game.routing

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(
            game.routing.websocket_urlpatterns
        )
    ),
})
