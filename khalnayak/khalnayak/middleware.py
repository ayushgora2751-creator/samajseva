from django.http import HttpResponse


class UniversalCorsMiddleware:
    """
    Guarantees Access-Control-Allow-Origin is ALWAYS present on every single
    response (including errors, 404s, options preflights, and static files).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response.status_code = 200
        else:
            response = self.get_response(request)

        origin = request.headers.get('Origin', '*')
        response['Access-Control-Allow-Origin'] = origin if origin else '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-CSRFToken, Accept, Origin'
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Max-Age'] = '86400'
        return response

