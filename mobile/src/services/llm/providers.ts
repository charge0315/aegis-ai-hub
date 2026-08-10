import type { LLMProviderConfig, LLMProviderId } from '../../types';

export interface LLMChatResult {
  text: string;
}

/**
 * Bring-Your-Own-LLM 抽象化レイヤー。
 * デスクトップ版と同じく Gemini / Claude / OpenAI互換 / Ollama(ローカル) を
 * 単一インターフェースの `chat()` で扱う。fetch のみに依存するため RN でも動作する。
 */
export interface LLMProvider {
  id: LLMProviderId;
  label: string;
  requiresApiKey: boolean;
  defaultModel: string;
  chat(params: { apiKey?: string; model: string; baseUrl?: string; system: string; prompt: string }): Promise<LLMChatResult>;
}

async function fetchJson(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const body = await res.text();
  let json: any;
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`Invalid response from ${url}: ${body.slice(0, 200)}`);
  }
  if (!res.ok) {
    const message = json?.error?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json;
}

const gemini: LLMProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  requiresApiKey: true,
  defaultModel: 'gemini-2.5-flash',
  async chat({ apiKey, model, system, prompt }) {
    if (!apiKey) throw new Error('Gemini API key is required');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const json = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
    return { text };
  },
};

const claude: LLMProvider = {
  id: 'claude',
  label: 'Anthropic Claude',
  requiresApiKey: true,
  defaultModel: 'claude-sonnet-5',
  async chat({ apiKey, model, system, prompt }) {
    if (!apiKey) throw new Error('Anthropic API key is required');
    const json = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const text = json?.content?.map((c: any) => c.text).join('') ?? '';
    return { text };
  },
};

const openai: LLMProvider = {
  id: 'openai',
  label: 'OpenAI 互換',
  requiresApiKey: true,
  defaultModel: 'gpt-4o-mini',
  async chat({ apiKey, model, baseUrl, system, prompt }) {
    if (!apiKey) throw new Error('OpenAI API key is required');
    const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
    const json = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const text = json?.choices?.[0]?.message?.content ?? '';
    return { text };
  },
};

const ollama: LLMProvider = {
  id: 'ollama',
  label: 'Ollama (Local LLM)',
  requiresApiKey: false,
  defaultModel: 'llama3',
  async chat({ model, baseUrl, system, prompt }) {
    const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`;
    const json = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const text = json?.message?.content ?? '';
    return { text };
  },
};

export const LLM_PROVIDERS: Record<LLMProviderId, LLMProvider> = { gemini, claude, openai, ollama };

export function getProvider(config: LLMProviderConfig): LLMProvider {
  return LLM_PROVIDERS[config.provider];
}
