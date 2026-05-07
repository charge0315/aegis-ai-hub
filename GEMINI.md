# Aegis Nexus - Project Instructions

## 開発・ビルド規約
- **「リリースビルド」の定義**: ユーザーから「リリースビルド」の指示があった場合は、単なるコンパイルだけでなく、パッケージング（インストーラー作成）までを含む `npm run dist` を実行すること。
- **Gemini モデル名**: 2026年5月時点では `gemini-3.1-pro` および `gemini-3.1-flash` をメインに使用し、安定版の最終フォールバックには `gemini-2.5-flash` を使用する。
- **E2Eテスト**: すべての重要な変更後は、必ず `npm run test:e2e -- --project=chromium` を実行して動作を確認すること。
