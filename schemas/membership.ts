import { z } from 'zod';

export const membershipSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  user_id: z.string(),
  roles: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Membership = z.infer<typeof membershipSchema>;
