# Aegis AI Hub - API & Technical Reference

**Last Updated:** 2026-05-18
**Version:** 5.2 (Production Ready)

本ドキュメントでは、Aegis AI Hub v5.2 が提供する Fastify REST API および Electron IPC (Inter-Process Communication) の仕様について記述します。

## 1. Fastify REST API (Backend Server)
v5.2 より、従来の MCP 構成に代わり Fastify ベースのスタンドアロンサーバーが導入されました。

### 1.1 基本情報
- **ベース URL**: `http://localhost:3005`
- **API プレフィックス**: `/api/v5`

### 1.2 エンドポイント
- **`GET /api/v5/interests`**: 現在の興味関心設定を取得。
- **`GET /api/v5/feeds`**: 購読中のフィード設定を取得。
- **`POST /api/v5/sync-settings`**: 興味関心およびフィード設定を同期・保存。
    - **バリデーション**: 新規フィードが含まれる場合、保存前に `RSSFetcher` による疎通確認が行われます。
- **`GET /api/dashboard`**: スコアリング済みの全記事を取得（ダッシュボード用）。
    - **フィルタリング**: 記事取得時に、90日以上前の記事は自動的に除外されます。
- **`POST /api/v5/suggest-category`**: 特定のカテゴリ名に基づき、AI によるブランド・キーワード提案を取得。
- **`POST /api/v5/orchestrate`**: エージェントによる自律探索/解析サイクルを手動実行。
- **`GET /api/v5/events`**: エージェントのステータス更新をリアルタイムで受信 (SSE: Server-Sent Events)。

---

## 2. Electron IPC Bridge (Main ↔ Renderer)
Electron アプリケーション内では、セキュアなコンテキスト・ブリッジを介して以下の機能が提供されます。

### 2.1 機能一覧
- `nexusApi.getArticles()`: 記事一覧の取得。鮮度フィルタリングが適用されます。
- `nexusApi.getSettings()`: 設定一式の取得。
- `nexusApi.syncSettings(payload)`: 設定の同期。内部で `RSSFetcher.validateFeed` を使用したバリデーションを実行します。
- `nexusApi.saveApiKey(key)`: Gemini API キーの永続化。
- `nexusApi.onAgentEvent(callback)`: エージェントイベントの購読。

---

## 3. データ永続化 (Persistence)
プロダクション環境と開発環境で保存先を自動的に切り替えます。

- **`credentials.json`**: Gemini API キー。
- **`interests.json`**: ユーザーの興味関心。2026年5月版の最新トレンド（12カテゴリ）を反映。
- **`feed_config.json`**: 購読中の RSS フィード。

### ディレクトリ構造 (Windows)
#### プロダクション環境
```
%APPDATA%/aegis-nexus/
└── data/
    ├── credentials.json
    ├── interests.json
    └── feed_config.json
```

#### 開発環境
```
[Workspace Root]/data/
    ├── credentials.json
    ├── interests.json
    └── feed_config.json
```

## 4. セキュリティ
- **Local-Only**: API キーはローカルにのみ保存され、外部サーバー（Google Gemini API を除く）に送信されることはありません。
- **Sandboxed IPC**: レンダラープロセスからは、ホワイトリスト化された IPC メソッドのみ呼び出し可能です。
