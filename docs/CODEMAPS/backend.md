# Backend Architecture Codemap

**Last Updated:** 2026-04-22
**Entry Point:** `server/index.js`

## 概要
バックエンドは、関心の分離 (Separation of Concerns) を徹底したサービス指向アーキテクチャ (SOA) を採用。AIによる自律的な進化（フィード発見・興味学習）と、Gemini 3.1 を中枢としたインテリジェンス層を統合しています。

## サービス構成

| サービス名 | 役割 | 主要メソッド | 依存関係 |
| :--- | :--- | :--- | :--- |
| `ScraperFacade` | 取得・判定・整形・AI推論を統括する司令塔 | `getDashboard`, `getRecommendations` | 全てのサービス |
| `GeminiService` | キュレーション、サイト発見、構造再構築の提案 | `curate`, `discoverSites`, `getRestructureProposal` | Gemini 3.1 API |
| `DiscoveryService` | AIによる新サイトの探索とRSS疎通検証 | `run`, `getProposals` | `GeminiService`, `RSSFetcher` |
| `EvolutionJob` | 自律進化ジョブ（設定クリーンアップ、新興味の学習） | `run`, `updateLearnedKeywords` | `DiscoveryService`, `ScraperFacade` |
| `RSSFetcher` | 非同期・並列でのRSS取得 | `fetchAll` | `rss-parser` |
| `ScoringService` | スコア計算・カテゴリ判定・ブランド抽出 | `calculateScore`, `detectCategory`, `extractBrand` | `interests.json` |
| `FeedManager` | フィードURLの管理、故障時の自動切り替え | `addFeed`, `reportFailure`, `getAllActiveFeeds` | `feed_config.json` |
| `HealthMonitor` | 定期的なフィード死活監視ジョブ | `start`, `checkAll` | `FeedManager` |

## 自律進化 & AIナレッジ再構築

バックエンドは単なるデータ取得に留まらず、以下の「自律進化」機能を備えています：

- **AIサイト発見 (`DiscoveryService`)**:
  - `Gemini 3.1` に現在の興味（ブランド、キーワード）を提示し、最適な RSS フィードを提案させます。
  - 提案された URL は `RSSFetcher` で即座に検証され、有効なものだけが `feed_config.json` に自動追加されます。

- **自律進化サイクル (`EvolutionJob`)**:
  - 定期的に実行され、最新記事のトレンドから「学習済みキーワード (`learned_keywords`)」を抽出。
  - 重複や古い設定をクリーニングし、システムを常に最新のガジェット動向に最適化します。

- **ナレッジ再構築 (`GeminiService.getRestructureProposal`)**:
  - `interests.json` の構造自体を AI が見直し、より効率的なカテゴリ分類や不足ブランドの補完を提案。
  - ユーザーはフロントエンドからこの提案を確認し、ワンクリックでナレッジグラフを刷新できます。

## Gemini 3.1 統合 & フォールバック
- **モデル優先順位**: `gemini-3.1-pro` -> `gemini-3.1-pro-preview` -> `gemini-3.1-flash` -> `gemini-2.0-flash` -> ...
- **多層リカバリ**:
  - API エラーやクォータ制限が発生した場合、即座に下位モデルへフォールバック。
  - レスポンスのJSONパースに失敗した場合、正規表現による抽出を試行し、AIのゆらぎを許容。

## セキュリティ実装
- **レート制限**: `express-rate-limit` により、過剰なアクセスやAPI呼び出しをブロック。
- **Zod バリデーション**: `Article.js` におけるスキーマ検証により、不正な形式のデータ流入を遮断。
