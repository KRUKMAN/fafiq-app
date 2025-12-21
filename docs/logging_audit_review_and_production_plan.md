# Logging & Audit Trail Review (Current State) + Production Plan

Last reviewed: 2025-12-20

This document summarizes:
1) what the app logs/tracks today (errors + performance + runtime logs),
2) how the audit trail is generated and surfaced today,
3) gaps vs the requirements in `docs/Fafik_System_Context.md`,
4) a production-ready implementation plan to close those gaps.

---

## Scope (what was reviewed)

Docs / diagrams first:
- `docs/execution_index.md`
- `docs/Fafik_System_Context.md`
- `docs/schema.md`, `docs/rls.md`, `docs/storage.md`
- `docs/architecture_round3_polish.md`
- `docs/diagrams/*` (system overview, module map, ERD, authz access, sequences)

Code:
- App screens: `app/(tabs)/dogs/*`, `app/(tabs)/transports/*`, `app/(tabs)/people/*`, `app/(tabs)/settings/*`
- Data layer: `lib/data/*`, `lib/supabase.ts`, `stores/sessionStore.ts`
- Audit consumers: `hooks/useDogTimeline.ts`, `lib/data/activityEvents.ts`
- Supabase migrations: `supabase/migrations/*` (schema/RLS/audit/triggers/RPCs)

---

## Architecture recap (from docs/diagrams)

- Expo RN/Web client, modular monolith style: UI -> hooks -> `lib/data/*` -> Supabase -> Zod parse -> UI
  (`docs/diagrams/01_system_overview.mmd`, `docs/diagrams/02_module_map.mmd`).
- Tenancy is `org_id` everywhere; RLS from day one (`docs/Fafik_System_Context.md`, `docs/rls.md`).
- Audit trail is required: append-only, tenant-scoped, structured + human-readable (`docs/Fafik_System_Context.md`).

---

## A) Current logging / error handling / performance tracking (reality)

### Runtime logging
- Centralized logger wrapper exists (`lib/logger.ts`) and is wired into:
  - `lib/supabase.ts` (missing env vars)
  - `stores/sessionStore.ts` (best-effort bootstrap steps)
  - `lib/data/calendarEvents.ts` (parsing/fallback warnings)
  - `hooks/useSmartNotification.ts` (toast best-effort)
- Supports log levels (`EXPO_PUBLIC_LOG_LEVEL`) + structured fields + redaction, but there is still no external aggregation.

### Error handling UX
- Most failures surface as thrown `Error(...)` from `lib/data/*` and are displayed via inline UI messages.
  - Inline feedback rule is documented in `docs/editing.md` and implemented via `components/ui/StatusMessage.tsx`.
- A basic global error boundary exists (`components/patterns/AppErrorBoundary.tsx`), but there is still no crash capture SDK (Sentry/Bugsnag/etc).

### Performance / monitoring
- No monitoring SDK, no tracing, no metrics (client-side or server-side).
- There are reliability behaviors (React Query caching, `useAppReconciliation` invalidations, notification reconciliation)
  but no instrumentation to measure them.

---

## B) Current audit trail strategy (reality)

### Where audit events are generated

Database-first audit via triggers:
- `public.activity_events` exists and is RLS-protected (`supabase/migrations/20251218_schema_rls_audit.sql`).
- `public.log_activity_event(...)` inserts an activity row and attempts to resolve `actor_membership_id` from `auth.uid()`
  membership (`supabase/migrations/20251218_schema_rls_audit.sql`).
- `public.audit_activity()` is a generic trigger function that logs INSERT/UPDATE/DELETE with a full-row JSON payload:
  - `event_type = lower(tg_table_name) || '_' || lower(tg_op)` (e.g., `dogs_update`)
  - `entity_type = tg_table_name` (e.g., `dogs`)
  - `entity_id = <row id>`

Audit triggers are currently attached to:
- `dogs`, `transports`, `medical_records`, `expenses`, `dog_photos`, `documents`, `memberships`
  (`supabase/migrations/20251218_schema_rls_audit.sql`)
- `org_contacts` (`supabase/migrations/20251226_org_contacts.sql`)
- `org_invites` (`supabase/migrations/20251227_audit_invites.sql`)
- `calendar_events`, `calendar_reminders` (`supabase/migrations/20260105_calendar_workflows.sql`)

