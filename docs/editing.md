# Inline Edit Pattern (Dogs, Transports, Contacts)

## Goals
- Edit directly in the detail drawer/view without leaving context.
- Show Save + Cancel controls; leave view-only mode unchanged until save.
- Use existing hooks and Supabase mutations; invalidate TanStack Query caches after save.

## Dogs (`app/(tabs)/dogs/[id].tsx`)
- Toggle **Edit** in the header to make fields editable in the Overview tab.
- Editable fields: name, stage, location, description, medical_notes, behavioral_notes, and `extra_fields.attributes` (age/sex/size/breed/intake_date).
- Save calls `updateDog` (new in `lib/data/dogs.ts`); invalidates `['dog', orgId, dogId]` and `['dogs']`.
- Cancel restores the current DB values.
- Photo uploads pick a real image via `expo-image-picker`, insert a `dog_photos` row, and render using a signed URL (private bucket).
- Document uploads remain in the Documents tab.
- Assign foster uses `updateDog` to update `dogs.foster_contact_id` (and mirrors `extra_fields.foster_name` for now).

## Transports (`app/(tabs)/transports/index.tsx`)
- In Transport detail drawer, click **Edit inline** to edit.
- Editable fields: from_location, to_location, status (pill options), notes.
- Save calls `updateTransport`; invalidates `['transports', orgId]`.
- Cancel reverts the draft to the loaded transport.
- The legacy create/edit drawer still works for bulk edits/creation.

## Contacts (`app/(tabs)/people/index.tsx`)
- In Contact detail drawer, admins can toggle **Edit**.
- Editable fields: display_name, email, phone, roles (role pills).
- Save calls `updateOrgContact`; cancel reverts the draft.

## UX rules
- Always show Save + Cancel when in edit mode.
- Keep read-only layout for non-editing users.
- Show a small status message on save/error; avoid toasts.
  - Use `components/ui/StatusMessage.tsx` for consistent inline feedback.
- Do not auto-save; require explicit Save.

