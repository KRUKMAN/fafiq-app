# Storage (Buckets, Paths, Policies)

This defines the MVP storage structure for dog photos and documents, aligned to the System Context requirements:
- Tenant-scoped (`org_id` in path and tables)
- RLS-protected
- Supports activity logging on uploads/changes

## Buckets

### `dog-photos`
Purpose: Images used in dog profiles and timelines.

Path convention:
`{org_id}/dogs/{dog_id}/{randomId}-{filename}`

Database reference:
- `dog_photos.org_id`
- `dog_photos.dog_id`
- `dog_photos.storage_path`

### `documents`
Purpose: Medical PDFs, transport paperwork, contracts, etc.

Path convention:
`{org_id}/{entity_type}/{entity_id}/{randomId}-{filename}`

Database reference:
- `documents.org_id`
- `documents.entity_type`
- `documents.entity_id`
- `documents.storage_path`

## Access control
- No public buckets in MVP.
- Reads/writes require an **active membership** in the org.
- App must always include `org_id` in inserts into `dog_photos` / `documents`.

## Upload flow (current implementation)

Implemented pieces:
- Storage buckets + object policies are applied via `supabase/migrations/20251221_storage_buckets.sql`.
- Client helpers exist in `lib/data/storage.ts` for:
  - direct uploads (`uploadDogPhoto`, `uploadDocument`)
  - signed upload URLs (`createSignedUploadUrl` + `uploadViaSignedUrl`) (available, not required by current UI)
  - signed read URLs + storage metadata (`createSignedReadUrl`, `getObjectMetadata`) to open files and show sizes

Dog photos (implemented end-to-end):
1) Upload to Storage (`dog-photos` bucket, org-scoped path).
2) Insert a `dog_photos` row with `org_id` + `storage_path`.
3) Activity event is written by the database audit trigger on `dog_photos` (no client-side audit inserts).

Documents (implemented end-to-end for dog and transport documents):
1) Upload to Storage (`documents` bucket, org-scoped path).
2) Insert a `documents` row with `org_id` + entity fields + `storage_path`.
3) Activity event is written by the database audit trigger on `documents` (no client-side audit inserts).
4) UI lists documents with type icon + size (via storage metadata), supports open/download via signed URL, and delete (admin per RLS).

## Retention / deletion
- Prefer immutable objects (new UUID path per upload).
- Deleting a record should be handled carefully (soft-delete recommended) to preserve audit trail.
- If hard-deleting storage objects, log a corresponding activity event (`document.deleted` / `photo.deleted`).
