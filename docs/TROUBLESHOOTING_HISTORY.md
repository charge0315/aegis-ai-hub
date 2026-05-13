# Aegis Nexus 障害・トラブル対応記録

本ドキュメントは、発生した障害、その原因、および実施した対処を時系列で記録するものです。

---

### #14 多言語対応の完全化とセキュリティ向上 (2026-05-13)
- **事象**: `REVIEW_RESULT_V4.md` で指摘された、一部コンポーネントでのハードコード残存、ReactのContextとフックの不整合、およびセキュリティ上の懸念（`dangerouslySetInnerHTML` の使用）、バックエンドでの言語パラメータ未対応。
- **原因**: 国際化 (i18n) プロセスの初期段階における実装漏れと、セマンティックな言語切り替えの一貫性欠如。
- **対処**:
    - **UIハードコードの排除**: `UnifiedEditor.tsx`, `SystemSettings.tsx`, `ArticleCard.tsx` の全ての固定文字列を抽出。とくに `useUnifiedEditorHandlers.ts` 内の `alert/confirm` メッセージを完全に外部化し、`translations.ts` に統合。
    - **セキュリティ改善**: `SystemSettings.tsx` 内で使用されていた `dangerouslySetInnerHTML` を安全な React 標準レンダリングに置換し、XSSリスクを払拭。
    - **フックとContextの最適化**: `LanguageProvider` をリファクタリングし、`t` オブジェクトをプロパティで渡すように変更。また、`useTranslation` フックを介して安全に文言を取得する設計に修正。
    - **バックエンドの言語対応**: `nexusApi.ts`, `electron/main.cjs`, `GeminiService.ts` を改修し、`restructureCategories` および `resetToDefaults` 呼び出し時に言語引数 (`language`) を渡すように対応。プロンプト出力も指定言語に合わせるよう修正。
    - **デフォルト設定の分離**: `data/ja/` と `data/en/` ディレクトリを作成し、言語別の `interests.json` および `feed_config.json` を配備。

---

### #13 マルチテーマ対応 (Aegis Chroma) の導入 (2026-05-11)
- **概要**: ダークテーマのみだったUIを、ライトテーマおよびシステム設定同期に対応させた。
- **実装内容**:
    - **型拡張**: `UiSettingsSchema` に `theme: z.enum(['light', 'dark', 'system'])` を追加。Zod のデフォルト値により既存データとの互換性を維持。
    - **CSS基盤**: `index.css` にセマンティックな CSS 変数体系を導入。Tailwind v4 の `@theme` と連携させ、テーマごとのカラーパレットを動的に切り替え可能にした。
    - **テーマ制御**: `App.tsx` に `THEME ENGINE` を実装。 `data-theme` 属性による切り替えと、 `window.matchMedia` によるシステム設定のリアルタイム同期を実現。
    - **UI拡張**: `SystemSettings` にテーマ選択トグルを追加。
    - **品質確保**: 全コンポーネントの色指定をセマンティッククラスへ置換。E2Eテスト (`theme.test.ts`) を新規作成し、正常な切り替えと同期を検証済み。

---

### #12 データモデルの完全統一とバックアップ世代管理の導入 (2026-05-11)
- **事象**: `NexusSettings` において `feed_urls` (旧) と `feedConfig` (新) が混在しており、コードの複雑化と不整合のリスクがあった。また、バックアップファイル (`.bak`) が無制限に作成される懸念があった。
- **原因**: 段階的なリファクタリングの過程でレガシーな命名が残存していた。
- **対処**:
    - **命名統一**: `feed_urls` を完全に廃止し、 `feedConfig` に一本化。フロントエンド、バックエンド、テストコードの全域にわたり置換を実施。
    - **バックアップ管理**: `SettingsManager._safeWrite` に世代管理（最大3世代）を実装。ディスク容量の圧迫を抑制。
    - **リファクタリング**: `UnifiedEditor.tsx` の肥大化したハンドラー群を `useUnifiedEditorHandlers.ts` カスタムフックに抽出し、コンポーネントの可読性を向上。
    - **テスト拡充**: `normalize.test.ts` (境界値テスト) および `GeminiService.test.ts` (データ復旧ロジックテスト) を追加。
    - **品質向上**: src および tests 配下の残存 `any` 型をほぼ全て排除し、 lint エラー 0 を達成。

---

