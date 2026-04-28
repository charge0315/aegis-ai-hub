# Backend Architecture Codemap

**Last Updated:** 2026-04-28
**Version:** v5.0
**Entry Point:** `server/src/index.ts`

## 概要
バックエンドは、Fastify をベースとしたサービス指向アーキテクチャ (SOA) で構成され、AI サービス (Gemini 3.1) と RSS 処理層、そして MCP サーバー機能を統合しています。

## サービス構成

| サービス名 | 役割 | 主要メソッド |
| :--- | :--- | :--- |
| `ScraperFacade` | 全てのデータ取得と AI 推論を統括する司令塔。 | `getDashboard`, `getRecommendations` |
| `DiscoveryService` | AI による新しい RSS フィードの探索と検証。 | `getProposals` |
| `GeminiService` | 構造化出力（JSON Schema）を用いた記事キュレーション。 | `generateStructured`, `curate` |
| `SettingsManager` | 設定（interests, feeds）およびウィンドウ状態の永続化管理。 | `syncSettings`, `getWindowState`, `saveWindowState` |
| `NexusOrchestrator` | 自律ループの実行と SSE による進捗ブロードキャスト。 | `runAutonomousLoop`, `subscribe` |

## v5.0 における重要な変更

- **一括同期 API (`POST /api/v5/sync-settings`)**:
  - `interests.json` と `feed_config.json` をアトミックに同時更新。
- **ウィンドウ状態の永続化 (`/api/v5/window-state`)**:
  - `GET`: `startup.ps1` が起動時にブラウザのサイズ・位置を決定するために使用。
  - `POST`: フロントエンドがサイズ変更や移動を検知した際に呼び出し。
  - `window_state.json` ファイルにデータを保存。
- **SSE (Server-Sent Events) の安定化**:
  - 自律ループの進捗をリアルタイム配信。
  - 30秒ごとの **ハートビート (`: heartbeat`)** により、タイムアウトによる切断を防止。
- **静的ファイル配信の最適化**:
  - `dashboard/dist` フォルダからの配信に完全移行。
  - MIME タイプ（特に JavaScript モジュール）の問題を `fastify-static` の構成により解決。

## Gemini 3.1 の活用
- **最新モデルの採用**:
  - `gemini-3.1-pro-preview`: 高度な推論と構造化出力が必要なタスクに使用。
  - `gemini-1.5-flash` / `flash-lite`: 速度とコスト効率が求められるスクレイピング解析に使用。
- **Structured Output**: `generationConfig.responseSchema` を活用し、プロンプトに頼らない正確な JSON 取得を実現。

## セキュリティ & 信頼性
- **CORS 構成**: フロントエンドからの安全なクロスオリジン通信を許可。
- **SPA Fallback**: ルート以外のパスへのアクセスを `index.html` へ転送し、React Router との整合性を確保。
- **エラーハンドリング**: 404 エラーの適切な処理と、AI 推論失敗時のフォールバック。
