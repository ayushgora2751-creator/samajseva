import mimetypes
from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import Http404, FileResponse
from django.conf import settings

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'


def serve_frontend(request, path=''):
    """
    Serves the static frontend (HTML, CSS, JS, Favicon, Manifest) and handles
    SPA client-side routing fallback so page refreshes never return 404.
    """
    clean_path = path.strip('/')

    # Handle favicon requests gracefully
    if clean_path in ('favicon.ico', 'favicon.svg'):
        fav = FRONTEND_DIR / 'favicon.svg'
        if fav.is_file():
            resp = FileResponse(open(fav, 'rb'), content_type='image/svg+xml')
            resp['Access-Control-Allow-Origin'] = '*'
            return resp

    if not clean_path:
        target = FRONTEND_DIR / 'index.html'
    else:
        target = (FRONTEND_DIR / clean_path).resolve()
        # Security: prevent directory traversal
        if not str(target).startswith(str(FRONTEND_DIR.resolve())):
            target = FRONTEND_DIR / 'index.html'

    if target.is_file():
        content_type, _ = mimetypes.guess_type(str(target))
        resp = FileResponse(open(target, 'rb'), content_type=content_type or 'text/plain')
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    # SPA Fallback: Any unknown sub-route or page refresh returns index.html (200 OK)
    index_file = FRONTEND_DIR / 'index.html'
    if index_file.is_file():
        resp = FileResponse(open(index_file, 'rb'), content_type='text/html')
        resp['Access-Control-Allow-Origin'] = '*'
        return resp

    raise Http404("File not found")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('game.urls')),
    re_path(r'^(?P<path>.*)$', serve_frontend, name='frontend'),
]
