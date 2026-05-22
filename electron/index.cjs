const { app } = require('electron');
const path = require('path');

/**
 * Aegis Nexus Electron Entry Point
 * 
 * 【設計思想】
 * このファイルは、アプリケーションの実行環境（開発 vs パッケージ済み）に応じて
 * 適切なメインロジックを動的にロードする「ブートストラップ」の役割を担います。
 * 開発環境では TypeScript を直接実行可能にし、本番環境ではビルド済みの軽量な 
 * JavaScript を使用することで、開発効率と配布サイズ・起動速度の両立を図っています。
 */

if (app.isPackaged) {
  /**
   * パッケージ化（本番）環境:
   * 既に esbuild 等でバンドルされた JavaScript ファイルを読み込みます。
   * Node.js の標準的なモジュールロードにより、高速な起動を実現します。
   */
  require('./main.bundle.cjs');
} else {
  /**
   * 開発環境:
   * 'esbuild-register' をフックすることで、.ts ファイルをオンザフライでトランスパイルします。
   * これにより、コンパイル待ちの手間を省き、迅速なフィードバックサイクルを可能にします。
   */
  require('esbuild-register');
  require('./main.cjs');
}
