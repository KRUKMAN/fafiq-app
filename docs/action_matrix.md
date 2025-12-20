# Action Matrix (UI Buttons ↔ Data Functions)

Purpose: ensure every visible button has a compatible handler + backend function, or is explicitly disabled with intent.

## Dogs

### Dog list (`app/(tabs)/dogs/index.tsx`)
- Row click: open detail drawer
- Edit: navigate to edit screen
- Delete: `softDeleteDog(orgId, dogId)` → invalidates `['dogs', ...]`
- History: open dog detail (Timeline tab deep-link TODO)

### Dog detail (`app/(tabs)/dogs/[id].tsx`)
- Edit: enables inline edit mode (Overview tab)
- Save: `updateDog(orgId, dogId, updates)` → invalidates `['dog', orgId, dogId]` + `['dogs']`
- Cancel: resets draft (no write)
- Upload photo: image picker → `uploadDogPhoto` + `addDogPhotoRecord` → invalidates `['dog-photos', orgId, dogId]`
- Upload document: Documents tab uploads to Storage and inserts a `documents` row (audit trigger logs activity)
- Open document: signed URL (documents bucket) → external viewer
- Delete document: delete `documents` row (admin per RLS) with inline confirm
- Assign foster: updates `dogs.foster_contact_id` via `updateDog` (also mirrors `extra_fields.foster_name` for now)
- Create transport: deep-links to Transports tab create drawer with `createDogId` param prefilled

## Transports

### Transport list (`app/(tabs)/transports/index.tsx`)
- Create: `createTransport`
- Edit (drawer): `updateTransport`
- Delete: `softDeleteTransport`

### Transport detail drawer (`app/(tabs)/transports/index.tsx`)
- Edit inline: toggles draft fields
- Save: `updateTransport` → invalidates `['transports', orgId]`
- Cancel: resets draft
- Documents: list + open via signed URL (read-only; upload lives in transport detail screen)

### Transport detail screen (`app/(tabs)/transports/[id].tsx`)
- Upload document: storage upload + `documents` insert (transport entity)
- Open document: signed URL
- Delete document: delete `documents` row (admin per RLS) with inline confirm

## People / Contacts

### Contacts directory (`app/(tabs)/people/index.tsx`)
- Create contact: `createOrgContact`
- Invite: `inviteOrgMember`
- Admin link: `adminLinkContactToUser`

### Contact detail drawer (`app/(tabs)/people/index.tsx`)
- Edit (admin): `updateOrgContact(orgId, contactId, updates)`
- Save/Cancel: draft semantics

## Settings

### Org settings (`app/(tabs)/settings/index.tsx`)
- Edit member roles (admin): `updateMembershipRoles`
- Update picklists: `updateOrgSettings`
- Download my data: `downloadMyData` (RPC)
- Delete my account: `deleteMyAccount` (RPC)


