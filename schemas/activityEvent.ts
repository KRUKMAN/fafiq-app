import { z } from 'zod';

const jsonRecordSchema = z.record(z.string(), z.any());

export const activityPayloadSchema = jsonRecordSchema.optional().default({});

export const activityEventSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  created_at: z.string(),
  actor_user_id: z.string().nullable().optional(),
  actor_membership_id: z.string().nullable().optional(),
  entity_type: z.string(),
  entity_id: z.string(),
  event_type: z.string(),
  summary: z.string(),
  payload: activityPayloadSchema,
  related: jsonRecordSchema.optional().default({}),
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;
