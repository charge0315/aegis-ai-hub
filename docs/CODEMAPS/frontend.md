# Frontend UI Codemap

**Last Updated:** 2026-04-26
**Version:** 5.0 (Unified Settings & Fluent Design)
**Entry Point:** `dashboard/src/main.tsx`

## 概要
Aegis AI Hub v5.0 のフロントエンドは、React と Vite をベースに、複雑な設定を直感的に操作できる「Nexus Editor」と、Mica/Glass-morphism を採用したモダンな UI を特徴としています。

## 統合システムエディタ (Nexus Command & Control)
設定画面 (`UnifiedEditor`) は、以下の 3 つの主要コンポーネントで構成されます。

- **Nexus Editor (Categories & Keywords)**: 
  - カテゴリの追加・削除・表示順の入れ替え機能。
  - ブランドおよびキーワードの直接編集。
  - カテゴリごとの AI 推論（Reasoning）の表示。
- **Knowledge Graph**: 興味関心のネットワークを 2D/3D で可視化。
- **Skill Registry**: 
  - エージェントが保持するスキル（RSS取得、セマンティックフィルタ、実体抽出等）の一覧表示。
  - スキルの有効/無効をワンクリックで切り替え、エージェントの挙動を直接制御。

### 「下書き（Draft）」ワークフロー
1. **ロード**: 設定画面を開くと、現在の設定が `draft` ステートにコピーされます。
2. **編集**: カテゴリの追加、キーワードの削除、スキルのトグルなどの全ての操作は `draft` に対して行われ、UI 上で即座にプレビューされます。
3. **一括保存**: 「Save Configuration」ボタンを押すと、バックエンドへ同期（`POST /api/v5/sync-settings`）され、永続化されます。

## 通信と安定性
- **SSE (Server-Sent Events)**: 
  - 自律エージェントの思考プロセスをリアルタイムにストリーミングします。
  - **ハートビート機能**: 30秒ごとのダミーデータ送信により、ブラウザやプロキシによる接続断を防止。
  - **データフォーマット**: 構造化された JSON データにより、UI 側でのパースエラーを解消。

## UI インタラクション & デザインパターン
- **Favicon**: シールドをモチーフにした新しいデザインに刷新。
- **動的なフィードバック**: 保存中や AI 解析中のステータス表示を強化。
- **Fluent デザイン**: Tailwind CSS を活用した `backdrop-blur` と `active:scale-95` による、高級感のある操作感。

## モジュール構成

| ファイル名 | 役割 | 主要コンポーネント / 関数 |
| :--- | :--- | :--- |
| `src/App.tsx` | ルーティング、グローバル状態、SSE 接続の管理。 | `App` |
| `src/components/UnifiedEditor.tsx` | 設定エディタの統合管理。下書き (Draft) ロジック。 | `UnifiedEditor` |
| `src/components/SkillRegistry.tsx` | エージェントスキルの表示と切り替え。 | `SkillRegistry` |
| `src/components/KnowledgeGraph.tsx` | カテゴリ・ワードの視覚化。 | `KnowledgeGraph` |
| `src/api/nexusApi.ts` | API 通信。`/api/v5/*` の呼び出し。 | `syncSettings`, `fetchInterests` |
