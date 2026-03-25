# Phase 03: Port Facturation + Comptabilité + RH/Paie UI — Research

**Researched:** 2026-03-25
**Domain:** Next.js 16 App Router — Facturation CRUD + Stripe PaymentIntent + PDF generation (@react-pdf/renderer) + Comptabilité double-entry + RH/Paie with Algerian IRG/CNAS
**Confidence:** HIGH (stack, schema, patterns) / MEDIUM (Stripe webhook pattern) / MEDIUM (IRG brackets — multiple sources agree)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FR-03-1 | Invoices: create, edit, preview as PDF, send by email, mark as paid | Schema confirmed (invoices + invoice_items tables); @react-pdf/renderer renderToBuffer in Route Handler; existing Invoices.jsx port map documented |
| FR-03-2 | Quotes: create, edit, convert to invoice | Schema confirmed (quotes table, converted_to_invoice_id FK); Quotes.jsx port map documented |
| FR-03-3 | Payment tracking: record payments against invoices, show balance due | Schema confirmed (payments table with invoice_id FK, method enum); Payments.jsx port map documented |
| FR-03-4 | Stripe integration: create payment intent, handle webhook events | stripe SDK already in REQUIREMENTS; PaymentIntent Route Handler + webhook Route Handler pattern documented |
| FR-03-5 | Email notifications: send invoice/reminder emails via Gmail SMTP or Supabase SMTP | Roadmap specifies Resend (replaces Gmail SMTP); not blocked — Resend package needed |
| FR-04-1 | Chart of accounts: manage account types (assets, liabilities, equity, income, expense) | Schema confirmed (accounts table with type CHECK constraint + parent_id self-ref); tree grouping pattern documented |
| FR-04-2 | Journal entries: create double-entry journal entries | Schema confirmed (journal_entries + journal_lines tables); debit=credit balance validation pattern documented |
| FR-04-3 | General ledger: view all transactions by account | journal_lines → account_id FK join; running balance computed client-side |
| FR-04-4 | Financial reports: income statement, balance sheet | Reports.jsx port map documented; Supabase aggregation via journal_lines grouped by account type |
| FR-05-1 | Employee management: create/edit profiles | Schema confirmed (employees table with department_id FK, base_salary, status) |
| FR-05-2 | Department management: create/edit/delete | Schema confirmed (departments table with deleted_at) |
| FR-05-3 | Leave management: submit, approve/reject | Schema confirmed (leave_requests with status enum + approved_by FK); Leaves.jsx port map documented |
| FR-05-4 | Payroll: generate monthly payslips with gross/net | Schema confirmed (payslips table with cnas_deduction, irg_deduction, net_salary, period_month/year unique constraint); IRG/CNAS rates documented |
| FR-05-5 | Payslip export: download as PDF | Same @react-pdf/renderer Route Handler pattern as invoice PDF |
| TR-04-1 | Core Web Vitals: LCP < 2.5s | dynamic() import for @react-pdf/renderer Route Handler only (no SSR cost on list pages); PDF is server-only |
| TR-04-2 | Supabase query caching: React Query cache | useQuery with keyed queryKey arrays + invalidateQueries on mutations — established Phase 2 pattern |
</phase_requirements>

---

## Summary

Phase 3 ports three modules — Facturation, Comptabilité, and RH/Paie — using the same porting strategy proven in Phase 2: copy existing JSX, add `'use client'`, swap axios calls for `supabase.from(...)`, swap React Router for `next/link`/`useRouter`, add TypeScript types. The complete PostgreSQL schema for all three modules already exists in Supabase (from Phase 1 migration 001_schema.sql): invoices, invoice_items, quotes, payments, accounts, journal_entries, journal_lines, departments, employees, leave_requests, and payslips are all live tables.

The two genuinely new capabilities vs Phase 2 are: (1) PDF generation via `@react-pdf/renderer` in Next.js Route Handlers, and (2) Stripe PaymentIntent creation + webhook verification. Both have well-documented patterns. The key gotcha for PDF is that `@react-pdf/renderer` requires `serverExternalPackages: ['@react-pdf/renderer']` in `next.config.ts` and React 19 (already installed at 19.2.3). The key gotcha for Stripe webhooks is reading the raw body via `req.text()` before any JSON parsing — automatic JSON parsing breaks `constructEvent()`.

Algerian payroll (IRG + CNAS) uses a fixed 9% CNAS employee deduction followed by progressive IRG brackets applied to the post-CNAS taxable amount. The payslips table schema already includes `cnas_deduction`, `irg_deduction`, and `net_salary` columns, so calculations are app-layer only with no schema migration needed.

