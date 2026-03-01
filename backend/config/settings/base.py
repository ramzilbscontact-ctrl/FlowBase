"""
Base Django settings for ERP Radiance.
"""
import os
from pathlib import Path
from decouple import config
import mongoengine

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-production')

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# ─── INSTALLED APPS ────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'channels',
    # ERP apps
    'apps.authentication',
    'apps.crm',
    'apps.calendar_app',
    'apps.whatsapp',
    'apps.gmail_app',
    'apps.instagram',
    'apps.facturation',
    'apps.rh_paie',
    'apps.comptabilite',
    'apps.analytics',
    'apps.workflows',
    'apps.integrations',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.authentication.middleware.AuditLogMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

# ─── ASGI / CHANNELS ──────────────────────────────────────────
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [config('REDIS_URL', default='redis://localhost:6379/0')],
        },
    },
}

# ─── DATABASE (dummy — MongoDB via MongoEngine) ───────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.dummy',
    }
}

# ─── MONGODB ──────────────────────────────────────────────────
MONGO_URI = config('MONGO_URI', default='mongodb://localhost:27017/erp_radiance')
MONGO_DB = config('MONGO_DB', default='erp_radiance')
USE_MONGOMOCK = config('USE_MONGOMOCK', default='False', cast=bool)

if USE_MONGOMOCK:
    # In-memory MongoDB for dev/test without a real MongoDB installation
    import mongomock
    mongoengine.connect(
        db='erp_radiance_test',
        alias='default',
        mongo_client_class=mongomock.MongoClient,
    )
else:
    mongoengine.connect(
        db=MONGO_DB,
        host=MONGO_URI,
        alias='default',
    )

# ─── CELERY ───────────────────────────────────────────────────
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Africa/Algiers'
CELERY_BEAT_SCHEDULE = {
    'recalculate-deal-scores-daily': {
        'task': 'apps.analytics.tasks.recalculate_deal_scores',
        'schedule': 86400,  # every 24h
    },
    'check-overdue-invoices': {
        'task': 'apps.facturation.tasks.check_overdue_invoices',
        'schedule': 3600,  # every hour
    },
}

# ─── REST FRAMEWORK ────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.authentication.backends.MongoJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ─── JWT ──────────────────────────────────────────────────────
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

# ─── CORS ─────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'FRONTEND_URL', default='http://localhost:7474'
).split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization',
    'content-type', 'dnt', 'origin', 'user-agent',
    'x-csrftoken', 'x-requested-with',
]

# ─── STATIC / MEDIA ───────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ─── LOCALISATION ─────────────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

# ─── INTEGRATIONS CONFIG ──────────────────────────────────────
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET', default='')
GOOGLE_REDIRECT_URI = config('GOOGLE_REDIRECT_URI', default='http://localhost:8000/api/integrations/google/callback/')

META_WHATSAPP_TOKEN = config('META_WHATSAPP_TOKEN', default='')
META_PHONE_NUMBER_ID = config('META_PHONE_NUMBER_ID', default='')
META_VERIFY_TOKEN = config('META_VERIFY_TOKEN', default='verify-token')
META_APP_SECRET = config('META_APP_SECRET', default='')
META_IG_ACCESS_TOKEN = config('META_IG_ACCESS_TOKEN', default='')
META_IG_ACCOUNT_ID = config('META_IG_ACCOUNT_ID', default='')

STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')

ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')

# Email
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='erp@radiance.dz')
