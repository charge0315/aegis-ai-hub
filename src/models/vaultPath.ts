/**
 * ニュースを保存する Obsidian 保管庫の既定パスと、旧パスからの読み替え。
 *
 * 2026-10-27 に Personal Space を Stock・Personal・Daily の 3 保管庫へ分けた。
 * ニュース（40_Archives/News）は Personal 保管庫に置く。旧 Personal Space は凍結済みのため、
 * 保存済みの設定に旧パスが残っていたら新しい既定へ読み替える。
 */
export const DEFAULT_OBSIDIAN_VAULT_PATH = 'C:\\Users\\charg\\Documents\\Vaults\\Personal';

const LEGACY_OBSIDIAN_VAULT_PATHS = ['C:\\Users\\charg\\Documents\\Personal Space'];

const normalizeForCompare = (p: string): string => p.trim().replace(/[\\/]+$/, '').toLowerCase();

/** 空や旧パスなら新しい既定を、それ以外は指定どおりのパスを返す。 */
export const resolveObsidianVaultPath = (path?: string | null): string => {
  if (!path || !path.trim()) return DEFAULT_OBSIDIAN_VAULT_PATH;
  const key = normalizeForCompare(path);
  return LEGACY_OBSIDIAN_VAULT_PATHS.some((legacy) => normalizeForCompare(legacy) === key)
    ? DEFAULT_OBSIDIAN_VAULT_PATH
    : path;
};
