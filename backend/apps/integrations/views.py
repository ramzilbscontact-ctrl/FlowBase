"""
Integrations views — Google OAuth2 connect/callback/disconnect,
integration config CRUD, status overview.
"""
import secrets
import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.exceptions import NotFound

from apps.integrations.models import GoogleToken, IntegrationConfig, OAuthState
from apps.integrations.serializers import GoogleTokenSerializer, IntegrationConfigSerializer

logger = logging.getLogger(__name__)

GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]


# ─── Google OAuth2 ────────────────────────────────────────────────────────────

class GoogleConnectView(APIView):
    """Initiate the Google OAuth2 flow."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from google_auth_oauthlib.flow import Flow

        state = secrets.token_urlsafe(32)
        OAuthState(
            state=state,
            user_id=str(request.user.id),
            integration_type='google',
        ).save()

        flow = Flow.from_client_config(
            {
                'web': {
                    'client_id': settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                    'redirect_uris': [settings.GOOGLE_REDIRECT_URI],
                }
            },
            scopes=GOOGLE_SCOPES,
        )
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI

        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=state,
        )
        return Response({'auth_url': auth_url})


class GoogleCallbackView(APIView):
    """Handle the OAuth2 callback — exchange code for tokens."""
    permission_classes = [AllowAny]

    def get(self, request):
        from google_auth_oauthlib.flow import Flow
        from googleapiclient.discovery import build

        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')

        if error:
            logger.warning('Google OAuth error: %s', error)
            return Response({'detail': f'OAuth error: {error}'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate state
        state_doc = OAuthState.objects(state=state).first()
        if not state_doc:
            return Response({'detail': 'Invalid or expired OAuth state.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = state_doc.user_id
        state_doc.delete()   # one-time use

        try:
            flow = Flow.from_client_config(
                {
                    'web': {
                        'client_id': settings.GOOGLE_CLIENT_ID,
                        'client_secret': settings.GOOGLE_CLIENT_SECRET,
                        'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                        'token_uri': 'https://oauth2.googleapis.com/token',
                        'redirect_uris': [settings.GOOGLE_REDIRECT_URI],
                    }
                },
                scopes=GOOGLE_SCOPES,
                state=state,
            )
            flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
            flow.fetch_token(code=code)
            credentials = flow.credentials

            # Get user info
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()

            # Calculate expiry
            expires_at = datetime.utcnow() + timedelta(seconds=3600)

            # Upsert GoogleToken
            GoogleToken.objects(user_id=user_id).update_one(
                set__google_user_id=user_info.get('id'),
                set__google_email=user_info.get('email'),
                set__access_token=credentials.token,
                set__refresh_token=credentials.refresh_token or '',
                set__scopes=list(credentials.scopes or GOOGLE_SCOPES),
                set__expires_at=expires_at,
                set__is_valid=True,
                set__updated_at=datetime.utcnow(),
                upsert=True,
            )

            logger.info('Google token stored for user %s (%s)', user_id, user_info.get('email'))
            # Redirect to frontend
            frontend_url = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else 'http://localhost:7474'
            return redirect(f'{frontend_url}/settings/integrations?google=connected')

        except Exception as exc:
            logger.error('Google OAuth callback error: %s', exc)
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GoogleDisconnectView(APIView):
    """Remove stored Google tokens for the current user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        deleted = GoogleToken.objects(user_id=str(request.user.id)).delete()
        if deleted:
            return Response({'detail': 'Google account disconnected.'})
        return Response({'detail': 'No Google account was connected.'})


class GoogleTokenStatusView(APIView):
    """Check the current user's Google OAuth status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        token = GoogleToken.objects(user_id=str(request.user.id)).first()
        if not token:
            return Response({'connected': False})
        return Response({
            'connected': True,
            'token': GoogleTokenSerializer(token).data,
        })


# ─── Integration Config CRUD ──────────────────────────────────────────────────

class IntegrationConfigListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        configs = IntegrationConfig.objects.all()
        return Response(IntegrationConfigSerializer(configs, many=True).data)

    def post(self, request):
        s = IntegrationConfigSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        validated = s.validated_data
        validated['created_by_id'] = str(request.user.id)
        config = s.create(validated)
        return Response(IntegrationConfigSerializer(config).data, status=status.HTTP_201_CREATED)


class IntegrationConfigDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        obj = IntegrationConfig.objects(id=pk).first()
        if not obj:
            raise NotFound('Integration config not found.')
        return obj

    def get(self, request, pk):
        return Response(IntegrationConfigSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        s = IntegrationConfigSerializer(obj, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        return Response(IntegrationConfigSerializer(s.update(obj, s.validated_data)).data)

    def delete(self, request, pk):
        self._get(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IntegrationStatusOverviewView(APIView):
    """Return the connection status of all known integrations."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)

        google_token = GoogleToken.objects(user_id=user_id).first()
        google_status = 'connected' if google_token and google_token.is_valid else 'disconnected'

        configs = IntegrationConfig.objects.all()
        config_statuses = {}
        for c in configs:
            config_statuses[c.integration_type] = {
                'status': c.int_status,
                'last_sync': c.last_sync_at.isoformat() if c.last_sync_at else None,
            }

        return Response({
            'google': {
                'status': google_status,
                'email': google_token.google_email if google_token else None,
            },
            'integrations': config_statuses,
        })
