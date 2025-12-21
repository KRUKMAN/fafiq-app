import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/lib/data/errors';
import { Note, noteSchema } from '@/schemas/note';

export type NewNoteInput = {
  org_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  created_by_user_id?: string | null;
  created_by_membership_id?: string | null;
};

export const fetchNotesForEntity = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<Note[]> => {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType.toLowerCase())
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch notes'));
  }

  return (data ?? []).map((row) => noteSchema.parse(row));
};

export const createNote = async (input: NewNoteInput): Promise<Note> => {
  if (!supabase) {
    throw new Error('Supabase not configured; notes require Supabase env.');
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      org_id: input.org_id,
      entity_type: input.entity_type.toLowerCase(),
      entity_id: input.entity_id,
      body: input.body,
      created_by_user_id: input.created_by_user_id ?? null,
      created_by_membership_id: input.created_by_membership_id ?? null,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to create note'));
  }
  if (!data) {
    throw new Error('Note insert returned no data.');
  }

  return noteSchema.parse(data);
};

export const deleteNote = async (orgId: string, noteId: string): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase not configured; notes require Supabase env.');
  }

  const { error } = await supabase.from('notes').delete().eq('org_id', orgId).eq('id', noteId);
  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to delete note'));
  }
};
