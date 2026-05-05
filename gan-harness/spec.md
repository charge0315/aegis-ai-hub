# Product Specification: Aegis Image Enrichment System (AIES)

> Generated from brief: "記事フィードから画像が直接取得できない場合（RSSに画像URLが含まれていない場合など）、記事のリンク先URLをスクレイピングして、適切な画像（OGP画像など）を取得し、ダッシュボード上に表示するように機能を拡張したい。"

## 1. Vision (ビジョン)
Aegis AI Hub のダッシュボードにおける視覚体験を最大化します。RSSフィードに含まれないアイキャッチ画像を、記事のリンク先からインテリジェントに抽出・補完することで、すべての記事が「インテリジェンス・シグナル」として相応しい、豊かでプロフェッショナルな外観を持つようにします。

## 2. 現状分析 (Current Situation)
- **記事収集**: `ScraperFacade.fetchAndProcessArticles` が RSS フィードを収集。
- **画像取得**: `EnrichmentService.extractBasicImage` が RSS タグ（media:content 等）から取得を試みる。
- **画像補完**: `EnrichmentService.enrich` がトップ50記事に対して実行される。現在は `axios` + `cheerio` で基本的な OGP 取得を試みているが、キャッシュがなく、毎回スクレイピングが発生するため効率と堅牢性に課題がある。
- **表示**: `ArticleCard` が画像を表示。画像がない場合はカテゴリ別のグラデーションフォールバックを表示。

## 3. 改修計画 (Renovation Plan)

### A. スクレイピング戦略の高度化 (Scraper Strategy)
`EnrichmentService.ts` 内のスクレイピングロジックを強化し、以下の優先順位で画像を探索します。

1.  **OGP画像**: `meta[property="og:image"]`
2.  **Twitter画像**: `meta[name="twitter:image"]`
3.  **メタ画像**: `meta[name="image"]`, `meta[name="thumbnail"]`
4.  **リンク要素**: `link[rel="image_src"]`
5.  **本文内画像 (Heuristics)**: 
    - `<article>`, `<main>`, `.post-content`, `.entry-content` 等の主要コンテンツ領域を特定。
    - 領域内の最初の `<img>` タグのうち、バナーやアイコンではないもの（サイズや拡張子で判定）を採用。

### B. バックエンドの変更 (Backend Changes)

#### 1. `ImageCacheManager` の新設
スクレイピング結果を永続化し、同じURLに対して何度もリクエストを送るのを防ぎます。
- **保存先**: `data/image_cache.json`
- **データ構造**: `Map<string, { img: string, timestamp: number }>`
- **TTL**: 7日間程度。

#### 2. `EnrichmentService` の機能拡張
- `p-limit` を導入し、並列スクレイピングの同時実行数を制限（推奨: 5-10）。
- User-Agent をブラウザに近いものに設定し、ブロックを回避。
- 相対URLの絶対URL変換をより堅牢に（URLクラスを使用）。

#### 3. `ScraperFacade` の調整
- ダッシュボード構築時だけでなく、記事の初回登録時（DiscoveryService等）にも必要に応じてエンリッチメントを適用できるように設計。

### C. フロントエンドの変更 (Frontend Changes)
- **`ArticleCard`**: 画像読み込み中のプレースホルダー（Skeleton Screen等）の検討（現在はグラデーションフォールバック）。

## 4. Technical Stack
- **Library**: `axios` (HTTPリクエスト), `cheerio` (HTMLパース), `p-limit` (並列制御)
- **Cache**: File-system based JSON cache

## 5. Evaluation Criteria (評価指標)

### デザイン品質 (Design Quality) - weight: 0.3
- ほとんどの記事に画像が表示され、ダッシュボードの「歯抜け」感が解消されているか。
- フォールバックグラデーションが不自然に多用されていないか。

### 確実性 (Reliability) - weight: 0.3
- 代表的なテック系サイト（Zenn, Qiita, TechCrunch等）から正しく画像が抽出できているか。
- 相対パス画像が正しく表示されるか。

### パフォーマンス (Performance) - weight: 0.2
- キャッシュ導入により、2回目以降のダッシュボード表示が高速化されているか。
- `p-limit` によりサーバー負荷が制御されているか。

### 堅牢性 (Craft) - weight: 0.2
- 404エラーやタイムアウトが発生しても、システム全体が停止せず、適切にフォールバックされるか。

## 6. Sprint Plan

### Sprint 1: Core Scraping & Caching
- `ImageCacheManager` の実装と `EnrichmentService` への統合。
- `axios` + `cheerio` による OGP 抽出ロジックの強化。
- `p-limit` による並列実行制御の導入。

### Sprint 2: Heuristics & Refinement
- コンテンツ領域からの画像抽出ロジック（本文内画像）の追加。
- 異常系（タイムアウト、サイズ過小画像）のハンドリング改善。
- フロントエンドでの表示確認と調整。

## 7. 検証計画 (Test Cases)
1. **OGPあり記事**: 正しく `og:image` が取得できること。
2. **OGPなし/Twitterのみ記事**: 正しく `twitter:image` が取得できること。
3. **画像タグのみ記事**: 本文内の最初の適切な画像が取得できること。
4. **相対パス画像**: 絶対URLに変換され、正しく表示できること。
5. **キャッシュ動作**: 同じURLの2回目の要求時に、HTTPリクエストが発生せずキャッシュから即座に返ること。
6. **エラーハンドリング**: 404やタイムアウト時に、安全にカテゴリ別プレースホルダーにフォールバックすること。