**Primary recommendation:** Structure Phase 3 into 5 plans: (1) Facturation CRUD pages, (2) Stripe + PDF Route Handlers, (3) Comptabilité pages, (4) RH/Paie pages + payroll calculation, (5) UAT. Plans 1 and 3 and 4 are pure UI ports requiring zero new packages. Plans 1+3+4 can be executed in any order after the plan structure is set.

---

## Standard Stack

### Core (already installed — zero new installs for UI plans)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90.21 | Server state, cache, mutations | Established in Phase 2; all pages use useQuery/useMutation/useQueryClient v5 |
| @supabase/supabase-js | ^2.98.0 | Database queries | Supabase client pattern established Phase 1 |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client | createClient() from lib/supabase/server.ts established |
| zod | ^4.3.6 | Input validation | Already installed; use for Route Handler request body validation |
| sonner | ^2.0.7 | Toast notifications | Already installed; use for CRUD success/error feedback |
| lucide-react | ^0.577.0 | Icons | Already installed |

### New packages required

| Library | Version | Purpose | When to Install |
|---------|---------|---------|-----------------|
| @react-pdf/renderer | ^4.3.x | Server-side PDF generation | Plan 2 (PDF Route Handlers) |
| stripe | ^17.x | Stripe SDK — PaymentIntent + webhook | Plan 2 (Stripe Route Handlers) |
| resend | ^4.x | Email delivery (send invoice PDF) | Plan 2 (invoice send Route Handler) |
| @stripe/stripe-js | ^5.x | Stripe Elements (client-side payment form) | Plan 2 (public pay page) |
| @stripe/react-stripe-js | ^3.x | React wrapper for Stripe Elements | Plan 2 (public pay page) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer | puppeteer/headless Chrome | puppeteer is 200MB+, requires chromium binary, massive Vercel deployment size. @react-pdf/renderer is pure Node, ~5MB, no browser needed |
| @react-pdf/renderer | html-pdf / wkhtmltopdf | Also requires binary; not viable on Vercel serverless |
| Resend | Supabase SMTP | Resend has a generous free tier, is already called out in the roadmap, no SMTP config needed |
| stripe npm package | Stripe REST directly | SDK handles retries, types, webhook verification — don't hand-roll |

### Installation (Plan 2 only)

```bash
cd nextjs-app
npm install @react-pdf/renderer stripe resend @stripe/stripe-js @stripe/react-stripe-js
```

---

## Architecture Patterns

### Established Phase 2 CRUD Pattern (reuse exactly)

Every list page in this phase follows this exact structure — confirmed working from contacts/page.tsx and companies/page.tsx:

```typescript
// Source: nextjs-app/app/(dashboard)/dashboard/contacts/page.tsx (Phase 2 established)
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PageShell, TableHead, EmptyRow, TableRow, Badge } from '@/components/ui/PageShell'
import { Modal } from '@/components/ui/Modal'
import type { Database } from '@/lib/types/database.types'

const supabase = createClient()  // module-level singleton

export default function XxxPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Row | null>(null)
  const [form, setForm] = useState({ /* fields */ })

  const { data, isLoading } = useQuery({
    queryKey: ['xxx'],
    queryFn: async () => supabase.from('xxx').select('...').is('deleted_at', null).order('created_at', { ascending: false }),
  })

  const saveMut = useMutation({
    mutationFn: async (payload) => editingItem
      ? supabase.from('xxx').update(payload).eq('id', editingItem.id)
      : supabase.from('xxx').insert({ ...payload, owner_id: (await supabase.auth.getUser()).data.user!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['xxx'] }); closeModal(); toast.success('Enregistré') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => supabase.from('xxx').update({ deleted_at: new Date().toISOString() }).eq('id', id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['xxx'] }); toast.success('Supprimé') },
  })
  // ...
}
```

**Key rules from Phase 2:**
- Always `const supabase = createClient()` at module level (not inside component)
- `invalidateQueries` uses v5 object form: `{ queryKey: ['key'] }` not `(['key'])`
- Never use `.delete()` — always soft delete via `update({ deleted_at: new Date().toISOString() })`
- `owner_id` required on insert — get from `supabase.auth.getUser()`
- `(supabase as any)` cast needed for PostgREST aggregates not in generated types

### Existing Scaffolds to Replace

These server-component placeholder pages already exist and must be replaced with 'use client' interactive versions:

```
nextjs-app/app/(dashboard)/dashboard/invoices/page.tsx   — EXISTS (server component scaffold, has KPI cards)
nextjs-app/app/(dashboard)/dashboard/quotes/page.tsx     — EXISTS (scaffold)
nextjs-app/app/(dashboard)/dashboard/payments/page.tsx   — EXISTS (scaffold)
nextjs-app/app/(dashboard)/dashboard/journal/page.tsx    — EXISTS (scaffold)
nextjs-app/app/(dashboard)/dashboard/reports/page.tsx    — EXISTS (scaffold)
nextjs-app/app/(dashboard)/dashboard/employees/page.tsx  — EXISTS (scaffold)
nextjs-app/app/(dashboard)/dashboard/leaves/page.tsx     — EXISTS (scaffold)
```

