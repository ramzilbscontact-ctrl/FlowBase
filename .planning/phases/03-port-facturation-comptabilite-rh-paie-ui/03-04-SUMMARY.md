---
phase: 03-port-facturation-comptabilite-rh-paie-ui
plan: "04"
subsystem: rh-paie
tags: [employees, departments, leaves, payroll, IRG, CNAS]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [employees-crud, departments-crud, leave-management, payslip-generation]
  affects: [sidebar-rh-section]
tech_stack:
  added: []
  patterns: [calculatePayslip-pure-function, employee-department-join, leave-approve-reject, payslip-unique-constraint]
key_files:
  created:
    - nextjs-app/lib/utils/payroll.ts
    - nextjs-app/app/(dashboard)/dashboard/departments/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/payroll/page.tsx
  modified:
    - nextjs-app/app/(dashboard)/dashboard/employees/page.tsx
    - nextjs-app/app/(dashboard)/dashboard/leaves/page.tsx
    - nextjs-app/components/layout/Sidebar.tsx
decisions:
  - "calculatePayslip uses exact Algerian 2024 IRG brackets: 0%/23%/27%/30%/35% applied to (gross - CNAS) annualized"
  - "employees.full_name is a single column (not first_name + last_name) — enforced throughout UI"
  - "Departments and Paie added to Sidebar RH section with Building2 and Wallet icons"
  - "Payroll page uses inline preview card (useMemo) not a modal — two-panel lg:grid-cols-2 layout"
  - "PostgreSQL unique violation 23505 caught explicitly for duplicate payslip period — toast error"
  - "leave_requests.approved_by populated with supabase.auth.getUser() uid on approve/reject"
metrics:
  duration: "11min"
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 3
  files_modified: 3
---

# Phase 3 Plan 4: RH/Paie Module Summary

**One-liner:** Algerian payroll CRUD with IRG/CNAS calculation, employee–department–leave management, and payslip generation with duplicate-period guard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Payroll utility + employees page + departments page | 4a816ca | payroll.ts, employees/page.tsx, departments/page.tsx, Sidebar.tsx |
| 2 | Leaves page + payroll generation page | a54e3bb | leaves/page.tsx, payroll/page.tsx |

## What Was Built

### Task 1 — Payroll utility + employees + departments

**nextjs-app/lib/utils/payroll.ts** — Pure `calculatePayslip(grossMonthlySalary)` function:
- CNAS = 9% of gross
- Taxable = gross - CNAS; annualized x12
- Progressive IRG brackets: 0% ≤240K, 23% 240K-480K, 27% 480K-1.44M, 30% 1.44M-3.24M, 35% >3.24M
- Returns: `{ grossSalary, cnasDeduction, taxableIncome, irgDeduction, netSalary }` all rounded to 2dp
- Verification: `calculatePayslip(80000)` → cnasDeduction=7200, taxableIncome=72800, annualTaxable=873600, annualIRG=240000×0.23+393600×0.27=55200+106272=161472, monthlyIRG=13456, net=80000-7200-13456=59344

**employees/page.tsx** — Full 'use client' CRUD replacing server scaffold:
- `full_name` single column (not first_name/last_name)
- Joined `departments(name)` for display column
- Search via `ilike('full_name', ...)` + department filter select
- Modal with 7 fields: full_name, email, job_title, department_id (from depts query), base_salary, start_date, status
- Status badges: active=green/Actif, inactive=gray/Inactif
- Soft delete via `update({ deleted_at })` with confirmation dialog

**departments/page.tsx** — New file. Simple CRUD: name field only, soft delete, created_at display.

**Sidebar.tsx** — Added `Départements` (Building2) and `Paie` (Wallet) to RH section. Imported `CalendarDays` for Congés (replaces generic Calendar).

### Task 2 — Leaves page + payroll generation

**leaves/page.tsx** — Full 'use client' page replacing server scaffold:
- Employees dropdown for new request (employee_id FK)
- Leave request list with `employees(full_name)` join
- Type labels: annual/sick/unpaid/other → French display
- Approve/reject buttons on pending rows: `update({ status, approved_by: user.id })`
- Status badges: pending=yellow, approved=green, rejected=red

**payroll/page.tsx** — New file. Two-panel lg:grid layout:
- Left: form with employee select, month select (1-12 with French names), year input
- Live preview card (`useMemo`) — shows CNAS, IRG, Net without inserting
- Generate button inserts to `payslips` table; catches 23505 uniqueness violation
- Right: payslips table with Employé, Période, Brut, CNAS, IRG, Net, PDF columns
- PDF link: `/api/payslips/[id]/pdf` (Route Handler from Plan 03-02)

## Verification

- TypeScript: `npx tsc --noEmit` exits with zero errors (0 bytes output)
- `npm run build` blocked by pre-existing Node.js 22.22.1 / semver module conflict (not caused by this plan — existed before Plan 03-01)
- `calculatePayslip(80000)`: cnasDeduction=7200 ✓, taxableIncome=72800 ✓, bracket math verified ✓
- All files use `full_name` (zero occurrences of `first_name` or `last_name` in new code) ✓
- Sidebar RH section: Employés, Départements, Congés, Paie ✓

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- nextjs-app/lib/utils/payroll.ts ✓
- nextjs-app/app/(dashboard)/dashboard/departments/page.tsx ✓
- nextjs-app/app/(dashboard)/dashboard/payroll/page.tsx ✓
- nextjs-app/app/(dashboard)/dashboard/employees/page.tsx ✓ (modified)
- nextjs-app/app/(dashboard)/dashboard/leaves/page.tsx ✓ (modified)

Commits:
- 4a816ca (Task 1) ✓
- a54e3bb (Task 2) ✓
