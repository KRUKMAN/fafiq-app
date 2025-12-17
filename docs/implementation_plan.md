# Implementation Plan (Phased Roadmap)

This plan is aligned to `Fafik_System_Context.md` and cross-checked against the current codebase.

## Current Codebase Reality (Delta to Target)
- Domain naming is aligned to `org_id` in the app code; ensure the database schema/RLS uses `org_id` consistently end-to-end.
- No tenant-resolution strategy exists (hard-coded tenant/org in UI).
- No RLS, no schema migrations, no activity logging implementation yet (mock-only).
- NativeWind v4 is configured in Tailwind + Babel, but `metro.config.js` was missing.
- UI prototype lives largely in one screen (`app/(tabs)/index.tsx`) with many inline components (prototype OK; not scalable).


# Phase 1 — Visual MVP (Frontend-First, Mocked)

Goal: fully clickable app validating UX, navigation, and data density.
No database. No auth. No persistence.

---

## Status Legend
planned | in_progress | done | mocked | blocked

---

## 1.1 Frontend Data Contracts (Authoritative)

### Zod Schemas (schemas/*.ts)

| Schema | Status |
|---|---|
| Org | planned |
| Profile | planned |
| Membership | planned |
| Dog | in_progress |
| Transport | planned |
| ActivityEvent | planned |

Rules:
- These schemas are the frontend source of truth
- Backend must conform or explicitly map later

---

## 1.2 Mock Data Layer

### Mock datasets (lib/mocks)

| Dataset | Status |
|---|---|
| Orgs | planned |
| Dogs | in_progress |
| Transports | planned |
| Activity timeline | planned |

---

### Mock Hooks

| Hook | Status |
|---|---|
| useDogs() | planned |
| useDogDetail(id) | planned |
| useTransports() | planned |

Requirements:
- Simulated latency (300–800ms)
- Loading + error states visible

---

## 1.3 Client Session & Tenant Context (Mocked)

### Zustand store (stores/sessionStore.ts)

| Feature | Status |
|---|---|
| currentUser | in_progress |
| memberships[] | in_progress |
| activeOrgId | in_progress |
| switchOrg(orgId) | in_progress |

---

## 1.4 Navigation & Guards

| Component | Status |
|---|---|
| Mock auth guard | planned |
| Org guard (org selector redirect) | planned |
| Responsive sidebar / tabs | done |

---

## 1.5 Feature Modules (UI Only)

### Dogs

| Screen | Status |
|---|---|
| Dog list (search/filters + cards; nav to detail) | done |
| Dog detail shell | done |
| Overview tab | done |
| Medical tab (mock) | planned |
| Timeline tab | planned |
| Files tab (UI only) | planned |
| Create dog form | in_progress |
| Edit dog form | in_progress |
Note: Dog list must include filters (stage/status) and search; selecting a dog opens its detail view.

---

### Transports

| Screen | Status |
|---|---|
| Transport list | mocked |
| Transport detail | mocked |

---

## Phase 1 Definition of Done

- Mock login works
- Org switching updates visible data
- Dogs list supports filters/search and opens dog detail
- Forms validate via Zod
- Timeline renders mock activity
- Deep links work on web

# Phase 2 — Backend Integration (Zero UI Rewrite)

Goal: replace mocks with Supabase without touching UI components.

---

## Status Legend
planned | in_progress | done | mocked | blocked

---

## 2.1 Database & Security Foundation

| Task | Status |
|---|---|
| Apply schema.md | planned |
| Apply rls.md | planned |
| org_id enforced everywhere | planned |
| Seed org.settings defaults | planned |

---

## 2.2 Type Alignment

| Task | Status |
|---|---|
| Generate database.types.ts | planned |
| Compare DB vs Zod schemas | planned |
| Resolve mismatches explicitly | planned |

---

## 2.3 Real Tenant Resolution (Strict Boot Sequence)

1. Authenticate
2. Fetch memberships
3. Load last_org_id
4. Validate membership
5. Select org or prompt

| Task | Status |
|---|---|
| Supabase auth integration | planned |
| Replace sessionStore mocks | planned |
| Persist last_org_id | planned |

---

## 2.4 Hook Swap (Critical)

| Hook | Status |
|---|---|
| useDogs → Supabase | planned |
| useDogDetail → Supabase | planned |
| useTransports → Supabase | planned |

Rule:
- UI code must not change

---

## 2.5 Atomic Audit Logging (Hard Rule)

| Entity | Mechanism | Status |
|---|---|---|
| Dogs | in_progress |
| Transports | Trigger / RPC | planned |
| Photos | Trigger | planned |

Client-side audit inserts are forbidden.

---

## Phase 2 Definition of Done

- Auth persists across reloads
- RLS blocks cross-org access
- Timeline shows real audit events
- Phase 1 UI unchanged

# Phase 3 — Operations & Production Readiness

Goal: enable real-world NGO operations and harden the app.

---

## Status Legend
planned | in_progress | done | mocked | blocked

---

## 3.1 Storage & Media

| Task | Status |
|---|---|
| dog-photos bucket | planned |
| Upload integration | planned |
| Optimistic updates | planned |

---

## 3.2 Advanced Domains

| Feature | Status |
|---|---|
| Medical events | planned |
| Transport assignment | planned |
| Expenses | planned |
| Documents | planned |

---

## 3.3 Polish & Hardening

| Task | Status |
|---|---|
| Empty states | planned |
| Error boundaries | planned |
| Offline indicators | planned |

---

## Phase 3 Definition of Done

- Full dog lifecycle supported
- Storage works on web + mobile
- App is production-ready

---

## Progress Log
- 2025-12-17: Implemented sidebar-first navigation shell and wired routes for Dashboard, Dogs, Transports, People & Homes, Finance, and Settings; aligned dog detail tabs with shared UI state.
- 2025-12-17: Rebuilt Dogs list into tablet-first grid with status badges, alerts, debounced search and filters, and drawer-style dog detail modal; added shared list/detail components and normalized status legends.
- 2025-12-17: Polished Dogs list UI to match product screenshots (table cell padding/alignment, header/toolbars, button styles, and visual density) and cleaned up lint warnings in dogs create/edit screens.
- 2025-12-17: Added responsive/persisted Dogs table (pagination, horizontal scroll), simplified org picker pill, and persisted list filters/page in UI store; time-in-care metric left as placeholder pending schema support.
