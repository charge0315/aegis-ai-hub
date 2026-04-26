# Aegis AI Hub 🛡️🤖 - v5.0 Next-Gen

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 シリーズ** を中枢に、Fluentデザイン（Mica/Glass-morphism）と「下書き」ベースの高度な設定ワークフローを統合した、インテリジェンス・エージェントの決定版。

## 🌟 Aegis v5.0 の主要な進化点

### 1. 統合システムエディタ (Unified System Editor)
「フィード」「カテゴリ」「キーワード」の設定を、タブ切り替えで一元管理できる統合画面を新設。
- **「下書き（Draft）」ベースの編集フロー**: 設定画面を開いた際に現在の構成をメモリにロード。全ての変更（追加・編集・削除）を一時的に保持し、最後に「保存してシステムを再構築」ボタンで一括反映。
- **インタラクティブなワード管理**: カテゴリ内のブランド・キーワードをタグ形式で表示。クリックひとつで即座に削除（OFF）が可能。

### 2. AI 進化のシームレスな統合 (AI-Driven Evolution)
AIによる「システム進化」と「ナレッジ再構築」の提案を、設定エディタへ直接取り込むワークフロー。
- **AI 提案の「下書き」取り込み**: Gemini が提案する新しいフィードやブランドを、ワンクリックで現在の編集セッション（下書き）へマージ。
- **プレビュー & 調整**: AI の提案をそのまま適用するのではなく、エディタ上で手動調整してから保存可能。

### 3. 次世代 Fluent デザイン (Advanced UI/UX)
Windows 11 の Mica や Glass-morphism を踏襲した、モダンで直感的なインターフェース。
- **グリッド/リスト表示の切り替え**: 記事の密度をユーザーの好みに合わせて瞬時に変更。
- **動的なフィードバック**: AI解析中のスピナー表示や、ボタンの `active:scale` エフェクトによる高い操作感。
- **インテリジェント・サーチ**: 常時アクセスのドロワーメニューから、全記事を瞬時にフィルタリング。

## 🛠 テックスタック

- **Backend**: Node.js, Express (SOA - Service Oriented Architecture)
- **AI**: Gemini 3.1 Pro / Flash (最新 2026年4月モデル対応)
- **Frontend**: ES Modules (api.js, ui.js, store.js, app.js), Tailwind CSS 3.4+
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

### 3. Docker を利用した起動
```bash
docker-compose up -d
```

## 👨‍💻 技術リファレンス (Codemaps)

詳細な設計ドキュメントは `docs/CODEMAPS/` に集約されています。
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロジェクト全体の俯瞰図とモジュール構成
- [**backend.md**](./docs/CODEMAPS/backend.md) - 自律進化ジョブと API / MCP ロジック
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - 統合エディタと Fluent デザインの実装
- [**API.md**](./docs/API.md) - 同期 API (`/api/sync-settings`) と MCP の仕様

---
*Aegis AI Hub - Precision Engineering for Intellectual Excellence. 🚀*
