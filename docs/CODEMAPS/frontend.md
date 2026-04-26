# Frontend UI Codemap

**Last Updated:** 2026-04-26
**Version:** 5.0 (Unified Settings & Fluent Design)
**Entry Point:** `dashboard/index.html`

## 概要
Aegis AI Hub v5.0 のフロントエンドは、複雑な設定を直感的に操作できる「統合システムエディタ」と、Mica/Glass-morphism を採用したモダンな UI を特徴としています。

## 統合システムエディタ (System Settings)
設定画面 (`#settings-container`) は、以下の 3 つのタブで構成され、一貫した操作感を提供します。

- **フィード管理 (Feeds)**: 購読中の RSS ソースをカテゴリ別に管理。
- **カテゴリ管理 (Categories)**: 情報分類の追加・編集・削除。
- **ブランド・キーワード管理 (Keywords)**: カテゴリ内の詳細な興味ワードをタグ形式で管理。

### 「下書き（Draft）」ワークフロー
1. **ロード**: 設定画面を開くと、サーバーから最新の `interests` と `feeds` がメモリ上の `draft` 変数へロードされます。
2. **編集**: 全ての追加・編集・削除操作は、この `draft` 変数に対して行われます（即座にサーバーへは保存されません）。
3. **AI提案の適用**: AI による進化案も、この `draft` 変数へとマージされます。
4. **一括保存**: 「保存してシステムを更新」ボタンを押すことで、`POST /api/sync-settings` が実行され、ファイルへ永続化されます。

## UI インタラクション & デザインパターン

- **インタラクティブ・ワードタグ**:
  - ブランド・キーワードは、クリックすることで即座に削除（OFF）が可能。
  - **順序規則**: ブランドが常にキーワードの前に表示され、重要度を視覚的に強調。
  - ホバー時に削除アイコンが表示され、直感的なフィードバックを返します。
- **グリッド/リスト表示切り替え**:
  - メインヘッダーのボタンにより、記事の表示密度をリアルタイムで変更。状態は `Store` を通じて管理されます。
- **動的なステータス表示**:
  - AI解析中や保存中には、ボタン内のスピナーとテキストが動的に変化し、システムの処理状況をユーザーに伝えます。
- **Fluent デザイン**:
  - `backdrop-blur` と `active:scale-95` による、高級感のある操作感。

## モジュール構成

| ファイル名 | 役割 | 主要メソッド |
| :--- | :--- | :--- |
| `js/app.js` | メイン・ロジック & 状態遷移。下書き (Draft) の保持と同期。 | `showSettings`, `saveAllSettings`, `applyProposalToDraft` |
| `js/ui.js` | レンダリング。エディタのタブ表示、タグの描画、ダイアログ。 | `renderFeedList`, `renderInterestGroups`, `renderTag` |
| `js/store.js` | データストア。記事、既読管理、表示モード、検索。 | `getFilteredArticles`, `markAsRead`, `setViewMode` |
| `js/api.js` | API 通信。`/api/sync-settings` の呼び出し。 | `syncSettings`, `fetchEvolutionProposals` |

## セキュリティ (XSS 対策)
- `ui.js` 内の `escapeHTML` メソッドにより、AI 生成コンテンツを含む全ての動的テキストをサニタイズしています。
