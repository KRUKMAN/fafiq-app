# Implementation Plan (Phased Roadmap)

This plan is aligned to `Fafik_System_Context.md` and cross-checked against the current codebase.

## Current Codebase Reality (Delta to Target)
- Current domain naming uses `tenant_id` (e.g., `schemas/dog.ts`) but the authoritative context requires `org_id`.
- No tenant-resolution strategy exists (hard-coded tenant in UI).
- No RLS, no schema migrations, no activity logging implementation yet (mock-only).
- No `docs/` directory existed; canonical docs are now defined.
- NativeWind v4 is configured in Tailwind + Babel, but **`metro.config.js` is missing** (likely breaks web/native styling pipeline depending on environment).
- UI prototype lives largely in one screen (`app/(tabs)/index.tsx`) with many inline components (prototype OK; not scalable).

## Phase 1 — Foundation (Auth, Tenant Context, RLS, Layout)

### Goals
- Establish tenant-safe, RLS-safe foundations before building features.

### Deliverables
- Supabase database schema and RLS implemented per `docs/schema.md` + `docs/rls.md`.
- Tenant resolution UX:
  - After login, fetch memberships.
  - If 1 org: auto-select.
  - If multiple: org picker.
  - Persist selection (recommended: store `last_org_id` in local storage or profile field; profile has no roles, so this is allowed).
- Client typing:
  - Generate `database.types.ts` from Supabase and use it in the Supabase client.
- Web readiness:
  - Add `metro.config.js` for NativeWind v4 (P0).
  - Validate expo-router deep linking (web URLs) via route tests/manual checks.

### Definition of Done
- A signed-in user can select an org and all queries are scoped by `org_id`.
- RLS blocks cross-org access even if a client attempts it.
- Web build boots with styling and routing functional.

## Phase 2 — Core Domain (Dogs + Photos)

### Goals
- Implement Dogs as the first full vertical slice, including audit trail.

### Deliverables
- Feature module `features/dogs`:
  - Zod schemas for DB rows and view models.
  - Queries/mutations via TanStack Query.
  - Dog list + dog detail (split current monolithic screen into components).
  - Dog create/edit flows (progressive form UX).
- Storage:
  - Implement uploads to `dog-photos` bucket.
  - `dog_photos` table as the authoritative reference.
- Activity logging:
  - Insert `activity_events` for dog CRUD, stage changes, assignment changes, photo upload.
  - Decide implementation: DB triggers for baseline events + optional app/edge for richer summaries.

### Definition of Done
- Dog CRUD works end-to-end under RLS.
- Photo upload works and is tenant-scoped.
- Dog timeline shows activity events.

## Phase 3 — Operations (Transports, Expenses, Medical, Documents)

### Goals
- Support real operational workflows while keeping the system coherent.

### Deliverables
- Feature modules:
  - `features/transports`: transport CRUD, assignment, status workflow.
  - `features/medical`: medical record CRUD.
  - `features/finance`: expenses CRUD and rollups.
  - `features/documents`: upload and attach to entities.
- Activity logging coverage:
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
- Dogs: List → Detail (Overview / Timeline / Medical / Documents / Financial / People & Housing)
- Transports: List → Detail
- People & Homes (deferred detail, but reserve nav slot)
- Settings (org settings, membership management for admins)

### Navigation
- Desktop: sidebar + top search; deep links to dog/transports.
- Mobile: tabs for primary areas + stacked detail screens; org switcher in profile sheet.

### Ongoing Plan: