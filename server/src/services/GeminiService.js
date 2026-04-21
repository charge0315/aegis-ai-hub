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
    }

    /**
     * 多数の記事候補から、ユーザーの興味に最も合致する10件を厳選し、推薦理由を付与します。
     * @param {Array} articlesPool - 記事候補の配列
     * @param {Object} interests - ユーザーの興味データ
     * @returns {Promise<Array>} 推薦理由が付与された10件の記事
     */
    async curate(articlesPool, interests) {
        if (!this.genAI) {
            throw new Error("Gemini APIキーが設定されていません。.env ファイルを確認してください。");
        }

        // プロンプト用：興味リストの構造化
        const interestContext = Object.entries(interests.categories)
            .map(([cat, info]) => `[${cat}] Brands: ${info.brands.join(', ')}, Keywords: ${info.keywords.join(', ')}`)
            .join('\n');

        // トークン節約のため、評価に必要な情報のみを抽出
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

### ユーザーの興味リスト:
${interestContext}

### 最新記事候補:
${JSON.stringify(candidateArticles)}

### 出力指示:
選んだ10個の記事について、必ず以下の配列形式のJSONのみを出力してください。
Markdownのコードブロック（\`\`\`json 等）は含めず、純粋なJSONテキストのみを返してください。
推薦理由は1文で、ユーザーの好みにどうマッチしているかを具体的に記述してください。

[
  { "id": 数値, "reason": "推薦理由の文字列" },
  ...
]
`;

        // 利用可能なモデル名の優先順位（最新かつ安定している順）
        const modelNames = [
            "gemini-3.1-pro-preview",
            "gemini-3.1-flash-preview",
            "gemini-2.0-flash",
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ];
        let lastError = null;

        for (const name of modelNames) {
            try {
                console.log(`[GeminiService] モデル 「${name}」 でリクエストを実行中...`);
                const model = this.genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                let text = response.text();
                
                // 応答テキストのクレンジング（Markdownタグ等の除去）
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
                
                let selection;
                try {
                    selection = JSON.parse(text);
                } catch (e) {
                    // JSONパースに失敗した場合の抽出試行
                    const match = text.match(/\[[\s\S]*\]/);
                    if (!match) throw new Error("応答から有効なJSON配列を抽出できませんでした。");
                    selection = JSON.parse(match[0]);
                }
                
                console.log(`[GeminiService] ${name} からのキュレーション結果を取得しました。`);

                return selection.map(item => ({
                    ...articlesPool[item.id],
                    geminiReason: item.reason
                }));

            } catch (e) {
                console.warn(`[GeminiService] モデル 「${name}」 でエラーが発生しました。フォールバックを試みます。 (${e.message})`);
                lastError = e;
                continue; 
            }
        }

        throw new Error(`全モデルでキュレーションに失敗しました。最後のエラー: ${lastError.message}`);
    }
}
