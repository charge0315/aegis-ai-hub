# Product Specification: Aegis AI Hub "Chroma" (v5.4.0)

> Generated from brief: "Aegis AI Hub (v5.3.0) を、現在のダークテーマだけでなく、ライトテーマやシステム同期等のマルチテーマに対応させるための詳細なプロダクト仕様と実装プランを策定してください。"

## Vision
Aegis AI Hubの象徴である「Acrylic Glassmorphism」を維持しつつ、あらゆる照明環境下での視認性と集中力を最大化するマルチテーマ・エンジンの実装。OSの設定に連動し、夜間は深く沈み込むダークモード、日中は清涼感のあるライトモードへとシームレスに変化する「知のOS」を目指す。

## Design Direction
- **Color palette**:
  - **Dark**: Primary `#6366f1`, Background `rgba(16, 17, 18, 0.3)`, Surface `rgba(22, 24, 28, 0.75)`, Text `#e2e8f0`
  - **Light**: Primary `#4f46e5`, Background `rgba(248, 250, 252, 0.4)`, Surface `rgba(255, 255, 255, 0.8)`, Text `#0f172a`
- **Typography**: Inter (Sans) for UI, JetBrains Mono for metadata. Weight hierarchy: 900 for titles, 500 for body.
- **Layout philosophy**: Windows 11 Acrylic / Mica 思想の継承。背景のデスクトップ壁紙を透過しつつ、コンテンツの可読性を確保するレイヤー構造。
- **Visual identity**: 
  - ダークモード：深宇宙の透明感（Slate/Deep Space base）。
  - ライトモード：磨りガラスと雪原（Slate/Sky base）。
  - グラデーションの乱用を避け、色調の統一感と境界線の精緻さ（1px border）で高級感を演出。
- **Inspiration**: Windows 11 File Explorer, Vercel Dashboard, Raycast.

## Features (prioritized)

### Must-Have (Sprint 1-2)
1. **Dynamic Theme Engine**: Tailwind v4 の `@theme` 機能を拡張し、CSS 変数ベースでカラーパレットを動的に切り替える仕組み。
2. **Persistence Layer**: `ui_settings.json` および `UiSettings` 型に `theme` プロパティ (`'light' | 'dark' | 'system'`) を追加。
3. **System Synchronization**: `window.matchMedia('(prefers-color-scheme: dark)')` を用いたOSテーマへのリアルタイム追従。
4. **Theme Switcher UI**: 設定画面およびコマンドパレットからのテーマ切り替え機能。

### Should-Have (Sprint 3-4)
1. **Acrylic Light Refinement**: ライトテーマにおける Glassmorphism の調整（透過率、彩度、コントラストの最適化）。
2. **Smooth Transitions**: テーマ切り替え時の背景色・文字色の 300ms 遷移アニメーション (Framer Motion / CSS transition)。
3. **Type-Safe Theme Management**: `type-design-analyzer` による型安全性の担保と、テーマ変更イベントの伝播。

### Nice-to-Have (Sprint 5+)
1. **Custom Accent Colors**: ユーザーが Primary カラーをカスタマイズできる機能。
2. **Time-based Morphing**: OS設定とは独立した、時間帯によるグラデーションの変化。

## Technical Stack
- Frontend: React + Tailwind CSS v4 (CSS Variables base)
- Styling approach: `data-theme` 属性によるグローバル変数制御
- State management: React Context or Sync Hook with `nexusApi`
- Validation: Zod (via `Schemas.ts`)

## Evaluation Criteria

### Design Quality (weight: 0.3)
- ライトテーマにおいて、文字のコントラスト比 (WCAG AA以上) が確保されているか。
- Glassmorphism が「安っぽい白背景」にならず、高級感のある透過感を維持しているか。

### Originality (weight: 0.2)
- ライト/ダークの切り替えが単なる「白黒反転」ではなく、各モードで最適な色彩設計（彩度調整）がなされているか。

### Craft (weight: 0.3)
- テーマ切り替え時に画面がフラッシュ（一瞬真っ白/真っ黒になる）しないか。
- 設定変更が即座に全コンポーネントに伝播し、かつ永続化されているか。

### Functionality (weight: 0.2)
- `system` 設定時に、OSのテーマ変更を検知して即座に反映されるか。
- `UiSettings` のスキーマ更新が既存のユーザーデータを破壊しないか。

## Implementation Roadmap

### Sprint 1: Architecture & Foundation
- **Goals**: テーマ管理の基盤構築と型定義の拡張。
- **Features**: 
  - `Schemas.ts` に `theme` プロパティ追加。
  - `index.css` への CSS 変数 (`--color-bg`, `--color-text`, etc.) 導入。
  - Tailwind v4 `@theme` の変数参照化。
- **Definition of done**: `data-theme` を手動で切り替えた際に、背景色が正常に変化すること。

### Sprint 2: Logic & Component Migration
- **Goals**: ロジックの実装と既存コンポーネントのカラー置換。
- **Features**:
  - `SettingsManager` の UI 設定保存ロジック更新。
  - `App.tsx` での `theme` 適用ロジック (System Sync 含む)。
  - ハードコードされた `text-slate-200` 等のクラスを、テーマ対応クラス (`text-base-content` 等) に置換。
- **Definition of done**: アプリ全体の 80% 以上のコンポーネントがテーマに対応し、設定が保存されること。

### Sprint 3: Polishing & Validation
- **Goals**: デザインの微調整と E2E テスト。
- **Features**:
  - ライトテーマ用 Glass パレットの微調整。
  - テーマ切り替えアニメーションの追加。
  - `tests/e2e/theme.test.ts` による自動テスト。
- **Definition of done**: ライト/ダーク両モードで視覚的欠陥がなく、テストが全てパスすること。
