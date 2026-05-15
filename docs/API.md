# Aegis AI Hub - API & Technical Reference

**Last Updated:** 2026-05-21
**Version:** 5.3.0 NEXUS (Production Ready)

本ドキュメントでは、Aegis AI Hub v5.3.0 が提供する Fastify REST API および Electron IPC (Inter-Process Communication) の仕様について記述します。

## 1. Fastify REST API (Internal Server)
v5.3.0 より、バックエンドロジックは Electron 内蔵の Fastify サーバーに完全に統合されました。

### 1.1 基本情報
- **ホスト**: Electron メインプロセス内で起動
- **ベース URL**: `http://localhost:3005`
- **API プレフィックス**: `/api/v5`

### 1.2 エンドポイント
- **`GET /api/v5/interests`**: 現在の興味関心設定を取得。
- **`GET /api/v5/feeds`**: 購読中のフィード設定を取得。
- **`GET /api/v5/ui-settings`**: UI の表示設定（言語、テーマ、ビューモード等）を取得。
- **`POST /api/v5/save-ui-settings`**: UI 設定を永続化。
- **`GET /api/v5/usage-stats`**: **(New in v5.5.0)** Gemini API の利用統計を取得。
- **`POST /api/v5/sync-settings`**: 興味関心およびフィード設定を同期・保存。
    - **バリデーション**: Zod スキーマによる検証と、新規フィードに対する `RSSFetcher` による疎通確認を強制。
- **`GET /api/dashboard`**: スコアリング済みの全記事を取得（ダッシュボード用）。
    - **フィルタリング**: 記事取得時に、90日以上前の記事は自動的に除外されます。
    - **画像エンリッチメント**: 上位記事に対して自動スクレイピングとキャッシュによる画像補完を実行。
- **`POST /api/v5/discover-trends`**: **(New in v5.3.0)** 最新の記事群から Gemini 3.1 Pro を用いて潜在的なトレンドを抽出。
    - **レスポンス**: `Confidence`, `Context`, `Type` を含むトレンドリスト。
- **`POST /api/v5/suggest-category`**: 特定のカテゴリ名に基づき、AI によるブランド・キーワード提案を取得。
- **`GET /api/v5/proposals`**: 情報源を分析し、新しいサイトやキーワードの進化提案を取得。
- **`POST /api/v5/orchestrate`**: エージェントによる自律探索/解析サイクルを手動実行。
- **`GET /api/v5/events`**: エージェントのステータス更新をリアルタイムで受信 (SSE)。

---

## 2. Electron IPC Bridge (Main ↔ Renderer)
Electron アプリケーション内では、セキュアなコンテキスト・ブリッジを介して以下の機能が提供されます。

### 2.1 機能一覧
- `nexusApi.getArticles()`: 記事一覧の取得。鮮度フィルタリングが適用されます。
- `nexusApi.getSettings()`: 設定一式の取得。
- `nexusApi.getUiSettings()`: UI 設定の取得。
- `nexusApi.saveUiSettings(settings)`: UI 設定の保存。
- `nexusApi.getUsageStats()`: 利用統計（トークン数・コール数）の取得。
- `nexusApi.syncSettings(payload)`: 設定の同期。内部で `RSSFetcher.validateFeed` を使用したバリデーションを実行します。
- `nexusApi.saveApiKey(key)`: Gemini API キーの永続化。
- `nexusApi.onAgentEvent(callback)`: エージェントイベントの購読。

---

## 3. データ永続化 (Persistence)
プロダクション環境と開発環境で保存先を自動的に切り替えます。

- **`credentials.json`**: Gemini API キー。（Electron アプリケーション上では `safeStorage` によって OS レベルで暗号化されて保存されます）
- **`interests.json`**: ユーザーの興味関心。2026年5月版の最新トレンド（12カテゴリ）を反映。
- **`feed_config.json`**: 購読中の RSS フィード。
- **`ui_settings.json`**: 表示設定、テーマ、初期化フラグ。
- **`usage_stats.json`**: **(New in v5.5.0)** 日次・モデル別のトークン消費量。

### 3.1 データ構造例

#### Usage Statistics (`usage_stats.json`)
`UsageStatsSchema` に準拠した JSON 形式で保存されます。
```json
{
  "2026-05-21": {
    "gemini-3.1-pro": {
      "promptTokens": 1250,
      "candidatesTokens": 450,
      "totalTokens": 1700,
      "callCount": 5
    },
    "gemini-3.1-flash": {
      "promptTokens": 3000,
      "candidatesTokens": 1200,
      "totalTokens": 4200,
      "callCount": 12
    }
  }
}
```

### ディレクトリ構造 (Windows)
#### プロダクション環境
```
%APPDATA%/aegis-nexus/
└── data/
    ├── credentials.json
    ├── interests.json
    ├── feed_config.json
    ├── ui_settings.json
    └── usage_stats.json
```

#### 開発環境
```
[Workspace Root]/data/
    ├── credentials.json
    ├── interests.json
    ├── feed_config.json
    ├── ui_settings.json
    └── usage_stats.json
```


## 4. セキュリティ
- **Local-Only**: API キーはローカルにのみ保存され、外部サーバー（Google Gemini API を除く）に送信されることはありません。
- **Sandboxed IPC**: レンダラープロセスからは、ホワイトリスト化された IPC メソッドのみ呼び出し可能です。
