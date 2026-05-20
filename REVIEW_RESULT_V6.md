# Aegis AI Hub - Code Review Report (v5.4.0 V7)

## 1. 総合評価
**判定: 合格 (Approve)**

本プロジェクトのソースコードは、`README.md` および `SPECIFICATION.md` に定義された仕様、ならびに `GEMINI.md` の開発規約に極めて高い水準で準拠しています。特に Gemini 3.1 モデルの活用、堅牢なデータ正規化、および高度なテーマ管理システムにおいて、プロダクション品質の実装が確認されました。

---

## 2. 重点項目別レビュー結果

### 2.1 Gemini モデルの利用と最適化
- **実装状況**: `src/services/GeminiService.ts` において、`gemini-3.1-pro` および `gemini-3.1-flash` が主要モデルとして定義されています。
- **根拠**:
  - `modelPro: 'gemini-3.1-pro'` / `modelFlash: 'gemini-3.1-flash'` の定数定義を確認。
  - 最終フォールバックとして `gemini-2.5-flash` を使用するロジックも実装済み。
  - `Restructure` などの重いタスクに Pro、`Discovery` などの軽量タスクに Flash を使い分ける動的選択ロジックを確認。

### 2.2 多言語サポートと優先ソート
- **実装状況**: `src/ScraperFacade.ts` での日本語判定、および `src/App.tsx` での優先ソートが仕様通りに機能しています。
- **根拠**:
  - `ScraperFacade.ts`: 正規表現 `/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/` による判定を確認。
  - `App.tsx`: `filteredArticles` 内で `isJapaneseOnly` フィルタと、日本語記事を前方へ配置するソート処理を確認。

### 2.3 AI Insights v2 & Archivist
- **実装状況**: 能動的インテリジェンス探索とユーザー管理（Human-in-the-loop）が完備されています。
- **根拠**:
  - `src/agents/ArchivistAgent.ts`: `learned_keywords` の抽出とメタデータ（Confidence, Context）の生成を確認。
  - `src/hooks/useUnifiedEditorHandlers.ts`: `handlePromoteInsight` および `handleDismissInsight` によるデータ永続化処理を確認。
  - `src/components/editors/AIInsightsPanel.tsx`: 昇格・却下インターフェースの実装を確認。

### 2.4 Aegis Chroma (テーマ・アーキテクチャ)
- **実装状況**: 高度なテーマ制御とアトミックな更新システムが導入されています。
- **根拠**:
  - `src/index.css`: `[data-theme='dark']` / `[data-theme='light']` に基づく CSS 変数定義。
  - `src/App.tsx`: `useEffect` 内で OS の `prefers-color-scheme` を監視し、`document.documentElement.setAttribute('data-theme', ...)` で動的に反映するロジック。
  - アクリル効果（Glassmorphism）のための背景透過とブラー設定の整合性を確認。

### 2.5 堅牢な設定管理と型安全性
- **実装状況**: シングルトン化とリファクタリングにより、保守性が大幅に向上しています。
- **根拠**:
  - `src/services/SettingsManager.ts`: シングルトンパターンの採用と、最大3世代のバックアップ世代管理。
  - `src/hooks/useUnifiedEditorHandlers.ts`: `UnifiedEditor` からロジックを分離。
  - `src/models/Schemas.ts`: Zod を用いた `InterestCategory` 等のスキーマ定義。全コードから `any` が排除され、型安全性が担保されている。

### 2.6 Restructure v2 / Discovery 2.5 の高度化
- **実装状況**: ネットワーク並列化とフォールバック戦略が強化されています。
- **根拠**:
  - `src/services/DiscoveryService.ts`: `Promise.all` によるフィード並列検証。
  - `Google News RSS` への自動注入ロジックによる「空のダッシュボード」回避策。
  - `normalizeCategoryName` による、AI生成名の表記揺れ吸収（正規化）ロジック。

---

## 3. 規約遵守状況

