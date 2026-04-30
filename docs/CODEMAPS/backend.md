# Backend Architecture Codemap

**Last Updated:** 2026-05-20
**Version:** v5.1
**Entry Point:** `server/src/index.ts`

## 概要
バックエンドは、Fastify をベースとしたサービス指向アーキテクチャ (SOA) で構成され、AI サービス (Gemini 3.1) と RSS 処理層、そして MCP サーバー機能を統合しています。

## サービス構成

| サービス名 | 役割 | 主要メソッド |
| :--- | :--- | :--- |
| `ScraperFacade` | 全てのデータ取得と AI 推論を統括する司令塔。 | `getDashboard`, `getRecommendations` |
| `DiscoveryService` | AI による新しい RSS フィードの探索と検証。 | `getProposals` |
| `EnrichmentService` | 記事の深化（翻訳・要約・ブランド抽出）。 | `enrichArticle` |
| `GeminiService` | 構造化出力（JSON Schema）を用いた記事キュレーション、翻訳。 | `curate`, `translateArticles` |
| `SettingsManager` | 設定（interests, feeds）およびウィンドウ状態の永続化管理。 | `syncSettings`, `getWindowState`, `saveWindowState` |
| `NexusOrchestrator` | 自律ループの実行と SSE による進捗ブロードキャスト。 | `runAutonomousLoop`, `subscribe` |

## v5.1 における重要な変更

- **多言語対応と自動翻訳 (`EnrichmentService` / `GeminiService`)**:
  - `GeminiService.translateArticles` メソッドにより、海外の RSS ソースから取得した記事を日本語へ自動翻訳。
  - `[JP]` プレフィックスをタイトルに付与し、元の文脈を維持しつつアクセシビリティを向上。
- **堅牢なファイル IO と EBUSY 回避**:
  - Windows 上の Docker ボリュームマウント環境における `EBUSY` (ファイルロック) エラーを徹底的に排除。
  - ファイル書き込み時に最大 3 回のリトライロジック (200ms 間隔) を実装。
- **一括同期 API (`POST /api/v5/sync-settings`)**:
  - `interests.json` と `feed_config.json` をアトミックに同時更新。
- **ウィンドウ状態の永続化 (`/api/v5/window-state`)**:
  - ブラウザのサイズ・位置を `window_state.json` に保存し、再起動時に復元。

- **Live Synchronization**:
  - `docker-compose.yml` で `server/src` をコンテナにマウント。
  - サーバー側のソースコードを変更すると、再ビルドなしでコンテナ内のプロセスに反映されます（`ts-node-dev` 等との併用）。
- **詳細なエラーロギング**:
  - `NexusRouter.ts` の各エンドポイントにおいて、バリデーションエラーや実行時例外の詳細をサーバーコンソールに出力。

## Gemini 3.1 の活用
- **最新モデルの採用**:
  - `gemini-3.1-pro-preview`: 高度な推論と構造化出力が必要なタスクに使用。
  - `gemini-1.5-flash` / `flash-lite`: 速度とコスト効率が求められるスクレイピング解析に使用。
- **Structured Output**: `generationConfig.responseSchema` を活用し、プロンプトに頼らない正確な JSON 取得を実現。

## セキュリティ & 信頼性
- **CORS 構成**: フロントエンドからの安全なクロスオリジン通信を許可。
- **SPA Fallback**: ルート以外のパスへのアクセスを `index.html` へ転送し、React Router との整合性を確保。
- **エラーハンドリング**: 404 エラーの適切な処理と、AI 推論失敗時のフォールバック。
