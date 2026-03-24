# Phase 2: Port CRM + Analytics UI - Research

**Researched:** 2026-03-24
**Domain:** Next.js App Router CRUD, TanStack Query v5, @dnd-kit, recharts, Supabase client patterns
**Confidence:** HIGH

---

## Summary

Phase 2 ports the existing React JSX CRM pages (Contacts, Companies, Deals, Tasks) and the Analytics dashboard from Django/axios to Next.js App Router with Supabase client queries. The existing pages are already well-structured with TanStack Query v5 — the primary transformation is replacing `crmAPI.*()` axios calls with `supabase.from('table').select/insert/update()` calls.

The biggest technical decision involves the Kanban pipeline view. The existing Deals.jsx uses a plain HTML select dropdown to change stage — it does NOT use drag-and-drop at all. The roadmap calls for `@dnd-kit/core` for "real" drag-and-drop. `@dnd-kit/core` 6.3.1 and `@dnd-kit/sortable` 10.0.0 are NOT installed and require `npm install --legacy-peer-deps` with React 19 (peer dep declares `>=16.8.0` which npm may flag). recharts 3.8.0 explicitly supports React 19 (`^16.8.0 || ^17 || ^18 || ^19`) and is also not installed.

The schema has a critical difference from the legacy frontend: deals use `stage_id` (FK to `pipeline_stages` table with `name` + `position`) rather than a string enum. All existing scaffold pages are server components using `createClient()` from `lib/supabase/server`. Interactive pages (modals, search, mutations) must be converted to `"use client"` components using `createClient()` from `lib/supabase/client`.

**Primary recommendation:** Convert all CRM pages to `"use client"` components wrapping TanStack Query (matching the source JSX pattern). Port shared components (DataTable, Modal, StatsCard) directly to TypeScript. Install recharts with `npm install recharts` and @dnd-kit with `npm install --legacy-peer-deps @dnd-kit/core @dnd-kit/sortable`. Use `textSearch('search_vector', query, { type: 'websearch', config: 'simple' })` for full-text search. Use parallel `count: 'exact', head: true` queries for analytics KPIs.

---

## Standard Stack

### Already Installed (no install needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @tanstack/react-query | ^5.90.21 | Server state, mutations, cache invalidation | v5 API confirmed installed |
| @supabase/supabase-js | ^2.98.0 | Supabase client queries | createBrowserClient for client components |
| @supabase/ssr | ^0.9.0 | Server-side Supabase client | createServerClient already wired |
| sonner | ^2.0.7 | Toast notifications | Already wired in layout |
| zod | ^4.3.6 | Form validation schemas | Use for create/update payloads |
| lucide-react | ^0.577.0 | Icons | Already used in scaffold pages |
| clsx | ^2.1.1 | Conditional class joining | Available |

### Needs Installation

| Library | Version | Purpose | Install Command |
|---------|---------|---------|-----------------|
| recharts | ^3.8.0 | Charts for Analytics dashboard | `npm install recharts` |
| @dnd-kit/core | ^6.3.1 | Drag-and-drop primitives | `npm install --legacy-peer-deps @dnd-kit/core @dnd-kit/sortable` |
| @dnd-kit/sortable | ^10.0.0 | Sortable list/column helpers | (same command) |

### Peer Dependency Notes

**recharts 3.8.0:** Explicitly declares `react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"` — React 19 is fully supported. Install without flags.

**@dnd-kit/core 6.3.1:** Declares `react: ">=16.8.0"` — this technically includes React 19 but npm 7+ may warn. Use `--legacy-peer-deps`. The library functions correctly with React 19 (functional components, hooks only, no deprecated APIs). Confirmed by community usage patterns.

**Installation:**
```bash
# In nextjs-app/
npm install recharts
npm install --legacy-peer-deps @dnd-kit/core @dnd-kit/sortable
```

---

## Architecture Patterns

### Recommended Project Structure for Phase 2

