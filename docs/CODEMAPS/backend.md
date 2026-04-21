# Backend Architecture Codemap

**Last Updated:** 2026-04-21
**Entry Point:** `server/index.js`

## 概要
バックエンドは、関心の分離 (Separation of Concerns) を徹底したサービス指向アーキテクチャ (SOA) を採用。AIフォールバックとセキュリティパッチを組み込み、究極の安定性を実現しています。

## サービス構成

| サービス名 | 役割 | 主要メソッド | 依存関係 |
| :--- | :--- | :--- | :--- |
| `ScraperFacade` | 取得・判定・整形・AI推論を統括する司令塔 | `getDashboard`, `getRecommendations` | 全てのサービス |
| `GeminiService` | Gemini API を使用した記事キュレーション | `curate` | Gemini 3.1 API |
| `RSSFetcher` | 非同期・並列でのRSS取得 | `fetchAll` | `rss-parser` |
| `ScoringService` | スコア計算・カテゴリ判定・ブランド抽出 | `calculateScore`, `detectCategory`, `extractBrand` | `interests.json` |
| `FeedManager` | フィードURLの管理、故障時の自動切り替え | `reportFailure`, `getAllActiveFeeds` | `feed_config.json` |
| `EnrichmentService` | 記事画像の抽出と補完 | `enrich`, `extractBasicImage` | `cheerio`, `axios` |
| `HealthMonitor` | 定期的なフィード死活監視ジョブ | `start`, `checkAll` | `FeedManager` |

## 芸術的データ処理フロー (Internal Methods)

`ScraperFacade` 内では、データの純度を高めるために以下のプライベートメソッドが活躍します：

- `_fetchAndProcessArticles(interests)`:
  - 各フィードから並列取得した生データを `Article` モデルへ正規化。
  - 1ヶ月以内の最新記事のみを抽出し、ノイズ（古い情報）を排除。
  - `ScoringService` を用いた動的な重み付け。

- `_sortAndSlice(articles, count)`:
  - 「AIスコア」と「鮮度（日付）」の2軸でソート。
  - Gemini への入力やエンリッチメント対象を上位数件に絞り込み、パフォーマンスを最大化。

## 堅牢なデータモデル (`Article.js`)
- **Zod によるバリデーション**: 全ての記事データは `ArticleSchema` を通過し、型安全性とデフォルト値が保証されます。
- **カプセル化されたサニタイズ**:
  - `_sanitizeDescription`: 記事の概要から HTML タグを正規表現で完全に除去。
  - 150文字制限を設けることで、フロントエンドでのレイアウト崩れを未然に防止。

## Gemini 3.1 統合 & フォールバック
- **モデル優先順位**: `gemini-3.1-pro-preview` -> `gemini-3.1-flash-preview` -> `gemini-2.0-flash` -> ...
- **多層リカバリ**:
  - API エラーやクォータ制限が発生した場合、即座に下位モデルへフォールバック。
  - レスポンスのJSONパースに失敗した場合、正規表現による抽出を試行し、AIのゆらぎを許容。

## セキュリティ実装
- **レート制限**: `express-rate-limit` により、15分間に100リクエスト以上の過剰アクセスをブロック。
- **CORS保護**: 信頼されたローカルドメインのみを許可し、CSRFのリスクを低減。
- **環境変数の厳格管理**: `dotenv` を使用し、APIキー等の機密情報をコードから分離。
