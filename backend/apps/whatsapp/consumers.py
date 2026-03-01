"""
WhatsApp WebSocket consumer.
Clients subscribe to a per-phone-number group and receive real-time
message events when inbound messages arrive or outbound status updates occur.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class WhatsAppConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time WhatsApp message streaming.

    URL pattern: /ws/whatsapp/<phone>/
    Group name:  whatsapp_<phone>

    Events broadcast to the group:
        - type: "message.new"     — inbound or outbound message created
        - type: "message.status"  — delivery/read receipt update
    """

    async def connect(self):
        self.phone = self.scope['url_route']['kwargs'].get('phone', 'all')
        # Sanitise phone so it's safe as a group name
        safe_phone = ''.join(c for c in self.phone if c.isalnum() or c == '_')
        self.group_name = f'whatsapp_{safe_phone}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info('WhatsApp WS connected: group=%s', self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info('WhatsApp WS disconnected: group=%s code=%s', self.group_name, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        """
        Clients can send a ping to keep the connection alive.
        Any other message is ignored.
        """
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get('type') == 'ping':
                    await self.send(text_data=json.dumps({'type': 'pong'}))
            except json.JSONDecodeError:
                pass

    # ── Group message handlers ────────────────────────────────────────────────

    async def message_new(self, event):
        """Called when a new message is dispatched to this group."""
        await self.send(text_data=json.dumps({
            'type': 'message.new',
            'message': event['message'],
        }))

    async def message_status(self, event):
        """Called when a message status update is dispatched."""
        await self.send(text_data=json.dumps({
            'type': 'message.status',
            'message_id': event['message_id'],
            'status': event['status'],
        }))
