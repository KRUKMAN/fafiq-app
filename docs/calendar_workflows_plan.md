# Calendar & Workflow Plan (Detailed)

## Overview
Make the calendar a maintainable projection that aggregates domain sources, supports manual artifacts and tasks, and drives reminders/notifications without duplicating source data.

## Principles
- Calendar is a read-model projection; domain tables remain source of truth (no cloning medical/transport rows).
- `calendar_events` holds manual artifacts; `tasks` holds actionable checklists. The aggregator RPC composes domain sources plus these artifacts.
- Workflow rules must be centralized (future automation module), not scattered triggers. The legacy dog-stage trigger was removed to avoid hidden inserts.

## Data Model
- `calendar_events`: `id`, `org_id`, `title`, `start_at`, `end_at`, `type` (`general`, `finance`, `quarantine_artifact`, `external`), `link_type` (`dog`, `profile`, `none`), `link_id`, `is_editable`, `meta jsonb`, audit fields; RLS org-scoped.
- `calendar_reminders`: `id`, `org_id`, `event_id`, `type` (`local`, `push`, `email`), `offset_minutes`, `deterministic_key`, `payload jsonb`, audit; RLS org-scoped.
- `tasks`: `id`, `org_id`, `title`, `description`, `status` (`todo`/`in_progress`/`done`/`canceled`), `priority`, `due_at`, `link_type`, `link_id`, `assigned_membership_id`, audit fields; RLS org-scoped.
- Indexes on `start_at/end_at`, `type`, `link_id`, `org_id` (calendar) and org-scoped indexes on tasks (`org_id`, `org_id,status`, `org_id,due_at`, `org_id,assigned_membership_id`).

## Aggregator RPC (`get_calendar_events`)
- Returns unified shape: `event_id`, `org_id`, `source_type` (`medical`, `transport`, `quarantine`, `general`, `finance`, `external`, `task`), `source_id`, `title`, `start_at`, `end_at`, `location`, `status`, `link_type`, `link_id`, `meta`, `reminders[]`.
- UNION sources:
  - `calendar_events` (manual artifacts).
  - `transports` (window_start/end -> type `transport`).
  - `medical_records` (occurred_on -> type `medical`).
  - `dogs` computed quarantine window (type `quarantine`).
  - `tasks` (due_at or created_at -> type `task` with inline reminders).
- Filters (server-side): date range, `source_type[]`, `dog_id`, `contact/profile_id` (assignee), `stage`, `visibility`.

## Automation Layer
- Future: centralized automation module that emits tasks instead of directly writing calendar rows.
- Legacy trigger `handle_calendar_workflows` on `dogs` was removed; foster check-ins should be explicit task creation in the service layer or a future automation module.
- Future config: `org_automation_settings` to toggle/parametrize rules (e.g., check-in interval, which stages emit tasks).

## Frontend & UX
- Filters bar: chips for source type (transport/medical/quarantine/general/finance/task), dog selector, contact/foster selector, stage, date range, search. All filters sent to RPC.
- Event detail gate: clicking an event routes to domain drawer (medical/transport/dog) when applicable; otherwise opens Event modal for `general/finance/task`.
- Creation flow: “Add Event” menu (General Event modal; Log Medical -> medical form; Schedule Transport -> transport form; Create Task flow). Respect `is_editable`.
- Responsive layout; StatusMessage for errors; strings in `constants/strings.ts`; semantic tokens only.

## Notifications
- `useNotificationSync` schedules from RPC-provided `reminders` (uses `deterministic_key`), mobile-only scheduling; web uses StatusMessage/toast.
- `useCalendarEvents` consumes the new shape; mock fallback only for UI rendering. Tasks surface with default 60-minute reminders before due time.

## Docs & Diagrams
- Keep `docs/implementation_plan.md` in sync; update diagrams for calendar data flow and notification sync (task-aware reminders).
- Document trigger/automation rules in one place once the automation module is reintroduced.

## Next Actions
1) Add schema migration for `calendar_events`/`calendar_reminders` + tasks + RLS/indexes. **Done.**
2) Add `automation_rules` migration with future dog/foster rules that create tasks (not calendar rows); stub for future settings.
3) Refactor `get_calendar_events` per aggregator design; regenerate types; update Zod schema to include reminders + `task` source type. **Done.**
4) Update data hooks + notification sync to new shape. **Done** for source type parsing; revisit notification scheduling if task-specific logic needed.
5) Implement calendar UI filters, event detail gate, and “Add Event” menu/modal; ensure dog/contact/stage filters and domain routing. **Done.**
6) Refresh docs/diagrams to match (data-flow + notification sync). **In progress.**
