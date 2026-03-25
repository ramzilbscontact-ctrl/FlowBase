---
phase: 03-port-facturation-comptabilite-rh-paie-ui
plan: "02"
subsystem: facturation-pdf-payments
tags: [stripe, pdf, resend, react-pdf, webhook, payments]
dependency_graph:
  requires: [03-01]
  provides: [invoice-pdf-download, payslip-pdf-download, stripe-payment-flow, resend-email, public-pay-page]
  affects: [invoices, payments, payslips]
tech_stack:
  added: ["@react-pdf/renderer", "stripe", "resend", "@stripe/stripe-js", "@stripe/react-stripe-js"]
  patterns: [renderToBuffer, stripe-webhook-raw-body, owner_id-from-invoice-row, isPublicRoute-proxy]
key_files:
  created:
    - nextjs-app/components/pdf/InvoicePDF.tsx
    - nextjs-app/components/pdf/PayslipPDF.tsx
    - nextjs-app/app/api/invoices/[id]/pdf/route.ts
    - nextjs-app/app/api/invoices/[id]/pay/route.ts
    - nextjs-app/app/api/invoices/[id]/send/route.ts
    - nextjs-app/app/api/stripe/webhook/route.ts
    - nextjs-app/app/api/payslips/[id]/pdf/route.ts
    - nextjs-app/app/pay/[invoiceId]/page.tsx
  modified:
    - nextjs-app/next.config.ts
    - nextjs-app/proxy.ts
    - nextjs-app/package.json
    - nextjs-app/.env.local
decisions:
  - "renderToBuffer used in all Route Handlers (not PDFDownloadLink/PDFViewer which are browser-only)"
  - "Stripe webhook reads owner_id from invoice row because supabase.auth.getUser() returns null in unauthenticated webhook context"
  - "isPublicRoute guard added to proxy.ts before the redirect check, covering /api/stripe/webhook and /pay/*"
  - "use(params) React hook used in pay page since Next.js 16 passes params as Promise to client components"
  - "serverExternalPackages: ['@react-pdf/renderer'] added to next.config.ts before package install to prevent bundling crash"
metrics:
  duration: "14min"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 8
  files_modified: 4
requirements_met: [FR-03-4, FR-03-5, FR-03-8]
---

# Phase 3 Plan 2: PDF Generation + Stripe Payments + Resend Email Summary

**One-liner:** PDF invoice/payslip downloads via renderToBuffer, Stripe PaymentIntent creation + webhook signature verification, and Resend email delivery with PDF attachment.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install packages + config + PDF components + PDF routes | a0ff2ce | next.config.ts, proxy.ts, InvoicePDF.tsx, PayslipPDF.tsx, invoices/[id]/pdf/route.ts, payslips/[id]/pdf/route.ts |
| 2 | Stripe PaymentIntent + webhook + Resend email + public pay page | 15086b4 | invoices/[id]/pay/route.ts, invoices/[id]/send/route.ts, stripe/webhook/route.ts, pay/[invoiceId]/page.tsx |

---

## What Was Built

### PDF Generation
- `InvoicePDF` and `PayslipPDF` React PDF components — server-safe, no `PDFViewer` import
- `GET /api/invoices/[id]/pdf` — fetches invoice + items + contact, renders to PDF buffer, returns `application/pdf` with `Content-Disposition: attachment`
- `GET /api/payslips/[id]/pdf` — fetches payslip + employee name, returns PDF with formatted filename

### Stripe Payment Flow
- `POST /api/invoices/[id]/pay` — creates Stripe PaymentIntent (amount in cents), saves `stripe_payment_intent_id` on invoice, returns `client_secret`
- `POST /api/stripe/webhook` — reads raw body via `req.text()` (not `req.json()`), verifies Stripe signature with `constructEvent`, on `payment_intent.succeeded` marks invoice `paid` and inserts payment row with `owner_id` sourced from the invoice row
- Public `/pay/[invoiceId]` page — loads without auth, POST to `/pay` route to get `client_secret`, embeds Stripe Elements `PaymentElement`

