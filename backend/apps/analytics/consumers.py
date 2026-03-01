"""
Analytics WebSocket consumer.
Streams real-time KPI updates and AI insight notifications to connected clients.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class AnalyticsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time analytics dashboard updates.

    URL pattern: /ws/analytics/
    Group name:  analytics_dashboard

    Events broadcast to the group:
        - type: "kpi.update"      — new KPI snapshot available
        - type: "deal.scored"     — deal score recalculated
        - type: "insight.new"     — new AI insight generated
    """

    GROUP_NAME = 'analytics_dashboard'

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        logger.info('Analytics WS connected: channel=%s', self.channel_name)
        # Send a welcome event with current connection count
        await self.send(text_data=json.dumps({'type': 'connected', 'group': self.GROUP_NAME}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        logger.info('Analytics WS disconnected: code=%s', close_code)

    async def receive(self, text_data=None, bytes_data=None):
        """Clients can request a data refresh."""
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get('type') == 'ping':
                    await self.send(text_data=json.dumps({'type': 'pong'}))
            except json.JSONDecodeError:
                pass

    # ── Group event handlers ──────────────────────────────────────────────────

    async def kpi_update(self, event):
        """Broadcast KPI snapshot update."""
        await self.send(text_data=json.dumps({
            'type': 'kpi.update',
            'snapshot': event['snapshot'],
        }))

    async def deal_scored(self, event):
        """Broadcast individual deal score update."""
        await self.send(text_data=json.dumps({
            'type': 'deal.scored',
            'deal_id': event['deal_id'],
            'win_probability': event['win_probability'],
            'risk_level': event['risk_level'],
        }))

    async def insight_new(self, event):
        """Broadcast new AI insight."""
        await self.send(text_data=json.dumps({
            'type': 'insight.new',
            'insight': event['insight'],
        }))
