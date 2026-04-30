# Aegis AI Hub - API & MCP Technical Reference

**Last Updated:** 2026-05-20
**Version:** 5.1 (Nexus Evolution)

本ドキュメントでは、Aegis AI Hub v5.1 が提供する HTTP API および MCP (Model Context Protocol) ツールの仕様について記述します。

## 1. HTTP API サーバー
デフォルトポート: `3005`

### 1.1 コンテンツ取得 API
#### `GET /api/dashboard`
最新のパーソナライズ済みニュース記事を取得します。
- **制限**: レート制限あり (15分100リクエスト)
- **出力**: カテゴリ別に分類された記事オブジェクト（多言語対応：英語記事は自動的に日本語へ翻訳されます）

#### `GET /api/recommend`
Gemini AI によって厳選された、重要度の高い 10 記事を取得します。各記事には `geminiReason` フィールドが含まれます。

---

### 1.2 システム設定・同期 API (v5.1 更新)
v5.1 では、設定の変更を一括で同期する方式に加え、ウィンドウ状態の永続化をサポートしています。

#### `GET /api/interests`
現在の興味・カテゴリ・ブランド・キーワードの設定を取得します。

#### `GET /api/feeds`
現在の RSS フィード構成を取得します。

#### `POST /api/sync-settings`
フロントエンドで編集された「下書き」をサーバー上の設定ファイルへ一括同期します。
- **入力 (JSON)**:
  ```json
  {
    "interests": { "categories": { ... }, "learned_keywords": { ... } },
    "feeds": { "CategoryName": { "active": [], "pool": [] } },
    "windowState": { "width": 1200, "height": 800, "x": 100, "y": 100 }
  }
  ```
- **効果**: `interests.json`、`feed_config.json`、および `window_state.json` を更新します。

#### `GET /api/window-state` (v5.0+)
保存されている最新のウィンドウ座標とサイズを取得します。起動スクリプト (`startup.ps1`) でブラウザの初期配置に使用されます。

---

### 1.3 AI 進化・提案 API
#### `GET /api/evolution-proposals`
AI による新しい RSS フィード、ブランド、キーワードの提案を取得します。UI 側はこの結果を「下書き」に取り込みます。

#### `GET /api/restructure-proposals`
`interests.json` の構造を Gemini が完全に再設計した「ナレッジ再構築案」を取得します。

---

## 2. MCP (Model Context Protocol) ツール
外部 AI エージェントから Aegis AI Hub を操作するためのインターフェース。

| ツール名 | 説明 |
| :--- | :--- |
| `get_aegis_dashboard` | 最新のパーソナライズ記事を JSON で取得 |
| `get_gemini_picks` | AI 推薦の 10 記事と理由を取得 |

---

## 3. ディレクトリ構造とデータ
- `server/data/interests.json`: ユーザーの興味関心を定義。
- `server/data/feed_config.json`: AI が管理する RSS フィード群。
- `dashboard/js/api.js`: これらの API と通信するフロントエンドモジュール。

## 4. セキュリティ
- 全ての API は `express-rate-limit` で保護されています。
- 静的ファイルと API は同一ポート上で配信され、SPA (Single Page Application) ルーティングに対応しています。
