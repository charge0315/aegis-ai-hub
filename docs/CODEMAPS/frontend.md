# Frontend UI Codemap

**Last Updated:** 2026-05-20
**Version:** 5.1 (Nexus Evolution)
**Entry Point:** `dashboard/src/main.tsx`

## 概要
Aegis AI Hub v5.1 のフロントエンドは、多機能な設定エディタ「Nexus Editor」の刷新、表示サイズの柔軟な変更、およびカテゴリごとのフィード詳細を確認できる「信号パネル」機能を備えています。

## ダッシュボード機能の拡張

- **表示サイズ切り替え (S / M / L)**: 
  - ヘッダーのサイズスイッチャーにより、記事カードの大きさを 3 段階で変更可能。
  - **Small**: 2〜8列の高密度表示。
  - **Medium**: 標準的な 1〜4列表示。
  - **Large**: 1〜2列の視認性重視表示。
- **カテゴリ信号パネル (Category Signal Panel)**:
  - フィード画面のカテゴリ見出しをクリックすると、そのカテゴリに紐付いている RSS フィードのリスト（Active/Pool）やエラー状態をダイアログで表示。
- **レスポンシブ・スマートレイアウト**: 
  - 幅 1024px 未満で「コンパクトモード」へ自動移行。サイドバーのアイコン化とグリッドの動的調整。

## Nexus Editor (チップ形式リファクタリング)
設定画面 (`UnifiedEditor.tsx`) におけるブランドとキーワードの管理が、洗練されたチップ形式に刷新されました。

- **タグ形式の編集**: 
  - 各項目がカプセル状のチップとして表示され、`X` ボタンで直感的に削除可能。
  - チップ内をクリックすることで、内容を直接インプレース編集できます。
- **AI 提案の統合**: 
  - `Sparkles` アイコンから Gemini によるブランド/キーワードの自動提案をワンクリックで実行。
- **ドラッグ＆ドロップによる順序変更**: 
  - `framer-motion` (Reorder) を使用し、カテゴリの重要度（表示順）を直感的に並び替え。

## 視覚効果 & インタラクション (UX Enhancement)
- **ArticleCard Animation**: 
  - `framer-motion` を使用した **Staggered Entrance Animation**（時間差での浮き上がり）を適用。
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