### Where audit events are consumed in the UI today
- Only the Dog detail Timeline tab reads from `activity_events`:
  - `hooks/useDogTimeline.ts` -> `lib/data/activityEvents.ts` -> RPC `get_dog_timeline(org_id, dog_id)`

---

## Key findings (gaps vs production expectations)

### 1) Dog timeline mismatch was breaking live mode (fixed)
- DB triggers emit `entity_type = 'dogs'` (`tg_table_name`) by default, while the UI contract used `entity_type = 'dog'`.
- This is now handled by a dedicated RPC aggregation (`public.get_dog_timeline(...)`) consumed by `useDogTimeline(...)`,
  so the timeline no longer depends on a single `entity_type` literal.

### 2) Even after fixing the type mismatch, "dog timeline" won't include related events
Related-table events are anchored to related row IDs:
- document upload -> `entity_type='documents'`, `entity_id=<document.id>`
- transport create/update -> `entity_type='transports'`, `entity_id=<transport.id>`

The current timeline query only pulls events where `entity_id = <dog.id>`, so these won't show up for a dog.

### 3) Current DB-generated events are row-change logs, not domain audit events
The system context calls for "structured + human-readable" domain events (examples like stage changes, assignments,
document events). Current triggers generate:
- generic `event_type` (`dogs_update`, `documents_insert`, ...)
- generic summary (`Dogs <name> update`) and a large payload (full row snapshots)

This creates:
- noisy feed (every update is "update")
- poor readability (nested payloads render as `[object Object]` in the current UI payload renderer)
- harder i18n and filtering (no stable domain taxonomy)

### 4) Audit integrity is weaker than "audit-grade"
Current security model allows org members to insert into `activity_events` via RLS policy (and the `log_activity_event`
function may still be executable unless explicitly revoked). That means clients can potentially forge audit entries.

### 5) Coverage gaps vs "everything meaningful must be audited"
Missing or incomplete coverage today:
- Org settings changes (`orgs.settings`) have no audit trigger; updates won't be recorded.
- Tasks table has no audit trigger in migrations (`supabase/migrations/20260108_tasks_refactor.sql`).
- Some "meaningful actions" are not persisted at all, so they cannot be audited:
  - Dog notes are currently UI-local only (`app/(tabs)/dogs/[id].tsx` uses `setNotes`, no DB write).

### 6) Audit attribution fields exist but are not populated on most tables
Many tables include `created_by_membership_id` / `updated_by_membership_id`, but (outside calendar workflows) they are not
set by triggers/RPCs. Net: you rely on `activity_events` for "who did this" instead of storing it on the row as well.

### 7) Docs drift vs code
Example:
- `docs/schema.md` claims documents UI uploads without inserting `documents` rows; current UI does insert `documents` rows
  (still with placeholder "sample upload" flows).

### 8) App-level correctness gaps adjacent to audit/logging
These don't change the strategy, but they matter for production readiness:
- "Upload document" flow is currently a sample blob (placeholder) in dog detail; transport detail has list/open only (no upload yet).
- Some mutations don't invalidate/refetch related queries (e.g., transport screen document delete doesn't invalidate
  `useDocuments`; contact edit doesn't refetch contacts).

---

## Action coverage matrix (UI -> DB writes -> audit)

This table is keyed to `docs/action_matrix.md` and current code.

Legend:
- DB audit today: what the current generic triggers produce
- Visible today: whether it shows up anywhere in the UI audit trail (currently only dog timeline)

