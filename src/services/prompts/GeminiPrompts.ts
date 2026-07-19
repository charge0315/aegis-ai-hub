import { type ResponseSchema, SchemaType } from "@google/generative-ai";

/**
 * GeminiPrompts: GeminiServiceで使用されるプロンプトおよびレスポンススキーマの定義。
 * 
 * 設計思想:
 * - 構造化出力の徹底: AIからのレスポンスを常にJSON形式で受け取るため、詳細なResponseSchemaを定義。
 * - 専門家としての役割付与: AIに対して「専門家(Expert)」などの役割を明示し、出力の質を高める。
 * - 柔軟なパラメータ化: 各プロンプトは関数として定義され、アプリケーションの状態（興味、記事プール等）を動的に注入可能。
 */

// 1. Curation (キュレーション)
/**
 * 大量の記事から、ユーザーの興味に最も合致する10件を抽出するためのスキーマとプロンプト。
 */
export const CURATE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    selections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING }
        },
        required: ["id", "reason"]
      }
    }
  },
  required: ["selections"]
};

export const curatePrompt = (interests: string, pool: string) => `
ユーザーの興味に基づいて、最新記事候補の中から最適な10件を選んでください。
興味: ${interests}
候補: ${pool}
`;

// 2. Evolution Proposals (自律的な興味の進化)
/**
 * システムが自律的に新しいソースやキーワードを提案するためのスキーマ。
 */
export const EVOLUTION_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    sites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING }
        },
        required: ["name", "url", "category", "reason"]
      }
    },
    brands: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          value: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING }
        },
        required: ["value", "category", "reason"]
      }
    },
    keywords: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          value: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING }
        },
        required: ["value", "category", "reason"]
      }
    }
  },
  required: ["sites", "brands", "keywords"]
};

export const evolutionPrompt = (interests: string) => `
あなたはニュースソースの専門家です。現在の興味リストに基づき、進化提案（フィード、ブランド、キーワード）を生成してください。
指示: 有効なRSSフィード、ブランド、キーワードを提案してください。
現在の興味リスト: ${interests}
`;

// 3. Fallback Evolution (フォールバック提案)
/**
 * 専門的なソースが見つからない場合に、一般的なニュースサイトのセクションを提案。
 */
export const FALLBACK_EVOLUTION_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    sites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING }
        },
        required: ["name", "url", "category", "reason"]
      }
    }
  },
  required: ["sites"]
};

export const fallbackEvolutionPrompt = (categories: string) => `
特定の興味カテゴリに対して専門的なニュースソースが見つかりませんでした。大手信頼できるニュースサイトから、関連セクションのRSSフィードを提案してください。
興味設定: ${categories}
`;

// 4. Restructure (構成の再構築)
/**
 * カテゴリの統合、分割、リネーミングを伴う大規模な環境整理のためのスキーマ。
 */
export const RESTRUCTURE_SCHEMA = (targetCount: number): ResponseSchema => ({
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          emoji: { type: SchemaType.STRING },
          brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          score: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING }
        },
        required: ["name", "emoji", "brands", "keywords", "score", "reason"]
      },
      minItems: targetCount,
      maxItems: targetCount
    },
    feedMapping: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          url: { type: SchemaType.STRING },
          newCategory: { type: SchemaType.STRING }
        },
        required: ["url", "newCategory"]
      }
    },
    newSuggestedFeeds: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING }
        },
        required: ["name", "url", "category"]
      }
    }
  },
  required: ["categories", "feedMapping", "newSuggestedFeeds"]
});

export const restructurePrompt = (targetCount: number, language: string, brands: string, keywords: string, categories: string, feeds: string) => `
ユーザーのニュース収集環境を${targetCount}個のカテゴリに再構築してください。
言語: ${language}
ブランド: ${brands}
キーワード: ${keywords}
現在のカテゴリ: ${categories}
現在のフィード: ${feeds}
`;

