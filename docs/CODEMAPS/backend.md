# Backend Architecture Codemap

**Last Updated:** 2026-04-26
**Version:** v5.0
**Entry Point:** `server/index.js`

## 概要
バックエンドは、サービス指向アーキテクチャ (SOA) をベースに、AI サービス (Gemini 3.1) と RSS 処理層を分離して構成されています。v5.0 では、設定の整合性を保つための「一括同期 API」を中枢に据えています。

## サービス構成

| サービス名 | 役割 | 主要メソッド |
| :--- | :--- | :--- |
| `ScraperFacade` | 全てのデータ取得と AI 推論を統括する司令塔。 | `getDashboard`, `getRecommendations` |
| `DiscoveryService` | AI による新しい RSS フィードの探索と検証。 | `getProposals` |
| `GeminiService` | 記事のキュレーション、サイト発見、構造再構築の提案。 | `curate`, `getRestructureProposal` |
| `FeedManager` | `feed_config.json` の管理。動的な設定更新に対応。 | `saveConfig`, `addFeed` |
| `EvolutionJob` | 最新トレンドからの継続的な興味学習（バックグラウンド）。 | `run` |

## v5.0 における重要な変更：設定同期ロジック
これまでの個別更新方式から、整合性を重視した **「一括同期方式」** へと移行しました。

- **`POST /api/sync-settings`**:
  - `interests.json` と `feed_config.json` を同時に書き換えます。
  - フロントエンドから送られてくる完全な設定状態を受け取り、アトミックに保存します。
  - 保存後、`ScraperFacade` 内の `FeedManager` インスタンスも即座に最新状態へ更新されます。

## AI 進化 & 再構築の提供フロー
バックエンドは AI による提案を生成しますが、**自動的には適用しません**（EvolutionJob を除く）。

1. **提案生成**: `DiscoveryService` や `GeminiService` が現在の設定に基づき新案を作成。
2. **API 提供**: `GET /api/evolution-proposals` 等を通じてフロントエンドへ送信。
3. **人間による確認**: フロントエンドの「下書き」エディタ上でユーザーが調整。
4. **一括同期**: ユーザーが保存を選択した時のみ、システム設定が更新される。

## Gemini 3.1 の活用
- **最新モデルの採用**: 2026年4月時点の最新モデル（Gemini 3.1 シリーズ）に最適化されたプロンプト設計。
- **インテリジェント・フォールバック**: クォータ制限やエラー時に、複数のモデルランク（Pro / Flash）を自動的に切り替えて処理を継続。

## セキュリティ & 信頼性
- **レート制限**: `express-rate-limit` により、API エンドポイントへの過剰アクセスを防御。
- **エラーハンドリング**: パースエラーやネットワークエラーに対する多層的な Try-Catch 構造。
