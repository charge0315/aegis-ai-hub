# Backend Architecture Codemap

**Last Updated:** 2026-05-20
**Version:** v5.2 NEXUS
**Entry Point:** `electron/main.cjs` (App/Main Process)

## 概要
バックエンドは、従来の独立した `server/` 構成を廃止し、**`src` 配下へ完全に統合**されました。これにより、Electron アプリケーション内で Fastify サーバーが内蔵される形式となり、単一のプロジェクト管理が可能になりました。

## システム・アーキテクチャ

### 1. 統合された Fastify サーバー
全てのビジネスロジックは `src` に集約され、Fastify によってホストされます。
- **内蔵型**: Electron メインプロセス (`main.cjs`) によってライフサイクルが管理されます。
- **高性能**: 非同期 I/O に最適化された Fastify を採用。
- **API エンドポイント**: `/api/v5/` プレフィックス配下で、記事取得、設定同期、エージェント実行等の機能を提供。
- **単一リポジトリ**: 全ての依存関係が `package.json` で管理されます。

### 2. Windows 11 Native Glass (Acrylic)
Electron メインプロセス (`electron/main.cjs`) では、Windows 11 の **Acrylic** 効果を有効化しています：
- `backgroundMaterial: 'acrylic'`: ウィンドウ背面にシステムレベルの半透明効果を適用。
- `transparent: false`: **FancyZones (スナップ機能)** への対応のため、不透明ウィンドウとして設定しつつ、Acrylic 素材で透過を表現。

### 3. RSS フィード・ライフサイクル管理
- **RSSFetcher.validateFeed**: フィードの有効性をパースレベルで検証する機能。
- **自動故障検知と代替昇格**: 連続失敗したフィードを検知し、プール内の有効なフィードへと自動的に差し替える仕組みを `FeedManager` に実装。昇格前には必ずヘルスチェックが行われます。
- **バリデーション・ガードレール**: `addFeed` および `syncSettings` 時の強制バリデーションにより、無効なフィードの登録を阻止。

## 画像取得・エンリッチメント・パイプライン
ダッシュボードの視覚的品質を高めるため、以下の多層的な画像取得戦略を導入しました。

### 1. 段階的な画像抽出
`EnrichmentService` が以下の順序で画像を特定します：
1. **RSS メタデータ**: フィード内の `media:content` や `enclosure` タグから抽出。
2. **ローカルキャッシュ**: `ImageCacheManager` を参照。
3. **動的スクレイピング**: 記事のリンク先を `axios` で取得し、`cheerio` を用いて OGP タグや本文内のヒューリスティクスから最適な画像を抽出。
4. **カテゴリ別プレースホルダー**: 上記すべてに失敗した場合、Unsplash の高品質なデフォルト画像を適用。

### 2. 並列制御とキャッシュ
- **p-limit による負荷制限**: 同時スクレイピング数を制限（デフォルト: 5）し、相手サーバーへの負荷を抑制。
- **ImageCacheManager**: `image_cache.json` に記事URLと画像URLのペアを永続化。TTL（7日間）管理により、再起動後も高速な表示を可能にします。

## データ・整合性と同期

### 1. SettingsManager (整合性確保)
- **カテゴリ統一**: `interests.json` と `feed_config.json` のカテゴリ名を完全に同期。
- **適応型データパス解決**: `!app.isPackaged` を判定基準とし、開発時はワークスペース内の `data/` を、配布後は `%APPDATA%` を参照するよう自動分岐。

### 2. 記事の鮮度管理
- **Freshness Filter**: `main.cjs` 内の取得ロジックに、90日以上前の記事を除外するフィルタリングを追加。ダッシュボードの情報の鮮度を高く保ちます。

## コア・サービス構成

| サービス名 | 役割 | v5.2 における進化 |
| :--- | :--- | :--- |
| `Fastify Server` | API ホスティング | Electron 内蔵型への統合。単一プロジェクトとして動作。 |
| `RSSFetcher` | フィード取得 | **疎通確認 (validateFeed)** 機能の追加。 |
| `FeedManager` | フィード構成管理 | **自動ヘルスチェック付きフィード昇格**の実装。 |
| `GeminiService` | AI 推論 | 直接的なフィード URL (RSS/Atom) を取得するためのプロンプト最適化。 |
| `DiscoveryService` | ソース探索 | AI による新規サイト発見と、進化提案 (Proposals) の生成。 |
| `EnrichmentService` | 記事加工 | 並列スクレイピングによる画像補完と自動翻訳。 |
| `ImageCacheManager` | 画像キャッシュ | スクレイピング済み画像URLの永続化とTTL管理。 |
| `SettingsManager` | 設定の永続化 | アトミック保存、バリデーション、および**環境適応型パス解決**。 |

## 配布とビルド (electron-builder)
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に保存。

