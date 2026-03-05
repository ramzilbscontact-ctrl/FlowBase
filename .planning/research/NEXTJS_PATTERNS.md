# Next.js 14/15 App Router — ERP Migration Patterns

**Project:** Radiance ERP (React/Vite + Django DRF → Next.js 15 + Supabase)
**Researched:** 2026-03-04
**Next.js version confirmed:** 16.1.6 (docs last updated 2026-02-27)
**Overall confidence:** HIGH (all primary findings sourced from official Next.js, TanStack, Supabase, and Vercel docs)

---

## Critical Discovery: `middleware.ts` is Now `proxy.ts`

> Next.js v16.0.0 deprecated `middleware` and renamed it to `proxy`. The file is now `proxy.ts`
> at the project root. The export function is named `proxy()` not `middleware()`.
> Migration codemod: `npx @next/codemod@canary middleware-to-proxy .`

All patterns below use the current convention. If you scaffold with an older template, rename
immediately.

---

## 1. Server Components vs Client Components

**Confidence:** HIGH (official Next.js docs)

### Decision Rule

```
Can this component run without the browser?
  YES → Server Component (default — no directive needed)
  NO  → Client Component ("use client" at top of file)
```

### When Each Is Required

| Capability Needed | Component Type |
|---|---|
| `onClick`, `onChange`, event handlers | Client |
| `useState`, `useEffect`, custom hooks | Client |
| `localStorage`, `window`, `document` | Client |
| Fetch from DB / call server-only secrets | Server |
| Access `process.env` (non-PUBLIC) | Server |
| Reduce JS bundle size | Server |
| Stream progressive content | Server |
| React Context providers | Client (wraps children) |

### ERP-Specific Pattern: Data Tables

For ERP data grids (CRM contacts, invoices, RH employees), the correct pattern is:

```tsx
// app/crm/contacts/page.tsx — Server Component (no directive)
import { ContactsTable } from "@/components/crm/contacts-table"
import { getContacts } from "@/lib/data/contacts"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { page, search } = await searchParams
  // Direct DB call — no API round-trip needed
  const contacts = await getContacts({ page: Number(page ?? 1), search })

  return <ContactsTable initialData={contacts} />
}
```

```tsx
// components/crm/contacts-table.tsx — Client Component
"use client"

import { useState } from "react"

export function ContactsTable({ initialData }: { initialData: Contact[] }) {
  const [selected, setSelected] = useState<string[]>([])
  // sorting, row selection, modals all live here
  return <table>...</table>
}
```

### The Composition Pattern (Critical for ERP)

Server Components can be passed as `children` into Client Components. This is how you keep
expensive layouts server-rendered while still having interactive shells:

```tsx
// app/dashboard/layout.tsx — Server Component
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser() // server-only
  return <DashboardShell user={user}>{children}</DashboardShell>
}

// components/layout/dashboard-shell.tsx — Client Component
"use client"

import { useState } from "react"
import type { User } from "@/lib/types"

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: User
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // children here are Server Components — they stay server-rendered
  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} user={user} />
      <main>{children}</main>
    </div>
  )
}
```

### Preventing Environment Poisoning

Use the `server-only` package to guard server-side data access functions:

```ts
// lib/data/contacts.ts
import "server-only"
import { createServerClient } from "@/lib/supabase/server"

export async function getContacts(params: ContactsQuery) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .range(...)
  return data
}
```

Install: `npm install server-only`

---

## 2. Route Handlers (API Routes)

**Confidence:** HIGH (official Next.js docs)

### Core Pattern

```ts
// app/api/crm/contacts/route.ts
import { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = searchParams.get("page") ?? "1"

  const supabase = await createServerClient()
  const { data } = await supabase.from("contacts").select("*")

  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // validate, insert
  return Response.json({ success: true }, { status: 201 })
}
```

### Dynamic Route Handlers

```ts
// app/api/crm/contacts/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // params is a Promise in Next.js 15+
  // fetch contact by id
  return Response.json(contact)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  // update contact
  return Response.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // delete contact
  return new Response(null, { status: 204 })
}
```

### Route Segment Config for Caching Control

By default in Next.js 15, GET Route Handlers are **dynamic** (not cached). Control explicitly:

