# コードレビュー結果 V4 — 多言語対応 (日本語/英語) 実装

**レビュー日**: 2026-05-13
**レビュアー**: 第三者レビュー (熟練ソフトウェア開発者視点)
**対象スコープ**: 多言語 (i18n) 機能の追加に伴う全変更ファイル

---

## 総合評価

| 観点 | 評価 | コメント |
|------|------|---------|
| 可読性 | ⭐⭐⭐⭐☆ | Context / Provider / Hook の3ファイル分離は良い判断。命名も明快。 |
| 安定性 | ⭐⭐⭐☆☆ | 状態の二重管理、翻訳漏れ、テストの不整合などリスクが複数存在。 |
| セキュリティ | ⭐⭐☆☆☆ | `dangerouslySetInnerHTML` に翻訳文字列を直接注入しており、XSS リスクが存在。 |
| ドキュメント | ⭐⭐⭐☆☆ | walkthrough.md は概要として十分だが、テスト項目の記述と実態に乖離がある。 |
| テスト | ⭐⭐☆☆☆ | 多言語切り替え自体のE2Eテストが存在しない。既存テストとの整合性も不足。 |

---

## 🔴 Critical (修正必須)

### C-1: `dangerouslySetInnerHTML` による XSS リスク

**ファイル**: [`SystemSettings.tsx:191`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/editors/SystemSettings.tsx#L191)

```tsx
<p dangerouslySetInnerHTML={{ __html: t.system.usageNote.content }}>
```

翻訳リソース `t.system.usageNote.content` の値を `dangerouslySetInnerHTML` で直接レンダリングしている。現時点の翻訳文字列にHTMLは含まれていないため、`dangerouslySetInnerHTML` の使用自体が不要。将来的に翻訳リソースが外部ソース（ユーザー入力、CMSなど）から取得される場合、XSS の攻撃面となる。

**修正案**: 通常のテキストレンダリングに変更する。
```tsx
<p className="...">{t.system.usageNote.content}</p>
```

---

### C-2: `App.tsx` と `LanguageProvider` 間での言語状態の二重管理

**ファイル**: [`App.tsx:48-51`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L48-L51)

```tsx
const [language, setLanguage] = useState<Language>('ja');
const t = useMemo(() => translations[language], [language]);
```

`App.tsx` 自身が `language` ステートから `t` (翻訳オブジェクト) を `useMemo` で生成しつつ、同時に `LanguageProvider` にも `language` / `setLanguage` を渡して Context 経由で全子コンポーネントに `t` を提供している。

これは以下の問題を引き起こす:
1. **`t` の参照元が2系統**: `App.tsx` 内は `useMemo` の `t` を使い、子コンポーネントは Context の `t` を使うため、不整合の温床。
2. **不要な計算**: `LanguageProvider` 内で `translations[language]` を毎回計算しているのに、`App.tsx` でも重複計算している。

**修正案**: `App.tsx` 内でも `useTranslation()` フックを使用するか、`App.tsx` の `useMemo` による `t` を削除してどちらか一方に統一する。`LanguageProvider` の外側で `t` が必要なら Provider のラップ位置を調整する。

---

### C-3: `SystemSettings` が Context 経由の `setLanguage` を使用しているが、実際の永続化パスと断絶

**ファイル**: [`SystemSettings.tsx:38`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/editors/SystemSettings.tsx#L38)

```tsx
const { language, setLanguage, t } = useTranslation();
```

`SystemSettings` は Context の `setLanguage` を呼ぶ。この `setLanguage` は `App.tsx` の `useState` setter であり、`App.tsx` 側の `useEffect` (L117–L137) で `nexusApi.saveUiSettings` を呼んで永続化する。

**問題**: この間接的な依存は動作するが、`SystemSettings` から見ると「Context 経由で `setLanguage` を呼んだだけ」であり、設定が永続化される保証がコード上で明示されていない。もし `LanguageProvider` が将来内部ステートを持つように書き換えられた場合、永続化が壊れる。

**推奨**: この設計判断をコメントで明文化するか、永続化を `SystemSettings` 側で明示的に呼ぶ方式に変更する。

---

## 🟡 Major (強く修正推奨)

### M-1: 翻訳されていないハードコード文字列が多数残存

以下の文字列が `translations.ts` を経由せずハードコードされたまま残っている。言語を英語に切り替えた場合、日本語文字列が表示される、または日本語に切り替えた場合に英語が残る。

| ファイル | 行 | 内容 | 問題 |
|---------|-----|------|------|
| [`UnifiedEditor.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/UnifiedEditor.tsx#L215) | 215 | `"AI is Thinking..."` | 英語ハードコード |
| [`UnifiedEditor.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/UnifiedEditor.tsx#L219) | 219 | `"Analyzing your data and discovering..."` | 英語ハードコード |
| [`App.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L155-L156) | 155–156 | `'既存の設定を検出'` / `'既にブランドや...'` | 日本語ハードコード (英語切替時にも日本語表示) |
| [`App.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L210) | 210 | `"Active Nodes"` | 英語ハードコード |
| [`App.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L275-L281) | 275–281 | `"Small Grid"`, `"Medium Grid"`, `"Large Grid"` | title 属性が英語ハードコード |
| [`App.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L300) | 300 | `"Hide Images"` / `"Show Images"` | 英語ハードコード |
| [`ArticleCard.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/ArticleCard.tsx#L116) | 116 | `title="AI Reasoning"` | 英語ハードコード |
| [`CommandPalette.tsx`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/CommandPalette.tsx#L217) | 217 | `"Aegis Command Center v1.0"` | 英語ハードコード (ブランド名のため許容の可能性あり) |

さらに、[`useUnifiedEditorHandlers.ts`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/hooks/useUnifiedEditorHandlers.ts) 全体 (452行) にあるダイアログ文言 (約30箇所) が全て英語ハードコードされている。このファイルは React Hook であり `useTranslation` の適用が可能だが、未対応。主要な例:
- L59: `'API Key Required'`
- L89: `'No New Trends'`
- L136: `'New Category'`, `'Enter a name for...'`
- L197: `'Success'`, `'Configuration saved successfully!'`
- L384: `'API Key Required'`, `'Please set your Gemini API key...'`
- L388–395: Restructure ダイアログの全文言
- L426: `'Restore Default Profile'`

---

### M-2: RESTRUCTURE 実行時に言語が考慮されていない

**ファイル**: [`useUnifiedEditorHandlers.ts:382-423`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/hooks/useUnifiedEditorHandlers.ts#L382-L423)

`handleRestructure` は `nexusApi.restructureCategories(targetCount)` を呼び出すが、現在の言語設定を API に渡していない。サーバー側の AI (Gemini) がカテゴリ名やフィードソースを生成する際、ユーザーの言語設定に応じて日本語のカテゴリ名/フィードソースを優先するか、英語を優先するかを判断できない。

**修正案**: `restructureCategories` に言語パラメータを追加し、サーバー側のプロンプトに言語コンテキストを含める。
```ts
// 現状
await nexusApi.restructureCategories(targetCount);
// 修正案
await nexusApi.restructureCategories(targetCount, language);
```

同様に、Restructure のステップ表示メッセージ (L399, L402, L411) も英語ハードコードされており、翻訳対象とすべき。

---

### M-3: デフォルトプロファイルに言語別バリエーションが存在しない

`handleResetToDefaults` (L425–L439) は `nexusApi.resetToDefaults()` を呼び出すが、リセット先のデフォルトプロファイルが1種類しか存在しない。日本語ユーザーと英語ユーザーで期待するデフォルトカテゴリ名やフィードソースが異なるため、言語に応じたデフォルトプロファイルを用意すべき。

**修正案**: `resetToDefaults` に言語パラメータを追加する。
```ts
await nexusApi.resetToDefaults(language);
```

サーバー側で `data/default_profile_ja.json` / `data/default_profile_en.json` のように言語別のデフォルトプロファイルを管理する。

---

### M-4: E2E テストのモックに `language` フィールドが欠落

**ファイル**: [`nexus.test.ts:73`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/tests/e2e/nexus.test.ts#L73)

```ts
getUiSettings: () => Promise.resolve({ jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true }),
```

`UiSettings` スキーマに `language` フィールドが追加されたが (Schemas.ts L101)、テストのモックに含まれていない。Zod スキーマのデフォルト値 (`'ja'`) により実行時にはエラーにならないが、テストの意図が不明確になり、明示的に `language: 'ja'` を含めるべき。同じ問題が L161 にも存在する。

---

### M-5: E2E テストでローディングメッセージが英語固定でアサートされている

**ファイル**: [`nexus.test.ts:102`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/tests/e2e/nexus.test.ts#L102)

```ts
await expect(page.getByText('Intercepting Signals')).not.toBeVisible({ timeout: 30000 });
```

言語がデフォルト `'ja'` のとき、実際に表示されるテキストは `t.feed.loading` = `'シグナルを傍受中'` であり、英語の `'Intercepting Signals'` は表示されない。このアサーションは常にパスするが、実際のローディング待機として機能しない可能性がある。

---

### M-6: E2E テストで初回セットアップダイアログの Confirm ボタンが英語で検索されている

**ファイル**: [`nexus.test.ts:188`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/tests/e2e/nexus.test.ts#L188)

```ts
await page.getByRole('button', { name: 'Confirm' }).click();
```

デフォルト言語が `'ja'` の場合、ダイアログのボタンテキストは `t.dialog.confirm` = `'確認'` であり、`'Confirm'` ではない。これにより、テストが失敗する可能性がある。

> [!WARNING]
> 現在のE2Eテストがデフォルト言語 (`ja`) で実行された場合、L102 と L188 のアサーションが意図通りに機能しない恐れがある。言語によってUI文字列が変わることをテスト設計に反映する必要がある。

---

## 🟢 Minor (改善推奨)

### m-1: `useTranslationHook.ts` のファイル名が非標準的

通常 React のカスタムフックは `use<Name>.ts` という命名規則に従う。`useTranslationHook.ts` は冗長であり、`useTranslation.ts` が自然。Fast Refresh の制約で元の `useTranslation.tsx` から分離したのは正しいが、`.tsx` ではなく `.ts` (JSXを含まない) にしたので命名を `useTranslation.ts` に変更可能。

---

### m-2: `LanguageProvider` の props 型が inline で定義されている

**ファイル**: [`LanguageProvider.tsx:6`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/hooks/LanguageProvider.tsx#L6)

```tsx
export const LanguageProvider = ({ children, language, setLanguage }: { children: ReactNode, language: Language, setLanguage: (l: Language) => void }) => {
```

1行が長すぎて可読性が低い。`interface LanguageProviderProps` として明示的に切り出すべき。

---

### m-3: `CommandPalette` の `query` 入力欄がサニタイズされていない

**ファイル**: [`CommandPalette.tsx:206`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/CommandPalette.tsx#L206)

```tsx
{t.command.noResults.replace('{query}', query)}
```

ユーザー入力 `query` を直接テンプレート置換しているが、React のテキストノードとしてレンダリングされるため XSS リスクは低い。ただし、翻訳テンプレートの置換を `String.replace` で手動で行っている箇所が複数あり (L89–90 も同様)、将来の拡張で漏れが発生しやすい。

**推奨**: 汎用的な `interpolate(template, params)` ユーティリティ関数を作成し、テンプレート置換を一元化する。

---

### m-4: `ArticleCard` の `getFallbackGradient` でカテゴリ名が日本語ハードコード

**ファイル**: [`ArticleCard.tsx:29-42`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/ArticleCard.tsx#L29-L42)

カテゴリ名がハードコードの日本語文字列でグラデーション色をマッピングしている。英語版デフォルトプロファイルで英語カテゴリ名が使われる場合、全てデフォルトの `from-slate-700 to-slate-900` にフォールバックする。

**修正案**: カテゴリのメタデータ (色やアイコン) を `interests.json` のスキーマに含めるか、カテゴリ名ベースではなくカテゴリ ID ベースでマッピングする設計に変更する。

---

### m-5: `toLocaleDateString()` がロケール引数なしで呼ばれている

**ファイル**: [`ArticleCard.tsx:108`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/ArticleCard.tsx#L108)

```tsx
{new Date(article.date).toLocaleDateString()}
```

ロケール引数が省略されているため、ブラウザのデフォルトロケールが使用される。アプリの言語設定と一致しない場合がある。

**修正案**:
```tsx
{new Date(article.date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}
```

---

### m-6: `DEFAULT_SKILLS` の description が英語のみ

**ファイル**: [`useUnifiedEditorHandlers.ts:6-13`](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/hooks/useUnifiedEditorHandlers.ts#L6-L13)

スキルの `description` が全て英語で定義されている。スキルレジストリUIに表示されるため、言語設定に応じて翻訳されるべき。

---

## 📝 ドキュメントレビュー (`walkthrough.md`)

### D-1: 変更ファイルリストに `LanguageContext.tsx` が新規ファイルとして記載されているが、旧ファイル `useTranslation.tsx` の削除/リネームが記載されていない

元々存在した `src/hooks/useTranslation.tsx` が `LanguageProvider.tsx` にリネームされ、その後さらに `LanguageContext.tsx` + `LanguageProvider.tsx` + `useTranslationHook.ts` の3ファイルに分離された経緯が読み取れない。

---

### D-2: 「検証結果」の「動作確認ポイント」がチェック済み (`[x]`) だが、実際にブラウザでの動作確認が行われた形跡がない

walkthrough.md には4つの動作確認項目が全て `[x]` になっているが、セッション中にブラウザテスト (`npm run dev` + ブラウザ操作) やE2Eテスト実行は行われていない。`npm run lint` と `npm run build` のみが実行されている。

**推奨**: 未確認の項目は `[ ]` に戻し、実際のE2Eテスト結果またはブラウザ確認スクリーンショットを添付する。

---

### D-3: walkthrough.md に `nexusApi.ts` の変更が記載されていない

`nexusApi.ts` L155 でデフォルトの `UiSettings` に `language: 'ja'` が追加されているが、walkthrough の変更ファイルリストに含まれていない。

---

### D-4: walkthrough.md に `Schemas.ts` の変更が記載されていない

`UiSettingsSchema` に `language` フィールドが追加された変更 (Schemas.ts L101) が walkthrough に記載されていない。永続化の基盤となる重要な変更であり、記載すべき。

---

## 🧪 テストレビュー

### T-1: 言語切り替え自体のE2Eテストが存在しない

現在の `nexus.test.ts` は日本語優先表示とフィルタリングのテストのみ。以下のテストシナリオが不足:

| # | テストシナリオ | 優先度 |
|---|--------------|--------|
| 1 | 設定画面で言語を英語に切り替え → UIラベルが英語に変わることを確認 | 高 |
| 2 | 英語に切り替え → フィードで英語記事が優先表示されることを確認 | 高 |
| 3 | 英語に切り替え → 「JA ONLY」ボタンが非表示になることを確認 | 高 |
| 4 | 言語設定が再起動後も保持されることを確認 (永続化テスト) | 高 |
| 5 | コマンドパレットの文言が言語設定に応じて切り替わることを確認 | 中 |
| 6 | AI Reasoning オーバーレイのラベルが翻訳されていることを確認 | 中 |

---

### T-2: 既存テストの日本語テキストアサーションが言語デフォルトに依存

テスト `'Japanese priority display and filtering'` では、`JA Only` ボタンの検索 (L113) が `getByRole('button', { name: 'JA Only' })` で行われている。`header.jaOnly` の翻訳値が将来変更された場合にテストが壊れる。

**推奨**: `data-testid` ベースのセレクタに変更するか、テスト内でモック言語を明示的に設定する。

---

## 📋 要改善事項サマリー (優先順)

| # | 重要度 | 対象 | 概要 |
|---|--------|------|------|
| C-1 | 🔴 Critical | SystemSettings.tsx | `dangerouslySetInnerHTML` の除去 |
| C-2 | 🔴 Critical | App.tsx | `t` の二重管理を解消 |
| M-1 | 🟡 Major | 複数ファイル | 翻訳漏れハードコード文字列の対応 (特に `useUnifiedEditorHandlers.ts` 全体) |
| M-2 | 🟡 Major | useUnifiedEditorHandlers.ts | RESTRUCTURE に言語パラメータを追加 |
| M-3 | 🟡 Major | nexusApi.ts / サーバー | デフォルトプロファイルの日英版用意 |
| M-4 | 🟡 Major | nexus.test.ts | テストモックに `language` フィールド追加 |
| M-5 | 🟡 Major | nexus.test.ts | ローディングメッセージのアサーション修正 |
| M-6 | 🟡 Major | nexus.test.ts | ダイアログボタン名のアサーション修正 |
| C-3 | 🟡 Major | 設計全般 | 永続化パスの明文化 |
| m-1 | 🟢 Minor | useTranslationHook.ts | ファイル名の改善 |
| m-2 | 🟢 Minor | LanguageProvider.tsx | props 型の明示化 |
| m-3 | 🟢 Minor | CommandPalette.tsx | テンプレート置換の一元化 |
| m-4 | 🟢 Minor | ArticleCard.tsx | カテゴリ→グラデーションのマッピング改善 |
| m-5 | 🟢 Minor | ArticleCard.tsx | `toLocaleDateString` にロケール指定 |
| m-6 | 🟢 Minor | useUnifiedEditorHandlers.ts | DEFAULT_SKILLS の多言語対応 |
| D-1~4 | 📝 Doc | walkthrough.md | 変更履歴の補完 |
| T-1~2 | 🧪 Test | nexus.test.ts | 言語切り替えテストの追加と既存テスト修正 |