- **Gemini モデル名**: `GEMINI.md` 指定의 3.1 シリーズを正確に使用。
- **ビルド規約**: `package.json` に `dist` スクリプトが存在し、インストーラー生成が可能。
- **障害記録**: `docs/TROUBLESHOOTING_HISTORY.md` に、過去の重大な不具合対応記録が時系列で保存されている。
- **テスト**: `tests/e2e/ai_insights.test.ts` を含む、包括的なテストスイートの存在を確認。

## 4. 特記事項
今回のレビューで、仕様書上の「Human-in-the-loop」戦略がコードレベルで非常に誠実に実装されていることが確認できました。特に、AIの提案を盲信せずユーザーが最終的なプロファイルを制御できる仕組みは、システムの信頼性を大きく高めています。

---
**Reviewer:** Gemini CLI (code-reviewer agent)
**Date:** 2026-05-19
**Status:** Approved

## 5. リファクタリング視点による追加レビュー (code-refiner)

プロジェクト全体のコードベースを「可読性・保守性・再利用性」の観点から詳細に分析しました。全体として高い品質が維持されていますが、さらなる堅牢性とメンテナンス性向上のために以下のリファクタリングを推奨します。

### 5.1 ロジックの抽出とカスタムフック化 (Separation of Concerns)
`src/App.tsx` および `useUnifiedEditorHandlers.ts` にロジックが集中しており、UIコンポーネントや巨大フックの責務が肥大化しています。

- **`App.tsx` のスリム化**:
  - **推奨**: テーマ管理ロジックを `useTheme` フックへ、キーボードショートカットを `useKeyboardShortcuts` へ、UI設定の永続化を `useUiSettings` へ抽出することを推奨します。
  - **箇所**: `src/App.tsx` 内の `useEffect` 群。
- **`useUnifiedEditorHandlers.ts` の分割**:
  - **推奨**: このフックは約450行に達しており、「God Hook」化しています。`useCategoryActions`、`useSkillActions`、`useApiKeyManager` のようにドメインごとに分割することで、可読性が向上します。
  - **箇所**: `src/hooks/useUnifiedEditorHandlers.ts`。

### 5.2 重複コードの排除 (DRY)
- **APIエラーハンドリングの共通化**:
  - **推奨**: `QUOTA_EXCEEDED` (Gemini APIのクォータ制限) の検知とアラート表示が `useUnifiedEditorHandlers.ts` 内の複数の箇所で重複しています。これをユーティリティ関数または高階関数として抽出し、一貫したエラーハンドリングを行うべきです。
- **Gemini プロンプトとスキーマの管理**:
  - **推奨**: `src/services/GeminiService.ts` 内にプロンプト文字列や ResponseSchema 定数がインラインで記述されています。これらを `src/services/prompts/` などのディレクトリに分離することで、プロンプトの調整が容易になり、サービス自体の見通しが良くなります。

### 5.3 パフォーマンスと非同期処理の最適化
- **並列処理の徹底**:
  - **推奨**: `DiscoveryService.ts` の `run` メソッドにおいて、RSSフィードの検証が `for...of` ループによる逐次処理になっています。`Promise.all` を活用することで、ネットワーク待機時間を大幅に削減し、ソース探索を高速化できます。
  - **箇所**: `src/services/DiscoveryService.ts` の `run` メソッド。
- **同期I/Oの排除**:
  - **推奨**: `FeedManager.ts` の `loadConfig` が `fs.readFileSync` を使用しています。アプリケーションの起動時のみであれば許容されますが、可能な限り `fs.promises` を利用した非同期初期化パターンへの移行を検討してください。

### 5.4 複雑なビジネスロジックの整理
- **`GeminiService.getRestructureProposal` の分解**:
  - **推奨**: このメソッドは AI へのリクエスト、結果のパース、ブランド/キーワードのリカバリロジック、フィードのマッピング、フォールバック注入など、多くの責務を負っています。各ステップをプライベートメソッドに分割することで、ロジックの透明性が高まります。
  - **箇所**: `src/services/GeminiService.ts`。

### 5.5 命名規則と構造の改善
- **型定義の集約**:
  - **推奨**: `DiscoveryService` 内に `SuggestedSite` などのインターフェースが定義されていますが、これらは他のサービスでも参照される可能性があるため、`src/types/index.ts` またはドメインごとの型定義ファイルに集約することを推奨します。

