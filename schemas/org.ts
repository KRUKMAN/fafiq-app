import { z } from 'zod';

export const orgSettingsSchema = z.record(z.string(), z.any()).default({});

export const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  settings: orgSettingsSchema,
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type Org = z.infer<typeof orgSchema>;
