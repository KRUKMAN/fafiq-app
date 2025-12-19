import { z } from 'zod';

export const profileSchema = z.object({
  user_id: z.string(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Profile = z.infer<typeof profileSchema>;
