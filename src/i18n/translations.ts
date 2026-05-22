/**
 * Aegis Nexus 翻訳リソース定義
 * 
 * アプリケーション内で使用されるすべてのテキストを多言語（日本語・英語）で一元管理します。
 * 新しいUIパーツを追加する際は、ここにキーを追加することで、
 * LanguageContext を通じて動的な言語切り替えが可能になります。
 */

export type Language = 'ja' | 'en';

export const translations = {
  /**
   * 日本語リソース
   */
  ja: {
    sidebar: {
      feed: '統合フィード',
      settings: 'システム設定'
    },
    header: {
      search: '記事を検索...',
      commandPalette: 'コマンドパレット (Ctrl+K)'
    },
    settings: {
      title: 'Nexus 設定',
      subtitle: 'AIエンジンと興味プロファイルの管理',
      apiKeyAlert: 'Gemini APIキーが設定されていません。AI機能を利用するには設定が必要です。',
      configureNow: '今すぐ設定',
      aiRestructure: 'AI 全再構築',
      save: '設定を保存',
      saving: '保存中...',
      thinking: 'AI推論中...',
      translating: '翻訳中...',
      reset: '変更を破棄',
      tabs: {
        editor: 'エディタ',
        graph: 'ナレッジグラフ',
        skills: 'スキル',
        system: 'システム',
        insights: 'AIインサイト',
        usage: '利用統計'
      },
      intelligenceCategories: 'インテリジェンス・カテゴリ',
      agents: {
        architect: 'Architect',
        curator: 'Curator',
        discovery: 'Discovery',
        archivist: 'Archivist'
      }
    },
    dialog: {
      success: '成功',
      error: 'エラー',
      caution: '警告',
      confirm: '確認',
      apiKeyRequired: 'APIキーが必要です',
      noTrends: 'トレンドなし',
      discoveryFailed: '探索失敗',
      categoryExists: 'カテゴリ重複',
      suggestionsFailed: '提案取得失敗',
      renameCategory: '名前の変更',
      nameConflict: '名前の衝突',
      deleteCategory: 'カテゴリの削除',
      aiSuggestionFailed: 'AI提案失敗',
      changeEmoji: '絵文字の変更',
      description: '説明',
      targetAgent: '対象エージェント',
      skillType: 'スキルの種類',
      idConflict: 'IDの衝突',
      saveFailed: '保存失敗',
      deepAiRestructure: 'Deep AI 再構築',
      invalidNumber: '無効な数値',
      restructureComplete: '再構築完了',
      restructureFailed: '再構築失敗',
      restoreDefaultProfile: 'デフォルトに戻す'
    },
    handlers: {
      apiKeySuccess: 'APIキーを保存しました。',
      apiKeyFailed: 'APIキーの保存に失敗しました。',
      apiKeyRequired: 'トレンド探索にはGemini APIキーが必要です。設定画面へ移動しますか？',
      apiKeyRequiredSimple: 'この機能を利用するにはGemini APIキーの設定が必要です。',
      noTrends: '新しいトレンドは見つかりませんでした。',
      quotaExceeded: 'Gemini APIの利用制限（Quota）に達しました。しばらく時間を置いてから再試行してください。',
      newCategory: '新しいカテゴリ',
      newCategoryPrompt: '追加したい興味カテゴリの名前を入力してください。',
      newCategoryPlaceholder: '例: 量子コンピューティング',
      categoryExists: 'そのカテゴリは既に存在します。',
      renamePrompt: '「{oldName}」の新しい名前を入力してください。',
      nameConflict: 'その名前のカテゴリは既に存在します。',
      deleteConfirm: 'カテゴリ「{catName}」と関連するフィード設定を削除してもよろしいですか？',
      emojiPrompt: '「{catName}」の新しい絵文字を入力してください。',
      newSkill: '新しいカスタムスキル',
      newSkillPrompt: 'スキルの名前を入力してください。',
      newSkillPlaceholder: '例: 市場予測',
      skillDesc: '「{name}」の機能説明を入力してください。',
      skillDescPlaceholder: '例: ニュースから市場の変動を予測する',
      skillAgent: 'このスキルを担当するエージェント',
      skillAgentPlaceholder: 'Architect / Curator / Discovery / Archivist',
      skillType: 'スキルの種類を入力してください (tool / action / logic)',
      skillConflict: 'そのIDのスキルは既に存在します。',
      saveSuccess: 'プロファイルを保存しました。',
      saveFailed: '保存中にエラーが発生しました。',
      restructurePrompt: '再構築後の目標カテゴリ数を入力してください（5-15）。',
      restructurePlaceholder: '10',
      restructureInvalid: '5から15の間の数値を入力してください。',
      restructureConfirm: '現在のカテゴリ構成を破棄し、AIによる最適な {count} カテゴリへの再構築を実行します。よろしいですか？（フィードは可能な限り引き継がれます）',
      restructurePhase1: '{count} カテゴリへの再構築プランを生成中...',
      restructurePhase2: 'フィードの再マッピングと検証を実行中...',
      restructureSuccess: 'プロファイルの再構築が完了しました。',
      resetConfirm: '現在の設定を全て破棄し、工場出荷時のデフォルト設定に戻します。よろしいですか？（この操作は取り消せません）',
      resetSuccess: '設定をリセットしました。'
    },
    usage: {
      loading: '統計データを読み込み中...',
      totalTokens: '累計トークン',
      activeDays: 'アクティブ日数',
      apiCalls: 'APIコール数',
      historyTitle: 'トークン使用履歴 (直近7日間)',
      distributionTitle: 'モデル別使用内訳',
      logsTitle: '利用ログについて',
      modelNote: '統計はローカルに保存されます。\nGemini 3.1 Pro/Flash の使用状況がここに反映されます。'
    },
    skills: {
      rssFetch: { name: 'RSS Fetch', description: 'ウェブサイトからRSSフィードを抽出する基本機能' },
      semanticFilter: { name: 'Semantic Filter', description: '記事の文脈を理解し、興味との関連性を計算する' },
      entityExtract: { name: 'Entity Extraction', description: '記事から組織、人物、技術などの固有表現を抽出する' },
      versionSync: { name: 'Version Sync', description: '設定変更の世代管理と同期を行う' },
      siteDiscovery: { name: 'Site Discovery', description: 'AIがウェブを探索し新しいニュースソースを見つける' },
      reasoningGen: { name: 'Reasoning Gen', description: 'なぜこの記事が選ばれたのかの推論根拠を生成する' }
    }
  },
  /**
   * 英語リソース
   */
  en: {
    sidebar: {
      feed: 'Unified Feed',
      settings: 'Settings'
    },
    header: {
      search: 'Search articles...',
      commandPalette: 'Command Palette (Ctrl+K)'
    },
    settings: {
      title: 'Nexus Settings',
      subtitle: 'Manage AI engine and interest profiles',
      apiKeyAlert: 'Gemini API Key is not set. Required for AI features.',
      configureNow: 'Configure Now',
      aiRestructure: 'AI Restructure',
      save: 'Save Changes',
      saving: 'Saving...',
      thinking: 'AI Thinking...',
      translating: 'Translating...',
      reset: 'Discard Changes',
      tabs: {
        editor: 'Editor',
        graph: 'Knowledge Graph',
        skills: 'Skills',
        system: 'System',
        insights: 'AI Insights',
        usage: 'Usage'
      },
      intelligenceCategories: 'Intelligence Categories',
      agents: {
        architect: 'Architect',
        curator: 'Curator',
        discovery: 'Discovery',
        archivist: 'Archivist'
      }
    },
    dialog: {
      success: 'Success',
      error: 'Error',
      caution: 'Caution',
      confirm: 'Confirm',
      apiKeyRequired: 'API Key Required',
      noTrends: 'No Trends',
      discoveryFailed: 'Discovery Failed',
      categoryExists: 'Category Exists',
      suggestionsFailed: 'Failed to get suggestions',
      renameCategory: 'Rename Category',
      nameConflict: 'Name Conflict',
      deleteCategory: 'Delete Category',
      aiSuggestionFailed: 'AI Suggestion Failed',
      changeEmoji: 'Change Emoji',
      description: 'Description',
      targetAgent: 'Target Agent',
      skillType: 'Skill Type',
      idConflict: 'ID Conflict',
      saveFailed: 'Save Failed',
      deepAiRestructure: 'Deep AI Restructure',
      invalidNumber: 'Invalid Number',
      restructureComplete: 'Restructure Complete',
      restructureFailed: 'Restructure Failed',
      restoreDefaultProfile: 'Restore Defaults'
    },
    handlers: {
      apiKeySuccess: 'API Key saved successfully.',
      apiKeyFailed: 'Failed to save API Key.',
      apiKeyRequired: 'Gemini API Key is required for trend discovery. Go to settings?',
      apiKeyRequiredSimple: 'Gemini API Key is required to use this feature.',
      noTrends: 'No new trends detected.',
      quotaExceeded: 'Gemini API Quota exceeded. Please try again later.',
      newCategory: 'New Category',
      newCategoryPrompt: 'Enter the name of the interest category you want to add.',
      newCategoryPlaceholder: 'e.g., Quantum Computing',
      categoryExists: 'That category already exists.',
      renamePrompt: 'Enter the new name for "{oldName}".',
      nameConflict: 'A category with that name already exists.',
      deleteConfirm: 'Are you sure you want to delete category "{catName}" and its feeds?',
      emojiPrompt: 'Enter the new emoji for "{catName}".',
      newSkill: 'New Custom Skill',
      newSkillPrompt: 'Enter the name of the skill.',
      newSkillPlaceholder: 'e.g., Market Prediction',
      skillDesc: 'Enter the functional description for "{name}".',
      skillDescPlaceholder: 'e.g., Predict market fluctuations from news',
      skillAgent: 'Agent responsible for this skill',
      skillAgentPlaceholder: 'Architect / Curator / Discovery / Archivist',
      skillType: 'Enter skill type (tool / action / logic)',
      skillConflict: 'A skill with that ID already exists.',
      saveSuccess: 'Profile saved successfully.',
      saveFailed: 'An error occurred during save.',
      restructurePrompt: 'Enter the target number of categories (5-15).',
      restructurePlaceholder: '10',
      restructureInvalid: 'Please enter a number between 5 and 15.',
      restructureConfirm: 'Current categories will be discarded. AI will restructure your profile into {count} optimal categories. Continue?',
      restructurePhase1: 'Generating restructure plan for {count} categories...',
      restructurePhase2: 'Remapping feeds and validating...',
      restructureSuccess: 'Profile restructure complete.',
      resetConfirm: 'Are you sure you want to discard all settings and restore factory defaults?',
      resetSuccess: 'Settings have been reset.'
    },
    usage: {
      loading: 'Loading stats...',
      totalTokens: 'Total Tokens',
      activeDays: 'Active Days',
      apiCalls: 'API Calls',
      historyTitle: 'Token Usage History (Last 7 Days)',
      distributionTitle: 'Model Distribution',
      logsTitle: 'About Usage Logs',
      modelNote: 'Statistics are stored locally.\nReflects usage of Gemini 3.1 Pro/Flash.'
    },
    skills: {
      rssFetch: { name: 'RSS Fetch', description: 'Basic capability to extract RSS feeds from websites' },
      semanticFilter: { name: 'Semantic Filter', description: 'Understand article context and calculate relevance to interests' },
      entityExtract: { name: 'Entity Extraction', description: 'Extract entities like organizations, people, and tech from articles' },
      versionSync: { name: 'Version Sync', description: 'Manage configuration generations and synchronization' },
      siteDiscovery: { name: 'Site Discovery', description: 'AI explores the web to find new news sources' },
      reasoningGen: { name: 'Reasoning Gen', description: 'Generate logical reasoning for why an article was selected' }
    }
  }
};

/**
 * 安全な翻訳データの取得
 * 指定された言語のリソースを返します。万が一存在しない場合は日本語をフォールバックとして使用します。
 */
export const getSafeTranslation = (lang: Language = 'ja') => {
  const base = translations[lang] || translations['ja'];
  return base;
};
