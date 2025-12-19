import { z } from 'zod';

const alertSchema = z.object({
  type: z.enum(['warning', 'error']),
  message: z.string(),
});

const attributesSchema = z
  .object({
    age: z.string(),
    sex: z.enum(['Male', 'Female']),
    size: z.string(),
    breed: z.string(),
    intake_date: z.string(),
  })
  .partial();

const extraFieldsSchema = z
  .object({
    internal_id: z.string().optional(),
    photo_url: z.string().url().optional(),
    responsible_person: z.string().optional(),
    foster_name: z.string().nullable().optional(),
    budget_spent: z.number().optional(),
    last_update: z.string().optional(),
    last_update_iso: z.string().optional(),
    attributes: attributesSchema.optional(),
    alerts: z.array(alertSchema).optional(),
    notes: z.any().optional(),
    medical_history: z.any().optional(),
    files: z.any().optional(),
  })
  .passthrough()
  .default({});

export const dogSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  stage: z.string(),
  name: z.string(),
  location: z
    .string()
    .nullish()
    .transform((val) => val ?? '')
    .default(''),
  description: z
    .string()
    .nullish()
    .transform((val) => val ?? '')
    .default(''),
  medical_notes: z
    .string()
    .nullish()
    .transform((val) => val ?? '')
    .default(''),
  behavioral_notes: z
    .string()
    .nullish()
    .transform((val) => val ?? '')
    .default(''),
  responsible_membership_id: z.string().nullable().optional(),
  foster_membership_id: z.string().nullable().optional(),
  budget_limit: z.number().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by_membership_id: z.string().nullable().optional(),
  updated_by_membership_id: z.string().nullable().optional(),
  extra_fields: extraFieldsSchema,
});

export type Dog = z.infer<typeof dogSchema>;
