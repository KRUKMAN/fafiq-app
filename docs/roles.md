# Roles (MVP)

Roles are **per-org**, stored only on `memberships.roles[]`. There is **no global role** on `profiles`.

Contacts:
- The same role vocabulary is used for `org_contacts.roles[]` (operational tagging/UI for offline contacts) and `memberships.roles[]` (authorization).
- Authorization is always enforced via `memberships.roles[]` + RLS helpers.
- When a contact is linked to a user/membership, keep `org_contacts.roles[]` aligned to `memberships.roles[]`.

## Admin / Coordinator (`admin`)
- Full access to org data (dogs, transports, medical, expenses, documents).
- Membership management: invite/remove users, assign roles, deactivate memberships.
- Can modify NGO-configurable stages/statuses (if implemented).
- Can delete records (optional; consider soft-delete in MVP).

## Volunteer (`volunteer`)
- Read access to all org-scoped domain data.
- Can create/update operational records (notes, medical records, expenses, documents) as allowed by product policy.
- Can create transport tasks and propose updates; cannot manage memberships or org configuration.

## Foster (`foster`)
- Read access to org dog data.
- Can update foster-related fields for dogs they are assigned to (recommended constraint), upload photos/documents, add notes.
- Cannot manage memberships or org configuration.

## Transport (`transport`)
- Read access to transports; can update transports assigned to them (recommended constraint).
- Can update transport status/logistics and add supporting documents.
- Cannot manage memberships or org configuration.

## Role enforcement
- Authorization must be enforced in **RLS and/or Edge Functions**, not only in the frontend.
- The app should still use roles for UX (show/hide actions), but treat it as non-authoritative.