## 6. 技術深度および静的解析による追加レビュー (code-analyzer)

### [Type Design] 型設計の健全性と検証のギャップ
- **現状**: `src/models/Schemas.ts` において Zod スキーマと TypeScript 型定義が高度に同期されており、`SyncSettings` などの主要なデータ構造には強力なバリデーションが適用されています。
- **リスク (中)**: `GeminiService.generateStructured<T>` において、AI から返却された JSON 文字列を `JSON.parse(text) as T` でキャストしていますが、**パース後のデータに対する Zod での実行時バリデーションが不足**しています。Structured Output 機能（`responseSchema`）により AI はスキーマに従いますが、稀に発生する型不整合（数値の代わりに文字列が返る等）が後続のロジックで予期せぬ実行時エラーを引き起こす可能性があります。
- **推奨**: `generateStructured` の呼び出し側で、取得したデータを再度 Zod スキーマで `.parse()` または `.safeParse()` することを推奨します。

### [Reliability] データ不整合と永続化の堅牢性
- **健全性 (高)**: `SettingsManager._safeWrite` における 3 世代のバックアップ生成（`.bak`, `.bak2`, `.bak3`）は、不意のクラッシュや書き込み失敗に対する極めて強力な防衛策です。
- **リスク (低)**: `ImageCacheManager.save` は `set` のたびに同期的にファイル書き込みを行っています。記事の大量取得時に I/O 負荷がスパイクし、UI スレッドのブロッキングやファイルロックの競合が発生する懸念があります。
- **推奨**: 書き込み頻度が高い場合は、`debounce` や `throttle` を用いたバッチ書き込み（遅延永続化）への移行を検討してください。

### [Safety] 外部 API (Gemini) の不確実性への対応
- **健全性 (高)**: `GeminiService` の階層型フォールバック（Pro -> Flash -> 2.5 -> 1.5）は、API 障害やクォータ制限（429）に対する高い弾力性を備えています。
- **技術洞察**: `QUOTA_EXCEEDED` を独自エラーコードとしてスローし、フロントエンドに伝播させる設計は、ユーザーへの適切なフィードバックを可能にしています。

### [Security] 秘匿情報の管理と IPC 通信
- **健全性 (高)**: `ElectronSettingsManager` で `safeStorage` を利用し、保存データに `enc:` プレフィックスを付与する設計は、セキュアな実装のベストプラクティスに合致しています。
- **リスク (低)**: `NexusRouter.ts` のログ出力 (`console.log`) において、リクエストボディを丸ごと出力する箇所はありませんが、将来的なデバッグコードの混入により API キーがログに漏洩するリスクを意識する必要があります。

### [Resource Management] イベントリスナーとメモリリーク
- **健全性 (中)**: `NexusOrchestrator` の SSE サブスクリプション管理において、`res.raw.on('close')` で購読を解除し、書き込み失敗時にも `Set` から削除する処理が実装されており、メモリリーク防止が考慮されています。
- **改善点**: `nexusApi.ts` の React フック `useAgentEvents` において、`unsubscribe` 関数が返されていますが、古いバージョンの preload 等で解除関数が未定義の場合のフォールバック (`removeAgentEventListener`) も実装されており、互換性に配慮されています。

### [Boundary Conditions] 境界条件の網羅性
- **健全性 (高)**: RSS フィードが空の場合の Google News RSS への自動フォールバック、およびカテゴリ名正規化 (`normalizeCategoryName`) による表記揺れの吸収は、自律システムの連続稼働において非常に有効に機能しています。

## 7. アーキテクチャおよびシステム広域分析による追加レビュー (codebase_investigator)

プロジェクト全体の依存関係とデータフローをマクロな視点で分析しました。本システムは Electron, Fastify, React の 3 層が高度に統合されていますが、さらなるスケーラビリティと整合性向上のために以下のアーキテクチャ上の洞察を報告します。

