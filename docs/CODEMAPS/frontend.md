# Frontend UI Codemap

**Last Updated:** 2026-05-06
**Version:** 5.3 NEXUS
**Entry Point:** `src/main.tsx`

## 概要
Aegis AI Hub v5.3 NEXUS のフロントエンドは、Windows 11 の **Acrylic Glassmorphism** を採用しています。デスクトップと調和しつつ、実用的な視認性と操作性を両立させた次世代の UI を提供します。

## ビジュアル・アーキテクチャ

### 1. Acrylic Glassmorphism & Windows 11 Integration
Windows 11 のネイティブな素材感を実現するためのレイヤー構造：
- **Base Layer**: Electron の `backgroundMaterial: 'acrylic'` を適用。
- **App Background**: `#101112` を基調としつつ、Acrylic 素材を活かすために不透明度を 30% 前後に調整 (`.window-base`)。
- **Unified Transparency**: ヘッダーの背景をサイドバーと同じ `sidebar-glass` に統一。ウィンドウ全体での一体感を向上させ、シームレスな外観を実現。
- **FancyZones Support**: `transparent: false` 設定と `thickFrame: true` により、Windows PowerToys の FancyZones (スナップ機能) に完全対応。

### 2. Layout & Scrolling
- **Vertical Scrolling**: `overflow-x: hidden` を適用し、全体的な縦スクロールを最適化。
- **Smooth Scroll**: カスタムスクロールバー (`::-webkit-scrollbar`) による洗練された操作感。

### 3. UI Robustness & Dialogs
- **Inline Dialog System**: `CustomDialog` を `App.tsx` 内にインライン配置することで、透過ウィンドウ環境下での描画安定性を確保。
- **Precision Positioning**: サイドバーの幅を考慮した動的オフセット計算により、右側のメインコンテンツ領域の正確な中心にダイアログを表示。
- **Non-blocking UX**: AI探索等の長時間処理用に、ボタンのない専用のローディング画面を実装。`CustomDialog` の `type="loading"` プロパティにより制御。
- **AI Restructure Modal**: 長時間の AI 処理中、Phase 1 (カテゴリ再編) と Phase 2 (ソース最適化) の詳細な進捗を表示するモーダルオーバーレイを実装。UX の大幅な向上を実現。

## コア・コンポーネント

| コンポーネント | 役割 | 特徴 |
| :--- | :--- | :--- |
| `App.tsx` | ルートレイアウト | 統一された透過デザイン、インラインダイアログの管理、ビュー切り替え。 |
| `CustomDialog.tsx` | 汎用ダイアログ | 精密な中央配置と高視認性。**`loading` タイプ**による非ブロッキング表示に対応。 |
| `ArticleCard.tsx` | 記事カード | 不透明度 75% の最適化。背景のノイズを抑え、可読性を最大化。 |
| `UnifiedEditor.tsx` | 設定管理 | API キー管理、カテゴリ編集、**AI Restructure (プロファイルの完全再構築)**。 |
| `SkillRegistry.tsx` | スキル一覧 | **「Add New Skill」ボタン**による機能拡張インターフェース。 |

## インテリジェント機能
- **Deep AI Restructure**: 既存のカテゴリ・フィードを分析し、10個の最適なカテゴリへの再編と高品質な RSS ソースの自動注入をワンクリックで実行。
- **API Key Guidance**: APIキー未設定時に上部に警告バナーを表示。設定画面へのダイレクト誘導ボタンにより、スムーズなセットアップを支援。
- **AI Discovery Trigger**: サイドバーのカテゴリ名をクリックすることで、Gemini API による新規フィード探索を即座に開始。
- **Command Palette**: `Ctrl + K` によるクイックアクセス。
- **Global Exit**: `Ctrl + Q` による安全なアプリケーション終了。
