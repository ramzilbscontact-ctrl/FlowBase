# Codebase Concerns

**Analysis Date:** 2026-03-04

## Security Issues

**Firebase Configuration Exposed:**
- Issue: Firebase API key hardcoded in frontend source code
- Files: `frontend/src/firebase.js`
- Impact: Firebase credentials are public and can be used to access/modify Firebase project resources. High-severity exposure of auth domain and project ID.
- Fix approach: Move Firebase config to environment variables (VITE_FIREBASE_*). Firebase API keys have limited scope by default (use Security Rules), but exposure increases attack surface. Keep only project ID in code, move everything else to .env.local.

**Google OAuth Token Validation Gap:**
- Issue: Backend exchanges Google access token without validating token issuer or scope
- Files: `backend/apps/authentication/views.py` (GoogleAuthView, lines 254-272)
- Impact: Malicious actor could craft tokens from other issuers; no validation that token is from Google's official endpoint. Current code trusts Google's userinfo response without cryptographic verification.
- Fix approach: Use Google's ID token verification (JWT) instead of access token exchange. Validate token signature, expiration, and issuer (`accounts.google.com`) before trusting claims. Consider using `google-auth` library's `id_token.verify_oauth2_token()`.

**Token Blacklist Silently Fails:**
- Issue: Redis unavailability in token blacklisting is silently caught with bare `except Exception`
- Files: `backend/apps/authentication/views.py` (lines 35-36, 42-43, 108-109)
- Impact: If Redis goes down, logout and token refresh still succeed but don't actually blacklist tokens. User sessions can't be revoked. Degraded security when cache layer fails.
- Fix approach: Log Redis failures explicitly, don't silently pass. Consider failing-closed for token operations or implementing MongoDB-backed token blacklist as fallback.

**Bare Exception Handlers:**
- Issue: Multiple `except Exception` blocks that catch and suppress all exceptions including KeyboardInterrupt, SystemExit
- Files: `backend/apps/authentication/views.py` (lines 35-36, 42-43, 108-109, 260-264)
- Impact: Masks real errors (network timeouts, Google API outages). Makes debugging production issues difficult. Could hide security-relevant failures.
- Fix approach: Catch specific exceptions (e.g., `redis.ConnectionError`, `requests.Timeout`, `requests.RequestException`). Log all failures with context.

**TOTP Code Valid Window Too Wide:**
- Issue: TOTP verification uses `valid_window=1` allowing codes from adjacent time windows
- Files: `backend/apps/authentication/models.py` (line 80)
- Impact: Extends TOTP validity beyond 30 seconds. Reduces protection against timing attacks and replay if code is intercepted.
- Fix approach: Use `valid_window=0` (strict 30-second window only) unless specific UX requirement requires tolerance. Consider warning users about wider windows.

## Data Integrity Issues

**No Audit Log Persistence Guarantee:**
- Issue: AuditLogMiddleware swallows exceptions when persisting audit logs (line 91-93 in middleware.py)
- Files: `backend/apps/authentication/middleware.py` (line 91-93)
- Impact: Failed audit logging is silent. Compliance/forensic trails can have gaps. No visibility into when auditing fails.
- Fix approach: Log audit failures to stderr/logger. Consider circuit-breaker pattern to fail-fast if MongoDB is unavailable. Add metrics for audit log write failures.

**MongoEngine Lazy Validation:**
- Issue: User model fields like email not indexed for uniqueness at DB constraint level
- Files: `backend/apps/authentication/models.py` (line 18: `unique=True` is MongoEngine only)
- Impact: MongoEngine's unique constraint is application-level, not database-enforced. Multiple processes could create duplicate emails under race conditions. Direct MongoDB writes bypass the constraint.
- Fix approach: Create unique compound index in MongoDB (`db.users.createIndex({ email: 1 }, { unique: true })`). Verify in production.yaml or migration script.

**Denormalized Contact Company Name:**
- Issue: Contact model stores both reference and denormalized company_name (line 59 in crm/models.py)
- Files: `backend/apps/crm/models.py` (lines 58-59)
- Impact: Company name can become stale when parent company is updated. Creates data inconsistency without explicit synchronization strategy.
- Fix approach: Document when denormalization is synced (on create? on update?). Add middleware or signal to update denormalized field when Company changes. Or remove denormalization and query Company reference when needed.

