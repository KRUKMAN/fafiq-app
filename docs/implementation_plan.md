# Implementation Plan (Phased Roadmap)

This plan is aligned to `Fafik_System_Context.md` and cross-checked against the current codebase.

## Current Codebase Reality (Delta to Target)
- Domain naming is aligned to `org_id` in the app code; ensure the database schema/RLS uses `org_id` consistently end-to-end.
- No tenant-resolution strategy exists (hard-coded tenant/org in UI).
- No RLS, no schema migrations, no activity logging implementation yet (mock-only).
- NativeWind v4 is configured in Tailwind + Babel, but `metro.config.js` was missing.
- UI prototype lives largely in one screen (`app/(tabs)/index.tsx`) with many inline components (prototype OK; not scalable).

## Phase 1 — Foundation (Auth, Tenant Context, RLS, Layout)

### Goals
- Establish tenant-safe, RLS-safe foundations before building features.
- Make audit logging atomic from day one.

### Deliverables
- Canonical context files:
  - Keep `Fafik_System_Context.md` as the source of truth.
  - Add `project_context.md` (required by System Context).
- Database foundation:
  - Implement schema per `docs/schema.md`.
  - Implement RLS per `docs/rls.md` on every business table.
- Org settings:
  - Use `orgs.settings` for NGO-configurable values (`dog_stages`, `transport_statuses`).
  - Seed default `orgs.settings` values on org creation/migration so the app can populate dropdowns.
- Tenant resolution strategy (strict boot sequence):
  1) Authenticate.
  2) Fetch the user’s active memberships.
  3) Read `last_org_id` from local storage.
  4) If `last_org_id` is present in memberships: select it.
  5) If not: fall back to the first active membership org and overwrite `last_org_id`.
  6) If user has no memberships: route to “Create/Join Org” flow (do not crash on RLS errors).
- Type safety:
  - Generate `database.types.ts` from Supabase and use it in the Supabase client.
  - Require Zod schemas to parse into (or explicitly map to) DB-generated types to prevent drift.
- Web readiness:
  - Add `metro.config.js` using `withNativeWind` with input `./global.css` (P0).
  - Validate expo-router deep linking (web URLs) via manual checks.

### Audit logging decision (Phase 1 hard rule)
- Reject client-side “two-step” audit logging.
- Require atomic write + audit event via:
  - Postgres triggers for simple CRUD; and/or
  - Supabase RPCs (stored procedures) for complex domain mutations (e.g., assign foster, stage transitions).

### Definition of Done
- A signed-in user can select an org and all queries are scoped by `org_id`.
- RLS blocks cross-org access even if a client attempts it.
- Web build boots with styling and routing functional.
- Every mutation path has an atomic audit mechanism selected (trigger/RPC) and documented.

## Phase 2 — Core Domain (Dogs + Photos)

### Goals
- Implement Dogs as the first full vertical slice, including audit trail.

### Deliverables
- Feature module `features/dogs`:
  - Zod schemas for DB rows and view models (aligned to `database.types.ts`).
  - Queries/mutations via TanStack Query (scoped by active `org_id`).
  - Dog list + dog detail (split current monolithic screen into components).
  - Dog create/edit flows (progressive form UX).
- Storage:
  - Implement uploads to `dog-photos` bucket.
  - `dog_photos` table as the authoritative reference.
- Activity logging (atomic):
  - `activity_events` for dog CRUD, stage changes, assignment changes, photo upload.
  - Implement via triggers/RPCs (not client-side inserts).

### Definition of Done
- Dog CRUD works end-to-end under RLS.
- Photo upload works and is tenant-scoped.
- Dog timeline shows activity events.

## Phase 3 — Operations (Transports, Expenses, Medical, Documents)

### Goals
- Support real operational workflows while keeping the system coherent.

### Deliverables
- Feature modules:
  - `features/transports`: CRUD, assignment, status workflow.
  - `features/medical`: medical record CRUD.
  - `features/finance`: expenses CRUD and rollups.
  - `features/documents`: upload and attach to entities.
- Activity logging coverage (atomic):
  - transport lifecycle
  - medical events
  - expenses created/edited
  - document uploaded/deleted

### Definition of Done
- A coordinator can run day-to-day operations without leaving the system.
- Activity stream provides a trustworthy audit trail.

## UX Plan

### Screen map (web-first, mobile-later)
- Auth
- Org Picker (if multiple memberships)
- Dogs: List -> Detail (Overview / Timeline / Medical / Documents / Financial / People & Housing)
- Transports: List -> Detail
- People & Homes (deferred detail, but reserve nav slot)
- Settings (org settings, membership management for admins)

### Navigation
- Desktop: sidebar + top search; deep links to dog/transports.
- Mobile: tabs for primary areas + stacked detail screens; org switcher in profile sheet.
