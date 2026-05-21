# Automation & Quality Codemap

**Last Updated:** 2026-05-21
**Version:** v5.4.0 Aegis Chroma (Production Ready)
**Key Tools:** Playwright, esbuild, electron-builder, Vitest

## 概要
Aegis AI Hub v5.4.0 では、対話型インストーラーによるスムーズな配布と、Windows OS への高度な統合（自動起動・タスクバーアイコン）を実現しました。
ビルドパイプラインは、メインプロセスとレンダラープロセスを独立して最適化する二段構成となっており、`npm run dist` により即座にリリース可能な v5.4.0 バイナリが生成されます。

## 1. ビルド・パイプライン
`package.json` に定義されたスクリプトにより、ビルド工程を自動化しています。

### ビルド規約
- **リリースビルドの定義**: ユーザーからの「リリースビルド」指示は、単なるビルド（`npm run build`）ではなく、配布用インストーラーのパッケージング（`npm run dist`）までを包含します。これにより、エンジニアリングチームは常に最終成果物としてのバイナリ品質を念頭に置いた開発を行います。

| コマンド | 処理内容 | 成果物 |
| :--- | :--- | :--- |
| `npm run build` | Vite + TypeScript によるフロントエンドのビルド。 | `dist/` |
| `npm run build:electron` | esbuild によるメインプロセスのバンドル。 | `electron/main.bundle.cjs` |
| `npm run dist` | 全ビルドを実行後、インストーラーを生成。 | `release/*.exe` |
| `npm run electron:build` | `dist` のエイリアス。 | 同上 |

### バンドル戦略
- **Main Process**: `esbuild` を使用。`node_modules` への依存を排除（`electron` 除く）し、単一の CJS ファイルに出力。
- **Renderer Process**: `Vite` を使用。アセットの最適化とコード分割を実施。

## 2. ユニットテスト (Vitest)
システムの各コンポーネントの単体動作を高速に検証します。

- **高速フィードバック**: ファイル変更を検知して即座にテストを実行する `npm run test:watch` に対応。
- **カバレッジ計測**: `npm run test:coverage` により、コードの網羅率を確認。
- **コアサービスの保護**: `SettingsManager` や `GeminiService` 等、ビジネスロジックの要となるサービスのデグレードを未然に防ぎます。

## 3. E2E テスト (Playwright)
デスクトップアプリとしての振る舞いを検証します。

- **`data-testid` による安定性**: 主要コンポーネントに付与されたテストIDにより、UI変更の影響を受けにくいテストを実現。
- **タイムアウト戦略**: AI 推論や重いスクレイピング処理を考慮し、動的待機を実装。
- **AI Insights 検証 (`ai_insights.test.ts`)**: 
  - トレンド探索からキーワード昇格までの一連のインテリジェンス・ワークフローを検証。
  - AI が生成したメタデータ（Confidence, Context, Type）の整合性と UI への反映をチェック。
  - プロモート（昇格）後の `interests.json` への反映を確認。

## 3. パッケージング (electron-builder)
`package.json` の `build` セクションで設定されています。

- **NSIS (Interactive Installer)**: 
  - `oneClick: false`: 一括インストールではなく、対話形式のインストーラー。
  - **ユーザーデータの保持**: 再インストール時に、設定ファイル（APIキーや購読リスト）を保持するか選択可能。
  - カスタムインストールパス、デスクトップショートカット、スタートメニューへの登録に対応。
- **アセット同梱**: `dist/**/*`, `electron/index.cjs`, `electron/main.bundle.cjs`, `electron/preload.cjs` のみを同梱。

## 4. Signal Integrity Check (Feed Fetching Test)
システムの根幹である「情報収集（フィード取得）」が正常に機能しているかを、E2Eテストで重点的に検証します。

- **全記事更新の検証**: `Refresh All Articles` ボタンをクリックし、実際に記事が1件以上ロードされることを確認。
- **データ取得パスの正常性**: Electron IPC ブリッジから `ScraperFacade` を経由し、外部 RSS フィードのパースまでが一気通貫で成功することを保証します。
- **リグレッション防止**: モデル更新や並列化ロジックの変更時に、取得のフリーズや欠落が起きていないかを自動で検知します。

## テスト実行コマンド
```powershell
# E2Eテストの実行
npm run test:e2e

# レポートの確認
npx playwright show-report
```
