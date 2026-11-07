# Electron main process 契約テスト

現行 `electron/main.cjs` の IPC / ライフサイクル挙動を固定する特性化テスト。同じケースを Phase 3 の
`electron/main/*.ts` にも流して等価性を確かめる。

## 実行

    npx vitest run tests/unit/electron

録画 (任意。通常は何も書かない):

    CONTRACT_RECORD_DIR=<出力先> npx vitest run tests/unit/electron

legacy は `analysis/aegis-ai-hub/equivalence/legacy`、新実装は `.../new` に出し、`diff -r` で比較する。

## 構成

- `harness/types.ts`: `MainUnderTest` アダプタ型と `LoadOptions`
- `harness/fakes.ts`: 記録型フェイク (electron, updater, log, fastify, cors, 各サービス)
- `harness/legacyMain.ts`: main.cjs を `new Function` で評価する legacy ローダ (fs は os.tmpdir 配下)
- `harness/preloadChannels.ts`: preload.cjs からチャンネルを動的抽出
- `harness/record.ts`: CONTRACT_RECORD_DIR への書き出し
- `mainIpc.contract.test.ts`: アダプタだけに依存するケース

## 新実装の差し込み

`harness/newMain.ts` に `loadNewMain: MainLoader` を実装し、テストの `LOADERS` に `['new', loadNewMain]` を足す。
`vi.mock` で electron / electron-updater / electron-log / fastify / @fastify/cors / src の各サービスを
`new Fakes()` の `serviceModules()` 等に差し替え、`LoadOptions` (packaged, platform, seed*, configure) を反映し、
`whenReady` 解決後に `fakes.start()` を待つ。`KNOWN-DEFECT` コメントのあるケースは Phase 3 で意図的に変わりうる。

## ケース追加

`boot(opts)` でロードし、`observe('<case-id>', main, () => main.invoke(...))` で実行・記録、
`main.fakes.callsTo('target.method')` で呼び出しを検証する。名前または一行コメントに RULE-NNN を入れる。
