# Frontend UI Codemap

**Last Updated:** 2026-04-22
**Entry Point:** `dashboard/index.html`

## 概要
フロントエンドは、究極の「美」と「機能性」を追求した次世代 UI です。常時表示のハンバーガーメニューによるドロワー操作、AIの進化・再構築提案を可視化するモダンなモーダルシステムを搭載しています。

## 主要コンポーネント & UI パターン

- **常時表示ハンバーガーメニュー**:
  - 画面左下にフローティング配置されたボタン (`#menu-toggle`)。
  - どのデバイス・画面位置からでも、一瞬でサイドバー（ドロワー）へアクセス可能。

- **ドロワーサイドバー**:
  - `transform -translate-x-full` によるスムーズなアニメーション。
  - **検索バー**: 全記事を即座にキーワードでフィルタリング。
  - **動的ナビゲーション**: カテゴリごとにセクションへジャンプ。
  - **学習パネル**: ユーザーが手動でカテゴリやキーワードを追加し、AIへ反映。

- **AI進化・再構築モーダル**:
  - `backdrop-blur-xl` を使用した没入感のあるデザイン。
  - AI が提案する「新しいフィード」「新ブランド」「ナレッジ構造の変更」をカード形式で表示。
  - ユーザーが個別に項目を選択・確定できる対話型インターフェース。

## モジュール構成

| ファイル名 | 役割 | 主要オブジェクト/メソッド |
| :--- | :--- | :--- |
| `js/app.js` | メイン・コントローラー。進化提案のフェッチと確定ロジック。 | `showEvolutionProposal`, `applyCurrentProposal` |
| `js/ui.js` | レンダリング、ドロワー開閉、モーダル管理。 | `toggleSidebar`, `renderEvolutionProposals`, `renderRestructureProposal` |
| `js/store.js` | 状態管理。検索、既読、フィルタリングの永続化。 | `getFilteredArticles`, `setSearchQuery` |
| `js/api.js` | バックエンドとの通信。進化・再構築 API の呼び出し。 | `fetchEvolutionProposal`, `applyEvolution` |

## セキュリティ実装 (XSS 対策)
- **HTML Escaping**: AI が生成する「推薦理由」や「進化提案の理由」を含め、全ての動的テキストは `escapeHTML` を経由。
  - `& < > " '` の 5 文字を厳密に変換。
- **サニタイズ**: 外部サイトからの画像 URL 等も、テンプレートリテラル内での慎重なレンダリングにより保護。

## デザイン哲学
- **Glassmorphism 2.0**: `glass` クラスと `border-white/10` による、重層的で奥行きのある視覚効果。
- **Neo-Cyberpunk Color Palette**: 
  - `Sky-400`: メインアクション
  - `Fuchsia-500`: AI キュレーション (Gemini's Picks)
  - `Cyan-500`: AI 進化 (Evolution)
  - `Indigo-500`: ナレッジ再構築 (Restructure)

