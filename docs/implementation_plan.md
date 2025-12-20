# Implementation Plan (Phased Roadmap)

This plan is aligned to `Fafik_System_Context.md` and cross-checked against the current codebase.

## Current Codebase Reality (Delta to Target)
- Domain naming is aligned to `org_id` in the app code; Supabase schema + RLS + audit triggers are applied per `docs/schema.md` / `docs/rls.md`.
- Tenant resolution is **Supabase-first** with a demo/mock opt-in: sessionStore bootstraps from Supabase when a session exists; otherwise it stays signed out until the user signs in or chooses demo data.
- RLS and audit functions/triggers are live in the DB; frontend mutations partially wired (auth, invites, transport create/update).
- NativeWind v4 + metro config are in place; Expo Router shell + sidebar tabs are stable with org guards on list/detail/placeholder tabs.
- Dogs/Transports/Activity hooks now fetch from Supabase when env/session is present (mock fallback remains); dog detail drawer has Financial/People & Housing/Chat mock tabs; transports include list + detail shells.
- Org settings include membership list + email view + invite flow (email-based) with resend/cancel; invites auto-accept on session bootstrap.
- Storage buckets/policies for dog photos/documents are applied; dog photo upload + list (signed read URL) and dog/transport document upload + list/open/delete (via `documents` table, with size/icon) are integrated.
- Calendar refactor staged: tasks table + org-scoped indexes/RLS added, legacy dog-stage calendar trigger removed, `get_calendar_events` aggregates tasks with reminders; Zod enum updated to include `task`.
- Create/Edit Dog now write to Supabase (org-scoped), validate stage against org settings, and invalidate caches (Create redirects to new dog detail).
- Dependency audit: Expo/Supabase libraries (haptics, image, fonts, symbols, system-ui, web-browser, Supabase client, Query Devtools) are present for upcoming Phase 2 wiring; prune after integration if unused.


# Phase 1 â€” Visual MVP (Frontend-First, Mocked)

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
- Simulated latency (300â€“800ms)
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
| Org guard (org selector redirect) | done |
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

# Phase 2 â€” Backend Integration (Zero UI Rewrite)

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
| Compare DB vs Zod schemas | done |
| Resolve mismatches explicitly | done |

---

## 2.3 Real Tenant Resolution (Strict Boot Sequence)

1. Authenticate
2. Fetch memberships
3. Load last_org_id
4. Validate membership
5. Select org or prompt

| Task | Status |
|---|---|
| Supabase auth integration | done |
| Replace sessionStore mocks | done |
| Persist last_org_id | done |
| Org-aware query cache invalidation on org switch | done |

---

## 2.4 Hook Swap (Critical)

| Hook | Status |
|---|---|
| useDogs -> Supabase | done |
| useDogDetail -> Supabase | done |
| useTransports -> Supabase | done |

Rule:
- UI code must not change

---

## 2.5 Auth & Onboarding Plan

| Task | Status |
|---|---|
| Supabase email/password login screen | done |
| Create account (sign-up) flow | done |
| Session boot: Supabase session -> memberships -> org guard | done |
| Sign-out + cache invalidation | done |
| Password reset hook (MVP) | done |

Flow notes:
- Use Supabase Auth (`signInWithPassword`, `signUp`) with inline error display; no UI rewrite to tabs.
- Boot sequence: check existing session, fetch memberships for `auth.uid()`, restore `last_org_id`, validate membership, set active org or prompt; block screens until org set.
- Keep org selector on list screens (not detail); org switch still invalidates query caches.
- Ensure every query/mutation includes `org_id`; rely on RLS for enforcement.

---

## 2.6 Org Management UI

| Task | Status |
|---|---|
| Membership list for active org | done |
| Add member by user_id + roles | done (via admin RPC / invite flow) |
| Show profile name/email safely | done (admin RPC + view for emails) |
| Invite flow (email-based) | done (includes resend/cancel + auto-accept on bootstrap) |

Notes:
- Membership add currently expects existing Supabase user_id; roles are comma-separated (`admin`, `volunteer`, `foster`, `transport`).
- Email display needs a safe server-side view or RPC (auth schema not accessible via anon key).

