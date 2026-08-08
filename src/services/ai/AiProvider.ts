import type { ResponseSchema } from "@google/generative-ai";

export interface LlmOptions {
  modelName: string;
  systemPrompt?: string;
  temperature?: number;
  onUsageUpdate?: (promptTokens: number, completionTokens: number) => void;
}

export interface AiProvider {
  /**
   * 与えられたプロンプトに対して、指定されたスキーマ構造に従うJSONデータを生成します。
   */
  generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T>;
}
