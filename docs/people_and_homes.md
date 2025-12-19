# People & Homes (Contacts Model)

Goal: keep one mental model: **a Contact** can represent a person, foster home, or transporter contact. A Contact can optionally be linked to a real app user. Every user maps to a contact, but contacts can exist without users.

Constraints (do not break):
- Authorization roles remain on `memberships.roles[]` (per `Fafik_System_Context.md` / `docs/schema.md`).
- Contacts are operational records (directory + assignment), not an auth identity.

## Proposed schema changes (minimal + consistent)

### 1) New table: `org_contacts`
Org-scoped directory of people/homes that may or may not be users.

Key fields (suggested):
- `id uuid pk`
- `org_id uuid not null`
- `kind text not null` (e.g. `person`, `home`) — keep as text for MVP
- `display_name text not null`
- `email citext null`
- `phone text null`
- `roles text[] not null default '{}'` (same vocabulary as memberships: `admin`, `volunteer`, `foster`, `transport`)
- `linked_user_id uuid null references auth.users(id)`
- `linked_membership_id uuid null references public.memberships(id)` (optional convenience; see below)
- `address jsonb not null default '{}'`
- `extra_fields jsonb not null default '{}'`
- standard timestamps + `created_by_membership_id`/`updated_by_membership_id`

Uniqueness (recommended):
- `unique (org_id, linked_user_id)` where linked_user_id is not null (enforced with a partial unique index)
- `unique (org_id, lower(email))` where email is not null (optional; prevents duplicate contacts for same email)

RLS:
- org members can read/write within their org (or tighten creation/edit to admins if needed).

Audit:
- add `audit_activity` trigger on insert/update/delete.

### 2) Allow assignment to a Contact *or* a Membership (avoid “offline auth users”)
For the MVP, keep existing membership FKs and add parallel contact FKs where needed:
- `dogs.responsible_contact_id uuid null references org_contacts(id)`
- `dogs.foster_contact_id uuid null references org_contacts(id)`
- `transports.assigned_contact_id uuid null references org_contacts(id)`

Invariant:
- When a membership assignment exists, prefer it; contact assignment is used when the person has no app account yet.
- When a contact is linked to a membership later, you can optionally migrate “*_contact_id” → “*_membership_id” via a backfill script/RPC.

### 3) Linking a Contact to a User (roles alignment)
When someone becomes a real app user:
- Create/ensure a `memberships` row for that org/user (existing invite flow already does this).
- Link the contact by setting `org_contacts.linked_user_id` (and optionally `linked_membership_id`).
- Copy roles:
  - If contact existed first: set `memberships.roles = org_contacts.roles` (admin action / RPC).
  - After linking, treat `memberships.roles` as the authorization source of truth; keep `org_contacts.roles` in sync (trigger or RPC) to preserve the “single mental model” in the UI.

## UI/UX implications
- People & Homes page becomes a directory of `org_contacts` (not only memberships).
- Tabs/filters:
  - **All contacts**, **Fosters**, **Transporters**, **Homes**
  - filter by “Linked to app user” vs “Offline contact”
- Actions:
  - Create contact (person/home), assign roles, add email/phone/address.
  - Invite by email (existing invite RPC), then later link contact automatically by matching email + org, or manually via “Link to user”.

## Docs updates required when implemented
- Update `docs/schema.md` with `org_contacts` and new FK columns.
- Update `docs/rls.md` with policies for `org_contacts` and new FK usage.
- Update diagrams: add a sequence for “Create contact → Invite → Auto-accept → Link contact”.


Here’s a detailed, implementation-ready plan to get us to: Contacts (person/home) as the operational base unit, optionally linked to a real app user, while keeping authorization roles on memberships.roles[] (per system context + schema).

0) Target invariants (agree first)
Contacts are not auth identities. Only auth.users can log in.
Every app user should have exactly one Contact per org (created automatically).
Not every Contact is a user (offline fosters/homes/transporters are contacts without linked_user_id).
Auth/permissions stay membership-based: RLS + has_role() continues to use memberships.roles[].
Roles shown in UI should feel unified:
Unlinked contact: roles live on org_contacts.roles.
Linked contact: roles must match membership roles; membership remains canonical for auth.
1) Docs + diagrams updates (so future chats are aligned)
Update schema.md
Add org_contacts table definition.
Add new optional FK columns to dogs and transports (below).
Update rls.md
Add RLS policies for org_contacts.
Update roles.md
Confirm the same role vocabulary applies to contacts.
Add/adjust diagrams
“Create Contact → Invite → Accept invite → Link Contact” sequence.
“Assign foster/transporter using Contact vs Membership” sequence.
Keep people_and_homes.md as the narrative doc (I already rewrote it to the new approach; we’ll refine once the schema is locked).
2) Database changes (migrations)
2.1 Create public.org_contacts
Add a migration that creates:

