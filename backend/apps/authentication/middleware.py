"""
AuditLogMiddleware — logs every request/response pair to MongoDB.
Runs after authentication so we can capture the user identity.
"""
import time
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Methods we want to capture the request body for
_BODY_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
# Paths we never log bodies for (passwords, tokens, …)
_REDACT_PATHS = {'/api/auth/login', '/api/auth/register', '/api/auth/refresh'}
_MAX_BODY_LEN = 4096   # chars


def _get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _safe_body(request) -> str | None:
    """Return the request body as a (possibly truncated) string, or None."""
    if request.method not in _BODY_METHODS:
        return None
    path = request.path.rstrip('/')
    if any(path.startswith(p) for p in _REDACT_PATHS):
        return '[REDACTED]'
    try:
        raw = request.body
        if not raw:
            return None
        text = raw.decode('utf-8', errors='replace')
        if len(text) > _MAX_BODY_LEN:
            text = text[:_MAX_BODY_LEN] + '…[truncated]'
        return text
    except Exception:
        return None


class AuditLogMiddleware:
    """
    WSGI / ASGI compatible middleware.
    Persists an AuditLog document for every request that hits a mutating
    endpoint.  Read-only (GET/HEAD/OPTIONS) requests are skipped to keep
    the collection lean.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        # Only persist mutating calls and specific paths of interest
        if request.method in _BODY_METHODS or request.path.startswith('/api/auth'):
            self._persist(request, response, duration_ms)

        return response

    def _persist(self, request, response, duration_ms: float):
        try:
            # Import here to avoid circular imports at module load time
            from apps.authentication.models import AuditLog

            user = getattr(request, 'user', None)
            user_id = None
            user_email = None
            if user and getattr(user, 'is_authenticated', False):
                user_id = str(getattr(user, 'id', ''))
                user_email = getattr(user, 'email', None)

            AuditLog(
                user_id=user_id,
                user_email=user_email,
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                ip_address=_get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:512],
                request_body=_safe_body(request),
                duration_ms=round(duration_ms, 2),
                timestamp=datetime.utcnow(),
            ).save()
        except Exception as exc:
            # Never let audit logging crash the real request
            logger.warning('AuditLogMiddleware: failed to persist log — %s', exc)