**No Transactional Guarantees:**
- Issue: MongoEngine/pymongo operations in complex workflows lack transaction support
- Files: `backend/apps/crm/` (all views), `backend/apps/facturation/` (all views)
- Impact: Multi-step operations (e.g., create deal + update contact) can partially fail, leaving data in inconsistent state. No rollback mechanism.
- Fix approach: MongoDB 4.0+ supports transactions. Implement transaction wrappers for critical paths (payment processing, deal closure). Use context managers for atomic operations.

## Performance Bottlenecks

**No Database Query Caching:**
- Issue: Every API request hits MongoDB fresh; no caching layer for frequently accessed data
- Files: `backend/apps/crm/views.py` (line 44: `Contact.objects.all()`)
- Impact: Large contact lists, companies, pipelines queried repeatedly. High MongoDB load for read-heavy operations. Slow API responses for list endpoints.
- Fix approach: Add Redis caching with TTL for expensive queries (contact list, pipeline list). Invalidate on write. Use `@cache_page` decorator for GET endpoints. Consider query result pagination limits.

**Inefficient Full-Text Search:**
- Issue: CRM search uses icontains filters without indexes (line 51-57 in crm/views.py)
- Files: `backend/apps/crm/views.py` (lines 51-57), `backend/config/urls.py` (line 36: search_urls)
- Impact: Large contact/company databases will perform full collection scans. O(n) complexity per search. No full-text search index.
- Fix approach: Add MongoDB text indexes (`db.contacts.createIndex({ first_name: "text", last_name: "text", email: "text" })`). Use `$text` query operator. Or migrate to Elasticsearch for production search.

**N+1 Query Problem in Serializers:**
- Issue: Contact serializer doesn't use select_related for Company reference
- Files: `backend/apps/crm/serializers.py` (likely referenced in views)
- Impact: Each contact returned in list requires separate Company lookup. 1 query for contacts + N queries for companies.
- Fix approach: Serialize company data inline or use select_related pattern. Pre-fetch related documents in view before serializing.

**Pagination Limit Too High:**
- Issue: Default page size of 50, max of 200 (line 22 in crm/views.py)
- Files: `backend/apps/crm/views.py` (line 22)
- Impact: Single page can fetch 200 documents, bloating response size and straining frontend parsing. Encourages large result sets.
- Fix approach: Reduce max page_size to 100. Consider cursor-based pagination for large datasets. Add response compression.

## Test Coverage Gaps

