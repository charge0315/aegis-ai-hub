# Frontend UI Codemap

**Last Updated:** 2026-06-05
**Version:** 5.2 NEXUS
**Entry Point:** `dashboard/src/main.tsx`

## 概要
Aegis AI Hub v5.2 NEXUS のフロントエンドは、Windows 11 のデザイン言語を継承した「Mica Glassmorphism」を採用しています。透明度とブラーを緻密に調整し、プロダクション品質の視覚体験を提供します。

## ビジュアル・アーキテクチャ

### 1. Mica Glassmorphism & Windows 11 Integration
Windows 11 のネイティブな素材感を実現するためのレイヤー構造：
- **Base Layer**: Electron の `backgroundMaterial: 'mica'` により、デスクトップ背景が透過する高級感のあるテクスチャを確保。
- **App Background**: `#101112` に 20% の不透明度 (`rgba(16, 17, 18, 0.2)`) を適用し、背後の Mica 素材を活かしつつ視認性を確保。
- **Sidebar**: 白色の薄いガラス効果 (`rgba(255, 255, 255, 0.02)`) を採用し、メインコンテンツとの視覚的分離を洗練。

### 2. UI Robustness (React Portals)
モーダルやダイアログの表示品質を担保するため、`CustomDialog` は **React Portals** を使用して `document.body` に直接レンダリングされます。
- **メリット**: 親要素の `overflow: hidden` や `z-index`、スクロール状態に依存せず、常に画面中央に完璧にオーバーレイされます。
- **アニメーション**: `framer-motion` と組み合わせ、スムーズな出現・消失エフェクトを実現。

### 3. Assets & Branding
- **New Icons**: `app-icon.png` (180/192/512), `logo-shield.png` を各所に配置。
- **Favicons**: マルチサイズ対応の favicon セットを `public/` に配置。
- **v5.2 NEXUS**: ヘッダーおよびサイドバーに一貫したブランド名とバージョンを表示。

## コア・コンポーネント

| コンポーネント | 役割 | 特徴 |
| :--- | :--- | :--- |
| `App.tsx` | ルートレイアウト | サイドバーのガラス効果、ビュー切り替え、グローバル状態管理。 |
| `CustomDialog.tsx` | 汎用ダイアログ | **React Portals** 実装。情報、エラー、確認、入力（Prompt）に対応。 |
| `ArticleCard.tsx` | 記事カード | ホバー時の微細な発光エフェクト、スコアに応じたバッジ表示。 |
| `UnifiedEditor.tsx` | 設定管理 | System Settings タブでの API キー管理とカテゴリ編集。 |

## インタラクション
- **Command Palette**: `Ctrl + K` で呼び出し。クイックナビゲーションとコマンド実行。
- **Global Exit**: `Ctrl + Q` により、Electron メインプロセス経由で安全にアプリケーションを終了。
- **Responsive**: ウィンドウサイズに応じたサイドバーの折りたたみ機能。