```ts
// app/api/crm/stats/route.ts
export const revalidate = 60  // revalidate every 60 seconds
export const dynamic = "force-dynamic"  // always dynamic (no cache)
// OR
export const dynamic = "force-static"  // build-time cache

export async function GET() {
  const stats = await getDashboardStats()
  return Response.json(stats)
}
```

### CRITICAL: Do NOT Call Route Handlers from Server Components

```ts
// WRONG — creates unnecessary network hop
// app/crm/page.tsx (Server Component)
export default async function Page() {
  const data = await fetch("/api/crm/contacts").then(r => r.json()) // BAD
  return <ContactsTable data={data} />
}

// CORRECT — call the logic directly
// app/crm/page.tsx (Server Component)
import { getContacts } from "@/lib/data/contacts"  // server-only function

export default async function Page() {
  const data = await getContacts()  // direct DB call, same process
  return <ContactsTable data={data} />
}
```

Route Handlers are for **external consumers** (mobile apps, third-party integrations, webhooks).
Server Components call shared data functions directly.

### Auth Pattern for Route Handlers

```ts
// app/api/rh/employees/route.ts
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check role from user metadata or a roles table
  const role = user.user_metadata?.role
  if (role !== "admin" && role !== "rh_manager") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const employees = await getEmployees()
  return Response.json(employees)
}
```

---

## 3. Middleware / Proxy — Auth & Role-Based Protection

**Confidence:** HIGH (official Next.js docs, confirmed v16 rename)

### File Location

```
project-root/
  proxy.ts          ← was middleware.ts, renamed in Next.js v16
  app/
  ...
```

### Full Auth + RBAC Pattern

```ts
// proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/dashboard",
  "/crm",
  "/facturation",
  "/rh",
  "/comptabilite",
  "/analytics",
]

// Routes accessible without auth
const PUBLIC_ROUTES = ["/", "/login", "/auth/callback"]

// Role-to-route mapping
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["/dashboard", "/crm", "/facturation", "/rh", "/comptabilite", "/analytics"],
  rh_manager: ["/dashboard", "/rh"],
  accountant: ["/dashboard", "/comptabilite", "/facturation"],
  sales: ["/dashboard", "/crm", "/facturation"],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip non-page routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next()
  }

  // Check if route requires auth
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  // Supabase session check
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ALWAYS use getClaims() for security — validates JWT signature
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access check
  const userRole = user.user_metadata?.role as string
  const allowedRoutes = ROLE_ROUTES[userRole] ?? []
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route))

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Pass user info to headers for downstream use
  response.headers.set("x-user-id", user.id)
  response.headers.set("x-user-role", userRole)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
```

### Proxy Runtime: Node.js (No Longer Edge-Only)

As of Next.js v15.5 (stable in v15.5), Proxy runs on **Node.js runtime** by default — no more
Edge Runtime constraints. This means you can use full Node.js APIs, `jose` for JWT verification,
MongoDB drivers, etc.

---

## 4. File-Based Routing for Nested ERP Layouts

**Confidence:** HIGH (official Next.js docs + route groups docs)

### Recommended Structure for Radiance ERP

```
src/
  app/
    layout.tsx                     ← Root layout (html, body, providers)
    page.tsx                       ← Landing/redirect page
    (auth)/                        ← Route group: no URL impact
      layout.tsx                   ← Auth-specific layout (centered card)
      login/
        page.tsx                   ← /login
      auth/
        callback/
          route.ts                 ← /auth/callback (Supabase OAuth)
    (dashboard)/                   ← Route group: shares dashboard layout
      layout.tsx                   ← Sidebar + topbar layout
      dashboard/
        page.tsx                   ← /dashboard
      crm/
        layout.tsx                 ← CRM sub-layout (optional)
        page.tsx                   ← /crm
        contacts/
          page.tsx                 ← /crm/contacts
          [id]/
            page.tsx               ← /crm/contacts/[id]
        deals/
          page.tsx                 ← /crm/deals
          [id]/
            page.tsx               ← /crm/deals/[id]
      facturation/
        layout.tsx
        page.tsx                   ← /facturation
        invoices/
          page.tsx                 ← /facturation/invoices
          new/
            page.tsx               ← /facturation/invoices/new
          [id]/
            page.tsx               ← /facturation/invoices/[id]
        quotes/
          page.tsx                 ← /facturation/quotes
      rh/
        layout.tsx
        page.tsx                   ← /rh
        employees/
          page.tsx                 ← /rh/employees
          [id]/
            page.tsx               ← /rh/employees/[id]
        payroll/
          page.tsx                 ← /rh/payroll
      comptabilite/
        layout.tsx
        page.tsx                   ← /comptabilite
        journal/
          page.tsx                 ← /comptabilite/journal
        reports/
          page.tsx                 ← /comptabilite/reports
      analytics/
        page.tsx                   ← /analytics
    api/
      auth/
        callback/
          route.ts                 ← Supabase auth callback handler
      crm/
        contacts/
          route.ts                 ← GET /api/crm/contacts, POST
          [id]/
            route.ts               ← GET/PUT/DELETE /api/crm/contacts/[id]
        deals/
          route.ts
          [id]/
            route.ts
      facturation/
        invoices/
          route.ts
          [id]/
            route.ts
      rh/
        employees/
          route.ts
          [id]/
            route.ts
        payroll/
          route.ts
      analytics/
        route.ts
```