```
nextjs-app/
├── app/(dashboard)/dashboard/
│   ├── contacts/
│   │   ├── page.tsx              # "use client" - list + modal
│   │   └── [id]/page.tsx         # "use client" - detail
│   ├── companies/
│   │   ├── page.tsx              # "use client" - list + modal
│   │   └── [id]/page.tsx         # "use client" - detail
│   ├── deals/
│   │   ├── page.tsx              # "use client" - kanban board
│   │   └── [id]/page.tsx         # "use client" - detail
│   ├── tasks/
│   │   └── page.tsx              # "use client" - list + toggle
│   └── analytics/
│       └── page.tsx              # "use client" - KPIs + charts
├── components/
│   ├── ui/
│   │   ├── PageShell.tsx         # EXISTS - keep as-is
│   │   ├── Modal.tsx             # PORT from frontend/components/shared/Modal.jsx
│   │   ├── DataTable.tsx         # PORT from frontend/components/shared/DataTable.jsx
│   │   └── StatsCard.tsx         # PORT from frontend/components/shared/StatsCard.jsx
│   └── crm/
│       ├── ContactForm.tsx       # Modal form (extracted from page)
│       ├── CompanyForm.tsx       # Modal form
│       ├── DealForm.tsx          # Modal form
│       ├── TaskForm.tsx          # Modal form
│       └── KanbanBoard.tsx       # Drag-and-drop pipeline view
└── lib/
    └── supabase/
        ├── client.ts             # EXISTS - createBrowserClient
        └── server.ts             # EXISTS - createServerClient
```

### Pattern 1: "use client" Page with TanStack Query + Supabase Mutation

**What:** All CRM list pages are client components. Data fetching via useQuery, mutations via useMutation. Supabase browser client used throughout.

**When to use:** Any page with search input, modals, inline actions (toggle, delete).

**Example (contacts page pattern):**
```typescript
// app/(dashboard)/dashboard/contacts/page.tsx
'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ContactsPage() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', search],
    queryFn: async () => {
      let q = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, company_id, companies(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (search.trim()) {
        q = q.textSearch('search_vector', search, { type: 'websearch', config: 'simple' })
      }

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })

  const createMut = useMutation({
    mutationFn: async (form: ContactInsert) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('contacts').insert({ ...form, owner_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact créé')
      setModal(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
  // ...
}
```

### Pattern 2: Dynamic Detail Page ([id] route)

**What:** Server or client component at `[id]/page.tsx`. In Next.js 16, `params` is `Promise<{ id: string }>` and must be awaited.

**When to use:** Contact detail, company detail, deal detail pages.

**Example:**
```typescript
// app/(dashboard)/dashboard/contacts/[id]/page.tsx
'use client'
import { use } from 'react'

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params) // use() for client components
  // OR: for server component: const { id } = await params
  // ...
}
```

**CRITICAL:** In Next.js 16, `params` is a Promise. Server components use `await params`, client components use React's `use(params)` hook.

### Pattern 3: Supabase Join Query

**What:** Fetch related data in a single query using PostgREST embed syntax.

**Example (contacts with company name):**
```typescript
const { data } = await supabase
  .from('contacts')
  .select('*, companies(name)')   // embeds company.name
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

**Example (deals with pipeline_stages):**
```typescript
const { data } = await supabase
  .from('deals')
  .select('*, pipeline_stages(name, position)')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

### Pattern 4: Soft Delete (Never Hard Delete)

**What:** All CRM mutations that "delete" a record set `deleted_at`, never call `.delete()`.

**Why:** Decision #6 from STATE.md — soft deletes on all data tables for audit trails.

```typescript
// Soft delete pattern
await supabase
  .from('contacts')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id)

// Always filter soft-deleted rows in queries
.is('deleted_at', null)
```

### Pattern 5: Pipeline Kanban with @dnd-kit/sortable

**What:** Deals grouped by pipeline_stage, draggable between columns. On drop, update `stage_id` in Supabase.

**SCHEMA NOTE:** The schema uses `stage_id` (UUID FK to `pipeline_stages`) NOT a string enum. The legacy frontend used a string enum. Pipeline stages must be fetched from the `pipeline_stages` table and seeded if empty.

