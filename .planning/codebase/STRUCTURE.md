# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
radiance_crm/ERP/
├── .claude/                              # Claude Code memory
├── .github/                              # GitHub Actions workflows
├── .planning/                            # GSD planning documents
├── assets/                               # Shared images/media
├── backend/                              # Django REST API
│   ├── apps/                             # Feature-based Django apps
│   │   ├── authentication/               # Auth, login, JWT, User model
│   │   ├── crm/                          # Contacts, Companies, Deals, Tasks
│   │   ├── facturation/                  # Invoices, Quotes, Payments
│   │   ├── comptabilite/                 # Accounting, Journal, Reports
│   │   ├── rh_paie/                      # HR, Employees, Payroll
│   │   ├── calendar_app/                 # Calendar events
│   │   ├── whatsapp/                     # WhatsApp integration
│   │   ├── gmail_app/                    # Gmail integration
│   │   ├── instagram/                    # Instagram integration
│   │   ├── analytics/                    # Analytics, dashboards
│   │   ├── workflows/                    # Workflow engine
│   │   └── integrations/                 # Third-party integrations
│   ├── config/                           # Django settings, ASGI, URL routing
│   │   ├── settings/
│   │   │   ├── base.py                   # Base settings (MongoEngine, JWT, CORS)
│   │   │   ├── development.py            # Dev-specific overrides
│   │   │   └── production.py             # Production-specific (Render)
│   │   ├── asgi.py                       # ASGI app (Channels, WebSocket routing)
│   │   └── urls.py                       # Root URL dispatcher
│   ├── scripts/                          # Standalone scripts (user management)
│   ├── manage.py                         # Django CLI
│   ├── requirements.txt                  # Python dependencies
│   ├── runtime.txt                       # Python version
│   ├── render.yaml                       # Render.com deployment config
│   ├── start.sh                          # Production startup script
│   └── Procfile                          # Heroku-style process definition
├── frontend/                             # React + Vite SPA
│   ├── src/
│   │   ├── pages/                        # Page components (route-level)
│   │   │   ├── auth/                     # Login page
│   │   │   ├── crm/                      # Contacts, Companies, Deals, Tasks
│   │   │   ├── facturation/              # Invoices, Quotes, Payments
│   │   │   ├── compta/                   # Accounting pages
│   │   │   ├── rh/                       # HR pages
│   │   │   └── integrations/             # Integration page
│   │   ├── components/
│   │   │   ├── layout/                   # AppLayout, Sidebar, Topbar
│   │   │   └── shared/                   # DataTable, Modal, StatsCard
│   │   ├── api/                          # HTTP client layer
│   │   │   ├── axios.js                  # Axios instance with interceptors
│   │   │   ├── auth.js                   # Auth API module
│   │   │   ├── crm.js                    # CRM API functions
│   │   │   ├── facturation.js            # Billing API functions
│   │   │   └── ...                       # Other domain APIs
│   │   ├── store/                        # Zustand state management
│   │   │   └── authStore.js              # Auth state (tokens, user)
│   │   ├── router/                       # React Router config
│   │   │   └── index.jsx                 # Route definitions, PrivateRoute
│   │   ├── assets/                       # Static images, icons
│   │   ├── App.jsx                       # Root component (ErrorBoundary, providers)
│   │   ├── main.jsx                      # Entry point
│   │   └── index.css                     # Global styles
│   ├── public/                           # Static HTML template
│   ├── vite.config.js                    # Vite build config
│   ├── package.json                      # npm dependencies
│   ├── .env                              # Frontend env vars (VITE_API_URL, etc.)
│   └── .env.example                      # Env template
├── firebase.json                         # Firebase Hosting config
├── .firebaserc                           # Firebase project ID
├── .gitignore                            # Git ignore rules
└── README.md                             # Project documentation
```

## Directory Purposes

**Backend Core:**
- `backend/apps/` — Modular Django apps, each encapsulating a business domain
- `backend/config/` — Django project-level settings, routing, ASGI configuration
- `backend/scripts/` — Utility scripts (e.g., `manage_users.py` for user creation outside Django CLI)

**Frontend Core:**
- `frontend/src/pages/` — Page-level components, one per route, organized by domain
- `frontend/src/components/` — Shared UI components (layout, data display, dialogs)
- `frontend/src/api/` — HTTP communication layer; each module wraps domain-specific API endpoints
- `frontend/src/store/` — Global state management (currently auth only)
- `frontend/src/router/` — React Router configuration with route guards

## Key File Locations

**Entry Points:**

- **Frontend:** `frontend/src/main.jsx` — Mounts React app to DOM, initializes providers
- **Frontend Root Component:** `frontend/src/App.jsx` — ErrorBoundary, QueryClientProvider, RouterProvider
- **Frontend Router:** `frontend/src/router/index.jsx` — All route definitions, PrivateRoute wrapper
- **Backend ASGI:** `backend/config/asgi.py` — Server entry point, WebSocket + HTTP protocol routing
- **Backend URL Router:** `backend/config/urls.py` — Top-level URL dispatcher to app-specific routers

**Configuration:**

- **Frontend:**
  - `frontend/vite.config.js` — Vite build, plugins
  - `frontend/package.json` — npm dependencies, dev/build scripts
  - `frontend/.env` — Runtime env vars (VITE_API_URL, VITE_GOOGLE_CLIENT_ID)
- **Backend:**
  - `backend/config/settings/base.py` — MongoDB connection, JWT config, CORS, installed apps
  - `backend/config/settings/production.py` — Production overrides (Render)
  - `backend/requirements.txt` — Python dependencies (Django, DRF, MongoEngine, etc.)
  - `backend/runtime.txt` — Python version (3.11)
  - `backend/render.yaml` — Render deployment (2 services: API + frontend)

**Core Logic:**

- **Authentication:** `backend/apps/authentication/`
  - `models.py` — User document with bcrypt hash, TOTP, roles
  - `views.py` — LoginView, RegisterView, TokenRefreshView, GoogleAuthView
  - `serializers.py` — Login/Register validation, bcrypt helpers
  - `backends.py` — MongoJWTAuthentication (validates Bearer token, fetches User)
  - `urls.py` — Auth endpoints (/api/auth/login/, /api/auth/google/, etc.)

- **CRM:** `backend/apps/crm/`
  - `models.py` — Contact, Company, Deal, Pipeline, Task, Note documents
  - `views.py` — CRUD views for each model (ContactListCreateView, DealDetailView, etc.)
  - `serializers.py` — Request/response validation
  - `urls.py` — CRM endpoints
  - `search_urls.py` — GlobalSearchView

- **Facturation:** `backend/apps/facturation/`
  - `models.py` — Invoice, Quote, Payment documents
  - `views.py` — Invoice/Quote/Payment CRUD + Stripe integration
  - `urls.py` — Billing endpoints
  - `serializers.py` — Invoice/Payment validation

- **Frontend Auth:** `frontend/src/pages/auth/Login.jsx`
  - Handles email/password input, POST to /api/auth/login/, stores tokens in Zustand

- **Frontend CRM Pages:** `frontend/src/pages/crm/`
  - `Contacts.jsx`, `Companies.jsx`, `Deals.jsx`, `Tasks.jsx` — Render data tables, modal forms

**Testing:**

- Not detected in current codebase (no test files found)

## Naming Conventions

**Files:**

- **Backend Python:**
  - `models.py` — MongoEngine Document classes
  - `views.py` — APIView subclasses
  - `serializers.py` — DRF Serializer classes
  - `urls.py` — URL patterns for app
  - `management/commands/*.py` — Django management commands
  - Snake_case for filenames: `search_urls.py`, `manage_users.py`

- **Frontend JavaScript:**
  - `*.jsx` for React components (pages, components)
  - `*.js` for non-component modules (api, store, router)
  - PascalCase for component files: `App.jsx`, `Login.jsx`, `Contacts.jsx`
  - camelCase for module files: `axios.js`, `authStore.js`, `crm.js`

**Directories:**

- **Backend:**
  - App names: snake_case (`authentication`, `crm`, `facturation`, `rh_paie`, `calendar_app`, `gmail_app`)
  - Config: `config/` (Django project root), `config/settings/` (environment-specific)

- **Frontend:**
  - Feature folders: snake_case (`pages/`, `components/`, `api/`, `store/`, `router/`, `assets/`)
  - Nested by feature: `pages/crm/`, `pages/facturation/`, `components/layout/`, `components/shared/`

## Where to Add New Code

**New Feature (e.g., custom reporting):**
- **Backend code:** Create new app `backend/apps/reports/` with:
  - `models.py` — Report document schema
  - `views.py` — ReportListCreateView, ReportDetailView (using APIView pattern)
  - `serializers.py` — ReportSerializer for validation
  - `urls.py` — API endpoints pattern: `path('reports/', ReportListCreateView.as_view())`
  - Register app in `backend/config/settings/base.py` INSTALLED_APPS
  - Add URL include in `backend/config/urls.py` under `/api/reports/`
- **Frontend code:** Create `frontend/src/pages/reports/Reports.jsx` with:
  - Import DataTable, api functions from `frontend/src/api/reports.js`
  - Add route in `frontend/src/router/index.jsx`: `{ path: 'reports', element: wrap(<Reports />) }`
- **Tests:** Create `backend/apps/reports/tests.py` (if adding tests later)

**New Component:**
- **Frontend:**
  - Shared component (reusable): `frontend/src/components/shared/NewComponent.jsx`
  - Page-specific component: `frontend/src/pages/crm/components/ContactForm.jsx`
  - Import in parent, pass props

**Utilities:**
- **Backend:** Add to `backend/apps/{domain}/` or create `backend/common/utils.py` for cross-app helpers
- **Frontend:** Add to `frontend/src/api/` (API functions) or `frontend/src/utils/` (if created) for shared helpers

## Special Directories

**`backend/scripts/`:**
- Purpose: Standalone Python scripts outside Django CLI
- Generated: No
- Committed: Yes
- Example: `manage_users.py` — script for bulk user creation using pymongo + bcrypt directly

**`backend/config/settings/`:**
- Purpose: Environment-specific Django settings
- Generated: No
- Committed: Yes (base.py, development.py, production.py checked in)
- Usage: `DJANGO_SETTINGS_MODULE` env var controls which one loads

**`frontend/.env`:**
- Purpose: Runtime config (API URL, Google OAuth client ID)
- Generated: No (created manually, `.env.example` shows template)
- Committed: No (`.env` in `.gitignore`, but `.env.example` is committed)
- Secrets: No secrets in `.env` — only public URLs/IDs

**`backend/.env`:**
- Purpose: Dev-only; production uses Render env vars
- Generated: No
- Committed: No (in `.gitignore`)
- Secrets: Contains MONGO_URI, SECRET_KEY, etc. — managed in Render dashboard

**`frontend/public/`:**
- Purpose: Static assets (index.html, favicon)
- Generated: No
- Committed: Yes

**`frontend/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (npm install)
- Committed: No

**`backend/venv/` or similar:**
- Purpose: Python virtual environment
- Generated: Yes (python -m venv venv)
- Committed: No

---

*Structure analysis: 2026-03-04*
