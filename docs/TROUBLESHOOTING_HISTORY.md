# Aegis Nexus 障害・トラブル対応記録

本ドキュメントは、発生した障害、その原因、および実施した対処を時系列で記録するものです。

---

### #19 コードレビュー: Immutability 違反・型安全性・テストカバレッジ向上 (2026-06-05)
- **事象**: 総合コードレビューにより、複数のクラスでオブジェクトの直接変更（Immutability 違反）、型安全性の問題、および主要サービスのユニットテスト欠落が発見された。
- **原因**:
    - **`EnrichmentService.enrich()`**: `article.img = ...` や `article.title = ...` のように、引数で受け取った `ArticleType` オブジェクトを直接変更しており、Immutability 原則に違反していた。呼び出し元が同じ参照を保持している場合に予期しない副作用が生じるリスクがあった。
    - **`ScraperFacade.getRecommendations()`**: `matched.geminiReason = r.geminiReason` で `Article` クラスのインスタンスを直接変更していた。また、`enrichAll()` の戻り値ではなく変更前の配列を `return` しており、`enrich()` の修正後に正しく動作しない問題があった。加えて `reportSuccess()` が `await` なしで呼び出されており、失敗時のエラーが握りつぶされるリスクがあった。
    - **`RSSFetcher.fetchAll()`**: `.catch((error: Error) => ...)` と明示的に型付けしており、TypeScript の `catch` 節は `unknown` 型のみ受け付けるという仕様に違反していた（実際は `any` にキャストされる）。`error.message` の安全でないアクセスになっていた。
    - **`SettingsManager.test.ts`**: `NexusSettings` というプロジェクト内に存在しない型を使用しており、型エラーを引き起こす可能性があった。正しくは `SyncSettings` （`Schemas.ts` で定義）を使用すべきだった。
    - **テストカバレッジ**: `FeedManager`（フィードライフサイクル管理の中核）と `UsageManager`（利用統計の永続化）のユニットテストが存在しておらず、重要なロジックが無検証状態だった。
- **対処**:
    - **`EnrichmentService.ts`**: `enrich()` メソッド内でスプレッド構文 (`{ ...enriched }`) を使用してイミュータブルに更新し、`let enriched = { ...article }` から始まる関数型スタイルに変更。
    - **`ScraperFacade.ts`**: `getRecommendations()` 内で `new Article({ ...matched.toJSON(), geminiReason })` により新しいインスタンスを生成するよう変更。`enrichAll()` の戻り値 `enrichedArticles` を正しく `return` するよう修正。`reportSuccess()` に `await` を追加。
    - **`RSSFetcher.ts`**: `.catch((error: unknown) => ...)` に変更し、`error instanceof Error ? error.message : String(error)` で安全にメッセージを取得するよう修正。
    - **`SettingsManager.test.ts`**: `NexusSettings` を `SyncSettings` にインポートを含めて修正。
    - **テスト追加**: `tests/unit/FeedManager.test.ts` を新規作成（18テスト: addFeed, removeFeed, reportSuccess, reportFailure, cleanConfig, getActiveFeeds の正常系・異常系をカバー）。`tests/unit/UsageManager.test.ts` を新規作成（9テスト: init, recordUsage, getStats の正常系・異常系をカバー）。
- **検証**:
    - `npm run lint` : エラー・警告 0件を確認。
    - `npm run test` : 7テストファイル、57テスト全て通過（修正前は5ファイル30テスト）。
    - `npm run test:e2e -- --project=chromium` : E2Eテスト7件全て通過を確認。

---

### #18 設定画面のタブヘッダーが日本語表記時に折り返される問題の修正 (2026-06-03)
- **事象**: 設定画面のタブヘッダー（「エディタ」「ナレッジグラフ」など）が、日本語表記の際、画面幅や要素の圧縮によって途中で不格好に折り返され（例：「エディ\nタ」）、アイコンの下にテキストが配置されてしまう。
- **原因**: タブボタンにテキスト折り返し防止の `whitespace-nowrap` や縮小防止の `flex-shrink-0` が指定されておらず、またコンテナ側で画面が狭くなった際のはみ出しスクロール（`overflow-x-auto`）が考慮されていなかったため。
- **対処**:
    - [UnifiedEditor.tsx](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/components/UnifiedEditor.tsx) 内の `TabButton` に `flex-shrink-0 whitespace-nowrap` のスタイルクラスを追加。
    - タブコンテナに `overflow-x-auto` と `scrollbar-none` を追加し、狭い画面幅でもレイアウトが崩れずスクロールできるように改善。
- **検証**:
    - ユニットテスト、E2Eテストがすべて正常に通過することを確認。

---

### #17 Discover Trends Now が機能せず、「トレンドなし」と表示される不具合の修正 (2026-06-03)
- **事象**: 「Discover Trends Now」を実行した際に、最新のニュースがあるはずなのに「トレンドなし」と表示される。
- **原因**:
    - **メソッドの誤削除**: 過去のコミット（`94f681a`）で行われたコード整理の際、`src/ScraperFacade.ts` から `fetchAndProcessArticlesWithFallback` メソッドが誤って削除されていた。
    - **初期フェッチのクラッシュ**: このため、`electron/main.cjs` の起動イベント（`ready-to-show`）内で呼び出されている `scraper.fetchAndProcessArticlesWithFallback` で `TypeError` が発生し、起動時の記事初期フェッチ処理がクラッシュしていた。
    - **分析対象の不足**: 記事が1件も取得されない（0件の）状態でトレンド分析機能が呼び出されるため、AIに入力される記事が常に空となり、結果として「トレンドなし」が表示される事象に繋がっていた。
