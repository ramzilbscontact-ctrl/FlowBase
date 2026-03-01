"""
WhatsApp WebSocket URL routing.
Imported by config/asgi.py.
"""
from django.urls import re_path
from apps.whatsapp.consumers import WhatsAppConsumer

websocket_urlpatterns = [
    re_path(r'^ws/whatsapp/(?P<phone>[\w+]+)/$', WhatsAppConsumer.as_asgi()),
    re_path(r'^ws/whatsapp/$', WhatsAppConsumer.as_asgi()),
]