**Example:**
```typescript
// components/crm/KanbanBoard.tsx
'use client'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="card p-3 cursor-grab">
      {/* deal content */}
    </div>
  )
}

function KanbanBoard({ deals, stages, onDrop }: KanbanProps) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onDrop(active.id as string, over.id as string) // deal.id -> new stage.id
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage.id} className="shrink-0 w-64">
            <SortableContext
              items={deals.filter(d => d.stage_id === stage.id).map(d => d.id)}
              strategy={verticalListSortingStrategy}
            >
              {deals.filter(d => d.stage_id === stage.id).map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  )
}
```

### Pattern 6: Full-Text Search with tsvector

**What:** The schema has `search_vector tsvector generated always` on contacts, companies, deals. Use `.textSearch()` with `config: 'simple'` (matching the 'simple' tsvector config in the schema — critical for Algerian names).

```typescript
// Full-text search on pre-indexed tsvector column
const { data } = await supabase
  .from('contacts')
  .select('*')
  .is('deleted_at', null)
  .textSearch('search_vector', searchQuery, {
    type: 'websearch',  // handles raw user input gracefully, no syntax errors
    config: 'simple',   // MUST match the 'simple' config in schema tsvector
  })
```

**CRITICAL:** The schema uses `to_tsvector('simple', ...)` — the config in `.textSearch()` MUST be `'simple'` to match. Using `'english'` will produce zero results because the stored vector was built with 'simple'.

### Pattern 7: Analytics Aggregation (No GROUP BY via supabase-js)

**What:** Supabase JS client does not support GROUP BY natively. Use parallel count queries + value sums for KPI cards. Use RPC for complex aggregations (deals by stage).

**Method A — Parallel count queries (KPI cards):**
```typescript
// Multiple parallel counts for analytics KPIs
const [
  { count: totalContacts },
  { count: totalCompanies },
  { count: openDeals },
  wonDeals,
] = await Promise.all([
  supabase.from('contacts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  supabase.from('companies').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  supabase.from('deals').select('*', { count: 'exact', head: true }).is('deleted_at', null).not('stage_id', 'is', null),
  supabase.from('deals').select('value').is('deleted_at', null),
])
const pipelineValue = wonDeals.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
```

**Method B — Deals by stage (join query):**
```typescript
// Fetch deals with stage info, group client-side
const { data: deals } = await supabase
  .from('deals')
  .select('stage_id, value, pipeline_stages(name, position)')
  .is('deleted_at', null)

// Group client-side
const byStage = deals?.reduce((acc, d) => {
  const stageName = d.pipeline_stages?.name ?? 'Sans étape'
  acc[stageName] = (acc[stageName] || 0) + 1
  return acc
}, {} as Record<string, number>)
```

### Pattern 8: recharts Chart Components

**What:** recharts must be wrapped in `"use client"` components. Use `dynamic()` import if analytics page becomes heavy.

