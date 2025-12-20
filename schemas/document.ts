import { z } from 'zod';

export const documentSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  storage_bucket: z.string().default('documents'),
  storage_path: z.string(),
  filename: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  created_at: z.string(),
  created_by_membership_id: z.string().nullable().optional(),
});

export type Document = z.infer<typeof documentSchema>;

