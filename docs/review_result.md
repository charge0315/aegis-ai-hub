# Aegis AI Hub v5.2 NEXUS — 総合レビュー & 改善計画

プロジェクト構成、ドキュメント、ソースコード、テストコードの全面レビューを実施し、発見した問題点と改善提案をまとめました。

---

## 1. プロジェクト構成レビュー

### 現状の構造

```
aegis-ai-hub/
├── server/              # Fastify バックエンド
│   └── src/
│       ├── agents/      # AI エージェント群 (7ファイル)
│       ├── api/         # NexusRouter.ts
│       ├── core/        # NexusOrchestrator.ts
│       ├── services/    # ビジネスロジック (7ファイル)
│       ├── models/      # Article.ts, Schemas.ts
│       ├── jobs/        # HealthMonitor, EvolutionJob
│       └── __tests__/   # ユニットテスト (2ファイル)
├── dashboard/           # React + Electron フロントエンド
│   ├── electron/        # Electron メインプロセス + services/models (重複コード)
│   ├── src/             # React コンポーネント
│   └── tests/e2e/       # Playwright E2E テスト (1ファイル)
├── dashboard-legacy/    # 旧UI (HTML/JS)
├── data/                # 設定データ (JSON)
├── docs/                # API.md, CODEMAPS/
├── gan-harness/         # 仕様・評価ドキュメント
├── scripts/             # startup.ps1
├── fix_ui.py            # レガシー修正スクリプト
├── fix_ui_v2.py         # レガシー修正スクリプト v2
├── docker-compose.yml.bak # 旧Docker構成
└── startup.log          # ログファイル
```

---

## 2. 発見された問題点

### 🔴 Critical: セキュリティ問題

#### C-1: APIキーとデータベースクレデンシャルのハードコーディング

> [!CAUTION]
> `server/.env` に Gemini API キーと MongoDB 接続文字列（パスワード含む）がハードコーディングされています。`.gitignore` で `.env` は除外されていますが、Git 履歴に一度でもコミットされていた場合、資格情報の即時ローテーションが必要です。

- **ファイル**: [.env](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/.env)
- **内容**: `GEMINI_API_KEY=AIzaSy...`, `MONGODB_URI=mongodb+srv://charge:cWOafZTq7zvlwhfd@...`

#### C-2: credentials.json に API キーが平文保存

> [!CAUTION]
> `data/credentials.json` に Gemini API キーが平文で保存されています。`.gitignore` で除外されていますが、アプリケーションレベルでの暗号化が不在です。

- **ファイル**: [credentials.json](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/data/credentials.json)

---

### 🟠 High: コード品質・アーキテクチャ問題

#### H-1: server/services と dashboard/electron/services のコード重複

`dashboard/electron/services/` 配下に、`server/src/services/` のほぼ同一コピーが存在します（7ファイル）。同様に `dashboard/electron/models/` にも `server/src/models/` の重複があります。

| サーバー | Electron | サイズ差 |
|---|---|---|
| `GeminiService.ts` (11KB) | `GeminiService.ts` (15KB) | Electron版が拡張済み |
| `SettingsManager.ts` (6KB) | `SettingsManager.ts` (9KB) | Electron版に `init()`, `saveApiKey()` 追加 |
| `FeedManager.ts` (5KB) | `FeedManager.ts` (7KB) | Electron版に追加メソッド |

**問題**: 一方のバグ修正が他方に伝播しない。型定義のドリフトが発生するリスク。

#### H-2: `any` 型の多用

`gan-harness/spec.md` の評価基準に「`no-explicit-any` の厳密な型定義」が明記されているにもかかわらず、多くの箇所で `any` が使われています。