Additional pages to CREATE (do not exist yet):
```
nextjs-app/app/(dashboard)/dashboard/accounts/page.tsx   — CREATE NEW
nextjs-app/app/(dashboard)/dashboard/departments/page.tsx — CREATE NEW (check if exists)
nextjs-app/app/(dashboard)/dashboard/payroll/page.tsx    — CREATE NEW
nextjs-app/app/pay/[invoiceId]/page.tsx                  — CREATE NEW (public, no auth)
nextjs-app/app/api/invoices/[id]/pdf/route.ts            — CREATE NEW
nextjs-app/app/api/invoices/[id]/send/route.ts           — CREATE NEW
nextjs-app/app/api/invoices/[id]/pay/route.ts            — CREATE NEW
nextjs-app/app/api/stripe/webhook/route.ts               — CREATE NEW
nextjs-app/app/api/payslips/[id]/pdf/route.ts            — CREATE NEW
```

### Pattern: PDF Route Handler

**What:** Server-side PDF generation returning binary response from a Next.js Route Handler
**When to use:** All PDF download endpoints (invoice PDF, payslip PDF)
**Required config change in next.config.ts:**

```typescript
// Source: react-pdf.org/compatibility + verified against Next.js docs
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
```

**Route Handler pattern:**

```typescript
// Source: @react-pdf/renderer docs + verified working pattern (React 19 required)
// app/api/invoices/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), contacts(first_name, last_name)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
    },
  })
}
```

**PDF component structure (pure layout, no browser APIs):**

```typescript
// Source: @react-pdf/renderer official docs
// components/pdf/InvoicePDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:    { padding: 40, fontFamily: 'Helvetica' },
  header:  { fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
  row:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label:   { fontSize: 10, color: '#666' },
  value:   { fontSize: 10, fontWeight: 'bold' },
})

export function InvoicePDF({ invoice }: { invoice: InvoiceWithItems }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{invoice.invoice_number}</Text>
        {/* line items, totals, etc. */}
      </Page>
    </Document>
  )
}
```

**CRITICAL:** The PDF component file MUST NOT use `PDFViewer` (browser-only). Use only `Document`, `Page`, `Text`, `View`, `StyleSheet`, `Image`, `Font` from `@react-pdf/renderer`.

### Pattern: Stripe PaymentIntent + Webhook

**What:** Create a PaymentIntent server-side, return `client_secret` to client, verify webhook on payment success
**When to use:** Invoice payment flow

```typescript
// Source: Stripe official docs + pedroalonso.net/blog/stripe-nextjs-complete-guide-2025
// app/api/invoices/[id]/pay/route.ts
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, invoice_number')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const intent = await stripe.paymentIntents.create({
    amount: Math.round((invoice.total ?? 0) * 100), // cents
    currency: 'dzd',
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoice_number },
  })

  // Persist intent ID on invoice
  await supabase
    .from('invoices')
    .update({ stripe_payment_intent_id: intent.id })
    .eq('id', id)

  return NextResponse.json({ client_secret: intent.client_secret })
}
```

```typescript
// Source: Stripe official docs — webhook signature verification
// app/api/stripe/webhook/route.ts
import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()          // MUST be raw text — not req.json()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const invoiceId = intent.metadata.invoice_id
    const supabase = await createClient()

    await supabase.from('invoices')
      .update({ status: 'paid', amount_paid: intent.amount / 100 })
      .eq('id', invoiceId)

    await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: intent.amount / 100,
      method: 'stripe',
      reference: intent.id,
      owner_id: (await supabase.auth.getUser()).data.user!.id,
    })
  }

  return NextResponse.json({ received: true })
}
```

**CRITICAL for webhooks:** The webhook route MUST be excluded from auth proxy.ts middleware. Add it to the public paths matcher.

### Pattern: Algerian Payroll Calculation

**What:** Compute net salary from base_salary with CNAS (9%) and IRG (progressive brackets)
**Source:** Multiple HR/payroll guides verified (remotepeople.com, playroll.com, rivermate.com — cross-verified)

