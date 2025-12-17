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
    attributes: attributesSchema.optional(),
    alerts: z.array(alertSchema).optional(),
  })
  .passthrough()
  .default({});

export const dogSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  status: z.string(),
  medical_status: z.string(),
  location: z.string(),
  description: z.string(),
  extra_fields: extraFieldsSchema,
});

export type Dog = z.infer<typeof dogSchema>;
