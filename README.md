# Aegis AI Hub 🛡️🤖 - v5.2 NEXUS

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 シリーズ** を中枢に、Windows 11 の **Mica Glassmorphism** デザインと高度な自律エージェントを融合させたプロダクション・エディション。

## 🌟 Aegis v5.2 NEXUS の主要な進化点

### 1. Windows 11 Native Glass (Mica)
デスクトップと調和する、次世代のビジュアル体験。
- **Mica Integration**: Windows 11 ネイティブのすりガラス効果を Electron で実現。
- **Refined Transparency**: 背景色 `#101112` と 20% の透過率により、視認性と審美性を両立。
- **Sidebar Aesthetic**: 洗練された白色のガラス素材を採用したサイドバーデザイン。

### 2. 進化した UI アーキテクチャ (Robust UI)
プロダクション品質の安定性と使い勝手を追求。
- **React Portals**: `CustomDialog` に採用。画面のどこからでも完璧に中央配置される堅牢なオーバーレイ。
- **Global Control**: `Ctrl+Q` による安全なアプリケーション終了や、`Ctrl+K` のコマンドパレット。
- **High-Quality Assets**: `v5.2 NEXUS` 専用の新しいアセット群とマルチサイズ・アイコン。

### 3. 即戦力の知識ベース (Knowledge Out-of-the-box)
インストールした瞬間から、最高品質の情報が流れ込みます。
- **Default Data Sets**: ゲーム、AI、PCハードウェア、オーディオ、XR等の専門的なカテゴリとフィードを内蔵。
- **Autonomous Discovery**: あなたの興味に基づき、AI が自律的に新しい情報源を探索し続けます。


## 🛠 テックスタック

- **Core**: Electron (Mica Enabled), Node.js, TypeScript
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
```bash
cd dashboard
npm install              # 依存関係のインストール
npm run electron:dev     # 開発モードで起動 (HMR有効)
npm run electron:build   # インストーラーの生成 (release/ に出力)
```

### ビルドスクリプトの詳細
- `build`: フロントエンド (Vite) のプロダクションビルド。
- `build:electron`: メインプロセスの esbuild バンドル生成。
- `dist`: フロントエンドとメインプロセスのビルドを行い、インストーラーを作成。
- `electron:build`: `dist` のエイリアス。

## 👨‍💻 技術リファレンス (Codemaps)

詳細な設計ドキュメントは `docs/CODEMAPS/` に集約されています。
- [**INDEX.md**](./docs/CODEMAPS/INDEX.md) - プロダクション構成とデータフローの全体像
- [**backend.md**](./docs/CODEMAPS/backend.md) - esbuild バンドル, API キー永続化, IPC ハンドラー
- [**frontend.md**](./docs/CODEMAPS/frontend.md) - System Settings タブ, UI/UX デザインパターン
- [**automation.md**](./docs/CODEMAPS/automation.md) - パッケージング手順, E2E テスト

---
*Aegis AI Hub - Precision Engineering for Intellectual Excellence. 🚀*
