# Storage (Buckets, Paths, Policies)

This defines the MVP storage structure for dog photos and documents, aligned to the System Context requirements:
- Tenant-scoped (`org_id` in path and tables)
- RLS-protected
- Supports activity logging on uploads/changes

## Buckets

### `dog-photos`
Purpose: Images used in dog profiles and timelines.

Path convention:
`{org_id}/dogs/{dog_id}/{photo_id}.{ext}`

Database reference:
- `dog_photos.org_id`
- `dog_photos.dog_id`
- `dog_photos.storage_path`

### `documents`
Purpose: Medical PDFs, transport paperwork, contracts, etc.

Path convention:
`{org_id}/{entity_type}/{entity_id}/{document_id}.{ext}`

Database reference:
- `documents.org_id`
- `documents.entity_type`
- `documents.entity_id`
- `documents.storage_path`

## Access control
- No public buckets in MVP.
- Reads/writes require an **active membership** in the org.
- App must always include `org_id` in inserts into `dog_photos` / `documents`.

## Upload flow (recommended)
1) App requests a signed upload URL (client-side or Edge Function).
2) Upload to Storage.
3) Insert row into `dog_photos` or `documents` with `org_id` and `storage_path`.
4) Insert an `activity_events` row:
   - `event_type`: `dog.photo_added`, `document.uploaded`, etc.
   - `entity_type/entity_id`: the owning entity
   - `payload`: `{bucket, path, mime_type, size, ...}`

## Retention / deletion
- Prefer immutable objects (new UUID path per upload).
- Deleting a record should be handled carefully (soft-delete recommended) to preserve audit trail.
- If hard-deleting storage objects, log a corresponding activity event (`document.deleted` / `photo.deleted`).