**Example (BarChart for deals by stage):**
```typescript
'use client'
// components/analytics/DealsByStageChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function DealsByStageChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

**Dynamic import (if bundle size is concern):**
```typescript
// In page.tsx
const DealsByStageChart = dynamic(
  () => import('@/components/analytics/DealsByStageChart').then(m => m.DealsByStageChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded-xl" /> }
)
```

### Pattern 9: Modal Component (Port from JSX)

**What:** The existing Modal.jsx is a clean, simple implementation. Port directly to TypeScript — minimal changes.

```typescript
// components/ui/Modal.tsx
'use client'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full mx-4 ${sizes[size]}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Using server component `createClient` from `lib/supabase/server` in "use client" pages:** Will error at runtime. "use client" pages MUST use `lib/supabase/client`.
- **Calling `supabase.from().delete()` for CRM records:** Violates soft-delete requirement (STATE.md Decision #6). Always set `deleted_at`.
- **Forgetting `.is('deleted_at', null)` in queries:** Soft-deleted records will appear in lists.
- **Using `config: 'english'` in textSearch:** Schema uses `'simple'` tsvector config. Mismatch = zero results.
- **Using `params.id` directly in Next.js 16:** `params` is a Promise. Must `await params` (server) or `use(params)` (client).
- **Importing recharts at top level in a server component:** recharts uses browser APIs and will crash at SSR. Use `"use client"` directive on chart components.
- **Creating pipeline stages as string enum in UI:** The deals table uses `stage_id` UUID FK, not a string enum. Stages come from the `pipeline_stages` table and must be seeded/created by the user or via a seed migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop Kanban | Custom mousedown/touch event handlers | @dnd-kit/core + @dnd-kit/sortable | Accessibility, touch, pointer events, keyboard nav are complex edge cases |
| Bar/line charts | SVG paths manually | recharts | D3 math, responsive containers, tooltips are 1000+ lines |
| Toast notifications | Custom state-managed toast stack | sonner (already installed) | Already wired in layout, just call `toast.success()` |
| Form validation | Manual `if (!field)` checks | Native HTML `required` + Zod for API payload | Existing JSX pattern uses native required; add Zod for insert payload types |
| Modal focus trap | tabIndex management | Native pattern (existing Modal.jsx works) | Existing Modal.jsx is simple and functional; no library needed |
| Full-text search | ILIKE queries | Supabase `textSearch()` on `search_vector` | tsvector indexes are orders of magnitude faster; already indexed |

**Key insight:** The existing React JSX code is already well-architected. The primary job is a mechanical port — replace axios with supabase-js, add TypeScript types. Avoid over-engineering.

---

## Common Pitfalls

### Pitfall 1: owner_id Must Be Set on INSERT

**What goes wrong:** Insert fails with RLS violation (`new row violates row-level security policy`) or `null` constraint violation.

**Why it happens:** Every CRM table has `owner_id NOT NULL references auth.users(id)`. RLS insert policies require `owner_id = auth.uid()`. The existing Django backend set this automatically; now the client must provide it.

**How to avoid:** Always fetch `user.id` before inserting:
```typescript
const { data: { user } } = await supabase.auth.getUser()
await supabase.from('contacts').insert({ ...form, owner_id: user!.id })
```

**Warning signs:** 403 error or `null value in column "owner_id"` in Supabase dashboard logs.

### Pitfall 2: Pipeline Stages Table Must Be Seeded

**What goes wrong:** Deals page renders empty Kanban because `pipeline_stages` table has zero rows for the user. The legacy frontend hardcoded stage names as string enums — the new schema requires rows in `pipeline_stages`.

**Why it happens:** The schema uses a relational `stage_id` FK. New Supabase projects have no seed stages.

**How to avoid:** Either:
1. Seed default stages via a Supabase migration or SQL in the dashboard
2. Have the deals page auto-create default stages on first load if `pipeline_stages` is empty for the user

**Recommended seed SQL:**
```sql
-- Run once in Supabase SQL editor (replace 'USER_UUID' with actual admin user UUID)
INSERT INTO pipeline_stages (owner_id, name, position) VALUES
  ('USER_UUID', 'Prospect', 0),
  ('USER_UUID', 'Qualifié', 1),
  ('USER_UUID', 'Proposition', 2),
  ('USER_UUID', 'Négociation', 3),
  ('USER_UUID', 'Gagné', 4),
  ('USER_UUID', 'Perdu', 5);
```

### Pitfall 3: TanStack Query v5 API Changes

**What goes wrong:** `useQuery` options that worked in v4 silently fail or cause TypeScript errors in v5.

**Why it happens:** v5 changed the API — `queryKey` is positional in function call, `onSuccess/onError` moved from useQuery to useMutation.

**How to avoid:** Use v5 patterns:
```typescript
// v5 correct pattern
const createMut = useMutation({
  mutationFn: async (form) => { /* ... */ },
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); toast.success('Créé') },
  onError: (error) => toast.error(error.message),
})
// Invalidate with object form:
qc.invalidateQueries({ queryKey: ['contacts'] })  // v5
// NOT: qc.invalidateQueries(['contacts'])           // v4 (still works but deprecated)
```

**Warning signs:** TypeScript errors on `onSuccess` inside `useQuery`, or `invalidateQueries` receiving an array directly.

### Pitfall 4: recharts Server-Side Rendering Crash

**What goes wrong:** `ReferenceError: window is not defined` or similar SSR errors when importing recharts.

**Why it happens:** recharts uses browser globals. Next.js tries to SSR all components unless explicitly prevented.

**How to avoid:** Add `'use client'` to any file that imports recharts components. If the analytics page itself is `'use client'`, recharts imports at the top level are fine. Do NOT import recharts in server components.

### Pitfall 5: Supabase Browser Client Created Multiple Times

**What goes wrong:** Memory leaks, multiple WebSocket connections, warning in console.

**Why it happens:** Calling `createBrowserClient()` at the component level creates a new instance on every render.

**How to avoid:** The project's `lib/supabase/client.ts` already wraps `createBrowserClient` in a function — but this function creates a new instance each call. Import and call it once at module level or use the singleton pattern:

```typescript
// Option A: module-level singleton (simplest)
const supabase = createClient()  // at module scope, outside component
export default function ContactsPage() { ... }

// Option B: useMemo inside component (if client must be inside component)
const supabase = useMemo(() => createClient(), [])
```

The `@supabase/ssr` `createBrowserClient` handles deduplication internally when called multiple times with same URL/key, so Option A is safest.

### Pitfall 6: PageShell's onAction is Client-Side Only

**What goes wrong:** `PageShell` has an `onAction` prop for the "Ajouter" button, but it fires a callback. If the page is a server component, you cannot pass a function prop to `PageShell` because functions cannot cross the server/client boundary.

**Why it happens:** PageShell is a shared component that renders a button calling `onAction()`. Server components cannot pass event handlers.

**How to avoid:** All pages in Phase 2 that have modals MUST be `"use client"` components. The `onAction` prop then works naturally. The existing scaffold pages (server components) use `PageShell` with `onAction` missing — they'll just show a disabled "Ajouter" button, which is correct until converted to client components.

---

## Code Examples

Verified patterns from official sources and project codebase:

### Supabase Count Query for Analytics KPIs

```typescript
// Source: https://supabase.com/docs/reference/javascript/select
const { count: totalContacts, error } = await supabase
  .from('contacts')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null)
// count is a number, no data rows returned (efficient)
```

### Supabase Soft Delete

```typescript
// Source: STATE.md Decision #6
const { error } = await supabase
  .from('contacts')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id)
```

### textSearch on tsvector column with 'simple' config

```typescript
// Source: https://supabase.com/docs/guides/database/full-text-search
// config: 'simple' MUST match the tsvector 'simple' config in 001_schema.sql
const { data } = await supabase
  .from('contacts')
  .select('id, first_name, last_name, email, phone')
  .is('deleted_at', null)
  .textSearch('search_vector', userQuery, { type: 'websearch', config: 'simple' })
```

### Next.js 16 async params in client component

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
'use client'
import { use } from 'react'

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // ...
}
```

### @dnd-kit basic drag-end handler to update stage_id

```typescript
// Source: https://docs.dndkit.com (dndkit.com)
import { DndContext, DragEndEvent } from '@dnd-kit/core'

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return
  const dealId = active.id as string
  const newStageId = over.id as string
  updateStageMut.mutate({ dealId, stageId: newStageId })
}
```

### TanStack Query v5 invalidation (object form)

```typescript
// Source: https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation
qc.invalidateQueries({ queryKey: ['contacts'] })
qc.invalidateQueries({ queryKey: ['contacts', search] })
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `crmAPI.getContacts()` (axios to Django) | `supabase.from('contacts').select()` | Direct DB query via RLS |
| String enum for deal stages | `stage_id` UUID FK to `pipeline_stages` table | More flexible, requires seeding |
| `qc.invalidateQueries(['contacts'])` (v4) | `qc.invalidateQueries({ queryKey: ['contacts'] })` (v5) | Object form required in v5 |
| `params.id` in Next.js 14/15 | `(await params).id` or `use(params).id` in Next.js 16 | params is now a Promise |
| `crmAPI.dashboard()` Django aggregation | Parallel `count: 'exact', head: true` queries | No GROUP BY support needed |

