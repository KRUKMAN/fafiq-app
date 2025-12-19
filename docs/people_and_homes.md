# People & Homes (Contacts Model)

Goal: keep one mental model: **a Contact** can represent a person, foster home, or transporter contact. A Contact can optionally be linked to a real app user. Contacts can exist without users.

Non-negotiables:
- Authorization roles remain on `memberships.roles[]` (per `Fafik_System_Context.md`).
- Contacts are operational directory records, not authentication identities.

## Status (implemented)

Database:
- `supabase/migrations/20251226_org_contacts.sql` (table + RLS + audit + sync triggers + RPCs)
- `supabase/migrations/20251228_soft_delete.sql` (adds `deleted_at` + read-policy exclusions)

App:
- UI: `app/(tabs)/people/index.tsx`
- Data: `lib/data/contacts.ts`, `hooks/useOrgContacts.ts`
- Invite/link sequences: `docs/diagrams/sequences/08_contact_invite_and_link.mmd`

## Schema (current)

### `org_contacts`
Key fields:
- `org_id`, `kind` (`person`/`home`), `display_name`
- `email citext`, `phone`
- `roles text[]` (operational tagging/UI; authorization still uses `memberships.roles[]`)
- `linked_user_id`, `linked_membership_id` (nullable linkage)
- `address jsonb`, `extra_fields jsonb`
- `deleted_at timestamptz` (soft delete)

Uniqueness (as implemented):
- `unique (org_id, linked_user_id)`
- `unique (org_id, email)` (case-insensitive because `citext`)

### Contact assignment columns
Core tables support assigning either an app user (membership) or an offline contact:
- `dogs.responsible_contact_id`, `dogs.foster_contact_id`
- `transports.assigned_contact_id`

Invariant:
- Prefer membership assignments when a user exists; contact assignments cover offline people/homes.

## Linking flows (current)

### Auto-link on session bootstrap (best effort)
1) Accept org invites for current user (creates/activates membership)
2) For each membership org: call `link_my_contact_in_org(org_id)` (matches `org_contacts.email` to auth JWT email)

### RPCs
- `link_my_contact_in_org(p_org_id uuid)` (authenticated; self-link by email match)
- `admin_link_contact_to_user(p_org_id, p_contact_id, p_user_id)` (admin/service role; explicit linking)

## Role/name sync (current)

Membership remains canonical for authorization. For linked contacts:
- Membership insert/update(roles, active) upserts/syncs the linked contact and overwrites contact roles to match membership roles.
- Profile insert/update(full_name) updates linked contact `display_name`.

## UI behavior (current)

The People & Homes screen defaults to contacts and supports:
- Filters: fosters / transporters / homes / unlinked
- Actions: create contact; invite by email (admin); admin-link contact to user (admin)
