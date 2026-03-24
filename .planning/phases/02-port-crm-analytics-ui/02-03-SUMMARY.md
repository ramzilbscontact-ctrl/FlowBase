---
phase: 02-port-crm-analytics-ui
plan: "03"
subsystem: crm-deals
tags: [kanban, dnd-kit, deals, pipeline, crud, drag-and-drop]
dependency_graph:
  requires:
    - 02-01  # pipeline_stages table + migration
    - 02-02  # contacts + companies tables (for modal selects)
  provides:
    - deals Kanban board (FR-02-4)
    - deals CRUD with contact/company association (FR-02-3)
  affects:
    - nextjs-app/app/(dashboard)/dashboard/deals/page.tsx
    - nextjs-app/components/crm/KanbanBoard.tsx
tech_stack:
  added:
    - "@dnd-kit/core@^6.3.1"
    - "@dnd-kit/sortable@^8.0.0"
  patterns:
    - Drag-and-drop Kanban via @dnd-kit DndContext + useDroppable + useSortable
    - Combined create/edit modal via editingDeal state (same pattern as 02-02)
    - Stage auto-seed on page load (handles fresh accounts without pipeline_stages rows)
    - Soft delete via deleted_at timestamp
key_files:
  created:
    - nextjs-app/components/crm/KanbanBoard.tsx
  modified:
    - nextjs-app/app/(dashboard)/dashboard/deals/page.tsx
    - nextjs-app/package.json
decisions:
  - "KanbanBoard droppable columns use useDroppable on stage divs so drag-over resolves to stage id directly"
  - "handleDragEnd distinguishes stage vs deal drop target by checking if over.id matches a stage id — falls back to finding deal's stage_id"
  - "DealCard buttons use e.stopPropagation() to prevent drag sensor from intercepting clicks on edit/delete"
  - "Module-level const supabase = createClient() (not inside component) — stable reference, matches 02-02 pattern"
  - "Auto-seed reads owner_id from auth.getUser() inside queryFn — safe for client-side per-user seeding"
metrics:
  duration: "42min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 3
requirements_fulfilled:
  - FR-02-3  # deals CRUD with contact/company association
  - FR-02-4  # Kanban pipeline view
---

# Phase 2 Plan 03: Deals Kanban Pipeline Summary

**One-liner:** Drag-and-drop Kanban pipeline for deals using @dnd-kit with create/edit modal including contact and company association.

## What Was Built

Replaced the static server-component deals scaffold with a fully interactive Kanban pipeline view:

- **KanbanBoard component** (`components/crm/KanbanBoard.tsx`): Renders draggable deal cards in droppable stage columns. Uses `@dnd-kit/core` `DndContext` + `useDroppable` on each column and `useSortable` on each card. `PointerSensor` with `distance: 8` prevents accidental drag on button clicks.

- **Deals page** (`app/(dashboard)/dashboard/deals/page.tsx`): Full client component wiring up 4 queries (pipeline_stages, deals, contacts-select, companies-select) and 3 mutations (updateStage, save, delete). Stage auto-seed creates 6 default stages (Prospect → Perdu) if the user has none.

- **Modal (create + edit)**: Single modal with 5 fields — title (required), value (DZD number), stage select, contact select, company select. When `editingDeal` is non-null, all fields are pre-filled and save calls `.update()`; otherwise calls `.insert()`.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Install @dnd-kit + build KanbanBoard component | 8e63225 | KanbanBoard.tsx, package.json |
| 2 | Wire deals page with Kanban, modal, auto-seed | bbb12a2 | deals/page.tsx |

## Verification

- @dnd-kit/core and @dnd-kit/sortable installed in node_modules
- TypeScript compilation: no errors on KanbanBoard.tsx or deals/page.tsx
- Deals page is "use client" — not a server component
- KanbanBoard does NOT use PageShell (Kanban needs horizontal scroll layout)
- All deal mutations use soft delete (`.update({ deleted_at })`) — never `.delete()`
- Deal query uses `contacts(first_name, last_name)` and `companies(name)` embeds
- Column badge colors by position: 0=gray, 1=blue, 2=yellow, 3=orange, 4=green, 5=red

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] npm install kept hanging in background tasks**
- **Found during:** Task 1 installation
- **Issue:** Multiple background npm processes competing for package lock, all getting stuck after partial download
- **Fix:** Killed all competing processes, ran `npm cache verify`, installed with `--no-package-lock` flag to avoid lock contention; manually updated package.json with @dnd-kit version entries
- **Files modified:** nextjs-app/package.json
- **Commit:** 8e63225

**2. [Rule 1 - Bug] @dnd-kit/utilities not imported via sortable**
- **Found during:** Task 1 implementation
- **Issue:** `@dnd-kit/utilities` needed for `CSS.Transform.toString()` is a transitive dependency but not directly listed
- **Fix:** Imported from `@dnd-kit/utilities` (installed as dependency of @dnd-kit/sortable)
- **Files modified:** KanbanBoard.tsx

### Design Improvements (within plan spec)

- Added `isOver` visual feedback on droppable columns (violet ring + light background) — enhances drag UX
- `handleDragEnd` handles both "dropped on stage column" and "dropped on another deal card" cases — more robust than spec's simpler version

## Self-Check: PASSED

| Item | Status |
|------|--------|
| KanbanBoard.tsx | FOUND |
| deals/page.tsx | FOUND |
| @dnd-kit/core in node_modules | FOUND |
| @dnd-kit/sortable in node_modules | FOUND |
| Commit 8e63225 | FOUND |
| Commit bbb12a2 | FOUND |
