/**
 * @file AiSchemas.ts
 * @description Gemini AIのレスポンスに対する構造化されたバリデーションスキーマ群（Zod）。
 * LLMの出力は本質的に非構造化であり予測不可能なため、これらのスキーマを用いて
 * 厳密な型検査と構造検証を行い、後続処理（UI表示やDB保存など）の安全性を担保する。
 * 各スキーマは特定のAIエージェントやタスクに1対1で対応するように設計されている。
 * @dependencies
 * - zod: ランタイムにおける型推論とバリデーション
 */

import { z } from 'zod';

/**
 * 1. Curation (キュレーション結果のスキーマ)
 * 収集された記事リストの中から、ユーザーの興味関心に合致するものを
 * AIが選別した結果を検証する。選択された理由（reason）を含めることで、
 * なぜその記事が推薦されたのかという判断の透明性を確保する。
 */
export const CurateResponseSchema = z.object({
  selections: z.array(z.object({
    id: z.number(),
    reason: z.string()
  }))
});

/**
 * 2. Evolution Proposals (自己進化・拡張提案のスキーマ)
 * ユーザーの利用動向や現在の登録情報に基づき、新たに追加すべき
 * サイト、ブランド、キーワードをAIが提案する際の構造。
 * カテゴリや理由を必須とすることで、無秩序な拡張を防ぎ、
 * ユーザーが提案を受け入れるかどうかの判断材料を提供する。
 */
export const EvolutionProposalSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    reason: z.string()
  })),
  brands: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string()
  })),
  keywords: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string()
  }))
});

/**
 * 3. Fallback Evolution (フォールバック用進化スキーマ)
 * メインの進化提案（EvolutionProposalSchema）がパースエラー等を起こした場合や、
 * 最低限のサイト情報のみを抽出したい場合に適用する軽量スキーマ。
 * 処理の堅牢性（ロバストネス）を高めるための安全網として機能する。
 */
export const FallbackEvolutionSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    reason: z.string()
  }))
});

/**
 * 4. Restructure (構造再編成のスキーマ)
 * ユーザーの興味関心カテゴリ全体を、現在のトレンドやデータに基づいて
 * 再構築（リファクタリング）する際の巨大な状態更新を表現する。
 * 古いカテゴリからのマッピング（feedMapping）や新規フィードの提案を含み、
 * マイグレーションを安全かつ論理的に行うための設計。
 */
export const RestructureResponseSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    emoji: z.string(),
    brands: z.array(z.string()),
    keywords: z.array(z.string()),
    score: z.number(),
    reason: z.string()
  })),
  feedMapping: z.array(z.object({
    url: z.string().url(),
    newCategory: z.string()
  })),
  newSuggestedFeeds: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string()
  }))
});

/**
 * 5. Discover Sites (新規サイト発見スキーマ)
 * 指定されたトピックや分野に関連する新しい情報源を探索した結果。
 * URLの妥当性（z.string().url()）を強制することで、
 * 無効なリンクがシステムに混入することを防ぐ。
 */
export const DiscoverSitesSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string()
  }))
});

/**
 * 6. Discover English Sites (英語サイト発見スキーマ)
 * グローバルな情報収集を目的とした英語圏サイトの探索結果。
 * langプロパティを明示することで、多言語フィード管理における
 * フィルタリングや翻訳パイプラインへのルーティングを容易にする。
 */
export const DiscoverEnglishSitesSchema = z.object({
  sites: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    category: z.string(),
    lang: z.string()
  }))
});

/**
 * 7. Translate Articles (記事翻訳スキーマ)
 * 外国語の記事タイトルと説明文を日本語化（あるいは指定言語化）した結果。
 * UIに直接表示されるテキストであるため、配列順序やフィールドの過不足を厳密に検証する。
 */
export const TranslateArticlesSchema = z.object({
  translations: z.array(z.object({
    title: z.string(),
    desc: z.string()
  }))
});

/**
 * 8. Analyze Trends (トレンド分析スキーマ)
 * 収集した記事群から新たなトレンドやインサイトを抽出した結果。
 * 単なる文字列ではなく、type（トレンドの種類）やconfidence（信頼度）、
 * context（背景情報）といったメタデータを含めることで、
 * AIの「幻覚（ハルシネーション）」を評価・制御できるように設計されている。
 */
export const AnalyzeTrendsSchema = z.object({
  suggestions: z.array(z.object({
    value: z.string(),
    category: z.string(),
    reason: z.string(),
    type: z.enum(["emerging", "breakthrough", "niche", "mainstream"]),
    confidence: z.number().min(0).max(100),
    context: z.string()
  }))
});

/**
 * 9. Suggest Category Details (カテゴリ詳細提案スキーマ)
 * 新規カテゴリ作成時や既存カテゴリの拡充時に、
 * 関連するブランド、キーワード、絵文字をAIが自動提案する。
 * ユーザーの手間を省きつつ、一貫したカテゴリ分類を維持するための補助機能。
 */
export const SuggestCategoryDetailsSchema = z.object({
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  emoji: z.string(),
  reason: z.string()
});

/**
 * 10. Translate Interests (興味関心翻訳・変換スキーマ)
 * ユーザーの初期設定時などに入力された自然言語の興味関心を、
 * システムが扱える構造化データ（カテゴリ、ブランド、キーワード）に変換・翻訳する。
 * originalNameを保持することで、変換元の意図をトレーサビリティとして残す。
 */
export const TranslateInterestsSchema = z.object({
  categories: z.array(z.object({
    originalName: z.string(),
    name: z.string(),
    emoji: z.string(),
    brands: z.array(z.string()),
    keywords: z.array(z.string()),
    score: z.number(),
    reason: z.string()
  }))
});
