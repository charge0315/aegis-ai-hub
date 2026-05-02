# Backend Architecture Codemap

**Last Updated:** 2026-06-15
**Version:** v5.2 NEXUS
**Entry Point:** `server/src/index.ts` (Standalone) / `dashboard/electron/main.cjs` (App)

## 概要
バックエンドは、従来の MCP (Model Context Protocol) 構成から、**Fastify ベースのスタンドアロンサーバー**へと完全移行しました。これにより、Electron アプリからの利用だけでなく、ヘッドレス環境での動作や外部 API との連携が容易になりました。

## システム・アーキテクチャ

### 1. Fastify スタンドアロンサーバー
`server/` ディレクトリに配置されたコアロジックは、Fastify によってホストされます。
- **高性能**: 非同期 I/O に最適化された Fastify を採用。
- **軽量**: `@modelcontextprotocol/sdk` を排除し、依存関係を最小化。
- **API エンドポイント**: `/api/v5/` プレフィックス配下で、記事取得、設定同期、エージェント実行等の機能を提供。

### 2. Windows 11 Native Glass (Acrylic)
Electron メインプロセス (`dashboard/electron/main.cjs`) では、Windows 11 の **Acrylic** 効果を有効化しています：
- `backgroundMaterial: 'acrylic'`: ウィンドウ背面にシステムレベルの半透明効果を適用。
- `transparent: false`: **FancyZones (スナップ機能)** への対応のため、不透明ウィンドウとして設定しつつ、Acrylic 素材で透過を表現。
- `frame: false`: カスタムタイトルバーの実装により、モダンな外観を提供。

### 3. グローバル・ショートカット / ライフサイクル
- **システムトレイ (Tray)**: ウィンドウを閉じてもトレイに常駐。右クリックメニューまたは `Ctrl+Q` で終了。
- **自動起動 (Auto-launch)**: Windows 起動時に自動的にバックグラウンド (`--hidden`) で開始。

## データ・マイグレーションと初期化

### 1. SettingsManager (デフォルト・データ)
初回起動時に、AI、ゲーム、PCハードウェア等の専門的な知識ベースを自動生成します。
- **知識ベース**: 7 つの主要カテゴリ、数百の関連ブランド、キーワードを内蔵。
- **自動セットアップ**: `interests.json` および `feed_config.json` を自動展開。

### 2. API キーの永続化 (`credentials.json`)
ユーザー個別の Gemini API キーを `credentials.json` で管理し、`GeminiService` への動的な供給を可能にしています。

## コア・サービス構成

| サービス名 | 役割 | v5.2 における進化 |
| :--- | :--- | :--- |
| `Fastify Server` | API ホスティング | **MCP からの移行。スタンドアロン動作を実現。** |
| `SettingsManager` | 設定とデータの永続化 | アトミック保存と Zod によるバリデーション。 |
| `GeminiService` | AI 推論 | Gemini 3.1 Pro/Flash をフル活用。 |
| `NexusOrchestrator` | 全体制御 | 自律的なインテリジェンス・サイクルのスケジューリング。 |

## 配布とビルド (electron-builder)
- **アイコン管理**: `public/app-icon.png` を使用。
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に保存。
