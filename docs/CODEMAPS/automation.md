# Automation & Quality Codemap

**Last Updated:** 2026-06-25
**Version:** v5.3 (Production Ready)
**Key Tools:** Playwright, esbuild, electron-builder

## 概要
Aegis AI Hub v5.3 では、対話型インストーラーの導入により配布時のユーザー体験を向上させ、ビルドパイプラインを最新の Gemini 3.1 構成に合わせて最適化しました。

## 1. ビルド・パイプライン
`package.json` に定義されたスクリプトにより、ビルド工程を自動化しています。

| コマンド | 処理内容 | 成果物 |
| :--- | :--- | :--- |
| `npm run build` | Vite + TypeScript によるフロントエンドのビルド。 | `dist/` |
| `npm run build:electron` | esbuild によるメインプロセスのバンドル。 | `electron/main.bundle.cjs` |
| `npm run dist` | 全ビルドを実行後、インストーラーを生成。 | `release/*.exe` |
| `npm run electron:build` | `dist` のエイリアス。 | 同上 |

### バンドル戦略
- **Main Process**: `esbuild` を使用。`node_modules` への依存を排除（`electron` 除く）し、単一の CJS ファイルに出力。
- **Renderer Process**: `Vite` を使用。アセットの最適化とコード分割を実施。

## 2. E2E テスト (Playwright)
デスクトップアプリとしての振る舞いを検証します。

- **`data-testid` による安定性**: 主要コンポーネントに付与されたテストIDにより、UI変更の影響を受けにくいテストを実現。
- **タイムアウト戦略**: AI 推論や重いスクレイピング処理を考慮し、動的待機を実装。

## 3. パッケージング (electron-builder)
`package.json` の `build` セクションで設定されています。

- **NSIS (Interactive Installer)**: 
  - `oneClick: false`: 一括インストールではなく、対話形式のインストーラー。
  - **ユーザーデータの保持**: 再インストール時に、設定ファイル（APIキーや購読リスト）を保持するか選択可能。
  - カスタムインストールパス、デスクトップショートカット、スタートメニューへの登録に対応。
- **アセット同梱**: `dist/**/*`, `electron/index.cjs`, `electron/main.bundle.cjs`, `electron/preload.cjs` のみを同梱。

## テスト実行コマンド
```powershell
# E2Eテストの実行
npm run test:e2e

# レポートの確認
npx playwright show-report
```
