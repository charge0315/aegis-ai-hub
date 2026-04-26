import { z } from 'zod';

/**
 * v5.0 Feed Configuration Schema
 */
export const FeedConfigSchema = z.record(
  z.string(),
  z.object({
    active: z.array(z.string().url()),
    pool: z.array(z.string().url()),
    failures: z.record(z.string(), z.number()).default({}),
  })
);

/**
 * v5.0 Interest Category Schema
 */
export const InterestCategorySchema = z.object({
  emoji: z.string(),
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  score: z.number().min(0).max(10),
  reason: z.string().optional(),
});

/**
 * v5.0 Interests Schema
 */
export const InterestsSchema = z.object({
  categories: z.record(z.string(), InterestCategorySchema),
});

/**
 * Unified Sync Settings Schema
 */
export const SyncSettingsSchema = z.object({
  interests: InterestsSchema,
  feedConfig: FeedConfigSchema,
});
