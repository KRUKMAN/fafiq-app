# Calendar & Workflow Plan (Detailed)

## Overview
Make the calendar an industry-standard, maintainable projection that aggregates domain sources, supports manual/workflow artifacts, and drives reminders/notifications without duplicating source data.

## Principles
- Calendar is a read-model projection; domain tables remain source of truth (no cloning medical/transport rows).
- `calendar_events` holds only manual/workflow artifacts; aggregator RPC composes domain sources + these artifacts.
- Workflow rules live in one automation module (e.g., `automation_rules.sql`), not scattered triggers.

## Data Model
- `calendar_events`: `id`, `org_id`, `title`, `start_at`, `end_at`, `type` (`general`, `system_task`, `finance`, `quarantine_artifact`, `external`), `link_type` (`dog`, `profile`, `none`), `link_id`, `is_editable`, `meta jsonb`, audit fields; RLS org-scoped.
- `calendar_reminders`: `id`, `org_id`, `event_id`, `type` (`local`, `push`, `email`), `offset_minutes`, `deterministic_key`, `payload jsonb`, audit; RLS org-scoped.
- Indexes on `start_at/end_at`, `type`, `link_id`, `org_id`.

## Aggregator RPC (`get_calendar_events`)
- Returns unified shape: `event_id`, `org_id`, `source_type` (`medical`, `transport`, `quarantine`, `general`, `system_task`, `finance`, `external`), `source_id`, `title`, `start_at`, `end_at`, `location`, `status`, `link_type`, `link_id`, `meta`, `reminders[]`.
- UNION sources:
  - `calendar_events` (manual/system artifacts).
  - `transports` (window_start/end -> type `transport`).
  - `medical_records` (occurred_on -> type `medical`).
  - `dogs` computed quarantine window (type `quarantine`).
- Filters (server-side): date range, `source_type[]`, `dog_id`, `contact/profile_id` (assignee), `stage`, `visibility`.

## Automation Layer
- New `automation_rules.sql` with centralized function (e.g., `handle_workflow_events()`).
- Triggers call this function on domain tables (initially `dogs`):
  - Stage change to “In Foster” -> system_task check-in event + default reminders.
  - Future: transports assignments, medical with future occurred_on, finance/invoice due, etc.
- Future config: `org_automation_settings` to toggle/parametrize rules (e.g., check-in interval, which stages emit events).

## Frontend & UX
- Filters bar: chips for source type (transport/medical/quarantine/general/system_task/finance), dog selector, contact/foster selector, stage, date range, search. All filters sent to RPC.
- Event detail gate: clicking an event routes to domain drawer (medical/transport/dog) when applicable; otherwise opens Event modal for `general/system_task/finance`.
- Creation flow: “Add Event” menu (General Event modal; Log Medical -> medical form; Schedule Transport -> transport form). Respect `is_editable`.
- Responsive layout; StatusMessage for errors; strings in `constants/strings.ts`; semantic tokens only.

## Notifications
- `useNotificationSync` schedules from RPC-provided `reminders` (uses `deterministic_key`), mobile-only scheduling; web uses StatusMessage/toast.
- `useCalendarEvents` consumes the new shape; mock fallback only for UI rendering.

## Docs & Diagrams
- Keep `docs/implementation_plan.md` in sync; add/update diagrams for calendar data flow and notification sync (reminder-driven).
- Document trigger rules referencing `automation_rules.sql`.

## Next Actions
1) Add schema migration for `calendar_events`/`calendar_reminders` + RLS/indexes.
2) Add `automation_rules` migration with initial dog-stage rule; stub for future settings.
3) Refactor `get_calendar_events` per aggregator design; regenerate types; update Zod schema to include reminders.
4) Update data hooks + notification sync to new shape.
5) Implement calendar UI filters, event detail gate, and “Add Event” menu/modal; ensure dog/contact/stage filters and domain routing.
6) Refresh docs/diagrams to match (data-flow + notification sync). 
