"""
WhatsApp views — webhook handler, message sending, conversation history.
"""
import hashlib
import hmac
import json
import logging
import requests

from django.conf import settings
from django.views import View
from django.http import HttpResponse, JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.whatsapp.models import WhatsAppMessage, WhatsAppContact
from apps.whatsapp.serializers import WhatsAppMessageSerializer, WhatsAppContactSerializer

logger = logging.getLogger(__name__)

META_API_BASE = 'https://graph.facebook.com/v19.0'


def _send_to_meta(payload: dict) -> dict:
    """POST a message payload to the Meta Cloud API."""
    phone_id = settings.META_PHONE_NUMBER_ID
    token = settings.META_WHATSAPP_TOKEN
    url = f'{META_API_BASE}/{phone_id}/messages'
    resp = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _broadcast_message(message: WhatsAppMessage):
    """Push message to the relevant WebSocket group via channel layer."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        group_name = f'whatsapp_{message.phone.replace("+", "")}'
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'message_new',
                'message': WhatsAppMessageSerializer(message).data,
            },
        )
    except Exception as exc:
        logger.warning('WhatsApp broadcast failed: %s', exc)


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    Meta webhook endpoint.
    GET  — verification challenge.
    POST — incoming messages / status updates.
    """

    def get(self, request):
        verify_token = settings.META_VERIFY_TOKEN
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')
        if mode == 'subscribe' and token == verify_token:
            return HttpResponse(challenge, status=200)
        return HttpResponse('Verification failed', status=403)

    def post(self, request):
        # Verify signature
        if not self._verify_signature(request):
            return HttpResponse('Invalid signature', status=403)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse('Bad JSON', status=400)

        for entry in body.get('entry', []):
            for change in entry.get('changes', []):
                value = change.get('value', {})
                # Incoming messages
                for msg in value.get('messages', []):
                    self._handle_inbound(msg, value.get('contacts', []))
                # Status updates
                for status_update in value.get('statuses', []):
                    self._handle_status(status_update)

        return HttpResponse('OK', status=200)

    def _verify_signature(self, request) -> bool:
        secret = settings.META_APP_SECRET
        if not secret:
            return True  # Skip verification in dev when secret not set
        signature = request.META.get('HTTP_X_HUB_SIGNATURE_256', '')
        expected = 'sha256=' + hmac.new(
            secret.encode(), request.body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)

    def _handle_inbound(self, msg: dict, contacts: list):
        phone = msg.get('from', '')
        wa_id = msg.get('id', '')
        msg_type = msg.get('type', 'text')

        content = None
        media_url = None
        if msg_type == 'text':
            content = msg.get('text', {}).get('body', '')
        elif msg_type in ('image', 'audio', 'video', 'document'):
            media_url = msg.get(msg_type, {}).get('url', '')

        # Upsert WA contact
        wa_contact = WhatsAppContact.objects(phone=phone).first()
        if not wa_contact:
            display_name = ''
            for c in contacts:
                if c.get('wa_id') == phone.lstrip('+'):
                    display_name = c.get('profile', {}).get('name', '')
            wa_contact = WhatsAppContact(phone=phone, display_name=display_name).save()

        message = WhatsAppMessage(
            wa_message_id=wa_id,
            direction='inbound',
            message_type=msg_type,
            phone=phone,
            wa_contact=wa_contact,
            content=content,
            media_url=media_url,
            msg_status='delivered',
        ).save()

        _broadcast_message(message)

    def _handle_status(self, status_update: dict):
        wa_id = status_update.get('id', '')
        new_status = status_update.get('status', '')
        WhatsAppMessage.objects(wa_message_id=wa_id).update_one(
            set__msg_status=new_status
        )
        # Broadcast status update
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            msg = WhatsAppMessage.objects(wa_message_id=wa_id).first()
            if msg:
                channel_layer = get_channel_layer()
                group_name = f'whatsapp_{msg.phone.replace("+", "")}'
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {'type': 'message_status', 'message_id': wa_id, 'status': new_status},
                )
        except Exception as exc:
            logger.warning('Status broadcast failed: %s', exc)


class ConversationListView(APIView):
    """List all conversations (distinct phones with last message)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pipeline = [
            {'$sort': {'timestamp': -1}},
            {'$group': {
                '_id': '$phone',
                'last_message': {'$first': '$$ROOT'},
                'unread_count': {'$sum': {
                    '$cond': [
                        {'$and': [
                            {'$eq': ['$direction', 'inbound']},
                            {'$ne': ['$msg_status', 'read']},
                        ]},
                        1, 0,
                    ]
                }},
            }},
            {'$sort': {'last_message.timestamp': -1}},
            {'$limit': 100},
        ]
        results = list(WhatsAppMessage.objects.aggregate(*pipeline))
        return Response(results)


class MessageListView(APIView):
    """Get message history for a specific phone number."""
    permission_classes = [IsAuthenticated]

    def get(self, request, phone):
        messages = WhatsAppMessage.objects(phone=phone).order_by('-timestamp').limit(50)
        return Response(WhatsAppMessageSerializer(messages, many=True).data)


class SendMessageView(APIView):
    """Send a text or template message to a WhatsApp number."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone')
        content = request.data.get('content', '')
        template_name = request.data.get('template_name')
        template_params = request.data.get('template_params', [])

        if not phone:
            return Response({'detail': 'phone is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if template_name:
                payload = {
                    'messaging_product': 'whatsapp',
                    'to': phone,
                    'type': 'template',
                    'template': {
                        'name': template_name,
                        'language': {'code': 'fr'},
                        'components': [
                            {
                                'type': 'body',
                                'parameters': [{'type': 'text', 'text': p} for p in template_params],
                            }
                        ],
                    },
                }
                msg_type = 'template'
            else:
                payload = {
                    'messaging_product': 'whatsapp',
                    'to': phone,
                    'type': 'text',
                    'text': {'body': content},
                }
                msg_type = 'text'

            meta_resp = _send_to_meta(payload)
            wa_message_id = meta_resp.get('messages', [{}])[0].get('id', '')

            message = WhatsAppMessage(
                wa_message_id=wa_message_id,
                direction='outbound',
                message_type=msg_type,
                phone=phone,
                content=content,
                template_name=template_name,
                template_params=template_params,
                msg_status='sent',
                sent_by_id=str(request.user.id),
            ).save()

            _broadcast_message(message)
            return Response(WhatsAppMessageSerializer(message).data, status=status.HTTP_201_CREATED)

        except requests.HTTPError as exc:
            logger.error('Meta API error: %s', exc)
            return Response(
                {'detail': f'Meta API error: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
