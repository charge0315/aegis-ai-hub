# Aegis AI Hub v5.3.0 — プロジェクト全体レビュー

> **レビュー日**: 2026-05-11  
> **対象**: 要件・仕様・設計・実装・テスト計画

---

## 📋 総合評価サマリー

| 観点 | 評価 | 概要 |
|---|---|---|
| **要件・仕様** | ⭐⭐⭐⭐ | 非常に充実した仕様書。一部の整合性に課題あり |
| **設計・アーキテクチャ** | ⭐⭐⭐ | 方向性は良いが、責務分離やシングルトン管理に構造的問題 |
| **実装品質** | ⭐⭐⭐ | 動作するが、型安全性・エラーハンドリング・セキュリティに改善余地 |
| **テスト計画** | ⭐⭐ | E2Eテストのみでユニットテストが皆無。カバレッジ不足 |
| **保守性** | ⭐⭐⭐ | コメントは充実しているが、巨大ファイルと重複コードが課題 |

---

## 1. 要件・仕様に関する指摘

### 🔴 Critical

- **README とSPECIFICATION のバージョン不整合**: README では「v5.3.0 NEXUS」と記載されているが、外部仕様セクション（L71）では「v5.2 NEXUS」と記載されており、バージョンが不一致
  - **改善案**: README の外部仕様セクションを `v5.3.0` に統一する

- **SPECIFICATION.md のセクション番号の欠番・重複**: `3.3 ビルド規約` が `3.2 画面構成` の前に配置されている。また `4.2`、`4.3` が欠番
  - **改善案**: セクション番号を連番に修正（3.1 → 3.2 → 3.3、4.1 → 4.2 → ...）

### 🟡 Warning

- **README のセクション番号重複**: 「6. Dynamic Skill Registry」と「6. Integrated Backend Architecture」が重複番号
  - **改善案**: 「7. Integrated Backend Architecture」に修正

- **自動修復（Auto-Recovery）機能**: README 2.4 に「3回連続フェッチ失敗で自動無効化→代替ソースへ自動昇格」と記載あり。しかし [FeedManager.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/FeedManager.ts) の `reportFailure` を確認すると、失敗回数は記録されているが **自動昇格ロジックは未実装** の可能性が高い
  - **改善案**: 仕様と実装を照合し、未実装なら仕様から削除するか実装する

- **`SPECIFICATION.md` L146 の英語混在**: 「大量（20件以上） of フィード」は明らかな編集ミス
  - **改善案**: 「大量（20件以上）のフィード」に修正

---

## 2. 設計・アーキテクチャに関する指摘

### 🔴 Critical

- **SettingsManager のシングルトン崩壊**: [main.cjs](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/electron/main.cjs) のIPCハンドラーにおいて、**リクエストのたびに `new ElectronSettingsManager` をインスタンス化** している（L202-203, L211-212, L227 など多数箇所）。SPECIFICATION の「Shared SettingsManager: 単一のシングルトンを共有」という設計原則に違反
  ```javascript
  // 問題のパターン（全IPCハンドラーで繰り返されている）
  ipcMain.handle('get-settings', async () => {
    const settingsManager = new ElectronSettingsManager({ dataDir }); // ← 毎回new
    ...
  });
  ```
  - **改善案**: `initBackend()` で生成した `settingsManager` インスタンスをモジュールスコープの変数として保持し、全IPCハンドラーで共有する。現状では `initBackend` 内で `settingsManager` を `startInternalServer` に渡しているが、他のIPCハンドラーには共有されていない

- **`data/` ディレクトリ内の機密情報のバージョン管理**: [credentials.json](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/data/credentials.json) がリポジトリにコミットされている。暗号化済みとはいえ、認証情報ファイルをバージョン管理するのはセキュリティリスク
  - **改善案**: `.gitignore` に `data/credentials.json` を追加。`data/credentials.json.example` をテンプレートとして用意

- **フロントエンドとバックエンドの型定義の二重管理**: [types/index.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/types/index.ts) と [models/Schemas.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/models/Schemas.ts) で `InterestCategory`, `FeedConfig`, `Interests` などの型が **別々に定義** されている。フロントエンドのインターフェースと Zod スキーマからの推論型が乖離するリスク
  - **改善案**: `types/index.ts` の `InterestCategory`, `FeedConfig`, `Interests` を `models/Schemas.ts` の Zod 推論型（`z.infer`）に統一。フロントエンド固有の拡張のみ `types/index.ts` に残す

### 🟡 Warning

