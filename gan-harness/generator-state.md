# Generator State  EIteration 001

## What Was Built
- **EnrichmentService.ts の強化**: 
    - OGP（og:image, twitter:image, meta image, thumbnail）の優先取得ロジックを実装。
    - 本文内（article, main, .post-content 等）から適切な画像を抽出するヒューリスティクスを実装。
    - 相対URLを絶対URLに自動変換する処理を追加。
- **ImageCacheManager の新設**:
    - `data/image_cache.json` を使用した永続的なキャッシュ機構を導入。
    - 同一URLに対する重複リクエストを防止し、パフォーマンスを向上。
    - TTL（7日間）による自動クリーンアップ機能を搭載。
- **並列リクエストの制御**:
    - `p-limit` を導入し、同時スクレイピング数を5に制限。サーバー負荷を適切に管理。
- **ScraperFacade の調整**:
    - ダッシュボード構築時および推薦記事生成時に、キャッシュの初期化と並列エンリッチメントを実行するように変更。
- **テストコードの追加**:
    - `EnrichmentService.test.ts` を作成し、OGP取得、キャッシュ動作、URL正規化、並列実行の正常動作を確認。

## What Changed This Iteration
- 新規機能：画像スクレイピングの高度化とキャッシュ機構。
- 改善：RSSに画像が含まれない場合でも、高確率でアイキャッチ画像が表示されるようになった。
- 安定性：並列制御により、外部サイトへの負荷を抑えつつ高速に処理可能。

## Known Issues
- 一部のサイト（画像が動的に読み込まれるSPA等）では、cheerioのみでは画像を取得できない場合がある。
- バナーや広告画像をメイン画像として誤認する可能性が僅かにある（サイズによる簡易フィルタリングは実装済み）。

## Dev Server
- URL: http://localhost:5173 (Dashboard)
- Status: running
- Command: npm run dev (in dashboard directory)
