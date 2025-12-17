import { z } from 'zod';

export const dogSchema = z.object({
  id: z.string(),
  internalId: z.string(),
  name: z.string(),
  status: z.enum(['In Foster', 'Available', 'Adopted', 'Medical Hold']),
  photoUrl: z.string().url(),
  location: z.string(),
  responsiblePerson: z.string(),
  fosterName: z.string().nullable(),
  budgetSpent: z.number(),
  lastUpdate: z.string(),
  attributes: z.object({
    age: z.string(),
    sex: z.enum(['Male', 'Female']),
    size: z.string(),
    breed: z.string(),
    intakeDate: z.string(),
  }),
  alerts: z.array(
    z.object({
      type: z.enum(['warning', 'error']),
      message: z.string(),
    })
  ),
});

export type Dog = z.infer<typeof dogSchema>;