- **App.tsx の肥大化（353行）**: ビュー、フィルタリングロジック、初期化ロジック、ダイアログ管理が単一コンポーネントに集約されている
  - **改善案**: フィードビュー、ヘッダーコントロール、初期化ガードをそれぞれ独立コンポーネントに分離

- **UnifiedEditor.tsx の巨大サイズ（57KB, 推定1500行超）**: 単一コンポーネントファイルとしては著しく大きい
  - **改善案**: タブごとに `CategoryEditor`, `SystemSettings`, `SkillRegistryPanel`, `AIInsightsPanel` などのサブコンポーネントに分割

- **CORS `origin: '*'` 設定**: [main.cjs L43](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/electron/main.cjs#L43) で全オリジンを許可している。ローカルアプリとはいえ、セキュリティ上は制限すべき
  - **改善案**: `origin: ['http://localhost:5173', 'http://127.0.0.1:5173']` に制限

- **エージェントシステムの形骸化**: `NexusOrchestrator` 内の `CuratorAgent` のコードがコメントアウトされている（L19, L21, L34, L46）。`Curator` の case 文はハードコードされたメッセージを返すだけ（L111）
  - **改善案**: 使用しないエージェントの参照を完全に削除するか、実装を完成させる

---

## 3. 実装品質に関する指摘

### 🔴 Critical

- **`any` 型の多用**: コードベース全体で `any` が散見される
  - [GeminiService.ts L342](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/GeminiService.ts#L342): `Array<any>`
  - [SettingsManager.ts L93](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/SettingsManager.ts#L93): `syncSettings(settings: any, ...)`
  - [NexusOrchestrator.ts L107](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/core/NexusOrchestrator.ts#L107): `let result: any`
  - [EvolutionJob.ts L44](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/jobs/EvolutionJob.ts#L44): `Interests & { learned_keywords?: Record<string, any> }`
  - **改善案**: 適切な型定義で `any` を排除。ESLint の `@typescript-eslint/no-explicit-any` ルールを有効化

- **同期的ファイルI/O**: [EvolutionJob.ts L44](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/jobs/EvolutionJob.ts#L44) で `fs.readFileSync`、[L68](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/jobs/EvolutionJob.ts#L68) で `fs.writeFileSync` を使用。Node.js のメインスレッドをブロックする
  - **改善案**: `fs/promises` の `readFile` / `writeFile` に置換

- **package.json の `build` スクリプト内での `&&` 使用**: [package.json L11](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/package.json#L11) で `"build": "tsc -b && vite build"` となっている。PowerShell では `&&` は動作しない場合がある（GEMINI.md ルールに該当）
  - **改善案**: `"build": "tsc -b; vite build"` に変更するか、`npm-run-all` などのツールを使用。ただし npm scripts は sh/cmd で実行されるケースが多いので、実際の問題有無を確認

- **ArticleCard の key に index を使用**: [App.tsx L328](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L328) で `key={idx}` を使用。ソートやフィルタリングで順序が変わるため、再レンダリングの問題を引き起こす可能性
  - **改善案**: `key={article.link}` や一意のIDを使用

### 🟡 Warning

- **言語判定の不正確さ**: [ScraperFacade.ts L241-246](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/ScraperFacade.ts#L241) の `_detectLanguage` は、日本語文字が含まれなければすべて `'en'` を返す。中国語、韓国語、フランス語なども `'en'` と判定される
  ```typescript
  // 現状: 日本語以外はすべて 'en' 
  return containsJapanese ? 'ja' : 'en'; 
  ```
  - **改善案**: 返却型の `'other'` を活用する。CJK統合漢字（`\u4E00-\u9FAF`）は中国語にも共通するため、ひらがな・カタカナの有無でより正確に判定

- **preload スクリプトのリスナー解除**: [preload.cjs L38](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/electron/preload.cjs#L38) で `removeAllListeners` を使用。特定のチャネルの全リスナーが除去されるため、複数コンポーネントがリスンしている場合に問題になる
  - **改善案**: 個別のリスナー関数を保持し、`removeListener` で解除する

- **EnrichmentService のプレースホルダーURL**: [EnrichmentService.ts L33-38](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/EnrichmentService.ts#L33) でハードコードされた Unsplash URL がカテゴリ固定で5件のみ。カテゴリが増えると `undefined` になる（L178 のフォールバックはあるが）
  - **改善案**: 汎用プレースホルダー画像をローカルに配置し、ネットワーク依存を排除

- **GeminiService のフォールバックチェーンにおける無限再帰リスク**: [GeminiService.ts L86-103](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/GeminiService.ts#L86) のフォールバックは `Pro → Flash → 2.5-flash → 1.5-flash` と4段階。最後に `gemini-1.5-flash` で失敗した場合は正しく throw されるが、フォールバック中の各呼び出しで発生する新たなエラーが再びフォールバックを発火する可能性がある（ネストが深くなる）
  - **改善案**: フォールバックリストを配列化し、ループで順次試行するパターンに変更

- **`data/` 内のバックアップファイル群**: `*.bak`, `*.repro_bak`, `image_cache.json`（104KB）がリポジトリにコミットされている
  - **改善案**: `.gitignore` に `data/*.bak`, `data/*.repro_bak`, `data/image_cache.json` を追加

---

## 4. セキュリティに関する指摘

### 🔴 Critical

- **innerHTML の使用**: [App.tsx L209](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/App.tsx#L209) で `parent.innerHTML = '<span ...>NEXUS</span>'` を使用。XSS攻撃のベクトルになりうる（この場合は定数文字列なのでリスクは低いが、コーディング規約として避けるべき）
  - **改善案**: React の状態管理で代替（例: `showFallback` フラグを使い、条件レンダリング）

- **API キーの平文フォールバック**: [ElectronSettingsManager.ts L39](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/electron/ElectronSettingsManager.ts#L39) で `apiKey.startsWith('enc:')` でない場合は平文として扱われる。過去のバージョンで暗号化なしに保存された場合やテスト時に平文がファイルに残るリスク
  - **改善案**: 起動時に平文のキーを検出した場合、自動的に暗号化して上書きするマイグレーションロジックを追加

- **`process.env.GEMINI_API_KEY` のフォールバック**: [SettingsManager.ts L69](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/SettingsManager.ts#L69) で環境変数からの API キー取得がある。開発時の利便性のためと思われるが、本番環境で環境変数が意図せず設定されている場合に暗号化ストレージがバイパスされる
  - **改善案**: 環境変数フォールバックは開発モード（`app.isPackaged === false`）限定にする

---

## 5. テスト計画に関する指摘

### 🔴 Critical

- **ユニットテストが存在しない**: `tests/` 配下に E2E テスト（Playwright）のみ。サービス層（`GeminiService`, `ScoringService`, `FeedManager`, `SettingsManager`）に対するユニットテストが一切ない
  - **改善案**: Jest / Vitest を導入し、以下の優先順位でユニットテストを追加:
    1. `ScoringService` — スコア計算・カテゴリ判定ロジック
    2. `SettingsManager.syncSettings` — 正規化・バリデーション・コンフリクト検出
    3. `GeminiService.getRestructureProposal` — データ完全保持リカバリーロジック
    4. `normalizeCategoryName` — 名称正規化ロジック

- **E2E テストの重複**: `features.test.ts` と `nexus.test.ts` は **ほぼ同一のテストケース** を持つ（「Japanese priority display and filtering」と「Initial startup setup guard dialog」が両方に存在）
  - **改善案**: 重複テストを統合し、`nexus.test.ts` に一本化

- **E2E テストのモックデータ形式の不一致**: `features.test.ts` のモック記事データは `id`, `snippet`, `url`, `reasoning`, `timestamp` を使用しているが、実際の `Article` インターフェースは `link`, `desc`, `score`, `date` を使用。テストのデータが実装の型と一致していない
  ```typescript
  // features.test.ts のモック（実装と不一致）
  { id: '1', title: '...', snippet: '...', url: '...', reasoning: '...' }
  // 実際の Article 型
  { title: '...', link: '...', desc: '...', score: 95, date: '...' }
  ```
  - **改善案**: `nexus.test.ts` のように正しい `Article` インターフェースに準拠するか、テストファイル自体を統合して削除

- **テストカバレッジの盲点**: 以下の重要なフローがテストされていない:
  - AI Discovery（カテゴリクリック → フィード探索 → ワンクリック追加）
  - Deep AI Restructure（プロファイル再構築）
  - フィードの自動バリデーション（無効URL検出）
  - コマンドパレット（Ctrl+K）
  - ウィンドウコントロール（最小化、最大化、閉じる）
  - エラー時のフォールバック動作

### 🟡 Warning

- **Playwright テストで Vite dev サーバーとスタンドアロンサーバーを並行起動**: [playwright.config.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/playwright.config.ts) の `webServer` で2つのサーバーを起動するが、E2E テストは API をすべてモックしているため、バックエンドサーバーが不要な可能性
  - **改善案**: 完全モック方式のテストならバックエンド起動を削除。統合テストとして実際の API を叩くテストと分離する

---

## 6. 保守性・コード品質に関する指摘

### 🟡 Warning

- **`ScraperFacade` の責務過多**: フィード取得、記事処理、ダッシュボード構築、トレンド探索、言語判定と、多すぎる責務を持っている
  - **改善案**: `ArticleProcessor`（記事処理・言語判定）と `DashboardBuilder`（ダッシュボード構築）を分離

- **`clean` 関数の重複定義**: カテゴリ名正規化関数 `const clean = (s: string) => s.replace(/[＆&＆\s・]/g, '').toLowerCase()` が以下の3箇所で重複:
  - [GeminiService.ts L389](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/GeminiService.ts#L389)
  - [SettingsManager.ts L112](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/services/SettingsManager.ts#L112)
  - [ScraperFacade.ts L83](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/ScraperFacade.ts#L83)
  - **改善案**: `utils/normalize.ts` に共通関数として切り出す

- **`EvolutionJob` と `ScraperFacade` の結合**: [EvolutionJob.ts L61](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/src/jobs/EvolutionJob.ts#L61) で `this.scraper.geminiService` と内部プロパティに直接アクセスしており、カプセル化が破壊されている
  - **改善案**: `ScraperFacade` に `analyzeTrends` メソッドを公開API（既に `discoverTrends` として存在）として使用し、内部サービスへの直接アクセスを禁止

- **`HealthMonitor.ts` が未使用の可能性**: `jobs/HealthMonitor.ts` が存在するが、`main.cjs` や他のファイルから参照されていない
  - **改善案**: 使用されていなければ削除する

- **`GeneratorAgent.ts` と `EvaluatorAgent.ts` の用途不明**: `agents/` 配下に存在するが、`NexusOrchestrator` では使用されていない
  - **改善案**: 未使用のエージェントを削除するか、ドキュメントに将来の計画として記載

---

## 7. ビルド・依存関係に関する指摘

### 🟡 Warning

- **`dependencies` と `devDependencies` の分類**: TROUBLESHOOTING_HISTORY #8 で「`dependencies` を全て `devDependencies` に移動」したと記録があるが、現状では `dependencies` に戻っている（#9 で復元）。Electron アプリの場合、バンドル後のパッケージに `node_modules` が含まれるかどうかの判断基準が曖昧
  - **改善案**: `electron-builder` の `files` 設定でバンドル済みファイルのみを含むようにし、`dependencies` を正しく分類。esbuild でバンドルされるバックエンド依存は `devDependencies` に移動可能

- **`tailwind.config.js` の存在**: Tailwind CSS v4 (package.json: `^4.2.4`) は `@tailwindcss/vite` プラグインを使用するため、旧式の `tailwind.config.js` は不要な可能性
  - **改善案**: Tailwind v4 の設定方式に合致しているか確認し、不要なら削除

- **`d3` パッケージの利用範囲**: `d3` (バンドルサイズ大) が依存に含まれているが、使用箇所は `KnowledgeGraph.tsx` のみと思われる
  - **改善案**: `d3-force` など必要なサブモジュールのみインポートしてバンドルサイズを削減

---

## 8. 改善優先度マトリックス

| 優先度 | カテゴリ | 項目 | 影響度 |
|---|---|---|---|
| **P0** | 設計 | SettingsManager のシングルトン崩壊修正 | 🔴 データ不整合リスク |
| **P0** | セキュリティ | `data/credentials.json` を `.gitignore` に追加 | 🔴 認証情報漏洩 |
| **P1** | テスト | ユニットテスト導入（ScoringService, SettingsManager） | 🟠 品質保証 |
| **P1** | 実装 | `any` 型の排除 | 🟠 型安全性 |
| **P1** | テスト | E2E テストの重複解消 | 🟠 保守性 |
| **P2** | 設計 | 型定義の二重管理解消 | 🟡 保守性 |
| **P2** | 実装 | `clean` 関数の共通化 | 🟡 DRY原則 |
| **P2** | 実装 | 同期I/O の非同期化 | 🟡 パフォーマンス |
| **P2** | 仕様 | README/SPECIFICATION の不整合修正 | 🟡 ドキュメント品質 |
| **P3** | 設計 | UnifiedEditor.tsx の分割 | ⚪ 保守性 |
| **P3** | 設計 | 未使用エージェントの整理 | ⚪ コード衛生 |

---

> [!IMPORTANT]
> 最も緊急性が高いのは **SettingsManager のシングルトン崩壊** と **credentials.json のバージョン管理** です。前者はデータ競合や不整合の原因となり、後者はセキュリティインシデントにつながりうるため、早急な対応を推奨します。

> [!TIP]
> テスト戦略として、まず Vitest を導入し、純粋なビジネスロジック（`ScoringService`, `normalizeCategoryName`）のユニットテストから着手すると、コスト対効果が最も高いです。