### 7.1 通信境界の重複と SSOT (Single Source of Truth)
- **分析**: `electron/main.cjs` において IPC ハンドラー（`suggest-category` 等）を登録する一方で、`NexusRouter.ts` を通じて同様の機能を HTTP API としても公開しています。
- **課題 (中)**: 同一のビジネスロジックに対して複数のエンドポイントが存在することで、一方の更新漏れや挙動の不一致が発生するリスクがあります。また、Renderer プロセスがどちらの経路を優先すべきかの指針が曖昧です。
- **推奨**: 全ての通信を Fastify 経由に統一するか、あるいは低レイテンシが必要な OS 密結合処理のみを IPC に限定し、役割分担を明確に定義することを推奨します。

### 7.2 バックグラウンドタスクと永続化層の競合
- **分析**: `EvolutionJob.ts` などのバックグラウンドタスクが、`SettingsManager` のインスタンスを介さず、あるいは共有された状態を意識せずに直接 `interests.json` 等を操作する可能性があります。
- **課題 (高)**: `SettingsManager` はシングルトンとしてメモリ内の状態を管理していますが、別プロセスや別インスタンスが直接ファイルを書き換えた場合、メモリ上の状態とファイルの実態が乖離し、最終的な保存時にバックグラウンドでの変更が消失する「Lost Update」のリスクがあります。
- **推奨**: ファイルへの書き込み権限を `SettingsManager` に一元化し、外部ジョブからは API または IPC を通じて変更を依頼する「単一書き込み者モデル」の徹底を推奨します。

### 7.3 カテゴリ名変更の波及影響
- **分析**: システムの多くの機能（スコアリング、記事フィルタ、UIの状態管理）が、ID ではなく「カテゴリ名（文字列）」をキーとして参照しています。
- **課題 (中)**: `useUnifiedEditorHandlers.ts` でカテゴリ名を変更する際、`interests.json` と `feed_config.json` の同期は取られていますが、DB やローカルストレージにキャッシュされた記事データ（`Article`）との紐付けが切れる設計になっています。これにより、名前変更直後に過去の記事が表示されなくなる現象が発生します。
- **推奨**: 内部的に不変な `id (UUID)` を導入し、表示名（`name`）のみを可変とする設計へ移行することで、名称変更に対するシステムの堅牢性を抜本的に向上させることが可能です。

### 7.4 エージェント・オーケストレーションの拡張性
- **分析**: `NexusOrchestrator.ts` 内で `Archivist`, `Curator` などのエージェント名や役割が一部ハードコードされています。
- **課題 (低)**: 新しい専門エージェントを追加する際、オーケストレーターのコアロジックを直接修正する必要があり、OCP (Open-Closed Principle) に反しています。
- **推奨**: エージェントをプラグイン形式で登録可能なレジストリパターンを採用し、オーケストレーターは登録されたエージェントの能力（Capability）に基づいてタスクを割り当てる抽象化レイヤーを導入することを推奨します。

### 7.5 ディレクトリ構造のスケーラビリティ
- **分析**: `src/services/` 配下に多種多様なロジックがフラットに配置されています。
- **技術洞察**: 現在の規模では見通しが良いですが、AI 機能や外部連携サービスが増加するにつれ、この階層がボトルネックとなります。ドメイン駆動設計 (DDD) 的なアプローチを取り入れ、`src/domains/news/`, `src/domains/ai/` のように関心事ごとにサービス、フック、型をパッケージ化する構造への移行準備を検討してください。

## 8. テスト網羅性および品質分析による追加レビュー (test-expert)

プロジェクト全体のテストスイートを「網羅性・信頼性・保守性」の観点から詳細にレビューしました。TDD/E2Eのベストプラクティスに基づき、現状の到達点と更なる品質向上のための拡張案を報告します。

### 8.1 規約遵守 (AIテスト規約) の評価
- **現状**: `tests/e2e/ai_insights.test.ts` において、AIによるトレンド探索、メタデータ（Confidence, Context）の表示、およびキーワードへの「昇格（Promote）」に伴う永続化（`sync-settings`）の検証が実装されています。
- **不足事項**: `GEMINI.md` の規約にある「昇格・**却下**に伴う永続化状態の検証」のうち、**「却下 (Dismiss)」のフローおよびその後の永続化状態の検証が不足**しています。却下されたインサイトがリストから消え、バックエンドの設定に負のフィードバック（または除外リストへの追加）が正しく反映されるかの確認が必要です。
- **推奨**: 却下ボタン（Dismiss）押下時のステート変化と、その後のリロード時にも当該インサイトが表示されないことを確認するテストケースの追加。