### Resend Email Delivery
- `POST /api/invoices/[id]/send` — generates PDF buffer, sends via Resend with PDF attachment, updates invoice status to `sent`

### Auth Proxy Updates
- `proxy.ts` — `isPublicRoute` guard excludes `/api/stripe/webhook` and `/pay/*` from auth redirect so Stripe can POST and clients can pay without logging in

---

## Decisions Made

1. **renderToBuffer for all server PDF routes** — `PDFDownloadLink` and `PDFViewer` are browser-only components. `renderToBuffer` is the correct Node.js/server API for Route Handlers.

2. **Stripe webhook uses owner_id from invoice row** — `supabase.auth.getUser()` returns `null` in a webhook context (unauthenticated server-to-server POST). The correct pattern is to fetch `owner_id` from the invoice being paid.

3. **isPublicRoute added before redirect guard in proxy.ts** — The Stripe webhook and pay page must bypass authentication completely. The existing `isAuthRoute` pattern was extended rather than replaced.

4. **`use(params)` in pay page** — Next.js 16 passes `params` as a `Promise<{...}>` to client components. Using `React.use(params)` is the correct unwrapping pattern (no `async/await` in client components).

5. **serverExternalPackages added before package install** — Critical to prevent @react-pdf/renderer from being bundled by webpack which causes crashes.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `use(params)` instead of destructuring in pay page**
- **Found during:** Task 2
- **Issue:** Next.js 16 passes page params as `Promise<{...}>` to client components. The plan's `params: { invoiceId: string }` pattern causes a TypeScript error in Next.js 16.
- **Fix:** Changed to `params: Promise<{ invoiceId: string }>` and `const { invoiceId } = use(params)`.
- **Files modified:** `nextjs-app/app/pay/[invoiceId]/page.tsx`

**2. [Rule 2 - Missing] Added NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local**
- **Found during:** Task 2
- **Issue:** The pay page uses `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` but `.env.local` only had `STRIPE_PUBLISHABLE_KEY` (server-side). Client-side env vars must be prefixed with `NEXT_PUBLIC_`.
- **Fix:** Added `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `RESEND_API_KEY`/`RESEND_FROM_EMAIL` placeholders to `.env.local`.
- **Files modified:** `nextjs-app/.env.local`

**3. [Rule 1 - Bug] Used typed cast for contacts.email in send route**
- **Found during:** Task 2
- **Issue:** The Supabase join `contacts(first_name, last_name, email)` returns a type that doesn't include `email` in the generated types (contacts is joined via foreign key). Used a typed cast `as { email?: string | null }` instead of `as any` for type safety.
- **Fix:** Cast `invoice.contacts` to `{ email?: string | null } | null` which is more precise than `any`.
- **Files modified:** `nextjs-app/app/api/invoices/[id]/send/route.ts`

---

## Auth Gates

None — all required env vars (Stripe, Resend) are documented in `user_setup` frontmatter and `.env.local` placeholders. The Stripe/Resend routes will fail gracefully if keys are not set.

---

## Self-Check: PASSED

Created files verified:
- nextjs-app/components/pdf/InvoicePDF.tsx — FOUND
- nextjs-app/components/pdf/PayslipPDF.tsx — FOUND
- nextjs-app/app/api/invoices/[id]/pdf/route.ts — FOUND
- nextjs-app/app/api/invoices/[id]/pay/route.ts — FOUND
- nextjs-app/app/api/invoices/[id]/send/route.ts — FOUND
- nextjs-app/app/api/stripe/webhook/route.ts — FOUND
- nextjs-app/app/api/payslips/[id]/pdf/route.ts — FOUND
- nextjs-app/app/pay/[invoiceId]/page.tsx — FOUND

Commits verified:
- a0ff2ce — feat(03-02): install PDF/Stripe/Resend packages + config + PDF components + PDF routes
- 15086b4 — feat(03-02): Stripe PaymentIntent + webhook + Resend email + public pay page
