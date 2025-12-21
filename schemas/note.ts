import { z } from 'zod';

export const noteSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  body: z.string(),
  created_at: z.string(),
  created_by_user_id: z.string().nullable().optional(),
  created_by_membership_id: z.string().nullable().optional(),
});

export type Note = z.infer<typeof noteSchema>;
