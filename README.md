# Aegis AI Hub 🛡️🤖 - v5.0 Next-Gen

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 Pro Preview / Flash Lite** を中枢に、React/TypeScript と「下書き」ベースの高度な設定ワークフローを統合した、インテリジェンス・エージェントの決定版。

## 🌟 Aegis v5.0 の主要な進化点

### 1. Nexus Command & Control (統合システムエディタ)
設定、視覚化、スキルの制御を一元管理する強力なダッシュボードを搭載。
- **「下書き（Draft）」ベースの編集フロー**: 全ての変更を一時保持し、一括同期（Atomic Sync）が可能。
- **カテゴリ・ライフサイクル管理**: カテゴリの追加、削除、表示順の入れ替えを直感的に操作。
- **Skill Registry**: エージェントが持つ特定の「スキル」（RSS取得、解析、提案等）を個別に有効/無効化。

### 2. 次世代 AI 推論 (Powered by Gemini 3.1)
2026年4月時点の最新モデル **Gemini 3.1 シリーズ** に最適化。
- **Structured Output**: JSON Schema による厳密なデータパースにより、AI の誤動作（404エラー等）を解消。
- **自律ループと SSE**: エージェントの思考プロセスをリアルタイムでストリーミング。ハートビート機能により安定した接続を維持。

### 3. プロダクション級の堅牢性
- **堅牢な起動プロセス**: Docker Desktop の起動待ち、API 疎通確認、ログ出力 (`startup.log`) を備えた改善版 `startup.ps1`。
- **最適化された静的配信**: `dashboard/dist` からの配信により、高速な読み込みと正確な MIME タイプ処理を実現。
- **モダン UI**: Windows 11 の Mica や Glass-morphism を踏襲した Fluent デザイン。

## 🛠 テックスタック

- **Backend**: Node.js, Fastify, TypeScript
- **AI**: Gemini 3.1 Pro Preview / Flash / Flash Lite (Structured Output 対応)
- **Frontend**: React 18, Vite, Tailwind CSS 3.4+, Framer Motion
- **Protocol**: MCP (Model Context Protocol) サーバー機能搭載

## 🚀 起動とセットアップ

### 1. 環境変数の設定
`server/.env` ファイルに Gemini API キーを設定。
```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. クイックスタート (Windows)
```powershell
./scripts/startup.ps1 -Install
```
※ 実行ログは `./startup.log` に出力されます。

### 3. Docker を利用した起動
```bash
docker-compose up -d
```

## 👨‍💻 技術リファレンス (Codemaps)

詳細な設計ドキュメントは `docs/CODEMAPS/` に集約されています。
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロジェクト全体の俯瞰図とモジュール構成
- [**automation.md**](./docs/CODEMAPS/automation.md) - スタートアップ自動化と Docker 構成
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - Nexus Editor, Skill Registry, Fluent デザイン
- [**backend.md**](./docs/CODEMAPS/backend.md) - SOA, 自律進化, SSE, Gemini 3.1 基盤

---
*Aegis AI Hub - Precision Engineering for Intellectual Excellence. 🚀*
