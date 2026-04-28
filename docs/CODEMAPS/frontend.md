# Frontend UI Codemap

**Last Updated:** 2026-05-15
**Version:** 5.0 (Smart Layout & Persistence)
**Entry Point:** `dashboard/src/main.tsx`

## 概要
Aegis AI Hub v5.0 のフロントエンドは、React と Vite をベースに、複雑な設定を直感的に操作できる「Nexus Editor」に加え、利用環境に最適化される「レスポンシブ・スマートレイアウト」と「ウィンドウ状態の永続化」を特徴としています。

## レスポンシブ・スマートレイアウト (Responsive Smart Layout)
ユーザーの閲覧環境（ウィンドウ幅）に応じて、UI が自動的に最適化されます。

- **コンパクトモード (幅 < 1024px)**: 
  - サイドバーが自動的に折りたたまれ、アイコンのみの表示に切り替わります。
  - ニュースグリッドが動的にカラム数を調整し、限られたスペースを最大限に活用します。
  - `AgentMonitor` がコンパクト表示に最適化され、要約情報を効率的に提示します。
- **ウィンドウ状態の永続化**:
  - ウィンドウのサイズと位置をリアルタイムで監視し、変更があるたびにバックエンド (`/api/v5/window-state`) へ保存します。
  - 次回起動時、保存された座標とサイズが自動的に適用されます。

## 視覚効果 & インタラクション (UX Enhancement)
- **ArticleCard Animation**: 
  - 記事カードが表示される際、`framer-motion` を使用した **Staggered Entrance Animation**（時間差での浮き上がり）を適用。
  - リストの読み込み時に視覚的なリズムを与え、高級感を演出します。

### 「下書き（Draft）」ワークフロー
1. **ロード**: 設定画面を開くと、現在の設定が `draft` ステートにコピーされます。
2. **編集**: カテゴリの追加、キーワードの削除、スキルのトグルなどの全ての操作は `draft` に対して行われ、UI 上で即座にプレビューされます。
3. **一括保存**: 「Save Configuration」ボタンを押すと、バックエンドへ同期（`POST /api/v5/sync-settings`）され、永続化されます。

## 通信と安定性
- **SSE (Server-Sent Events)**: 
  - 自律エージェントの思考プロセスをリアルタイムにストリーミングします。
  - **ハートビート機能**: 30秒ごとのダミーデータ送信により、ブラウザやプロキシによる接続断を防止。
  - **データフォーマット**: 構造化された JSON データにより、UI 側でのパースエラーを解消。
- **厳密なデータ同期**: 
  - `nexusApi.ts` において、`syncSettings` 時に `lastUpdated` タイムスタンプを付与し、サーバー側でのコンフリクト検知をサポート。
  - リクエストボディの構造をバックエンドの Zod スキーマと一致させることで、バリデーションエラーを未然に防ぎます。


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
