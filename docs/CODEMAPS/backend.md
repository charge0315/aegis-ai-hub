# Backend Architecture Codemap

**Last Updated:** 2026-06-05
**Version:** v5.2 NEXUS
**Entry Point:** `dashboard/electron/index.cjs` (Hybrid Entry)

## 概要
バックエンド（Electron メインプロセス）は、プロダクション環境でのパフォーマンス最適化に加え、Windows 11 の最新機能への対応と、専門的な知識ベースの初期セットアップを自動化する仕組みを備えています。

## システム・インテグレーション

### 1. Windows 11 Native Glass (Mica)
`BrowserWindow` の設定により、Windows 11 標準の Mica 効果を有効化しています：
- `backgroundMaterial: 'mica'`: ウィンドウ背面にシステムレベルの半透明効果を適用。
- `backgroundColor: '#101112'`: Mica 素材と調和する深みのある背景色を指定。
- `frame: false`: カスタムタイトルバーの実装により、スナップレイアウトを維持しつつモダンな外観を提供。

### 2. グローバル・ショートカット
アプリケーションのライフサイクル管理のため、以下のシステムショートカットを登録しています：
- `CommandOrControl+Q`: アプリケーションを安全に終了。未保存のデータ損失を防ぎつつ、プロセスを確実にクリーンアップします。

## データ・マイグレーションと初期化

### 1. SettingsManager (デフォルト・データ)
初回起動時に、AI、ゲーム、PCハードウェア、オーディオ等の専門的な知識ベースを自動生成します。
- **知識ベース**: `SettingsManager.ts` 内に定義された 7 つの主要カテゴリ、数百の関連ブランド、キーワードが含まれます。
- **自動セットアップ**: `interests.json` および `feed_config.json` が存在しない場合、これらの高品質な初期設定が自動的に `AppData` 内に展開されます。

### 2. API キーの永続化 (`credentials.json`)
ユーザー個別の Gemini API キーを `credentials.json` で管理し、GeminiService への動的な供給を可能にしています。

## コア・サービス構成

| サービス名 | 役割 | v5.2 における進化 |
| :--- | :--- | :--- |
| `SettingsManager` | 設定とデータの永続化 | **膨大な専門知識ベースの初期化ロジック**、アトミック保存。 |
| `GeminiService` | AI 推論 | 最新の Gemini 3.1 をサポート。動的な API キー更新に対応。 |
| `DiscoveryService` | 自律フィード探索 | ユーザーの興味に基づき、Web 上から新規 RSS を自動発見。 |
| `NexusOrchestrator` | 全体制御 | 定期的なエージェント・スキャンのスケジュールと競合制御。 |

## 配布とビルド (electron-builder)
- **アイコン管理**: `public/app-icon.png` をインストーラーおよび実行ファイルのアイコンとして適用。
- **NSIS インストーラー**: Windows 向けのクリーンなインストール体験を提供。
- **プロダクション・パス**: 全てのデータは `%APPDATA%/aegis-nexus/` 配下に隔離され、ポータビリティと安全性を確保。