### Dashboard Layout Example

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
```

### Route Group Rules

- `(groupName)` folders do NOT appear in the URL path
- Each route group can have its own `layout.tsx`
- Navigating between different root layouts triggers a full page reload
- Paths must be unique across groups — `(crm)/about` and `(rh)/about` both resolve to `/about` (conflict — avoid)

---

## 5. Next.js + Supabase SSR Setup

**Confidence:** HIGH (official Supabase Next.js SSR guide, confirmed 2026)

### Install

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Client Factory Files

```ts
// lib/supabase/client.ts — Browser Client (use in 'use client' components)
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database.types"

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```ts
// lib/supabase/server.ts — Server Client (use in Server Components, Route Handlers)
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database.types"

export async function createClient() {
  const cookieStore = await cookies()  // async in Next.js 15+

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — proxy handles this
          }
        },
      },
    }
  )
}
```

### Why Two Clients?

| | `createBrowserClient` | `createServerClient` |
|---|---|---|
| Where it runs | Browser (Client Components) | Server (RSC, Route Handlers, Proxy) |
| Cookie access | `document.cookie` | `next/headers` cookies() |
| Token refresh | Automatic | Via Proxy (see section 3) |
| Use for | Interactive auth, realtime | Data fetching, auth validation |

### Auth Validation — ALWAYS Use `getUser()` Not `getSession()`

```ts
// WRONG — getSession() reads from cookie, does NOT validate JWT signature
const { data: { session } } = await supabase.auth.getSession()

// CORRECT — getUser() validates against Supabase public keys (secure)
const { data: { user }, error } = await supabase.auth.getUser()
if (error || !user) redirect("/login")
```

### Type Generation

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/database.types.ts
```

---

## 6. Data Fetching: TanStack Query v5 + Server Components

**Confidence:** MEDIUM-HIGH (TanStack official docs + verified community patterns)

### Architecture Decision

For an ERP with complex filters, pagination, and real-time mutations:

- **Server Components**: Initial data load (first paint, SEO irrelevant for authenticated app)
- **TanStack Query**: Client-side cache management, mutations, optimistic updates, background refetch
- **Pattern**: Prefetch on server → hydrate on client → TanStack Query owns cache from there

### Setup: QueryClient Provider

```tsx
// components/providers/query-provider.tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures each request gets its own QueryClient
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,      // 1 minute
            gcTime: 5 * 60 * 1000,    // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false, // ERP users leave tabs open
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

```tsx
// app/layout.tsx — wrap with provider
import { QueryProvider } from "@/components/providers/query-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
```

### Pattern 1: Prefetch on Server + HydrationBoundary (Recommended for ERP)

Best for pages where first-load data matters (dashboard, list pages):

```tsx
// app/(dashboard)/crm/contacts/page.tsx — Server Component
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { ContactsList } from "@/components/crm/contacts-list"
import { getContacts } from "@/lib/data/contacts"

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const queryClient = new QueryClient()

  // Prefetch in parallel when multiple queries needed
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["contacts", { page: Number(page ?? 1) }],
      queryFn: () => getContacts({ page: Number(page ?? 1) }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["contacts-count"],
      queryFn: () => getContactsCount(),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactsList />
    </HydrationBoundary>
  )
}
```