```typescript
// Confidence: MEDIUM — multiple sources agree on these rates for 2025
// Verified from: remotepeople.com Algeria payroll tax 2026, rivermate.com Algeria taxes

export function calculatePayslip(grossMonthlySalary: number): {
  grossSalary: number
  cnasDeduction: number
  taxableIncome: number
  irgDeduction: number
  netSalary: number
} {
  const CNAS_RATE = 0.09  // 9% employee contribution — HIGH confidence

  const cnasDeduction = grossMonthlySalary * CNAS_RATE
  const taxableIncome = grossMonthlySalary - cnasDeduction

  // IRG brackets are annual — multiply monthly taxable by 12, compute annual tax, divide by 12
  // Annual brackets (DZD) — MEDIUM confidence (multiple sources agree, may vary by fiscal year)
  const annualTaxable = taxableIncome * 12
  let annualIRG = 0

  if (annualTaxable <= 240_000) {
    annualIRG = 0
  } else if (annualTaxable <= 480_000) {
    annualIRG = (annualTaxable - 240_000) * 0.23
  } else if (annualTaxable <= 1_440_000) {
    annualIRG = 240_000 * 0.23 + (annualTaxable - 480_000) * 0.27
  } else if (annualTaxable <= 3_240_000) {
    annualIRG = 240_000 * 0.23 + 960_000 * 0.27 + (annualTaxable - 1_440_000) * 0.30
  } else {
    annualIRG = 240_000 * 0.23 + 960_000 * 0.27 + 1_800_000 * 0.30 + (annualTaxable - 3_240_000) * 0.35
  }

  const irgDeduction = annualIRG / 12
  const netSalary = grossMonthlySalary - cnasDeduction - irgDeduction

  return { grossSalary: grossMonthlySalary, cnasDeduction, taxableIncome, irgDeduction, netSalary }
}
```

**Note:** The `payslips` table already stores `cnas_deduction`, `irg_deduction`, and `net_salary` as computed columns — the planner should store the calculation results in all three columns.

### Pattern: Double-Entry Journal Validation

**What:** Enforce debits = credits before inserting journal entry
**When to use:** Journal entry create form

```typescript
// Validation before Supabase insert — runs client-side, blocks malformed entries
function validateJournalLines(lines: { debit: number; credit: number }[]): boolean {
  const totalDebits  = lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0)
  return Math.abs(totalDebits - totalCredits) < 0.01  // floating-point tolerance
}
```

The existing `Journal.jsx` from the old frontend uses a simplified single debit/credit on the entry itself (not per-line). For Phase 3, the schema supports multi-line entries via `journal_lines`. The planner should decide: port the simplified approach first (one debit/credit field on the entry form) and store as two journal_lines rows (one debit, one credit), or implement a full multi-line form. **Recommendation: simplified approach (two lines) for Phase 3 — matches the existing JSX complexity and meets FR-04-2.**

### Recommended Project Structure (new files this phase)

```
nextjs-app/
├── app/
│   ├── (dashboard)/dashboard/
│   │   ├── invoices/page.tsx         # REPLACE scaffold — 'use client' CRUD
│   │   ├── quotes/page.tsx           # REPLACE scaffold — 'use client' CRUD
│   │   ├── payments/page.tsx         # REPLACE scaffold — read-only list
│   │   ├── accounts/page.tsx         # CREATE — tree-grouped list + CRUD
│   │   ├── journal/page.tsx          # REPLACE scaffold — double-entry form
│   │   ├── reports/page.tsx          # REPLACE scaffold — income stmt + balance sheet
│   │   ├── employees/page.tsx        # REPLACE scaffold — CRUD + dept filter
│   │   ├── departments/page.tsx      # CHECK/CREATE — CRUD
│   │   ├── leaves/page.tsx           # REPLACE scaffold — submit + approve/reject
│   │   └── payroll/page.tsx          # CREATE — generate payslip + IRG/CNAS calc
│   ├── pay/
│   │   └── [invoiceId]/page.tsx      # CREATE — public page, no auth, Stripe Elements
│   └── api/
│       ├── invoices/[id]/
│       │   ├── pdf/route.ts          # CREATE — @react-pdf/renderer renderToBuffer
│       │   ├── send/route.ts         # CREATE — Resend email with PDF attachment
│       │   └── pay/route.ts          # CREATE — Stripe PaymentIntent
│       ├── stripe/
│       │   └── webhook/route.ts      # CREATE — raw body, constructEvent, handle succeeded
│       └── payslips/[id]/
│           └── pdf/route.ts          # CREATE — @react-pdf/renderer renderToBuffer
├── components/
│   └── pdf/
│       ├── InvoicePDF.tsx            # CREATE — @react-pdf Document (NO PDFViewer)
│       └── PayslipPDF.tsx            # CREATE — @react-pdf Document (NO PDFViewer)
└── lib/
    └── utils/
        └── payroll.ts                # CREATE — calculatePayslip() pure function
```

### Anti-Patterns to Avoid

