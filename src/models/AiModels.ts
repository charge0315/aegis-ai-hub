/**
 * AI プロバイダーごとのモデル一覧・既定モデル・提供終了モデルの置き換え先。
 *
 * モデル ID は 2026-11-07 時点の各社公式ドキュメントで確認したもの。
 * - Google: https://aistudio.google.com/docs/models
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 * - OpenAI: https://developers.openai.com/api/docs/models
 * - Ollama: https://ollama.com/library
 */
export type AiProviderId = 'google' | 'anthropic' | 'openai' | 'ollama';

/** 設定画面の選択肢。各配列の先頭がそのプロバイダーの既定モデル。 */
export const PROVIDER_MODELS: Record<AiProviderId, readonly string[]> = {
  google: ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-4-argon', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'],
  anthropic: ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'],
  openai: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-6.1-terra', 'gpt-6-luna'],
  ollama: ['gemma4', 'qwen3.5', 'gpt-oss', 'llama3.1', 'deepseek-r1'],
};

/** アプリ全体の既定モデル（既定プロバイダーは google）。 */
export const DEFAULT_MODEL = PROVIDER_MODELS.google[0];

/**
 * 推論の重い処理で、軽量モデルから切り替える上位モデル。
 * 軽量モデルかどうかは GeminiService の判定（flash / haiku / mini / terra / luna など）による。
 */
export const HIGH_REASONING_MODELS = {
  gemini: 'gemini-4-argon',
  claude: 'claude-sonnet-5-5',
  gpt: 'gpt-6.1-sol',
} as const;

/**
 * 保存済み設定に残っている、使えないモデル ID の置き換え先。
 * - claude-3-5-sonnet-*: 2025-10-28 提供終了（公式の後継は claude-sonnet-5-5）
 * - claude-3-5-haiku-*: 2026-02-19 提供終了（同じ Haiku 系の最新へ）
 * - claude-3-5-opus-latest: 以前の選択肢にあったが、公式に存在しない ID
 * - o1-mini: 2025-10-27 提供終了
 * - gemini-3.5-pro: 以前の選択肢にあったが、公式のモデル一覧・廃止一覧のどちらにも無い ID
 */
const RETIRED_MODEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  'claude-3-5-sonnet-latest': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-20241022': 'claude-sonnet-5-5',
  'claude-3-5-sonnet-20240620': 'claude-sonnet-5-5',
  'claude-3-5-haiku-latest': 'claude-haiku-5-5',
  'claude-3-5-haiku-20241022': 'claude-haiku-5-5',
  'claude-3-5-opus-latest': 'claude-opus-5-5',
  'o1-mini': 'gpt-6.1-terra',
  'gemini-3.5-pro': 'gemini-4-argon',
};

/** 使えないモデル ID なら置き換え先を、そうでなければそのまま返す。 */
export function replaceRetiredModel(model: string): string {
  return RETIRED_MODEL_REPLACEMENTS[model] ?? model;
}
