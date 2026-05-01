# Automation & Quality Codemap

**Last Updated:** 2026-06-05
**Version:** v5.2 (Production Ready)
**Key Tools:** Playwright, esbuild, electron-builder

## 概要
Aegis AI Hub v5.2 では、インストーラー配布に向けたビルドパイプラインの自動化と、プロダクション環境での安定性を担保するテスト体制を確立しました。

## 1. ビルド・パイプライン
`dashboard/package.json` に定義されたスクリプトにより、複雑なビルド工程を自動化しています。

| コマンド | 処理内容 | 成果物 |
| :--- | :--- | :--- |
| `npm run build` | Vite + TypeScript によるフロントエンドのビルド。 | `dashboard/dist/` |
| `npm run build:electron` | esbuild によるメインプロセスのバンドル。 | `electron/main.bundle.cjs` |
| `npm run dist` | 全ビルドを実行後、インストーラーを生成。 | `release/*.exe`, `release/*.msi` |
| `npm run electron:build` | `dist` のエイリアス。 | 同上 |

### バンドル戦略
- **Main Process**: `esbuild` を使用。`node_modules` への依存を排除（`electron` 除く）し、単一の CJS ファイルに出力。これにより、パッケージサイズを削減し、起動速度を向上させています。
- **Renderer Process**: `Vite` を使用。アセットの最適化とコード分割を実施。

## 2. E2E テスト (Playwright)
デスクトップアプリとしての振る舞いを検証します。

- **`data-testid` による安定性**: 主要コンポーネントに付与されたテストIDにより、UI変更の影響を受けにくいテストを実現。
- **タイムアウト戦略**: AI 推論や重いスクレイピング処理を考慮し、20〜30秒の動的待機を実装。
- **カバレッジ**: 記事の表示、設定の保存、APIキーの反映、ナレッジグラフの描画を網羅。

## 3. パッケージング (electron-builder)
`dashboard/package.json` の `build` セクションで設定されています。

- **アイコン**: `public/app-icon.png` を使用。
- **NSIS**: Windows ユーザー向けの標準的なインストーラー（カスタムインストールパス対応、デスクトップショートカット作成）。
- **アセット同梱**: `dist/**/*`, `electron/index.cjs`, `electron/main.bundle.cjs`, `electron/preload.cjs` のみを同梱し、不要なソースコードを除外。

## テスト実行コマンド
```powershell
# E2Eテストの実行
cd dashboard
npm run test:e2e

# レポートの確認
npx playwright show-report
```