- **Using PDFViewer in server code:** `PDFViewer` is browser-only. Only `Document`, `Page`, `Text`, `View` etc. are valid in Route Handlers.
- **Reading req.json() in Stripe webhook handler:** Breaks `constructEvent()` — always `req.text()` first.
- **Forgetting to exclude webhook route from proxy.ts:** Stripe cannot authenticate — webhook hits login redirect.
- **Not adding `serverExternalPackages`:** @react-pdf/renderer crashes Next.js App Router without it.
- **Computing IRG on gross salary (not post-CNAS):** IRG applies to gross minus CNAS, not gross directly.
- **Stripe currency in cents:** `stripe.paymentIntents.create({ amount })` expects integer cents, not DZD. Multiply by 100 and round.

---

## Database Schema — Confirmed Tables

All tables below exist in live Supabase (001_schema.sql, Phase 1). No migrations needed for Phase 3 CRUD.

### Facturation Tables

**invoices**
```
id uuid PK, owner_id uuid FK auth.users, invoice_number text UNIQUE,
contact_id uuid FK contacts, company_id uuid FK companies,
status text CHECK('draft','sent','paid','overdue','cancelled'),
issue_date date, due_date date,
subtotal numeric(15,2), tax_rate numeric(5,2), tax_amount numeric(15,2), total numeric(15,2),
amount_paid numeric(15,2), notes text,
stripe_payment_intent_id text,
created_at, updated_at, deleted_at
```

**invoice_items** (cascade delete with invoice)
```
id uuid PK, invoice_id uuid FK invoices ON DELETE CASCADE,
description text, quantity numeric(10,2), unit_price numeric(15,2), total numeric(15,2)
```

**quotes**
```
id uuid PK, owner_id uuid FK, quote_number text UNIQUE,
contact_id uuid FK contacts,
status text CHECK('draft','sent','accepted','rejected'),
valid_until date, subtotal numeric, tax_rate numeric, total numeric,
converted_to_invoice_id uuid FK invoices,
created_at, updated_at, deleted_at
```

**payments**
```
id uuid PK, owner_id uuid FK, invoice_id uuid FK invoices,
amount numeric, method text CHECK('stripe','bank_transfer','cash','check'),
paid_at timestamptz, reference text, created_at
```

**Key FK join for invoice detail:** `invoices.select('*, invoice_items(*), contacts(first_name, last_name)')`
**Convert quote to invoice:** Insert new invoice row, set `quotes.converted_to_invoice_id = newInvoice.id`, set `quotes.status = 'accepted'`

### Comptabilité Tables

**accounts** (self-referencing tree)
```
id uuid PK, owner_id uuid FK,
code text, name text,
type text CHECK('asset','liability','equity','income','expense'),
parent_id uuid FK accounts (nullable),
UNIQUE(owner_id, code)
```

**journal_entries**
```
id uuid PK, owner_id uuid FK,
date date, description text,
invoice_id uuid FK invoices (nullable), payment_id uuid FK payments (nullable),
created_at
```

**journal_lines** (cascade delete with entry)
```
id uuid PK, journal_entry_id uuid FK journal_entries ON DELETE CASCADE,
account_id uuid FK accounts,
debit numeric(15,2), credit numeric(15,2), description text
```

**Key query for reports:** Join `journal_lines` → `accounts` group by `accounts.type`, sum debits/credits.
**Simplified journal entry insert:** Create one `journal_entries` row, then two `journal_lines` rows (one debit, one credit).

### RH Tables

**departments**
```
id uuid PK, owner_id uuid FK,
name text, created_at, updated_at, deleted_at
```

**employees**
```
id uuid PK, owner_id uuid FK,
full_name text, email text, job_title text,
department_id uuid FK departments,
base_salary numeric(15,2),
start_date date,
status text CHECK('active','inactive'),
created_at, updated_at, deleted_at
```

**Note:** Old frontend uses `first_name`/`last_name` separately but schema has `full_name` only. The port must use `full_name` as a single field, not two fields.

**leave_requests**
```
id uuid PK, owner_id uuid FK,
employee_id uuid FK employees (NOT NULL),
type text CHECK('annual','sick','unpaid','other'),
start_date date, end_date date,
status text CHECK('pending','approved','rejected'),
approved_by uuid FK auth.users,
notes text, created_at, updated_at
```

**Note:** No `deleted_at` on `leave_requests` — use hard filtering by status instead of soft delete.

**payslips**
```
id uuid PK, owner_id uuid FK,
employee_id uuid FK employees,
period_month integer CHECK(1-12), period_year integer,
gross_salary numeric, cnas_deduction numeric, irg_deduction numeric, net_salary numeric,
generated_at timestamptz,
UNIQUE(employee_id, period_month, period_year)
```

