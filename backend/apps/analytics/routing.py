"""
Analytics WebSocket URL routing.
Imported by config/asgi.py.
"""
from django.urls import re_path
from apps.analytics.consumers import AnalyticsConsumer

websocket_urlpatterns = [
    re_path(r'^ws/analytics/$', AnalyticsConsumer.as_asgi()),
]