---

## 2.7 Atomic Audit Logging (Hard Rule)

| Entity | Mechanism | Status |
|---|---|---|
| Dogs | Trigger (`audit_activity`) | done |
| Transports | Trigger (`audit_activity`) | done |
| Medical records | Trigger (`audit_activity`) | done |
| Expenses | Trigger (`audit_activity`) | done |
| Photos | Trigger (`audit_activity`) | done |
| Documents | Trigger (`audit_activity`) | done |
| Memberships | Trigger (`audit_activity`) | done |

Client-side audit inserts are forbidden (enforced at DB level).

Audit contracts:
- `docs/audit_events.md` defines `event_type` taxonomy and `related.dog_id` linkage used by timeline RPCs.

---

## Phase 2 Definition of Done

- Auth persists across reloads
- RLS blocks cross-org access
- Timeline tabs show real audit + schedule items (Dog/Transport/People detail), defaulting to "Important"
- Phase 1 UI unchanged

# Phase 3 â€” Operations & Production Readiness

Goal: enable real-world NGO operations and harden the app.

---

## Status Legend
planned | in_progress | done | mocked | blocked

---

## 3.1 Storage & Media

| Task | Status |
|---|---|
| dog-photos bucket | done (bucket + policies + path helpers) |
| Upload integration | done (dog photos + dog/transport documents end-to-end with list/open/delete; remaining polish: download buttons, iconography refinements) |
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
| Error boundaries | done (basic global boundary) |
| Offline indicators | planned |
| Structured logger wrapper | done (client-side) |

---

## 3.4 UI System Foundation (Atomic Design + Web-first)

Goal: reduce duplication and enforce a strict component system so **screens become composition-only**.

Constraints:
- Must work on **React Native + Expo + React Native for Web**
- NativeWind-only styling; no new UI frameworks
- Token-first styling: avoid hardcoded `gray-*` / `#hex` in screens

Deliverables:
- `docs/ui_system.md` becomes the authoritative design system reference.
- `components/ui/*` primitives and `components/patterns/*` patterns are created and adopted.

Core primitives:
- `Button`, `Typography`, `Input`, `Spinner`, `cn`

Core patterns:
- `ScreenGuard` (org/session gating)
- `DataView` (loading/error/empty)
- `Drawer`, `TabBar`, `Pagination`, `OrgSelector`

