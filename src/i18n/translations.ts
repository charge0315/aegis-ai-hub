export const translations = {
  ja: {
    sidebar: {
      feed: 'インテリジェンス・フィード',
      settings: 'Nexus コマンド',
    },
    header: {
      search: 'シグナルを検索...',
      jaOnly: 'JA Only',
      allLanguages: '全言語',
    },
    feed: {
      title: 'インテリジェンス・フィード',
      subtitle: '指定されたノードクラスターからのシグナルを統合中。',
      loading: 'シグナルを傍受中',
      loadingSub: 'ノードのハンドシェイクを初期化し、パケットストリームを復号中...',
      noSignals: 'アクティブなシグナルが検出されませんでした。フィード設定を確認してください。',
      signals: 'シグナル',
    },
    settings: {
      title: 'Nexus コマンド＆コントロール',
      subtitle: 'インテリジェンスパラメータの設定、知識の可視化、エージェントスキルの管理を行います。',
      save: '設定を保存',
      saving: '同期中...',
      translating: '翻訳中...',
      reset: 'ドラフトをリセット',
      aiRestructure: 'AI 再構築',
      thinking: '思考中...',
      tabs: {
        editor: 'Nexus エディタ',
        graph: 'ナレッジグラフ',
        skills: 'スキルレジストリ',
        insights: 'AI インサイト',
        system: 'システム設定',
        usage: '利用統計',
      },
      apiKeyAlert: 'Gemini APIキーが設定されていません。AI提案とインテリジェントディスカバリーは無効です。',
      configureNow: '今すぐ設定',
    },
    usage: {
      totalTokens: '合計トークン',
      activeDays: 'アクティブ日数',
      apiCalls: 'API 呼び出し数',
      historyTitle: 'トークン利用推移',
      distributionTitle: 'モデル別比率',
      logsTitle: '詳細ログ',
      inputTokens: '入力トークン',
      outputTokens: '出力トークン',
      date: '日付',
      input: '入力',
      output: '出力',
      total: '合計',
      calls: '回数',
      noData: '利用データはまだ記録されていません。',
      loading: '利用統計を読み込み中...',
      modelNote: 'モデルごとのトークン消費割合を表示しています。\nFlashモデルは高速、Proモデルは高度な推論に適しています。',
    },
    article: {
      synthesized: 'シグナル合成完了',
      reasoning: 'AI 推論プロセス',
      close: '閉じる',
    },
    agent: {
      swarm: 'エージェント・スウォーム',
      waiting: '指示を待機中...',
    },
    command: {
      placeholder: '実行したいアクションを入力してください...',
      noResults: '"{query}" に一致するコマンドが見つかりません',
      feed: {
        title: 'インテリジェンス・フィードを表示',
        subtitle: 'パーソナライズされたニュースストリームを確認します',
      },
      settings: {
        title: 'Nexus 設定を開く',
        subtitle: 'カテゴリ、ブランド、キーワードを設定します',
      },
      sync: {
        title: '設定を強制同期',
        subtitle: 'ローカルの変更を即座にサーバーへ反映します',
      },
      ai: {
        title: 'エージェントコマンド: 再生成',
        subtitle: '新しいインサイトを得るためにフルオーケストレーションを実行します',
      },
      jump: {
        title: '{cat} にジャンプ',
        subtitle: '{cat} カテゴリでフィードをフィルタリングします',
      },
      footer: {
        select: '選択',
        run: '実行',
      }
    },
    system: {
      visual: {
        title: 'ビジュアル体験',
        subtitle: 'デスクトップでのAegis Nexusの外観をカスタマイズします。',
        theme: 'インターフェーステーマ',
        light: 'ライト',
        dark: 'ダーク',
        system: 'システム',
        note: '「システム」を選択すると、OSのライト/ダークモード設定と自動的に同期します。',
      },
      language: {
        title: '表示言語',
        subtitle: 'UI全体の言語設定を切り替えます。',
        label: 'システム言語',
      },
      gemini: {
        title: 'Gemini API インテリジェンス',
        subtitle: 'Google Gemini APIの認証情報を安全に管理します。',
        label: 'Gemini API キー',
        placeholder: 'AIzaSy...',
        note: 'キーはこのマシンにローカルに保存されます。Google Gemini APIエンドポイント以外には送信されません。',
        apply: 'APIキーを適用',
        saving: '保存中...',
      },
      reset: {
        title: '工場出荷時リセット',
        subtitle: 'デフォルトのインテリジェンスプロファイルとフィードソースを復元します。',
        button: 'デフォルトプロファイルを復元',
      },
      usageNote: {
        title: '使用上の注意',
        content: 'Aegis Nexusがインテリジェントなニュースキュレーション、カテゴリ分析、および自律的なサイト発見を実行するには、有効なGemini APIキーが必要です。キーは Google AI Studio で無料で取得できます。',
      }
    },
    dialog: {
      confirm: '確認',
      cancel: 'キャンセル',
      ok: 'OK',
      detectConfig: {
        title: '既存の設定を検出',
        message: '既にブランドやキーワードの設定が存在します。これらをデフォルトのプロファイルで上書きしますか？（「キャンセル」を選択すると既存の設定を保持します）'
      },
      activeNodes: {
        title: 'アクティブノード',
        empty: 'アクティブなノードが接続されていません。'
      }
    },
    headerExtras: {
      grid: {
        small: '小グリッド',
        medium: '中グリッド',
        large: '大グリッド'
      },
      images: {
        hide: '画像を隠す',
        show: '画像を表示'
      }
    },
    handlers: {
      apiKeyRequired: 'Gemini APIキーが必要です。システム設定で設定しますか？',
      apiKeyRequiredSimple: 'APIキーが必要です。先にシステム設定でGemini APIキーを設定してください。',
      noTrends: 'AIが現在のフィードを分析しましたが、新しい重要なシグナルは見つかりませんでした。',
      categoryExists: 'このカテゴリは既に設定に存在します。',
      newCategory: '新しいカテゴリ',
      newCategoryPrompt: '新しいインテリジェンスカテゴリの名前を入力してください:',
      suggestionsReady: 'Geminiが「{name}」に対して5つのブランドと5つのキーワードを提案しました。',
      saveSuccess: '設定が正常に保存されました！',
      saveFailed: '設定の保存に失敗しました: {message}',
      syncConflict: 'サーバー上の設定が新しいです。変更を破棄して最新版を読み込みますか？',
      apiKeySuccess: 'Gemini APIキーが保存され、適用されました。',
      apiKeyFailed: 'APIキーの保存に失敗しました。',
      newSkill: '新しいスキル名',
      newSkillPrompt: '新しいエージェント機能の名前を入力してください:',
      skillDesc: '「{name}」の説明を入力してください:',
      skillAgent: 'どのエージェントがこのスキルを持つべきですか？',
      skillType: 'スキルの種類を入力してください (tool, action, または logic):',
      skillConflict: '似た名前のスキルが既に存在します。',
      skillSuccess: '「{name}」を {agent} クラスターに正常に追加しました。',
      renamePrompt: '「{oldName}」の新しい名前を入力してください:',
      nameConflict: 'この名前のカテゴリは既に存在します。',
      emojiPrompt: '「{catName}」の新しい絵文字を入力してください:',
      deleteConfirm: 'カテゴリ「{catName}」を完全に削除してもよろしいですか？関連するすべてのブランドとキーワードが削除されます。',
      aiSuggestSuccess: 'Geminiが「{category}」に対して {count} 個の新しい {field} を提案しました。',
      aiSuggestFailed: 'Geminiからの提案を取得できませんでした: {message}',
      restructurePrompt: 'すべてをいくつのカテゴリに再編成しますか？',
      restructureInvalid: '5から15の間の有効な数字を入力してください。',
      restructureConfirm: 'これにより、インテリジェンスプロファイルが完全に変換されます。AIがすべてを {count} 個の最適なカテゴリに再編成し、既存のフィードを再分配し、各グループに新しい高品質のソースを発見します。続行しますか？',
      restructurePhase1: 'フェーズ 1/2: {count} カテゴリに再編成中...',
      restructurePhase2: 'フェーズ 2/2: 新しい高品質ソースを注入中...',
      restructurePhaseFinal: '最終フェーズ: バックエンドと同期中...',
      restructureSuccess: 'AIがインテリジェンスプロファイルの変換に成功しました。同期完了。',
      restructureFailed: 'エラーが発生しました: {message}',
      resetConfirm: 'これによりすべてのカスタムカテゴリが消去され、工場出荷時の状態に復元されます。続行しますか？',
      resetSuccess: 'プロファイルがデフォルトに復元されました。再読み込み中...',
      resetFailed: 'デフォルト設定の復元に失敗しました。',
      quotaExceeded: 'Gemini APIの利用制限（トークン上限）に達しました。しばらく時間を置いてから再度お試しいただくか、APIキーのプランを確認してください。'
    }
  },
  en: {
    sidebar: {
      feed: 'Intelligence Feed',
      settings: 'Nexus Command',
    },
    header: {
      search: 'Search signals...',
      jaOnly: 'JA Only',
      allLanguages: 'All Languages',
    },
    feed: {
      title: 'Intelligence Feed',
      subtitle: 'Synthesizing signals from your designated node cluster.',
      loading: 'Intercepting Signals',
      loadingSub: 'Initializing node handshake & decrypting packet streams...',
      noSignals: 'No active signals detected. Check your feed configuration.',
      signals: 'SIGNALS',
    },
    settings: {
      title: 'Nexus Command & Control',
      subtitle: 'Configure intelligence parameters, visualize knowledge, and manage agent skills.',
      save: 'Save Configuration',
      saving: 'Synchronizing...',
      translating: 'Translating...',
      reset: 'Reset Draft',
      aiRestructure: 'AI Restructure',
      thinking: 'Thinking...',
      aiThinking: 'AI is Thinking...',
      analyzingData: 'Analyzing your data and discovering...',
      tabs: {
        editor: 'Nexus Editor',
        graph: 'Knowledge Graph',
        skills: 'Skill Registry',
        insights: 'AI Insights',
        system: 'System Settings',
        usage: 'API Usage',
      },
      apiKeyAlert: 'Gemini API Key is not configured. AI Suggestions and Intelligent Discovery are disabled.',
      configureNow: 'Configure Now',
    },
    usage: {
      totalTokens: 'Total Tokens',
      activeDays: 'Active Days',
      apiCalls: 'API Calls',
      historyTitle: 'Token Usage History',
      distributionTitle: 'Model Distribution',
      logsTitle: 'Detailed Logs',
      inputTokens: 'Input Tokens',
      outputTokens: 'Output Tokens',
      date: 'Date',
      input: 'Input',
      output: 'Output',
      total: 'Total',
      calls: 'Calls',
      noData: 'No usage data recorded yet.',
      loading: 'Loading usage statistics...',
      modelNote: 'Showing token consumption ratio per model.\nFlash models are fast, Pro models are for advanced reasoning.',
    },
    article: {
      synthesized: 'Signal Synthesized',
      reasoning: 'AI Reasoning',
      aiReasoning: 'AI Reasoning',
      close: 'Close',
    },
    agent: {
      swarm: 'Agent Swarm',
      waiting: 'Waiting for instructions...',
    },
    command: {
      placeholder: 'What would you like to do?',
      noResults: 'No commands found for "{query}"',
      commandCenter: 'Aegis Command Center v1.0',
      feed: {
        title: 'Go to Intelligence Feed',
        subtitle: 'View your personalized news stream',
      },
      settings: {
        title: 'Open Nexus Settings',
        subtitle: 'Configure categories, brands and keywords',
      },
      sync: {
        title: 'Force Sync Settings',
        subtitle: 'Immediately push local changes to server',
      },
      ai: {
        title: 'Command Agents: Regenerate',
        subtitle: 'Trigger full orchestration for new insights',
      },
      jump: {
        title: 'Jump to {cat}',
        subtitle: 'Filter feed by {cat} category',
      },
      footer: {
        select: 'Select',
        run: 'Run',
      }
    },
    system: {
      visual: {
        title: 'Visual Experience',
        subtitle: 'Customize how Aegis Nexus appears on your desktop.',
        theme: 'Interface Theme',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        note: '"System" will automatically synchronize with your OS light/dark mode settings.',
      },
      language: {
        title: 'Display Language',
        subtitle: 'Switch the overall language setting of the UI.',
        label: 'System Language',
      },
      gemini: {
        title: 'Gemini API Intelligence',
        subtitle: 'Securely manage your Google Gemini API credentials.',
        label: 'Gemini API Key',
        placeholder: 'AIzaSy...',
        note: 'Your key is stored locally on this machine. It is never transmitted except to Google Gemini API endpoints.',
        apply: 'Apply API Key',
        saving: 'Saving...',
      },
      reset: {
        title: 'Factory Reset',
        subtitle: 'Restore the default intelligence profile and feed sources.',
        button: 'Restore Default Profile',
      },
      usageNote: {
        title: 'Usage Note',
        content: 'Aegis Nexus requires a valid Gemini API Key to perform intelligent news curation, category analysis, and autonomous site discovery. You can obtain a key for free at the Google AI Studio.',
      }
    },
    dialog: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      ok: 'OK',
      detectConfig: {
        title: 'Existing Configuration Detected',
        message: 'You already have brands and keywords configured. Would you like to overwrite them with the default profile? (Select "Cancel" to keep your existing configuration)'
      },
      activeNodes: {
        title: 'Active Nodes',
        empty: 'No active nodes connected.'
      }
    },
    headerExtras: {
      grid: {
        small: 'Small Grid',
        medium: 'Medium Grid',
        large: 'Large Grid'
      },
      images: {
        hide: 'Hide Images',
        show: 'Show Images'
      }
    },
    handlers: {
      apiKeyRequired: 'Trend discovery requires a Gemini API Key. Would you like to go to System Settings to configure it?',
      apiKeyRequiredSimple: 'Please set your Gemini API key in System Settings first.',
      noTrends: 'AI analyzed current feeds but did not find any new significant signals at this time.',
      categoryExists: 'This category already exists in your configuration.',
      newCategory: 'New Category',
      newCategoryPrompt: 'Enter a name for the new intelligence category:',
      suggestionsReady: 'Gemini has suggested 5 brands and 5 keywords for "{name}".',
      saveSuccess: 'Configuration saved successfully!',
      saveFailed: 'Failed to save configuration: {message}',
      syncConflict: 'The configuration on the server is newer. Would you like to discard your changes and reload the latest version?',
      apiKeySuccess: 'Gemini API Key saved and applied.',
      apiKeyFailed: 'Failed to save API key.',
      newSkill: 'New Skill Name',
      newSkillPrompt: 'Enter a name for the new agent capability:',
      skillDesc: 'Enter a description for "{name}":',
      skillAgent: 'Which agent should possess this skill?',
      skillType: 'Enter skill type (tool, action, or logic):',
      skillConflict: 'A skill with a similar name already exists.',
      skillSuccess: 'Successfully added "{name}" to the {agent} cluster.',
      renamePrompt: 'Enter a new name for "{oldName}":',
      nameConflict: 'A category with this name already exists.',
      emojiPrompt: 'Enter a new emoji for "{catName}":',
      deleteConfirm: 'Are you sure you want to permanently delete the category "{catName}"? All associated brands and keywords will be removed.',
      aiSuggestSuccess: 'Gemini suggested {count} new {field} for "{category}".',
      aiSuggestFailed: 'Could not get suggestions from Gemini: {message}',
      restructurePrompt: 'How many categories would you like to reorganize everything into?',
      restructureInvalid: 'Please enter a valid number between 5 and 15.',
      restructureConfirm: 'This will completely transform your intelligence profile. AI will reorganize everything into {count} optimal categories, redistribute your existing feeds, and discover new high-quality sources for each group. Proceed?',
      restructurePhase1: 'Phase 1/2: Reorganizing into {count} Categories...',
      restructurePhase2: 'Phase 2/2: Injecting New High-Quality Sources...',
      restructurePhaseFinal: 'Final Phase: Synchronizing with Backend...',
      restructureSuccess: 'AI has successfully transformed your intelligence profile. Sync complete.',
      restructureFailed: 'An error occurred: {message}',
      resetConfirm: 'This will erase all custom categories and restore factory state. Proceed?',
      resetSuccess: 'Profile restored to defaults. Reloading...',
      resetFailed: 'Failed to restore default settings.',
      quotaExceeded: 'Gemini API quota limit reached. Please wait a moment before trying again or check your API key plan.'
    }
  }
};

export type Language = keyof typeof translations;
export type TranslationKeys = typeof translations.ja;