- **対処**:
    - **メソッドの復旧**: [ScraperFacade.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/ScraperFacade.ts) に、期間制限解除のフォールバック処理を行う `fetchAndProcessArticlesWithFallback` メソッドを再実装して追加した。
- **検証**:
    - デバッグ用スクリプト（`category_diag.cjs`）の実行確認、および `npm run test:e2e -- --project=chromium` 等のすべてのユニットテスト・E2Eテストが正常に通過することを確認。

---

### #16 利用統計（Usage Stats）が記録されず、リアルタイムに更新・表示されない問題の修正 (2026-06-03)
- **事象**: 設定画面の「利用統計」タブにアクセスしても、統計データ（トークン消費量、APIコール数など）が全く記録されず、空（もしくは更新されない）状態のままになる。また、リアルタイムに画面へ反映されない。
- **原因**:
    - **インスタンス紐付け漏れ**: `electron/main.cjs` 内で `GeminiService` をインスタンス化する際、`settingsManager.usageManager` を `geminiService.setUsageManager(...)` で設定し忘れていた。このため、Gemini API コール完了後に `usageManager.recordUsage()` が一切呼び出されておらず、利用統計データそのものが記録されていなかった。
    - **Preload API 露出不足**: `electron/preload.cjs` で `getUsageStats` および `onUsageUpdate` が公開されていなかったため、レンダラープロセスがデスクトップアプリ（Electron）環境で IPC を利用できず、使用量データの取得や変更の購読が機能していなかった。
    - **イベント通知の欠落**: `UsageManager` でデータ保存完了時にメインプロセスからレンダラープロセスへ `usage-update` イベントを通知する仕組みがなかった。
    - **書き込み競合リスク**: `UsageManager.ts` の非同期書き込み `fs.writeFile` がほぼ同時に複数回呼ばれた場合に、ファイルの書き込み競合（競合状態）が発生する懸念があった。
- **対処**:
    - **インスタンス紐付け**: `main.cjs` にて `geminiService.setUsageManager(settingsManager.usageManager)` の呼び出しを追加し、Gemini APIコール時のトークン消費量を正しく記録するようにした。
    - **Preload API の露出**: `preload.cjs` 内で `getUsageStats` と `onUsageUpdate` を `contextBridge.exposeInMainWorld` に追加。`onUsageUpdate` ではリスナーを登録し、返り値として購読解除関数を返すようにしてメモリリークを防止。
    - **イベント通知の実装**: `UsageManager.ts` に `onUpdate` コールバックプロパティを追加し、`main.cjs` 側でそのコールバックをフック。更新時に `mainWindow.webContents.send('usage-update', stats)` でレンダラーに通知するようにした。
    - **競合状態の排除**: `UsageManager.ts` の `save()` 時に、Promise チェーンによるシリアル化ロックを導入し、複数の書き込みが順序よく安全に行われるよう改善。
- **検証**:
    - ユニットテスト (`vitest`) および E2Eテスト (`playwright`) を実行し、全テスト（7件）が正常に通過することを確認。

---

### #15 設定ファイルの破損による起動時エラー (Sync Error) (2026-05-23)
- **事象**: 起動時に `Sync Error: Error invoking remote method 'get-settings': SyntaxError: Unexpected non-whitespace character after JSON at position 2721` が発生し、アプリが正常に起動しない。
- **原因**: `feed_config.json` の末尾に古いデータの一部が残存しており、不正な JSON 形式になっていた。これは `FeedManager` (直接的な `fs.writeFile`) と `SettingsManager` (バックアップ世代管理付きの `_safeWrite`) が同じファイルに対して競合し、アトミックでない書き込みや回転処理中の干渉が発生したことが原因。
- **対処**:
    - **データ復旧**: `feed_config.json` を手動（スクリプト）で解析し、有効な JSON プレフィックスを抽出してファイルを修復。
    - **書き込み処理の統一**: `SettingsManager` に `saveFeedConfig` メソッドを追加し、 `FeedManager` が保存時にこのメソッドをコールバックとして利用するように変更。これにより、全ての設定ファイル書き込みが `SettingsManager` の「バックアップ世代管理付き安全書き込みロジック」を介して行われるようになり、競合と破損を防止した。
    - **バリデーション強化**: 保存前に Zod スキーマによる型チェックを強制。
- **検証**:
    - 手動での JSON 修復を確認。
    - `SettingsManager.test.ts` に `saveFeedConfig` のテストを追加し、正常系およびバリデーションエラー系が正しく動作することを確認。

---

### #14 スタートアップ登録機能の実装とリリースビルド v5.4.0 (2026-05-21)
- **概要**: アプリケーションを Windows ログイン時に自動起動する機能を追加し、製品版インストーラーを生成した。
- **実装内容**:
    - **型定義拡張**: `UiSettingsSchema` に `autoLaunch` フィールドを追加。
    - **UI実装**: `SystemSettings.tsx` に自動起動切り替えトグルを実装。
    - **Electron統合**: `app.setLoginItemSettings` を用いたレジストリ操作ロジックを `main.cjs` に統合。
    - **アイコン修正**: タスクバーアイコンの表示異常を、`nativeImage` による読み込みと、高解像度画像（8MB）から標準軽量画像（`app-icon-192.png`, 87KB）への切り替えにより解決。
    - **型安全性の修正**: `src/api/nexusApi.ts` の型不一致を修正。
- **検証**:
    - `npm run dist` により、修正を反映したインストーラー `Aegis Nexus Setup 5.4.0.exe` の生成を確認。
- **ドキュメント**:
    - `README.md`, `SPECIFICATION.md` 等を最新仕様（v5.4.0）に更新。

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
*これ以降、修正タスクを実施する際は、本形式で記録を追記すること。*
