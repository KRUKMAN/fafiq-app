# Implementation Plan (Phased Roadmap)

This plan is aligned to `Fafik_System_Context.md` and cross-checked against the current codebase.

## Current Codebase Reality (Delta to Target)
- Domain naming is aligned to `org_id` in the app code; Supabase schema + RLS + audit triggers are applied per `docs/schema.md` / `docs/rls.md`.
- Tenant resolution is **mock-first** with a Supabase bootstrap fallback: sessionStore uses mock memberships/org selection when no Supabase session/env is available.
- RLS and audit functions/triggers are live in the DB; frontend mutations still pending.
- NativeWind v4 + metro config are in place; Expo Router shell + sidebar tabs are stable.
- Dogs/Transports hooks now fetch from Supabase when env/session is present (mock fallback remains); dog detail drawer has Financial/People & Housing/Chat mock tabs; transports include list + detail shells.
- Dependency audit: Expo/Supabase libraries (haptics, image, fonts, symbols, system-ui, web-browser, Supabase client, Query Devtools) are present for upcoming Phase 2 wiring; prune after integration if unused.


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
| Org | done |
| Profile | done |
| Membership | done |
| Dog | done |
| Transport | done |
| ActivityEvent | done |

Rules:
- These schemas are the frontend source of truth
- Backend must conform or explicitly map later

---

## 1.2 Mock Data Layer

### Mock datasets (lib/mocks)

| Dataset | Status |
|---|---|
| Orgs | done |
| Dogs | done |
| Transports | done |
| Activity timeline | done |

---

### Mock Hooks

| Hook | Status |
|---|---|
| useDogs() | done |
| useDogDetail(id) | done |
| useTransports() | done |

Requirements:
- Simulated latency (300–800ms)
- Loading + error states visible

---

## 1.3 Client Session & Tenant Context (Mocked)

### Zustand store (stores/sessionStore.ts)

| Feature | Status |
|---|---|
| currentUser | done |
| memberships[] | done |
| activeOrgId | done |
| switchOrg(orgId) | done |

---

## 1.4 Navigation & Guards

| Component | Status |
|---|---|
| Mock auth guard | done |
| Org guard (org selector redirect) | in_progress |
| Responsive sidebar / tabs | done |

---

## 1.5 Feature Modules (UI Only)

### Dogs

| Screen | Status |
|---|---|
| Dog list (search/filters + cards; nav to detail) | done |
| Dog detail shell | done |
| Overview tab | done |
| Medical tab (mock) | mocked |
| Timeline tab | done |
| Files tab (UI only) | mocked |
| Create dog form | done |
| Edit dog form | done |
| Table record count below grid | done |
| Dog detail top bar cleanup (remove search/org picker, add spacing) | done |
| Financial tab (mock) | mocked |
| People & Housing tab (mock) | mocked |
| Chat tab (mock) | mocked |
Note: Dog list must include filters (stage) and search; selecting a dog opens its detail view.

---

### Transports

| Screen | Status |
|---|---|
| Transport list | done |
| Transport detail | done |

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
| Apply schema.md | done |
| Apply rls.md | done |
| org_id enforced everywhere | done |
| Seed org.settings defaults | done |

---

## 2.2 Type Alignment

| Task | Status |
|---|---|
| Align Zod dog schema to schema.md (stage/audit fields) | done |
| Generate database.types.ts | done |
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
| Supabase auth integration | in_progress |
| Replace sessionStore mocks | planned |
| Persist last_org_id | done |
| Org-aware query cache invalidation on org switch | done |

---

## 2.4 Hook Swap (Critical)

| Hook | Status |
|---|---|
| useDogs -> Supabase | in_progress |
| useDogDetail -> Supabase | in_progress |
| useTransports -> Supabase | in_progress |

Rule:
- UI code must not change

---

## 2.5 Auth & Onboarding Plan

| Task | Status |
|---|---|
| Supabase email/password login screen | in_progress |
| Create account (sign-up) flow | in_progress |
| Session boot: Supabase session -> memberships -> org guard | in_progress |
| Sign-out + cache invalidation | planned |
| Password reset hook (MVP) | planned |

Flow notes:
- Use Supabase Auth (`signInWithPassword`, `signUp`) with inline error display; no UI rewrite to tabs.
- Boot sequence: check existing session, fetch memberships for `auth.uid()`, restore `last_org_id`, validate membership, set active org or prompt; block screens until org set.
- Keep org selector on list screens (not detail); org switch still invalidates query caches.
- Ensure every query/mutation includes `org_id`; rely on RLS for enforcement.

---

## 2.6 Atomic Audit Logging (Hard Rule)

| Entity | Mechanism | Status |
|---|---|---|
| Dogs | planned |
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
- 2025-12-18: Realigned Dog Zod schema to `schema.md` (stage + audit fields), refreshed mocks and UI to use stage-based filters/badges, and documented dependency audit for Phase 2 wiring.
- 2025-12-18: Added transport detail shell + navigation, filled remaining dog mock tabs (Financial/People & Housing/Chat), generated `database.types.ts`, and added org-aware cache invalidation + Supabase bootstrap fallback in session store.
- 2025-12-18: Cleaned encoding/ternary corruption in `app/(tabs)/dogs/[id].tsx` (dog detail drawer now stable); remaining mocks unchanged.




