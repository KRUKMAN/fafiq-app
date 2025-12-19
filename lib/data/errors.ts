import { PostgrestError } from '@supabase/supabase-js';

const isRlsError = (error: PostgrestError) =>
  error.code === '42501' || (error.message || '').toLowerCase().includes('rls') || error.details?.includes('rls');

const isMissingRpc = (error: PostgrestError, rpcName?: string) => {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('function') && msg.includes('does not exist') && (!rpcName || msg.includes(rpcName.toLowerCase()));
};

export const formatSupabaseError = (error: PostgrestError, context?: string): string => {
  if (isRlsError(error)) {
    return `${context ? `${context}: ` : ''}Access denied by RLS. Make sure you are a member of the selected org and that the table policies are applied. (${error.message})`;
  }

  if (isMissingRpc(error, 'accept_org_invites_for_current_user')) {
    return `${context ? `${context}: ` : ''}Invite RPC is missing. Run migrations 20251220_invites.sql and 20251224_accept_invites_fix2.sql.`;
  }

  return `${context ? `${context}: ` : ''}${error.message}`;
};
