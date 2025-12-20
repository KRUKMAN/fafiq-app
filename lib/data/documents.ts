import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/data/errors';
import { Document, documentSchema } from '@/schemas/document';

export type NewDocumentInput = {
  org_id: string;
  entity_type: string;
  entity_id: string;
  storage_path: string;
  filename?: string | null;
  mime_type?: string | null;
  description?: string | null;
};

export const fetchDocumentsForEntity = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<Document[]> => {
  if (!supabase) {
    throw new Error('Supabase not configured; documents require Supabase env.');
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch documents'));
  }

  return (data ?? []).map((row) =>
    documentSchema.parse({
      ...row,
      storage_bucket: row.storage_bucket ?? 'documents',
      filename: row.filename ?? null,
      mime_type: row.mime_type ?? null,
      description: row.description ?? null,
      created_by_membership_id: (row as any).created_by_membership_id ?? null,
    })
  );
};

export const createDocumentRecord = async (input: NewDocumentInput): Promise<Document> => {
  if (!supabase) {
    throw new Error('Supabase not configured; documents require Supabase env.');
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      org_id: input.org_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      storage_bucket: 'documents',
      storage_path: input.storage_path,
      filename: input.filename ?? null,
      mime_type: input.mime_type ?? null,
      description: input.description ?? null,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to record document'));
  }
  if (!data) {
    throw new Error('Document insert returned no data.');
  }

  return documentSchema.parse({
    ...data,
    storage_bucket: data.storage_bucket ?? 'documents',
    filename: data.filename ?? null,
    mime_type: data.mime_type ?? null,
    description: data.description ?? null,
    created_by_membership_id: (data as any).created_by_membership_id ?? null,
  });
};

export const deleteDocumentRecord = async (orgId: string, documentId: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; documents require Supabase env.');
  }

  const { error } = await supabase.from('documents').delete().eq('org_id', orgId).eq('id', documentId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to delete document'));
  }
};

