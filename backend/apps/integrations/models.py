"""
Integrations models — Google OAuth tokens, external integration configs.
MongoEngine Documents only.
"""
import mongoengine as me
from datetime import datetime

INTEGRATION_STATUS = ('connected', 'disconnected', 'error', 'pending')
INTEGRATION_TYPE = ('google', 'stripe', 'whatsapp', 'instagram', 'custom_webhook')


class GoogleToken(me.Document):
    """
    Stores OAuth2 tokens for a user's Google account.
    One document per ERP user (user_id unique index).
    """
    user_id = me.StringField(required=True, unique=True)  # apps.authentication.User.id
    google_user_id = me.StringField(null=True)
    google_email = me.StringField(null=True)
    access_token = me.StringField(required=True)          # encrypted in prod
    refresh_token = me.StringField(null=True)
    token_uri = me.StringField(default='https://oauth2.googleapis.com/token')
    scopes = me.ListField(me.StringField())
    expires_at = me.DateTimeField(null=True)
    is_valid = me.BooleanField(default=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'google_tokens',
        'indexes': ['user_id', 'google_email'],
    }

    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        return datetime.utcnow() >= self.expires_at

    def __str__(self):
        return f'GoogleToken({self.google_email})'


class IntegrationConfig(me.Document):
    """
    Per-organization integration configuration.
    Stores credentials, webhook URLs, and settings for each integration.
    """
    integration_type = me.StringField(choices=INTEGRATION_TYPE, required=True)
    name = me.StringField(max_length=200, null=True)
    int_status = me.StringField(choices=INTEGRATION_STATUS, default='disconnected')
    config = me.DictField()                      # integration-specific settings
    # e.g. {'phone_number_id': '...', 'verify_token': '...'}
    webhook_url = me.URLField(null=True)
    is_active = me.BooleanField(default=True)
    last_sync_at = me.DateTimeField(null=True)
    last_error = me.StringField(null=True)
    created_by_id = me.StringField(null=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'integration_configs',
        'indexes': ['integration_type', 'int_status'],
    }

    def __str__(self):
        return f'{self.integration_type} — {self.int_status}'


class OAuthState(me.Document):
    """
    Short-lived state parameter for OAuth2 flows.
    Prevents CSRF in the OAuth callback.
    """
    state = me.StringField(required=True, unique=True)
    user_id = me.StringField(required=True)
    integration_type = me.StringField(required=True)
    created_at = me.DateTimeField(default=datetime.utcnow)
    # TTL — expire after 10 minutes (requires MongoDB TTL index on created_at)

    meta = {
        'collection': 'oauth_states',
        'indexes': [
            'state',
            {'fields': ['created_at'], 'expireAfterSeconds': 600},
        ],
    }
