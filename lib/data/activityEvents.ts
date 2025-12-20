import { supabase } from '@/lib/supabase';
import { activityEventSchema, ActivityEvent } from '@/schemas/activityEvent';
import { getMockActivityEventsByEntity } from '@/lib/mocks/activityEvents';
import { formatSupabaseError } from '@/lib/data/errors';
import {
  rpcGetContactTimeline,
  rpcGetDogTimeline,
  rpcGetMemberActivity,
  rpcGetTransportTimeline,
} from '@/lib/supabaseRpc';

export const fetchDogTimeline = async (orgId: string, dogId: string, limit = 200): Promise<ActivityEvent[]> => {
  if (!supabase) {
    const events = await getMockActivityEventsByEntity(orgId, 'dog', dogId);
    return events.slice(0, limit).map((event) => activityEventSchema.parse(event));
  }

  const { data, error } = await rpcGetDogTimeline({
    p_org_id: orgId,
    p_dog_id: dogId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch dog timeline'));
  }

  return (data ?? []).map((event: any) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};

export const fetchTransportTimeline = async (
  orgId: string,
  transportId: string,
  limit = 200
): Promise<ActivityEvent[]> => {
  if (!supabase) {
    const events = await getMockActivityEventsByEntity(orgId, 'transport', transportId);
    return events.slice(0, limit).map((event) => activityEventSchema.parse(event));
  }

  const { data, error } = await rpcGetTransportTimeline({
    p_org_id: orgId,
    p_transport_id: transportId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch transport timeline'));
  }

  return (data ?? []).map((event: any) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};

export const fetchContactTimeline = async (orgId: string, contactId: string, limit = 200): Promise<ActivityEvent[]> => {
  if (!supabase) {
    const events = await getMockActivityEventsByEntity(orgId, 'contact', contactId);
    return events.slice(0, limit).map((event) => activityEventSchema.parse(event));
  }

  const { data, error } = await rpcGetContactTimeline({
    p_org_id: orgId,
    p_contact_id: contactId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch contact timeline'));
  }

  return (data ?? []).map((event: any) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};

export const fetchMemberActivity = async (
  orgId: string,
  membershipId: string,
  limit = 200
): Promise<ActivityEvent[]> => {
  if (!supabase) {
    // Mock membership activity is not modeled yet; return empty.
    return [];
  }

  const { data, error } = await rpcGetMemberActivity({
    p_org_id: orgId,
    p_membership_id: membershipId,
    p_limit: limit,
  });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch member activity'));
  }

  return (data ?? []).map((event: any) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};

export const fetchActivityEvents = async (
  orgId: string,
  entityType: string,
  entityId: string
): Promise<ActivityEvent[]> => {
  if (!supabase) {
    const events = await getMockActivityEventsByEntity(orgId, entityType, entityId);
    return events.map((event) => activityEventSchema.parse(event));
  }

  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('org_id', orgId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(formatSupabaseError(error, 'Failed to fetch activity events'));
  }

  return (data ?? []).map((event) =>
    activityEventSchema.parse({
      ...event,
      payload: event.payload ?? {},
      related: event.related ?? {},
    })
  );
};
