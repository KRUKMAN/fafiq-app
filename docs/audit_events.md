# Audit Events (Taxonomy + Contracts)

This document defines the **stable audit/event contract** for FAFIQ / RescueOps.
It is aligned with `docs/Fafik_System_Context.md` and implemented incrementally via DB triggers/RPCs.

## Goals
- Audit events are **append-only**, **tenant-scoped**, and **RLS-protected**.
- Events are **human-readable** (good summaries) and **structured** (stable `event_type`, small payloads).
- Timelines/feeds can be built efficiently without scanning large JSON payloads.

## Source of truth
- Primary storage: `public.activity_events`
- UI feeds should query via RPCs (e.g. `public.get_dog_timeline(...)`) rather than ad-hoc client filtering.

## Core schema
`activity_events` columns (see `docs/schema.md`):
- `org_id`, `created_at`
- `actor_user_id`, `actor_membership_id` (nullable for system events)
- `entity_type`, `entity_id` (source table + row id; not necessarily the “domain entity”)
- `event_type` (stable taxonomy string)
- `summary` (human-readable)
- `payload` (small structured details; never rely on full-row dumps)
- `related` (cross-entity linkage for feeds; indexed where needed)

## `related` contract (feed linkage)
To make timeline queries fast and robust, triggers/RPCs must populate:
- `related.dog_id` (string UUID) for any event that should show up in a dog timeline.
- `related.system` (boolean) when emitted under `service_role` (system actor).

Optional additions (recommended as we expand feeds):
- `related.transport_id`
- `related.document_id`
- `related.contact_id`

## Event taxonomy (recommended)
Naming conventions:
- Lowercase, dot-delimited: `<domain>.<action>[_<qualifier>]`
- Prefer domain entities (singular): `dog`, `transport`, `document`, `photo`, `membership`, `contact`, `org`

Examples:
- Dogs: `dog.created`, `dog.updated`, `dog.stage_changed`, `dog.archived`, `dog.restored`
- Transports: `transport.created`, `transport.updated`, `transport.status_changed`, `transport.archived`, `transport.restored`
- Documents: `document.uploaded`, `document.updated`, `document.deleted`
- Photos: `photo.uploaded`, `photo.updated`, `photo.deleted`

## Current implementation notes
- Legacy “row-change” triggers may still emit generic types (e.g. `medical_records_update`) for tables not yet migrated.
- Newer trigger output focuses on the most visible audit surface first (Dog timeline): dogs/transports/documents/photos.

## UI rendering guidance
- Use `summary` as the primary display string.
- Render structured diffs from `payload.changes` or `payload.from/to` where present.
- Do not render raw nested JSON blobs by default.

