# Aegis AI Hub - System Index

**Project Status:** Production Ready (v5.3 NEXUS)
**Last Updated:** 2026-05-06

## プロジェクト概要
Aegis AI Hub は、Gemini 3.1 を中枢に据えた「自律学習型知的ダッシュボード」です。  
v5.3 NEXUS では、AI によるプロファイルの完全再構築、進捗表示の改善、および Gemini 3.1 Flash/Pro の最適化された使い分けを導入しました。

## 主要なアップデート (v5.3 NEXUS)

- **Advanced AI Restructure v2**: カテゴリの再編、既存フィードの最適な再割り当て、および高品質な RSS ソースの自動発見を統合。**並列検証ロジック (`Promise.all`)** による高速化と、AI提案ソース枯渇時の **Google News RSS への自動フォールバック** を実装。さらに、Gemini の出力を厳格にクリーンアップする **Data Normalization** により、バリデーションエラーを徹底排除。
- **AI Insights & Continuous Learning**: `Archivist` エージェントが発見したトレンドキーワードを管理・承認するための専用タブを導入。**Human-in-the-loop** 戦略に基づき、ユーザーのフィードバックによって AI のパーソナライズ精度を向上。
- **UX Progress & Non-blocking Loading**: AI による長時間処理中に詳細な進捗を表示するモーダルに加え、AI探索中のフリーズを防ぐ**「非ブロッキング・ローディング画面」**を導入。
- **Intelligent Multi-language Support**: 正規表現による日本語判定、優先ソート、および「JA Only」フィルタを実装。国内外の情報を効率的に消化可能。
- **Setup Guard**: `localStorage` を活用した初回起動検知と、既存設定の上書き防止プロセスによるデータ保護。
- **Gemini Model Optimization**: 実行直前の **API Key 即時同期** と、AIの「絞り出し」パニックを防ぐ **Schema Resilience (`minItems: 1`)** を導入。タスクの複雑さに応じて Flash と Pro を最適に使い分け。
- **Strict 10-Category Limit**: AI 出力のカテゴリ数を正確に10個に固定する制約を強化し、UI の一貫性を向上。

## 主要なアップデート (v5.2 NEXUS)

- **RSS Health Check & Auto-Recovery**: `RSSFetcher` によるバリデーションと、`FeedManager` による代替フィードへの自動昇格機能を搭載。故障したフィードを自律的に検知・置換します。
- **Image Acquisition & Caching**: `ImageCacheManager` による画像URLの永続化、`EnrichmentService` でのスクレイピング強化（Cheerio/Axios）、および `p-limit` による同時実行数制御を導入。
- **Forced Validation Guardrails**: フィードの追加や同期時にヘルスチェックを強制し、無効なフィードの登録を未然に防ぎます。
- **Adaptive Data Path Resolution**: 開発環境（プロジェクトルート）とプロダクション環境（AppData）でデータ保存先を自動的に切り替え。
- **Article Freshness Filtering**: 90日以上前の記事を自動的に除外するロジックを実装。
- **Standardized Data Set (May 2026)**: 2026年5月のトレンドに基づき、12カテゴリーのキーワードとブランドリストを大幅に充実。
- **Fastify Integrated Server**: MCP 構成から Fastify ベースの高性能サーバーへ移行し、Electron アプリケーション内へ完全統合。軽量化と単一プロジェクトによる保守性の向上を両立。



## 技術ドキュメント (Codemaps)

- [**Backend Architecture**](backend.md) - Fastify サーバー, 設定マネージャー, エージェント・オーケストレーション
- [**Frontend UI**](frontend.md) - Acrylic デザイン, React Portals, v5.2 UI 仕様
- [**API Reference**](../API.md) - Fastify & IPC API の詳細仕様
- [**Automation**](automation.md) - electron-builder によるパッケージング, E2E テスト


## システム全体俯瞰
```mermaid
graph TD
    User((User))
    
    subgraph "Aegis Nexus (Integrated App)"
        UI[Frontend: React/Vite]
        Main[Electron Main Process]
        Server[Fastify Internal Server]
        
        Main -- Spawns/Controls --> Server
        UI -- IPC --> Main
        UI -- HTTP/REST --> Server
    end
    
    subgraph "Knowledge Management (Local)"
        Config[(interests.json / feed_config.json)]
        Creds[(credentials.json)]
    end

    User <--> UI
    
    Server -- Evolution/Discovery --> GeminiAPI[Gemini 3.1 API]
    Server -- Scrape --> Feeds[External RSS]
    Server -- Update --> Config
    Server -- Update --> Creds
```

## 主要モジュール構成

### Application Core
- `electron/main.cjs`: **Acrylic 素材**を有効化したメインウィンドウ管理。Fastify サーバーの起動制御も担当。
- `src/api/server/NexusRouter.ts`: 内蔵 **Fastify サーバー** のルーティング定義。
- `src/api/nexusApi.ts`: Electron IPC と HTTP API の両対応ブリッジ。

### Intelligence & Logic (`src/`)
- `services/GeminiService.ts`: Gemini 3.1 による解析・探索ロジック。
- `core/NexusOrchestrator.ts`: 自律的なインテリジェンス・サイクルの制御。
- `agents/`: 各種自律エージェント（Architect, Archivist, etc.）。
- `jobs/`: 進化サイクルやヘルスチェック等の定期タスク。

### Data Persistence
- プロダクション環境では、OS 標準のユーザーデータ領域 (`%APPDATA%` 等) に保存されます。
- `interests.json`: カテゴリ、ブランド、キーワード。
- `feed_config.json`: AI とユーザーが共同管理する情報源。
- `credentials.json`: ユーザーが設定した API キー。Electronの `safeStorage` によってOSレベルで安全に暗号化されます。
