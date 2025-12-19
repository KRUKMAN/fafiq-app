import { z } from 'zod';

export const orgContactSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  kind: z.string(),
  display_name: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  roles: z.array(z.string()).default([]),
  linked_user_id: z.string().nullable().optional(),
  linked_membership_id: z.string().nullable().optional(),
  address: z.record(z.string(), z.any()).default({}),
  extra_fields: z.record(z.string(), z.any()).default({}),
  deleted_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by_membership_id: z.string().nullable().optional(),
  updated_by_membership_id: z.string().nullable().optional(),
});

export type OrgContact = z.infer<typeof orgContactSchema>;
