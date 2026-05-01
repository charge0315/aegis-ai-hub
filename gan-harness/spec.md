# Product Specification: Aegis Nexus

> Generated from brief: "リポジトリ内のすべての Markdown (.md) ファイルを読み込み、現在のプロジェクト状況を把握した上で、ゼロベースでの設計、実装、およびテストを全自動で行うための包括的な計画を策定してください。"

## Vision
Aegis Nexusは、単なるニュースアグリゲーターを超え、Gemini 3.1の高度な推論能力を核とした**「自律型知的司令塔（Intelligence Command Center）」**へと進化します。複数の専門エージェントが協調し、情報の収集、分析、構造化を完全自動で行いつつ、人間がそのプロセスを直感的に操縦できる「サイバー・フルエント」な体験を提供します。

## Design Direction
- **Color palette**: 
    - Primary: `#6366f1` (Indigo 500) - AIの知性を象徴
    - Background: `#070a13` (Deep Space) - 没入感のある暗色
    - Surface: `rgba(15, 23, 42, 0.7)` (Slate 900 Glass) - ガラス質感のパネル
    - Accent: `#10b981` (Emerald 500) - 健康状態・正常動作
    - Alert: `#f43f5e` (Rose 500) - 重要なAI提案・エラー
- **Typography**: 
    - Main: 'Inter', sans-serif - 高い視認性
    - Technical: 'JetBrains Mono' - AIの思考プロセス表示用
- **Layout philosophy**: **"Density with Clarity"**。情報は高密度に配置しつつ、モダンな余白とグラスモフィズム（背景ぼかし）によって視覚的な負荷を軽減。
- **Visual identity**: ネオンのアクセントと微細なグラデーション、Lottieによるエージェントの思考アニメーション。AIスロップ（安っぽいAI生成画像や過剰なグラデーション）を排除し、Windows 11のMicaデザインに近い洗練されたプロフェッショナルツールを目指す。
- **Inspiration**: Linear (UIの潔癖さ), Vercel Dashboard (洗練された開発者体験), Raycast (コマンドベースの操作感)。

## Features (prioritized)

### Must-Have (Sprint 1-2)
1.  **Multi-Agent Orchestration**: `Architect`, `Curator`, `Discovery`, `Archivist` の4つの専門エージェントによる自律ワークフロー。
2.  **Gemini 3.1 Native Integration**: Tool Calling (Function Calling) を活用した、動的なスキルの実行。
3.  **Unified Nexus Editor**: 「下書き」ベースの設定管理の進化版。変更箇所のビジュアル・ディファレンシャル表示。
4.  **Real-time Intelligence Feed**: カテゴリ・ブランド・重要度に基づいたMasonryレイアウトのニュースフィード。
5.  **AI Reasoning Overlay**: なぜその記事が選ばれたか、どのキーワードに反応したかを、記事カード上にツールチップで表示。
6.  **Atomic Sync Engine**: サーバーとフロントエンドの状態を完全に同期する、競合解決機能付きの同期API。

### Should-Have (Sprint 3-4)
7.  **Command Center (Ctrl+K)**: アプリ内の全操作、検索、エージェントへの指令を即座に実行できるコマンドパレット。
8.  **Interactive Knowledge Graph**: 学習したキーワードとカテゴリの関連性を可視化し、クリックで重み付けを調整可能。
9.  **Automated Quality Gates**: 実装が完了するたびに、`gan-evaluator`がPlaywrightを走らせ、UIのデグレードを自動検知。
10. **Skill Registry**: エージェントが利用可能な「スキル」を動的にプラグインとして追加・削除できるインターフェース。
11. **Dark/Light Adaptive Glass**: 環境光やOS設定に合わせた最適な透過率の自動調整。

### Nice-to-Have (Sprint 5+)
12. **Semantic Search Engine**: ベクトル埋め込みを用いた、自然言語による過去記事の全文化検索。
13. **Agent Persona Tuning**: エージェントの口調や要約のスタイルをユーザーの好みにカスタマイズ。
14. **Dashboard Widget System**: ドラッグ＆ドロップで配置可能な、AI統計やシステム監視ウィジェット。
15. **Collaborative Multi-Agent Logs**: 複数のエージェントが裏側でどのように議論して結論を出したかを表示するデバッグログ。
16. **Offline First Capability**: IndexedDBを活用した、オフライン時でも閲覧・設定変更が可能な構成。

## Technical Stack
- **Frontend**: Vite + React (TypeScript) + Tailwind CSS + Framer Motion
- **Backend**: Node.js (Fastify) + Gemini 3.1 SDK
- **Database**: SQLite (Local storage) + JSON File (Config persistence)
- **Testing**: Playwright (E2E), Vitest (Unit/Integration)

## Evaluation Criteria

### Design Quality (weight: 0.3)
- グラスモフィズムとMicaデザインが調和しているか？
- アニメーションは「うるさすぎず」、操作のフィードバックとして機能しているか？
- AIスロップ（安易なストックイラスト等）が含まれていないか？

### Originality (weight: 0.2)
- 単なるRSSリーダーではなく、「エージェントとの協調」という体験がデザインに組み込まれているか？
- インタラクティブなナレッジグラフなど、独自の視覚化試行があるか？

### Craft (weight: 0.3)
- TypeScriptの型定義が厳密か？ (no-explicit-any)
- エラーハンドリングは徹底されており、ユーザーに適切なリカバリ策を提示しているか？
- コンパイラやリンターの警告がゼロであるか？

### Functionality (weight: 0.2)
- 「下書き」からの保存、同期、AI提案の適用という一連のフローが淀みなく動作するか？
- Gemini 3.1の機能を活用し、精度の高いキュレーションが行われているか？

## Sprint Plan

### Sprint 1: Foundation & Agent Core
- **Goals**: エージェントオーケストレーションの基盤構築と、基本的なAPI/UIの結合。
- **Features**: #1, #2, #6
- **Definition of done**: エージェントが外部RSSを取得し、Gemini 3.1がそれをカテゴリ分類してJSONで返す。

### Sprint 2: Nexus UI & Draft Workflow
- **Goals**: グラスモフィズムを用いたモダンUIの実装と、設定同期システムの完成。
- **Features**: #3, #4, #5
- **Definition of done**: 「下書き」での編集内容が保存ボタンでサーバーに反映され、画面がリロードされずに更新される。

### Sprint 3: Advanced Intelligence & Interaction
- **Goals**: コマンドパレットと知識グラフの導入。
- **Features**: #7, #8, #10
- **Definition of done**: Ctrl+Kで全てのカテゴリへ移動でき、知識グラフ上でキーワードを無効化できる。

### Sprint 4: Automated QA & Validation
- **Goals**: 品質ゲートの自動化と最終的なUXの磨き上げ。
- **Features**: #9, #12
- **Definition of done**: 全ての主要フローに対しPlaywrightのテストがパスし、`gan-evaluator`が「合格」を出す。
