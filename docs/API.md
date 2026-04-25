# Aegis AI Hub - API & MCP Technical Reference

**Last Updated:** 2026-04-25

本ドキュメントでは、Aegis AI Hub が提供する HTTP API および MCP (Model Context Protocol) ツールのインターフェース仕様について記述します。

## 1. HTTP API サーバー
デフォルトポート: `3005` (Docker 経由で公開)

### 1.1 ダッシュボード関連
#### `GET /api/dashboard`
最新のパーソナライズ済みニュース記事を取得します。
- **出力 (JSON)**:
  ```json
  {
    "カテゴリ名": {
      "emoji": "🤖",
      "articles": [
        {
          "title": "記事タイトル",
          "link": "URL",
          "desc": "概要文",
          "brand": "判定されたブランド",
          "score": 8,
          "category": "カテゴリ名",
          "date": "2026-04-25T...",
          "img": "画像URL"
        }
      ]
    }
  }
  ```

#### `GET /api/recommend`
Gemini AI によって厳選された、ユーザーの興味に最も合致する10記事を取得します。
- **出力 (JSON)**: `Array<Article>` (各記事に `geminiReason` フィールドが付与されます)

---

### 1.2 AI 進化・再構築関連
#### `GET /api/evolution-proposals`
AI による新しい RSS フィード、ブランド、キーワードの提案を取得します。
- **出力 (JSON)**:
  ```json
  {
    "sites": [{ "name": "サイト名", "url": "RSS URL", "category": "カテゴリ名", "reason": "理由" }],
    "brands": [{ "value": "ブランド名", "category": "カテゴリ名", "reason": "理由" }],
    "keywords": [{ "value": "キーワード名", "category": "カテゴリ名", "reason": "理由" }],
    "failedSites": [],
    "modelName": "使用モデル名"
  }
  ```

#### `POST /api/apply-evolution`
選択した進化提案をシステムに適用（保存）します。
- **入力 (JSON)**: 上記 `evolution-proposals` と同形式のオブジェクト

#### `GET /api/restructure-proposals`
`interests.json` の構造自体を Gemini が再設計した「ナレッジ再構築案」を取得します。
- **出力 (JSON)**: `categories` オブジェクトと `modelName`

#### `POST /api/apply-restructure`
再構築案を適用し、`interests.json` を完全に書き換えます。
- **入力 (JSON)**: `{ "categories": { ... } }`

---

### 1.3 手動更新
#### `POST /api/update-interests`
特定の興味（カテゴリ、ブランド、キーワード）を個別に追加します。
- **入力 (JSON)**:
  ```json
  {
    "type": "category | keyword | brand",
    "value": "名称",
    "name": "親カテゴリ名 (キーワード追加時のみ任意)"
  }
  ```

---

## 2. MCP (Model Context Protocol) ツール
Claude 等の AI エージェントから Aegis AI Hub を操作するためのツール群です。

| ツール名 | 説明 | 入力パラメータ |
| :--- | :--- | :--- |
| `get_aegis_dashboard` | 最新のパーソナライズ記事を JSON で取得 | なし |
| `get_gemini_picks` | AI 推薦の 10 記事と理由を取得 | なし |
| `add_aegis_interest` | 新しい興味（ブランド等）を学習させる | `type`, `value`, `name` |

---

## 3. セキュリティと制限
- **レート制限**: `express-rate-limit` により、15分間に100リクエストまでの制限が適用されています。
- **CORS**: デバッグ利便性のため、現在は全てのオリジンを許可していますが、本番運用時は適切に制限することを推奨します。
- **環境変数**: `GEMINI_API_KEY` が必須です。
