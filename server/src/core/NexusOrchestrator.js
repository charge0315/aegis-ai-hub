import { ArchitectAgent } from "../agents/ArchitectAgent.js";
import { GeneratorAgent } from "../agents/GeneratorAgent.js";
import { EvaluatorAgent } from "../agents/EvaluatorAgent.js";

/**
 * NexusOrchestrator: エージェントを制御し、自律ループを回す中枢。
 */
export class NexusOrchestrator {
    /**
     * @param {GeminiService} geminiService - Geminiサービス
     */
    constructor(geminiService) {
        this.architect = new ArchitectAgent(geminiService);
        this.generator = new GeneratorAgent(geminiService);
        this.evaluator = new EvaluatorAgent(geminiService);
        this.subscribers = new Set();
        this.isRunning = false;
    }

    /**
     * フロントエンドへの通知を購読するためのSSEハンドラ登録。
     */
    subscribe(res) {
        this.subscribers.add(res);
        res.on('close', () => this.subscribers.delete(res));
    }

    /**
     * 全購読者へステータスを通知。
     */
    notify(data) {
        console.log(`[NexusOrchestrator] ${data.message || data.status}`);
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const res of this.subscribers) {
            res.write(payload);
        }
    }

    /**
     * 自律ループを実行。
     * 「要件定義 -> 設計 -> 実装 -> テスト」
     * @param {string} requirements - 達成すべき目標
     */
    async runAutonomousLoop(requirements) {
        if (this.isRunning) {
            throw new Error("Loop is already running.");
        }

        this.isRunning = true;
        this.notify({ status: "start", message: "自律ループを開始します。" });

        let currentRequirements = requirements;
        let loopCount = 0;
        const maxLoops = 3; // 無限ループ防止
        let success = false;

        try {
            while (loopCount < maxLoops && !success) {
                loopCount++;
                this.notify({ 
                    status: "planning", 
                    message: `フェーズ 1/4: 設計プラン立案中 (イテレーション ${loopCount})`,
                    iteration: loopCount 
                });

                // 1. 設計
                const plan = await this.architect.plan(currentRequirements);
                this.notify({ status: "plan_ready", message: "設計プランが完了しました。", data: plan });

                // 2. 実装
                this.notify({ status: "implementing", message: "フェーズ 2/4: コード生成中..." });
                const implementation = await this.generator.implement(plan);
                this.notify({ status: "implementation_ready", message: "実装コードが生成されました。", data: implementation });

                // 3. テスト・評価
                this.notify({ status: "evaluating", message: "フェーズ 3/4: 品質評価実行中..." });
                const evaluation = await this.evaluator.evaluate(plan, implementation);

                if (evaluation.passed && evaluation.score >= 80) {
                    this.notify({ 
                        status: "complete", 
                        message: "フェーズ 4/4: 全ての検証をパスしました。", 
                        data: evaluation 
                    });
                    success = true;
                } else {
                    this.notify({ 
                        status: "retry", 
                        message: `品質が基準に達しませんでした (Score: ${evaluation.score})。再試行します。`, 
                        data: evaluation 
                    });
                    // フィードバックを次のイテレーションの要件に反映
                    currentRequirements = `
元の要件: ${requirements}
前回の失敗フィードバック: ${evaluation.feedback}
改善のヒント: ${evaluation.improvement_suggestions.join(", ")}
セキュリティ指摘: ${evaluation.security_review}
`;
                }
            }

            if (!success) {
                this.notify({ status: "error", message: "規定の回数内に目標を達成できませんでした。" });
            }

        } catch (error) {
            this.notify({ status: "error", message: `エラーが発生しました: ${error.message}` });
        } finally {
            this.isRunning = false;
            this.notify({ status: "idle", message: "オーケストレーターは待機状態です。" });
        }
    }
}
