import { GoogleGenerativeAI, type GenerativeModel, type ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";

export class GoogleProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Google API key is required.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const model: GenerativeModel = this.genAI.getGenerativeModel({
      model: options.modelName,
      systemInstruction: options.systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: options.temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Google AI (Gemini) returned an empty response.");
    }

    return JSON.parse(text) as T;
  }
}
