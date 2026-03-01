"""
Authentication models — MongoEngine Documents.
No Django ORM, all data lives in MongoDB.
"""
import mongoengine as me
from datetime import datetime
import pyotp


ROLE_CHOICES = ('admin', 'manager', 'sales', 'accountant', 'hr', 'viewer')


class User(me.Document):
    """
    Custom user model stored in MongoDB.
    Replaces django.contrib.auth entirely.
    """
    email = me.EmailField(required=True, unique=True)
    password = me.StringField(required=True)          # bcrypt hash
    first_name = me.StringField(max_length=100, default='')
    last_name = me.StringField(max_length=100, default='')
    role = me.StringField(choices=ROLE_CHOICES, default='viewer')
    is_active = me.BooleanField(default=True)
    is_staff = me.BooleanField(default=False)         # Django admin compat shim
    date_joined = me.DateTimeField(default=datetime.utcnow)
    last_login = me.DateTimeField(null=True)

    # 2FA
    totp_secret = me.StringField(null=True)           # base32 secret for TOTP
    totp_enabled = me.BooleanField(default=False)

    # Soft-delete / lockout
    failed_login_attempts = me.IntField(default=0)
    locked_until = me.DateTimeField(null=True)

    # Audit
    created_at = me.DateTimeField(default=datetime.utcnow)
    updated_at = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'users',
        'ordering': ['-created_at'],
        'indexes': ['email', 'role'],
    }

    # ── property shims expected by DRF / simplejwt internals ──────────
    @property
    def pk(self):
        return str(self.id)

    @property
    def is_authenticated(self):
        return self.is_active

    @property
    def is_anonymous(self):
        return False

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name

    # ── TOTP helpers ──────────────────────────────────────────────────
    def generate_totp_secret(self):
        self.totp_secret = pyotp.random_base32()
        return self.totp_secret

    def get_totp_uri(self):
        return pyotp.totp.TOTP(self.totp_secret).provisioning_uri(
            name=self.email,
            issuer_name='Radiance ERP',
        )

    def verify_totp(self, code: str) -> bool:
        if not self.totp_secret:
            return False
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(code, valid_window=1)

    def __str__(self):
        return self.email


class AuditLog(me.Document):
    """Records every mutating API call for compliance / debugging."""
    user_id = me.StringField(null=True)
    user_email = me.StringField(null=True)
    method = me.StringField(max_length=10)
    path = me.StringField(max_length=500)
    status_code = me.IntField(null=True)
    ip_address = me.StringField(max_length=50, null=True)
    user_agent = me.StringField(null=True)
    request_body = me.StringField(null=True)     # truncated if large
    duration_ms = me.FloatField(null=True)
    timestamp = me.DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'audit_logs',
        'ordering': ['-timestamp'],
        'indexes': ['user_id', 'path', 'timestamp'],
    }
