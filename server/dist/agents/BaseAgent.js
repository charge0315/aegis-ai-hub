/**
 * BaseAgent: すべての専門エージェントの基底クラス
 */
export class BaseAgent {
    name;
    geminiService;
    /**
     * @param {string} name - エージェント名
     * @param {GeminiService} geminiService - Geminiサービスインスタンス
     */
    constructor(name, geminiService) {
        this.name = name;
        this.geminiService = geminiService;
    }
    /**
     * エージェントのアイデンティティを定義するシステムプロンプト
     * @returns {string}
     */
    getSystemPrompt() {
        return `You are ${this.name}, a specialized AI agent in the Aegis Nexus system.`;
    }
    /**
     * 基本的な思考プロセスを実行
     * @param {string} prompt
     * @param {ResponseSchema} schema
     */
    async think(prompt, schema) {
        const fullPrompt = `${this.getSystemPrompt()}\n\nTask: ${prompt}`;
        return await this.geminiService.generateStructured(fullPrompt, schema);
    }
}
