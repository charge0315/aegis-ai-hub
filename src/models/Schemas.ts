/**
 * @file Schemas.ts
 * @description システムのコアとなるデータモデルと型定義（Zodスキーマ）。
 * ユーザープロファイル、UI設定、フィード構成、利用統計など、
 * ストレージ（ElectronのstoreやlocalStorage）に永続化される状態の
 * 整合性と後方互換性を保証する役割を持つ。
 * @dependencies
 * - zod: 型定義とランタイムでのスキーマ検証
 */

import { z } from 'zod';

/**
 * 1. Feed Config (フィード構成スキーマ)
 * システムが外部から受信する情報源（RSSやスクレイピング対象）の構成を管理する。
 * active（アクティブ）とpool（待機中）に分けることで、一時的なエラーによる
 * 無効化や、新規発見サイトのストックといった柔軟なライフサイクル管理を実現する。
 * failuresはフォールトトレランス（連続エラー時の自動停止など）に使用される。
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
 * 2. Interest Category (興味関心カテゴリスキーマ)
 * ユーザーの個人的な嗜好（カテゴリ）を構成する最小単位。
 * emojiによる視覚的表現、関連ブランド・キーワードによるフィルタリング条件、
 * そしてscore（重要度）によって、パーソナライズの精度を決定づける。
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
 * 3. Skill (スキルスキーマ)
 * エージェントが実行可能なアクションやツールの定義。
 * 将来的な機能拡張（プラグイン機構など）を見据え、type（tool, action, logic）で
 * スキルの性質を分類し、動的な有効化/無効化（enabled）をサポートする。
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
 * 4. Interests (プロファイル全体スキーマ)
 * ユーザーのパーソナリティ（興味関心、スキル、AIによる学習履歴）を束ねる中心的なモデル。
 * learned_keywordsにより、AIがユーザーの行動から自己学習したインサイトを
 * メタデータ付きで永続化し、時間経過とともに成長するシステムを体現する。
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
 * 5. Window State (ウィンドウ状態スキーマ)
 * デスクトップアプリとしてのUXを向上させるため、
 * 前回のウィンドウ位置とサイズを記憶し、復元するためのデータ構造。
 */
export const WindowStateSchema = z.object({
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

/**
 * 6. Sync Settings (同期設定スキーマ)
 * システム設定のインポート/エクスポート、または将来的なクラウド同期に
 * 使用されるルートオブジェクト。必要な状態を一つのツリーにまとめる。
 */
export const SyncSettingsSchema = z.object({
  interests: InterestsSchema,
  feedConfig: FeedConfigSchema,
  windowState: WindowStateSchema.optional(),
  lastUpdated: z.number().optional(),
});

export type SyncSettings = z.infer<typeof SyncSettingsSchema>;

/**
 * 7. UI Settings (UI設定スキーマ)
 * ユーザーの視覚的な好みやアプリケーションの挙動に関する設定。
 * v5.5で追加されたテーマ、言語、自動起動などの新しいライフサイクル制御を包含し、
 * デフォルト値を持つことでマイグレーション時のエラーを防ぐ。
 */
export const UiSettingsSchema = z.object({
  jaOnly: z.boolean().default(false),
  viewMode: z.enum(['grid', 'list', 'compact']).default('grid'),
  hideImages: z.boolean().default(false),
  isInitialized: z.boolean().default(false),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.enum(['ja', 'en']).default('ja'),
  autoLaunch: z.boolean().default(false),
});

export type UiSettings = z.infer<typeof UiSettingsSchema>;

/**
 * 8. Usage Stats (利用統計スキーマ)
 * LLMのAPI呼び出し履歴とトークン消費量を日付・モデル単位で記録する。
 * コスト管理ダッシュボードへのデータ提供や、API制限の監視に不可欠なデータ構造。
 */
export const UsageStatsSchema = z.record(
  z.string(), // キーは YYYY-MM-DD 形式の日付文字列
  z.record(
    z.string(), // キーはモデル名（例: gemini-3.5-flash）
    z.object({
      promptTokens: z.number(),
      candidatesTokens: z.number(),
      totalTokens: z.number(),
      callCount: z.number()
    })
  )
);

export type UsageStats = z.infer<typeof UsageStatsSchema>;

/**
 * 9. Credentials (認証情報スキーマ)
 * APIキーなど、セキュアに管理すべき情報を定義する。
 * ストレージ保存時は暗号化されることを前提とし、平文で扱わないように設計。
 */
export const CredentialsSchema = z.object({
  geminiApiKey: z.string().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
