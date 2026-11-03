# pyrefly: ignore[untyped-import]
from django.contrib import admin
# pyrefly: ignore[untyped-import]
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('game.urls')),
]