```tsx
// components/crm/contacts-list.tsx — Client Component
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export function ContactsList() {
  const queryClient = useQueryClient()

  // Data already in cache from server prefetch — no loading state on first render
  const { data: contacts } = useQuery({
    queryKey: ["contacts", { page: 1 }],
    queryFn: () => fetch("/api/crm/contacts?page=1").then(r => r.json()),
  })

  const createContact = useMutation({
    mutationFn: (data: NewContact) =>
      fetch("/api/crm/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  })

  return (
    <div>
      {contacts?.map((contact) => (
        <ContactRow key={contact.id} contact={contact} />
      ))}
    </div>
  )
}
```

### Pattern 2: Server Component Data Fetching (Simpler, for non-interactive pages)

For read-heavy pages without complex client-side state:

```tsx
// app/(dashboard)/analytics/page.tsx — pure Server Component
import { getAnalyticsData } from "@/lib/data/analytics"
import { AnalyticsDashboard } from "@/components/analytics/dashboard"

export default async function AnalyticsPage() {
  // Just await directly — no TanStack Query needed here
  const data = await getAnalyticsData()
  return <AnalyticsDashboard data={data} />
}
```

### Query Key Conventions for ERP

```ts
// lib/query-keys.ts — centralize to avoid typos
export const queryKeys = {
  crm: {
    contacts: (filters?: ContactsFilter) => ["crm", "contacts", filters] as const,
    contact: (id: string) => ["crm", "contacts", id] as const,
    deals: (filters?: DealsFilter) => ["crm", "deals", filters] as const,
  },
  facturation: {
    invoices: (filters?: InvoicesFilter) => ["facturation", "invoices", filters] as const,
    invoice: (id: string) => ["facturation", "invoices", id] as const,
  },
  rh: {
    employees: (filters?: EmployeesFilter) => ["rh", "employees", filters] as const,
    employee: (id: string) => ["rh", "employees", id] as const,
  },
  analytics: {
    dashboard: () => ["analytics", "dashboard"] as const,
    revenue: (period: string) => ["analytics", "revenue", period] as const,
  },
} as const
```

---

## 7. TypeScript Strict Mode Conventions

**Confidence:** HIGH (official Next.js TypeScript docs)

### Recommended `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/lib/types/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/store/*": ["./src/store/*"]
    },
    "baseUrl": "."
  },
  "include": [
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": ["node_modules"]
}
```

### Next.js TypeScript Plugin (Enable in VS Code)

1. Open command palette: `Ctrl/Cmd + Shift + P`
2. Search "TypeScript: Select TypeScript Version"
3. Select "Use Workspace Version"

This enables:
- Invalid segment config option warnings
- `"use client"` directive validation
- Client hooks (`useState`) in wrong component type detection

### Enable Typed Routes (Recommended)

```ts
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typedRoutes: true,  // Validates href strings at compile time
  experimental: {
    typedEnv: true,   // IntelliSense for process.env variables
  },
}

export default nextConfig
```

With `typedRoutes: true`, this catches typos at compile time:

```tsx
import Link from "next/link"

// TypeScript error: "/crm/contatcs" is not a valid route
<Link href="/crm/contatcs">Contacts</Link>

// OK
<Link href="/crm/contacts">Contacts</Link>
```

### Route-Aware Type Helpers (Generated, No Import Needed)

```tsx
// app/crm/contacts/[id]/page.tsx
export default async function Page(props: PageProps<"/crm/contacts/[id]">) {
  const { id } = await props.params  // fully typed
  return <ContactDetail id={id} />
}

// app/(dashboard)/layout.tsx
export default function Layout(props: LayoutProps<"/(dashboard)/">) {
  return <DashboardShell>{props.children}</DashboardShell>
}
```

### Server Action Type Safety

```ts
// lib/actions/crm.ts
"use server"

import { z } from "zod"

const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
})

type ActionResult =
  | { success: true; id: string }
  | { success: false; error: string }

