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

export type FeedConfig = z.infer<typeof FeedConfigSchema>;

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

export type InterestCategory = z.infer<typeof InterestCategorySchema>;

/**
 * v5.0 Skill Schema
 */
export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agent: z.string(),
  type: z.enum(['tool', 'action', 'logic']),
  enabled: z.boolean().default(true),
});

export type Skill = z.infer<typeof SkillSchema>;

/**
 * v5.0 Interests Schema
 */
export const InterestsSchema = z.object({
  categories: z.record(z.string(), InterestCategorySchema),
  skills: z.array(SkillSchema).optional(),
  lastUpdated: z.number().optional(),
});

export type Interests = z.infer<typeof InterestsSchema>;

/**
 * v5.0 Window State Schema
 */
export const WindowStateSchema = z.object({
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

/**
 * v5.0 Sync Settings Schema
 */
export const SyncSettingsSchema = z.object({
  interests: InterestsSchema,
  feedConfig: FeedConfigSchema,
  windowState: WindowStateSchema.optional(),
  lastUpdated: z.number().optional(),
});


export type SyncSettings = z.infer<typeof SyncSettingsSchema>;

/**
 * v5.1 Credentials Schema
 */
export const CredentialsSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
