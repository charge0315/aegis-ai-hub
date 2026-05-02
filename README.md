# Aegis AI Hub 🛡️🤖 - v5.2 NEXUS

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 シリーズ** を中枢に、Windows 11 の **Acrylic Glassmorphism** デザインと高度な自律エージェントを融合させたプロダクション・エディション。

## 🌟 Aegis v5.2 NEXUS の主要な進化点

### 1. Windows 11 Native Acrylic
デスクトップと調和する、次世代のビジュアル体験。
- **Acrylic Integration**: Windows 11 ネイティブの **Acrylic素材** を Electron で実現。
- **Refined Transparency**: 背景色 `#101112` と最適化された透過率により、視認性と審美性を両立。
- **FancyZones Support**: Windows PowerToys の FancyZones (スナップ機能) に完全対応。
- **Unified Design**: ヘッダーとサイドバーの透過デザインを統一し、シームレスな外観を提供。

### 2. Standalone Server Architecture
信頼性と柔軟性を向上させた新アーキテクチャ。
- **Fastify Backend**: MCP (Model Context Protocol) から **Fastify ベースのスタンドアロンサーバー** へ完全移行。
- **Lightweight**: `@modelcontextprotocol/sdk` への依存を排除し、フットプリントを削減。
- **Dual-Mode API**: Electron IPC だけでなく、標準的な HTTP/JSON API による操作も可能。

### 3. 進化した UI アーキテクチャ (Robust UI)
プロダクション品質の安定性と使い勝手を追求。
- **React Portals**: `CustomDialog` に採用。画面のどこからでも完璧に中央配置される堅牢なオーバーレイ。
- **Global Control**: `Ctrl+Q` による安全なアプリケーション終了や、`Ctrl+K` のコマンドパレット。
- **Vertical Scrolling**: 柔軟なレイアウトに対応する縦スクロールの最適化。
- **Background Residency**: システムトレイ常駐をサポート。ウィンドウを閉じてもバックグラウンドで動作し続け、トレイアイコンからいつでも再表示可能。
- **Auto-Launch**: Windows 起動時の自動実行をサポート。スタートアップ時にバックグラウンドで静かに起動します。

### 4. 即戦力の知識ベース (Knowledge Out-of-the-box)
インストールした瞬間から、最高品質の情報が流れ込みます。
- **Default Data Sets**: ゲーム、AI、PCハードウェア、オーディオ、XR等の専門的なカテゴリとフィードを内蔵。
- **Autonomous Discovery**: あなたの興味に基づき、AI が自律的に新しい情報源を探索し続けます。


## 🛠 テックスタック

- **Core**: Electron (Acrylic Enabled), Fastify (Backend Server), Node.js, TypeScript
- **Bundler**: esbuild (Main Process), Vite (Renderer)
- **AI**: Gemini 3.1 Pro / Flash (Dynamic Intelligence)
- **Frontend**: React 19 (Portals & Context), Tailwind CSS, Framer Motion
- **Installer**: electron-builder


## 🚀 インストールとセットアップ

### ユーザー向け手順
1. 配布されたインストーラー (`Aegis-Nexus-Setup.exe`) を実行。
2. アプリを起動し、右上の設定アイコン（歯車）をクリック。
3. **「System Settings」** タブを選択。
4. [Google AI Studio](https://aistudio.google.com/app/apikey) で取得した Gemini API キーを入力して「Apply API Key」をクリック。

### 開発者向け：ビルドと実行

#### ダッシュボード (Electron)
```bash
cd dashboard
npm install              # 依存関係のインストール
npm run electron:dev     # 開発モードで起動 (HMR有効)
npm run electron:build   # インストーラーの生成 (release/ に出力)
```

#### スタンドアロンサーバー
```bash
cd server
npm install
npm run dev              # 開発モードで起動 (http://localhost:3005)
```

### ビルドスクリプトの詳細
- `build`: フロントエンド (Vite) のプロダクションビルド。
- `build:electron`: メインプロセスの esbuild バンドル生成。
- `dist`: フロントエンドとメインプロセスのビルドを行い、インストーラーを作成。
- `electron:build`: `dist` のエイリアス。

## 👨‍💻 技術リファレンス (Codemaps)

詳細な設計ドキュメントは `docs/CODEMAPS/` に集約されています。
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロダクション構成とデータフローの全体像
- [**backend.md**](./docs/CODEMAPS/backend.md) - Fastify サーバー, API キー永続化, IPC ハンドラー
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - Acrylic デザイン, React Portals, UI 仕様
- [**automation.md**](./docs/CODEMAPS/automation.md) - パッケージング手順, E2E テスト

---
*Aegis AI Hub - Precision Engineering for Intellectual Excellence. 🚀*

