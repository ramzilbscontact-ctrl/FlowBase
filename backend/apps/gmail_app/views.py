"""
Gmail app views — sync messages, compose, thread listing.
Uses the Google Gmail API via google-api-python-client.
"""
import base64
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.gmail_app.models import GmailMessage, GmailThread
from apps.gmail_app.serializers import (
    GmailMessageSerializer, GmailThreadSerializer, ComposeEmailSerializer
)

logger = logging.getLogger(__name__)


def _get_gmail_service(user):
    """Build a Gmail API service object using the user's stored Google token."""
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    from apps.integrations.models import GoogleToken

    token_doc = GoogleToken.objects(user_id=str(user.id)).first()
    if not token_doc:
        return None

    creds = Credentials(
        token=token_doc.access_token,
        refresh_token=token_doc.refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
    )
    return build('gmail', 'v1', credentials=creds)


class InboxView(APIView):
    """List Gmail messages stored in MongoDB (previously synced)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = GmailMessage.objects(owner_user_id=str(request.user.id))
        label = request.query_params.get('label')
        if label:
            qs = qs.filter(labels=label)
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=(is_read.lower() == 'true'))
        limit = min(100, int(request.query_params.get('limit', 50)))
        return Response(GmailMessageSerializer(qs.limit(limit), many=True).data)


class ThreadListView(APIView):
    """List conversation threads."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        threads = GmailThread.objects(
            owner_user_id=str(request.user.id)
        ).order_by('-last_message_at').limit(50)
        return Response(GmailThreadSerializer(threads, many=True).data)


class ThreadDetailView(APIView):
    """Get all messages in a thread."""
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        messages = GmailMessage.objects(
            thread_id=thread_id,
            owner_user_id=str(request.user.id),
        ).order_by('received_at')
        return Response(GmailMessageSerializer(messages, many=True).data)


class SyncInboxView(APIView):
    """
    Trigger a Gmail sync — fetches recent messages from the API
    and stores them in MongoDB.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service = _get_gmail_service(request.user)
        if not service:
            return Response(
                {'detail': 'Gmail not connected. Please connect via /api/integrations/google/connect/.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = service.users().messages().list(
                userId='me', labelIds=['INBOX'], maxResults=50
            ).execute()
            messages = result.get('messages', [])
            synced = 0

            for msg_ref in messages:
                msg_id = msg_ref['id']
                if GmailMessage.objects(gmail_id=msg_id).first():
                    continue  # already synced

                full = service.users().messages().get(
                    userId='me', id=msg_id, format='full'
                ).execute()
                self._store_message(full, str(request.user.id))
                synced += 1

            return Response({'synced': synced, 'total_fetched': len(messages)})
        except Exception as exc:
            logger.error('Gmail sync error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    def _store_message(self, full: dict, user_id: str):
        headers = {h['name'].lower(): h['value'] for h in full.get('payload', {}).get('headers', [])}
        received_ts = None
        try:
            received_ts = datetime.utcfromtimestamp(int(full.get('internalDate', 0)) / 1000)
        except Exception:
            pass

        body_plain = ''
        parts = full.get('payload', {}).get('parts', [])
        for part in parts:
            if part.get('mimeType') == 'text/plain':
                data = part.get('body', {}).get('data', '')
                if data:
                    body_plain = base64.urlsafe_b64decode(data + '==').decode('utf-8', errors='replace')
                break

        GmailMessage(
            gmail_id=full['id'],
            thread_id=full.get('threadId', ''),
            subject=headers.get('subject', ''),
            from_email=headers.get('from', ''),
            to_email=[e.strip() for e in headers.get('to', '').split(',') if e.strip()],
            snippet=full.get('snippet', '')[:500],
            labels=full.get('labelIds', []),
            is_read='UNREAD' not in full.get('labelIds', []),
            body_plain=body_plain[:10000],
            owner_user_id=user_id,
            received_at=received_ts,
        ).save()


class ComposeEmailView(APIView):
    """Send an email via Gmail API."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ComposeEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        service = _get_gmail_service(request.user)
        if not service:
            return Response(
                {'detail': 'Gmail not connected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        msg = MIMEMultipart('alternative') if data.get('is_html') else MIMEText(data['body'])
        msg['to'] = ', '.join(data['to'])
        msg['cc'] = ', '.join(data.get('cc', []))
        msg['subject'] = data['subject']
        if data.get('is_html'):
            msg.attach(MIMEText(data['body'], 'html'))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        body_payload = {'raw': raw}
        if data.get('thread_id'):
            body_payload['threadId'] = data['thread_id']

        try:
            result = service.users().messages().send(userId='me', body=body_payload).execute()
            return Response({'message_id': result.get('id'), 'thread_id': result.get('threadId')})
        except Exception as exc:
            logger.error('Gmail send error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)


class MarkReadView(APIView):
    """Mark a message as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        msg = GmailMessage.objects(
            id=pk, owner_user_id=str(request.user.id)
        ).first()
        if not msg:
            raise NotFound('Message not found.')
        GmailMessage.objects(id=pk).update_one(set__is_read=True)
        return Response({'detail': 'Marked as read.'})