- [NexusRouter.ts:7-9](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/api/NexusRouter.ts#L7-L9) — `scraper: any`, `evolution: any`
- [NexusOrchestrator.ts:25](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/core/NexusOrchestrator.ts#L25) — `subscribers: Set<any>`
- [ScraperFacade.ts:35](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/ScraperFacade.ts#L35) — `Promise<any[]>`
- [GeminiService.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/services/GeminiService.ts) — 複数箇所で `Promise<any>`
- [nexusApi.ts:83](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/src/api/nexusApi.ts#L83) — `Promise<any>`

#### H-3: NexusOrchestrator のテストとコードの不一致

テストでは `status: "start"`, `"planning"`, `"plan_ready"`, `"executing"`, `"complete"` を期待していますが、実装では `status: "working"`, `"success"`, `"idle"`, `"refresh"` を使用しています。

- **テスト**: [NexusOrchestrator.test.ts:58-63](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/__tests__/NexusOrchestrator.test.ts#L58-L63)
- **実装**: [NexusOrchestrator.ts:83-89](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/core/NexusOrchestrator.ts#L83-L89)

> [!WARNING]
> テストが全てfailする可能性が非常に高いです。テストか実装のいずれかを修正する必要があります。

#### H-4: `_fetchAndProcessArticles` が public になっている

[ScraperFacade.ts:109](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/ScraperFacade.ts#L109) の `_fetchAndProcessArticles` はアンダースコア接頭辞でプライベートを示唆していますが、`public` として宣言されています。`EvolutionJob.ts:55` から外部参照されるための措置と思われますが、カプセル化が壊れています。

#### H-5: 鮮度フィルターの不整合

- **ドキュメント** ([API.md:21](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/docs/API.md#L21)): "90日以上前の記事は自動的に除外"
- **サーバー実装** ([ScraperFacade.ts:112-113](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/ScraperFacade.ts#L112-L113)): `setMonth(getMonth() - 1)` → **30日（1ヶ月）フィルター**
- **Electron実装** ([main.cjs:156](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/electron/main.cjs#L156)): `90 * 24 * 60 * 60 * 1000` → **90日フィルター**

---

### 🟡 Medium: コード品質問題

#### M-1: レガシーファイルの残存

以下のファイルは現在使用されておらず、リポジトリを汚染しています:

| ファイル | 理由 |
|---|---|
| `dashboard-legacy/` | 旧 HTML/JS ベースのUI。完全に React に置き換え済み |
| `fix_ui.py`, `fix_ui_v2.py` | レガシーUI修正スクリプト。`.gitignore` で除外指定済みだが物理ファイルが残存 |
| `docker-compose.yml.bak` | Docker構成の残骸。`.gitignore` で除外指定済みだが残存 |
| `startup.log` | ログファイルが残存 |
| `server/verify_agents.js` | 手動検証用スクリプト |
| `dashboard/check_console.js`, `check_dom.js`, `debug_ui.cjs`, `take_screenshot.js` | デバッグ用一時スクリプト |
| `dashboard/initial-load.png` | デバッグ用スクリーンショット |

#### M-2: Electron `main.cjs` と `server/src/index.ts` のロジック重複

記事の取得・スコアリング・フィルタリングロジックが `main.cjs` (L144-210) と `ScraperFacade.ts` で別々に実装されています。Electronモードとサーバーモードで異なるコードパスを辿るため、動作の一貫性が保証されません。

#### M-3: FeedManager の `reportFailure` シグネチャの不一致

- **サーバー版**: `reportFailure(category, url)` — 2引数
- **Electron版** ([main.cjs:194](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/electron/main.cjs#L194)): `reportFailure(feed.category, feed.url, rssFetcher)` — 3引数

Electron版の `FeedManager` は異なるシグネチャを持つ可能性があり、共通コードベースから乖離しています。

#### M-4: SSE 購読者のメモリリーク可能性

[NexusOrchestrator.ts:43-51](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/core/NexusOrchestrator.ts#L43-L51) — `subscribe()` で追加した購読者が `close` イベントでのみ削除されますが、エラー時の除去ロジックが不足しています。`notify()` で書き込みエラーが発生しても `catch` するだけで購読者を削除していません。

#### M-5: バージョン表記の不整合

| 場所 | バージョン |
|---|---|
| README.md | v5.2 NEXUS |
| server/package.json | 5.0.0 |
| dashboard/package.json | 5.2.0 |
| server/src/index.ts のログ | v5.0 |
| docs/API.md | v5.2 |

#### M-6: `getProposals` のエンドポイント不整合

- [nexusApi.ts:87](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/src/api/nexusApi.ts#L87): HTTP フォールバックで `${BACKEND_URL}/api/v5/proposals` を叩く
- [NexusRouter.ts](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/server/src/api/NexusRouter.ts): `/proposals` エンドポイントは定義されていない（`/evolution-proposals` は `index.ts` のレガシーAPI側に存在）

#### M-7: GeminiService の `updateApiKey` メソッド不存在

[main.cjs:257](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/electron/main.cjs#L257) で `geminiService.updateApiKey(apiKey)` を呼んでいますが、`server/src/services/GeminiService.ts` には `updateApiKey` メソッドが定義されていません（Electron版の `GeminiService.ts` には存在する可能性あり）。

---

### 🟢 Low: ドキュメント・テスト問題

#### L-1: API.md の日付が未来日

[API.md:3](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/docs/API.md#L3) — `Last Updated: 2026-05-18` は現在日(2026-05-03)より未来の日付です。同様に [INDEX.md:4](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/docs/CODEMAPS/INDEX.md#L4)。

#### L-2: テストカバレッジの著しい不足

**サーバー側**:
- ✅ NexusOrchestrator.test.ts（ただし実装との不整合あり → H-3）
- ✅ SettingsManager.test.ts
- ❌ ScraperFacade — テストなし
- ❌ GeminiService — テストなし
- ❌ ScoringService — テストなし（純粋なロジックなのでテスト容易）
- ❌ FeedManager — テストなし
- ❌ RSSFetcher — テストなし
- ❌ NexusRouter — テストなし
- ❌ Article — テストなし

**フロントエンド**:
- ✅ nexus.test.ts (Playwright E2E × 4シナリオ)
- ❌ コンポーネントの単体テストが一切なし

#### L-3: `dashboard/package.json` のビルドスクリプトが `&&` を使用

[dashboard/package.json:11](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/package.json#L11): `"build": "tsc -b && vite build"`, `"dist": "npm run build && npm run build:electron && electron-builder"` — Windows PowerShell では `&&` は PS7+ でのみサポート。`cmd.exe` 経由で実行される `npm scripts` では動作するものの、一貫性のため `;` への変更を検討。

#### L-4: `useAgentEvents` のリスナークリーンアップ不足

[nexusApi.ts:199-218](file:///c:/Users/charg/myWorkspace/aegis-ai-hub/dashboard/src/api/nexusApi.ts#L199-L218) — Electron の `onAgentEvent` リスナーに対する `removeListener` / `removeAllListeners` のクリーンアップが `useEffect` の戻り値として実装されていません。

#### L-5: MongoDB URI が使われていない

`.env` に `MONGODB_URI` が定義されているが、コードベース全体で MongoDB は一切使用されていません。不要な資格情報の露出です。

---

## 3. 改善計画

### Phase 1: クリティカルセキュリティ修正 (最優先)

#### [MODIFY] server/.env
- `MONGODB_URI` を削除（未使用）
- APIキーをプレースホルダーに置き換え
- `.env.example` を新規作成し、必要な環境変数のテンプレートを提供

#### [NEW] server/.env.example
- 必要な環境変数のドキュメント付きテンプレート

---

### Phase 2: テストの修正と拡充

#### [MODIFY] server/src/__tests__/NexusOrchestrator.test.ts
- 実装の実際のステータス文字列（`"working"`, `"success"`, `"idle"`, `"refresh"`）に合わせてアサーションを修正

#### [NEW] server/src/__tests__/ScoringService.test.ts
- カテゴリ検出、スコア計算、ブランド抽出の単体テスト
- 純粋なロジックなので外部依存なしでテスト可能

#### [NEW] server/src/__tests__/Article.test.ts
- Zodバリデーション、サニタイズ処理のテスト

#### [NEW] server/src/__tests__/FeedManager.test.ts
- フィード追加、失敗レポート、自動切替のテスト

---

### Phase 3: コード品質・アーキテクチャ改善

#### [MODIFY] server/src/api/NexusRouter.ts
- `NexusRouterOptions` の `scraper: any`, `evolution: any` を適切な型に変更
- `/proposals` エンドポイントを追加（フロントエンドの `nexusApi.ts` が参照している）

#### [MODIFY] server/src/ScraperFacade.ts
- `_fetchAndProcessArticles` のアクセス修飾子を整理
- 鮮度フィルターを 90日に統一（ドキュメントとElectron版に合わせる）
- `getRecommendations` の戻り値型を `Promise<any[]>` から具体的な型に変更

#### [MODIFY] server/src/core/NexusOrchestrator.ts
- `subscribers: Set<any>` → `Set<FastifyReply>` に型を具体化
- 書き込みエラー時に購読者を削除するロジックを追加

#### [MODIFY] server/src/services/GeminiService.ts
- 各メソッドの `Promise<any>` を具体的な型に変更

#### [MODIFY] server/package.json
- バージョンを `5.2.0` に統一

#### [MODIFY] server/src/index.ts
- ログメッセージのバージョンを `v5.2` に統一

---

### Phase 4: クリーンアップ

#### [DELETE] レガシーファイルの削除
- `dashboard-legacy/` ディレクトリ全体
- `fix_ui.py`, `fix_ui_v2.py`
- `docker-compose.yml.bak`
- `startup.log`
- `server/verify_agents.js`
- `dashboard/check_console.js`, `dashboard/check_dom.js`, `dashboard/debug_ui.cjs`, `dashboard/take_screenshot.js`
- `dashboard/initial-load.png`
- `data/credentials.json.bak`, `data/feed_config.json.bak`, `data/interests.json.bak`, `data/window_state.json.bak`

---

### Phase 5: ドキュメント更新

#### [MODIFY] docs/API.md
- `Last Updated` 日付を実際の更新日に修正
- `/api/v5/proposals` エンドポイントをドキュメントに追加

#### [MODIFY] docs/CODEMAPS/INDEX.md
- `Last Updated` 日付を修正

#### [MODIFY] dashboard/src/api/nexusApi.ts
- `getProposals()` のエンドポイントパスを修正
- `useAgentEvents` のリスナークリーンアップを追加

---

## Open Questions

> [!IMPORTANT]
> **Q1**: `server/.env` と `data/credentials.json` に含まれるAPIキーは、すでにGit履歴にコミットされていますか？もしそうであれば、キーのローテーション（無効化→再発行）が必要です。

> [!IMPORTANT]
> **Q2**: `dashboard/electron/services/` と `server/src/services/` のコード重複について、Phase 3で統合を行うべきですか？Electron版にはサーバー版にないメソッド (`updateApiKey`, `init`, `saveApiKey` 等) が含まれており、統合にはそれなりの工数がかかります。今回のスコープに含めるか、別課題として扱うかを確認したいです。

> [!IMPORTANT]
> **Q3**: `dashboard-legacy/` の削除は問題ありませんか？完全に React 版に置き換え済みという認識で合っていますか？

---

## Verification Plan

### Automated Tests
1. `cd server; npm test` — 既存テスト + 新規テストの全パス確認
2. `cd dashboard; npx playwright test` — E2E テストの動作確認
3. `cd server; npx tsc --noEmit` — TypeScript コンパイルエラーゼロの確認

### Manual Verification
- `.env` / `credentials.json` にプレースホルダーのみ残っていることの確認
- レガシーファイルの削除後、`git status` でクリーンな状態を確認
- ドキュメントの日付・バージョンの整合性を確認
