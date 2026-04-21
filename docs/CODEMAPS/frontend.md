# Frontend UI Codemap

**Last Updated:** 2026-04-21
**Entry Point:** `dashboard/index.html`

## 概要
フロントエンドは、究極の「美」と「信頼性」を両立させた Next-Gen UI です。Vanilla JS による軽量さと Tailwind CSS によるモダンなスタイリングに加え、強固な XSS 対策を実装しています。

## モジュール構成

| ファイル名 | 役割 | 主要オブジェクト/メソッド |
| :--- | :--- | :--- |
| `js/app.js` | メイン・アプリケーション・コントローラー。イベント管理と全体フロー制御。 | `fetchDashboard`, `fetchRecommendations` |
| `js/ui.js` | DOM操作、レンダリング、セキュリティ保護。 | `renderDashboard`, `renderRecommendations`, `escapeHTML` |
| `js/store.js` | 既読状態、検索クエリの状態管理。 | `getFilteredArticles`, `markAsRead`, `setSearchQuery` |
| `js/api.js` | バックエンド API との通信インターフェース。 | `fetchDashboard`, `fetchRecommendations` |

## セキュリティ実装 (XSS 対策)
- **HTML Escaping**: 全ての記事タイトル、ブランド名、推薦理由は `escapeHTML` メソッドを経由してレンダリングされます。
  - `& < > " '` の 5 文字を実体参照へ変換し、DOM ベースの XSS 攻撃を根本から防止します。
- **ARIA & Role**: アクセシビリティとセキュリティの両立のため、適切な `role="article"` や `aria-label` を付与。

## UX デザインの極致
- **スケルトンスクリーン**: API 応答までの待機時間を視覚的に埋める優雅なプレースホルダー。
- **Glassmorphism (グラスモーフィズム)**: `backdrop-blur` を多用した、ガジェットの「未来感」を演出するデザイン。
- **Gemini's Picks**: AI 推薦セクションには専用のグラデーションボーダーと `fas-magic` アイコンを採用。
- **LocalStorage 永続化**: ブラウザをリロードしても「既読」情報が維持されるスマートな体験。

## スタイリング & アイコン
- **Tailwind CSS**: `grid`, `flex`, `animate-pulse` などを駆使したレスポンシブデザイン。
- **FontAwesome**: 操作ボタン、既読マーク、カテゴリ識別のための視覚的ヒント。
