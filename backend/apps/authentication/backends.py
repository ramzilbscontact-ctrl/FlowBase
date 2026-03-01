"""
MongoJWTAuthentication — custom DRF authentication backend.
Validates a Bearer JWT and returns the MongoEngine User document.
"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class MongoJWTAuthentication(BaseAuthentication):
    """
    Reads a Bearer token from the Authorization header, validates it with
    simplejwt, then fetches the corresponding User from MongoDB.

    Returns (user, token_string) on success, None if no auth header present.
    Raises AuthenticationFailed on invalid / expired tokens.
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        raw_token = auth_header[len('Bearer '):]
        try:
            validated = UntypedToken(raw_token)
        except (InvalidToken, TokenError) as exc:
            raise AuthenticationFailed(str(exc))

        user_id = str(validated.get('user_id', ''))
        if not user_id:
            raise AuthenticationFailed('Token is missing user_id claim.')

        # Lazy import to prevent circular dependency at module load
        from apps.authentication.models import User

        user = User.objects(id=user_id, is_active=True).first()
        if not user:
            raise AuthenticationFailed('User not found or inactive.')

        return (user, raw_token)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
