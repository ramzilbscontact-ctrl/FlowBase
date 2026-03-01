import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django_asgi_app = get_asgi_application()

from apps.whatsapp.routing import websocket_urlpatterns as whatsapp_ws
from apps.analytics.routing import websocket_urlpatterns as analytics_ws

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(
            whatsapp_ws + analytics_ws
        )
    ),
})
