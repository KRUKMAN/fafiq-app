import type { ActivityEvent } from '@/schemas/activityEvent';

export type ActivityEventDetailRow = {
  label: string;
  value: string;
};

const truncate = (value: string, max = 120) => (value.length > max ? `${value.slice(0, max)}…` : value);

const valueToString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return truncate(JSON.stringify(value));
  } catch {
    return truncate(String(value));
  }
};

const safeKeysForEntity = (entityType: string): string[] => {
  const type = (entityType ?? '').toLowerCase();
  if (type === 'dogs') return ['name', 'stage', 'location', 'description', 'foster_contact_id', 'responsible_contact_id', 'budget_limit', 'deleted_at'];
  if (type === 'transports') return ['status', 'from_location', 'to_location', 'assigned_contact_id', 'window_start', 'window_end', 'deleted_at', 'dog_id'];
  if (type === 'documents') return ['entity_type', 'entity_id', 'filename', 'mime_type', 'description', 'storage_path'];
  if (type === 'dog_photos') return ['caption', 'is_primary', 'storage_path', 'dog_id'];
  return [];
};

const buildDiffRows = (before: Record<string, unknown>, after: Record<string, unknown>, keys: string[]) => {
  const rows: ActivityEventDetailRow[] = [];
  for (const key of keys) {
    const a = before[key];
    const b = after[key];
    if (a === b) continue;
    rows.push({ label: key, value: `${valueToString(a)} → ${valueToString(b)}`.trim() });
  }
  return rows;
};

export const toActivityEventDetailRows = (event: ActivityEvent): ActivityEventDetailRow[] => {
  const payload = (event.payload ?? {}) as any;

  // New contract: payload.changes[field] = { from, to }
  const changes = payload?.changes;
  if (changes && typeof changes === 'object' && !Array.isArray(changes)) {
    const rows: ActivityEventDetailRow[] = [];
    for (const [key, value] of Object.entries(changes as Record<string, any>)) {
      const from = value?.from;
      const to = value?.to;
      if (from !== undefined || to !== undefined) {
        rows.push({ label: key, value: `${valueToString(from)} → ${valueToString(to)}`.trim() });
      } else {
        rows.push({ label: key, value: valueToString(value) });
      }
    }
    return rows.slice(0, 10);
  }

  // Common domain payload: { from, to }
  if (payload && typeof payload === 'object' && 'from' in payload && 'to' in payload) {
    return [{ label: 'change', value: `${valueToString(payload.from)} → ${valueToString(payload.to)}`.trim() }];
  }

  // Legacy trigger payloads: before/after/new/old
  const keys = safeKeysForEntity(event.entity_type);
  if (keys.length > 0) {
    const before = (payload?.before ?? payload?.old) as Record<string, unknown> | undefined;
    const after = (payload?.after ?? payload?.new) as Record<string, unknown> | undefined;
    if (before && after && typeof before === 'object' && typeof after === 'object') {
      const rows = buildDiffRows(before, after, keys);
      if (rows.length > 0) return rows.slice(0, 10);
    }
  }

  // Final fallback: show simple scalar fields only.
  const entries = Object.entries(payload ?? {}).filter(([, v]) => typeof v !== 'object');
  return entries.slice(0, 10).map(([key, v]) => ({ label: key, value: valueToString(v) }));
};

export const formatEventTypeLabel = (eventType: string) => {
  const value = (eventType ?? '').trim();
  if (!value) return 'activity';
  if (value.includes('.')) return value;
  return value.replace(/_/g, '.');
};

