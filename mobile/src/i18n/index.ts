export type Lang = 'ja' | 'en';

const dict = {
  ja: {
    tab_dashboard: 'ダッシュボード',
    tab_agents: 'エージェント',
    tab_graph: 'ナレッジグラフ',
    tab_nexus: 'ネクサス',
    tab_settings: '設定',
    dashboard_title: 'インテリジェンス・ダッシュボード',
    dashboard_subtitle: 'あなたのために厳選された情報',
    run_orchestration: 'エージェントを実行',
    running: '実行中…',
    agents_title: 'AIエージェント・スワーム',
    graph_title: 'インテリジェンス・ナレッジグラフ',
    nexus_title: 'ネクサス・コマンド',
    nexus_subtitle: '興味関心プロファイルを編集',
    settings_title: 'システム設定',
    settings_provider: 'LLMプロバイダー',
    settings_model: 'モデル',
    settings_apikey: 'APIキー',
    settings_apikey_placeholder: 'APIキーを入力（端末内に安全に保存されます）',
    settings_save: '保存',
    settings_test: '接続テスト',
    settings_saved: '保存しました',
    settings_test_ok: '接続に成功しました',
    add_interest: 'カテゴリを追加',
    remove: '削除',
  },
  en: {
    tab_dashboard: 'Dashboard',
    tab_agents: 'Agents',
    tab_graph: 'Knowledge Graph',
    tab_nexus: 'Nexus',
    tab_settings: 'Settings',
    dashboard_title: 'Intelligence Dashboard',
    dashboard_subtitle: 'Curated knowledge, zero noise',
    run_orchestration: 'Run Agents',
    running: 'Running…',
    agents_title: 'AI Agent Swarm',
    graph_title: 'Intelligence Knowledge Graph',
    nexus_title: 'Nexus Command',
    nexus_subtitle: 'Edit your interest profile',
    settings_title: 'System Settings',
    settings_provider: 'LLM Provider',
    settings_model: 'Model',
    settings_apikey: 'API Key',
    settings_apikey_placeholder: 'Enter API key (stored securely on-device)',
    settings_save: 'Save',
    settings_test: 'Test Connection',
    settings_saved: 'Saved',
    settings_test_ok: 'Connection succeeded',
    add_interest: 'Add category',
    remove: 'Remove',
  },
} as const;

export type TranslationKey = keyof (typeof dict)['ja'];

export function t(lang: Lang, key: TranslationKey): string {
  return dict[lang][key] ?? dict.ja[key];
}