// 5. Discover Sites (サイト探索)
export const DISCOVER_SITES_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    sites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING }
        },
        required: ["name", "url", "category"]
      }
    }
  },
  required: ["sites"]
};

export const discoverSitesPrompt = (interests: string) => `
以下の興味設定に合致する、新しいニュースソース(RSS/Atom)を提案してください。
興味設定: ${interests}
`;

export const reacquireAllFeedsPrompt = (interests: string) => `
以下の興味設定カテゴリのそれぞれについて、それに合致する信頼性の高い日本語のRSS/AtomフィードのURLを提案してください。
必ず「日本語で書かれたサイト」のみを提案し、各カテゴリについて複数（3〜5件）候補を挙げてください。

興味設定: ${interests}
`;

// 6. Discover English Sites (英語サイト探索)
export const DISCOVER_ENGLISH_SITES_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    sites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          url: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          lang: { type: SchemaType.STRING }
        },
        required: ["name", "url", "category", "lang"]
      }
    }
  },
  required: ["sites"]
};

export const discoverEnglishSitesPrompt = (targetInterests: string) => `
以下のカテゴリにおいて、英語のRSSフィードを提案してください。対象カテゴリ: ${targetInterests}
`;

// 7. Translate Articles (記事翻訳)
export const TRANSLATE_ARTICLES_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    translations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          desc: { type: SchemaType.STRING }
        },
        required: ["title", "desc"]
      }
    }
  },
  required: ["translations"]
};

export const translateArticlesPrompt = (articles: string) => `
以下の記事リストを翻訳してください。
リスト: ${articles}
`;

// 8. Analyze Trends (トレンド分析)
/**
 * 収集した記事の中から、まだカテゴリ化されていないがユーザーの興味を惹く可能性のある要素を抽出。
 */
export const ANALYZE_TRENDS_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    suggestions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          value: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
          context: { type: SchemaType.STRING }
        },
        required: ["value", "category", "reason", "type", "confidence", "context"]
      }
    }
  },
  required: ["suggestions"]
};

export const analyzeTrendsPrompt = (categories: string, articles: string, externalTrends: string) => `
あなたはトレンド分析の専門家です。以下の情報を統合して、ユーザーが興味を持ちそうな新しいキーワードやブランドを抽出してください。

## 現在のユーザーカテゴリ（既知の興味）
${categories}

## X（旧Twitter）・Googleトレンド・Yahoo Japanのリアルタイムトレンド
${externalTrends}

## 最新ニュース記事
${articles}

## 指示
- 上記のSNSトレンドとニュース記事を横断的に分析してください
- 既存カテゴリにまだ含まれていない新しい興味・ブランド・キーワードを提案してください
- SNSトレンドに登場しているトピックを優先的に取り上げてください
- confidenceはSNSトレンドとニュース両方に登場するものは高め(80以上)、片方のみは中程度(50-79)にしてください
- typeはSNSトレンドのみに出現するものは"emerging"、ニュースにも出るものは"mainstream"としてください
`;

// 9. Suggest Category Details (カテゴリ詳細の提案)
export const SUGGEST_CATEGORY_DETAILS_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    emoji: { type: SchemaType.STRING },
    reason: { type: SchemaType.STRING }
  },
  required: ["brands", "keywords", "emoji", "reason"]
};

export const suggestCategoryDetailsPrompt = (categoryName: string) => `
カテゴリ「${categoryName}」に関連するブランド(5つ)とキーワード(5つ)を提案してください。
`;

// 10. Translate Interests (興味設定の翻訳)
export const TRANSLATE_INTERESTS_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          originalName: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          emoji: { type: SchemaType.STRING },
          brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          score: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING }
        },
        required: ["originalName", "name", "emoji", "brands", "keywords", "score", "reason"]
      }
    }
  },
  required: ["categories"]
};

export const translateInterestsPrompt = (interestsJson: string) => `
以下の設定データを英語に翻訳してください。
${interestsJson}
`;
