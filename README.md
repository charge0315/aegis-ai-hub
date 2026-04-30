# Aegis AI Hub 🛡️🤖 - v5.1 Nexus Evolution

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 シリーズ** を中枢に、多言語翻訳と洗練された UI インタラクションを統合した、インテリジェンス・エージェントの決定版。

## 🌟 Aegis v5.1 の主要な進化点

### 1. 多言語対応と自動翻訳 (Global Intelligence)
世界中の情報をシームレスに。
- **インテリジェント翻訳**: 海外の RSS フィードから取得した英語記事を、Gemini が文脈を維持したまま日本語へ自動翻訳。
- **ローカライズ・プレフィックス**: 翻訳済み記事には `[JP]` を付与し、一目で判別可能。

### 2. フレキシブル・ビュー & 信号パネル
ユーザーの「今」のニーズに合わせた情報密度。
- **表示サイズ切り替え (S / M / L)**: 記事カードのサイズを 3 段階で即座に変更可能。大量の信号を俯瞰する Small モジュールから、詳細を読み込む Large モジュールまで対応。
- **カテゴリ信号パネル**: カテゴリ見出しをクリックすることで、背後で動作している RSS フィードの稼働状況やエラー状態をリアルタイムに確認可能。

### 3. Nexus Editor v2 (チップ形式リファクタリング)
設定画面のユーザー体験を大幅に向上。
- **チップ形式のブランド・ワード管理**: キーワードやブランドをタグ（チップ）として視覚化。インプレース編集や簡単な削除に対応。
- **ドラッグ＆ドロップ再構成**: カテゴリの表示順序を直感的なドラッグ操作で変更可能。

### 4. プロダクション級の堅牢性 (Stabilization)
- **ファイル IO の安定化**: Windows/Docker 環境での `EBUSY` エラーを回避するため、リトライロジック付きの堅牢な書き込み処理を実装。
- **ウィンドウ状態の完全な永続化**: サイズ、位置、表示設定をシームレスに保存・復元。

## 🛠 テックスタック

- **Backend**: Node.js, Fastify, TypeScript
- **AI**: Gemini 3.1 Pro Preview / Flash (Multilingual Translation & Structured Output)
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
