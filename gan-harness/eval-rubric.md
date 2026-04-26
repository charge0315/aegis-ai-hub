# Evaluation Rubric: Aegis-Nexus Autonomous Loop

## 1. Autonomous Loop Stability (30 points)
- **Agent Orchestration (15pts)**: 
  - [ ] `Generator` と `Evaluator` の通信が途切れることなく、Plan -> Implement -> Eval のサイクルが完走するか。
  - [ ] 無限ループやデッドロックを検知・回避する仕組みが機能しているか。
- **MCP Tool Usage (15pts)**:
  - [ ] エージェントがMCP経由でファイル操作、APIアクセスをエラーなく実行できるか。
  - [ ] 不正な操作に対するロールバック（下書きの破棄）が正常に行われるか。

## 2. Code Quality & Warnings (30 points)
- **Zero Warnings Policy (15pts)**:
  - [ ] コンパイラ（TypeScript等）やリンター（ESLint）の警告が完全にゼロであるか。
  - [ ] 正当な理由での抑制（例: `eslint-disable`）を行う場合、その理由がコメントで明記されているか。
- **TDD Compliance (15pts)**:
  - [ ] 全ての新規ロジック（特に `sync-settings` API等）に対してユニットテストが存在し、全てパスするか。
  - [ ] カバレッジ基準（80%以上等）を満たしているか。

## 3. Visual & Functional Quality (40 points)
- **UI/UX Aesthetics (20pts)**:
  - [ ] Fluent Design / Glass-morphism の原則（ぼかし効果、シャドウ、細いボーダーライン）が正確に実装されているか。
  - [ ] レスポンシブなグリッドレイアウトが全てのデバイス幅で破綻しないか。
- **Feature Completion (20pts)**:
  - [ ] 統合エディタにおける「下書き」の保存・同期処理が、フロントエンドとバックエンド間で整合性を保ちながら完了するか。
  - [ ] AI提案の受け入れ機能が正常に作動し、設定に反映されるか。

## Critical Failures (自動失格条件)
- [ ] リンター/コンパイラの警告を無視して実装を強制コミットした場合。
- [ ] エージェント間のやり取りでスタックし、人間が手動介入しないと進行不可に陥った場合。
- [ ] Windows PowerShell環境において、コマンド連結に `;` ではなく `&&` を使用している箇所が残っている場合。