| UI action | Code path | DB write(s) | DB audit today | Visible today | Gap / note |
|---|---|---|---|---|---|
| Create dog | `app/(tabs)/dogs/create.tsx` -> `createDog` | `INSERT dogs` | `event_type=dogs_insert`, `entity_type=dogs`, `entity_id=<dog.id>` | No | `entity_type` mismatch (`dog` vs `dogs`) |
| Edit dog (inline) | `app/(tabs)/dogs/[id].tsx` -> `updateDog` | `UPDATE dogs` | `dogs_update` | No | type mismatch; also no domain semantics |
| Edit dog (screen) | `app/(tabs)/dogs/[id]/edit.tsx` -> `updateDog` | `UPDATE dogs` | `dogs_update` | No | same |
| Soft delete dog | `app/(tabs)/dogs/index.tsx` -> `softDeleteDog` | `UPDATE dogs (deleted_at=...)` | `dogs_update` | No | should be domain event like `dog.archived` |
| Assign foster | `app/(tabs)/dogs/[id].tsx` -> `updateDog` | `UPDATE dogs` | `dogs_update` | No | should be `dog.foster_assigned` w/ old/new |
| Upload dog photo | `app/(tabs)/dogs/[id].tsx` -> `addDogPhotoRecord` | `INSERT dog_photos` | `dog_photos_insert` | No | should appear in dog timeline (subject mapping needed) |
| Upload dog document | `app/(tabs)/dogs/[id].tsx` -> `createDocumentRecord` | `INSERT documents` | `documents_insert` | No | should appear in dog timeline (subject mapping needed) |
| Delete dog document | `app/(tabs)/dogs/[id].tsx` -> `deleteDocumentRecord` | `DELETE documents` | `documents_delete` | No | same |
| Create transport | `app/(tabs)/transports/index.tsx` -> `createTransport` | `INSERT transports` | `transports_insert` | No | should appear in dog timeline when linked to dog |
| Update transport | `app/(tabs)/transports/index.tsx` -> `updateTransport` | `UPDATE transports` | `transports_update` | No | should be domain events (status changed, assigned, etc.) |
| Soft delete transport | `app/(tabs)/transports/index.tsx` -> `softDeleteTransport` | `UPDATE transports (deleted_at=...)` | `transports_update` | No | should be `transport.canceled/archived` |
| Create contact | `app/(tabs)/people/index.tsx` -> `createOrgContact` | `INSERT org_contacts` | `org_contacts_insert` | Yes | timeline exists; events are still generic row-change logs |
| Edit contact | `components/people/PeopleDrawers.tsx` -> `updateOrgContact` | `UPDATE org_contacts` | `org_contacts_update` | Yes | timeline exists; events are still generic row-change logs |
| Invite member | `app/(tabs)/settings/index.tsx` -> `inviteOrgMember` (RPC) | `INSERT/UPDATE org_invites` (+ maybe memberships) | `org_invites_insert/update` (+ memberships events) | No | should have explicit domain invite events |
| Update member roles | `app/(tabs)/settings/index.tsx` -> `updateMembershipRoles` | `UPDATE memberships` | `memberships_update` | No | might also trigger `org_contacts_update` via sync |
| Update org picklists | `app/(tabs)/settings/index.tsx` -> `updateOrgSettings` | `UPDATE orgs` | none | No | missing audit trigger for orgs/settings |
| Download my data | `app/(tabs)/settings/index.tsx` -> `downloadMyData` (RPC) | none | none | N/A | OK (read action), but consider logging as security event |
| Delete my account | `app/(tabs)/settings/index.tsx` -> `deleteMyAccount` (RPC) | `UPDATE profiles/memberships/org_contacts/auth.users` | memberships/org_contacts events only | No | should have explicit `account.deleted` security/audit event |

---

## Target state (production-ready)

### 1) Separate "observability" from "audit trail"
- Observability is for engineers: errors, performance, diagnostics (Sentry/APM/log aggregation).
- Audit trail is for users/admins: who did what, when, to which entity, and why, with stable event taxonomy.

### 2) Domain audit event model (recommended)

Keep `activity_events`, but treat it as domain events (not raw row-change logs).

Recommended conventions:
- `event_type`: stable domain taxonomy (e.g., `dog.stage_changed`, `dog.foster_assigned`, `document.uploaded`)
- `summary`: short human-readable string for timeline cards
- `payload`: small structured fields (old/new values, ids, filenames, etc.)
- `related`: cross-entity references (e.g., `dog_id`, `transport_id`, `document_id`)

### 3) Timeline retrieval that includes related entities

To produce a correct Dog timeline without duplicating events, add an RPC that returns:
- dog-row events, plus
- related-table events by joining on real relationships:
  - documents where `documents.entity_type='dog' and documents.entity_id=<dogId>`
  - transports where `transports.dog_id=<dogId>`
  - photos where `dog_photos.dog_id=<dogId>`
  - later: medical_records / expenses / tasks where `dog_id` (or link) matches

