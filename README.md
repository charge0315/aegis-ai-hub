# Aegis AI Hub 🛡️🤖

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 Pro / Flash** を統合し、セキュリティ、自律進化、AIナレッジ再構築の3軸において極限まで磨き上げられた「芸術的コード」の結晶です。

## 🌟 究極の3大進化 (v5.0 New Features)

### 1. 自律的エコシステムの構築 (Autonomous Evolution)
システム自身が新しい知識を学習し、成長し続ける仕組みを実現。
- **AI サイト発見 (Discovery Service)**: 登録された興味（ブランド、キーワード）に基づき、Gemini 3.1 が最適な RSS フィードを世界中から探索・自動登録。
- **トレンド学習ジョブ (Evolution Job)**: 最新のニュース記事から新しいトレンドを抽出し、「学習済みキーワード」として蓄積。
- **自己修復機能**: リンク切れや無効なフィードを AI が検知し、自動的に除外または代替案を提案。

### 2. ナレッジグラフの再構築 (Knowledge Restructure)
散らばった興味を AI が整理し、最適な情報構造へ「再設計」します。
- **AI ナレッジ再構築**: `interests.json` の構造を解析し、重複の統合、カテゴリの命名変更、不足している重要キーワードの補完を一括提案。
- **対話型確定フロー**: AI の提案をフロントエンドで視覚的に確認し、ワンクリックでシステムの根幹知識を刷新。

### 3. Next-Gen ユーザーインターフェース (Modern UX)
「使いやすさ」と「美しさ」を両立した、最新のフロントエンド体験。
- **常時表示ハンバーガーメニュー**: どの画面位置からでも、一瞬で検索やカテゴリ移動ができるドロワーサイドバーへアクセス可能。
- **AI Evolution モーダル**: AI からの提案をカード形式で可視化。ワクワクする「進化」のプロセスをユーザーがコントロール。
- **Glassmorphism 2.0**: 背景の透過とブラー、グラデーションを極めた、未来的な情報体験を演出するデザイン。

## 🛠 テックスタック

- **Backend**: Node.js, Express (SOA - Service Oriented Architecture)
- **AI**: Gemini 3.1 Pro / Flash (Google Generative AI SDK) - 最新 2026年4月モデル
- **Frontend**: Vanilla JS (ES Modules), Tailwind CSS, FontAwesome 6
- **Automation**: Docker Compose, PowerShell Startup Scripts, Evolution Jobs

## 🚀 起動とセットアップ

### 1. 環境変数の設定
`server/.env` ファイルに Gemini API キーを設定。
```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. Windows スタートアップへの登録
管理者として PowerShell を開き実行：
```powershell
./scripts/startup.ps1 -Install
```

### 3. 開発モードでの起動
```bash
docker-compose up -d
```

## 👨‍💻 芸術的コード構造 (Codemaps)

詳細な設計図は `docs/CODEMAPS/` に集約されています。
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロジェクト全体の俯瞰図 (v5.0対応)
- [**backend.md**](./docs/CODEMAPS/backend.md) - 自律進化ジョブとAI再構築ロジック
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - ドロワーUIとセキュアなレンダリング

---
*Aegis AI Hub - This code is your stage. Keep Evolving! 🚀*
