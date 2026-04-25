# Product Specification: Aegis AI Hub (Autonomous Evolution)

> Generated from brief: "自律型AIニュースハブ「Aegis AI Hub」の機能拡張。AIによるサイト発見と自動進化サイクルの実装。"

## Vision
「ユーザーが探さなくても、最高に刺さる情報が向こうからやってくる」。
Aegis AI Hubは、単なるRSSリーダーではなく、ユーザーの興味と世界のトレンドをリアルタイムに同期させ、自律的に情報収集網を最適化し続ける「生きている」ダッシュボードへと進化します。

## Design Direction
- **Color palette**: 
  - **Background**: `#05070a` (Deep Obsidian)
  - **Primary**: `#00f2ff` (Electric Cyan) - 進化やAI活動の象徴
  - **Accent**: `#ff0055` (Neon Rose) - 新発見やアクションが必要な項目
  - **Text**: `#e0e0e0` (Silver Grey)
- **Typography**: 
  - UI: "Inter", sans-serif (可読性重視)
  - Data/Status: "JetBrains Mono" (システム感の演出)
- **Layout philosophy**: 
  - **"Evolutionary Sidebar"**: 画面左側にAIの思考ログ（どのフィードを追加したか、どんなトレンドを見つけたか）を表示。
  - **"Dynamic Interest Cloud"**: ユーザーの興味をタグクラウド形式で表示し、AIが提案した新興味は点滅や強調表示。
- **Visual identity**: ガラスモーフィズムとネオンの発光エフェクトを多用し、AIが背後で稼働している感覚を演出。AI生成のグラデーションは避け、ソリッドな線と発光をベースにする。

## Features (prioritized)

### Must-Have (Sprint 1-2)
1. **AI Discovery Engine**: `interests.json`を解析し、Geminiに新しいRSSフィードを提案させる機能。
   - **Acceptance Criteria**: 提案されたURLに対して`RSSFetcher`で自動疎通確認を行い、成功したものだけを`feed_config.json`の`pool`に追加する。
2. **Autonomous Rebuild Job**: 週次で稼働するバックグラウンドジョブ。
   - **Acceptance Criteria**: エラー率の高いフィードのパージ、`pool`からの昇格、新フィードの補充を一気通貫で行う。
3. **Interest Refiner**: `interests.json`内の重複排除、古くなったキーワードの自動整理。
4. **Trend Hunter**: 取得した最新記事のタイトル・概要から、ユーザーの既存の興味に近い「新しいキーワードやブランド」をGeminiが抽出する。

### Should-Have (Sprint 3-4)
1. **Evolution Dashboard**: AIが行った改善（追加/削除したフィード、提案した興味）を時系列で確認できるUI。
2. **User Feedback Loop**: AIの提案（新興味）に対して、ユーザーが「採用/却下」をワンクリックで選べるUI。
3. **Feed Health Matrix**: フィードごとの「鮮度（更新頻度）」と「適合率（ユーザーの興味への合致度）」をスコアリングし、視覚化する。

### Nice-to-Have (Sprint 5+)
1. **Predictive Discovery**: 特定のガジェット発表イベント（例：Apple Event）を予見し、一時的に関連ソースを強化する。
2. **AI-Generated Summary**: 複数の記事にまたがるトレンドを1つのサマリー記事としてAIが書き起こす。

## Technical Stack
- **Frontend**: Vanilla JS, CSS (Tailwind CSS導入検討), Chart.js (健康状態の可視化)
- **Backend**: Node.js (Express)
- **AI**: Google Gemini 1.5 Pro / Flash
- **Key libraries**: `rss-parser`, `node-cron` (定期ジョブ), `zod` (スキーマ検証), `axios`

## Evaluation Criteria

### Design Quality (weight: 0.3)
- 「AIが自律的に動いている」というワクワク感があるか。
- 単なるリスト表示ではなく、進化のプロセスが美しく視覚化されているか。

### Originality (weight: 0.2)
- 既存の「静的なRSSリーダー」の枠を超え、情報源自体がユーザーに合わせて変化する独自性。
- Geminiのプロンプトエンジニアリングにより、ノイズの少ない質の高いサイト発見ができているか。

### Craft (weight: 0.3)
- エラーハンドリング（サイトがRSSを提供していない場合の安全なスキップなど）。
- ファイル書き込みのアトミック性（`write-file-atomic`の適切な使用）。
- ログ出力の丁寧さ（何が起きたか追跡可能か）。

### Functionality (weight: 0.2)
- `interests.json` の更新が正しく反映されるか。
- 週次ジョブが期待通りに設定ファイルを書き換えるか。

## Sprint Plan

### Sprint 1: Discovery Foundation
- **Goals**: AIによるサイト発見の仕組みと、疎通テスト機能の実装。
- **Features**: `DiscoveryService`の実装、`GeminiService`への拡張、`FeedManager`のアップデート。
- **Definition of done**: 特定のカテゴリを指定すると、AIが5-10の有効なRSSフィードを提案し、設定ファイルに保存される。

### Sprint 2: Autonomous Evolution
- **Goals**: 定期実行ジョブと興味の自動整理機能の実装。
- **Features**: `EvolutionJob`の実装、トレンド抽出エンジン。
- **Definition of done**: 週次ジョブを手動キックした際、設定ファイルのクリーニングと新興味の提案が生成される。

### Sprint 3: UI & Feedback
- **Goals**: 進化の可視化とユーザー承認フローの実装。
- **Features**: Evolution Log UI, Interest Approval UI.
- **Definition of done**: ユーザーがAIの提案を確認し、ダッシュボード上で興味を確定できる。
