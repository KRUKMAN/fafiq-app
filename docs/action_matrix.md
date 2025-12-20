# Action Matrix (UI Buttons -> Data Functions)

Purpose: ensure every visible button has a compatible handler + backend function, or is explicitly disabled with intent.

## Dogs

### Dog list (`app/(tabs)/dogs/index.tsx`)
- Row click: navigate to `/dogs/:id` (dog detail drawer route)
- Edit: navigate to `/dogs/:id/edit` (edit screen)
- Delete: `softDeleteDog(orgId, dogId)` -> invalidates `['dogs', orgId]` (prefix match)
- History: currently same as row click (no Timeline deep-link yet; TODO)

### Dog create (`app/(tabs)/dogs/create.tsx`)
- Create: `createDog({ org_id, ... })` -> invalidates `['dogs', orgId]` -> redirects to `/dogs/:id`

### Dog edit screen (`app/(tabs)/dogs/[id]/edit.tsx`)
- Save changes: `updateDog(orgId, dogId, updates)` -> invalidates `['dogs', orgId]` + `['dog', orgId, dogId]` -> `router.back()`

### Dog detail (`app/(tabs)/dogs/[id].tsx`)
- Edit: enables inline edit mode (Overview tab)
- Save: `updateDog(orgId, dogId, updates)` -> invalidates `['dog', orgId, dogId]` + `['dogs']` (prefix match)
- Cancel: resets draft (no write)
- Add note: currently local-only (`setNotes`) (no DB write/audit yet; TODO)
- Upload photo: image picker -> `uploadDogPhoto` + `addDogPhotoRecord` -> invalidates `['dog-photos', orgId, dogId]` + `['dog', orgId, dogId]` + `['dogs', orgId]`
- Upload document: currently uploads a sample text blob -> `uploadDocument` + `createDocumentRecord` -> invalidates `['documents', orgId, 'dog', dogId]` (+ dog timeline)
- Open/download document: signed URL (documents bucket) -> external viewer
- Delete document: `deleteDocumentRecord(orgId, documentId)` (admin per RLS) with inline confirm -> invalidates `['documents', orgId, 'dog', dogId]` (+ dog timeline)
- Assign foster: `updateDog(... foster_contact_id ...)` (also mirrors `extra_fields.foster_name` for now)
- Create transport: navigate to `/transports?createDogId=:dogId` (prefills create drawer)
- Timeline: `EntityTimeline(kind='dog')` -> audit RPC `get_dog_timeline(p_org_id, p_dog_id)` + schedule RPC `get_calendar_events(p_dog_id)`

## Transports

### Transport list (`app/(tabs)/transports/index.tsx`)
- Create: `createTransport` (editor drawer)
- Edit (drawer): `updateTransport` (editor drawer)
- Delete: `softDeleteTransport`
- Deep-link: reads `createDogId` param to prefill create drawer
- Deep-link edit: reads `editTransportId` param to open edit drawer
- Row click / "History": opens transport detail drawer (includes Timeline tab)

### Transport detail drawer (`app/(tabs)/transports/index.tsx`)
- Edit inline: toggles draft fields
- Save: `updateTransport` -> invalidates `['transports', orgId]`
- Cancel: resets draft
- Documents: list + open via signed URL (read-only; upload lives in transport detail screen)
- Timeline: `EntityTimeline(kind='transport')` -> audit RPC `get_transport_timeline(p_org_id, p_transport_id)` + schedule RPC `get_calendar_events(p_link_type='transport', p_link_id)`

### Transport detail screen (`app/(tabs)/transports/[id].tsx`)
- Uses the same drawer UI as the list (`TransportDetailDrawer`) and supports Timeline.

## People / Contacts

### Contacts directory (`app/(tabs)/people/index.tsx`)
- Create contact: `createOrgContact`
- Invite: `inviteOrgMember` (from Contact drawer)
- Admin link: `adminLinkContactToUser` (from Contact drawer)

### Member detail drawer (`app/(tabs)/people/index.tsx`)
- Timeline: `EntityTimeline(kind='membership')` -> audit RPC `get_member_activity(p_org_id, p_membership_id)` + schedule RPC `get_calendar_events(p_assigned_membership_id)`

### Contact detail drawer (`app/(tabs)/people/index.tsx`)
- Edit (admin): `updateOrgContact(orgId, contactId, updates)`
- Save/Cancel: draft semantics (TODO: invalidate/refetch `useOrgContacts` after save)
- Timeline: `EntityTimeline(kind='contact')` -> audit RPC `get_contact_timeline(p_org_id, p_contact_id)` + schedule RPC `get_calendar_events(p_contact_id)`

## Settings

### Org settings (`app/(tabs)/settings/index.tsx`)
- Edit member roles (admin): `updateMembershipRoles`
- Update picklists: `updateOrgSettings`
- Invite member: `inviteOrgMember`
- Resend invite: `inviteOrgMember`
- Cancel invite: `cancelOrgInvite`
- Download my data: `downloadMyData` (RPC)
- Delete my account: `deleteMyAccount` (RPC)