---

## Critical Schema Differences vs. Legacy Frontend

This section is essential — the source JSX assumes the old Django/MongoDB schema. The new Supabase schema differs:

| Legacy (frontend JSX) | New (Supabase schema) | Impact |
|-----------------------|-----------------------|--------|
| `deal.stage` = string ('prospect', 'won', etc.) | `deal.stage_id` = UUID FK to `pipeline_stages` | Kanban must join `pipeline_stages`, use stage.id not stage.name |
| `deal.name` | `deal.title` | Field rename — column is `title` in Supabase |
| `task.is_done` | `task.completed` | Field rename |
| `task.priority` field exists | `tasks` table has NO `priority` column in schema | Priority field must be omitted or schema must be altered |
| `contact.company.name` (nested object from Django) | `contacts.companies(name)` (PostgREST embed) | Query syntax changes |
| Django `results` pagination envelope | Supabase returns array directly | No `.results` unwrap needed |

---

## Open Questions

1. **Pipeline stages seeding strategy**
   - What we know: `pipeline_stages` table has zero rows in fresh Supabase project; deals page will show empty Kanban.
   - What's unclear: Should a migration seed default stages for the admin user, or should the deals page auto-create them on first render?
   - Recommendation: Add a migration `002_seed_stages.sql` with default stages OR add first-load auto-seed logic in the deals page component. The migration approach is cleaner and avoids UI complexity.

