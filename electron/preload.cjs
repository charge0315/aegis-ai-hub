const { contextBridge, ipcRenderer } = require('electron');

/**
 * Aegis Nexus IPC Bridge
 * フロントエンド（React）から安全にバックエンドサービスを呼び出すための露出インターフェース。
 */
contextBridge.exposeInMainWorld('nexusApi', {
  /**
   * 記事リストを取得します。
   * @param {Object} options - フィルタリング・ソートオプション
   */
  getArticles: (options) => ipcRenderer.invoke('get-articles', options),

  /**
   * 現在の設定（興味、フィード構成）を取得します。
   */
  getSettings: () => ipcRenderer.invoke('get-settings'),

  /**
   * 設定を保存・同期します。
   * @param {Object} settings - 同期する設定データ
   */
  syncSettings: (settings) => ipcRenderer.invoke('sync-settings', settings),

  /**
   * AIによる情報の収集・分析（オーケストレーション）を即時実行します。
   */
  triggerOrchestration: () => ipcRenderer.invoke('trigger-orchestration'),

  /**
   * エージェントからのリアルタイムイベントを受信します。
   */
  onAgentEvent: (callback) => ipcRenderer.on('agent-event', (event, data) => callback(data)),

  /**
   * エージェントからのリアルタイムイベントの受信を解除します。
   */
  removeAgentEventListener: () => ipcRenderer.removeAllListeners('agent-event'),

  /**
   * カテゴリー名に基づいた詳細設定（ブランド、キーワード、絵文字）を提案します。
   */
  suggestCategory: (categoryName) => ipcRenderer.invoke('suggest-category', categoryName),

  /**
   * AIによる新しいフィードや改善の提案を取得します。
   */
  getProposals: () => ipcRenderer.invoke('get-proposals'),

  /**
   * Gemini APIキーを取得します。
   */
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  /**
   * Gemini APIキーを保存します。
   */
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),

  /**
   * ウィンドウコントロール
   */
  windowControl: (action) => ipcRenderer.send('window-control', action)
});
