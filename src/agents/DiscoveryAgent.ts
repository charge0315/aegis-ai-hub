import { BaseAgent } from "./BaseAgent";
import { GeminiService } from "../services/GeminiService";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { Interests } from "../models/Schemas";

export interface DiscoverySource {
  name: string;
  url: string;
  category: string;
  reason: string;
}

export interface DiscoveryResult {
  new_sources: DiscoverySource[];
}

/**
 * DiscoveryAgent: 新しい情報源やトレンドの発見を担当。
 * 
 * 役割:
 * - インターネット（Web）上の広大な情報から、ユーザーがまだ知らない有益なニュースソース（RSS、ブログ等）を見つけ出す。
 * - 現在の興味設定を補完するような「未知の領域」を探索し、システムの進化を促す。
 * 
 * 設計思想:
 * - 知的好奇心: 既存の枠組みにとらわれず、関連性の高い新しいサイトを能動的にスカウトする。
 * - 妥当性の検証: 発見したソースがなぜ有益なのかという理由（reason）を明確にし、導入の根拠を提供。
 */
export class DiscoveryAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Discovery", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Discovery' エージェントです。
Webを探索し、ユーザーがまだ知らない新しい情報源（RSSフィード、ブログ等）や、業界で注目中のトレンドを発見します。
好奇心旺盛で、未知の領域を探索することを得意としています。
`;
  }

  /**
   * ユーザーの興味に基づき、新しい情報源を提案する。
   * 
   * @param {Interests} currentInterests ユーザーの現在の興味設定
   */
  async discoverSources(currentInterests: Interests): Promise<DiscoveryResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        new_sources: {
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
      required: ["new_sources"]
    };

    const prompt = `現在の興味（${JSON.stringify(currentInterests)}）を補完する、新しい信頼できる情報源を5つ提案してください。`;
    return await this.think<DiscoveryResult>(prompt, schema);
  }
}