This can be implemented even before you redesign event taxonomy.

Example SQL shape (simplified; adjust types/columns as needed):

```sql
create or replace function public.get_dog_timeline(
  p_org_id uuid,
  p_dog_id uuid,
  p_limit int default 100,
  p_before timestamptz default null
)
returns setof public.activity_events
language sql
security invoker
as $$
  with base as (
    select ae.*
    from public.activity_events ae
    where ae.org_id = p_org_id
      and (p_before is null or ae.created_at < p_before)
  ), dog_events as (
    select ae.*
    from base ae
    where ae.entity_id = p_dog_id
      and ae.entity_type in ('dog', 'dogs')
  ), document_events as (
    select ae.*
    from base ae
    join public.documents d
      on d.org_id = ae.org_id
     and ae.entity_type = 'documents'
     and ae.entity_id = d.id
    where d.entity_type = 'dog'
      and d.entity_id = p_dog_id
  ), transport_events as (
    select ae.*
    from base ae
    join public.transports t
      on t.org_id = ae.org_id
     and ae.entity_type = 'transports'
     and ae.entity_id = t.id
    where t.dog_id = p_dog_id
  ), photo_events as (
    select ae.*
    from base ae
    join public.dog_photos p
      on p.org_id = ae.org_id
     and ae.entity_type = 'dog_photos'
     and ae.entity_id = p.id
    where p.dog_id = p_dog_id
  )
  select *
  from (
    select * from dog_events
    union all select * from document_events
    union all select * from transport_events
    union all select * from photo_events
  ) merged
  order by created_at desc
  limit p_limit;
$$;
```

### 4) Audit integrity hardening
Production expectation: clients should not be able to forge audit events.
- Remove direct client insert paths to `activity_events`
- Only write audit events via:
  - triggers (DB mutation implies audit)
  - RPCs that perform the mutation and log the event atomically

---

## Detailed implementation plan

### Phase 0 (1-2 days): Decide and document the contract
[ ] Confirm which actions are "meaningful mutations" (start from `docs/action_matrix.md`) and define minimum audit coverage
    per `docs/Fafik_System_Context.md`.
[ ] Decide canonical `event_type` taxonomy and naming conventions (singular domain types recommended: `dog`, `transport`,
    `document`, `contact`, `membership`).
[ ] Decide whether to keep a separate internal "raw row-change" table (optional) vs migrating fully to domain events in
    `activity_events`.

Deliverables:
- [x] Documented taxonomy + coverage checklist (`docs/audit_events.md`).
- Docs drift fixups: update `docs/schema.md`, `docs/rls.md`, and `docs/implementation_plan.md` where they no longer match reality.

### Phase 1 (1-2 days): Make Timeline functional (correctness first)

1) Fix the `entity_type` mismatch immediately:
- Option A (short-term): make `fetchActivityEvents` query both `dog` and `dogs` (or query by a list of aliases).
- Option B (preferred long-term): change DB emission to canonical domain `entity_type` values (e.g., map table `dogs` -> `dog`).

2) Add server-side timeline RPC (dog first):
[x] Add `supabase/migrations/20260109_dog_timeline_rpc.sql` implementing `get_dog_timeline(...)` (see example above).
[x] Add indexes if needed to keep timeline queries fast (especially on join keys).
[x] Add timeline RPCs for other detail views:
- `get_transport_timeline(...)`
- `get_contact_timeline(...)`
- `get_member_activity(...)`

3) Wire UI to the RPC:
[x] Extend `lib/data/activityEvents.ts` to call the new RPC.
[x] Update `hooks/useDogTimeline.ts` to use the new RPC and keep the query key stable.
[x] Update Timeline UI rendering to handle nested payloads (at minimum, render JSON in a readable way; ideally render diffs).

Validation:
- Dog timeline shows at least: dog create/update, foster assignment, document uploads/deletes, transport create/update (when linked).

