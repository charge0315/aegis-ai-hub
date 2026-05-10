# Backend Architecture Codemap

**Last Updated:** 2026-05-20
**Version:** v5.3.0 NEXUS
**Entry Point:** `electron/main.cjs` (App/Main Process)

## 概要
バックエンドは、従来の独立した `server/` 構成を廃止し、**`src` 配下へ完全に統合**されました。これにより、Electron アプリケーション内で Fastify サーバーが内蔵される形式となり、単一のプロジェクト管理が可能になりました。
v5.3.0 では、AI 再構築におけるデータの不整合を解消するための堅牢化ロジック、および **Gemini 3.1 Pro を活用した高度なトレンド分析エンジン**が導入されました。

## システム・アーキテクチャ

### 1. 統合された Fastify サーバー
全てのビジネスロジックは `src` に集約され、Fastify によってホストされます。
- **内蔵型**: Electron メインプロセス (`main.cjs`) によってライフサイクルが管理されます。
- **高性能**: 非同期 I/O に最適化された Fastify を採用。
- **API エンドポイント**: 
    - `/api/v5/`: 記事取得、設定同期、エージェント実行等の機能。
    - **`/api/v5/discover-trends`**: 最新の記事群から Gemini 3.1 Pro を用いて潜在的なトレンド、コンテキスト、信頼度を抽出する新エンドポイント。
- **単一リポジトリ**: 全ての依存関係が `package.json` で管理されます。

### 2. AI 再構築の整合性戦略 (Consistency Strategy)
`GeminiService.getRestructureProposal` において、AI の不確実性を吸収する以下のロジックが実装されています：
- **normalizeCategoryName**: カテゴリ名の比較時に、`＆`, `&`, `・`, 空白, 大文字小文字を無視する。これにより、AI が微妙に異なる名前でカテゴリを返しても、既存のフィード設定と正しく紐付けられます。
- **データ完全保持リカバリー**: AI が既存のブランドやキーワードをリストから漏らした場合、実行前のデータを元に自動復元します。
- **並列検証 (`Promise.all`)**: 発見された各フィードの到達可能性を並列で検証し、タイムアウトを回避します。
- **Google News フォールバック**: 適切なソースがないカテゴリに対し、最適化されたクエリの Google News RSS を自動設定します。

### 3. 能動的インテリジェンス探索 (Active Intelligence Discovery)
`ScraperFacade.discoverTrends` メソッドを中心に、従来の受動的な学習から能動的な探索へと進化しました：
- **Gemini 3.1 Pro 活用**: 高度な推論能力を持つ Pro モデルを使用し、単なるキーワード抽出を超えた「文脈（Context）」の理解を実現。
- **拡張データ構造**: 抽出されるトレンドデータには、以下のメタデータが含まれます：
    - `type`: トレンドの種類（技術、市場、製品、人物等）。
    - `confidence`: AI による確信度（0.0 - 1.0）。
    - `context`: なぜそのトレンドが重要なのか、既存の興味とどう関連するかの説明。
- **検証パイプライン**: 抽出されたトレンドは即座に既存の `learned_keywords` と照合され、重複排除と優先順位付けが行われます。

### 4. Windows 11 Native Glass (Acrylic)
Electron メインプロセス (`electron/main.cjs`) では、Windows 11 の **Acrylic** 効果を有効化しています：
- `backgroundMaterial: 'acrylic'`: ウィンドウ背面にシステムレベルの半透明効果を適用。
- `transparent: false`: **FancyZones (スナップ機能)** への対応のため、不透明ウィンドウとして設定しつつ、Acrylic 素材で透過を表現。

### 4. RSS フィード・ライフサイクル管理
- **RSSFetcher.validateFeed**: フィードの有効性をパースレベルで検証する機能。
- **自動故障検知と代替昇格**: 連続失敗したフィードを検知し、プール内の有効なフィードへと自動的に差し替える仕組みを `FeedManager` に実装。昇格前には必ずヘルスチェックが行われます。
- **バリデーション・ガードレール**: `addFeed` および `syncSettings` 時の強制バリデーションにより、無効なフィードの登録を阻止。

### 5. 多言語判定ロジック (Multilingual Detection)
`ScraperFacade._detectLanguage` において、以下のロジックに基づき記事の言語を分類：
- **判定手法**: 正規表現 `/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/` を使用。
- **対象**: 記事のタイトルとスニペット（要約）。
- **分類**: 日本語の文字（ひらがな、カタカナ、漢字）が 1 文字でも含まれていれば `ja`、それ以外を `en` と判定。これにより、複雑な NLP ライブラリに依存せず、軽量かつ高速な判定を達成。

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

### 1. Shared SettingsManager (単一の真実)
- **Fastify & Electron 統合**: Electron メインプロセスが管理する Fastify サーバーと、メインプロセスのバックグラウンドジョブが、同一の `SettingsManager` シングルトンを共有。
- **アトミック保存**: 設定変更は `settings.json` へアトミックに書き込まれ、全コンポーネントが常に最新の状態を即座に参照可能。
- **環境適応型パス解決**: `!app.isPackaged` を判定基準とし、開発時はワークスペース内の `data/` を、配布後は `%APPDATA%` を参照するよう自動分岐。

### 2. API Key 即時同期戦略
- **Zero-Latency Update**: APIキーが更新されると、`GeminiService` の全インスタンスが即座にリフレッシュ。IPC ハンドラー（`suggest-category` 等）の実行直前に `getApiKey()` を呼び出すことで、再起動なしの即時利用を保証。

## コア・サービス構成

| サービス名 | 役割 | v5.3.0 における進化 |
| :--- | :--- | :--- |
| `ScraperFacade` | ワークフロー統合 | **`discoverTrends` (Gemini 3.1 Pro)** による能動的インテリジェンス探索の実装。 |
| `Fastify Server` | API ホスティング | Electron 内蔵型への統合。新エンドポイント `/api/v5/discover-trends` の追加。 |
| `RSSFetcher` | フィード取得 | **疎通確認 (validateFeed)** 機能の追加。 |
| `FeedManager` | フィード構成管理 | **自動ヘルスチェック付きフィード昇格**の実装。 |
| `GeminiService` | AI 推論 | **Gemini 3.1 Pro/Flash 対応**。高度なトレンド分析、並列検証、Google News フォールバックを実装。 |
| `ArchivistAgent` | 自律学習 | 収集記事からトレンドを抽出し、拡張メタデータ（Confidence, Context）を付与して蓄積。 |
| `DiscoveryService` | ソース探索 | **`Promise.all` による全カテゴリーの並列フィード検証**を導入し、探索のタイムアウトを防止。 |
| `EnrichmentService` | 記事加工 | 並列スクレイピングによる画像補完。 |
| `SettingsManager` | 設定の永続化 | **Fastify と Electron 間の共有シングルトン**として、整合性を担保。 |

## 配布とビルド (electron-builder)
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に保存。