**UNIQUE constraint:** The DB enforces one payslip per employee per month/year. The payroll page should check if a payslip already exists before attempting insert (upsert or check-then-insert).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF converter | @react-pdf/renderer renderToBuffer | Handles fonts, pagination, A4 layout, DZD currency formatting |
| Stripe signature verification | Manual HMAC comparison | stripe.webhooks.constructEvent() | Handles timing attacks, encoding, secret rotation |
| Email delivery | Direct SMTP with nodemailer | Resend SDK | No SMTP config, PDF attachment support, Vercel-compatible |
| Payroll brackets | Hard-coded if-else in component | lib/utils/payroll.ts pure function | Testable, reusable in payslip PDF component + page + Vitest unit tests |
| Invoice number sequence | Custom auto-increment | PostgreSQL sequence or RPC | Race conditions on concurrent inserts; use DB-level sequence |

**Key insight:** The three hand-rollable items that cause the most bugs are PDF layout, webhook signature forgery, and payroll bracket calculation. All three have well-maintained solutions.

---

## Common Pitfalls

### Pitfall 1: Stripe Webhook Fails Signature Verification
**What goes wrong:** `Stripe: No signatures found matching the expected signature` error in production
**Why it happens:** Middleware or Next.js body parsing reads the stream before the webhook handler sees it; `req.json()` instead of `req.text()`
**How to avoid:** Always `const body = await req.text()` as the first line in the webhook Route Handler. Never `req.json()`.
**Warning signs:** Webhook works in Stripe CLI local test but fails in production

### Pitfall 2: Stripe Webhook 401 from proxy.ts
**What goes wrong:** Stripe POSTs to `/api/stripe/webhook` → proxy.ts redirects to `/login` → Stripe marks webhook failed
**Why it happens:** proxy.ts protects all routes by default
**How to avoid:** Add `/api/stripe/webhook` to the public matcher in `proxy.ts`
**Warning signs:** Stripe Dashboard shows webhook attempts returning 3xx redirect

### Pitfall 3: @react-pdf/renderer Crashes App Router
**What goes wrong:** Server crash or "ba.Component is not a constructor" at startup
**Why it happens:** Next.js bundles @react-pdf/renderer into its own module bundle which breaks the React reconciler
**How to avoid:** Add `serverExternalPackages: ['@react-pdf/renderer']` to `next.config.ts` before installing the package
**Warning signs:** Server crashes immediately on import of renderToBuffer

### Pitfall 4: PDFViewer Used in Route Handler
**What goes wrong:** "ReferenceError: window is not defined" in Route Handler
**Why it happens:** PDFViewer is a browser-only component for displaying PDFs in `<iframe>`. It's imported from the same package but must never be used server-side.
**How to avoid:** Route Handler PDF components import only `Document`, `Page`, `Text`, `View`, `StyleSheet`, `Image`, `Font` — never `PDFViewer`
**Warning signs:** Works in development (sometimes), crashes in production serverless

### Pitfall 5: payslips Unique Constraint Violation
**What goes wrong:** Supabase insert error "duplicate key value violates unique constraint payslips_employee_id_period_month_period_year_key"
**Why it happens:** User clicks "Generate" twice for the same month, or a payslip already exists
**How to avoid:** Check if payslip exists before inserting. Use `.upsert()` with `onConflict: 'employee_id,period_month,period_year'` or display existing payslip instead
**Warning signs:** Error appears on second click of generate button

### Pitfall 6: employees.full_name vs first_name/last_name
**What goes wrong:** TypeScript errors or undefined fields when porting Employees.jsx
**Why it happens:** Old JSX uses `form.first_name`/`form.last_name`; schema has single `full_name` column
**How to avoid:** Port the form to use a single `full_name` input field. Render as `{employee.full_name}` not `{e.first_name} {e.last_name}`
**Warning signs:** TypeScript showing "Property 'first_name' does not exist on type 'employees'"

### Pitfall 7: DZD Currency in Stripe (not EUR/USD)
**What goes wrong:** Stripe rejects PaymentIntent with `currency not supported` or payment form shows wrong currency
**Why it happens:** DZD (Algerian Dinar) may not be supported by Stripe depending on the merchant account's country
**How to avoid:** Verify in Stripe Dashboard that DZD is enabled for the account. If DZD is not supported, use EUR with a fixed conversion rate and note this as a known limitation. This is a LOW confidence area — validate during Plan 2 implementation.
**Warning signs:** `stripe.paymentIntents.create` returns currency error

### Pitfall 8: Quote → Invoice Conversion Race Condition
**What goes wrong:** Converting a quote creates an invoice but the quote's `converted_to_invoice_id` is not set atomically
**Why it happens:** Two-step client-side operation: insert invoice, then update quote
**How to avoid:** Wrap in a Supabase RPC if atomicity is required, or use a server-side Route Handler that does both operations
**Warning signs:** Invoice created but quote still shows as unconverted on refresh

---

## Code Examples

### Invoice List with Status Filter (Facturation pattern)

