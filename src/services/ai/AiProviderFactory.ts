import type { Credentials } from "../../models/Schemas";
import type { AiProvider } from "./AiProvider";
import { GoogleProvider } from "./providers/GoogleProvider";
import { AnthropicProvider } from "./providers/AnthropicProvider";
import { OpenAiCompatibleProvider } from "./providers/OpenAiCompatibleProvider";
import { OllamaProvider } from "./providers/OllamaProvider";

export class AiProviderFactory {
  /**
   * Credentials 設定に基づいて、適切な AiProvider インスタンスを作成します。
   */
  static create(credentials: Credentials): AiProvider {
    const provider = credentials.activeProvider || 'google';

    switch (provider) {
      case 'google': {
        const apiKey = credentials.google?.apiKey || credentials.geminiApiKey || '';
        return new GoogleProvider(apiKey);
      }
      case 'anthropic': {
        const apiKey = credentials.anthropic?.apiKey || '';
        const baseUrl = credentials.anthropic?.baseUrl;
        return new AnthropicProvider(apiKey, baseUrl);
      }
      case 'openai': {
        const apiKey = credentials.openai?.apiKey || '';
        const baseUrl = credentials.openai?.baseUrl;
        return new OpenAiCompatibleProvider(apiKey, baseUrl);
      }
      case 'ollama': {
        const baseUrl = credentials.ollama?.baseUrl;
        return new OllamaProvider(baseUrl);
      }
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
