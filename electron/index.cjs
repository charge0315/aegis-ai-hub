const { app } = require('electron');
const path = require('path');

/**
 * Aegis Nexus Electron Entry Point
 * 開発環境では esbuild-register を使用して TypeScript を動的に読み込み、
 * パッケージ環境ではビルド済みの JavaScript を使用します。
 */

if (app.isPackaged) {
  // パッケージ化されている場合は、ビルド済みの bundle を読み込む
  require('./main.bundle.cjs');
} else {
  // 開発環境では TypeScript をそのまま読み込めるようにする
  require('esbuild-register');
  require('./main.cjs');
}
