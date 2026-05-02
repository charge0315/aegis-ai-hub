# Frontend UI Codemap

**Last Updated:** 2026-06-15
**Version:** 5.2 NEXUS
**Entry Point:** `dashboard/src/main.tsx`

## 概要
Aegis AI Hub v5.2 NEXUS のフロントエンドは、Windows 11 の **Acrylic Glassmorphism** を採用しています。デスクトップと調和しつつ、実用的な視認性と操作性を両立させた次世代の UI を提供します。

## ビジュアル・アーキテクチャ

### 1. Acrylic Glassmorphism & Windows 11 Integration
Windows 11 のネイティブな素材感を実現するためのレイヤー構造：
- **Base Layer**: Electron の `backgroundMaterial: 'acrylic'` を適用。
- **App Background**: `#101112` を基調としつつ、Acrylic 素材を活かすために不透明度を 30% 前後に調整 (`.window-base`)。
- **Unified Transparency**: ヘッダーとサイドバーの透過デザインを統一。境界線を最小限にし、シームレスな外観を実現。
- **FancyZones Support**: `transparent: false` 設定と `thickFrame: true` により、Windows PowerToys の FancyZones (スナップ機能) に完全対応。

### 2. Layout & Scrolling
- **Vertical Scrolling**: コンテンツ量の増加に対応し、全体的な縦スクロールを最適化。
- **Smooth Scroll**: カスタムスクロールバー (`::-webkit-scrollbar`) による洗練された操作感。

### 3. UI Robustness (React Portals)
- **CustomDialog**: React Portals を使用して `document.body` に直接レンダリング。親要素のスタイルに影響されない堅牢なオーバーレイ。
- **Framer Motion**: コンポーネントの出現・消失、タブ切り替え時にスムーズなアニメーションを提供。

## コア・コンポーネント

| コンポーネント | 役割 | 特徴 |
| :--- | :--- | :--- |
| `App.tsx` | ルートレイアウト | 統一された透過デザインの管理、ビュー切り替え。 |
| `CustomDialog.tsx` | 汎用ダイアログ | **React Portals** 実装。 |
| `ArticleCard.tsx` | 記事カード | **視認性重視の Glass デザイン**。背景の不透明度を高め、テキストの可読性を向上。 |
| `UnifiedEditor.tsx` | 設定管理 | System Settings タブでの API キー管理とカテゴリ編集。 |

## API 連携 (`src/api/nexusApi.ts`)
- **Dual-Mode Bridge**: 
    - Electron 環境下では `ipcRenderer` を介した高速な通信。
    - ヘッドレス/Web 環境下では Fastify サーバーへの HTTP API 呼び出し。
- **Hook-based Data Fetching**: `useNexusSync` フックによるリアクティブなデータ取得と設定同期。
- **SSE Support**: エージェントのイベント受信に Server-Sent Events (SSE) をサポート（Web 環境用）。

## インタラクション
- **Command Palette**: `Ctrl + K` によるクイックアクセス。
- **Global Exit**: `Ctrl + Q` による安全なアプリケーション終了。
- **Window Controls**: カスタムタイトルバーによる最小化、最大化、閉じる操作。
