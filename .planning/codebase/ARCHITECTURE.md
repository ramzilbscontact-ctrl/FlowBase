# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Full-stack monorepo with independently deployable frontend (React/Vite) and backend (Django REST) separated by API boundary. No ORM — MongoDB via MongoEngine.

**Key Characteristics:**
- Client-server architecture with React Single Page Application (SPA) frontend
- RESTful API backend using Django REST Framework (DRF) with APIView classes
- MongoDB document store (no SQL, no Django ORM) — managed via MongoEngine
- Custom JWT authentication (simplejwt) with bcrypt password hashing
- WebSocket support for real-time features (WhatsApp, Analytics) via Django Channels
- Feature-based app organization on backend (crm, facturation, comptabilite, rh_paie, etc.)
- Zustand for client-side state management (auth store with localStorage persistence)

## Layers

**Frontend Presentation Layer:**
- Purpose: Render UI components, manage page navigation, handle user interactions
- Location: `frontend/src/pages/`, `frontend/src/components/`
- Contains: React pages (Contacts.jsx, Invoices.jsx, etc.), layout components (AppLayout.jsx, Sidebar.jsx), shared components (DataTable.jsx, Modal.jsx, StatsCard.jsx)
- Depends on: Router, API client, Zustand store
- Used by: Browser/client

**Frontend API Client Layer:**
- Purpose: HTTP communication with backend, JWT injection, 401 interception
- Location: `frontend/src/api/`
- Contains: Axios instance (`axios.js`) with interceptors, domain-specific API modules (`crm.js`, `facturation.js`, `comptabilite.js`, etc.)
- Depends on: Zustand authStore for token injection
- Used by: Pages and components

**Frontend State Management:**
- Purpose: Persist auth tokens/user across sessions, enable logout/reauthentication
- Location: `frontend/src/store/authStore.js`
- Contains: Zustand store with `token`, `refresh`, `user` state and methods `setTokens()`, `setUser()`, `logout()`
- Depends on: localStorage via zustand/middleware
- Used by: API client interceptors, router guards, page components

**Frontend Routing:**
- Purpose: Define public/private routes, lazy-load pages, enforce authentication
- Location: `frontend/src/router/index.jsx`
- Contains: React Router configuration with `PrivateRoute` wrapper, lazy-loaded page imports with Suspense boundaries
- Depends on: useAuthStore for token checks
- Used by: App.jsx root component

**Backend API Layer:**
- Purpose: Handle HTTP requests, validate input, enforce authentication/authorization
- Location: `backend/apps/*/views.py` (e.g., `backend/apps/crm/views.py`, `backend/apps/facturation/views.py`)
- Contains: APIView subclasses with GET/POST/PUT/DELETE methods, permission checks, request/response handling
- Depends on: Serializers, Models, MongoJWTAuthentication
- Used by: Django URL routing

**Backend Serialization Layer:**
- Purpose: Validate request data, transform MongoEngine documents to JSON
- Location: `backend/apps/*/serializers.py`
- Contains: DRF Serializer classes for each model (ContactSerializer, InvoiceSerializer, etc.)
- Depends on: MongoEngine models
- Used by: Views for validation and response formatting

**Backend Data Layer:**
- Purpose: Define document schemas, manage queries, enforce constraints
- Location: `backend/apps/*/models.py`
- Contains: MongoEngine Document classes (Contact, Company, Invoice, etc.) with fields, indexes, custom methods
- Depends on: MongoEngine connection (MongoDB Atlas)
- Used by: Views, serializers, business logic

**Backend Authentication Layer:**
- Purpose: Validate tokens, authenticate users, manage JWT lifecycle
- Location: `backend/apps/authentication/`
- Contains: Custom MongoJWTAuthentication backend (`backends.py`), User model (`models.py`), login/register/refresh views (`views.py`), bcrypt helpers (`serializers.py`)
- Depends on: simplejwt, MongoEngine User model, bcrypt, Redis (for token blacklist)
- Used by: All authenticated views via `permission_classes = [IsAuthenticated]`

**Backend Real-time Layer:**
- Purpose: Handle WebSocket connections, broadcast updates
- Location: `backend/config/asgi.py`, `backend/apps/whatsapp/routing.py`, `backend/apps/analytics/routing.py`
- Contains: ASGI application configuration, websocket URL patterns, consumer classes
- Depends on: Django Channels, Redis channel layer
- Used by: Frontend WebSocket clients

