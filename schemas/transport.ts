import { z } from 'zod';

export const transportExtraFieldsSchema = z.record(z.string(), z.any()).default({});

export const transportSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  dog_id: z.string().nullable().optional(),
  from_location: z.string().nullable().optional(),
  to_location: z.string().nullable().optional(),
  status: z.string(),
  assigned_membership_id: z.string().nullable().optional(),
  assigned_contact_id: z.string().nullable().optional(),
  window_start: z.string().nullable().optional(),
  window_end: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  extra_fields: transportExtraFieldsSchema,
});

export type Transport = z.infer<typeof transportSchema>;
