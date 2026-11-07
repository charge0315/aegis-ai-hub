import { GoogleGenAI, type Schema as ResponseSchema } from "@google/genai";
import type { AiProvider, LlmOptions } from "../AiProvider";

export class GoogleProvider implements AiProvider {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Google API key is required.");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const response = await this.genAI.models.generateContent({
      model: options.modelName,
      contents: prompt,
      config: {
        systemInstruction: options.systemPrompt,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: options.temperature,
      },
    });
    const text = response.text;

    if (!text) {
      throw new Error("Google AI (Gemini) returned an empty response.");
    }

    return JSON.parse(text) as T;
  }
}
