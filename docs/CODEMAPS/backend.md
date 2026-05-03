# Backend Architecture Codemap

**Last Updated:** 2026-05-18
**Version:** v5.2 NEXUS
**Entry Point:** `server/src/index.ts` (Standalone) / `dashboard/electron/main.cjs` (App)

## 概要
バックエンドは、従来の MCP (Model Context Protocol) 構成から、**Fastify ベースのスタンドアロンサーバー**へと完全移行しました。また、フィードの信頼性向上と開発体験の改善を目的とした高度なデータ管理機能を搭載しています。

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

### 3. RSS フィード・ライフサイクル管理
- **RSSFetcher.validateFeed**: フィードの有効性をパースレベルで検証する機能。
- **自動故障検知と代替昇格**: 連続失敗したフィードを検知し、プール内の有効なフィードへと自動的に差し替える仕組みを `FeedManager` に実装。昇格前には必ずヘルスチェックが行われます。
- **バリデーション・ガードレール**: `addFeed` および `syncSettings` 時の強制バリデーションにより、無効なフィードの登録を阻止。

## データ・整合性と同期

### 1. SettingsManager (整合性確保)
- **カテゴリ統一**: `interests.json` と `feed_config.json` のカテゴリ名を完全に同期。
- **適応型データパス解決**: `!app.isPackaged` を判定基準とし、開発時はワークスペース内の `data/` を、配布後は `%APPDATA%` を参照するよう自動分岐。

### 2. 記事の鮮度管理
- **Freshness Filter**: `main.cjs` 内の取得ロジックに、90日以上前の記事を除外するフィルタリングを追加。ダッシュボードの情報の鮮度を高く保ちます。

## コア・サービス構成

| サービス名 | 役割 | v5.2 における進化 |
| :--- | :--- | :--- |
| `Fastify Server` | API ホスティング | MCP からの移行。スタンドアロン動作を実現。 |
| `RSSFetcher` | フィード取得 | **疎通確認 (validateFeed)** 機能の追加。 |
| `FeedManager` | フィード構成管理 | **自動ヘルスチェック付きフィード昇格**の実装。 |
| `GeminiService` | AI 推論 | 直接的なフィード URL (RSS/Atom) を取得するためのプロンプト最適化。 |
| `SettingsManager` | 設定の永続化 | アトミック保存、バリデーション、および**環境適応型パス解決**。 |

## 配布とビルド (electron-builder)
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に保存。

