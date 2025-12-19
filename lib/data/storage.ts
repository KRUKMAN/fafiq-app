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
