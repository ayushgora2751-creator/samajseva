# pyrefly: ignore[untyped-import]
from django.shortcuts import redirect
# pyrefly: ignore[untyped-import]
from django.http import JsonResponse


def home(request):
    """
    If accessed directly in a browser, redirect to the React frontend on port 5173.
    If requested as JSON or via API clients, return status.
    """
    if 'text/html' in request.META.get('HTTP_ACCEPT', ''):
        return redirect('http://localhost:5173/')

    return JsonResponse({
        "project": "BINGO ARENA",
        "status": "online",
        "frontend": "http://localhost:5173/",
        "api": "/api/"
    })
