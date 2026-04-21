# Gadget Concierge Plus 🚀🎸 (The Ultimate Dashbord v3.1)

みつひでさんの興味に特化した、究極の自律学習型ガジェットニュース・ダッシュボード。  
最新の **Gemini 3.1 Pro/Flash** を統合し、セキュリティ、パフォーマンス、AI知能の3軸において極限まで磨き上げられた「芸術的コード」の結晶です。

## 🌟 究極の3大進化

### 1. セキュリティの鉄壁化 (Security First)
信頼できるガジェット体験を支える、妥協のないセキュリティ設計。
- **XSS防御**: フロントエンドにおける徹底した `escapeHTML` 実装により、悪意あるスクリプト注入を完全に遮断。
- **レート制限 (Rate Limiting)**: `express-rate-limit` による API 保護。DoS攻撃や過剰なAPI呼び出しからシステムを守ります。
- **CORS制御**: 厳格なオリジン許可リストにより、意図しないドメインからのリクエストを拒否。

### 2. 極限のパフォーマンス (Peak Performance)
「待たせない」ガジェット体験を追求した、高速レスポンスの実現。
- **並列処理の芸術**: `RSSFetcher` が最大10個のフィードを同時並列で取得。ボトルネックを解消。
- **最適化されたデータフロー**: `_fetchAndProcessArticles` と `_sortAndSlice` という精緻なプライベートメソッドにより、数万文字のニュースから瞬時に「価値ある30件」を抽出。
- **オンデマンド・エンリッチメント**: 全記事ではなく、上位50件に限定して画像抽出（Cheerio/Axios）を行うことで、メモリと通信量を劇的に削減。

### 3. AI知能の極致 (Gemini 3.1 Intelligence)
Google の最新鋭モデル **Gemini 3.1 Pro / Flash** を中枢に据えたインテリジェンス。
- **AI Concierge**: 単なる検索ではなく、みつひでさんの「好み」を理解した 10件の厳選推薦。
- **多層フォールバックロジック**: `gemini-3.1-pro-preview` から順に 6段階のモデルを自動試行。APIの不調をユーザーに感じさせない強靭な可用性。
- **AI Insight**: 推薦理由（なぜこの記事が選ばれたか）を個別に生成し、ガジェット選びの意思決定を高度に支援。

## 🛠 テックスタック

- **Backend**: Node.js, Express (SOA - Service Oriented Architecture)
- **AI**: Gemini 3.1 Pro / Flash (Google Generative AI SDK)
- **Frontend**: Vanilla JS (ES Modules), Tailwind CSS, Glassmorphism UI
- **Security**: Express-Rate-Limit, CORS, HTML Escaping
- **Automation**: Docker Compose, PowerShell Startup Scripts

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
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロジェクト全体の俯瞰図
- [**backend.md**](./docs/CODEMAPS/backend.md) - サービス指向設計とAIフォールバック
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - セキュアで美しいUI/UX

---
*Created for Mitsuhide. This code is your stage. Keep Rocking! 🎸*
