# Aegis AI Hub 🛡️🤖 - v5.2 NEXUS

ユーザーの興味に特化した、究極の自律学習型知的ニュース・ダッシュボード。  
最新の **Gemini 3.1 シリーズ** を中枢に、Windows 11 の **Acrylic Glassmorphism** デザインと高度な自律エージェントを融合させたプロダクション・エディション。

## 🌟 Aegis v5.2 NEXUS の主要な進化点

### 1. Windows 11 Native Acrylic
デスクトップと調和する、次世代のビジュアル体験。
- **Acrylic Integration**: Windows 11 ネイティブの **Acrylic素材** を Electron で実現。
- **Refined Transparency**: 背景色 `#101112` と最適化された透過率により、視認性と審美性を両立。
- **FancyZones Support**: Windows PowerToys の FancyZones (スナップ機能) に完全対応。
- **Unified Design**: ヘッダーとサイドバーの背景を `sidebar-glass` で統一し、シームレスな一体感を提供。
- **Optimized Visibility**: 記事カードの透過度を 75% に調整し、透過環境下でのテキスト可読性を最大化。

### 2. Robust RSS & Data Management
情報の信頼性と鮮度を極限まで追求。
- **Auto Health Check**: フィード取得失敗時に `RSSFetcher` が自動的にバリデーションを実行。3回連続失敗でプール内の代替ソースへ自動昇格。
- **Validation Guardrail**: フィードの新規追加や設定同期の際、必ず有効性を検証。無効な URL の登録を未然に防止。
- **Article Freshness Filter**: 3ヶ月（90日）以上前の古い記事を自動的にフィルタリング。常に最新のトレンドのみを表示。
- **Environment-Adaptive Paths**: 開発環境ではワークスペースの `data/`、パッケージ後は `%APPDATA%` を自動的に使い分ける適応型パス解決を導入。

### 3. Standalone Server Architecture
信頼性と柔軟性を向上させた新アーキテクチャ。
- **Fastify Backend**: MCP (Model Context Protocol) から **Fastify ベースのスタンドアロンサーバー** へ完全移行。
- **Lightweight**: `@modelcontextprotocol/sdk` への依存を排除し、フットプリントを削減。
- **Dual-Mode API**: Electron IPC だけでなく、標準的な HTTP/JSON API による操作も可能。
- **Dev-Sync System**: 開発環境の設定をアプリの実行環境（AppData）へ自動同期する仕組みを確立。

### 3. 進化した UI アーキテクチャ (Robust UI)
プロダクション品質の安定性と使い勝手を追求。
- **Flexible Feed Layout**: ヘッダーから記事カードのサイズ（Small/Medium/Large）と画像表示のON/OFF（テキストモード）を即座に切り替え可能。
- **Native Window Interaction**: アプリケーション上部のヘッダーやサイドバーを掴んで自由に移動・リサイズできるネイティブウィンドウと同等のドラッグ体験。
- **Inline Dialog System**: `App.tsx` へのインライン化により、透過環境下での安定性が向上。
- **Precision Positioning**: 右側メインコンテンツ領域の正確な中心にダイアログを配置。サイドバー幅を考慮した動的オフセットを採用。
- **Global Control**: `Ctrl+Q` による安全なアプリケーション終了や、`Ctrl+K` のコマンドパレット。
- **Vertical Scrolling**: `overflow-x: hidden` 調整により、レイアウトを崩さずスムーズな縦スクロールを実現。

### 4. 即戦力の知識ベース & AI Discovery
インストールした瞬間から、最高品質の情報が流れ込みます。
- **Default Data Sets**: ゲーム、AI、PCハードウェア、オーディオ、XR等の専門的なカテゴリとフィードを内蔵。
- **AI Discovery 2.0**: カテゴリ名クリックで Gemini API が新しいニュースソースを自律探索。直接的なフィード URL (RSS/Atom) をワンクリックで追加可能。
- **Smart Prompting**: サイト URL ではなく、直接的なフィードエンドポイントを優先的に取得する高度な AI プロンプトを搭載。


## 🖥️ アプリケーション外部仕様 (External Specifications)

本セクションでは、ユーザー視点での Aegis AI Hub の機能要件、UI仕様、およびシステムの振る舞いについて詳細に定義します。

### 1. アプリケーションの目的と対象ユーザー
Aegis AI Hub は、最新の技術トレンド（AI、PCハードウェア、ゲームなど）を効率的に収集・閲覧するための自律学習型知的ニュース・ダッシュボードです。ユーザー自身が情報源を管理するだけでなく、Gemini 3.1 モデルがユーザーの興味関心に基づいて新たな情報源を自律的に探索し、常に知識ベースを最新の状態にアップデートする機能を提供します。

### 2. 主要機能とユースケース仕様