**No Test Suite for Authentication:**
- Issue: No test files found in authentication app
- Files: `backend/apps/authentication/` (no tests/*.py or *_test.py files)
- Impact: Critical auth logic (JWT generation, token refresh, Google OAuth, 2FA) untested. Regressions in login flow go undetected.
- Priority: HIGH
- Fix approach: Add pytest + pytest-django. Write tests for: LoginView (valid/invalid creds, 2FA), TokenRefreshView (blacklist behavior), GoogleAuthView (token validation, auto-registration). Test bcrypt hashing consistency.

**No Test Suite for CRM Endpoints:**
- Issue: No test files found for CRM models/views
- Files: `backend/apps/crm/` (no tests/*.py or *_test.py files)
- Impact: CRUD operations (create contact, update deal, delete company) untested. Data corruption bugs go unnoticed.
- Priority: HIGH
- Fix approach: Test each endpoint (GET, POST, PATCH, DELETE). Verify pagination works. Test permission checks. Test owner_id assignment and filtering.

**No Frontend Component Tests:**
- Issue: No Jest/Vitest configuration or test files found
- Files: `frontend/` (no *.test.js, *.spec.js, jest.config.js, vitest.config.js)
- Impact: React components render untested. Auth flows, error handling, API interactions not validated.
- Priority: MEDIUM
- Fix approach: Set up Vitest. Write tests for LoginForm, GoogleAuthButton, ProtectedRoutes. Mock API calls. Test error boundary rendering.

**No Integration Tests:**
- Issue: No tests spanning multiple layers (e.g., API → DB → response)
- Files: Entire backend
- Impact: Breaking changes in API contract go undetected until production.
- Priority: MEDIUM
- Fix approach: Use pytest fixtures to set up test MongoDB data. Write end-to-end tests for critical workflows (login → create contact → deal).

## Fragile/Complex Areas

**Google OAuth Flow Incomplete:**
- Issue: Frontend uses Firebase Auth but backend expects raw Google access token
- Files: `frontend/src/firebase.js`, `backend/apps/authentication/views.py` (GoogleAuthView)
- Impact: Firebase and backend use different OAuth flows. Risk of mismatch in token handling. No clear documentation of expected token format.
- Fix approach: Standardize on Firebase-provided ID tokens (use `user.getIdToken()`) and validate with `google-auth` library on backend. Remove mixed auth approaches.

**Dual Deployment Paths (Render + Railway):**
- Issue: Settings support both RAILWAY_DOMAIN and RENDER_EXTERNAL_HOSTNAME
- Files: `backend/config/settings/production.py` (lines 11-23)
- Impact: Unclear which platform is actually used. Confusing ALLOWED_HOSTS configuration. Risk of deploying to wrong platform.
- Fix approach: Simplify to single deployment target. Remove Railway-specific code if not used. Document chosen platform clearly.

**Cookie vs Token Auth Confusion:**
- Issue: Frontend stores tokens in Zustand (in-memory), not httpOnly cookies
- Files: `frontend/src/store/authStore.js`, `frontend/src/api/axios.js` (line 13)
- Impact: Tokens vulnerable to XSS. Axios manually injects auth header instead of browser handling. No CSRF protection via SameSite cookies.
- Fix approach: Migrate to httpOnly, Secure, SameSite cookies. Let browser auto-attach to requests. Remove manual header injection. Verify CORS doesn't expose tokens.

**Middleware Tight Coupling:**
- Issue: AuditLogMiddleware imports from apps.authentication at runtime to avoid circular imports
- Files: `backend/apps/authentication/middleware.py` (line 70)
- Impact: Fragile import pattern. Could break if model location changes. Makes refactoring risky.
- Fix approach: Use dependency injection or late binding. Consider moving middleware to separate module not tied to specific app.

## Missing/Incomplete Features

**No Rate Limiting:**
- Issue: API endpoints have no rate limit protection
- Files: All view files under `backend/apps/*/views.py`
- Impact: Brute-force attacks on login endpoint (no protection beyond failed_login_attempts field). No DoS mitigation. Can overwhelm backend.
- Fix approach: Add `django-ratelimit` or `drf-extensions` rate limiting. Implement per-IP rate limits on `/api/auth/login/`. Add progressive backoff on failed attempts.

**No Request Validation/Sanitization:**
- Issue: Many endpoints accept `request.query_params` without validation
- Files: `backend/apps/crm/views.py` (lines 46, 49), and likely all search endpoints
- Impact: Injection vulnerabilities if user input is logged or used in queries. Even with MongoEngine's query escaping, large malicious inputs could DoS.
- Fix approach: Use marshmallow or pydantic for request validation. Whitelist allowed query params. Validate param types and lengths.

**No Soft Delete / Logical Deletion:**
- Issue: Delete endpoints likely perform hard deletes
- Files: `backend/apps/crm/views.py` (likely DELETE handlers)
- Impact: Deleted records are unrecoverable. Audit trail breaks. Reports on deleted data impossible.
- Fix approach: Add `is_deleted` and `deleted_at` fields to models. Use in queries to filter soft-deleted records. Implement restore endpoint.

**No Batch Operations:**
- Issue: CRM endpoints lack bulk create/update/delete
- Files: `backend/apps/crm/views.py`
- Impact: Importing 1000 contacts requires 1000 API calls. Import performance suffers.
- Fix approach: Add `/api/contacts/bulk-create/` endpoint accepting array of contact objects.

**Incomplete Error Responses:**
- Issue: Generic error messages don't include error codes or actionable details
- Files: All serializers and views
- Impact: Frontend can't distinguish "email already exists" from "database error" to show appropriate UI message.
- Fix approach: Standardize error format: `{ "error_code": "DUPLICATE_EMAIL", "detail": "...", "field": "email" }`. Return 409 Conflict for duplicates.

## Dependencies at Risk

**Outdated/Pinned Versions:**
- Issue: Core dependencies have no upper-bound constraints
- Files: `backend/requirements.txt`
- Impact: Major version bumps (e.g., Django 5.3, DRF 4.0) could break app unexpectedly. Security patches in dependencies might lag.
- Fix approach: Use `~=` constraints for minor versions (e.g., `djangorestframework~=3.16`). Regular dependency audits with `pip-audit`. Test against next major versions in CI.

**Deprecated google-auth Library:**
- Issue: Reliance on `google-auth` v2.35 for token verification may lag security updates
- Files: `backend/requirements.txt` (line 26)
- Impact: If Google changes token format/validation, library might not follow. Custom OAuth flow could break.
- Fix approach: Monitor google-auth releases. Consider using Google's official Python client library. Test token validation in CI pipeline.

**No Package Lock for Backend:**
- Issue: requirements.txt lacks hash verification; pip can't guarantee reproducible builds
- Files: `backend/requirements.txt`
- Impact: Supply chain attacks possible. Pinned version (e.g., `django==5.2.11`) is fetched without integrity check.
- Fix approach: Use `pip-compile` to generate `requirements.lock`. Pin hashes: `pip install --require-hashes -r requirements.lock`.

## Configuration and Environment

**Exposed Firebase Credentials in Code:**
- Issue: All Firebase config in plain text in source
- Files: `frontend/src/firebase.js`
- Impact: Firebase resources publicly accessible. Anyone with projectId can make calls within Security Rules limits.
- Fix approach: No secrets in Firebase config (API keys are public by design), but rotate projectId/authDomain regularly. Use Firebase Security Rules to restrict access to authenticated users only.

**CORS Allows Explicit Origins Only in Prod:**
- Issue: CORS config requires FRONTEND_URL env var but has no fallback in production
- Files: `backend/config/settings/production.py` (line 26-28)
- Impact: Misconfigured FRONTEND_URL breaks frontend. No CORS headers → blank page, cryptic errors.
- Fix approach: Add validation on startup: raise error if FRONTEND_URL not set in production. Document in deployment guide.

**Hardcoded Timezone:**
- Issue: Timezone set to 'Africa/Algiers' globally
- Files: `backend/config/settings/base.py` (line 109)
- Impact: Confusing for multi-timezone teams. Logs/timestamps always in Algiers time. Celery tasks scheduled in Algiers time.
- Fix approach: Use UTC for all internal timestamps. Convert to user's timezone in API responses. Make timezone configurable per user.

## Scaling Limits

**MongoDB Atlas Shared Tier:**
- Issue: No indication of database tier; if using free/shared tier, limited connections/performance
- Files: `backend/config/settings/base.py` (line 84: MONGO_URI)
- Impact: Free tier has 512MB storage limit, 100 concurrent connections. App can exhaust resources quickly.
- Fix approach: Document required MongoDB tier (M10+ recommended for production). Set up automated backups. Monitor connection pool usage.

**Redis Broker No Persistence:**
- Issue: Render Redis is likely non-persistent cache-only tier
- Files: `backend/config/settings/base.py` (line 71: CHANNEL_LAYERS uses REDIS_URL)
- Impact: Queued Celery tasks and token blacklist lost on Redis restart. No durability.
- Fix approach: Upgrade to Redis with persistence (RDB/AOF). Or use MongoDB as Celery broker for durability.

**Single Backend Instance:**
- Issue: No indication of horizontal scaling; Render hobby/standard tier may be single process
- Files: Deployment configuration
- Impact: Single point of failure. Can't handle traffic spikes. No redundancy.
- Fix approach: Use Render Standard tier or higher for production. Set up multiple dyno processes. Add load balancing.

## Technical Debt Summary

| Area | Severity | Impact | Effort |
|------|----------|--------|--------|
| Security: Firebase credentials exposed | HIGH | Public Firebase access | LOW |
| Security: No token issuer validation | HIGH | OAuth bypass possible | MEDIUM |
| Security: Bare exception handlers | MEDIUM | Silent failures, hard debugging | MEDIUM |
| Test: No auth tests | HIGH | Login regressions undetected | MEDIUM |
| Test: No CRM tests | HIGH | Data corruption undetected | MEDIUM |
| Data: No unique email constraint at DB level | MEDIUM | Race condition duplicate emails | LOW |
| Data: Denormalized contact.company_name | MEDIUM | Stale data | MEDIUM |
| Performance: No caching | MEDIUM | High DB load | MEDIUM |
| Performance: Full-text search via icontains | MEDIUM | O(n) searches | MEDIUM |
| Feature: No rate limiting | HIGH | Brute force attacks possible | LOW |
| Feature: No soft deletes | MEDIUM | Unrecoverable deletes | MEDIUM |
| Ops: Dual deployment (Render + Railway) | LOW | Confusion, potential wrong deploy | LOW |

---

*Concerns audit: 2026-03-04*
