/**
 * プロンプト構築と履歴管理の基底クラス。
 */
export class BaseAgent {
    /**
     * @param {string} name - エージェント名
     * @param {GeminiService} geminiService - Geminiサービス
     */
    constructor(name, geminiService) {
        this.name = name;
        this.geminiService = geminiService;
        this.history = [];
    }

    /**
     * エージェントにメッセージを送信し、応答を取得します。
     * @param {string} message - 送信メッセージ
     * @param {object} [schema] - レスポンススキーマ（JSON強制用）
     */
    async ask(message, schema = null) {
        console.log(`[${this.name}] Thinking...`);
        const response = await this.geminiService.chat(this.history, message, schema);
        
        this.history.push({ role: "user", content: message });
        this.history.push({ 
            role: "assistant", 
            content: typeof response === 'string' ? response : JSON.stringify(response) 
        });
        
        return response;
    }

    /**
     * 履歴をクリアします。
     */
    clearHistory() {
        this.history = [];
    }
}