```typescript
// Source: Established Phase 2 pattern + invoices schema
const { data: invoices } = useQuery({
  queryKey: ['invoices', statusFilter],
  queryFn: async () => {
    let q = supabase
      .from('invoices')
      .select('id, invoice_number, status, total, due_date, created_at, contacts(first_name, last_name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    return q
  },
})
```

### Journal Entry + Lines Insert

```typescript
// Source: Schema design — two-step insert (entry, then lines)
const createJournalEntry = async (form: JournalForm) => {
  const { data: entry } = await supabase
    .from('journal_entries')
    .insert({ description: form.description, date: form.date, owner_id: userId })
    .select('id')
    .single()

  await supabase.from('journal_lines').insert([
    { journal_entry_id: entry!.id, account_id: form.debitAccountId, debit: form.amount, credit: 0 },
    { journal_entry_id: entry!.id, account_id: form.creditAccountId, debit: 0, credit: form.amount },
  ])
}
```

### Accounts Grouped by Type (Chart of Accounts)

```typescript
// Source: Schema design — group client-side after fetch
const { data: accounts } = useQuery({
  queryKey: ['accounts'],
  queryFn: () => supabase.from('accounts').select('*').order('code'),
})

// Group by type in render
const grouped = (accounts ?? []).reduce((acc, a) => {
  if (!acc[a.type]) acc[a.type] = []
  acc[a.type].push(a)
  return acc
}, {} as Record<string, typeof accounts>)
```

### Leave Request Approval (RLS-aware)

```typescript
// Source: leave_requests schema — approved_by FK requires auth.users id
const reviewMut = useMutation({
  mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
    const { data: { user } } = await supabase.auth.getUser()
    return supabase.from('leave_requests')
      .update({ status, approved_by: user!.id })
      .eq('id', id)
  },
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['leaves'] }); toast.success('Statut mis à jour') },
})
```

### Payslip Generation with Duplicate Guard

```typescript
// Source: payslips UNIQUE constraint (employee_id, period_month, period_year)
const generatePayslip = async (employeeId: string, month: number, year: number) => {
  const { data: employee } = await supabase
    .from('employees').select('base_salary').eq('id', employeeId).single()

  const calc = calculatePayslip(employee!.base_salary)  // from lib/utils/payroll.ts

  const { error } = await supabase.from('payslips').upsert({
    employee_id: employeeId,
    period_month: month,
    period_year: year,
    gross_salary: calc.grossSalary,
    cnas_deduction: calc.cnasDeduction,
    irg_deduction: calc.irgDeduction,
    net_salary: calc.netSalary,
    owner_id: userId,
  }, { onConflict: 'employee_id,period_month,period_year' })

  if (error) toast.error('Erreur génération fiche de paie')
  else toast.success('Fiche de paie générée')
}
```

---

## Shared Components Available (Phase 2)

All of these are already built and importable. Phase 3 uses them exactly as Phase 2 did.

| Component | Import | What It Provides |
|-----------|--------|-----------------|
| PageShell | `@/components/ui/PageShell` | Page wrapper with title, icon, action button, toolbar slot, responsive table card |
| TableHead | `@/components/ui/PageShell` | Consistent `<thead>` with last-column right-align |
| TableRow | `@/components/ui/PageShell` | Hover-state `<tr>` with border |
| EmptyRow | `@/components/ui/PageShell` | Full-width empty state with icon + message |
| Badge | `@/components/ui/PageShell` | Colored pill badge (pass colorClass directly) |
| Modal | `@/components/ui/Modal` | Fixed overlay modal, size variants: sm/md/lg/xl, backdrop dismiss |
| StatsCard | `@/components/ui/StatsCard` | KPI card with icon, value, label, color theme |

**Badge colors for status fields:**
```typescript
// Established pattern from contacts/deals pages
const INVOICE_STATUS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-100 text-blue-700',
  paid:      'bg-green-100 text-green-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
}

const LEAVE_STATUS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
```

---

## Wave Structure — Parallelization Analysis

No CONTEXT.md exists for this phase, so plan structure is at Claude's discretion. Based on dependencies:

```
Plan 03-01: Facturation UI (invoices, quotes, payments pages)
  - Pure UI port, zero new packages
  - Depends on: Phase 2 complete (Modal, PageShell ready)

Plan 03-02: Route Handlers — PDF + Stripe + Email
  - New packages: @react-pdf/renderer, stripe, resend, @stripe/stripe-js, @stripe/react-stripe-js
  - New config: serverExternalPackages in next.config.ts
  - New components: InvoicePDF.tsx, PayslipPDF.tsx
  - Depends on: invoices table (Plan 01 or earlier)

Plan 03-03: Comptabilité UI (accounts, journal, reports pages)
  - Pure UI port, zero new packages
  - Can be parallelized with Plan 01 and 04 — all independent

Plan 03-04: RH/Paie UI (employees, departments, leaves, payroll pages)
  - New util: lib/utils/payroll.ts
  - Can be parallelized with Plan 01 and 03

Plan 03-05: UAT — human verification of all three modules + Stripe test payment
  - Depends on: Plans 01-04 complete
```