### Phase 2 (1-2 days): Audit integrity hardening
[x] Ensure clients cannot directly write audit events:
- `revoke insert on public.activity_events from authenticated;`
- `revoke insert on public.activity_events from anon;`
- `revoke all on function public.log_activity_event(...) from public;`
- grant execute only to `service_role` if you still need to log events from server/edge code.
[x] Update `docs/rls.md` to reflect the new guarantees (read-only `activity_events` for clients; writes only via triggers/RPC).

[x] Keep audit append-only:
- no UPDATE/DELETE policies exist for `activity_events`, and privileges are revoked from `anon`/`authenticated`.

[x] Add explicit "system actor" support (optional but recommended):
- when running under `service_role`, mark the event as system-generated (via `related.system=true`).

Validation:
- Attempted client insert into `activity_events` fails.

### Phase 3 (3-7 days): Replace row-change logs with domain events (reduce noise, improve UX)

1) Add missing audit coverage:
[ ] Add audit for org settings changes (either:
  - add an audit trigger on `orgs`, or
  - route org settings updates through an RPC that logs `org.settings_updated`).
[ ] Add audit trigger / RPC logging for `tasks` (once tasks CRUD is wired).
[ ] Persist dog notes (new table + RLS + triggers/RPC) and log `dog.note_added`.

2) Improve semantics for soft deletes:
[x] Replace "soft delete = update" ambiguity (dogs/transports):
- log explicit domain events when `deleted_at` transitions from null -> non-null (e.g., `dog.archived`, `transport.archived`)
- log explicit domain events on restore.

3) Populate `created_by_membership_id` / `updated_by_membership_id` consistently:
[ ] Add shared triggers/functions to set actor membership IDs on inserts/updates for org-scoped tables (dogs/transports/documents/photos/contacts/...).

4) Reduce payload sensitivity and size:
[ ] Replace full-row snapshots with:
- whitelist diffs (changed fields only)
- PII redaction for sensitive columns (medical notes, freeform notes, etc.)

Validation:
- Timeline cards become human-readable and stable; event filters become possible.

### Phase 4 (2-5 days): Production observability (logging + errors + performance)
[ ] Add an error/trace SDK (e.g., Sentry for Expo RN/Web) with:
- global error boundary
- unhandled promise rejection capture
- performance tracing (navigation + network/RPC spans)

[x] Introduce a thin logger wrapper (`lib/logger.ts`) that:
- uses `console.*` in dev
- forwards warnings/errors as breadcrumbs/events in production
- supports structured context fields and redaction

[ ] Instrument Supabase calls:
- measure RPC/select durations
- log failures with structured context (table/rpc name, org_id, user id presence, error code)

Validation:
- A forced crash is captured; slow RPCs show up; you can correlate user reports to logs.

---

## Completeness check (does this plan fully address the issues?)

This plan fully addresses the previously identified issues if all phases are completed:
- What we log / track / handle errors / performance: Phase 4 adds production-grade error + perf telemetry and a consistent logging strategy.
- Audit trail creation: Phases 1-3 align the event contract, make timelines correct, add missing coverage, and improve semantics.
- "Is every action audited?": Phase 0 defines a canonical coverage checklist from `docs/action_matrix.md`; Phase 3 implements missing audit points and semantics (soft delete, org settings, tasks, notes).
- Audit integrity: Phase 2 removes client forging paths and formalizes system actors.
- UI visibility: Phase 1 introduces server-side timeline aggregation so related events show up for a dog.

If you only do Phase 1, you'll likely get a working timeline but still not a production-grade audit trail.

---

## Testing and validation (recommended)

DB / Supabase:
- Run `supabase/verify_full.sql` and confirm audit triggers/RLS/policies are present after migrations.
- Verify that direct client INSERT into `public.activity_events` is denied after Phase 2.
- Verify `get_dog_timeline(...)` returns a merged feed (dog updates + related docs/transports/photos) and respects RLS.

App:
- Create/edit/delete dog; assign foster; upload/delete document; create/update transport; confirm timeline updates.
- Force a crash and verify it is captured (after Phase 4 telemetry is added).

## Open questions (need decisions before Phase 3)
- Do you want a separate internal "raw row-change" table for debugging/compliance, distinct from the user-facing activity feed?
- Should storage-object deletion be coupled to document-row deletion (Edge Function) or handled asynchronously (background job)?
- What are the minimum "security events" that should be logged (sign-in, failed auth, role changes, account deletion)?