export async function createContact(
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData)
  const parsed = CreateContactSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  // insert to Supabase
  return { success: true, id: newContact.id }
}
```

---

## 8. Folder Structure for Large ERP Monorepo

**Confidence:** HIGH (official Next.js docs + verified community patterns)

### Complete `src/` Directory Structure

```
radiance-erp/
  src/
    app/                           ← Next.js App Router root
      (auth)/                      ← Auth routes (no URL segment)
        layout.tsx
        login/page.tsx
        auth/callback/route.ts
      (dashboard)/                 ← Dashboard routes (no URL segment)
        layout.tsx                 ← Shared sidebar/topbar
        dashboard/page.tsx
        crm/
          layout.tsx               ← CRM-specific layout (breadcrumbs, tabs)
          page.tsx
          contacts/
            page.tsx
            new/page.tsx
            [id]/page.tsx
          deals/page.tsx
          pipelines/page.tsx
        facturation/
          layout.tsx
          page.tsx
          invoices/
            page.tsx
            new/page.tsx
            [id]/page.tsx
          quotes/page.tsx
        rh/
          layout.tsx
          page.tsx
          employees/
            page.tsx
            [id]/page.tsx
          payroll/page.tsx
          absences/page.tsx
        comptabilite/
          layout.tsx
          page.tsx
          journal/page.tsx
          reports/page.tsx
        analytics/
          page.tsx
      api/                         ← Route Handlers (for external consumers)
        auth/callback/route.ts
        crm/
          contacts/route.ts
          contacts/[id]/route.ts
          deals/route.ts
          deals/[id]/route.ts
        facturation/
          invoices/route.ts
          invoices/[id]/route.ts
        rh/
          employees/route.ts
          payroll/route.ts
        analytics/route.ts
      globals.css
      layout.tsx                   ← Root layout: html/body/providers
      page.tsx                     ← Redirect to /dashboard
      not-found.tsx
      error.tsx
      loading.tsx

    components/
      ui/                          ← Generic UI components
        button.tsx
        input.tsx
        table.tsx
        modal.tsx
        badge.tsx
        card.tsx
        data-table/                ← Complex reusable data table
          index.tsx
          columns.tsx
          filters.tsx
          pagination.tsx
      layout/                      ← Layout components
        sidebar.tsx
        topbar.tsx
        breadcrumbs.tsx
        module-nav.tsx
      crm/                         ← CRM-specific components
        contacts-table.tsx
        contact-form.tsx
        deal-card.tsx
        pipeline-board.tsx
      facturation/
        invoice-form.tsx
        invoice-table.tsx
        quote-builder.tsx
      rh/
        employee-form.tsx
        employee-table.tsx
        payslip-generator.tsx
      comptabilite/
        journal-entry-form.tsx
        account-tree.tsx
      analytics/
        revenue-chart.tsx
        kpi-card.tsx
      providers/
        query-provider.tsx
        theme-provider.tsx

    lib/
      supabase/
        client.ts                  ← createBrowserClient
        server.ts                  ← createServerClient
      data/                        ← Server-only data fetching functions
        contacts.ts
        deals.ts
        invoices.ts
        employees.ts
        analytics.ts
      actions/                     ← Server Actions
        crm.ts
        facturation.ts
        rh.ts
      types/
        database.types.ts          ← Supabase generated types
        index.ts                   ← App-level types
      utils/
        format.ts                  ← Date, currency, number formatters
        validators.ts              ← Zod schemas
        constants.ts
      query-keys.ts                ← Centralized TanStack Query keys

    hooks/                         ← Custom React hooks (client-side)
      use-contacts.ts
      use-pagination.ts
      use-debounce.ts
      use-local-storage.ts

    store/                         ← Zustand stores (lightweight UI state)
      ui-store.ts                  ← Sidebar open/closed, modal state
      filter-store.ts              ← Persistent filter preferences

  proxy.ts                         ← Auth + RBAC middleware (was middleware.ts)
  next.config.ts
  tsconfig.json
  tailwind.config.ts
  .env.local
  .env.example
```

### Colocation Rule

Files inside `app/` are NOT publicly accessible as routes unless they export a `page.tsx` or
`route.ts`. This means you can colocate component files next to their pages:

```
app/(dashboard)/crm/contacts/
  page.tsx              ← Public route: /crm/contacts
  _components/          ← Private (underscore prefix): NOT a route
    contacts-filter.tsx
    bulk-actions.tsx