### #11 プロジェクト全体レビューに伴う品質向上とアーキテクチャ修正 (2026-05-11)
- **事象**: REVIEW_RESULT.md による多数の指摘（SettingsManagerのシングルトン崩壊、セキュリティリスク、型定義の二重管理、テスト欠落など）。
- **原因**: 急激な機能追加に伴う責務分離の不徹底および、 Electron/Node.js/React 間での型・インスタンス管理の乖離。
- **対処**:
    - **アーキテクチャ**: `electron/main.cjs` をリファクタリングし、`SettingsManager` のシングルトン化を徹底. IPCハンドラー間でのインスタンス共有を実現。
    - **セキュリティ**: `.gitignore` を更新し `credentials.json` を管理除外。CORS 制限を `localhost/127.0.0.1` に強化。
    - **品質**: 巨大コンポーネント `UnifiedEditor.tsx` をサブコンポーネントに分割。同期ファイル I/O を非同期化。 `any` 型の削減と共通ユーティリティ (`normalize.ts`) へのロジック集約。
    - **テスト**: `Vitest` を導入し、 `ScoringService` および `SettingsManager` のユニットテストを追加。重複していた E2E テストの整理とモックの修正。
    - **ドキュメント**: `README.md` と `SPECIFICATION.md` のバージョン不整合やタイポを修正。

---

## 2026-05-08 〜 2026-05-10: 開発初期・安定化フェーズ

*(過去の記録は冗長なため、主要なもののみ要約)*

- **フィード取得障害**: パス解決ミス、APIキー同期不全、リトライ不足を修正。User-Agent を Chrome に変更しボット判定を回避。
- **データ鮮度フィルター**: 古い初期データが全て除外される問題を「期間制限解除フォールバック」で解決。
- **保存エラー (TypeError)**: `feed_urls` と `feedConfig` の不一致による `null/undefined` アクセスをガード処理で改善。
- **UI設定永続化**: 表示設定が再起動で消える問題を `ui_settings.json` への永続化で解決。
- **インストーラー最適化**: `dependencies` の整理によりサイズを 21% 削減。
- **AI Insights 強化**: データ構造の拡張（確信度・コンテキスト）、手動探索機能、プロンプトの高度化を実施。

---
### #15 設定保存時の自動英訳機能の修正 (2026-05-13)
- **事象**: 「Save Configuration」実行時、カテゴリ名やキーワードが英語に翻訳されない、または一部未翻訳のまま保存される。
- **原因**: 
    - `GeminiService.translateInterests` のプロンプトが不十分で、ブランドやキーワードの翻訳指示が弱かった。
    - サーバーモード (Fastify) において `translate-interests` エンドポイントが未実装だった。
    - `handleSave` 内で翻訳結果を `draftToSave` に適用する際の代入ミスにより、古いデータが保存されていた。
- **対処**:
    - **GeminiService**: プロンプトを強化し、カテゴリ名・ブランド・キーワードを漏れなくプロフェッショナルな英語に翻訳するよう明示。
    - **NexusRouter (Server)**: `POST /api/v5/translate-interests` エンドポイントを新規追加し、サーバーモードでも翻訳機能を有効化。
    - **UI Handler**: `useUnifiedEditorHandlers.ts` の `handleSave` ロジックを修正し、翻訳後のデータを確実に永続化処理 (`onSave`) へ渡すように改善。

---
### #16 Gemini API トークン上限到達時の警告表示 (Caution) の実装 (2026-05-13)
- **事象**: Gemini API の利用制限（クォータ/トークン上限）に達した際、汎用的な「保存失敗」や「エラー」が表示され、ユーザーが状況を正確に把握できない。
- **原因**: APIからの 429 エラー (Too Many Requests) やクォータ不足エラーが他のシステムエラーと区別されずに処理されていた。
- **対処**:
    - **GeminiService**: APIレスポンスを解析し、クォータ関連のエラーを特定のエラーコード `QUOTA_EXCEEDED` として識別・スローするように強化。
    - **i18n**: 日本語および英語の翻訳ファイルに、クォータ制限時の詳細な説明メッセージ (`handlers.quotaExceeded`) を追加。
    - **UIハンドラー**: `useUnifiedEditorHandlers.ts` 内の各AI連携アクション（提案、再構築、トレンド分析）において、 `QUOTA_EXCEEDED` を個別にキャッチ。
    - **ユーザー通知**: クォータエラー発生時のみ、通常の「Error」ではなく「Caution (警告)」として専用のダイアログを表示し、ユーザーに待機やプラン確認を促す体験を実現。

---
*これ以降、修正タスクを実施する際は、本形式で記録を追記すること。*
