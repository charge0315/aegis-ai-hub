# Frontend UI Codemap

**Last Updated:** 2026-05-12
**Version:** v5.4.0 Aegis Chroma
**Entry Point:** `src/main.tsx`

## 概要
Aegis AI Hub v5.4.0 Aegis Chroma のフロントエンドは、Windows 11 の **Acrylic Glassmorphism** を採用しています。
最新アップデートでは、**マルチテーマ・アーキテクチャ (Aegis Chroma)** を導入。ライトモードとダークモードの切り替えに完全対応し、ユーザーのデスクトップ環境や好みに合わせた視覚体験を提供します。

## ビジュアル・アーキテクチャ

### 1. Aegis Chroma (Multi-Theme System)
テーマ制御を司る「知覚レイヤー」の設計：
- **CSS Variable System**: 色彩設計をハードコードせず、`:root` (Light) および `[data-theme="dark"]` セレクタに基づいた CSS 変数群に集約。
  - `--surface-base`: ウィンドウ全体の背景色。
  - `--surface-panel`: パネル要素の背景色。
  - `--text-base` / `--text-muted`: 基本テキストと補助テキストの色。
  - `--glass-bg` / `--glass-border`: Glassmorphism の質感と境界線。
- **Theme Engine (`App.tsx`)**: 
  - `theme` ステート（`light` | `dark` | `system`）による集中管理。
  - `window.matchMedia` を用いた OS の配色設定とのリアルタイム同期。
  - `document.documentElement` への属性注入による、再レンダリングを最小限に抑えた高速なテーマ反映。
- **Color Scheme Support**: `color-scheme` プロパティの制御により、ブラウザのネイティブ要素（スクロールバーやフォームコントロール）も各テーマに最適化。

### 2. Acrylic Glassmorphism & Windows 11 Integration
Windows 11 のネイティブな素材感を実現するためのレイヤー構造：
- **Base Layer**: Electron の `backgroundMaterial: 'acrylic'` を適用。
- **App Background**: CSS 変数 `--surface-base` を基調としつつ、不透明度を 95% 前後に調整 (`.window-base`)。
- **Unified Transparency**: ヘッダーの背景をサイドバーと同じ `sidebar-glass` に統一。

### 3. UI Robustness & Dialogs
- **Inline Dialog System**: `CustomDialog` を `App.tsx` 内にインライン配置。
- **Precision Positioning**: サイドバーの幅を考慮した動的オフセット計算。
- **Non-blocking UX**: AI探索等の長時間処理用に、ボタンのない専用のローディング画面を実装。

## コア・コンポーネント

| コンポーネント | 役割 | 特徴 |
| :--- | :--- | :--- |
| `App.tsx` | ルートレイアウト | 統一された透過デザイン、**Theme Engine**、ビュー切り替え。 |
| `CustomDialog.tsx` | 汎用ダイアログ | 精密な中央配置。**`loading` タイプ**に対応。 |
| `ArticleCard.tsx` | 記事カード | CSS 変数を用いた動的な色設定。不透明度 75% の最適化。 |
| `UnifiedEditor.tsx` | 設定管理 | **`theme` ステートの伝搬**と保存の統括。 |
| `editors/SystemSettings.tsx` | システム設定 | **Theme Customization (Aegis Chroma)** の UI 実装。 |
| `editors/CategoryEditor.tsx` | カテゴリ編集 | 各カテゴリのブランド・キーワードの編集。 |
| `editors/AIInsightsPanel.tsx` | トレンド管理 | **Archivist エージェント**が抽出したトレンドの昇格・却下制御。 |
| `KnowledgeGraph.tsx` | 知識可視化 | 興味関心の相関関係を D3.js 風のグラフで視覚化。 |
| `SkillRegistry.tsx` | スキル一覧 | **「Add New Skill」ボタン**による機能拡張インターフェース。 |

## インテリジェント機能
- **多言語サポート (Intelligent Multi-language Support)**: 
  - **自動判定ロジック**: `ScraperFacade` において、正規表現 `/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/` を用いて、ひらがな・カタカナ・漢字の有無から日本語記事を自動識別します。
  - **`isJapaneseOnly` ステート**: ヘッダーのトグルスイッチで制御される React ステート。
  - **優先表示・ソートロジック**: `App.tsx` の `filteredArticles` において、日本語記事（`language: 'ja'`）を常に最上位へソート。
  - **動的フィルタ**: トグル有効時、非日本語記事を即座に UI から排除し、情報の純度を高める。
- **初回起動セットアップ (Setup Guard)**:
  - **`localStorage` 管理**: `nexus_initialized` キーを用いて初回起動を判定。
  - **上書き保護レイヤー**: 初回起動かつ既存の `interests.json` がある場合、`dialogConfirm` による確認プロセスを強制。ユーザーが構築したブランド・キーワード設定の消失を防ぎます。
- **Deep AI Restructure v2**: 既存のカテゴリ・フィードを分析し、10個の最適なカテゴリへの再編と高品質な RSS ソースの自動注入をワンクリックで実行。**並列検証**と **Google News フォールバック**により安定性が飛躍的に向上。
- **AI Insights v2**: ユーザーの閲覧傾向から AI が自動抽出した新しい興味キーワードを提示。単なるキーワードだけでなく、**「なぜ重要なのか（Context）」**や**「確信度（Confidence）」**を表示し、ユーザーの意思決定を支援。
- **AI Discovery Trigger**: サイドバーのカテゴリ名をクリックすることで、Gemini API による新規フィード探索を即座に開始。
- **Command Palette**: `Ctrl + K` によるクイックアクセス。
- **Global Exit**: `Ctrl + Q` による安全なアプリケーション終了。
