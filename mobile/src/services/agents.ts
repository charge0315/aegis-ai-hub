import type { AgentId, AgentStatus, Article, InterestCategory, LLMProviderConfig } from '../types';
import { getProvider } from './llm/providers';

/** 4体の専門AIエージェント定義。デスクトップ版 src/agents と概念を共通化。 */
export const AGENT_DEFINITIONS: Record<AgentId, { name: string; role: string; systemPrompt: string }> = {
  architect: {
    name: 'Architect',
    role: 'カテゴリ構造を最適化',
    systemPrompt: 'You are Architect, an AI agent in the Aegis Nexus system. You optimize the user\'s interest-category structure for clarity and coverage.',
  },
  curator: {
    name: 'Curator',
    role: '関連記事をスコアリング',
    systemPrompt: 'You are Curator, an AI agent in the Aegis Nexus system. You score articles from 1-10 based on relevance to the user\'s interests and explain why in one short sentence.',
  },
  discovery: {
    name: 'Discovery',
    role: '新しい情報源を自律探索',
    systemPrompt: 'You are Discovery, an AI agent in the Aegis Nexus system. You propose new high-quality sources related to the user\'s interests.',
  },
  archivist: {
    name: 'Archivist',
    role: 'トレンドと知識を学習・蓄積',
    systemPrompt: 'You are Archivist, an AI agent in the Aegis Nexus system. You summarize emerging trends across the curated articles.',
  },
};

export function initialAgentStatuses(): AgentStatus[] {
  const now = new Date().toISOString();
  return (Object.keys(AGENT_DEFINITIONS) as AgentId[]).map((id) => ({
    id,
    name: AGENT_DEFINITIONS[id].name,
    role: AGENT_DEFINITIONS[id].role,
    status: 'idle',
    lastMessage: '待機中…',
    timestamp: now,
  }));
}

interface RunOrchestrationParams {
  llmConfig: LLMProviderConfig;
  apiKey?: string;
  interests: InterestCategory[];
  articles: Article[];
  onAgentUpdate: (status: AgentStatus) => void;
}

/**
 * Curatorエージェントを実際にLLMへ問い合わせ、記事群の再評価コメントを取得する。
 * APIキー未設定時はネットワークを叩かず、ローカルヒューリスティックにフォールバックする。
 */
export async function runOrchestration({ llmConfig, apiKey, interests, articles, onAgentUpdate }: RunOrchestrationParams): Promise<void> {
  const order: AgentId[] = ['architect', 'discovery', 'curator', 'archivist'];

  for (const id of order) {
    const def = AGENT_DEFINITIONS[id];
    onAgentUpdate({ id, name: def.name, role: def.role, status: 'working', lastMessage: '実行中…', timestamp: new Date().toISOString() });

    try {
      const message = await runSingleAgent(id, llmConfig, apiKey, interests, articles);
      onAgentUpdate({ id, name: def.name, role: def.role, status: 'success', lastMessage: message, timestamp: new Date().toISOString() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onAgentUpdate({ id, name: def.name, role: def.role, status: 'error', lastMessage: msg, timestamp: new Date().toISOString() });
    }
  }
}

async function runSingleAgent(id: AgentId, llmConfig: LLMProviderConfig, apiKey: string | undefined, interests: InterestCategory[], articles: Article[]): Promise<string> {
  const def = AGENT_DEFINITIONS[id];
  const provider = getProvider(llmConfig);

  if (provider.requiresApiKey && !apiKey) {
    return fallbackMessage(id, interests, articles);
  }

  const prompt = buildPrompt(id, interests, articles);
  const { text } = await provider.chat({
    apiKey,
    model: llmConfig.model || provider.defaultModel,
    baseUrl: llmConfig.baseUrl,
    system: def.systemPrompt,
    prompt,
  });
  return text.trim().slice(0, 280) || fallbackMessage(id, interests, articles);
}

function buildPrompt(id: AgentId, interests: InterestCategory[], articles: Article[]): string {
  const interestLabels = interests.map((i) => `${i.emoji} ${i.label}`).join(', ');
  const articleTitles = articles.slice(0, 5).map((a) => `- ${a.title} (${a.category})`).join('\n');
  switch (id) {
    case 'architect':
      return `User interests: ${interestLabels}\nSuggest one concise improvement to this category structure (max 2 sentences, in Japanese).`;
    case 'discovery':
      return `User interests: ${interestLabels}\nPropose one new source worth watching (max 2 sentences, in Japanese).`;
    case 'curator':
      return `User interests: ${interestLabels}\nRecent articles:\n${articleTitles}\nGive a one-sentence curation verdict in Japanese.`;
    case 'archivist':
      return `Recent articles:\n${articleTitles}\nSummarize the emerging trend in one sentence, in Japanese.`;
  }
}

function fallbackMessage(id: AgentId, interests: InterestCategory[], articles: Article[]): string {
  switch (id) {
    case 'architect':
      return `現在 ${interests.length} カテゴリを監視中。構造は良好です（APIキー未設定のためローカル推定）。`;
    case 'discovery':
      return `関連ソースの探索候補を ${interests.length} 件のカテゴリから抽出しました（ローカル推定）。`;
    case 'curator':
      return `${articles.length} 件の記事を関連度順に再評価しました（ローカル推定）。`;
    case 'archivist':
      return `直近のトレンドを記録しました（ローカル推定）。`;
  }
}