**Recommended execution order:** 03-01 → 03-02 (install packages first) → 03-03 and 03-04 (can run in any order) → 03-05 UAT.

**Plans 03-01, 03-03, 03-04 are all pure UI ports with no inter-dependencies.** They can be planned and executed independently after 03-02 installs packages.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `serverComponentsExternalPackages` (Next.js 13/14 experimental) | `serverExternalPackages` (stable, Next.js 15+) | Config key changed — use `serverExternalPackages` not `experimental.serverComponentsExternalPackages` |
| @react-pdf/renderer < 4.1.0 | @react-pdf/renderer >= 4.1.0 | React 19 support only in 4.1.0+; current project uses React 19.2.3 so must install 4.1.x+ |
| Pages Router webhook handler using `req.body` | App Router webhook handler using `await req.text()` | Breaking change — pages router had req.body; App Router auto-parses, must use text() |
| Next.js params as sync object | Next.js 16 params as `Promise<{ id: string }>` | Must `await params` in dynamic Route Handlers — established since Next.js 15 |

---

## Open Questions

1. **DZD support in Stripe**
   - What we know: Stripe PaymentIntents require a supported currency; DZD is not universally supported
   - What's unclear: Whether the project's Stripe account (STRIPE_SECRET_KEY not yet set) is configured for DZD
   - Recommendation: Plan 03-02 should test with `currency: 'dzd'` first. If Stripe rejects it, fall back to `'eur'` with conversion note. Flag this in Plan 03-02 verification checklist.

2. **Invoice number auto-increment strategy**
   - What we know: Schema has `invoice_number text UNIQUE` — no PostgreSQL sequence defined in migration
   - What's unclear: Whether a sequence was created separately or if the old system generated numbers app-side
   - Recommendation: Use a Supabase RPC or generate with timestamp prefix in Route Handler (e.g., `INV-${year}-${padded_count}`). A simple approach: query MAX invoice_number, increment. Thread-safe approach: use a PostgreSQL sequence. Document as a Plan 03-01 task.

3. **proxy.ts public routes for Stripe webhook + public pay page**
   - What we know: proxy.ts protects all authenticated routes; webhook and pay page must be public
   - What's unclear: The exact current public matcher in proxy.ts
   - Recommendation: Plan 03-02 must read current proxy.ts and add `/api/stripe/webhook` and `/pay/:path*` to the public matcher. This is a required task, not optional.

---

## Sources

### Primary (HIGH confidence)
- `nextjs-app/supabase/migrations/001_schema.sql` — Complete schema for all 20 tables, confirmed live
- `nextjs-app/components/ui/Modal.tsx`, `PageShell.tsx`, `StatsCard.tsx` — Shared components, confirmed exists
- `nextjs-app/app/(dashboard)/dashboard/contacts/page.tsx` — Phase 2 CRUD pattern, confirmed working
- `nextjs-app/package.json` — Installed dependencies confirmed
- `react-pdf.org/compatibility` — @react-pdf/renderer React 19 support confirmed (v4.1.0+)

### Secondary (MEDIUM confidence)
- https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/ — Stripe PaymentIntent + webhook pattern for Next.js App Router, 2025 dated
- https://dev.to/thekarlesi/how-to-handle-stripe-and-paystack-webhooks-in-nextjs-the-app-router-way-5bgi — `req.text()` for raw body webhook verification
- https://remotepeople.com/countries/algeria/employer-of-record/payroll-tax/ — IRG brackets + CNAS 9% (cross-verified with rivermate.com)
- https://rivermate.com/guides/algeria/taxes — IRG brackets cross-verification

### Tertiary (LOW confidence)
- GitHub issues diegomura/react-pdf #3074, #2994 — React 19 resolves renderToBuffer issues; not officially documented as resolved

---

## Metadata

**Confidence breakdown:**
- Standard stack (UI pages): HIGH — All packages already installed, schema confirmed, pattern established
- Standard stack (PDF/Stripe/Email): MEDIUM — Libraries confirmed, patterns verified, but not yet tested in this codebase
- Architecture (porting pattern): HIGH — Directly validated from Phase 2 working code
- Database schema: HIGH — Read directly from 001_schema.sql (source of truth)
- Algerian payroll rates: MEDIUM — Multiple sources agree (remotepeople, rivermate, playroll); rates are stable
- Stripe webhook pattern: MEDIUM — Verified from 2025 guides, official Stripe docs confirm req.text()

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days — stack is stable; Stripe SDK and @react-pdf may have minor patches)
