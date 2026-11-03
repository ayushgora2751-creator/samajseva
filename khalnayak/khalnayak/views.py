import mimetypes
from pathlib import Path
from django.http import Http404, FileResponse
from django.conf import settings

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'


def serve_frontend(request, path=''):
    """
    Serves the static frontend (HTML, CSS, JS) directly from Django so
    http://localhost:8080/ opens the game immediately.
    """
    clean_path = path.strip('/')
    if not clean_path:
        target = FRONTEND_DIR / 'index.html'
    else:
        target = (FRONTEND_DIR / clean_path).resolve()
        # Security: prevent directory traversal
        if not str(target).startswith(str(FRONTEND_DIR.resolve())):
            raise Http404("Not found")

    if target.is_file():
        content_type, _ = mimetypes.guess_type(str(target))
        return FileResponse(open(target, 'rb'), content_type=content_type or 'text/plain')

    # Fallback to index.html for SPA routing
    index_file = FRONTEND_DIR / 'index.html'
    if index_file.is_file():
        return FileResponse(open(index_file, 'rb'), content_type='text/html')

    raise Http404("File not found")