#### 2.1 記事の閲覧と表示制御
*   **タイムライン表示**: 購読中のRSS/Atomフィードから収集された記事を、鮮度とスコアに基づいて時系列または関連度順にカード形式で表示します。
*   **ダイナミック・レイアウト切替**: ヘッダーのコントロールから、記事カードのサイズ（Small / Medium / Large）および画像表示のON/OFF（テキストモード）を即座に切り替えることができます。
*   **鮮度フィルタリング (Article Freshness Filter)**: 情報の陳腐化を防ぐため、公開から90日（3ヶ月）以上経過した古い記事は自動的にフィルタリングされ、UI上に表示されません。

#### 2.2 AI Discovery (自律的情報源探索)
*   **トリガー条件**: ユーザーがサイドバーにある「カテゴリ名」をクリックすることで、バックグラウンドで Gemini API (3.1 シリーズ) による探索プロセスが開始されます。
*   **自律探索と提案**: AIは指定されたカテゴリに関連する新しいニュースソースを探索し、直接購読可能なフィードURL（エンドポイント）を特定してユーザーに提案します。
*   **ワンクリック購読**: 提案された情報源は、UI上からワンクリックで `feed_config.json` に追加され、即座にダッシュボードに反映されます。

#### 2.3 フィードの自律管理とヘルスチェック
*   **自動バリデーション**: フィードの新規追加時や設定変更の保存時、バックグラウンドで `RSSFetcher` が自動的に対象URLの到達可能性とパース可否を検証します。無効なURLは登録がブロックされます。
*   **自動修復 (Auto-Recovery)**: 定期取得において3回連続でフェッチに失敗したフィード（デッドリンク等）は自動的に無効化されます。その後、システム内の代替フィードプールから関連性の高い別のソースへ自動的に昇格（置換）が行われ、情報収集の停止を防ぎます。

### 3. ユーザーインターフェース (UI) 仕様

#### 3.1 ビジュアル・デザイン (Windows 11 Native)
*   **Acrylic Glassmorphism**: アプリケーション全体に Windows 11 ネイティブのアクリル（Acrylic）透過素材効果を適用し、デスクトップ環境とシームレスに調和します。
*   **最適化された可読性**: ベース背景は `#101112`（透過率約30%）を基調とし、記事カード自体の透過率を 75% に設定。背景のノイズを抑えつつ高いテキスト視認性を確保します。
*   **統一されたヘッダー/サイドバー**: ヘッダーとサイドバーの背景色調（`sidebar-glass`）を統一し、一体感のあるUIを提供します。

#### 3.2 ウィンドウ操作とレイアウト制御
*   **ネイティブ・ドラッグ**: ヘッダーやサイドバーの空白部分を掴んでドラッグすることで、標準的なOSウィンドウと同様に自由にウィンドウを移動できます。
*   **FancyZones 対応**: スナップ機能（Windows PowerToys FancyZones等）に完全対応しており、画面の任意の領域に正確にスナップ配置が可能です。
*   **インラインダイアログ**: 全ての設定画面や通知ダイアログは別ウィンドウではなく、メインコンテンツ領域の正確な中央にインライン表示されます。

#### 3.3 キーボード・ショートカット
*   `Ctrl + K`: コマンドパレットを開き、各種操作や設定へのクイックアクセスを提供します。
*   `Ctrl + Q`: アプリケーションを安全に終了します（プロセスのクリーンアップを含む）。

### 4. セキュリティとデータ永続化仕様

*   **完全ローカル志向**: ユーザーの購読データ、設定、記事キャッシュはすべてローカルストレージに保存されます。分析のために Gemini API にデータを送信する以外、外部サーバーへのテレメトリ送信やデータ収集は一切行いません。
*   **APIキーのセキュアストレージ**: ユーザーが入力した Gemini API キーは、Electron の `safeStorage` API によって OS ネイティブの暗号化方式で暗号化され、`credentials.json` に安全に保存されます。
*   **環境適応型データパス**:
    *   **プロダクションビルド時**: ユーザーデータは `%APPDATA%/aegis-nexus/data/` に保存され、アプリアップデート時にもデータが保持されます。
    *   **開発モード時**: 開発の利便性を考慮し、プロジェクトルート直下の `data/` ディレクトリに保存されます。

## 📁 ディレクトリ構成

- **`dashboard/`**: React/Viteによるフロントエンド。Electronのエントリーポイント(`main.cjs`)とIPC用の`preload.cjs`、暗号化処理用の`ElectronSettingsManager.ts`が含まれます。
- **`server/`**: コアとなるビジネスロジック。FastifyベースのスタンドアロンAPIサーバーと、インテリジェンス・エージェント（NexusOrchestratorなど）が含まれます。
- **`docs/`**: システム仕様、API設計、開発用コードマップ等のドキュメント群。
- **`data/`**: 開発時における設定ファイル群（フィード設定、興味関心、資格情報）の保存場所（製品版は `%APPDATA%` 以下に保存）。

## 🛡️ セキュリティとプライバシー
- **暗号化**: ユーザーが登録したAPIキー(`credentials.json`)は、Electronの `safeStorage` 機構を用いてOSネイティブの暗号化によって保護されます。
- **ローカルファースト**: 全ての情報ソースや分析データはローカルに保存され、設定データが外部サーバーに送信されることはありません（Google Geminiへのプロンプト送信時を除く）。

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

