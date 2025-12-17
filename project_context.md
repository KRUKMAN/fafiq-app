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
