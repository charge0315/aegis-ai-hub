import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LicenseManager, type LicenseState } from '../../src/services/LicenseManager';
import fs from 'fs/promises';
import crypto from 'crypto';

// fs/promises のモック
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const HMAC_SECRET = process.env.LICENSE_HMAC_SECRET ?? 'aegis-nexus-local-secret';

function createSignedJson(data: LicenseState): string {
  const _sig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
  return JSON.stringify({ ...data, _sig }, null, 2);
}

describe('LicenseManager', () => {
  let manager: LicenseManager;
  const dataDir = './test-data';
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // シングルトンのリセット
    (LicenseManager as unknown as { _instance: LicenseManager | null })._instance = null;
    vi.stubGlobal('fetch', mockFetch);
    manager = LicenseManager.getInstance(dataDir);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('getInstance & Singleton', () => {
    it('should return the same instance when called multiple times', () => {
      const instance2 = LicenseManager.getInstance(dataDir);
      expect(instance2).toBe(manager);
    });

    it('should initialize with default free state', () => {
      expect(manager.state).toEqual({
        tier: 'free',
        licenseKey: null,
        email: null,
        expiresAt: null,
        lastVerifiedAt: null,
        gracePeriodUntil: null,
      });
      expect(manager.isPro).toBe(false);
      expect(manager.tier).toBe('free');
    });
  });

  describe('load', () => {
    it('should load valid signed state correctly', async () => {
      const savedState: LicenseState = {
        tier: 'pro',
        licenseKey: 'PRO-12345',
        email: 'user@example.com',
        expiresAt: '2026-12-31T23:59:59Z',
        lastVerifiedAt: '2026-10-01T00:00:00Z',
        gracePeriodUntil: null,
      };

      vi.mocked(fs.readFile).mockResolvedValueOnce(createSignedJson(savedState));

      await manager.load();

      expect(manager.state).toEqual(savedState);
      expect(manager.isPro).toBe(true);
    });

    it('should reset to default state if signature is invalid (tampered file)', async () => {
      const tamperedJson = JSON.stringify({
        tier: 'pro',
        licenseKey: 'HACKED-KEY',
        email: 'hacker@example.com',
        expiresAt: null,
        lastVerifiedAt: null,
        gracePeriodUntil: null,
        _sig: 'invalid-hex-signature-value',
      });

      vi.mocked(fs.readFile).mockResolvedValueOnce(tamperedJson);

      await manager.load();

      expect(manager.tier).toBe('free');
      expect(manager.state.licenseKey).toBeNull();
    });

    it('should fallback to default state on ENOENT or read failure', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      await manager.load();

      expect(manager.tier).toBe('free');
      expect(manager.state.licenseKey).toBeNull();
    });

    it('should fallback to default state on malformed JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValueOnce('Invalid JSON string content');

      await manager.load();

      expect(manager.tier).toBe('free');
    });
  });

  describe('save', () => {
    it('should write signed state to file', async () => {
      await manager.save();

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall[0]).toContain('license.json');
      const writtenData = JSON.parse(writeCall[1] as string);
      expect(writtenData._sig).toBeDefined();
      expect(writtenData.tier).toBe('free');
    });
  });

  describe('activate', () => {
    it('should activate pro tier when Gumroad returns success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: {
            email: 'pro-buyer@example.com',
            subscription_ended_at: '2027-01-01T00:00:00Z',
          },
        }),
      });

      const result = await manager.activate('VALID-KEY-123', 'fallback@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pro版のライセンスが有効化されました');
      expect(manager.isPro).toBe(true);
      expect(manager.state.licenseKey).toBe('VALID-KEY-123');
      expect(manager.state.email).toBe('pro-buyer@example.com');
      expect(manager.state.expiresAt).toBe('2027-01-01T00:00:00Z');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should return failure when Gumroad returns success: false', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
        }),
      });

      const result = await manager.activate('INVALID-KEY', 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('ライセンスキーが無効です。');
      expect(manager.isPro).toBe(false);
    });

    it('should handle network errors during activation gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network connection timeout'));

      const result = await manager.activate('SOME-KEY', 'user@example.com');

      expect(result.success).toBe(false);
      expect(result.message).toContain('検証中にエラーが発生しました');
      expect(manager.isPro).toBe(false);
    });
  });

  describe('verify', () => {
    it('should do nothing if licenseKey is null', async () => {
      await manager.verify();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should keep pro tier if verification succeeds', async () => {
      // 事前にアクティベート
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.activate('KEY-123', 'user@example.com');

      // verify の実行
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.verify();

      expect(manager.isPro).toBe(true);
      expect(manager.state.gracePeriodUntil).toBeNull();
    });

    it('should grant 3 days grace period when verification fails for the first time', async () => {
      // 事前にアクティベート
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.activate('KEY-123', 'user@example.com');

      // verify で失敗（Gumroad が false を返す）
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
        }),
      });

      await manager.verify();

      expect(manager.state.gracePeriodUntil).not.toBeNull();
      // 猶予期間内なので tier は pro を維持
      expect(manager.tier).toBe('pro');
    });

    it('should downgrade to free when grace period has expired', async () => {
      // 事前にアクティベート
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.activate('KEY-123', 'user@example.com');

      // 過去の猶予期間を強制セット
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
      (manager as unknown as { _state: LicenseState })._state.gracePeriodUntil = pastDate;

      // verify で失敗
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false }),
      });

      await manager.verify();

      expect(manager.state.tier).toBe('free');
      expect(manager.tier).toBe('free');
      expect(manager.isPro).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should reset license state to default and save', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.activate('KEY-123', 'user@example.com');
      expect(manager.isPro).toBe(true);

      await manager.deactivate();

      expect(manager.isPro).toBe(false);
      expect(manager.state.licenseKey).toBeNull();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('FeatureGate & Limits', () => {
    it('should return strict free gates and limits for Free tier', () => {
      expect(manager.tier).toBe('free');
      expect(manager.isPro).toBe(false);

      const gates = manager.getFeatureGates();
      expect(gates.aiInsights).toBe(false);
      expect(gates.aiDiscover).toBe(false);
      expect(gates.aiRestructure).toBe(false);
      expect(gates.aiCategorySuggest).toBe(false);
      expect(gates.knowledgeGraphEdit).toBe(false);
      expect(gates.dataExport).toBe(false);
      expect(gates.unlimitedCategories).toBe(false);
      expect(gates.unlimitedFeeds).toBe(false);
      expect(gates.autoRecovery).toBe(false);

      expect(manager.canUseFeature('aiInsights')).toBe(false);
      expect(manager.maxCategories).toBe(3);
      expect(manager.maxFeeds).toBe(20);
    });

    it('should return unrestricted gates and limits for Pro tier', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          purchase: { email: 'user@example.com' },
        }),
      });
      await manager.activate('KEY-123', 'user@example.com');

      expect(manager.tier).toBe('pro');
      expect(manager.isPro).toBe(true);

      const gates = manager.getFeatureGates();
      expect(gates.aiInsights).toBe(true);
      expect(gates.aiDiscover).toBe(true);
      expect(gates.unlimitedCategories).toBe(true);
      expect(gates.unlimitedFeeds).toBe(true);

      expect(manager.canUseFeature('aiInsights')).toBe(true);
      expect(manager.canUseFeature('dataExport')).toBe(true);
      expect(manager.maxCategories).toBe(Infinity);
      expect(manager.maxFeeds).toBe(Infinity);
    });

    it('should maintain Pro features while within grace period', () => {
      // tier は free だが gracePeriodUntil が未来の場合
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString();
      (manager as unknown as { _state: LicenseState })._state = {
        tier: 'free',
        licenseKey: 'KEY-123',
        email: 'user@example.com',
        expiresAt: null,
        lastVerifiedAt: null,
        gracePeriodUntil: futureDate,
      };

      expect(manager.tier).toBe('pro');
      expect(manager.isPro).toBe(true);
      expect(manager.canUseFeature('aiInsights')).toBe(true);
      expect(manager.maxCategories).toBe(Infinity);
    });
  });
});
