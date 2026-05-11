# Evaluation Rubric: Aegis Multi-Theme Support

## 1. Design & UX (30%)
- [ ] **Light Mode Aesthetics**: ライトテーマ時、Glassmorphism が美しく表現されているか。背景の透過とコンテンツの境界が明確か。
- [ ] **Contrast**: ライトテーマでのテキスト可読性（特に `slate-500` 相当の補足テキスト）が十分か。
- [ ] **Seamless Transition**: テーマ切り替え時に、不自然な色の飛びやレイアウト崩れが発生していないか。

## 2. Technical Implementation (30%)
- [ ] **CSS Variables**: ハードコードされた色指定が排除され、CSS変数ベースの管理になっているか。
- [ ] **Tailwind v4 Integration**: `@theme` ブロック内で変数が正しく定義され、ユーティリティクラスから参照されているか。
- [ ] **Type Safety**: `UiSettings` への `theme` 追加が Zod スキーマおよび TypeScript 型定義に正しく反映されているか。
- [ ] **System Sync**: OSのテーマ変更に対して、リロードなしで即座にUIが追従するか。

## 3. Persistence & Reliability (20%)
- [ ] **Settings Saving**: テーマ設定が `ui_settings.json` に保存され、再起動後も維持されるか。
- [ ] **Error Handling**: 万が一 `ui_settings.json` が破損していても、デフォルトテーマで正常に起動するか。

## 4. Craft & Polish (20%)
- [ ] **Animation**: テーマ切り替え時に 300ms 程度の滑らかな遷移があるか。
- [ ] **Unified UI**: サイドバー、ヘッダー、カード、ダイアログ、設定画面の全てにおいてテーマが統一されているか。
- [ ] **Edge Cases**: ローディング状態やエラー状態のコンポーネントもテーマに対応しているか。
