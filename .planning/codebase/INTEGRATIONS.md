# External Integrations

**Analysis Date:** 2025-03-04

## APIs & External Services

**Authentication & Identity:**
- Google OAuth2 - User authentication and account linking
  - SDK: `google-auth-oauthlib`, `google-api-python-client`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Scopes: Gmail (read/send), Calendar, user profile
  - Backend endpoint: `POST /api/integrations/google/connect/`, `GET /api/integrations/google/callback/`
  - Storage: MongoDB `google_tokens` collection (MongoEngine `GoogleToken` model)
  - Implementation: `backend/apps/integrations/views.py` (GoogleConnectView, GoogleCallbackView, GoogleDisconnectView)

- Firebase Auth - Frontend authentication (JWT bridging)
  - SDK: `firebase` (v10.14.1)
  - Project: `blog-agenzia` (`.firebaserc`)
  - Used for: Google login popup on frontend (`frontend/src/pages/auth/Login.jsx`)
  - Flow: Firebase → Google popup → access token → backend POST `/api/auth/google/`

**Email:**
- Gmail SMTP - Transactional email
  - Host: `smtp.gmail.com` (port 587, TLS)
  - Auth: `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` (env vars)
  - Used in: Invoice reminders (facturation), workflow notifications
  - Config location: `backend/config/settings/base.py` (EMAIL_HOST, EMAIL_PORT, etc.)

**Payments:**
- Stripe - Payment processing and webhooks
  - SDK: `stripe` (v14.4.0)
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Endpoints: `POST /api/facturation/stripe-webhook/` (webhook handler)
  - Implementation: `backend/apps/facturation/views.py` (StripeWebhookView)
  - Used for: Invoice payments, subscription handling

**AI & Analytics:**
- Anthropic Claude - AI insights and deal scoring
  - SDK: `anthropic` (v0.84.0)
  - Auth: `ANTHROPIC_API_KEY`
  - Implementation: `backend/apps/analytics/views.py` (uses `anthropic.Anthropic` client)
  - Purpose: Deal analysis, sales forecasting
  - ML helper: `scikit-learn` (v1.7.2) for pre-processing

**Messaging & Social Media:**
- Meta (WhatsApp Business API) - WhatsApp messaging
  - Auth: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`
  - Webhook endpoint: `POST /api/whatsapp/webhook/` (likely in `backend/apps/whatsapp/`)
  - Purpose: Customer communications, notifications

- Meta (Instagram API) - Instagram direct messaging
  - Auth: `META_IG_ACCESS_TOKEN`, `META_IG_ACCOUNT_ID`
  - Purpose: Social media engagement (likely in `backend/apps/instagram/`)

**Google Workspace Integration:**
- Gmail API - Email reading/sending
  - SDK: `google-api-python-client` via OAuth2 tokens
  - Scope: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`
  - Implementation: `backend/apps/gmail_app/`
  - Used for: Syncing emails, sending via Gmail

- Google Calendar API - Calendar sync
  - Scope: `https://www.googleapis.com/auth/calendar`
  - Implementation: `backend/apps/calendar_app/`
  - Used for: Syncing meetings, scheduling

## Data Storage

**Databases:**
- MongoDB Atlas (cloud) - Primary data store
  - Connection: `MONGO_URI` env var (MongoDB SRV connection string)
  - Database: `erp_radiance` (production), `erp_radiance_test` (mongomock)
  - Collections:
    - `users` - User accounts (MongoEngine `User` model at `backend/apps/authentication/models.py`)
    - `google_tokens` - OAuth tokens (MongoEngine `GoogleToken` at `backend/apps/integrations/models.py`)
    - `oauth_states` - CSRF prevention states (MongoEngine `OAuthState`)
    - `integration_configs` - Integration settings (MongoEngine `IntegrationConfig`)
    - `audit_logs` - API audit trail (MongoEngine `AuditLog`)
    - Additional collections for CRM, HR, accounting modules (defined in respective apps)
  - Client: MongoEngine 0.29.1 (MongoDB ODM, replaces Django ORM entirely)
  - Authentication: MongoDB Atlas network access (whitelist `0.0.0.0/0` for Render dynamic IPs)

**File Storage:**
- Local filesystem - Media files (avatars, documents, reports)
  - Location: `backend/media/` (managed by Django MEDIA_ROOT/MEDIA_URL)
  - Library: Pillow for image processing
  - No S3/cloud storage currently configured

**Caching & Sessions:**
- Redis - Session storage, Celery broker, WebSocket channel layer
  - Connection: `REDIS_URL` env var (provided by Render Redis dyno)
  - Render service: `erpro-dz-redis` (free tier, LRU eviction policy)
  - Used for:
    - Celery broker: `CELERY_BROKER_URL`
    - Celery result backend: `CELERY_RESULT_BACKEND`
    - Channels layer: `CHANNEL_LAYERS.CONFIG.hosts` (WebSocket support)

## Authentication & Identity

**Custom Auth Provider:**
- Implementation: `backend/apps/authentication/`
  - No Django User model — custom MongoEngine `User` document in MongoDB
  - Password hashing: bcrypt (4.2.0) — `hash_password()`, `check_password()` in `serializers.py`
  - Login endpoint: `POST /api/auth/login/` → email + password → JWT pair
  - Google OAuth endpoint: `POST /api/auth/google/` → credential token → JWT pair
  - JWT: DRF simplejwt (5.5.1)
    - Access token: 15 minutes lifetime
    - Refresh token: 7 days lifetime
    - Rotation: enabled (refresh rotates tokens)
    - Algorithm: HS256
    - Signing key: `SECRET_KEY`
  - 2FA: TOTP support (pyotp 2.9.0) in `User` model (`totp_secret`, `totp_enabled`)
  - Account lockout: Failed login tracking (`failed_login_attempts`, `locked_until`)

**JWT Flow (Frontend):**
- Store tokens in Zustand auth store (`frontend/src/store/authStore`)
- Axios interceptor injects `Authorization: Bearer {access_token}` on all requests
- 401 response triggers logout redirect to `/login`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry/NewRelic configuration)

**Logs:**
- Console output via Python logging
- Production logging configured in `backend/config/settings/production.py`:
  - Root logger: WARNING level
  - Django logger: WARNING level
  - App logger: INFO level
  - Handler: StreamHandler to stdout (Render captures)

**Health Checks:**
- Endpoint: `GET /api/health/` (specified in `render.yaml` healthCheckPath)
- Purpose: Render auto-restart on failure

## CI/CD & Deployment

**Hosting:**
- Backend API: Render (`erpro-dz-api`) — Python web service
  - Runtime: Python 3.10.0
  - Server: Daphne (ASGI) + Gunicorn fallback
  - Start: `bash backend/start.sh`
  - Processes:
    - Web dyno: Daphne for HTTP + WebSocket
    - Worker dyno: Celery worker (concurrency=1)
    - Scheduler: Celery Beat for scheduled tasks

- Frontend: Firebase Hosting (migration in progress, previously Render static)
  - Project: `blog-agenzia`
  - Config: `firebase.json` (public: `frontend/dist`, rewrites to SPA)
  - Build: `npm run build` → Vite produces `dist/`
  - Cache headers: No-cache for HTML, 1-year immutable for assets

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or build config files found)

## Environment Configuration

**Required env vars (Backend):**
- Django: `DJANGO_SETTINGS_MODULE`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- MongoDB: `MONGO_URI`, `MONGO_DB`, `USE_MONGOMOCK`
- Redis: `REDIS_URL`
- Frontend: `FRONTEND_URL` (CORS origin)
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Anthropic: `ANTHROPIC_API_KEY`
- Email: `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`
- Meta: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_IG_ACCESS_TOKEN`, `META_IG_ACCOUNT_ID`

**Required env vars (Frontend):**
- `VITE_API_URL` - Backend API base URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID

**Secrets location:**
- Render dashboard (set per service)
- `.env` file for local development (in `.gitignore`)
- Firebase secrets: managed by Firebase CLI

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook: `POST /api/facturation/stripe-webhook/` — handles payment events
- Meta WhatsApp webhook: `POST /api/whatsapp/webhook/` — receives messages (likely)
- Google OAuth callback: `GET /api/integrations/google/callback/` — handles auth code

**Outgoing:**
- Email: SMTP to Gmail on invoice/reminder events
- Google Calendar: Syncs to Google Calendar API (read/write)
- Stripe: No outgoing webhooks (uses polling/events API)

---

*Integration audit: 2025-03-04*