## Data Flow

**Login Flow:**

1. User submits email + password in frontend Login component
2. Frontend POST `/api/auth/login/` with axios, no auth header yet
3. Backend LoginView receives request, validates email/password via LoginSerializer
4. LoginSerializer calls bcrypt `check_password()` against stored hash in User document
5. On success, backend generates JWT pair (access + refresh) with RefreshToken(), embedding user_id, email, role as custom claims
6. Backend returns `{ user: { id, email, role, ... }, tokens: { access, refresh } }`
7. Frontend receives tokens, calls `useAuthStore.setTokens(access, refresh)` → persisted to localStorage
8. Router navigates to dashboard

**Authenticated Request Flow:**

1. Frontend component calls `api.get('/api/crm/contacts/')` via axios
2. Axios interceptor reads token from Zustand store: `const token = useAuthStore.getState().token`
3. Interceptor injects `Authorization: Bearer {token}` header
4. Backend receives request, MongoJWTAuthentication backend validates token via simplejwt.UntypedToken()
5. Backend extracts `user_id` claim, looks up User document in MongoDB by ObjectId
6. If user exists and is_active, returns (user, token) tuple; DRF assigns to request.user
7. View checks `@permission_classes = [IsAuthenticated]` — passes because token was valid
8. View fetches Contact documents, serializes, returns paginated response
9. Frontend receives JSON, renders in DataTable component

**Logout Flow:**

1. User clicks logout button
2. Frontend sends POST `/api/auth/logout/` with refresh token in body
3. Backend LogoutView receives request, extracts refresh token, calls `blacklist_token(refresh)` → Redis entry with TTL
4. Frontend calls `useAuthStore.logout()` → clears token, refresh, user from Zustand + localStorage
5. Router PrivateRoute checks `const token = useAuthStore(s => s.token)` — null, navigates to /login

**State Management:**

- Auth tokens stored in Zustand with localStorage persistence (`erpro-auth` key)
- React Query manages API cache with default staleTime=30s, refetchOnWindowFocus=false
- UI state (modals, form inputs) managed locally in component state or inline with hooks

## Key Abstractions

**User (Authentication):**
- Purpose: Represents logged-in user, holds credentials, roles, 2FA settings
- Examples: `backend/apps/authentication/models.py` (MongoEngine User document), `backend/apps/authentication/serializers.py` (UserSerializer)
- Pattern: MongoEngine Document with custom properties (`pk`, `is_authenticated`, `get_full_name()`, TOTP methods) matching Django User interface expectations

**Contact/Company/Deal (CRM):**
- Purpose: Core ERP entities — companies, contacts, deals, tasks, notes
- Examples: `backend/apps/crm/models.py` (Contact, Company, Deal, Pipeline, Task, Note), `backend/apps/crm/serializers.py`, `backend/apps/crm/views.py`
- Pattern: MongoEngine Documents with denormalized fields (e.g., Contact.company_name for quick lookup), owner_id references, timestamps (created_at, updated_at)

**Invoice/Quote/Payment (Facturation):**
- Purpose: Billing entities — invoices, quotes, payments with Stripe integration
- Examples: `backend/apps/facturation/models.py`, `backend/apps/facturation/views.py` (InvoiceListCreateView, PaymentListView)
- Pattern: APIView + Serializer + MongoEngine Document triplet, with external service integration (Stripe)

**Global Search:**
- Purpose: Full-text search across all CRM entities (contacts, companies, deals)
- Examples: `backend/apps/crm/search_urls.py` (GlobalSearchView), uses MongoEngine `__or` syntax for multi-field queries
- Pattern: Aggregates Contact/Company/Deal queries with `me__or` filter syntax

**Token (JWT):**
- Purpose: Stateless authentication with claims-based authorization
- Pattern: simplejwt.RefreshToken with custom claims (user_id, email, role) — access token (15min), refresh token (7 days)

**Serializer Pattern:**
- Purpose: Validate incoming JSON, transform MongoEngine docs to outgoing JSON
- Examples: `backend/apps/*/serializers.py` across all apps
- Pattern: DRF Serializer subclass with `validated_data`, `.save()` creates/updates MongoEngine document, `.to_representation()` formats output

