"""
Instagram integration views.
Handles webhooks, DM inbox, posts, and comment management.
"""
import hashlib
import hmac
import json
import logging
import requests

from django.conf import settings
from django.views import View
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.instagram.models import InstagramMessage, InstagramPost, InstagramComment
from apps.instagram.serializers import (
    InstagramMessageSerializer, InstagramPostSerializer,
    InstagramCommentSerializer, ReplyCommentSerializer,
)

logger = logging.getLogger(__name__)

GRAPH_API = 'https://graph.facebook.com/v19.0'


def _ig_get(endpoint: str, params: dict = None) -> dict:
    token = settings.META_IG_ACCESS_TOKEN
    params = params or {}
    params['access_token'] = token
    resp = requests.get(f'{GRAPH_API}/{endpoint}', params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


@method_decorator(csrf_exempt, name='dispatch')
class InstagramWebhookView(View):
    """Meta webhook for Instagram messaging and comment events."""

    def get(self, request):
        verify_token = settings.META_VERIFY_TOKEN
        if (request.GET.get('hub.mode') == 'subscribe'
                and request.GET.get('hub.verify_token') == verify_token):
            return HttpResponse(request.GET.get('hub.challenge', ''), status=200)
        return HttpResponse('Forbidden', status=403)

    def post(self, request):
        if not self._verify_signature(request):
            return HttpResponse('Invalid signature', status=403)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponse('Bad JSON', status=400)

        for entry in body.get('entry', []):
            for messaging in entry.get('messaging', []):
                self._handle_dm(messaging)
            for change in entry.get('changes', []):
                if change.get('field') == 'comments':
                    self._handle_comment(change.get('value', {}))

        return HttpResponse('OK', status=200)

    def _verify_signature(self, request) -> bool:
        secret = settings.META_APP_SECRET
        if not secret:
            return True
        sig = request.META.get('HTTP_X_HUB_SIGNATURE_256', '')
        expected = 'sha256=' + hmac.new(
            secret.encode(), request.body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(sig, expected)

    def _handle_dm(self, messaging: dict):
        msg_data = messaging.get('message', {})
        msg_id = msg_data.get('mid', '')
        if not msg_id or InstagramMessage.objects(ig_message_id=msg_id).first():
            return
        sender = messaging.get('sender', {})
        InstagramMessage(
            ig_message_id=msg_id,
            ig_conversation_id=messaging.get('sender', {}).get('id'),
            direction='inbound',
            from_ig_id=sender.get('id'),
            from_username=sender.get('username', ''),
            content=msg_data.get('text', ''),
            attachments=msg_data.get('attachments', []),
        ).save()

    def _handle_comment(self, value: dict):
        comment_id = value.get('id', '')
        if not comment_id or InstagramComment.objects(ig_comment_id=comment_id).first():
            return
        InstagramComment(
            ig_comment_id=comment_id,
            from_ig_id=value.get('from', {}).get('id'),
            from_username=value.get('from', {}).get('username', ''),
            text=value.get('text', ''),
        ).save()


class DMInboxView(APIView):
    """List received Instagram DMs."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = InstagramMessage.objects(direction='inbound').order_by('-timestamp').limit(50)
        return Response(InstagramMessageSerializer(messages, many=True).data)


class PostListView(APIView):
    """List synced Instagram posts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        posts = InstagramPost.objects.order_by('-published_at').limit(50)
        return Response(InstagramPostSerializer(posts, many=True).data)


class SyncPostsView(APIView):
    """Sync recent posts from the Instagram Graph API."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        account_id = settings.META_IG_ACCOUNT_ID
        if not account_id:
            return Response(
                {'detail': 'META_IG_ACCOUNT_ID not configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = _ig_get(
                f'{account_id}/media',
                {'fields': 'id,media_type,caption,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'},
            )
            synced = 0
            for item in data.get('data', []):
                ig_id = item['id']
                if InstagramPost.objects(ig_media_id=ig_id).first():
                    continue
                from datetime import datetime
                published = None
                try:
                    published = datetime.fromisoformat(item.get('timestamp', '').replace('Z', '+00:00'))
                except Exception:
                    pass
                InstagramPost(
                    ig_media_id=ig_id,
                    post_type=item.get('media_type', 'IMAGE').lower(),
                    caption=item.get('caption', ''),
                    media_url=item.get('media_url', ''),
                    thumbnail_url=item.get('thumbnail_url'),
                    permalink=item.get('permalink', ''),
                    likes_count=item.get('like_count', 0),
                    comments_count=item.get('comments_count', 0),
                    published_at=published,
                ).save()
                synced += 1
            return Response({'synced': synced})
        except Exception as exc:
            logger.error('Instagram sync error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class CommentListView(APIView):
    """List comments on a specific post."""
    permission_classes = [IsAuthenticated]

    def get(self, request, post_id):
        post = InstagramPost.objects(ig_media_id=post_id).first()
        if not post:
            raise NotFound('Post not found.')
        comments = InstagramComment.objects(post=post).order_by('-timestamp')
        return Response(InstagramCommentSerializer(comments, many=True).data)


class ReplyCommentView(APIView):
    """Reply to a comment via Instagram API."""
    permission_classes = [IsAuthenticated]

    def post(self, request, comment_id):
        comment = InstagramComment.objects(ig_comment_id=comment_id).first()
        if not comment:
            raise NotFound('Comment not found.')
        s = ReplyCommentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        text = s.validated_data['text']
        try:
            token = settings.META_IG_ACCESS_TOKEN
            resp = requests.post(
                f'{GRAPH_API}/{comment_id}/replies',
                data={'message': text, 'access_token': token},
                timeout=10,
            )
            resp.raise_for_status()
            InstagramComment.objects(ig_comment_id=comment_id).update_one(set__is_replied=True)
            return Response({'detail': 'Reply sent.'})
        except requests.HTTPError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