```

---

## 9. Environment Variable Handling

**Confidence:** HIGH (official Next.js + Vercel docs)

### The Two Rules

| Variable Type | Prefix | Available In |
|---|---|---|
| Server-only secrets | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server Components, Route Handlers, Proxy |
| Public client-side | `NEXT_PUBLIC_SUPABASE_URL` | Everywhere (bundled into client JS) |

### Required Environment Variables for This Stack

```bash
# .env.local (development) — never commit this file

# Supabase (both server and client need URL + anon key)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # Safe to expose — Row Level Security enforces access

# Server-only (never prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Full DB access — server only!
SUPABASE_JWT_SECRET=your-jwt-secret     # For custom JWT validation

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# .env.example — commit this as documentation
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
NEXT_PUBLIC_APP_URL=
```

### TypeScript IntelliSense for Env Vars

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    typedEnv: true,  // generates .d.ts for process.env keys
  },
}
```

### Guard Server Variables from Client Bundles

```ts
// lib/data/contacts.ts
import "server-only"  // Build-time error if imported in client component

export async function getContacts() {
  // process.env.SUPABASE_SERVICE_ROLE_KEY is safe here
}
```

If `SUPABASE_SERVICE_ROLE_KEY` is accidentally imported into a Client Component, Next.js replaces
it with an empty string — it will silently fail. The `server-only` package makes this a build
error instead.

---

## 10. Vercel Deployment

**Confidence:** HIGH (official Vercel docs)

### Auto-Deploy Behavior

| Git Action | Vercel Behavior |
|---|---|
| Push to `main` | Production deployment → `your-project.vercel.app` |
| Push to feature branch | Preview deployment → `your-project-git-branch-name.vercel.app` |
| Open Pull Request | Preview deployment created, URL posted to PR |
| Merge PR to main | New production deployment |

### Environment Variable Scoping

Configure in Vercel Dashboard → Project → Settings → Environment Variables:

```
Variable                        | Production | Preview | Development
NEXT_PUBLIC_SUPABASE_URL        |     ✓      |    ✓    |     ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY   |     ✓      |    ✓    |     ✓
SUPABASE_SERVICE_ROLE_KEY       |     ✓      |    ✓    |     (local .env.local)
NEXT_PUBLIC_APP_URL             |  prod URL  | auto    |  localhost:3000
```

For `NEXT_PUBLIC_APP_URL` in Preview, use Vercel's system variable:
`NEXT_PUBLIC_APP_URL=$VERCEL_URL` (but note `VERCEL_URL` has no `https://` prefix — construct it
manually if needed).

### Useful Vercel System Variables

```bash
VERCEL_ENV          # "production" | "preview" | "development"
VERCEL_URL          # Deployment URL without protocol: "your-app-abc.vercel.app"
VERCEL_GIT_COMMIT_SHA   # Full commit SHA
VERCEL_GIT_COMMIT_REF   # Branch name
```

### Vercel CLI Workflow

```bash
# Install
npm install -g vercel

# Link project
vercel link

# Pull env vars to local
vercel env pull .env.local

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Add env var via CLI
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### `vercel.json` Configuration (Optional)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### Important: Redeploy After Adding Env Vars

Existing deployments do NOT pick up new environment variables. Always redeploy after adding or
changing variables.

---

## Critical Pitfalls Summary

**Confidence:** HIGH (Vercel official post-mortem + Next.js docs)

### Pitfall 1: Calling Route Handlers from Server Components

**Problem:** Adds a full network round-trip to localhost.
**Fix:** Call shared data functions directly from Server Components.

### Pitfall 2: Route Handler GET Caching Confusion

**Problem:** In Next.js 15, GET handlers are **dynamic by default** (behavior changed from v14
where they were static by default). If you expected caching, add `export const revalidate = 60`.
**Fix:** Always be explicit with `export const dynamic = "force-dynamic"` or `export const revalidate = N`.

### Pitfall 3: `redirect()` Inside `try/catch`

**Problem:** `redirect()` throws internally. A surrounding `try/catch` catches the throw and
swallows the redirect.
**Fix:** Call `redirect()` outside try/catch blocks.

```ts
// WRONG
try {
  // ...
  redirect("/dashboard")  // throws, caught by catch
} catch (e) {
  console.error(e)
}

