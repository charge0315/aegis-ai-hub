import { ArchitectAgent, ExecutionPlan } from "../agents/ArchitectAgent.js";
import { CuratorAgent } from "../agents/CuratorAgent.js";
import { DiscoveryAgent } from "../agents/DiscoveryAgent.js";
import { ArchivistAgent } from "../agents/ArchivistAgent.js";
import { GeminiService } from "../services/GeminiService.js";

export interface OrchestratorNotification {
  status: string;
  message: string;
  data?: any;
  agent?: string;
}

/**
 * NexusOrchestrator: 各専門エージェントを協調させ、自律ワークフローを制御する中枢。
 */
export class NexusOrchestrator {
  private geminiService: GeminiService;
  private architect: ArchitectAgent;
  private curator: CuratorAgent;
  private discovery: DiscoveryAgent;
  private archivist: ArchivistAgent;
  
  private subscribers: Set<any> = new Set();
  private isRunning: boolean = false;

  /**
   * @param {GeminiService} geminiService - Geminiサービスインスタンス
   */
  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
    this.architect = new ArchitectAgent(geminiService);
    this.curator = new CuratorAgent(geminiService);
    this.discovery = new DiscoveryAgent(geminiService);
    this.archivist = new ArchivistAgent(geminiService);
  }

  /**
   * フロントエンドへの通知を購読するためのSSEハンドラ登録。
   * FastifyのSSE方式に合わせて調整が必要。
   */
  public subscribe(res: any): void {
    this.subscribers.add(res);
    // Note: Fastify's response object might have different events
    if (res.raw) {
      res.raw.on('close', () => this.subscribers.delete(res));
    } else {
      res.on('close', () => this.subscribers.delete(res));
    }
  }

  /**
   * 全購読者へステータスを通知。
   */
  public notify(data: OrchestratorNotification): void {
    console.log(`[NexusOrchestrator] ${data.message || data.status}`);
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of this.subscribers) {
      try {
        if (res.raw) {
          res.raw.write(payload);
        } else {
          res.write(payload);
        }
      } catch (err) {
        console.error("[NexusOrchestrator] Notification failed", err);
      }
    }
  }

  /**
   * 自律ワークフローを実行。
   * @param {string} requirements - ユーザーからの目標・要件
   */
  async runAutonomousLoop(requirements: string): Promise<void> {
    if (this.isRunning) {
      throw new Error("Orchestrator is already running.");
    }

    this.isRunning = true;
    this.notify({ status: "start", message: "自律Nexusワークフローを開始します。" });

    try {
      // 1. Architectによるプランニング
      this.notify({ status: "planning", message: "Architectがプランを立案中..." });
      const plan: ExecutionPlan = await this.architect.plan(requirements);
      this.notify({ status: "plan_ready", message: "プランが確定しました。", data: plan });

      // 2. ステップの実行
      for (const step of plan.steps) {
        this.notify({ 
          status: "executing", 
          message: `${step.agent} がアクションを実行中: ${step.action}`,
          agent: step.agent
        });

        let result: any;
        switch (step.agent) {
          case "Curator":
            // 本来はScraper等からデータを取得するが、ここではワークフローのデモ
            result = { message: "Curated 10 high-quality articles based on interests." };
            break;
          case "Discovery":
            result = await this.discovery.discoverSources({ categories: {} }); // Simplified for demo
            break;
          case "Archivist":
            result = await this.archivist.summarizeAndArchive("Aegis Nexus System Update");
            break;
          default:
            result = { message: "Unknown agent action performed." };
        }

        this.notify({ 
          status: "step_complete", 
          message: `${step.agent} のタスクが完了しました。`, 
          data: result 
        });
      }

      this.notify({ status: "complete", message: "全ての自律タスクが正常に完了しました。" });

    } catch (error: any) {
      console.error("[NexusOrchestrator] Error:", error);
      this.notify({ status: "error", message: `エラーが発生しました: ${error.message}` });
    } finally {
      this.isRunning = false;
      this.notify({ status: "idle", message: "オーケストレーターは待機状態です。" });
    }
  }
}
