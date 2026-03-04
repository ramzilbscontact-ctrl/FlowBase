# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- React components: PascalCase `.jsx` (e.g., `Contacts.jsx`, `Modal.jsx`, `DataTable.jsx`)
- API modules: camelCase `.js` (e.g., `authAPI`, `crmAPI`, `axios`)
- Store modules: camelCase `.js` (e.g., `authStore.js`, `notifStore.js`)
- Django models: PascalCase `.py` classes, snake_case file names (e.g., `models.py`, `views.py`, `serializers.py`)
- Django views: PascalCase view classes (e.g., `ContactListCreateView`, `LoginView`)
- Django utilities: snake_case functions (e.g., `hash_password`, `check_password`)

**Functions:**
- Frontend: camelCase (e.g., `handleAuthSuccess`, `handleGoogleLogin`, `paginate`)
- Backend: snake_case (e.g., `get_tokens_for_user`, `_get_redis`, `blacklist_token`)

**Variables:**
- React state: camelCase (e.g., `setForm`, `setLoading`, `queryKey`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEAL_STAGES`, `TASK_STATUS`, `ROLE_CHOICES`)
- Zustand stores: use `use` prefix, PascalCase after prefix (e.g., `useAuthStore`)

**Types:**
- TypeScript not in use; backend uses type hints sparingly (e.g., `user: User`, `code: str`)
- MongoEngine field definitions use `me.FieldType` convention

## Code Style

**Formatting:**
- Frontend: ESLint with recommended config (eslint.config.js)
- No explicit Prettier config; relies on ESLint rules
- Indentation: 2 spaces (inferred from code)

**Linting:**
- Tool: ESLint 9.39.1
- Config: `frontend/eslint.config.js` - flat config format
- Rules enforced:
  - `no-unused-vars`: error, ignores pattern `^[A-Z_]` (uppercase-starting variables are typically intentional)
  - `react-hooks/rules-of-hooks`: recommended
  - `react-refresh/only-export-components`: recommended (Vite requirement)
- Backend: No explicit linter configured; follows PEP 8 conventions by convention

## Import Organization

**Frontend Order:**
1. External libraries (react, react-router, axios, zustand)
2. Custom API modules (./api/*)
3. Custom stores (./store/*)
4. Custom components (./components/*)
5. Utilities (./firebase, etc.)

Example from `Login.jsx`:
```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../../firebase'
import { authAPI } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
```

**Backend Order:**
1. Python standard library (datetime, os, sys, etc.)
2. Third-party imports (mongoengine, rest_framework, django, etc.)
3. Local app imports (apps.authentication, apps.crm, etc.)

Example from `views.py`:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.crm.models import Contact, Company
```

**Path Aliases:**
- Backend: No aliases; uses absolute imports (apps.*)
- Frontend: No alias configuration; uses relative imports (../../)

## Error Handling

**Frontend:**
- Try-catch in async handlers; errors captured from axios response
- Error messages extracted from `err.response.data?.detail` or fallback message
- 401 status triggers auto-logout via axios interceptor (`api.js`)
- Example from `Login.jsx`:
  ```javascript
  try {
    const { data } = await authAPI.login(form)
    await handleAuthSuccess(data.tokens)
  } catch (err) {
    if (!err.response) {
      setError('Serveur indisponible — réessayez dans quelques secondes')
    } else {
      setError(err.response.data?.detail || 'Identifiants incorrects')
    }
  }
  ```

**Backend:**
- Uses Django REST Framework exceptions (`NotFound`, `ValidationError`)
- Serializer validation errors raised with `raise_exception=True`
- Redis operations wrapped in try-except with graceful degradation (token blacklist)
- Example from `views.py`:
  ```python
  def _get(self, pk):
    obj = Contact.objects(id=pk).first()
    if not obj:
      from rest_framework.exceptions import NotFound
      raise NotFound('Contact not found.')
    return obj
  ```

## Logging

**Framework:** No explicit logging library; none observed in codebase

**Patterns:**
- No logging found in source files
- AuditLog model (`models.py`) records HTTP requests manually via middleware (`AuditLogMiddleware`)
- Frontend: No logging utility in place

## Comments

**When to Comment:**
- Docstrings on all model classes (e.g., User, Contact, Company)
- Docstrings on all view classes and serializers
- Section separators using `# ─── [Name] ────────────────────` pattern (seen in models, views, serializers)
- Inline comments explaining "why" in complex logic (e.g., redis token blacklist)

**JSDoc/TSDoc:**
- Not observed in frontend code; minimal documentation
- Backend uses Python docstrings on Document classes and helper functions

Example from `models.py`:
```python
class User(me.Document):
    """
    Custom user model stored in MongoDB.
    Replaces django.contrib.auth entirely.
    """
```

## Function Design

**Size:**
- View methods kept concise (10-40 lines)
- Helper functions extracted for repeated logic (e.g., `paginate`, `_get`)

**Parameters:**
- Positional parameters used conservatively
- Objects passed as kwargs where possible (e.g., `{ params: p }` in API calls)
- Request/response objects passed to view methods by framework

**Return Values:**
- View methods return REST Response objects (frontend expects JSON)
- Helper functions return data structures (dicts, objects)
- Serializers return instance objects or validated data

## Module Design

**Exports:**
- Frontend API modules export object with named methods: `export const authAPI = { login, googleLogin, ... }`
- React components export default function (single export per file)
- Zustand stores export const with `use` prefix: `export const useAuthStore = create(...)`
- Django views imported directly from urls.py

Example from `api/auth.js`:
```javascript
export const authAPI = {
  login:       (data)       => api.post('/api/auth/login/',   data),
  googleLogin: (credential) => api.post('/api/auth/google/',  { credential }),
  refresh:     (data)       => api.post('/api/auth/refresh/', data),
  me:          ()           => api.get('/api/auth/me/'),
}
```

**Barrel Files:**
- Not used; imports are explicit from individual modules

## Data Flow & State Management

**Frontend State:**
- Authentication: Zustand persistent store (`useAuthStore`)
- Queries: React Query with custom queryKeys (`['contacts', search]`)
- Component state: React hooks (useState for forms, modals)

**Backend State:**
- Persistent: MongoDB collections (users, contacts, companies, etc.)
- Transient: Redis for token blacklist
- No ORM; direct MongoEngine Document access

## API Patterns

**Endpoint Structure:**
- POST `/api/auth/login/` - login with credentials
- POST `/api/auth/google/` - Google OAuth login
- GET `/api/contacts/` - list with pagination and filters
- POST `/api/contacts/` - create
- PATCH `/api/contacts/{id}/` - partial update
- DELETE `/api/contacts/{id}/` - delete

**Query Parameters:**
- Pagination: `?page=1&page_size=50`
- Search: `?q=searchterm`
- Filters: `?stage=proposal&pipeline_id=...`

**Response Format:**
- List responses wrapped in pagination object:
  ```json
  { "count": 100, "page": 1, "page_size": 50, "results": [...] }
  ```
- Single object responses return object directly
- Auth responses include user and tokens: `{ "user": {...}, "tokens": {...} }`

## Type Coercion

**Frontend:**
- String to number: parseInt, min/max guards (e.g., `max(1, int(page))`)
- Null checks using optional chaining (`?.`)
- Default values using nullish coalescing (`??`) and OR (`||`)

**Backend:**
- MongoEngine handles type conversion automatically
- String IDs from MongoDB converted using `str(obj.id)`
- Query string integers handled with try-except and defaults

## Request/Response Interceptors

**Frontend (axios):**
- Request interceptor: Injects JWT token from store into Authorization header
- Response interceptor: Handles 401 by logging out and redirecting to login

```javascript
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
```

## Utility Functions

**Frontend:**
- API methods grouped by module (crm.js, auth.js, facturation.js)
- Helper function `_get()` pattern in views for repeated resource lookup with error handling

**Backend:**
- Helper functions prefixed with `_` when private (e.g., `_get_redis()`, `_get()`)
- Pagination abstracted to `paginate(queryset, request, serializer_class)`

---

*Convention analysis: 2026-03-04*
