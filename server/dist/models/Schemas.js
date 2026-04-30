import { z } from 'zod';
/**
 * v5.0 Feed Configuration Schema
 */
export const FeedConfigSchema = z.record(z.string(), z.object({
    active: z.array(z.string().url()),
    pool: z.array(z.string().url()),
    failures: z.record(z.string(), z.number()).default({}),
}));
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
/**
 * v5.0 Interests Schema
 */
export const InterestsSchema = z.object({
    categories: z.record(z.string(), InterestCategorySchema),
    skills: z.array(SkillSchema).optional(),
    lastUpdated: z.number().optional(),
});
/**
 * v5.0 Window State Schema
 */
export const WindowStateSchema = z.object({
    width: z.number(),
    height: z.number(),
    x: z.number(),
    y: z.number(),
});
/**
 * v5.0 Sync Settings Schema
 */
export const SyncSettingsSchema = z.object({
    interests: InterestsSchema,
    feedConfig: FeedConfigSchema,
    windowState: WindowStateSchema.optional(),
    lastUpdated: z.number().optional(),
});