**APIView Pattern:**
- Purpose: Handle HTTP methods without forcing queryset/filter/search patterns
- Examples: All view classes in `backend/apps/*/views.py`
- Pattern: Subclass APIView, implement `get()`, `post()`, `put()`, `delete()` methods, check `request.user` for ownership/role-based logic

## Entry Points

**Frontend:**
- Location: `frontend/src/main.jsx`
- Triggers: Browser navigates to deployed URL
- Responsibilities: Renders root React app with Suspense/ErrorBoundary, initializes Router and QueryClient providers

**Frontend App Component:**
- Location: `frontend/src/App.jsx`
- Triggers: Called by main.jsx
- Responsibilities: Sets up ErrorBoundary, QueryClientProvider, RouterProvider; catches render errors

**Frontend Router:**
- Location: `frontend/src/router/index.jsx`
- Triggers: RouterProvider in App.jsx
- Responsibilities: Defines public (/login) and private routes, lazy-loads pages, enforces PrivateRoute guards

**Backend ASGI:**
- Location: `backend/config/asgi.py`
- Triggers: Render/production server starts (e.g., Gunicorn/Uvicorn)
- Responsibilities: Sets up Django ASGI app, configures WebSocket routing (Channels), mounts HTTP and WebSocket protocols

**Backend URL Router:**
- Location: `backend/config/urls.py`
- Triggers: ASGI app receives HTTP request
- Responsibilities: Routes `/api/auth/`, `/api/crm/`, `/api/facturation/`, etc. to respective app URL configs; health check at `/api/health/`

**Backend App URL Configs:**
- Location: `backend/apps/*/urls.py` (e.g., `backend/apps/authentication/urls.py`, `backend/apps/crm/urls.py`)
- Triggers: Root URL router matches request path to app prefix
- Responsibilities: Route specific endpoints (e.g., `/api/auth/login/` → LoginView) to view classes

## Error Handling

**Strategy:** Explicit exception raising in views/serializers; DRF handles HTTP response conversion.

**Patterns:**
- **Serializer validation:** `serializer.is_valid(raise_exception=True)` raises ValidationError → 400 Bad Request
- **Authentication failures:** MongoJWTAuthentication raises AuthenticationFailed → 401 Unauthorized
- **Resource not found:** Views raise NotFound() from `rest_framework.exceptions` → 404 Not Found
- **Permission denied:** `@permission_classes = [IsAuthenticated]` raises PermissionDenied → 403 Forbidden
- **Frontend 401 interception:** Axios response interceptor catches 401, clears auth store, redirects to /login
- **Error boundary:** React ErrorBoundary in App.jsx catches render errors, displays stack trace in red box

## Cross-Cutting Concerns

**Logging:**
- Backend: Custom AuditLogMiddleware in `backend/apps/authentication/middleware.py` logs user actions
- Frontend: console logs only (no centralized logging)

**Validation:**
- Backend: DRF Serializers with field validators (EmailField, URLField, max_length, required)
- Frontend: Form components with client-side validation before submit
- Approach: Server-side validation is authoritative; client-side for UX

**Authentication:**
- Backend: Custom MongoJWTAuthentication with simplejwt tokens, bcrypt password hashing
- Frontend: Zustand store persists tokens, axios interceptor injects Bearer header
- Approach: Tokens embedded with user claims (user_id, email, role) for stateless auth

**Authorization (Role-based Access Control):**
- Backend: Token claims embedded with `role` field; views can check `request.user.role in ['admin', 'manager']`
- Frontend: No role-based route guards visible yet (all authenticated routes are private)
- Approach: Backend enforces; frontend could filter UI based on role from store

**Pagination:**
- Backend: Manual pagination in views using `skip()` and `limit()` on QuerySet, returns count/page/page_size metadata
- Frontend: No client-side pagination library detected; relies on backend limit/offset

**Real-time:**
- Backend: Django Channels with WebSocket support; Redis channel layer for broadcasting
- Frontend: WebSocket connections established but no explicit client implementation visible
- Approach: ASGI app routes WebSocket connections to app-specific consumers (WhatsApp, Analytics)

---

*Architecture analysis: 2026-03-04*