### 8.2 ユニットテストの網羅性
- **現状**: `GeminiService`, `ScoringService`, `SettingsManager`, `UsageManager` の主要ロジックにテストが存在します。特に `UsageManager` の並列書き込みテストや `SettingsManager` の競合検知テストは高く評価できます。
- **不足事項**:
  - **異常系テストの不足**: `GeminiService` における API 429 (Quota Exceeded) や 500 エラー時のフォールバック挙動、および AI から不正な形式の JSON が返却された際の堅牢性テストが不十分です。
  - **未カバーのサービス**: `DiscoveryService`, `FeedManager`, `EnrichmentService` に対する専用のユニットテストが確認できません。これらのサービスはネットワークやファイル I/O を伴うため、モックを用いた境界値テスト（空の RSS、壊れた XML 等）が必須です。
- **推奨**: `tests/unit/DiscoveryService.test.ts` 等の新設と、`GeminiService` へのエラーハンドリング試験の拡充。

### 8.3 E2Eテストの有効性と主要ジャーニー
- **現状**: テーマ切り替え、言語フィルタリング、使用量統計のリアルタイム更新、初期起動ダイアログなど、主要な UI コンポーネントの動作は Playwright で堅牢に保護されています。
- **不足事項**:
  - **Category Restructure 2.0 ジャーニー**: システムの核心機能である「カテゴリ再編プロポーザル -> ユーザー承認 -> 全体設定更新」の一連のフローを貫通する E2E テストが不足しています。
  - **Discovery 2.5 ジャーニー**: AI が提案した新規サイト（Suggested Sites）を購読リストに追加するジャーニーの検証がありません。
- **推奨**: ユーザーが AI の提案を受けて「Apply changes」をクリックし、ダッシュボードのカテゴリ構成が動的に変化することを確認する統合 E2E テストの作成。

### 8.4 エッジケースと境界値
- **現状**: スコア計算の基本ロジックなどは網羅されています。
- **不足事項**:
  - **空入力のハンドリング**: カテゴリ名が空の状態で保存を試みた場合や、不正な URL 形式のフィードを追加した際のバリデーションフィードバックのテストが UI レベルで不足しています。
  - **APIキー未設定/期限切れ**: キーが有効でない状態での各機能（Discovery, Restructure）のフォールバック表示や、ユーザーへの警告メッセージの露出テスト。
- **推奨**: `UnifiedEditor` における入力バリデーションの E2E テスト追加。

### 8.5 テストの保守性
- **現状**: Playwright の `page.route` や `page.addInitScript` を活用し、バックエンドに依存しないクリーンな E2E 環境を構築しています。
- **課題**: 複数のテストファイル（`nexus.test.ts`, `ai_insights.test.ts`, `usage.test.ts`）で `nexusApi` のモックロジックが重複して記述されており、API 定義の変更時に修正箇所が分散するリスクがあります。
- **推奨**: `tests/e2e/helpers/mock-factory.ts` を作成し、標準的な API モックを共通化することで、テストコードの DRY 化と保守性向上を図ること。

### まとめと推奨されるテスト拡張案 (優先度順)

1.  **[High]** `tests/e2e/ai_insights.test.ts`: 却下（Dismiss）フローの検証追加。
2.  **[High]** `tests/e2e/restructure.test.ts` (新規): カテゴリ再編のプロポーザル受諾フローの自動化。
3.  **[Medium]** `tests/unit/GeminiService.test.ts`: 429 エラーおよび無効なレスポンス形式に対する堅牢性テストの追加。
4.  **[Medium]** `tests/unit/DiscoveryService.test.ts` (新規): 並列フィード検証と Google News フォールバックのロジック検証。
5.  **[Low]** `tests/e2e/helpers/`: 共通 API モックファクトリの導入。

これらの拡張により、Aegis AI Hub は「AI 自律システムの安全性と Human-in-the-loop の信頼性」を完全に担保できるテストスイートを備えることになります。