// CORRECT
if (!user) redirect("/login")
try {
  // operations that might fail
} catch (e) {
  // handle errors
}
```

### Pitfall 4: `getSession()` Instead of `getUser()` for Auth Validation

**Problem:** `getSession()` reads from the cookie without validating the JWT signature. A tampered
cookie passes this check.
**Fix:** Always use `supabase.auth.getUser()` on the server.

### Pitfall 5: Suspense Boundary Placement

**Problem:** `<Suspense>` placed INSIDE the async component has no effect — the boundary must be
in a PARENT component.

```tsx
// WRONG — Suspense is inside the component doing the async work
async function ContactPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ContactList />  {/* ContactList is async — Suspense here doesn't work */}
    </Suspense>
  )
}

// CORRECT — Suspense in parent
export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <ContactPage />  {/* ContactPage is the async component */}
    </Suspense>
  )
}
```

### Pitfall 6: `"use client"` on Every File

**Problem:** Once a file is marked `"use client"`, all its imports become client components.
Adding the directive everywhere bloats the JS bundle.
**Fix:** Add `"use client"` only at the leaf interactive components. Let the directive propagate
downward automatically.

### Pitfall 7: Context Providers in Server Components

**Problem:** React Context does not work in Server Components.
**Fix:** Create Client Component wrappers for all providers, render them in `app/layout.tsx`:

```tsx
// app/layout.tsx — Server Component
import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}  {/* children can be Server Components */}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Pitfall 8: Forgetting to Revalidate After Mutations

**Problem:** After a Server Action mutates data, the page still shows stale cached data.
**Fix:**

```ts
// lib/actions/crm.ts
"use server"

import { revalidatePath, revalidateTag } from "next/cache"

export async function createContact(formData: FormData) {
  // ... insert to DB

  revalidatePath("/crm/contacts")           // revalidate specific path
  revalidateTag("contacts")                 // revalidate by tag (if using fetch tags)
}
```

### Pitfall 9: Route Group Navigation Triggering Full Page Reload

**Problem:** If `(auth)` and `(dashboard)` use different root `layout.tsx` files, navigating
between them triggers a full page reload (not client-side navigation).
**Fix:** Only use multiple root layouts when intentional (auth vs app shell). Keep one root
`layout.tsx` at `app/layout.tsx` and use nested layouts for module-specific layouts.

### Pitfall 10: `params` is Now a Promise (Next.js 15+)

**Problem:** Direct destructuring `{ params: { id } }` fails in Next.js 15+.
**Fix:**

```tsx
// WRONG (Next.js 14 style)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// CORRECT (Next.js 15+)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // must await
}
```

---

## Recommended Libraries for This Stack

| Library | Version | Purpose | Why |
|---|---|---|---|
| `@supabase/ssr` | latest | Supabase SSR client factory | Official, handles cookie auth in App Router |
| `@tanstack/react-query` | v5 | Client-side data cache + mutations | Already in use; v5 supports HydrationBoundary |
| `zod` | v3 | Schema validation | Server Actions validation, type inference |
| `server-only` | latest | Guard server modules | Compile-time error on wrong imports |
| `next-safe-action` | v7 | Type-safe Server Actions | Adds input validation + error handling layer |
| `@tanstack/react-table` | v8 | Headless data tables | Already used via TanStack ecosystem |
| `react-hook-form` | v7 | Form state management | Works with Server Actions |
| `nuqs` | v2 | URL search params state | Type-safe URL state, Server Component aware |
| `zustand` | v5 | UI state (already in use) | Keep for sidebar/modal/filter UI state |

---

## Sources

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — official, updated 2026-02-27
- [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) — official, updated 2026-02-27
- [Next.js Proxy (was Middleware)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — official, updated 2026-02-27
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) — official, updated 2026-02-27
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) — official, updated 2026-02-27
- [Next.js TypeScript Configuration](https://nextjs.org/docs/app/api-reference/config/typescript) — official, updated 2026-02-27
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — official Supabase docs
- [TanStack Query v5 SSR Guide](https://tanstack.com/query/v5/docs/react/guides/ssr) — official TanStack docs
- [TanStack Query v5 Advanced SSR](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr) — official TanStack docs
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables) — official Vercel docs
- [Common Mistakes with Next.js App Router](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) — Vercel official blog
