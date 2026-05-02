# Backend Architecture Codemap

**Last Updated:** 2026-06-16
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

### 3. グローバル・ショートカット / ライフサイクル
- **システムトレイ (Tray)**: ウィンドウを閉じてもトレイに常駐。右クリックメニューまたは `Ctrl+Q` で終了。
- **自動起動 (Auto-launch)**: Windows 起動時に自動的にバックグラウンド (`--hidden`) で開始。

## データ・整合性と同期

### 1. SettingsManager (整合性確保)
- **カテゴリ統一**: `interests.json` と `feed_config.json` のカテゴリ名を完全に同期。
- **不具合修正**: `feed_urls` と `feedConfig` のプロパティ名不一致を解消し、実行時エラーを防止。

### 2. Dev-Sync システム
開発環境の JSON 設定ファイルを、アプリの実行環境（AppData）へ自動的に同期するプロセスを確立。開発中の設定変更が即座にアプリへ反映されます。

## コア・サービス構成

| サービス名 | 役割 | v5.2 における進化 |
| :--- | :--- | :--- |
| `Fastify Server` | API ホスティング | MCP からの移行。スタンドアロン動作を実現。 |
| `GeminiService` | AI 推論 | **AI Discovery の強化**。直接的なフィード URL (RSS/Atom) を取得するためのプロンプト最適化。 |
| `DiscoveryService` | 情報源探索 | カテゴリベースの高速な新規ソース特定。 |
| `SettingsManager` | 設定の永続化 | アトミック保存、バリデーション、および開発環境との同期。 |

## 配布とビルド (electron-builder)
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に保存。