2. **tasks table missing `priority` column**
   - What we know: `frontend/src/pages/crm/Tasks.jsx` uses `priority` field (high/medium/low). The `001_schema.sql` tasks table does NOT have a `priority` column.
   - What's unclear: Was this intentionally omitted or an oversight in the schema?
   - Recommendation: Either (a) add `priority text check (priority in ('high','medium','low')) default 'medium'` to the tasks table via a new migration, or (b) omit priority from the ported tasks page. Adding priority is the better UX choice — it was present in the original and requires only a small migration.

3. **Global search UI component location**
   - What we know: ROADMAP.md says "Header search bar → Supabase textSearch() on contacts, companies, deals (union results)". Global search is in the Topbar.
   - What's unclear: The Topbar.tsx is a server component context — search needs to be a client component. Is Topbar.tsx already "use client"?
   - Recommendation: Check `nextjs-app/components/layout/Topbar.tsx`. If server component, extract a `GlobalSearchInput` client component to embed within Topbar for the search input + results dropdown.

---

## Sources

### Primary (HIGH confidence)
- Project files read directly: `frontend/src/pages/crm/*.jsx`, `nextjs-app/package.json`, `nextjs-app/supabase/migrations/001_schema.sql`, `nextjs-app/lib/types/database.types.ts`, `nextjs-app/components/ui/PageShell.tsx`, `nextjs-app/lib/supabase/client.ts`
- `registry.npmjs.org/@dnd-kit/core/latest` — version 6.3.1, peer dep `react: >=16.8.0`
- `registry.npmjs.org/recharts/latest` — version 3.8.0, peer dep `react: ^16|^17|^18|^19`
- `registry.npmjs.org/@dnd-kit/sortable/latest` — version 10.0.0
- https://supabase.com/docs/guides/database/full-text-search — textSearch API with type/config options
- https://dev.to/peterlidee/async-params-and-searchparams-in-next-16-5ge9 — Next.js 16 async params pattern

### Secondary (MEDIUM confidence)
- https://github.com/orgs/supabase/discussions/19517 — GROUP BY limitation confirmed, RPC workaround
- https://supabase.com/docs/reference/javascript/select — count: exact, head: true pattern
- https://medium.com/@zachshallbetter/resolving-react-19-dependency-conflicts-without-downgrading-ee0a808af2eb — --legacy-peer-deps workaround for React 19 peer deps

### Tertiary (LOW confidence)
- Community reports of @dnd-kit working with React 19 via --legacy-peer-deps (not from official dnd-kit release notes)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from npm registry and package.json
- Architecture patterns: HIGH — directly derived from reading source JSX + scaffold pages + schema
- Schema differences (critical section): HIGH — read directly from 001_schema.sql and database.types.ts
- @dnd-kit React 19 compatibility: MEDIUM — peer dep technically allows it, community reports success, no official React 19 support statement
- Analytics aggregation approach: HIGH — Supabase GROUP BY limitation is a known documented constraint

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days — @dnd-kit may release official React 19 support, recharts version is stable)