Definition of Done:
- List screens (Dogs/People/Transports) use `ScreenGuard` + `DataView` + `Pagination`.
- Duplicate local UI component definitions removed from screens.
- Web build works: navigation, drawer interactions, and styling verified.

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
- 2026-01-05: Added calendar_events/calendar_reminders tables with RLS/audit, centralized automation trigger, refactored get_calendar_events aggregator (reminders + filters), and refreshed calendar UI/notification sync per `docs/calendar_workflows_plan.md`.
- 2026-01-08: Split tasks from calendar artifacts: added `tasks` table with RLS/indexes, dropped `handle_calendar_workflows` trigger/function, removed legacy system_task rows, and updated `get_calendar_events` + Zod schema to surface tasks with reminders.
- 2026-01-09: Implemented server-side Dog timeline aggregation (`get_dog_timeline`), hardened audit integrity (clients can't insert audit rows), and added structured logging + a global error boundary.
- 2026-01-10: Expanded timelines across detail views (Dog/Transport/People & Homes), added default "Important" filters, and extended audit/schedule RPCs to support per-entity timeline queries.
- 2026-01-11: Hardened Timeline filtering (explicit `event_type`/`source_type` fields) and aligned FlashList usage with installed types; contact edits now invalidate contacts + contact timeline queries.
- 2026-01-12: Resolved remaining TypeScript errors, added load-more support for audit timelines, and documented shared drawer header expectations.


# Phase 4 â€” Scheduling & Reliability (Calendar, Notifications, Sync)

> For the detailed calendar/workflow design and UI polish plan, see `docs/calendar_workflows_plan.md`.

Goal: Implement a robust, offline-first scheduling system for Admins (Web) and Volunteers (Mobile), backed by a self-healing reconciliation engine.

**Critical Architecture Decisions:**
1.  **Single Source of Truth:** A unified Supabase RPC (`get_calendar_events`) aggregates Medical Records, Transports, and dynamically calculated Quarantines.
2.  **Platform Split:** Mobile uses `expo-notifications` (Local); Web uses `sonner` (Toasts).
3.  **Idempotent Sync:** Notifications are scheduled via a "Pull" model on App Resume using deterministic IDs (e.g., `med_{uuid}_{date}`), not a "Push" model on record creation.
4.  **Reconciliation:** The app auto-heals state (data & notifications) when returning from the background.

---

## Status Legend
planned | in_progress | done | mocked | blocked

---

## 4.1 Database & RPC Layer

| Task | Status |
|---|---|
| Migration: Add `get_calendar_events` RPC | done |
| RPC Logic: Dynamic Quarantine calculation (via `orgs.settings`) | done |
| RPC Logic: Unified JSON return shape (Medical + Quarantine + Transport) | done |
| Add `tasks` table, drop legacy dog-stage trigger, include tasks in RPC | done (migration staged; run locally) |
| Zod Schema: `schemas/calendarEvent.ts` (Authoritative shape) | done |

**Technical constraint:** The RPC must handle `org_id` security (RLS) internally or via `SECURITY INVOKER`. Quarantines must be calculated using `orgs.settings.quarantine_days` (defaulting to 14), not stored in a column.
Assumption applied: quarantine start derives from `dogs.extra_fields.quarantine_start` when present, otherwise `dogs.created_at`.

---

## 4.2 Notification Infrastructure (Platform-Aware)

| Task | Status |
|---|---|
| Install `expo-notifications` & `sonner-native` | done |
| Hook: `useNotificationSync.ts` (The Logic Engine) | done |
| Feature: Idempotent scheduling loop (fetch RPC -> schedule with deterministic ID) | done |
| Hook: `useSmartNotification` (The UI helper for immediate feedback) | done |
| Config: `app/_layout.tsx` handler configuration | done |

**Logic:**
- **Mobile:** On `AppState.active`, fetch the next 14 days of events from RPC. Schedule local notifications using `identifier: type_id_date` to prevent duplicates.
- **Web:** Skip local scheduling. Use Toasts for immediate user feedback only.

---

## 4.3 Calendar UI Module

| Component | Status |
|---|---|
| Install `react-native-big-calendar` & `dayjs` | done |
| Screen: `app/(tabs)/calendar/index.tsx` | done |
| Helper: `useCalendarEvents` hook (React Query wrapper around RPC) | done |
| Component: `CalendarHeader` (View switcher: Day/Week/Month) | done |
| UX: Event color coding (Red=Medical, Orange=Quarantine) | done |
| Interaction: Tap event -> Deep link to Dog/Transport Detail | done |

**UI System Compliance:**
- Wrap screen in `ScreenGuard` (Org/Session check).
- Use `PageHeader` for the top nav.
- Use `constants/uiColors.ts` for event colors (do not hardcode hex values if possible).
- Ensure `react-native-big-calendar` is responsive on Web.

---

## 4.4 Data Reconciliation (The Reliability Engine)

| Task | Status |
|---|---|
| Hook: `useAppReconciliation.ts` | done |
| Logic: Invalidate React Query cache on App Resume | done |
| Logic: Trigger `useNotificationSync` on App Resume | done |
| Wiring: Attach to `app/_layout.tsx` | done |

**Goal:** Prevent "Ghost Notifications" (alerts for deleted tasks) and stale UI data.

---

## Phase 4 Definition of Done
- [x] **Database:** RPC returns unified events and respects `org_settings` for quarantine duration.
- [x] **Mobile:** App schedules notifications for the next 14 days immediately upon launch.
- [x] **Resilience:** Changing `org_settings.quarantine_days` instantly updates the Calendar UI and re-schedules notifications on the next sync.
- [x] **UI:** Calendar view works on Web and Mobile; clicking an event navigates to the correct detail screen.
- [x] **Web:** Does not crash on `expo-notifications` imports.





