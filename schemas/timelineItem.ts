import { z } from 'zod';

export const timelineItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['audit', 'schedule']),
  occurred_at: z.string(), // ISO string used for sorting
  title: z.string(),
  subtitle: z.string().optional().default(''),
  system: z.boolean().optional().default(false),
  details: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional()
    .default([]),
});

export type TimelineItem = z.infer<typeof timelineItemSchema>;

