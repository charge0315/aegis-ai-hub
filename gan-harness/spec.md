# Product Specification: Aegis AI Hub v5.0 "Aegis-Nexus"

> Generated from brief: "Aegis AI Hub v5.0のすべての.mdファイルを読み込み、ゼロベースでの設計・実装・テストを全自動で行うための総合的な計画を策定してください。"

## Vision
Aegis AI Hub v5.0 "Aegis-Nexus" は、単なるニュースダッシュボードを超え、**自己進化型インテリジェンス・プラットフォーム**へと昇華します。Gemini 3.1を中枢に据え、複数の自律エージェントが「設計・実装・テスト・改善」のループを高速に回すことで、常に最新かつセキュア、そして洗練されたUI/UXを維持し続けるシステムを目指します。

## Design Direction
- **Color palette**: 
  - Primary: `#0ea5e9` (Cyber Blue)
  - Secondary: `#8b5cf6` (Intelligence Violet)
  - Background: `#020617` (Deep Space Dark)
  - Surface: `rgba(15, 23, 42, 0.8)` (Blurred Glass)
- **Typography**: 
  - Main: "Inter Variable", sans-serif
  - Mono: "JetBrains Mono" (AIステータスおよびデバッグ用)
- **Layout philosophy**: "Adaptive Neural Grid" - エージェントの活動状態や情報の重要度に応じて動的にリサイズ・再配置されるグリッドシステム。
- **Visual identity**: 
  - ガラスモーフィズムとネオンの境界線による「未来感」の演出。
  - AIの思考プロセスを可視化する「思考パーティクル」アニメーション。
- **Inspiration**: Linear, Vercel Dashboard, Cyberpunk 2077 UI.

## Features (prioritized)

### Must-Have (Autonomous Core)
1. **Multi-Agent Orchestration**: `Architect`, `Generator`, `Evaluator`, `E2E-Runner` の役割分担と協調制御。
2. **Autonomous Implementation Loop**: Plan -> Implement -> Eval -> Refine の自律サイクル。
3. **MCP-Powered Tooling**: ファイル操作、Webブラウジング、Gemini API、OS実行をMCPツール経由で統合。
4. **Unified Settings Editor (v5.0 Core)**: 「下書き」ベースの高度なシステム構成管理。

### Should-Have (Quality & Polish)
1. **TDD-Workflow Skill**: テストが通るまで実装を繰り返すテスト駆動スキルの統合。
2. **Visual Regression Bot**: UIの崩れを自動検出し、`Generator` に修正を依頼する視覚的評価。
3. **Security-Review Skill**: 実装コードに対する自動脆弱性診断と修正。
4. **Agent Status Dashboard**: エージェントが現在何をしているかをリアルタイムで表示するモニタリング画面。

### Nice-to-Have (Next-Gen)
1. **Self-Healing Infrastructure**: Dockerコンテナの不調を自律検知し、構成を修正して再起動。
2. **Keyboard-Driven Orchestration**: コマンドラインまたはショートカットからエージェントへ直接指示。
3. **Multi-Model Fallback**: Gemini 3.1 をメインとしつつ、必要に応じて他のモデル（Claude, GPT-4等）を補助的に利用。

## Technical Stack
- **Core Engine**: Node.js (Express), Gemini 3.1 Series
- **Frontend**: Tailwind CSS 3.4+, Vanilla ES Modules, Lucide Icons
- **Agents Framework**: Custom Multi-Agent Harness (GAN-style)
- **Skills**: `tdd-workflow`, `security-review`, `deployment-patterns`
- **MCP Tools**: `filesystem`, `google_search`, `playwright_browser`

## Evaluation Criteria

### Design Quality (weight: 0.25)
- Windows 11 Fluent Design の原則（Mica/Glass）が守られているか。
- レスポンシブグリッドが崩れず、どの解像度でも美しく表示されるか。

### Originality (weight: 0.25)
- AIの「思考」や「進化」が視覚的に表現されているか。
- 単なるニュースサイトではなく、次世代エージェントの拠点としての雰囲気があるか。

### Craft & Reliability (weight: 0.3)
- コードに冗長な記述がなく、コンパイラ/リンターの警告がゼロであるか。
- 自律ループが無限ループに陥らず、論理的なゴールに到達できているか。

### Functionality (weight: 0.2)
- `/api/sync-settings` を介した設定同期が100%確実に動作するか。
- MCPツール経由での外部操作がスムーズに行えるか。

## Sprint Plan: Autonomous Reconstruction

### Sprint 1: Agent Foundation
- **Goals**: 各エージェントのプロンプト定義とMCP接続。
- **Definition of Done**: `Architect` が出した指示を `Generator` がコード化し、`Evaluator` がレビューできる状態。

### Sprint 2: Core Loop Implementation
- **Goals**: 自律実装ループの実装と「下書き」エディタの構築。
- **Definition of Done**: 最小限のUI変更をエージェントが自律的に行い、テストをパスさせること。

### Sprint 3: Full Integration & Polish
- **Goals**: デザインの洗練と全機能の統合。
- **Definition of Done**: Aegis v5.0 が全自動でビルドされ、全てのE2Eテストをクリアすること。
