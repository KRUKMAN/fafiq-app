# Project Context (Canonical)

This file is required by `Fafik_System_Context.md` and serves as a short, day-to-day companion document.

## Authority
1. `Fafik_System_Context.md` is the single source of truth.
2. If code conflicts with the system context, align the code to the system context (not vice versa).

## Architecture
- Style: Modular monolith, SaaS-ready.
- Tenancy: `org_id` on every business table; RLS enabled from day one.
- Roles: stored per-org on `memberships.roles[]`; no global role on `profiles`.

## Data flow (mandatory)
UI -> hooks -> query/mutation -> Supabase -> Zod parse -> UI.

## Audit trail (mandatory)
Every meaningful mutation must:
1) perform the write
2) insert an `activity_events` row atomically (trigger/RPC/transactional backend)
3) invalidate relevant queries

## Web-first constraints
- React Native for Web must remain functional.
- NativeWind must be configured for web + native (`metro.config.js`).

## Current status (handover)
- Supabase schema/RLS/audit triggers applied (per `docs/schema.md`/`docs/rls.md`); `database.types.ts` generated from DB.
- Frontend is Supabase-first with mock/demo fallback; session store boots from Supabase (auth + memberships), persists `last_org_id`, supports org switch; password reset hook/UI exists on sign-in.
- Dogs/Transports/Activity hooks are Supabase-backed with Zod parsing; mock data remains for demo mode.
- Storage buckets/policies exist; helpers for dog photos/documents; dog and transport detail screens exercise document uploads.
- Invites/membership admin wired via RPC/view; Settings shows members + emails for admins; org selector present on list views.
- Outstanding: storage UI polish, keep Zod/DB types in sync after migrations, expand audit-driven mutations as features land.
