# Technology Stack

**Analysis Date:** 2025-03-04

## Languages

**Primary:**
- JavaScript ES2020+ - Frontend (React, Vite)
- Python 3.10.0 - Backend (Django, DRF)

**Secondary:**
- JSX - React component markup
- HTML5 / CSS3 - UI templates

## Runtime

**Environment:**
- Node.js 20.x (implied by package.json, used in Vercel/build systems)
- Python 3.10.0 (specified in `backend/runtime.txt`)

**Package Manager:**
- npm (JavaScript) - Lockfile: `package-lock.json` present
- pip (Python) - Requirements file: `backend/requirements.txt`

## Frameworks

**Core:**
- React 19.2.0 - Frontend UI library
- Django 5.2.11 - Backend web framework
- Django REST Framework (DRF) 3.16.1 - REST API layer
- MongoEngine 0.29.1 - MongoDB document mapper (replaces Django ORM entirely)

**Frontend Build/Dev:**
- Vite 5.4.21 - Build tool and dev server
- @vitejs/plugin-react 4.7.0 - React Fast Refresh plugin

**Backend API & Async:**
- Daphne 4.2.1 - ASGI server (HTTP + WebSocket support)
- Channels 4.3.2 - WebSocket protocol support
- Channels-redis 4.3.0 - Redis channel layer for WebSockets
- Celery 5.6.2 - Distributed task queue
- Redis 7.2.1 - Task broker and result backend

**Testing & Linting:**
- ESLint 9.39.1 - JavaScript linting
- @eslint/js 9.39.1 - ESLint core rules
- eslint-plugin-react-hooks 7.0.1 - React Hooks linting
- eslint-plugin-react-refresh 0.4.24 - React Fast Refresh linting

**Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.27 - Vendor prefix support

## Key Dependencies

**Critical - Frontend:**
- @tanstack/react-query 5.90.21 - Server state management and data fetching
- react-router-dom 7.13.1 - Client-side routing
- axios 1.13.6 - HTTP client for API requests
- zustand 5.0.11 - Lightweight state management (auth store)
- firebase 10.14.1 - Firebase Auth for authentication
- @react-oauth/google 0.13.4 - Google OAuth provider component
- lucide-react 0.575.0 - Icon library
- clsx 2.1.1 - Utility for conditionally building className strings

**Critical - Backend:**
- djangorestframework-simplejwt 5.5.1 - JWT authentication (access + refresh tokens)
- django-cors-headers 4.9.0 - CORS middleware for API access
- django-filter 25.2 - Query parameter filtering
- bcrypt 4.2.0 - Password hashing (custom auth without Django User model)
- gunicorn 21.2.0 - WSGI application server fallback
- whitenoise 6.7.0 - Static file serving in production

**Infrastructure:**
- pymongo 4.10.1 - MongoDB Python driver
- mongomock 4.3.0 - In-memory MongoDB for dev/testing

**External Service Integration:**
- google-auth 2.35.0 - Google authentication client
- google-auth-oauthlib 1.2.1 - Google OAuth2 flow support
- google-api-python-client 2.149.0 - Google APIs SDK (Gmail, Calendar)
- stripe 14.4.0 - Payment processing
- anthropic 0.84.0 - Claude AI API client
- requests 2.31.0 - HTTP requests for external APIs

**Auth & Security:**
- pyotp 2.9.0 - TOTP (2FA) generation and verification
- python-decouple 3.8 - Environment variable management

**Utilities:**
- pillow 10.2.0 - Image processing (avatars, attachments)
- python-dotenv 1.0.0 - .env file loading
- scikit-learn 1.7.2 - Machine learning (deal scoring, analytics)

## Configuration

**Environment:**
- Configuration via environment variables using `python-decouple`
- `.env` file support (backend only)
- Separate Django settings modules: `base.py` (shared), `production.py` (Render/Railway)

**Key Configs (env vars required):**
- Backend:
  - `DJANGO_SETTINGS_MODULE` = `config.settings.production`
  - `SECRET_KEY` - Django secret (set in Render)
  - `MONGO_URI` - MongoDB Atlas connection string
  - `MONGO_DB` - Database name (default: `erp_radiance`)
  - `REDIS_URL` - Redis connection for Celery and Channels
  - `ALLOWED_HOSTS` - Comma-separated list or `*`
  - `DEBUG` = `False` (production)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe payments
  - `ANTHROPIC_API_KEY` - Claude AI integration
  - `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` - Gmail SMTP
  - `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_APP_SECRET` - WhatsApp integration
  - `META_IG_ACCESS_TOKEN`, `META_IG_ACCOUNT_ID` - Instagram integration

- Frontend:
  - `VITE_API_URL` - Backend API base URL (default: `https://erpro-dz-api.onrender.com`)
  - `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID for frontend

**Build:**
- Frontend: `vite.config.js` (minimal, uses React plugin)
- Frontend: `eslint.config.js` (flat config format, ES2020)
- Frontend: `postcss.config.js` (Tailwind CSS)
- Backend: `Procfile` defines process types (web, worker, beat)
- Backend: `render.yaml` defines Render deployment services

## Platform Requirements

**Development:**
- Node.js 20.x
- Python 3.10.0
- MongoDB Atlas (cloud) or mongomock for testing
- Redis server (local or Docker)
- Git

**Production:**
- Deployed on Render:
  - Web dyno: `erpro-dz-api` (Daphne ASGI server)
  - Worker dyno: `erpro-dz-worker` (Celery worker)
  - Redis dyno: `erpro-dz-redis` (free tier)
- Frontend previously on Render static, now migrating to Firebase Hosting (see `.firebaserc`, `firebase.json`)
- MongoDB Atlas for production data
- Email: Gmail SMTP
- External APIs: Google, Stripe, Meta (WhatsApp/Instagram), Anthropic

---

*Stack analysis: 2025-03-04*
