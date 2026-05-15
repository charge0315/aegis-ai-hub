import { z } from 'zod';

/**
 * システムが外部から受信するフィード情報（ニュースソース）の健全性を担保するための型定義。
 * 万が一不正なURLが混入してアプリ全体がクラッシュするのを防ぐ「関所」として機能します。
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
 * ユーザーの個人的な嗜好（カテゴリごとの関心度や抽出キーワード）を定義するスキーマ。
 * これがAegis AI Hubの「パーソナライズの核」となり、AIがどの情報に重み付けをするかの基準となります。
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
 * エージェントが自律的に実行可能な「スキル」を定義するスキーマ。
 * 単なるアクションの羅列ではなく、どのアクションが有効（enabled）かを制御するスイッチでもあります。
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
 * システムが学習した「ユーザーの興味関心の全体像（プロファイル）」を束ねるスキーマ。
 * AIによる自動学習（トレンド分析）によって定期的に拡張・アップデートされる生きたデータです。
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

/**
 * UIの利便性を維持するためのウィンドウ状態スキーマ。
 * 次回起動時にも「ユーザーが一番使いやすかった画面サイズと位置」を復元するために記憶します。
 */
export const WindowStateSchema = z.object({
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

/**
 * v5.2 Sync Settings Schema
 */
export const SyncSettingsSchema = z.object({
  interests: InterestsSchema,
  feedConfig: FeedConfigSchema,
  windowState: WindowStateSchema.optional(),
  lastUpdated: z.number().optional(),
});

export type SyncSettings = z.infer<typeof SyncSettingsSchema>;

/**
 * v5.3 UI Settings Schema
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
 * v5.2 Credentials Schema
 */
export const CredentialsSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

/**
 * v5.5 Usage Statistics Schema
 * API利用量を日次・モデル別にトラッキングするためのスキーマ。
 */
export const UsageStatsItemSchema = z.object({
  promptTokens: z.number().default(0),
  candidatesTokens: z.number().default(0),
  totalTokens: z.number().default(0),
  callCount: z.number().default(0),
});

export type UsageStatsItem = z.infer<typeof UsageStatsItemSchema>;

export const UsageStatsSchema = z.record(
  z.string(), // Date key: YYYY-MM-DD
  z.record(
    z.string(), // Model name key
    UsageStatsItemSchema
  )
);

export type UsageStats = z.infer<typeof UsageStatsSchema>;
