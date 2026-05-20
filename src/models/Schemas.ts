import { z } from 'zod';

/**
 * システムが外部から受信するフィード情報（ニュースソース）の健全性を担保するための型定義。
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
 * ユーザーの個人的な嗜好を定義するスキーマ。
 */
export const InterestCategorySchema = z.object({
  emoji: z.string(),
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  score: z.number().min(0).max(10),
  reason: z.string().optional(),
});

export type InterestCategory = z.infer<typeof InterestCategorySchema>;

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
 * プロファイル全体のスキーマ。
 */
export const InterestsSchema = z.object({
  categories: z.record(z.string(), InterestCategorySchema),
  skills: z.array(SkillSchema).optional(),
  learned_keywords: z.record(z.string(), z.object({
    category: z.string(),
    reason: z.string(),
    detectedAt: z.string(),
    type: z.enum(['emerging', 'breakthrough', 'niche', 'mainstream']).optional(),
    confidence: z.number().min(0).max(100).optional(),
    context: z.string().optional()
  })).optional(),
  lastUpdated: z.number().optional(),
});

export type Interests = z.infer<typeof InterestsSchema>;

export const WindowStateSchema = z.object({
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

export const SyncSettingsSchema = z.object({
  interests: InterestsSchema,
  feedConfig: FeedConfigSchema,
  windowState: WindowStateSchema.optional(),
  lastUpdated: z.number().optional(),
});

export type SyncSettings = z.infer<typeof SyncSettingsSchema>;

/**
 * UI 設定スキーマ (v5.5 追加フィールド対応)
 */
export const UiSettingsSchema = z.object({
  jaOnly: z.boolean().default(false),
  viewMode: z.enum(['grid', 'list', 'compact']).default('grid'),
  hideImages: z.boolean().default(false),
  isInitialized: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['ja', 'en']).default('ja'),
});

export type UiSettings = z.infer<typeof UiSettingsSchema>;

/**
 * 利用統計スキーマ
 */
export const UsageStatsSchema = z.record(
  z.string(), // YYYY-MM-DD
  z.record(
    z.string(), // model name
    z.object({
      promptTokens: z.number(),
      candidatesTokens: z.number(),
      totalTokens: z.number(),
      callCount: z.number()
    })
  )
);

export type UsageStats = z.infer<typeof UsageStatsSchema>;

export const CredentialsSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
