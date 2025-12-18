import { z } from 'zod';

export const orgSettingsSchema = z.record(z.any()).default({});

export const orgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  settings: orgSettingsSchema,
});

export type Org = z.infer<typeof orgSchema>;
