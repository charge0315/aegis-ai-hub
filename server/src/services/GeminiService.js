import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini APIを活用して記事のキュレーションと推薦理由の生成を行うサービス。
 * 複数のモデル候補を用いたフォールバック機構を備え、安定したAI応答を保証します。
 */
export class GeminiService {
    /**
     * @param {string} apiKey - Google Gemini APIキー
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
        // 利用可能なモデル名の優先順位（最新版を優先）
        this.modelNames = [
            "gemini-3.1-pro",
            "gemini-3.1-pro-preview",
            "gemini-3.1-flash",
            "gemini-3.1-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
        ];
    }

    /**
     * 指定されたプロンプトを、利用可能なモデルで順次試行します。
     * @private
     * @returns {Promise<{text: string, modelName: string}>}
     */
    async _generateWithFallback(prompt) {
        let lastError = null;
        for (const name of this.modelNames) {
            try {
                console.log(`[GeminiService] モデル 「${name}」 でリクエストを実行中...`);
                const model = this.genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return { text: response.text(), modelName: name };
            } catch (e) {
                console.warn(`[GeminiService] モデル 「${name}」 でエラーが発生しました。フォールバックを試みます。 (${e.message})`);
                lastError = e;
            }
        }
        throw new Error(`全モデルでリクエストに失敗しました。最後のエラー: ${lastError.message}`);
    }

    /**
     * 多数の記事候補から、ユーザーの興味に最も合致する10件を厳選し、推薦理由を付与します。
     */
    async curate(articlesPool, interests) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

        const interestContext = Object.entries(interests.categories)
            .map(([cat, info]) => `[${cat}] Brands: ${info.brands.join(', ')}, Keywords: ${info.keywords.join(', ')}`)
            .join('\n');

        const candidateArticles = articlesPool.slice(0, 30).map((a, i) => ({
            id: i,
            title: a.title,
            brand: a.brand,
            category: a.category,
            desc: a.desc
        }));

        const prompt = `
あなたはガジェット専門のAIコンシェルジュです。
提示された「最新記事候補」の中から、ユーザーの「興味リスト」に最も合致するものを【必ず10個】選んでください。
JSON形式で出力してください。
[
  { "id": 数値, "reason": "推薦理由の文字列" }
]
### 興味リスト:
${interestContext}
### 最新記事候補:
${JSON.stringify(candidateArticles)}
`;

        const { text } = await this._generateWithFallback(prompt);
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let selection;
        try {
            selection = JSON.parse(jsonText.match(/\[[\s\S]*\]/)[0]);
        } catch (e) {
            throw new Error("応答から有効なJSON配列を抽出できませんでした。");
        }

        return selection.map(item => ({
            ...articlesPool[item.id],
            geminiReason: item.reason
        }));
    }

    /**
     * ユーザーの興味に基づき、新しいRSSフィード対応サイトを探索します。
     */
    async discoverSites(interests) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

        const context = JSON.stringify(interests.categories, null, 2);
        const prompt = `
あなたはガジェット情報のスペシャリストです。
以下の「ユーザーの興味リスト」に基づき、これらに合致する高品質な最新ニュースを提供している【RSSフィードに対応した】ウェブサイトを10個程度提案してください。
JSON形式で出力してください。
[
  { "name": "サイト名", "url": "RSS URL", "category": "カテゴリ名", "description": "理由" }
]
### ユーザーの興味リスト:
${context}
`;

        const { text } = await this._generateWithFallback(prompt);
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonText.match(/\[[\s\S]*\]/)[0]);
    }

    async analyzeTrends(articles, interests) {
        return [];
    }

    /**
     * 現在の interests.json を分析し、カテゴリ構造、ブランド、キーワードを最適化（再構築）する案を生成します。
     */
    async getRestructureProposal(interests) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

        const context = JSON.stringify(interests, null, 2);
        const prompt = `
あなたはナレッジグラフと情報整理の専門家です。
以下の「ユーザーの現在の興味設定（interests.json）」を分析し、より効率的で網羅的な「ガジェットニュース・ダッシュボード」にするための【構造再構築案】を提案してください。

### 現在の構造:
${context}

### 再構築の指針:
1. **カテゴリの整理**: 重複しているカテゴリを統合し、分かりにくい名称を直感的なものに変更してください。
2. **網羅性の向上**: 現在の興味から推測される、追加すべき新しいカテゴリ（セクション）を提案してください。
3. **要素の最適配置**: 各ブランドやキーワードを、最も適切なカテゴリに再配置してください。
4. **不足の補充**: 各カテゴリにおいて、核となる重要ブランドやキーワードが欠けている場合は補完してください。

### 出力形式:
必ず以下の形式のJSONのみを出力してください。
{
  "categories": {
    "新カテゴリ名": {
      "brands": ["ブランド1", "ブランド2", ...],
      "keywords": ["キーワード1", "キーワード2", ...],
      "score": 10,
      "reason": "このカテゴリの定義・変更理由"
    }
  },
  "modelName": "使用したモデル名"
}
`;

        const { text, modelName } = await this._generateWithFallback(prompt);
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonText.match(/\{[\s\S]*\}/)[0]);
        return { ...data, modelName };
    }

    /**
     * ユーザーの興味に基づき、新しいサイト、ブランド、キーワードの「進化」提案を一括生成します。
     */
    async getEvolutionProposals(interests) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

        const context = JSON.stringify(interests.categories, null, 2);
        const prompt = `
あなたはガジェットと最新テクノロジーのトレンド分析のエキスパートです。
以下の「ユーザーの興味リスト」を分析し、システムの能力を拡張するための「進化提案」を作成してください。

1. **新しい情報源 (sites)**: 興味に合致し、かつ現在登録されていないであろう高品質なRSSフィード対応サイトを3〜5つ。
2. **注目ブランド (brands)**: 各カテゴリに追加すべき最新の注目ブランドを合計5つ程度。
3. **新規キーワード (keywords)**: 今後流行が予想される、または現在欠けている重要なテクノロジー用語を合計5つ程度。

### ユーザーの興味リスト:
${context}

### 出力形式:
必ず以下の形式のJSONのみを出力してください。
{
  "sites": [
    { "name": "サイト名", "url": "RSS URL", "category": "既存のカテゴリ名", "reason": "提案理由" }
  ],
  "brands": [
    { "value": "ブランド名", "category": "既存のカテゴリ名", "reason": "提案理由" }
  ],
  "keywords": [
    { "value": "キーワード名", "category": "既存のカテゴリ名", "reason": "提案理由" }
  ]
}
`;

        const { text, modelName } = await this._generateWithFallback(prompt);
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonText.match(/\{[\s\S]*\}/)[0]);
        return { ...data, modelName };
    }
}
