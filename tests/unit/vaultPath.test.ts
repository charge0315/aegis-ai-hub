import { describe, it, expect } from 'vitest';
import { DEFAULT_OBSIDIAN_VAULT_PATH, resolveObsidianVaultPath } from '../../src/models/vaultPath';
import { UiSettingsSchema } from '../../src/models/Schemas';

describe('resolveObsidianVaultPath', () => {
  it('空や未設定なら新しい既定（Personal 保管庫）を返す', () => {
    expect(resolveObsidianVaultPath(undefined)).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
    expect(resolveObsidianVaultPath('')).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
    expect(resolveObsidianVaultPath('   ')).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
  });

  it('保存済みの旧 Personal Space は新しい既定へ読み替える（末尾の区切り・大文字小文字は問わない）', () => {
    expect(resolveObsidianVaultPath('C:\\Users\\charg\\Documents\\Personal Space')).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
    expect(resolveObsidianVaultPath('c:\\users\\charg\\documents\\personal space\\')).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
  });

  it('それ以外のパスは指定どおりに返す', () => {
    expect(resolveObsidianVaultPath('D:\\Obsidian\\MyVault')).toBe('D:\\Obsidian\\MyVault');
  });

  it('UI 設定の既定値も新しい保管庫を指す', () => {
    expect(UiSettingsSchema.parse({}).obsidianVaultPath).toBe(DEFAULT_OBSIDIAN_VAULT_PATH);
  });
});
