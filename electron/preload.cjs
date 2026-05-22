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
  triggerOrchestration: () => ipcRenderer.invoke('trigger-orchestration'),

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
  resetToDefaults: () => ipcRenderer.invoke('reset-to-defaults'),

  /**
   * テーマや言語設定などのUI表示に関する永続化設定を操作します。
   */
  getUiSettings: () => ipcRenderer.invoke('get-ui-settings'),
  saveUiSettings: (settings) => ipcRenderer.invoke('save-ui-settings', settings),

  /**
   * 最小化・最大化・閉じるなどのカスタムウィンドウ操作をメインプロセスに要求します。
   */
  windowControl: (action) => ipcRenderer.send('window-control', action)
});
