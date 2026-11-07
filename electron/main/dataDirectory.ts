import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/** 起動に必須で、欠けたり壊れたりしていたら同梱の既定値に戻すファイル（RULE-072）。 */
const REQUIRED_FILES = ['interests.json', 'feed_config.json'];

/** このサイズ未満のファイルは壊れているとみなす。 */
const MIN_VALID_SIZE_BYTES = 5;

/**
 * <userData>/data を用意し、必須ファイルが無いか壊れていれば同梱の既定値をコピーする（RULE-072）。
 * 既定値の場所は、開発中は <repo>/data、パッケージ版は resources/default-data。
 */
export function setupDataDirectory(isDev: boolean, electronDir: string): string {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');

  if (!fs.existsSync(dataDir)) {
    console.log('[Main] Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const defaultDataDir = isDev
    ? path.join(electronDir, '..', 'data')
    : path.join(process.resourcesPath, 'default-data');

  if (fs.existsSync(defaultDataDir)) {
    for (const file of REQUIRED_FILES) {
      const destPath = path.join(dataDir, file);
      const srcPath = path.join(defaultDataDir, file);
      const isMissingOrBroken = () => !fs.existsSync(destPath) || fs.statSync(destPath).size < MIN_VALID_SIZE_BYTES;
      if (fs.existsSync(srcPath) && isMissingOrBroken()) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Main] Restored default ${file} to user data directory.`);
      }
    }
  }
  return dataDir;
}
