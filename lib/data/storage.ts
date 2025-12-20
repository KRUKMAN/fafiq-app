import { supabase } from '@/lib/supabase';

const makeId = () => {
  const maybeCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (maybeCrypto && 'randomUUID' in maybeCrypto && typeof maybeCrypto.randomUUID === 'function') {
    return maybeCrypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const sanitizeFilename = (filename: string) => filename.replace(/\s+/g, '-').toLowerCase();

export const buildDogPhotoPath = (orgId: string, dogId: string, filename: string) => {
  const id = makeId();
  return `${orgId}/dogs/${dogId}/${id}-${sanitizeFilename(filename)}`;
};

export const buildDocumentPath = (orgId: string, entityType: string, entityId: string, filename: string) => {
  const id = makeId();
  return `${orgId}/${entityType}/${entityId}/${id}-${sanitizeFilename(filename)}`;
};

type UploadInput = {
  file: Blob;
  filename: string;
  contentType?: string;
};

export const uploadDogPhoto = async (orgId: string, dogId: string, input: UploadInput) => {
  if (!supabase) {
    throw new Error('Supabase not configured; storage upload requires Supabase env.');
  }

  const path = buildDogPhotoPath(orgId, dogId, input.filename);
  const { data, error } = await supabase.storage.from('dog-photos').upload(path, input.file, {
    contentType: input.contentType ?? 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload dog photo: ${error.message}`);
  }

  return { path: data?.path ?? path };
};

export const addDogPhotoRecord = async (
  orgId: string,
  dogId: string,
  storagePath: string,
  opts?: { caption?: string; isPrimary?: boolean }
) => {
  if (!supabase) {
    throw new Error('Supabase not configured; dog photo record insert requires Supabase env.');
  }

  const { data, error } = await supabase
    .from('dog_photos')
    .insert({
      org_id: orgId,
      dog_id: dogId,
      storage_path: storagePath,
      storage_bucket: 'dog-photos',
      caption: opts?.caption ?? null,
      is_primary: opts?.isPrimary ?? false,
    })
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to record dog photo: ${error.message}`);
  }

  return data;
};

export const uploadDocument = async (
  orgId: string,
  entityType: string,
  entityId: string,
  input: UploadInput
) => {
  if (!supabase) {
    throw new Error('Supabase not configured; storage upload requires Supabase env.');
  }

  const path = buildDocumentPath(orgId, entityType, entityId, input.filename);
  const { data, error } = await supabase.storage.from('documents').upload(path, input.file, {
    contentType: input.contentType ?? 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  return { path: data?.path ?? path };
};

export const createSignedUploadUrl = async (bucket: string, path: string, expiresInSeconds = 3600) => {
  if (!supabase) {
    throw new Error('Supabase not configured; storage upload requires Supabase env.');
  }

  // @ts-expect-error: createSignedUploadUrl is available in supabase-js v2
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, expiresInSeconds);
  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }
  return data;
};

export const uploadViaSignedUrl = async (signedUrl: string, file: Blob, contentType = 'application/octet-stream') => {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Signed upload failed: ${response.status} ${text}`);
  }
};

export const fetchDogPhotos = async (orgId: string, dogId: string) => {
  if (!supabase) {
    throw new Error('Supabase not configured; fetching dog photos requires Supabase env.');
  }

  const { data, error } = await supabase
    .from('dog_photos')
    .select('id, org_id, dog_id, storage_bucket, storage_path, caption, is_primary, created_at')
    .eq('org_id', orgId)
    .eq('dog_id', dogId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to fetch dog photos: ${error.message}`);
  }

  return data ?? [];
};

export const createSignedReadUrl = async (bucket: string, path: string, expiresInSeconds = 3600) => {
  if (!supabase) {
    throw new Error('Supabase not configured; signed URLs require Supabase env.');
  }

  // @ts-expect-error: createSignedUrl is available in supabase-js v2
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }
  return data?.signedUrl ?? null;
};

export const getObjectMetadata = async (
  bucket: string,
  path: string
): Promise<{ size: number | null; name: string } | null> => {
  if (!supabase) {
    return null;
  }
  if (!path) return null;
  const parts = path.split('/');
  const filename = parts.pop();
  if (!filename) return null;
  const prefix = parts.join('/');
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    search: filename,
    limit: 1,
  });
  if (error || !data || !data.length) return null;
  const match = data.find((item) => item.name === filename);
  if (!match) return null;
  return { size: typeof match.metadata?.size === 'number' ? match.metadata.size : null, name: match.name };
};

export const formatBytes = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = Number((bytes / Math.pow(k, i)).toFixed(1));
  return `${value} ${sizes[i]}`;
};
