import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export type LicenseTier = 'free' | 'pro';

export interface LicenseState {
  tier: LicenseTier;
  licenseKey: string | null;
  email: string | null;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  gracePeriodUntil: string | null;
}

export interface FeatureGate {
  aiInsights: boolean;
  aiDiscover: boolean;
  aiRestructure: boolean;
  aiCategorySuggest: boolean;
  knowledgeGraphEdit: boolean;
  dataExport: boolean;
  unlimitedCategories: boolean;
  unlimitedFeeds: boolean;
  autoRecovery: boolean;
}

const GRACE_PERIOD_DAYS = 3;
const MAX_FREE_CATEGORIES = 3;
const MAX_FREE_FEEDS = 20;

const GUMROAD_VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID ?? 'aegis-nexus-pro';

const HMAC_SECRET = process.env.LICENSE_HMAC_SECRET ?? 'aegis-nexus-local-secret';

/**
 * LicenseManager: Free/Proのライセンス状態を管理するシングルトンクラス。
 *
 * - Gumroad APIによるオンライン検証（起動時・定期的に実施）
 * - 検証失敗時は3日間のオフライン猶予期間（GracePeriod）を付与
 * - HMAC署名でローカルキャッシュの改ざんを検知
 * - 機能ゲート（FeatureGate）でFree/Pro間の差別化を定義
 */
export class LicenseManager {
  private static _instance: LicenseManager | null = null;
  private _state: LicenseState;
  private _statePath: string;

  private constructor(dataDir: string) {
    this._statePath = path.join(dataDir, 'license.json');
    this._state = this._defaultState();
  }

  static getInstance(dataDir: string): LicenseManager {
    if (!LicenseManager._instance) {
      LicenseManager._instance = new LicenseManager(dataDir);
    }
    return LicenseManager._instance;
  }

  private _defaultState(): LicenseState {
    return {
      tier: 'free',
      licenseKey: null,
      email: null,
      expiresAt: null,
      lastVerifiedAt: null,
      gracePeriodUntil: null,
    };
  }

  // ── ローカル永続化 ──────────────────────────────────────────────

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this._statePath, 'utf8');
      const parsed = JSON.parse(raw);

      // HMAC整合性チェック
      const { _sig, ...data } = parsed;
      const expected = this._sign(data);
      if (_sig !== expected) {
        console.warn('[LicenseManager] ライセンスファイルの署名が不正です。リセットします。');
        this._state = this._defaultState();
        return;
      }
      this._state = data as LicenseState;
    } catch {
      this._state = this._defaultState();
    }
  }

  async save(): Promise<void> {
    const data = { ...this._state };
    const _sig = this._sign(data);
    await fs.writeFile(this._statePath, JSON.stringify({ ...data, _sig }, null, 2), 'utf8');
  }

  private _sign(data: object): string {
    return crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  // ── Gumroad検証 ─────────────────────────────────────────────────

  async activate(licenseKey: string, email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(GUMROAD_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ product_id: GUMROAD_PRODUCT_ID, license_key: licenseKey }),
      });
      const json = await res.json() as { success: boolean; purchase?: { email: string; subscription_ended_at?: string } };

      if (!json.success) {
        return { success: false, message: 'ライセンスキーが無効です。' };
      }

      this._state = {
        tier: 'pro',
        licenseKey,
        email: json.purchase?.email ?? email,
        expiresAt: json.purchase?.subscription_ended_at ?? null,
        lastVerifiedAt: new Date().toISOString(),
        gracePeriodUntil: null,
      };
      await this.save();
      return { success: true, message: 'Pro版のライセンスが有効化されました。' };
    } catch (e) {
      return { success: false, message: `検証中にエラーが発生しました: ${String(e)}` };
    }
  }

  async verify(): Promise<void> {
    if (!this._state.licenseKey) return;

    try {
      const result = await this.activate(this._state.licenseKey, this._state.email ?? '');
      if (!result.success) {
        // オフライン猶予を付与（まだ猶予がなければ新規設定）
        if (!this._state.gracePeriodUntil) {
          const until = new Date();
          until.setDate(until.getDate() + GRACE_PERIOD_DAYS);
          this._state.gracePeriodUntil = until.toISOString();
          await this.save();
        }
      }
    } catch {
      // ネットワーク不通 — 猶予期間チェックのみ
    }

    // 猶予期間切れのチェック
    if (this._state.gracePeriodUntil && new Date() > new Date(this._state.gracePeriodUntil)) {
      console.warn('[LicenseManager] 猶予期間が終了しました。Free版に降格します。');
      this._state.tier = 'free';
      await this.save();
    }
  }

  async deactivate(): Promise<void> {
    this._state = this._defaultState();
    await this.save();
  }

  // ── 状態参照 ────────────────────────────────────────────────────

  get tier(): LicenseTier {
    // 猶予期間内はProを維持
    if (this._state.tier === 'pro') return 'pro';
    if (this._state.gracePeriodUntil && new Date() < new Date(this._state.gracePeriodUntil)) {
      return 'pro';
    }
    return 'free';
  }

  get isPro(): boolean {
    return this.tier === 'pro';
  }

  get state(): LicenseState {
    return { ...this._state };
  }

  getFeatureGates(): FeatureGate {
    const pro = this.isPro;
    return {
      aiInsights: pro,
      aiDiscover: pro,
      aiRestructure: pro,
      aiCategorySuggest: pro,
      knowledgeGraphEdit: pro,
      dataExport: pro,
      unlimitedCategories: pro,
      unlimitedFeeds: pro,
      autoRecovery: pro,
    };
  }

  canUseFeature(feature: keyof FeatureGate): boolean {
    return this.getFeatureGates()[feature];
  }

  get maxCategories(): number {
    return this.isPro ? Infinity : MAX_FREE_CATEGORIES;
  }

  get maxFeeds(): number {
    return this.isPro ? Infinity : MAX_FREE_FEEDS;
  }
}
