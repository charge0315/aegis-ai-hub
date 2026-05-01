# Aegis AI Hub - API & Technical Reference

**Last Updated:** 2026-06-05
**Version:** 5.2 (Production Ready)

本ドキュメントでは、Aegis AI Hub v5.2 が提供する内部 API、IPC (Inter-Process Communication)、およびデータ管理の仕様について記述します。

## 1. Electron IPC Bridge (Main ↔ Renderer)
プロダクション版では、セキュアなコンテキスト・ブリッジを介して以下の機能が提供されます。

### 1.1 設定・同期
- `nexusApi.syncSettings(payload)`: 興味関心、フィード設定、ウィンドウ状態を一括保存。
- `nexusApi.getSettings()`: 現在の全ての設定を取得。

### 1.2 API キー管理 (v5.2 新設)
- `nexusApi.getApiKey()`: 保存済みの Gemini API キーを取得。
- `nexusApi.saveApiKey(key)`: 新しい API キーを `credentials.json` に永続化。

### 1.3 AI 進化・提案
- `nexusApi.suggestCategory(name)`: 特定のカテゴリ名に基づき、AI がブランドとキーワードを提案。

---

## 2. データ永続化 (Persistence)
プロダクション環境では、OS 標準のユーザーデータ領域にデータが保存されます。

- **`credentials.json`**: Gemini API キー。
- **`interests.json`**: ユーザーの興味関心（カテゴリ、ブランド、キーワード）。
- **`feed_config.json`**: 購読中の RSS フィードと発見されたプール。
- **`window_state.json`**: ウィンドウの座標とサイズ。

---

## 3. ディレクトリ構造 (Production)
```
%APPDATA%/aegis-nexus/
└── data/
    ├── credentials.json
    ├── interests.json
    ├── feed_config.json
    └── window_state.json
```

## 4. セキュリティ
- API キーはローカルにのみ保存され、外部サーバー（Gemini API 除く）に送信されることはありません。
- IPC 通信は、`preload.cjs` で定義されたホワイトリスト方式のメソッドのみが許可されます。
