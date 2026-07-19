const { contextBridge, ipcRenderer } = require('electron');

/**
 * Aegis Nexus IPC Bridge (Preload Script)
 * 
 * 【設計思想: Security-by-Design】
 * フロントエンド（レンダラープロセス）とシステム（メインプロセス）の間に安全な境界線を設けます。
 * 
 * 1. 最小権限の原則: Node.js の全機能を露出させるのではなく、アプリに必要な特定のメソッドのみを公開します。
 * 2. コンテキストの分離: `contextBridge` を使用し、レンダラー側の JavaScript コンテキストを汚染・操作
 *    されるリスクを排除し、安全にプロセス間通信 (IPC) を行います。
 */
contextBridge.exposeInMainWorld('nexusApi', {
  /**
   * 記事リストを取得します。
   * メインプロセスの Orchestrator を通じて、永続化された最新データを取得します。
   */
  getArticles: (options) => ipcRenderer.invoke('get-articles', options),

  /**
   * ユーザーの設定（興味、フィード、カテゴリー構成）をメインプロセスの設定マネージャーから取得します。
   */
  getSettings: () => ipcRenderer.invoke('get-settings'),

  /**
   * フロントエンドで編集された設定をバックエンドに同期・保存します。
   */
  syncSettings: (settings) => ipcRenderer.invoke('sync-settings', settings),

  /**
   * AIによる情報の収集・分析プロセス（オーケストレーション）を手動で起動します。
   */
  triggerOrchestration: (requirements) => ipcRenderer.invoke('trigger-orchestration', requirements),

  /**
   * メインプロセスで動作するAIエージェントの進捗状況（イベント）をフロントエンドへ中継します。
   */
  onAgentEvent: (callback) => ipcRenderer.on('agent-event', (event, data) => callback(data)),

  /**
   * メモリリークを防ぐため、イベントリスナーを明示的に解除する手段を提供します。
   */
  removeAgentEventListener: () => ipcRenderer.removeAllListeners('agent-event'),

  /**
   * ユーザーが新しいカテゴリを作成する際、AIに関連キーワードや絵文字を提案させます。
   */
  suggestCategory: (categoryName) => ipcRenderer.invoke('suggest-category', categoryName),

  /**
   * AIが見つけた「改善の余地があるフィード」や「新しく追加すべき情報源」の提案を取得します。
   */
  getProposals: () => ipcRenderer.invoke('get-proposals'),

  /**
   * セキュアに保存されている Gemini APIキーを取得します。
   */
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  /**
   * Gemini APIキーを暗号化して保存します。
   */
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),

  /**
   * 肥大化したカテゴリ構造をAIによって整理・統合します。
   */
  restructureCategories: (count) => ipcRenderer.invoke('restructure-categories', count),

  /**
   * 最新記事群から、ユーザーの興味に基づいた新しいトレンド（流行の兆し）を抽出します。
   */
  discoverTrends: () => ipcRenderer.invoke('discover-trends'),

  /**
   * トラブルシューティングやリセットが必要な場合、全設定を工場出荷時の状態に戻します。
   */
  resetToDefaults: (lang) => ipcRenderer.invoke('reset-to-defaults', lang),

  /**
   * 全カテゴリのフィード先をGeminiで再取得します。
   */
  reacquireAllFeeds: () => ipcRenderer.invoke('reacquire-all-feeds'),

  /**
   * テーマや言語設定などのUI表示に関する永続化設定を操作します。
   */
  getUiSettings: () => ipcRenderer.invoke('get-ui-settings'),
  saveUiSettings: (settings) => ipcRenderer.invoke('save-ui-settings', settings),

  /**
   * AIモデルごとの使用量統計（トークン数）を取得します。
   */
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),

  /**
   * AIの使用量統計が更新された際のイベントを購読します。
   * 返り値の関数を呼び出すことで、安全に購読を解除（メモリリーク防止）できます。
   */
  onUsageUpdate: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('usage-update', subscription);
    return () => {
      ipcRenderer.removeListener('usage-update', subscription);
    };
  },

  /**
   * 最小化・最大化・閉じるなどのカスタムウィンドウ操作をメインプロセスに要求します。
   */
  windowControl: (action) => ipcRenderer.send('window-control', action),

  /**
   * 外部URLをシステムのデフォルトブラウザで安全に開きます。
   * メインプロセス側でhttps/httpスキームのみ許可します。
   */
  openExternal: (url) => ipcRenderer.send('open-external', url),

  /**
   * 記事をアプリ内の別ウィンドウ（Webビュー）で安全に開きます。
   */
  openArticle: (url) => ipcRenderer.send('open-article', url),

  /**
   * 設定（興味関心）を別の言語に翻訳します。
   */
  translateInterests: (settings) => ipcRenderer.invoke('translate-interests', settings),
});