org_contacts with:
org_id, kind (person/home), display_name
email citext null, phone text null
roles text[] not null default '{}'
linked_user_id uuid null references auth.users(id)
(optional) linked_membership_id uuid null references public.memberships(id) for convenience
address jsonb default '{}', extra_fields jsonb default '{}'
standard timestamps + created/updated_by_membership_id
Indexes:
(org_id)
gin(roles)
unique (org_id, linked_user_id) where linked_user_id is not null
optional unique (org_id, lower(email)) where email is not null
2.2 Add “contact assignment” columns to core tables (minimal change)
Add nullable FKs (do not remove existing membership FKs):

dogs.responsible_contact_id uuid null references org_contacts(id)
dogs.foster_contact_id uuid null references org_contacts(id)
transports.assigned_contact_id uuid null references org_contacts(id)
This avoids new “assignment tables” and doesn’t break your existing membership-driven model.

2.3 RLS policies + audit triggers
Enable RLS on org_contacts
Baseline policies:
select/insert/update/delete: is_active_org_member(org_id)
optionally restrict insert/update/delete to admins (your call)
Add audit_activity trigger to org_contacts
Existing audit triggers on dogs/transports will automatically log updates when contact assignment fields change.
2.4 Backfill & sync (so “every user is a contact” becomes true)
Migration (service_role SQL) to backfill:

For each existing membership, create/update an org_contact:
linked_user_id = memberships.user_id
linked_membership_id = memberships.id (if we add it)
roles = memberships.roles
display_name from profiles.full_name (fallback to email local-part)
email from auth.users.email (done in migration; not exposed via public views)
This gives you contacts immediately for all existing users.
Then add sync so the invariant stays true:

Trigger: on memberships insert/update(roles, active) → upsert matching org_contacts roles/name linkage.
Trigger: on profiles update(full_name) → update matching org_contacts.display_name for linked users.
This avoids app code needing to maintain it.
3) Linking flow (no “offline auth users”)
We already have invites. We extend it with one small linking mechanism:

3.1 Add RPC: link_my_contact_in_org(p_org_id uuid)
Security: authenticated; no admin required.
Behavior:

Find org_contacts row in that org where lower(email) == jwt.email and linked_user_id is null
Set linked_user_id = auth.uid()
If membership exists in org, set linked_membership_id and sync roles (membership canonical)
Return the contact id + status
This lets a user self-link safely.
3.2 Add RPC: admin_link_contact_to_user(p_org_id, p_contact_id, p_user_id)
Security: org admin only.
For cases where email doesn’t match or you want explicit linking.

3.3 Role sync rule (avoid conceptual duplication)
Canonical for auth: memberships.roles.
For linked contacts, enforce: org_contacts.roles == memberships.roles.
Implementation choice:
Easiest: membership-trigger overwrites contact roles for linked contacts.
UI editing roles for linked contacts must call an admin RPC that updates membership roles (and contact syncs automatically).
4) Frontend code changes (Zod → data layer → UI)
4.1 Add Zod schema
orgContact.ts (or contact.ts)
Update dog.ts + transport.ts with new optional *_contact_id fields.
4.2 Data access + hooks
contacts.ts: fetch/create/update contacts; call link RPCs.
useContacts.ts, useCreateContact.ts (or inline mutations like transports screen does).
4.3 People & Homes screen refactor (incremental, non-breaking)
Current screen is membership-based. Transition plan:

Add a top toggle:
“App users” (existing memberships table, keep)
“Contacts” (new org_contacts directory)
Contacts view supports:
Create contact (person/home), assign roles, contact info
Filter: fosters / transporters / homes / unlinked
“Invite” button if email present (calls existing invite RPC)
“Link” actions (self-link not needed here, admin-link available)
4.4 Assignment UX
Transport create/edit drawer: allow selecting either:
assigned membership (existing)
assigned contact (new)
Dogs: when you implement Assign foster/responsible actions, same pattern.
5) Audit trail expectations (per your requirement)
org_contacts changes: audited via trigger.
Assigning foster/transporter via contact fields: audited automatically because it updates dogs/transports.
Creating/editing/removing “records/users”:
Membership create/update/delete already audited (existing trigger).
Contact create/update/delete will be audited (new trigger).
Notes: currently client-only; when you add a persisted notes table, add the same audit trigger and you’re covered.
6) Verification checklist (SQL + app)
SQL:
Confirm org_contacts RLS blocks cross-org reads.
Confirm contact creation logs activity_events.
Confirm membership role updates sync contact roles (linked contacts).
App:
Create offline contact → assign role foster → appears under fosters.
Invite contact by email → user signs up → invite accepted → contact becomes linked.
Create transport assigned to offline transporter contact → saved + visible.
