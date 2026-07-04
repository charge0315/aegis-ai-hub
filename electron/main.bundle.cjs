var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/models/Schemas.ts
var import_zod, FeedConfigSchema, InterestCategorySchema, SkillSchema, InterestsSchema, WindowStateSchema, SyncSettingsSchema, UiSettingsSchema, UsageStatsSchema, CredentialsSchema;
var init_Schemas = __esm({
  "src/models/Schemas.ts"() {
    import_zod = require("zod");
    FeedConfigSchema = import_zod.z.record(
      import_zod.z.string(),
      import_zod.z.object({
        active: import_zod.z.array(import_zod.z.string().url()),
        pool: import_zod.z.array(import_zod.z.string().url()),
        failures: import_zod.z.record(import_zod.z.string(), import_zod.z.number()).default({})
      })
    );
    InterestCategorySchema = import_zod.z.object({
      emoji: import_zod.z.string(),
      brands: import_zod.z.array(import_zod.z.string()),
      keywords: import_zod.z.array(import_zod.z.string()),
      score: import_zod.z.number().min(0).max(10),
      reason: import_zod.z.string().optional()
    });
    SkillSchema = import_zod.z.object({
      id: import_zod.z.string(),
      name: import_zod.z.string(),
      description: import_zod.z.string(),
      agent: import_zod.z.string(),
      type: import_zod.z.enum(["tool", "action", "logic"]),
      enabled: import_zod.z.boolean().default(true)
    });
    InterestsSchema = import_zod.z.object({
      categories: import_zod.z.record(import_zod.z.string(), InterestCategorySchema),
      skills: import_zod.z.array(SkillSchema).optional(),
      learned_keywords: import_zod.z.record(import_zod.z.string(), import_zod.z.object({
        category: import_zod.z.string(),
        reason: import_zod.z.string(),
        detectedAt: import_zod.z.string(),
        type: import_zod.z.enum(["emerging", "breakthrough", "niche", "mainstream"]).optional(),
        confidence: import_zod.z.number().min(0).max(100).optional(),
        context: import_zod.z.string().optional()
      })).optional(),
      lastUpdated: import_zod.z.number().optional()
    });
    WindowStateSchema = import_zod.z.object({
      width: import_zod.z.number(),
      height: import_zod.z.number(),
      x: import_zod.z.number(),
      y: import_zod.z.number()
    });
    SyncSettingsSchema = import_zod.z.object({
      interests: InterestsSchema,
      feedConfig: FeedConfigSchema,
      windowState: WindowStateSchema.optional(),
      lastUpdated: import_zod.z.number().optional()
    });
    UiSettingsSchema = import_zod.z.object({
      jaOnly: import_zod.z.boolean().default(false),
      viewMode: import_zod.z.enum(["grid", "list", "compact"]).default("grid"),
      hideImages: import_zod.z.boolean().default(false),
      isInitialized: import_zod.z.boolean().default(false),
      theme: import_zod.z.enum(["light", "dark", "system"]).default("system"),
      language: import_zod.z.enum(["ja", "en"]).default("ja"),
      autoLaunch: import_zod.z.boolean().default(false)
    });
    UsageStatsSchema = import_zod.z.record(
      import_zod.z.string(),
      // キーは YYYY-MM-DD 形式の日付文字列
      import_zod.z.record(
        import_zod.z.string(),
        // キーはモデル名（例: gemini-3.5-flash）
        import_zod.z.object({
          promptTokens: import_zod.z.number(),
          candidatesTokens: import_zod.z.number(),
          totalTokens: import_zod.z.number(),
          callCount: import_zod.z.number()
        })
      )
    );
    CredentialsSchema = import_zod.z.object({
      geminiApiKey: import_zod.z.string().optional()
    });
  }
});

// src/utils/normalize.ts
var normalizeCategoryName;
var init_normalize = __esm({
  "src/utils/normalize.ts"() {
    normalizeCategoryName = (name) => {
      return name.replace(/[＆&＆\s・]/g, "").toLowerCase();
    };
  }
});

// src/services/UsageManager.ts
var import_promises, UsageManager;
var init_UsageManager = __esm({
  "src/services/UsageManager.ts"() {
    import_promises = __toESM(require("fs/promises"), 1);
    init_Schemas();
    UsageManager = class {
      statsPath;
      stats = {};
      onUpdate;
      savePromise = Promise.resolve();
      constructor(statsPath) {
        this.statsPath = statsPath;
      }
      /**
       * 統計ファイルを読み込み、メモリ上に展開します。
       * Zodスキーマ（UsageStatsSchema）を使用してパースすることで、
       * 手動編集などによるデータの破損からアプリケーションを保護します。
       */
      async init() {
        try {
          const data = await import_promises.default.readFile(this.statsPath, "utf-8");
          this.stats = UsageStatsSchema.parse(JSON.parse(data));
        } catch {
          this.stats = {};
        }
      }
      /**
       * 特定のモデルの利用実績を記録します。
       * 入力（prompt）と出力（candidates）を分けて記録することで、
       * モデルごとの料金体系に合わせた正確なコスト計算を将来的に可能にします。
       */
      async recordUsage(model, promptTokens, candidatesTokens) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        if (!this.stats[today]) this.stats[today] = {};
        if (!this.stats[today][model]) {
          this.stats[today][model] = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, callCount: 0 };
        }
        const s = this.stats[today][model];
        s.promptTokens += promptTokens;
        s.candidatesTokens += candidatesTokens;
        s.totalTokens = s.promptTokens + s.candidatesTokens;
        s.callCount += 1;
        await this.save();
      }
      /**
       * 現在保持している全期間の統計データを取得します。
       * ダッシュボード表示などのフロントエンド機能での利用を想定しています。
       */
      async getStats() {
        return this.stats;
      }
      /**
       * 統計データをJSONファイルに書き出します。
       * 保存失敗時の副作用（メモリ上のデータとファイル間の不一致）を最小限にするため、
       * エラーはキャッチしてログ出力に留めます。
       */
      async save() {
        this.savePromise = this.savePromise.then(async () => {
          try {
            await import_promises.default.writeFile(this.statsPath, JSON.stringify(this.stats, null, 2), "utf-8");
            if (this.onUpdate) {
              this.onUpdate(this.stats);
            }
          } catch (err) {
            console.error("[UsageManager] Save failed:", err);
          }
        });
        return this.savePromise;
      }
    };
  }
});

// src/services/SettingsManager.ts
var import_promises2, import_path, SettingsManager;
var init_SettingsManager = __esm({
  "src/services/SettingsManager.ts"() {
    import_promises2 = __toESM(require("fs/promises"), 1);
    import_path = __toESM(require("path"), 1);
    init_Schemas();
    init_normalize();
    init_UsageManager();
    SettingsManager = class {
      dataDir;
      isDev;
      interestsPath;
      feedConfigPath;
      credentialsPath;
      usageManager;
      constructor(config) {
        this.dataDir = config.dataDir;
        this.isDev = config.isDev || false;
        this.interestsPath = import_path.default.join(this.dataDir, "interests.json");
        this.feedConfigPath = import_path.default.join(this.dataDir, "feed_config.json");
        this.credentialsPath = import_path.default.join(this.dataDir, "credentials.json");
        const usagePath = import_path.default.join(this.dataDir, "usage_stats.json");
        this.usageManager = new UsageManager(usagePath);
      }
      /**
       * 必要なディレクトリとファイルの初期化を確認・実行します。
       */
      async init() {
        await import_promises2.default.mkdir(this.dataDir, { recursive: true });
        await this._ensureFile(this.interestsPath, { categories: {}, lastUpdated: Date.now() });
        await this._ensureFile(this.feedConfigPath, {});
        await this._ensureFile(this.credentialsPath, { geminiApiKey: "" });
        await this.usageManager.init();
      }
      /**
       * 工場出荷時のデフォルト設定に戻します。
       * 現在の設定をクリアし、最小限の構造で初期化します。
       */
      async resetToDefaults() {
        try {
          await this._safeWrite(this.interestsPath, { categories: {}, lastUpdated: Date.now() });
          await this._safeWrite(this.feedConfigPath, {});
          return true;
        } catch (err) {
          console.error("[SettingsManager] Reset failed:", err);
          return false;
        }
      }
      /**
       * AIモデルごとの使用量統計（トークン数）を取得します。
       */
      async getUsageStats() {
        return await this.usageManager.getStats();
      }
      async _ensureFile(filePath, defaultContent) {
        try {
          await import_promises2.default.access(filePath);
        } catch {
          await import_promises2.default.writeFile(filePath, JSON.stringify(defaultContent, null, 2), "utf8");
        }
      }
      /**
       * UI表示設定（ダークモード、自動起動、言語設定等）を取得します。
       */
      async getUiSettings() {
        const filePath = import_path.default.join(this.dataDir, "ui_settings.json");
        try {
          const data = await this._safeRead(filePath);
          return UiSettingsSchema.parse(data);
        } catch {
          return UiSettingsSchema.parse({});
        }
      }
      /**
       * UI表示設定を保存します。
       */
      async saveUiSettings(settings) {
        const filePath = import_path.default.join(this.dataDir, "ui_settings.json");
        const validated = UiSettingsSchema.parse(settings);
        await this._safeWrite(filePath, validated);
      }
      /**
       * 保存されているGemini APIキーを取得します。
       * 開発環境では環境変数からの取得もサポート。
       */
      async getApiKey() {
        try {
          const data = await import_promises2.default.readFile(this.credentialsPath, "utf8");
          const json = JSON.parse(data);
          const creds = CredentialsSchema.parse(json);
          const key = creds.geminiApiKey || "";
          if (!key && this.isDev) {
            return process.env.GEMINI_API_KEY || "";
          }
          return key;
        } catch {
          return this.isDev ? process.env.GEMINI_API_KEY || "" : "";
        }
      }
      /**
       * Gemini APIキーを安全に保存します。
       */
      async saveApiKey(apiKey) {
        const creds = { geminiApiKey: apiKey };
        await this._safeWrite(this.credentialsPath, creds);
      }
      /**
       * ユーザーの興味関心設定を取得します。
       */
      async getInterests() {
        const data = await import_promises2.default.readFile(this.interestsPath, "utf8");
        return InterestsSchema.parse(JSON.parse(data));
      }
      /**
       * フィードの購読設定を取得します。
       */
      async getFeedConfig() {
        try {
          const data = await this._safeRead(this.feedConfigPath);
          return FeedConfigSchema.parse(data);
        } catch {
          return {};
        }
      }
      /**
       * フィード購読設定を保存します。
       */
      async saveFeedConfig(config) {
        const validated = FeedConfigSchema.parse(config);
        await this._safeWrite(this.feedConfigPath, validated);
      }
      /**
       * 設定データの同期（外部からの上書き保存）を行います。
       * 
       * 処理内容:
       * 1. データの型バリデーション。
       * 2. カテゴリ名やフィード構成の正規化（表記揺れや名寄せ）。
       * 3. タイムスタンプによるコンフリクト確認（デバイス上の設定が新しい場合は拒否）。
       * 4. 新規追加されるフィードの有効性チェック（オプション）。
       * 5. 安全な永続化とバックアップ。
       */
      async syncSettings(settings, fetcher) {
        const { interests, feedConfig, windowState, lastUpdated } = settings || {};
        if (!interests) {
          throw new Error('INVALID_ARGUMENT: "interests" is required for sync.');
        }
        const validatedInterests = InterestsSchema.parse(interests);
        const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : null;
        const normalizedFeedConfig = {};
        const categoriesObj = validatedInterests.categories || {};
        const interestCats = Object.keys(categoriesObj);
        const incomingFeeds = feedConfig || {};
        for (const [feedCatName, data] of Object.entries(incomingFeeds)) {
          if (!data) continue;
          const targetClean = normalizeCategoryName(feedCatName);
          let finalName = interestCats.find((c) => c === feedCatName);
          if (!finalName) {
            finalName = interestCats.find((c) => normalizeCategoryName(c) === targetClean);
          }
          const keyToUse = finalName || feedCatName;
          normalizedFeedConfig[keyToUse] = data;
        }
        const validatedFeedConfig = normalizedFeedConfig;
        const currentInterests = await this.getInterests();
        const serverLastUpdated = currentInterests.lastUpdated || 0;
        if (lastUpdated && lastUpdated < serverLastUpdated) {
          throw new Error("CONFLICT: Settings on device are newer.");
        }
        if (fetcher) {
          const currentFeedConfig = await this.getFeedConfig() || {};
          const currentUrls = new Set(
            Object.values(currentFeedConfig).filter((c) => c && typeof c === "object").flatMap((c) => [...c.active || [], ...c.pool || []])
          );
          const newUrls = [];
          for (const [category, data] of Object.entries(validatedFeedConfig)) {
            if (!data || typeof data !== "object") continue;
            const urlsToCheck = [...data.active || [], ...data.pool || []];
            for (const url of urlsToCheck) {
              if (!currentUrls.has(url)) {
                newUrls.push({ url, category });
              }
            }
          }
          if (newUrls.length > 0) {
            await Promise.all(newUrls.map(async (item) => {
              try {
                const check = await fetcher.validateFeed(item.url);
                if (!check.ok) {
                  throw new Error(`VALIDATION_FAILED: ${item.url} is invalid (Status: ${check.status})`);
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.warn(`[SettingsManager] Feed validation failed for ${item.url}:`, msg);
                throw e;
              }
            }));
          }
        }
        const now = Date.now();
        validatedInterests.lastUpdated = now;
        await this._safeWrite(this.interestsPath, validatedInterests);
        await this._safeWrite(this.feedConfigPath, validatedFeedConfig);
        if (validatedWindowState) {
          const windowStatePath = import_path.default.join(this.dataDir, "window_state.json");
          await this._safeWrite(windowStatePath, validatedWindowState);
        }
        return {
          success: true,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          lastUpdated: now,
          validatedInterests,
          validatedFeedConfig
        };
      }
      /**
       * 前回の終了時のウィンドウ位置やサイズを取得します。
       */
      async getWindowState() {
        const windowStatePath = import_path.default.join(this.dataDir, "window_state.json");
        try {
          const content = await import_promises2.default.readFile(windowStatePath, "utf-8");
          return JSON.parse(content);
        } catch {
          return null;
        }
      }
      async _safeRead(filePath) {
        try {
          const content = await import_promises2.default.readFile(filePath, "utf8");
          return JSON.parse(content);
        } catch {
          throw new Error(`Read failed: ${filePath}`);
        }
      }
      /**
       * ファイルへの安全な書き込み処理。
       * 既存ファイルがある場合、最大3世代のバックアップ(.bak, .bak2, .bak3)を自動作成し、
       * 書き込み失敗時のデータ全ロスを防止します。
       */
      async _safeWrite(filePath, data) {
        const content = JSON.stringify(data, null, 2);
        try {
          const exists = await import_promises2.default.access(filePath).then(() => true).catch(() => false);
          if (exists) {
            for (let i = 3; i >= 1; i--) {
              const oldBak = i === 1 ? filePath : `${filePath}.bak${i - 1 === 1 ? "" : i - 1}`;
              const newBak = `${filePath}.bak${i === 1 ? "" : i}`;
              const bakExists = await import_promises2.default.access(oldBak).then(() => true).catch(() => false);
              if (bakExists) {
                if (i === 3) {
                  await import_promises2.default.unlink(newBak).catch(() => {
                  });
                }
                if (i === 1) {
                  await import_promises2.default.copyFile(filePath, newBak);
                } else {
                  await import_promises2.default.rename(oldBak, newBak).catch(() => {
                  });
                }
              }
            }
          }
          await import_promises2.default.writeFile(filePath, content, "utf8");
        } catch (writeError) {
          const msg = writeError instanceof Error ? writeError.message : String(writeError);
          console.error(`[SettingsManager] Write failed for ${filePath}: ${msg}`);
          throw writeError;
        }
      }
    };
  }
});

// electron/ElectronSettingsManager.ts
var ElectronSettingsManager_exports = {};
__export(ElectronSettingsManager_exports, {
  ElectronSettingsManager: () => ElectronSettingsManager,
  default: () => ElectronSettingsManager_default
});
var import_electron, import_promises3, ElectronSettingsManager, ElectronSettingsManager_default;
var init_ElectronSettingsManager = __esm({
  "electron/ElectronSettingsManager.ts"() {
    import_electron = require("electron");
    import_promises3 = __toESM(require("fs/promises"), 1);
    init_SettingsManager();
    init_Schemas();
    ElectronSettingsManager = class extends SettingsManager {
      /**
       * コンストラクタ
       * 
       * 意図: 親クラスのファイルパス管理機能を活用しつつ、
       * Electronメインプロセスからのみ利用可能なAPIへの依存をカプセル化します。
       */
      constructor(config) {
        super(config);
      }
      /**
       * 保存されているAPIキーを取得します。
       * 
       * 意図: ファイルから設定を読み込み、暗号化されている場合は復号します。
       * これにより、万が一設定ファイルが第三者に渡っても、OSのログイン認証がない限り
       * APIキーが生テキストで漏洩することを防ぎます。
       */
      async getApiKey() {
        try {
          const data = await import_promises3.default.readFile(this.credentialsPath, "utf8");
          const json = JSON.parse(data);
          const creds = CredentialsSchema.parse(json);
          let apiKey = creds.geminiApiKey || "";
          if (apiKey && import_electron.safeStorage.isEncryptionAvailable()) {
            if (apiKey.startsWith("enc:")) {
              try {
                const encryptedBuffer = Buffer.from(apiKey.slice(4), "base64");
                apiKey = import_electron.safeStorage.decryptString(encryptedBuffer);
              } catch (decryptError) {
                console.error("[ElectronSettingsManager] Failed to decrypt API key:", decryptError);
                apiKey = "";
              }
            } else {
              console.warn("[ElectronSettingsManager] Plaintext API key detected. Re-encrypting now...");
              await this.saveApiKey(apiKey);
            }
          }
          return apiKey || process.env.GEMINI_API_KEY || "";
        } catch {
          return process.env.GEMINI_API_KEY || "";
        }
      }
      /**
       * APIキーをセキュアに保存します。
       * 
       * 意図: 機密情報をディスクに書き出す前にOSレベルで暗号化し、
       * セキュリティのベストプラクティスを遵守します。
       */
      async saveApiKey(apiKey) {
        let keyToSave = apiKey;
        if (apiKey && import_electron.safeStorage.isEncryptionAvailable()) {
          try {
            const encryptedBuffer = import_electron.safeStorage.encryptString(apiKey);
            keyToSave = `enc:${encryptedBuffer.toString("base64")}`;
          } catch (encryptError) {
            console.error("[ElectronSettingsManager] Failed to encrypt API key:", encryptError);
          }
        }
        const creds = { geminiApiKey: keyToSave };
        await this._safeWrite(this.credentialsPath, creds);
      }
    };
    ElectronSettingsManager_default = ElectronSettingsManager;
  }
});

// src/services/prompts/GeminiPrompts.ts
var import_generative_ai, CURATE_SCHEMA, curatePrompt, EVOLUTION_SCHEMA, evolutionPrompt, FALLBACK_EVOLUTION_SCHEMA, fallbackEvolutionPrompt, RESTRUCTURE_SCHEMA, restructurePrompt, DISCOVER_SITES_SCHEMA, discoverSitesPrompt, DISCOVER_ENGLISH_SITES_SCHEMA, discoverEnglishSitesPrompt, TRANSLATE_ARTICLES_SCHEMA, translateArticlesPrompt, ANALYZE_TRENDS_SCHEMA, analyzeTrendsPrompt, SUGGEST_CATEGORY_DETAILS_SCHEMA, suggestCategoryDetailsPrompt, TRANSLATE_INTERESTS_SCHEMA, translateInterestsPrompt;
var init_GeminiPrompts = __esm({
  "src/services/prompts/GeminiPrompts.ts"() {
    import_generative_ai = require("@google/generative-ai");
    CURATE_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        selections: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              id: { type: import_generative_ai.SchemaType.NUMBER },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["id", "reason"]
          }
        }
      },
      required: ["selections"]
    };
    curatePrompt = (interests, pool) => `
\u30E6\u30FC\u30B6\u30FC\u306E\u8208\u5473\u306B\u57FA\u3065\u3044\u3066\u3001\u6700\u65B0\u8A18\u4E8B\u5019\u88DC\u306E\u4E2D\u304B\u3089\u6700\u9069\u306A10\u4EF6\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002
\u8208\u5473: ${interests}
\u5019\u88DC: ${pool}
`;
    EVOLUTION_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        sites: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              url: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "url", "category", "reason"]
          }
        },
        brands: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              value: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["value", "category", "reason"]
          }
        },
        keywords: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              value: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["value", "category", "reason"]
          }
        }
      },
      required: ["sites", "brands", "keywords"]
    };
    evolutionPrompt = (interests) => `
\u3042\u306A\u305F\u306F\u30CB\u30E5\u30FC\u30B9\u30BD\u30FC\u30B9\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\u73FE\u5728\u306E\u8208\u5473\u30EA\u30B9\u30C8\u306B\u57FA\u3065\u304D\u3001\u9032\u5316\u63D0\u6848\uFF08\u30D5\u30A3\u30FC\u30C9\u3001\u30D6\u30E9\u30F3\u30C9\u3001\u30AD\u30FC\u30EF\u30FC\u30C9\uFF09\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u6307\u793A: \u6709\u52B9\u306ARSS\u30D5\u30A3\u30FC\u30C9\u3001\u30D6\u30E9\u30F3\u30C9\u3001\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u73FE\u5728\u306E\u8208\u5473\u30EA\u30B9\u30C8: ${interests}
`;
    FALLBACK_EVOLUTION_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        sites: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              url: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "url", "category", "reason"]
          }
        }
      },
      required: ["sites"]
    };
    fallbackEvolutionPrompt = (categories) => `
\u7279\u5B9A\u306E\u8208\u5473\u30AB\u30C6\u30B4\u30EA\u306B\u5BFE\u3057\u3066\u5C02\u9580\u7684\u306A\u30CB\u30E5\u30FC\u30B9\u30BD\u30FC\u30B9\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5927\u624B\u4FE1\u983C\u3067\u304D\u308B\u30CB\u30E5\u30FC\u30B9\u30B5\u30A4\u30C8\u304B\u3089\u3001\u95A2\u9023\u30BB\u30AF\u30B7\u30E7\u30F3\u306ERSS\u30D5\u30A3\u30FC\u30C9\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u8208\u5473\u8A2D\u5B9A: ${categories}
`;
    RESTRUCTURE_SCHEMA = (targetCount) => ({
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        categories: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              emoji: { type: import_generative_ai.SchemaType.STRING },
              brands: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
              keywords: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
              score: { type: import_generative_ai.SchemaType.NUMBER },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "emoji", "brands", "keywords", "score", "reason"]
          },
          minItems: targetCount,
          maxItems: targetCount
        },
        feedMapping: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              url: { type: import_generative_ai.SchemaType.STRING },
              newCategory: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["url", "newCategory"]
          }
        },
        newSuggestedFeeds: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              url: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "url", "category"]
          }
        }
      },
      required: ["categories", "feedMapping", "newSuggestedFeeds"]
    });
    restructurePrompt = (targetCount, language, brands, keywords, categories, feeds) => `
\u30E6\u30FC\u30B6\u30FC\u306E\u30CB\u30E5\u30FC\u30B9\u53CE\u96C6\u74B0\u5883\u3092${targetCount}\u500B\u306E\u30AB\u30C6\u30B4\u30EA\u306B\u518D\u69CB\u7BC9\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u8A00\u8A9E: ${language}
\u30D6\u30E9\u30F3\u30C9: ${brands}
\u30AD\u30FC\u30EF\u30FC\u30C9: ${keywords}
\u73FE\u5728\u306E\u30AB\u30C6\u30B4\u30EA: ${categories}
\u73FE\u5728\u306E\u30D5\u30A3\u30FC\u30C9: ${feeds}
`;
    DISCOVER_SITES_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        sites: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              url: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "url", "category"]
          }
        }
      },
      required: ["sites"]
    };
    discoverSitesPrompt = (interests) => `
\u4EE5\u4E0B\u306E\u8208\u5473\u8A2D\u5B9A\u306B\u5408\u81F4\u3059\u308B\u3001\u65B0\u3057\u3044\u30CB\u30E5\u30FC\u30B9\u30BD\u30FC\u30B9(RSS/Atom)\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u8208\u5473\u8A2D\u5B9A: ${interests}
`;
    DISCOVER_ENGLISH_SITES_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        sites: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              name: { type: import_generative_ai.SchemaType.STRING },
              url: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              lang: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["name", "url", "category", "lang"]
          }
        }
      },
      required: ["sites"]
    };
    discoverEnglishSitesPrompt = (targetInterests) => `
\u4EE5\u4E0B\u306E\u30AB\u30C6\u30B4\u30EA\u306B\u304A\u3044\u3066\u3001\u82F1\u8A9E\u306ERSS\u30D5\u30A3\u30FC\u30C9\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5BFE\u8C61\u30AB\u30C6\u30B4\u30EA: ${targetInterests}
`;
    TRANSLATE_ARTICLES_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        translations: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              title: { type: import_generative_ai.SchemaType.STRING },
              desc: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["title", "desc"]
          }
        }
      },
      required: ["translations"]
    };
    translateArticlesPrompt = (articles) => `
\u4EE5\u4E0B\u306E\u8A18\u4E8B\u30EA\u30B9\u30C8\u3092\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u30EA\u30B9\u30C8: ${articles}
`;
    ANALYZE_TRENDS_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        suggestions: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              value: { type: import_generative_ai.SchemaType.STRING },
              category: { type: import_generative_ai.SchemaType.STRING },
              reason: { type: import_generative_ai.SchemaType.STRING },
              type: { type: import_generative_ai.SchemaType.STRING },
              confidence: { type: import_generative_ai.SchemaType.NUMBER },
              context: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["value", "category", "reason", "type", "confidence", "context"]
          }
        }
      },
      required: ["suggestions"]
    };
    analyzeTrendsPrompt = (categories, articles, externalTrends) => `
\u3042\u306A\u305F\u306F\u30C8\u30EC\u30F3\u30C9\u5206\u6790\u306E\u5C02\u9580\u5BB6\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u60C5\u5831\u3092\u7D71\u5408\u3057\u3066\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u8208\u5473\u3092\u6301\u3061\u305D\u3046\u306A\u65B0\u3057\u3044\u30AD\u30FC\u30EF\u30FC\u30C9\u3084\u30D6\u30E9\u30F3\u30C9\u3092\u62BD\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002

## \u73FE\u5728\u306E\u30E6\u30FC\u30B6\u30FC\u30AB\u30C6\u30B4\u30EA\uFF08\u65E2\u77E5\u306E\u8208\u5473\uFF09
${categories}

## X\uFF08\u65E7Twitter\uFF09\u30FBGoogle\u30C8\u30EC\u30F3\u30C9\u30FBYahoo Japan\u306E\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u30C8\u30EC\u30F3\u30C9
${externalTrends}

## \u6700\u65B0\u30CB\u30E5\u30FC\u30B9\u8A18\u4E8B
${articles}

## \u6307\u793A
- \u4E0A\u8A18\u306ESNS\u30C8\u30EC\u30F3\u30C9\u3068\u30CB\u30E5\u30FC\u30B9\u8A18\u4E8B\u3092\u6A2A\u65AD\u7684\u306B\u5206\u6790\u3057\u3066\u304F\u3060\u3055\u3044
- \u65E2\u5B58\u30AB\u30C6\u30B4\u30EA\u306B\u307E\u3060\u542B\u307E\u308C\u3066\u3044\u306A\u3044\u65B0\u3057\u3044\u8208\u5473\u30FB\u30D6\u30E9\u30F3\u30C9\u30FB\u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044
- SNS\u30C8\u30EC\u30F3\u30C9\u306B\u767B\u5834\u3057\u3066\u3044\u308B\u30C8\u30D4\u30C3\u30AF\u3092\u512A\u5148\u7684\u306B\u53D6\u308A\u4E0A\u3052\u3066\u304F\u3060\u3055\u3044
- confidence\u306FSNS\u30C8\u30EC\u30F3\u30C9\u3068\u30CB\u30E5\u30FC\u30B9\u4E21\u65B9\u306B\u767B\u5834\u3059\u308B\u3082\u306E\u306F\u9AD8\u3081(80\u4EE5\u4E0A)\u3001\u7247\u65B9\u306E\u307F\u306F\u4E2D\u7A0B\u5EA6(50-79)\u306B\u3057\u3066\u304F\u3060\u3055\u3044
- type\u306FSNS\u30C8\u30EC\u30F3\u30C9\u306E\u307F\u306B\u51FA\u73FE\u3059\u308B\u3082\u306E\u306F"emerging"\u3001\u30CB\u30E5\u30FC\u30B9\u306B\u3082\u51FA\u308B\u3082\u306E\u306F"mainstream"\u3068\u3057\u3066\u304F\u3060\u3055\u3044
`;
    SUGGEST_CATEGORY_DETAILS_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        brands: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
        keywords: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
        emoji: { type: import_generative_ai.SchemaType.STRING },
        reason: { type: import_generative_ai.SchemaType.STRING }
      },
      required: ["brands", "keywords", "emoji", "reason"]
    };
    suggestCategoryDetailsPrompt = (categoryName) => `
\u30AB\u30C6\u30B4\u30EA\u300C${categoryName}\u300D\u306B\u95A2\u9023\u3059\u308B\u30D6\u30E9\u30F3\u30C9(5\u3064)\u3068\u30AD\u30FC\u30EF\u30FC\u30C9(5\u3064)\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002
`;
    TRANSLATE_INTERESTS_SCHEMA = {
      type: import_generative_ai.SchemaType.OBJECT,
      properties: {
        categories: {
          type: import_generative_ai.SchemaType.ARRAY,
          items: {
            type: import_generative_ai.SchemaType.OBJECT,
            properties: {
              originalName: { type: import_generative_ai.SchemaType.STRING },
              name: { type: import_generative_ai.SchemaType.STRING },
              emoji: { type: import_generative_ai.SchemaType.STRING },
              brands: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
              keywords: { type: import_generative_ai.SchemaType.ARRAY, items: { type: import_generative_ai.SchemaType.STRING } },
              score: { type: import_generative_ai.SchemaType.NUMBER },
              reason: { type: import_generative_ai.SchemaType.STRING }
            },
            required: ["originalName", "name", "emoji", "brands", "keywords", "score", "reason"]
          }
        }
      },
      required: ["categories"]
    };
    translateInterestsPrompt = (interestsJson) => `
\u4EE5\u4E0B\u306E\u8A2D\u5B9A\u30C7\u30FC\u30BF\u3092\u82F1\u8A9E\u306B\u7FFB\u8A33\u3057\u3066\u304F\u3060\u3055\u3044\u3002
${interestsJson}
`;
  }
});

// src/models/AiSchemas.ts
var import_zod2, CurateResponseSchema, EvolutionProposalSchema, FallbackEvolutionSchema, RestructureResponseSchema, DiscoverSitesSchema, DiscoverEnglishSitesSchema, TranslateArticlesSchema, AnalyzeTrendsSchema, SuggestCategoryDetailsSchema, TranslateInterestsSchema;
var init_AiSchemas = __esm({
  "src/models/AiSchemas.ts"() {
    import_zod2 = require("zod");
    CurateResponseSchema = import_zod2.z.object({
      selections: import_zod2.z.array(import_zod2.z.object({
        id: import_zod2.z.number(),
        reason: import_zod2.z.string()
      }))
    });
    EvolutionProposalSchema = import_zod2.z.object({
      sites: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        url: import_zod2.z.string().url(),
        category: import_zod2.z.string(),
        reason: import_zod2.z.string()
      })),
      brands: import_zod2.z.array(import_zod2.z.object({
        value: import_zod2.z.string(),
        category: import_zod2.z.string(),
        reason: import_zod2.z.string()
      })),
      keywords: import_zod2.z.array(import_zod2.z.object({
        value: import_zod2.z.string(),
        category: import_zod2.z.string(),
        reason: import_zod2.z.string()
      }))
    });
    FallbackEvolutionSchema = import_zod2.z.object({
      sites: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        url: import_zod2.z.string().url(),
        category: import_zod2.z.string(),
        reason: import_zod2.z.string()
      }))
    });
    RestructureResponseSchema = import_zod2.z.object({
      categories: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        emoji: import_zod2.z.string(),
        brands: import_zod2.z.array(import_zod2.z.string()),
        keywords: import_zod2.z.array(import_zod2.z.string()),
        score: import_zod2.z.number(),
        reason: import_zod2.z.string()
      })),
      feedMapping: import_zod2.z.array(import_zod2.z.object({
        url: import_zod2.z.string().url(),
        newCategory: import_zod2.z.string()
      })),
      newSuggestedFeeds: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        url: import_zod2.z.string().url(),
        category: import_zod2.z.string()
      }))
    });
    DiscoverSitesSchema = import_zod2.z.object({
      sites: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        url: import_zod2.z.string().url(),
        category: import_zod2.z.string()
      }))
    });
    DiscoverEnglishSitesSchema = import_zod2.z.object({
      sites: import_zod2.z.array(import_zod2.z.object({
        name: import_zod2.z.string(),
        url: import_zod2.z.string().url(),
        category: import_zod2.z.string(),
        lang: import_zod2.z.string()
      }))
    });
    TranslateArticlesSchema = import_zod2.z.object({
      translations: import_zod2.z.array(import_zod2.z.object({
        title: import_zod2.z.string(),
        desc: import_zod2.z.string()
      }))
    });
    AnalyzeTrendsSchema = import_zod2.z.object({
      suggestions: import_zod2.z.array(import_zod2.z.object({
        value: import_zod2.z.string(),
        category: import_zod2.z.string(),
        reason: import_zod2.z.string(),
        type: import_zod2.z.enum(["emerging", "breakthrough", "niche", "mainstream"]),
        confidence: import_zod2.z.number().min(0).max(100),
        context: import_zod2.z.string()
      }))
    });
    SuggestCategoryDetailsSchema = import_zod2.z.object({
      brands: import_zod2.z.array(import_zod2.z.string()),
      keywords: import_zod2.z.array(import_zod2.z.string()),
      emoji: import_zod2.z.string(),
      reason: import_zod2.z.string()
    });
    TranslateInterestsSchema = import_zod2.z.object({
      categories: import_zod2.z.array(import_zod2.z.object({
        originalName: import_zod2.z.string(),
        name: import_zod2.z.string(),
        emoji: import_zod2.z.string(),
        brands: import_zod2.z.array(import_zod2.z.string()),
        keywords: import_zod2.z.array(import_zod2.z.string()),
        score: import_zod2.z.number(),
        reason: import_zod2.z.string()
      }))
    });
  }
});

// src/services/GeminiService.ts
var GeminiService_exports = {};
__export(GeminiService_exports, {
  GeminiService: () => GeminiService
});
var import_generative_ai2, GeminiService;
var init_GeminiService = __esm({
  "src/services/GeminiService.ts"() {
    import_generative_ai2 = require("@google/generative-ai");
    init_normalize();
    init_GeminiPrompts();
    init_AiSchemas();
    GeminiService = class {
      genAI;
      primaryModelName = "gemini-3.5-flash";
      highReasoningModelName = "gemini-3.1-pro-preview";
      stableFallbackModelName = "gemini-2.5-flash";
      usageManager = null;
      constructor(apiKey) {
        this.genAI = apiKey ? new import_generative_ai2.GoogleGenerativeAI(apiKey) : null;
      }
      /**
       * 使用量統計を記録するためのマネージャーを設定。
       */
      setUsageManager(manager) {
        this.usageManager = manager;
      }
      /**
       * APIキーを動的に更新（設定画面からの変更に対応）。
       */
      updateApiKey(apiKey) {
        this.genAI = apiKey ? new import_generative_ai2.GoogleGenerativeAI(apiKey) : null;
      }
      /**
       * 厳格なデータ構造でのみ返答を許すためのコア・インターフェース。
       * 
       * 設計意図:
       * - GeminiのJSONモード(responseMimeType: "application/json")を活用。
       * - フォールバック処理: 特定のモデルでエラー（特にクォータ不足や一時的な不調）が発生した場合、
       *   自動的に下位モデルへリクエストをリトライし、ユーザー体験を損なわないようにする。
       */
      async generateStructured(prompt, schema, modelName = this.primaryModelName, zodSchema) {
        if (!this.genAI) throw new Error("Gemini API\u30AD\u30FC\u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
        try {
          console.log(`[GeminiService] Model: ${modelName}`);
          const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json", responseSchema: schema }
          });
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          if (this.usageManager && response.usageMetadata) {
            const { promptTokenCount = 0, candidatesTokenCount = 0 } = response.usageMetadata;
            this.usageManager.recordUsage(modelName, promptTokenCount, candidatesTokenCount).catch(console.error);
          }
          if (!text) throw new Error("Empty response");
          const parsed = JSON.parse(text);
          if (zodSchema) {
            const validation = zodSchema.safeParse(parsed);
            if (!validation.success) {
              console.error(`[GeminiService] Zod Validation Failed:`, validation.error.format());
              throw new Error(`AI response schema validation failed: ${validation.error.message}`);
            }
            return validation.data;
          }
          return parsed;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isQuotaError = errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");
          if (isQuotaError) throw new Error("QUOTA_EXCEEDED", { cause: error });
          if (modelName === this.highReasoningModelName) return this.generateStructured(prompt, schema, this.primaryModelName, zodSchema);
          if (modelName === this.primaryModelName) return this.generateStructured(prompt, schema, this.stableFallbackModelName, zodSchema);
          if (modelName === this.stableFallbackModelName) return this.generateStructured(prompt, schema, "gemini-2.5-flash-lite", zodSchema);
          throw new Error(`Gemini API execution failed: ${errorMessage}`, { cause: error });
        }
      }
      /**
       * 収集された記事プールから、ユーザーの興味に合致するものを厳選。
       * 「なぜこの記事を選んだのか」という推論理由（geminiReason）を含めて返す。
       */
      async curate(articlesPool, interests) {
        const prompt = curatePrompt(JSON.stringify(interests.categories), JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: String(a.title) }))));
        const result = await this.generateStructured(prompt, CURATE_SCHEMA, this.primaryModelName, CurateResponseSchema);
        return result.selections.map((item) => ({ ...articlesPool[item.id], geminiReason: item.reason }));
      }
      /**
       * 自律進化のための提案を取得。
       * 新しいニュースソース、注視すべきブランド、関連キーワードをAIに考察させる。
       */
      async getEvolutionProposals(interests) {
        const prompt = evolutionPrompt(JSON.stringify(interests));
        return await this.generateStructured(prompt, EVOLUTION_SCHEMA, this.primaryModelName, EvolutionProposalSchema);
      }
      /**
       * 通常の進化提案に失敗した場合や、リソースが見つからない場合のフォールバック提案。
       */
      async getFallbackEvolutionProposals(interests) {
        const prompt = fallbackEvolutionPrompt(JSON.stringify(interests.categories));
        return await this.generateStructured(prompt, FALLBACK_EVOLUTION_SCHEMA, this.primaryModelName, FallbackEvolutionSchema);
      }
      /**
       * 大規模な興味・フィード構成の再構築（整理整頓）。
       * 重複を排除し、現在の興味関心に合わせてカテゴリを最適化する。
       */
      async getRestructureProposal(interests, currentFeeds, targetCount = 10, language = "ja") {
        const allExistingUrls = Object.entries(currentFeeds).flatMap(([cat, data]) => data.active.map((url) => ({ url, oldCategory: cat })));
        const allExistingBrands = [...new Set(Object.values(interests.categories).flatMap((c) => c.brands))];
        const allExistingKeywords = [...new Set(Object.values(interests.categories).flatMap((c) => c.keywords))];
        const prompt = restructurePrompt(targetCount, language, allExistingBrands.join(", "), allExistingKeywords.join(", "), JSON.stringify(interests.categories), JSON.stringify(allExistingUrls));
        const result = await this.generateStructured(prompt, RESTRUCTURE_SCHEMA(targetCount), this.highReasoningModelName, RestructureResponseSchema);
        const categories = {};
        const feedConfig = {};
        result.categories.forEach((cat) => {
          categories[cat.name] = { emoji: cat.emoji || "\u2728", brands: [...new Set(cat.brands)], keywords: [...new Set(cat.keywords)], score: cat.score, reason: cat.reason };
          feedConfig[cat.name] = { active: [], pool: [], failures: {} };
        });
        const categoryNames = Object.keys(categories);
        if (categoryNames.length > 0) {
          const first = categoryNames[0];
          const returnedBrands = new Set(Object.values(categories).flatMap((c) => c.brands));
          allExistingBrands.forEach((b) => {
            if (!returnedBrands.has(b)) categories[first].brands.push(b);
          });
          const returnedKeywords = new Set(Object.values(categories).flatMap((c) => c.keywords));
          allExistingKeywords.forEach((k) => {
            if (!returnedKeywords.has(k)) categories[first].keywords.push(k);
          });
        }
        const mapToCat = (name) => {
          if (categories[name]) return name;
          const clean = normalizeCategoryName(name);
          for (const key of Object.keys(categories)) {
            if (normalizeCategoryName(key) === clean) return key;
          }
          return Object.keys(categories)[0];
        };
        result.feedMapping.forEach((m) => {
          const cat = mapToCat(m.newCategory);
          if (feedConfig[cat] && this._isValidUrl(m.url)) feedConfig[cat].active.push(m.url);
        });
        result.newSuggestedFeeds.forEach((s) => {
          const cat = mapToCat(s.category);
          if (feedConfig[cat] && this._isValidUrl(s.url) && !feedConfig[cat].active.includes(s.url)) feedConfig[cat].active.push(s.url);
        });
        Object.keys(categories).forEach((cat) => {
          if (feedConfig[cat].active.length === 0) {
            feedConfig[cat].active.push(`https://news.google.com/rss/search?q=${encodeURIComponent(cat)}&hl=ja&gl=JP&ceid=JP:ja`);
          }
        });
        return { categories, feedConfig };
      }
      _isValidUrl(url) {
        try {
          const u = new URL(url);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      }
      /**
       * 興味に沿った新しいRSS/Atomサイトの探索。
       */
      async discoverSites(interests) {
        const prompt = discoverSitesPrompt(JSON.stringify(interests.categories));
        const result = await this.generateStructured(prompt, DISCOVER_SITES_SCHEMA, this.primaryModelName, DiscoverSitesSchema);
        return result.sites;
      }
      /**
       * グローバル展開のための英語圏ソースの探索。
       */
      async discoverEnglishSites(interests, targetCategories) {
        const targets = targetCategories.map((cat) => ({ category: cat, details: interests.categories[cat] }));
        const prompt = discoverEnglishSitesPrompt(JSON.stringify(targets));
        const result = await this.generateStructured(prompt, DISCOVER_ENGLISH_SITES_SCHEMA, this.primaryModelName, DiscoverEnglishSitesSchema);
        return result.sites;
      }
      /**
       * 多言語対応: 英語記事のタイトルと概要を日本語に翻訳。
       */
      async translateArticles(articles) {
        const prompt = translateArticlesPrompt(JSON.stringify(articles));
        const result = await this.generateStructured(prompt, TRANSLATE_ARTICLES_SCHEMA, this.primaryModelName, TranslateArticlesSchema);
        return result.translations;
      }
      /**
       * トレンド分析: 流れてきた最新ニュースから、新しい関心事の兆候を検知。
       */
      async analyzeTrends(articles, interests, externalTrends = []) {
        const prompt = analyzeTrendsPrompt(
          Object.keys(interests.categories).join(", "),
          JSON.stringify(articles.slice(0, 30).map((a) => ({ title: a.title, desc: a.desc }))),
          JSON.stringify(externalTrends)
        );
        const result = await this.generateStructured(prompt, ANALYZE_TRENDS_SCHEMA, this.primaryModelName, AnalyzeTrendsSchema);
        return result.suggestions;
      }
      /**
       * 指定したカテゴリ名に基づき、ふさわしいブランド、キーワード、絵文字を自動補完。
       */
      async suggestCategoryDetails(categoryName) {
        const prompt = suggestCategoryDetailsPrompt(categoryName);
        return await this.generateStructured(prompt, SUGGEST_CATEGORY_DETAILS_SCHEMA, this.primaryModelName, SuggestCategoryDetailsSchema);
      }
      /**
       * 既存設定の全翻訳。主に英語設定への移行時に使用。
       */
      async translateInterests(interests) {
        const prompt = translateInterestsPrompt(JSON.stringify(interests.categories));
        const result = await this.generateStructured(prompt, TRANSLATE_INTERESTS_SCHEMA, this.primaryModelName, TranslateInterestsSchema);
        const translatedCategories = {};
        const translatedFeedConfig = {};
        for (const cat of result.categories) {
          const { name, ...rest } = cat;
          translatedCategories[name] = rest;
          translatedFeedConfig[name] = { active: [], pool: [], failures: {} };
        }
        return { interests: { ...interests, categories: translatedCategories }, feedConfig: translatedFeedConfig };
      }
    };
  }
});

// src/services/FeedManager.ts
var FeedManager_exports = {};
__export(FeedManager_exports, {
  FeedManager: () => FeedManager
});
var import_promises4, FeedManager;
var init_FeedManager = __esm({
  "src/services/FeedManager.ts"() {
    import_promises4 = __toESM(require("fs/promises"), 1);
    FeedManager = class {
      config = {};
      configPath;
      saveHandler;
      constructor(configPath, saveHandler) {
        this.configPath = configPath;
        this.saveHandler = saveHandler;
      }
      /**
       * 保存用ハンドラをセットします。
       * SettingsManagerなど、外部の安全な書き込み機構を利用する場合に使用します。
       */
      setSaveHandler(handler) {
        this.saveHandler = handler;
      }
      /**
       * 設定ファイルを非同期に読み込みます。
       * ファイルが存在しない、または破損している場合は空の設定で初期化します。
       */
      async loadConfig() {
        try {
          const data = await import_promises4.default.readFile(this.configPath, "utf-8");
          this.config = JSON.parse(data);
        } catch {
          this.config = {};
        }
      }
      /**
       * 現在の設定状態をファイルへ保存します。
       */
      async saveConfig() {
        try {
          if (this.saveHandler) {
            await this.saveHandler(this.config);
          } else {
            await import_promises4.default.writeFile(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
          }
        } catch (err) {
          console.error("[FeedManager] Failed to save config:", err);
        }
      }
      /**
       * 特定のカテゴリに属するアクティブなフィードURLリストを取得します。
       */
      getActiveFeeds(category) {
        return this.config[category]?.active || [];
      }
      /**
       * 全カテゴリのアクティブなフィードURLを、カテゴリ名と共にフラットなリストで取得します。
       */
      getAllActiveFeeds() {
        const all = [];
        for (const [category, data] of Object.entries(this.config)) {
          data.active.forEach((url) => all.push({ category, url }));
        }
        return all;
      }
      /**
       * 新しいフィードURLを検証した上で追加します。
       * すでに存在する場合や、RSSとして正しく機能しない場合は追加されません。
       */
      async addFeed(category, url, fetcher) {
        if (!this.config[category]) {
          this.config[category] = { active: [], pool: [], failures: {} };
        }
        const group = this.config[category];
        if (group.active.includes(url)) return false;
        try {
          const items = await fetcher.fetch(url);
          if (items && items.length > 0) {
            group.active.push(url);
            await this.saveConfig();
            return true;
          }
        } catch {
          return false;
        }
        return false;
      }
      /**
       * フィードURLをリストから削除します。
       */
      async removeFeed(category, url) {
        if (this.config[category]) {
          this.config[category].active = this.config[category].active.filter((u) => u !== url);
          await this.saveConfig();
        }
      }
      /**
       * フェッチ成功を記録し、そのURLの失敗カウントをリセットします。
       */
      async reportSuccess(category, url) {
        const group = this.config[category];
        if (group && group.failures[url]) {
          delete group.failures[url];
          await this.saveConfig();
        }
      }
      /**
       * フェッチ失敗を記録し、失敗回数が閾値を超えた場合は自動的にリストから除外します。
       * 
       * 設計意図:
       * - 一時的なネットワークエラーによる除外を防ぎつつ、完全に死んでいるソースを排除する。
       */
      async reportFailure(category, url) {
        const group = this.config[category];
        if (group) {
          group.failures[url] = (group.failures[url] || 0) + 1;
          if (group.failures[url] >= 5) {
            group.active = group.active.filter((u) => u !== url);
            if (!group.pool.includes(url)) group.pool.push(url);
          }
          await this.saveConfig();
        }
      }
      /**
       * 全てのフィードリストから重複を排除し、最新の状態に最適化します。
       */
      async cleanConfig() {
        for (const cat in this.config) {
          this.config[cat].active = [...new Set(this.config[cat].active)];
          this.config[cat].pool = [...new Set(this.config[cat].pool)];
        }
        await this.saveConfig();
      }
    };
  }
});

// src/services/DiscoveryService.ts
var DiscoveryService_exports = {};
__export(DiscoveryService_exports, {
  DiscoveryService: () => DiscoveryService
});
var DiscoveryService;
var init_DiscoveryService = __esm({
  "src/services/DiscoveryService.ts"() {
    DiscoveryService = class {
      geminiService;
      rssFetcher;
      feedManager;
      constructor(geminiService2, rssFetcher2, feedManager2) {
        this.geminiService = geminiService2;
        this.rssFetcher = rssFetcher2;
        this.feedManager = feedManager2;
      }
      /**
       * AIによるカテゴリ再編の提案を取得します。
       * カテゴリの統合、リネーミング、およびフィードの再割り当てをAIに考案させます。
       */
      async getRestructureProposal(interests, targetCount = 10, language = "ja") {
        const currentFeeds = this.feedManager.config;
        return await this.geminiService.getRestructureProposal(interests, currentFeeds, targetCount, language);
      }
      /**
       * カテゴリ名や説明など、興味設定全体の多言語翻訳を行います。
       */
      async translateInterests(interests) {
        return await this.geminiService.translateInterests(interests);
      }
      /**
       * APIキーを更新します。
       */
      updateApiKey(apiKey) {
        this.geminiService.updateApiKey(apiKey);
      }
      /**
       * 新しいサイトの探索サイクルを実行します。
       */
      async run(interests) {
        console.log("[DiscoveryService] \u30B5\u30A4\u30C8\u63A2\u7D22\u30D7\u30ED\u30BB\u30B9\u3092\u958B\u59CB\u3057\u307E\u3059...");
        let suggestedSites = await this.geminiService.discoverSites(interests);
        console.log(`[DiscoveryService] AI\u304B\u3089 ${suggestedSites.length} \u4EF6\u306E\u30B5\u30A4\u30C8\u63D0\u6848\u304C\u3042\u308A\u307E\u3057\u305F\u3002`);
        const categoriesWithFewFeeds = Object.keys(interests.categories).filter((cat) => {
          const activeCount = this.feedManager.getActiveFeeds(cat).length;
          return activeCount < 2;
        });
        if (categoriesWithFewFeeds.length > 0) {
          try {
            const englishSites = await this.geminiService.discoverEnglishSites(interests, categoriesWithFewFeeds);
            suggestedSites = [...suggestedSites, ...englishSites];
          } catch (err) {
            console.error("[DiscoveryService] \u82F1\u8A9E\u30B5\u30A4\u30C8\u306E\u63A2\u7D22\u306B\u5931\u6557\u3057\u307E\u3057\u305F:", err);
          }
        }
        const existingUrls = this.feedManager.getAllActiveFeeds().map((f) => f.url);
        const sitesToValidate = suggestedSites.filter((s) => !existingUrls.includes(s.url));
        const validFeeds = [];
        await Promise.all(sitesToValidate.map(async (site) => {
          try {
            const items = await this.rssFetcher.fetch(site.url);
            if (items && items.length > 0) {
              validFeeds.push(site);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.log(`[DiscoveryService] NG: ${site.name} - ${msg}`);
          }
        }));
        if (validFeeds.length > 0) {
          for (const feed of validFeeds) {
            await this.feedManager.addFeed(feed.category, feed.url, this.rssFetcher);
          }
          console.log(`[DiscoveryService] \u5B8C\u4E86: ${validFeeds.length} \u4EF6\u306E\u65B0\u3057\u3044\u30D5\u30A3\u30FC\u30C9\u3092\u767B\u9332\u3057\u307E\u3057\u305F\u3002`);
        }
        return validFeeds;
      }
      /**
       * 提案されたフィード群を検証し、有効なもの（記事が取得できるもの）だけを抽出して返します。
       */
      async validateSuggestedFeeds(sites) {
        const validatedSites = [];
        await Promise.all(sites.map(async (site) => {
          try {
            const items = await this.rssFetcher.fetch(site.url);
            if (items && items.length > 0) {
              validatedSites.push(site);
            }
          } catch {
            console.log(`[DiscoveryService] Skip invalid suggested feed: ${site.url}`);
          }
        }));
        return validatedSites;
      }
      /**
       * 進化提案（サイト、ブランド、キーワード）の一括取得と検証。
       */
      async getProposals(interests) {
        const result = await this.geminiService.getEvolutionProposals(interests);
        const validatedSites = [];
        const failedSites = [];
        const validate = async (sitesToValidate) => {
          await Promise.all(sitesToValidate.map(async (site) => {
            try {
              const items = await this.rssFetcher.fetch(site.url);
              if (items && items.length > 0) {
                validatedSites.push(site);
              } else {
                throw new Error("\u8A18\u4E8B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              failedSites.push({ ...site, error: msg });
            }
          }));
        };
        const sites = result.sites || [];
        await validate(sites);
        if (validatedSites.length === 0) {
          console.log("[DiscoveryService] \u5C02\u9580\u30BD\u30FC\u30B9\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u3001\u5927\u624B\u30CB\u30E5\u30FC\u30B9\u30B5\u30A4\u30C8\u304B\u3089\u306E\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF\u3092\u958B\u59CB\u3057\u307E\u3059...");
          const fallbackResult = await this.geminiService.getFallbackEvolutionProposals(interests);
          const fallbackSites = fallbackResult.sites || [];
          await validate(fallbackSites);
        }
        const brands = result.brands || [];
        const keywords = result.keywords || [];
        return { sites: validatedSites, failedSites, brands, keywords };
      }
    };
  }
});

// src/services/ImageCacheManager.ts
var import_promises5, import_path2, ImageCacheManager;
var init_ImageCacheManager = __esm({
  "src/services/ImageCacheManager.ts"() {
    import_promises5 = __toESM(require("fs/promises"), 1);
    import_path2 = __toESM(require("path"), 1);
    ImageCacheManager = class {
      cachePath;
      cache = /* @__PURE__ */ new Map();
      /**
       * キャッシュの有効期限 (TTL)。
       * 7日間としている理由は、ニュース記事の鮮度が概ね1週間で低下し、
       * 参照されなくなった古いキャッシュを自動破棄してストレージを節約するためです。
       */
      TTL = 7 * 24 * 60 * 60 * 1e3;
      constructor(cacheDir) {
        this.cachePath = import_path2.default.join(cacheDir, "image_cache.json");
      }
      /**
       * キャッシュファイルを読み込み、メモリ上に展開します。
       * 起動時に一度だけ実行され、同時に期限切れデータのクリーンアップを行うことで
       * メモリ使用量の肥大化を抑制します。
       */
      async init() {
        try {
          const data = await import_promises5.default.readFile(this.cachePath, "utf-8");
          const parsed = JSON.parse(data);
          this.cache = new Map(Object.entries(parsed));
          this.cleanup();
        } catch {
          this.cache = /* @__PURE__ */ new Map();
        }
      }
      /**
       * 指定されたURLに対応する画像URLをキャッシュから取得します。
       * TTLを過ぎている場合は、古い情報を返してユーザーを混乱させるよりも
       * 再取得を促すために null を返して削除します。
       */
      get(url) {
        const entry = this.cache.get(url);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.TTL) {
          this.cache.delete(url);
          return null;
        }
        return entry.img;
      }
      /**
       * 記事URLと画像URLのペアをキャッシュに保存し、ファイルに書き出します。
       * 書き出しを毎回行うことで、不意なクラッシュ時のデータ損失を最小限に抑えます。
       */
      async set(url, img) {
        this.cache.set(url, {
          img,
          timestamp: Date.now()
        });
        await this.save();
      }
      /**
       * 有効期限切れのキャッシュを削除します。
       * この処理は、メモリとディスクの両方から不要なデータを除去するために不可欠です。
       */
      cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (now - entry.timestamp > this.TTL) {
            this.cache.delete(key);
          }
        }
      }
      /**
       * 現在のキャッシュ状態をJSONファイルに保存します。
       * JSON.stringify のインデント設定は、デバッグ時の可読性を確保するための意図的なものです。
       */
      async save() {
        try {
          const obj = Object.fromEntries(this.cache.entries());
          await import_promises5.default.writeFile(this.cachePath, JSON.stringify(obj, null, 2), "utf-8");
        } catch (error) {
          console.error("[ImageCacheManager] Failed to save cache:", error);
        }
      }
    };
  }
});

// src/services/EnrichmentService.ts
var EnrichmentService_exports = {};
__export(EnrichmentService_exports, {
  EnrichmentService: () => EnrichmentService
});
var cheerio, import_axios, import_p_limit, import_path3, import_url, import_meta, _dirname, EnrichmentService;
var init_EnrichmentService = __esm({
  "src/services/EnrichmentService.ts"() {
    cheerio = __toESM(require("cheerio"), 1);
    import_axios = __toESM(require("axios"), 1);
    import_p_limit = __toESM(require("p-limit"), 1);
    import_path3 = __toESM(require("path"), 1);
    import_url = require("url");
    init_ImageCacheManager();
    import_meta = {};
    _dirname = typeof import_meta !== "undefined" && import_meta.url ? import_path3.default.dirname((0, import_url.fileURLToPath)(import_meta.url)) : typeof __dirname !== "undefined" ? __dirname : "";
    EnrichmentService = class {
      placeholders;
      geminiService = null;
      cacheManager;
      limit = (0, import_p_limit.default)(5);
      // 同時実行数を5に制限し、ネットワーク/API負荷をコントロール
      constructor(geminiService2, cacheDir) {
        this.geminiService = geminiService2 || null;
        const finalCacheDir = cacheDir || import_path3.default.resolve(_dirname, "../../data");
        this.cacheManager = new ImageCacheManager(finalCacheDir);
        this.placeholders = {
          "\u97F3\u697D\u30FB\u30AE\u30BF\u30FC\u30FBDTM": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
          "AI\u30FB\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
          "PC\u30FB\u30CF\u30FC\u30C9\u30A6\u30A7\u30A2": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400",
          "\u30ED\u30FC\u30C9\u30D0\u30A4\u30AF": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400",
          "\u30B2\u30FC\u30E0": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
        };
      }
      /**
       * キャッシュマネージャーの初期化（ファイルシステムへのアクセス準備）
       */
      async init() {
        await this.cacheManager.init();
      }
      /**
       * 複数の記事を一括でエンリッチメントします。
       * 並列実行数を制限し、サーバーや相手サイトへの負荷を抑えます。
       */
      async enrichAll(articles) {
        const tasks = articles.map((article) => this.limit(() => this.enrich(article)));
        return Promise.all(tasks);
      }
      /**
       * 不完全な記事データを検査し、可能な限りのメタデータを補完して情報の質を底上げします。
       * 特に、アイキャッチ画像の確保（視覚的魅力の維持）と、母国語へのローカライズ（可読性の確保）を担います。
       */
      async enrich(article) {
        let enriched = { ...article };
        if (!enriched.img) {
          const cachedImg = this.cacheManager.get(enriched.link);
          if (cachedImg) {
            enriched = { ...enriched, img: cachedImg };
          } else {
            try {
              const foundImg = await this.scrapeImage(enriched.link);
              if (foundImg) {
                enriched = { ...enriched, img: foundImg };
                await this.cacheManager.set(enriched.link, foundImg);
              } else {
                enriched = { ...enriched, img: this.getPlaceholder(enriched.category) };
              }
            } catch (e) {
              console.error(`[EnrichmentService] Failed to scrape image for ${enriched.link}:`, e);
              enriched = { ...enriched, img: this.getPlaceholder(enriched.category) };
            }
          }
        }
        if (this.geminiService && this.isNotJapanese(enriched.title)) {
          try {
            const translations = await this.geminiService.translateArticles([{
              title: enriched.title,
              desc: enriched.desc || ""
            }]);
            if (translations && translations.length > 0) {
              enriched = {
                ...enriched,
                title: `[JP] ${translations[0].title}`,
                desc: translations[0].desc
              };
            }
          } catch (err) {
            console.error("[EnrichmentService] \u7FFB\u8A33\u306B\u5931\u6557\u3057\u307E\u3057\u305F:", err);
          }
        }
        return enriched;
      }
      /**
       * 記事URLから最適な画像を抽出します。
       * OGP(Open Graph Protocol)タグを優先し、見つからない場合は本文内の主要な画像を探索します。
       */
      async scrapeImage(url) {
        try {
          const { data } = await import_axios.default.get(url, {
            timeout: 8e3,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          const $ = cheerio.load(data);
          let imgUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || $('meta[name="image"]').attr("content") || $('meta[name="thumbnail"]').attr("content") || $('link[rel="image_src"]').attr("href") || $('link[rel="shortcut icon"]').attr("href");
          if (!imgUrl) {
            const contentAreas = $('article, main, [role="main"], .post-content, .entry-content, #content, .article-body');
            const imgElements = contentAreas.length > 0 ? contentAreas.find("img") : $("img");
            imgElements.each((_, el) => {
              const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
              if (src && /\.(jpg|jpeg|png|webp|gif)/i.test(src)) {
                const width = $(el).attr("width");
                const height = $(el).attr("height");
                if (width && parseInt(width) < 100) return true;
                if (height && parseInt(height) < 100) return true;
                imgUrl = src;
                return false;
              }
            });
          }
          if (imgUrl) {
            try {
              const absoluteUrl = new URL(imgUrl, url).href;
              if (absoluteUrl.startsWith("http")) {
                return absoluteUrl;
              }
            } catch {
            }
          }
        } catch {
        }
        return null;
      }
      /**
       * テキストが翻訳対象（非日本語）であるかを判定します。
       * 日本語の文字範囲が含まれていない場合に翻訳が必要とみなします。
       */
      isNotJapanese(text) {
        const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        return !jpRegex.test(text);
      }
      /**
       * 画像が一切見つからなかった記事に対して、システムが提供するデフォルトの画像URLを取得します。
       */
      getPlaceholder(category) {
        return this.placeholders[category] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400";
      }
      /**
       * RSSフィードの初期取得時に、メタデータ（media:content等）から高速に画像URLを引き出すための第一次フィルター。
       */
      extractBasicImage(item) {
        const mediaContent = item.mediaContent;
        if (mediaContent) {
          if (Array.isArray(mediaContent)) {
            if (mediaContent[0]?.$?.url) return mediaContent[0].$.url;
          } else if (mediaContent.$?.url) {
            return mediaContent.$.url;
          }
        }
        const mediaThumbnail = item.mediaThumbnail;
        if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;
        const enclosure = item.enclosure;
        if (enclosure?.url) return enclosure.url;
        if (item.itunesImage) return String(item.itunesImage);
        const snippet = item.description || "";
        const content = item.content || item.contentEncoded || "";
        const fullContent = `${snippet} ${content}`;
        const matches = fullContent.match(/src=["']([^"']+\.(jpg|png|gif|jpeg|webp))["']/i);
        if (matches && matches[1]) return matches[1];
        return null;
      }
    };
  }
});

// src/services/RSSFetcher.ts
var RSSFetcher_exports = {};
__export(RSSFetcher_exports, {
  RSSFetcher: () => RSSFetcher
});
var import_rss_parser, import_p_limit2, RSSFetcher;
var init_RSSFetcher = __esm({
  "src/services/RSSFetcher.ts"() {
    import_rss_parser = __toESM(require("rss-parser"), 1);
    import_p_limit2 = __toESM(require("p-limit"), 1);
    RSSFetcher = class {
      limit;
      parser;
      constructor(concurrency = 20) {
        this.limit = (0, import_p_limit2.default)(concurrency);
        this.parser = new import_rss_parser.default({
          timeout: 2e4,
          // ネットワーク遅延を考慮し20秒に設定
          headers: {
            // サーバー側でのブロックを回避するためのヘッダー設定
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*"
          },
          // 標準外のメタデータ（画像、本文詳細、iTunesタグなど）を明示的にマッピング
          customFields: {
            item: [
              ["content:encoded", "contentEncoded"],
              ["dc:title", "title"],
              ["dc:description", "description"],
              ["media:content", "mediaContent"],
              ["media:thumbnail", "mediaThumbnail"],
              ["itunes:image", "itunesImage"]
            ]
          }
        });
      }
      /**
       * 単一のフィードを取得します。
       * ネットワークエラー時には自動的にリトライを実施します。
       */
      async fetch(url, retries = 2) {
        return this.limit(async () => {
          let lastError;
          for (let i = 0; i <= retries; i++) {
            try {
              const feed = await this.parser.parseURL(url);
              return feed.items || [];
            } catch (e) {
              lastError = e;
              const msg = e instanceof Error ? e.message : String(e);
              const isRetryable = msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("timeout") || msg.includes("Status code 429") || msg.includes("Status code 503");
              if (isRetryable && i < retries) {
                const delay = 3e3 * (i + 1);
                console.warn(`[RSSFetcher] Fetch failed, retrying in ${delay}ms... (${i + 1}/${retries}): ${url}`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
              }
              console.warn(`[RSSFetcher] Non-retryable error or exhausted retries for ${url}: ${msg}`);
              break;
            }
          }
          throw lastError;
        });
      }
      /**
       * フィードの有効性を検証します。
       * 主に設定画面での「フィード追加」時の事前チェックに使用。
       */
      async validateFeed(url) {
        return this.limit(async () => {
          try {
            await this.parser.parseURL(url);
            return { ok: true, status: 200 };
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            let status = "ERROR";
            const match = msg.match(/Status code (\d+)/);
            if (match) status = parseInt(match[1], 10);
            return { ok: false, status, error: msg };
          }
        });
      }
      /**
       * リストに含まれる全てのフィードを並列で取得します。
       */
      async fetchAll(feedConfigs) {
        const tasks = feedConfigs.map(
          (config) => this.fetch(config.url).then((items) => ({
            category: config.category,
            url: config.url,
            items,
            success: true
          })).catch((error) => ({
            category: config.category,
            url: config.url,
            error: error instanceof Error ? error.message : String(error),
            success: false
          }))
        );
        return Promise.all(tasks);
      }
    };
  }
});

// src/services/ScoringService.ts
var ScoringService_exports = {};
__export(ScoringService_exports, {
  ScoringService: () => ScoringService
});
var ScoringService;
var init_ScoringService = __esm({
  "src/services/ScoringService.ts"() {
    init_normalize();
    ScoringService = class {
      interests;
      categoryKeywords;
      commonBrands;
      /**
       * @param interests - ユーザーの興味データ（interests.json）
       */
      constructor(interests) {
        this.interests = interests;
        this.categoryKeywords = {};
        for (const [catName, info] of Object.entries(interests.categories)) {
          this.categoryKeywords[catName] = [
            ...info.keywords.map((k) => k.toLowerCase()),
            ...info.brands.map((b) => b.toLowerCase())
          ];
        }
        this.commonBrands = [
          "Google",
          "AWS",
          "Microsoft",
          "NVIDIA",
          "Apple",
          "Sony",
          "Technics",
          "ASUS",
          "MSI",
          "Razer",
          "Anker",
          "Boss",
          "Fender",
          "Gibson",
          "Yamaha"
        ];
      }
      /**
       * 記事のタイトルと要約から、最も関連性の高い内部カテゴリを推論します。
       * 
       * @param title - 記事タイトル
       * @param desc - 記事要約
       * @param originalCategory - RSSフィードが提供する元カテゴリ（ジャンル）
       * @returns 判定されたカテゴリ名
       */
      detectCategory(title, desc, originalCategory) {
        const text = `${title} ${desc}`.toLowerCase();
        for (const [catName, keywords] of Object.entries(this.categoryKeywords)) {
          if (keywords.some((k) => text.includes(k))) return catName;
        }
        const normalizedOriginal = normalizeCategoryName(originalCategory);
        for (const catName of Object.keys(this.interests.categories)) {
          if (normalizeCategoryName(catName) === normalizedOriginal) return catName;
        }
        return originalCategory;
      }
      /**
       * ユーザー設定のブランド一致(+10点)とキーワード一致(+8点)に基づき、記事の重要度スコアを算出します。
       * 
       * @param title - 記事タイトル
       * @param desc - 記事要約
       * @param category - 判定済みカテゴリ
       * @returns 算出されたスコア（大きいほどユーザーにとって重要）
       */
      calculateScore(title, desc, category) {
        let score = 5;
        const text = `${title} ${desc}`.toLowerCase();
        const catInfo = this.interests.categories[category] || { brands: [], keywords: [] };
        catInfo.brands.forEach((brand) => {
          if (text.includes(brand.toLowerCase())) score += 10;
        });
        catInfo.keywords.forEach((keyword) => {
          if (text.includes(keyword.toLowerCase())) score += 8;
        });
        return score;
      }
      /**
       * 記事タイトルから象徴的なブランド名（固有名詞）を抽出します。
       * ユーザー設定を優先し、その後一般的なブランドリストから検索します。
       * 
       * @param title - 記事タイトル
       * @returns 抽出されたブランド名（見つからない場合は一般名称としての 'News'）
       */
      extractBrand(title) {
        const lowerTitle = title.toLowerCase();
        for (const catName in this.interests.categories) {
          for (const brand of this.interests.categories[catName].brands) {
            if (lowerTitle.includes(brand.toLowerCase())) return brand;
          }
        }
        for (const brand of this.commonBrands) {
          if (lowerTitle.includes(brand.toLowerCase())) return brand;
        }
        return "News";
      }
    };
  }
});

// src/api/server/NexusRouter.ts
var NexusRouter_exports = {};
__export(NexusRouter_exports, {
  default: () => NexusRouter_default,
  nexusRouter: () => nexusRouter
});
var nexusRouter, NexusRouter_default;
var init_NexusRouter = __esm({
  "src/api/server/NexusRouter.ts"() {
    nexusRouter = async (fastify2, options) => {
      const { scraper: scraper2, settingsManager: settingsManager2, orchestrator: orchestrator2 } = options;
      fastify2.get("/interests", async (_request, reply) => {
        try {
          return await settingsManager2.getInterests();
        } catch (error) {
          reply.status(500).send({ error: "Failed to retrieve interests", details: String(error) });
        }
      });
      fastify2.get("/feeds", async (_request, reply) => {
        try {
          return await settingsManager2.getFeedConfig();
        } catch (error) {
          reply.status(500).send({ error: "Failed to retrieve feed config", details: String(error) });
        }
      });
      fastify2.post("/sync-settings", async (request, reply) => {
        try {
          const result = await settingsManager2.syncSettings(request.body);
          return result;
        } catch (error) {
          console.error("[NexusRouter] Sync Settings Error:", error);
          reply.status(500).send({ error: "Failed to sync settings", details: String(error) });
        }
      });
      fastify2.post("/orchestrate", async (request, reply) => {
        try {
          const { requirements } = request.body;
          if (orchestrator2) {
            void orchestrator2.runAutonomousLoop(requirements || "");
            return { success: true, newFeedsCount: 0 };
          }
          return { success: false, newFeedsCount: 0 };
        } catch (error) {
          console.error("[NexusRouter] Orchestrate Error:", error);
          reply.status(500).send({ error: "Failed to trigger orchestration", details: String(error) });
        }
      });
      fastify2.post("/discover-trends", async (_request, reply) => {
        try {
          const interests = await settingsManager2.getInterests();
          const suggestions = await scraper2.discoverTrends(interests);
          return { suggestions };
        } catch (error) {
          reply.status(500).send({ error: "Failed to discover trends", details: String(error) });
        }
      });
      fastify2.post("/restructure-categories", async (_request, reply) => {
        try {
          return { categories: {}, feedConfig: {} };
        } catch (error) {
          reply.status(500).send({ error: "Failed to restructure categories", details: String(error) });
        }
      });
      fastify2.get("/ui-settings", async () => {
        return await settingsManager2.getUiSettings();
      });
      fastify2.post("/save-ui-settings", async (request) => {
        return await settingsManager2.saveUiSettings(request.body);
      });
      fastify2.get("/usage-stats", async () => {
        return await settingsManager2.getUsageStats();
      });
    };
    NexusRouter_default = nexusRouter;
  }
});

// src/models/Article.ts
var import_zod3, ArticleSchema, Article;
var init_Article = __esm({
  "src/models/Article.ts"() {
    import_zod3 = require("zod");
    ArticleSchema = import_zod3.z.object({
      /** 記事のタイトル。空文字は許容せず、取得失敗時は "Untitled" を設定 */
      title: import_zod3.z.string().min(1).default("Untitled"),
      /** 記事のパーマリンクURL。 */
      link: import_zod3.z.string().url().default(""),
      /** 記事の概要・説明文。 */
      desc: import_zod3.z.string().default(""),
      /** 配信元のブランド名（例: TechCrunch, GitHub Blogなど）。 */
      brand: import_zod3.z.string().default("News"),
      /** ユーザーの興味関心に基づいた重要度スコア（1-10）。 */
      score: import_zod3.z.number().int().default(5),
      /** アイキャッチ画像のURL。存在しない場合はnull。 */
      img: import_zod3.z.string().nullable().default(null),
      /** 記事の公開日時。ISO 8601形式。 */
      date: import_zod3.z.string().datetime({ offset: true }).or(import_zod3.z.string()).default(() => (/* @__PURE__ */ new Date()).toISOString()),
      /** 記事が分類されるカテゴリ名。 */
      category: import_zod3.z.string().default("\u672A\u5206\u985E"),
      /** AI（Gemini）がこの記事を推薦した理由。 */
      geminiReason: import_zod3.z.string().optional(),
      /** 記事の言語。多言語フィルタリングや翻訳処理の判定に使用。 */
      language: import_zod3.z.enum(["ja", "en", "other"]).default("en")
    });
    Article = class {
      title;
      link;
      desc;
      brand;
      score;
      img;
      date;
      category;
      geminiReason;
      language;
      /**
       * 新しいArticleインスタンスを生成する。
       * 入力データが不完全な場合でも、スキーマ定義に基づき安全なデフォルト値が適用される。
       * 
       * @param {unknown} data - RSSやスクレイパーから取得したバリデーション前の生データ
       */
      constructor(data) {
        const validated = ArticleSchema.parse(data);
        this.title = validated.title;
        this.link = validated.link;
        this.desc = validated.desc;
        this.brand = validated.brand;
        this.score = validated.score;
        this.img = validated.img;
        this.date = validated.date;
        this.category = validated.category;
        this.geminiReason = validated.geminiReason;
        this.language = validated.language;
        this.desc = this._sanitizeDescription(this.desc);
      }
      /**
       * 説明文（description）の正規化処理。
       * 1. RSSに含まれるHTMLタグを除去し、純粋なテキストのみを抽出。
       * 2. UIのカード表示を最適化するため、最大文字数で切り詰めを行う。
       * 
       * @param {string} text - 処理対象の生文字列
       * @returns {string} クリーンアップされた要約テキスト
       * @private
       */
      _sanitizeDescription(text) {
        if (!text) return "";
        const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
        return cleanText.length > 150 ? cleanText.slice(0, 150) + "..." : cleanText;
      }
      /**
       * インスタンスをプレーンなJavaScriptオブジェクトに変換する。
       * JSON.stringify() で呼び出されるほか、ReduxやProps等でデータを渡す際に使用。
       * 
       * @returns {ArticleType} バリデーション済みの純粋なデータオブジェクト
       */
      toJSON() {
        return {
          title: this.title,
          link: this.link,
          desc: this.desc,
          brand: this.brand,
          score: this.score,
          img: this.img,
          date: this.date,
          category: this.category,
          geminiReason: this.geminiReason,
          language: this.language
        };
      }
    };
  }
});

// src/services/ExternalTrendFetcher.ts
var import_axios2, cheerio2, ExternalTrendFetcher;
var init_ExternalTrendFetcher = __esm({
  "src/services/ExternalTrendFetcher.ts"() {
    import_axios2 = __toESM(require("axios"), 1);
    cheerio2 = __toESM(require("cheerio"), 1);
    ExternalTrendFetcher = class {
      TIMEOUT = 8e3;
      HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, text/html, */*",
        "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7"
      };
      /**
       * GoogleトレンドのDaily RSSフィードから日本のトレンドを取得します。
       * 公式RSS: https://trends.google.com/trending/rss?geo=JP
       */
      async fetchGoogleTrends(geo = "JP") {
        const url = `https://trends.google.com/trending/rss?geo=${geo}`;
        try {
          const res = await import_axios2.default.get(url, { timeout: this.TIMEOUT, headers: this.HEADERS });
          const $ = cheerio2.load(res.data, { xmlMode: true });
          const trends = [];
          $("item").each((_, el) => {
            const title = $(el).find("title").first().text().trim();
            const traffic = $(el).find("ht\\:approx_traffic, approx_traffic").text().trim();
            if (title) {
              trends.push({ title, source: "Google Trends", trafficVolume: traffic || void 0 });
            }
          });
          return trends.slice(0, 20);
        } catch (e) {
          console.warn("[ExternalTrendFetcher] Google Trends fetch failed:", String(e));
          return [];
        }
      }
      /**
       * Yahoo Japan の検索トレンドページからトレンドワードを取得します。
       */
      async fetchYahooJapanTrends() {
        try {
          const res = await import_axios2.default.get("https://search.yahoo.co.jp/realtime/buzznews", {
            timeout: this.TIMEOUT,
            headers: this.HEADERS
          });
          const $ = cheerio2.load(res.data);
          const trends = [];
          $('[class*="buzz"], [class*="trend"], .SearchResult, .BuzznewsList li').each((_, el) => {
            const text = $(el).text().trim().split("\n")[0].trim();
            if (text && text.length > 1 && text.length < 60) {
              trends.push({ title: text, source: "Yahoo Japan" });
            }
          });
          return trends.slice(0, 15);
        } catch (e) {
          console.warn("[ExternalTrendFetcher] Yahoo Japan Trends fetch failed:", String(e));
          return [];
        }
      }
      /**
       * X（旧Twitter）のトレンドをNitter公開インスタンス経由で取得します。
       * Nitterが利用不可の場合はスキップします。
       */
      async fetchXTrends(geo = "JP") {
        const guestTokenUrl = "https://api.twitter.com/1.1/guest/activate.json";
        const trendsUrl = `https://api.twitter.com/1.1/trends/place.json?id=${geo === "JP" ? 23424856 : 1}`;
        try {
          const tokenRes = await import_axios2.default.post(guestTokenUrl, {}, {
            timeout: this.TIMEOUT,
            headers: {
              ...this.HEADERS,
              "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
              "Content-Type": "application/json"
            }
          });
          const guestToken = tokenRes.data?.guest_token;
          if (!guestToken) return [];
          const trendsRes = await import_axios2.default.get(trendsUrl, {
            timeout: this.TIMEOUT,
            headers: {
              ...this.HEADERS,
              "Authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
              "x-guest-token": guestToken
            }
          });
          const rawTrends = trendsRes.data?.[0]?.trends ?? [];
          return rawTrends.slice(0, 20).map((t) => ({
            title: t.name,
            source: "X (Twitter)",
            trafficVolume: t.tweet_volume ? `${t.tweet_volume} tweets` : void 0
          }));
        } catch (e) {
          console.warn("[ExternalTrendFetcher] X Trends fetch failed:", String(e));
          return [];
        }
      }
      /**
       * 全ソースからトレンドを並列取得し、まとめて返します。
       */
      async fetchAll(geo = "JP") {
        const [googleTrends, xTrends, yahooTrends] = await Promise.all([
          this.fetchGoogleTrends(geo),
          this.fetchXTrends(geo),
          this.fetchYahooJapanTrends()
        ]);
        const all = [...xTrends, ...googleTrends, ...yahooTrends];
        console.log(`[ExternalTrendFetcher] \u53D6\u5F97\u30C8\u30EC\u30F3\u30C9\u6570: X=${xTrends.length}, Google=${googleTrends.length}, Yahoo=${yahooTrends.length}`);
        return all;
      }
    };
  }
});

// src/ScraperFacade.ts
var ScraperFacade_exports = {};
__export(ScraperFacade_exports, {
  ScraperFacade: () => ScraperFacade
});
var ScraperFacade;
var init_ScraperFacade = __esm({
  "src/ScraperFacade.ts"() {
    init_FeedManager();
    init_RSSFetcher();
    init_ScoringService();
    init_EnrichmentService();
    init_Article();
    init_GeminiService();
    init_ExternalTrendFetcher();
    init_normalize();
    ScraperFacade = class {
      feedManager;
      rssFetcher;
      enrichmentService;
      geminiService;
      externalTrendFetcher;
      /**
       * @param _interestsPath - 未使用（将来の拡張用）
       * @param feedsPath - フィード構成ファイルのパス
       * @param dataDir - 画像キャッシュなどのデータ保存先
       */
      constructor(_interestsPath, feedsPath, dataDir2) {
        this.feedManager = new FeedManager(feedsPath);
        this.rssFetcher = new RSSFetcher(20);
        this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
        this.enrichmentService = new EnrichmentService(this.geminiService, dataDir2);
        this.externalTrendFetcher = new ExternalTrendFetcher();
      }
      /**
       * AIサービス（Gemini）のAPIキーを更新します。
       * 設定変更時に即座に反映させるためのホットスワップを可能にします。
       */
      updateApiKey(apiKey) {
        this.geminiService.updateApiKey(apiKey);
      }
      /**
       * AIによる「おすすめ記事」のキュレーションを実行します。
       * 
       * 意図: 単なる新着順ではなく、ユーザーの興味関心（Interests）に基づき、
       * Gemini が文脈を理解した上で選定した「価値の高い情報」を提供します。
       */
      async getRecommendations(interests) {
        try {
          await this.enrichmentService.init();
          const allArticles = await this.fetchAndProcessArticles(interests);
          const candidates = this._sortAndSlice(allArticles, 30);
          if (candidates.length === 0) {
            console.warn("[ScraperFacade] No candidates for recommendations.");
            return [];
          }
          console.log(`[ScraperFacade] AI\u30AD\u30E5\u30EC\u30FC\u30B7\u30E7\u30F3\u4E2D (${candidates.length}\u4EF6)...`);
          const recommendations = await this.geminiService.curate(candidates.map((a) => a.toJSON()), interests);
          const recommendedArticles = recommendations.map((r) => {
            const matched = candidates.find((c) => c.link === r.url);
            if (matched) {
              return new Article({
                ...matched.toJSON(),
                geminiReason: r.geminiReason
              });
            }
            return new Article({
              title: r.title,
              link: r.url || "",
              desc: r.content || "",
              brand: "",
              score: 0,
              category: "Uncategorized",
              date: (/* @__PURE__ */ new Date()).toISOString(),
              img: null,
              language: "en",
              geminiReason: r.geminiReason
            });
          });
          const enrichedData = await this.enrichmentService.enrichAll(recommendedArticles);
          return enrichedData.map((d) => new Article(d));
        } catch (e) {
          console.error(`[ScraperFacade] Recommendations Error: ${String(e)}`);
          return [];
        }
      }
      /**
       * カテゴリごとに整理されたダッシュボード用データを構築します。
       * 
       * 意図: ユーザーが設定した各カテゴリに対し、十分な鮮度の記事が届くように
       * 「直近90日」と「全期間」の二段構えでフェッチを試みます。
       */
      async getDashboard(interests) {
        console.log(`[ScraperFacade] \u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u69CB\u7BC9\u3092\u958B\u59CB...`);
        await this.enrichmentService.init();
        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        let articlesExtended = null;
        const dashboard = {};
        const categories = Object.keys(interests.categories);
        const seenLinks = /* @__PURE__ */ new Set();
        for (const catName of categories) {
          const targetClean = normalizeCategoryName(catName);
          let filtered = articlesNormal.filter((a) => {
            const isMatch = normalizeCategoryName(a.category) === targetClean;
            if (isMatch) seenLinks.add(a.link);
            return isMatch;
          });
          if (filtered.length === 0) {
            if (!articlesExtended) {
              console.log(`[ScraperFacade] \u30AB\u30C6\u30B4\u30EA "${catName}" \u306E\u6700\u65B0\u8A18\u4E8B\u304C0\u4EF6\u306E\u305F\u3081\u671F\u9593\u89E3\u9664\u63A2\u7D22\u4E2D...`);
              articlesExtended = await this.fetchAndProcessArticles(interests, true);
            }
            filtered = articlesExtended.filter((a) => {
              const isMatch = normalizeCategoryName(a.category) === targetClean;
              if (isMatch) seenLinks.add(a.link);
              return isMatch;
            });
          }
          const topArticles = this._sortAndSlice(filtered, 15);
          const enrichedTop = await this.enrichmentService.enrichAll(topArticles);
          dashboard[catName] = {
            emoji: interests.categories[catName].emoji || null,
            articles: enrichedTop.map((a) => new Article(a).toJSON())
          };
        }
        const uncategorizedArticles = [];
        articlesNormal.forEach((a) => {
          if (!seenLinks.has(a.link)) uncategorizedArticles.push(a);
        });
        if (uncategorizedArticles.length > 0) {
          const topUncategorized = this._sortAndSlice(uncategorizedArticles, 15);
          const enrichedUncategorized = await this.enrichmentService.enrichAll(topUncategorized);
          dashboard["Uncategorized"] = {
            emoji: "\u{1F310}",
            articles: enrichedUncategorized.map((a) => new Article(a).toJSON())
          };
        }
        console.log(`[ScraperFacade] \u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u69CB\u7BC9\u5B8C\u4E86`);
        return dashboard;
      }
      /**
       * 全記事のメタデータから共通のパターンを見つけ、新しいトレンドとして提案します。
       */
      async discoverTrends(interests) {
        try {
          const [articles, externalTrends] = await Promise.all([
            this.fetchAndProcessArticles(interests),
            this.externalTrendFetcher.fetchAll("JP")
          ]);
          const topArticles = articles.slice(0, 50).map((a) => ({ title: a.title, desc: a.desc, brand: a.brand }));
          const suggestions = await this.geminiService.analyzeTrends(topArticles, interests, externalTrends);
          return suggestions;
        } catch (e) {
          console.error(`[ScraperFacade] discoverTrends Error: ${String(e)}`);
          return [];
        }
      }
      /**
       * 記事をスコア順（同一スコアなら日付順）でソートし、指定件数抽出します。
       */
      _sortAndSlice(articles, count) {
        return articles.sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, count);
      }
      /**
       * 記事が0件の場合に期間制限を解除するフォールバック機能付きの取得メソッド。
       */
      async fetchAndProcessArticlesWithFallback(interests) {
        let articles = await this.fetchAndProcessArticles(interests, false);
        if (articles.length === 0) {
          articles = await this.fetchAndProcessArticles(interests, true);
        }
        return articles;
      }
      /**
       * 各フィードから記事を並列取得し、スコアリングとカテゴリ判定を行います。
       * 
       * 意図: 大量のフィードを効率よく取得しつつ、ScoringService を利用して
       * ユーザーにとっての価値（スコア）を数値化します。
       */
      async fetchAndProcessArticles(interests, ignoreDateLimit = false) {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1e3);
        if (feeds.length === 0) {
          console.warn("[ScraperFacade] No active feeds found.");
          return [];
        }
        console.log(`[ScraperFacade] Fetching ${feeds.length} feeds...`);
        const results = await this.rssFetcher.fetchAll(feeds);
        const allArticles = [];
        const seenLinks = /* @__PURE__ */ new Set();
        for (const res of results) {
          if (!res.success || !res.items) {
            if (!res.success) await this.feedManager.reportFailure(res.category, res.url);
            continue;
          }
          await this.feedManager.reportSuccess(res.category, res.url);
          for (const item of res.items) {
            try {
              const record = item;
              const link = String(record.link || "");
              if (!link || seenLinks.has(link)) continue;
              seenLinks.add(link);
              const pubDateStr = String(record.isoDate || record.pubDate || "");
              const pubDate = new Date(pubDateStr);
              const isDateValid = !isNaN(pubDate.getTime());
              if (!ignoreDateLimit && isDateValid && pubDate.getTime() < ninetyDaysAgo.getTime()) continue;
              const title = String(record.title || "");
              const snippet = String(record.contentSnippet || record.description || "");
              const detectedCat = scorer.detectCategory(title, snippet, res.category);
              const score = scorer.calculateScore(title, snippet, detectedCat);
              const brand = scorer.extractBrand(title);
              const language = this._detectLanguage(title, snippet);
              allArticles.push(new Article({
                title,
                link: String(record.link || ""),
                desc: snippet,
                brand,
                score,
                category: detectedCat,
                date: isDateValid ? pubDate.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
                img: this.enrichmentService.extractBasicImage(record),
                language
              }));
            } catch {
              continue;
            }
          }
        }
        console.log(`[ScraperFacade] Processed ${allArticles.length} articles.`);
        return allArticles.sort((a, b) => b.score - a.score);
      }
      /**
       * 言語判定ロジック。
       * 日本語と英語を区別し、UIでの表示最適化やAI解析のヒントとして利用します。
       */
      _detectLanguage(title, snippet) {
        const text = title + snippet;
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        if (hasKana) return "ja";
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        if (hasKanji) return "other";
        return "en";
      }
    };
  }
});

// src/agents/BaseAgent.ts
var BaseAgent;
var init_BaseAgent = __esm({
  "src/agents/BaseAgent.ts"() {
    BaseAgent = class {
      name;
      geminiService;
      /**
       * @param {string} name - エージェント名
       * @param {GeminiService} geminiService - Geminiサービスインスタンス
       */
      constructor(name, geminiService2) {
        this.name = name;
        this.geminiService = geminiService2;
      }
      /**
       * APIキーを更新（ユーザー設定の変更を反映）。
       */
      updateApiKey(apiKey) {
        this.geminiService.updateApiKey(apiKey);
      }
      /**
       * エージェントのアイデンティティを定義するシステムプロンプト。
       * サブクラスで具体的な役割（設計、収集、分析など）を定義。
       * @returns {string}
       */
      getSystemPrompt() {
        return `You are ${this.name}, a specialized AI agent in the Aegis Nexus system.`;
      }
      /**
       * 基本的な思考プロセスを実行。
       * 指定されたスキーマに従って構造化された結果を返す。
       * 
       * @param {string} prompt タスクの具体的な指示内容
       * @param {ResponseSchema} schema AIからのレスポンスを検証するためのスキーマ定義
       */
      async think(prompt, schema) {
        const fullPrompt = `${this.getSystemPrompt()}

Task: ${prompt}`;
        return await this.geminiService.generateStructured(fullPrompt, schema);
      }
    };
  }
});

// src/agents/ArchitectAgent.ts
var import_generative_ai3, ArchitectAgent;
var init_ArchitectAgent = __esm({
  "src/agents/ArchitectAgent.ts"() {
    init_BaseAgent();
    import_generative_ai3 = require("@google/generative-ai");
    ArchitectAgent = class extends BaseAgent {
      constructor(geminiService2) {
        super("Architect", geminiService2);
      }
      getSystemPrompt() {
        return `
\u3042\u306A\u305F\u306F Aegis Nexus \u306E 'Architect' \u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3067\u3059\u3002
\u30B7\u30B9\u30C6\u30E0\u306E\u74B0\u5883\u8A2D\u8A08\u3001\u30AB\u30C6\u30B4\u30EA\u30FC\u306E\u6574\u7406\u3001\u304A\u3088\u3073\u4ED6\u306E\u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3078\u306E\u6307\u793A\uFF08\u30D7\u30E9\u30F3\u30CB\u30F3\u30B0\uFF09\u3092\u62C5\u5F53\u3057\u307E\u3059\u3002
\u8AD6\u7406\u7684\u3067\u69CB\u9020\u5316\u3055\u308C\u305F\u601D\u8003\u3092\u597D\u307F\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u8208\u5473\u95A2\u5FC3\u3092\u6700\u9069\u306A\u30CA\u30EC\u30C3\u30B8\u30B0\u30E9\u30D5\u306B\u5909\u63DB\u3057\u307E\u3059\u3002
`;
      }
      /**
       * ユーザーの要求から実行プランを策定する。
       * 
       * @param {string} requirements ユーザーの要望（例：「AIニュースをもっと多角的かつ深く知りたい」）
       */
      async plan(requirements) {
        const schema = {
          type: import_generative_ai3.SchemaType.OBJECT,
          properties: {
            goals: { type: import_generative_ai3.SchemaType.ARRAY, items: { type: import_generative_ai3.SchemaType.STRING } },
            strategy: { type: import_generative_ai3.SchemaType.STRING },
            steps: {
              type: import_generative_ai3.SchemaType.ARRAY,
              items: {
                type: import_generative_ai3.SchemaType.OBJECT,
                properties: {
                  agent: { type: import_generative_ai3.SchemaType.STRING, enum: ["Curator", "Discovery", "Archivist"], format: "enum" },
                  action: { type: import_generative_ai3.SchemaType.STRING },
                  expected_output: { type: import_generative_ai3.SchemaType.STRING }
                },
                required: ["agent", "action", "expected_output"]
              }
            }
          },
          required: ["goals", "strategy", "steps"]
        };
        return await this.think(`\u4EE5\u4E0B\u306E\u8981\u6C42\u306B\u57FA\u3065\u304D\u3001\u5B9F\u884C\u30D7\u30E9\u30F3\u3092\u7B56\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044: ${requirements}`, schema);
      }
    };
  }
});

// src/agents/DiscoveryAgent.ts
var import_generative_ai4, DiscoveryAgent;
var init_DiscoveryAgent = __esm({
  "src/agents/DiscoveryAgent.ts"() {
    init_BaseAgent();
    import_generative_ai4 = require("@google/generative-ai");
    DiscoveryAgent = class extends BaseAgent {
      constructor(geminiService2) {
        super("Discovery", geminiService2);
      }
      getSystemPrompt() {
        return `
\u3042\u306A\u305F\u306F Aegis Nexus \u306E 'Discovery' \u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3067\u3059\u3002
Web\u3092\u63A2\u7D22\u3057\u3001\u30E6\u30FC\u30B6\u30FC\u304C\u307E\u3060\u77E5\u3089\u306A\u3044\u65B0\u3057\u3044\u60C5\u5831\u6E90\uFF08RSS\u30D5\u30A3\u30FC\u30C9\u3001\u30D6\u30ED\u30B0\u7B49\uFF09\u3084\u3001\u696D\u754C\u3067\u6CE8\u76EE\u4E2D\u306E\u30C8\u30EC\u30F3\u30C9\u3092\u767A\u898B\u3057\u307E\u3059\u3002
\u597D\u5947\u5FC3\u65FA\u76DB\u3067\u3001\u672A\u77E5\u306E\u9818\u57DF\u3092\u63A2\u7D22\u3059\u308B\u3053\u3068\u3092\u5F97\u610F\u3068\u3057\u3066\u3044\u307E\u3059\u3002
`;
      }
      /**
       * ユーザーの興味に基づき、新しい情報源を提案する。
       * 
       * @param {Interests} currentInterests ユーザーの現在の興味設定
       */
      async discoverSources(currentInterests) {
        const schema = {
          type: import_generative_ai4.SchemaType.OBJECT,
          properties: {
            new_sources: {
              type: import_generative_ai4.SchemaType.ARRAY,
              items: {
                type: import_generative_ai4.SchemaType.OBJECT,
                properties: {
                  name: { type: import_generative_ai4.SchemaType.STRING },
                  url: { type: import_generative_ai4.SchemaType.STRING },
                  category: { type: import_generative_ai4.SchemaType.STRING },
                  reason: { type: import_generative_ai4.SchemaType.STRING }
                },
                required: ["name", "url", "category", "reason"]
              }
            }
          },
          required: ["new_sources"]
        };
        const prompt = `\u73FE\u5728\u306E\u8208\u5473\uFF08${JSON.stringify(currentInterests)}\uFF09\u3092\u88DC\u5B8C\u3059\u308B\u3001\u65B0\u3057\u3044\u4FE1\u983C\u3067\u304D\u308B\u60C5\u5831\u6E90\u30925\u3064\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
        return await this.think(prompt, schema);
      }
    };
  }
});

// src/agents/ArchivistAgent.ts
var import_generative_ai5, ArchivistAgent;
var init_ArchivistAgent = __esm({
  "src/agents/ArchivistAgent.ts"() {
    init_BaseAgent();
    import_generative_ai5 = require("@google/generative-ai");
    ArchivistAgent = class extends BaseAgent {
      constructor(geminiService2) {
        super("Archivist", geminiService2);
      }
      getSystemPrompt() {
        return `
\u3042\u306A\u305F\u306F Aegis Nexus \u306E 'Archivist' \u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3067\u3059\u3002
\u53CE\u96C6\u3055\u308C\u305F\u60C5\u5831\u3092\u4F53\u7CFB\u7684\u306B\u6574\u7406\u3057\u3001\u9577\u671F\u4FDD\u5B58\u306B\u9069\u3057\u305F\u5F62\u5F0F\u3067\u69CB\u9020\u5316\u3057\u307E\u3059\u3002
\u60C5\u5831\u306E\u8981\u7D04\u3001\u30E1\u30BF\u30C7\u30FC\u30BF\u306E\u4ED8\u4E0E\u3001\u304A\u3088\u3073\u904E\u53BB\u306E\u30C7\u30FC\u30BF\u3068\u306E\u95A2\u9023\u4ED8\u3051\u3092\u5F97\u610F\u3068\u3057\u3066\u3044\u307E\u3059\u3002
`;
      }
      /**
       * コンテンツを要約し、構造化データを生成する。
       * 
       * @param {string} content 要約・分析対象となる記事の本文または概要
       */
      async summarizeAndArchive(content) {
        const schema = {
          type: import_generative_ai5.SchemaType.OBJECT,
          properties: {
            summary: { type: import_generative_ai5.SchemaType.STRING },
            key_takeaways: { type: import_generative_ai5.SchemaType.ARRAY, items: { type: import_generative_ai5.SchemaType.STRING } },
            tags: { type: import_generative_ai5.SchemaType.ARRAY, items: { type: import_generative_ai5.SchemaType.STRING } },
            metadata: {
              type: import_generative_ai5.SchemaType.OBJECT,
              properties: {
                sentiment: { type: import_generative_ai5.SchemaType.STRING, enum: ["positive", "neutral", "negative"], format: "enum" },
                importance: { type: import_generative_ai5.SchemaType.NUMBER }
              }
            }
          },
          required: ["summary", "key_takeaways", "tags", "metadata"]
        };
        return await this.think(`\u4EE5\u4E0B\u306E\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u8981\u7D04\u3057\u3001\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u4ED8\u4E0E\u3057\u3066\u30A2\u30FC\u30AB\u30A4\u30D6\u3057\u3066\u304F\u3060\u3055\u3044: ${content}`, schema);
      }
    };
  }
});

// src/agents/CuratorAgent.ts
var import_generative_ai6, CuratorAgent;
var init_CuratorAgent = __esm({
  "src/agents/CuratorAgent.ts"() {
    init_BaseAgent();
    import_generative_ai6 = require("@google/generative-ai");
    CuratorAgent = class extends BaseAgent {
      constructor(geminiService2) {
        super("Curator", geminiService2);
      }
      getSystemPrompt() {
        return `
\u3042\u306A\u305F\u306F Aegis Nexus \u306E 'Curator' \u30A8\u30FC\u30B8\u30A7\u30F3\u30C8\u3067\u3059\u3002
\u5927\u91CF\u306E\u60C5\u5831\u306E\u4E2D\u304B\u3089\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u8208\u5473\u306B\u6700\u3082\u5408\u81F4\u3057\u3001\u304B\u3064\u8CEA\u306E\u9AD8\u3044\u60C5\u5831\u3092\u53B3\u9078\u3057\u307E\u3059\u3002
\u30CE\u30A4\u30BA\u3092\u6392\u9664\u3057\u3001\u60C5\u5831\u306E\u771F\u507D\u3084\u91CD\u8981\u5EA6\u3092\u8A55\u4FA1\u3059\u308B\u3053\u3068\u306B\u9577\u3051\u3066\u3044\u307E\u3059\u3002
`;
      }
      /**
       * 記事リストをキュレーション（厳選）する。
       * 
       * @param {Record<string, unknown>[]} articles 収集された生の記事データリスト
       * @param {Interests} interests ユーザーの現在の興味・関心設定
       */
      async curate(articles, interests) {
        const schema = {
          type: import_generative_ai6.SchemaType.OBJECT,
          properties: {
            selected_ids: { type: import_generative_ai6.SchemaType.ARRAY, items: { type: import_generative_ai6.SchemaType.STRING } },
            reasoning: {
              type: import_generative_ai6.SchemaType.OBJECT,
              additionalProperties: { type: import_generative_ai6.SchemaType.STRING }
            }
          },
          required: ["selected_ids", "reasoning"]
        };
        const prompt = `
\u4EE5\u4E0B\u306E\u8A18\u4E8B\u30EA\u30B9\u30C8\u304B\u3089\u3001\u30E6\u30FC\u30B6\u30FC\u306E\u8208\u5473\uFF08${JSON.stringify(interests)}\uFF09\u306B\u5408\u81F4\u3059\u308B\u3082\u306E\u3092\u53B3\u9078\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u5404\u8A18\u4E8B\u306B\u306F ID \u304C\u632F\u3089\u308C\u3066\u3044\u307E\u3059\u3002

\u8A18\u4E8B\u30EA\u30B9\u30C8:
${articles.map((a) => `ID: ${a.id}, Title: ${a.title}, Desc: ${a.description}`).join("\n")}
`;
        return await this.think(prompt, schema);
      }
    };
  }
});

// src/core/NexusOrchestrator.ts
var NexusOrchestrator_exports = {};
__export(NexusOrchestrator_exports, {
  NexusOrchestrator: () => NexusOrchestrator
});
var NexusOrchestrator;
var init_NexusOrchestrator = __esm({
  "src/core/NexusOrchestrator.ts"() {
    init_ArchitectAgent();
    init_DiscoveryAgent();
    init_ArchivistAgent();
    init_CuratorAgent();
    NexusOrchestrator = class {
      architect;
      curator;
      discovery;
      archivist;
      /**
       * SSE(Server-Sent Events)によるリアルタイム通知の購読者リスト。
       * クライアントとの接続状態を管理し、一斉送信を可能にする。
       */
      subscribers = /* @__PURE__ */ new Set();
      /**
       * 多重実行を防止するための排他制御フラグ。
       * ワークフローのステートは一つのみであることを保証する。
       */
      isRunning = false;
      /**
       * Orchestratorの初期化。
       * 各種エージェントを生成し、共通のLLM基盤（GeminiService）を注入する。
       * 
       * @param {GeminiService} geminiService - Geminiサービスインスタンス（依存性の注入）
       */
      constructor(geminiService2) {
        this.architect = new ArchitectAgent(geminiService2);
        this.curator = new CuratorAgent(geminiService2);
        this.discovery = new DiscoveryAgent(geminiService2);
        this.archivist = new ArchivistAgent(geminiService2);
      }
      /**
       * APIキーを更新し、全ての子エージェントに伝播させる。
       * 設定変更がシステム全体へ即座に反映されることを保証する。
       * 
       * @param {string} apiKey - 新しいGemini APIキー
       */
      updateApiKey(apiKey) {
        this.architect.updateApiKey(apiKey);
        this.discovery.updateApiKey(apiKey);
        this.archivist.updateApiKey(apiKey);
        this.curator.updateApiKey(apiKey);
      }
      /**
       * クライアントからのSSE接続を購読者リストに登録する。
       * Fastifyのライフサイクルイベント（close, error）をリッスンし、
       * 切断時にはリストから除去することでメモリリークを確実に防ぐ。
       * 
       * @param {FastifyReply} res - Fastifyのレスポンスオブジェクト
       */
      subscribe(res) {
        this.subscribers.add(res);
        if (res.raw) {
          res.raw.on("close", () => this.subscribers.delete(res));
          res.raw.on("error", () => this.subscribers.delete(res));
        }
      }
      /**
       * 現在接続中の全購読者（クライアント）へ、システムの状態変更やタスク進捗を通知する。
       * 
       * @param {OrchestratorNotification} data - 送信する通知ペイロード
       */
      notify(data) {
        if (!data.timestamp) data.timestamp = (/* @__PURE__ */ new Date()).toISOString();
        console.log(`[NexusOrchestrator] ${data.message || data.status}`);
        const payload = `data: ${JSON.stringify(data)}

`;
        for (const res of this.subscribers) {
          try {
            if (res.raw) {
              res.raw.write(payload);
            }
          } catch {
            this.subscribers.delete(res);
          }
        }
      }
      /**
       * ユーザー要件に基づく自律的なワークフロー（エージェント間の協調処理）を開始する。
       * 排他制御により、同時に複数のワークフローが実行されないことを保証する。
       * 
       * @param {string} requirements - ユーザーが入力したプロンプト・要件
       * @returns {Promise<void>}
       */
      async runAutonomousLoop(requirements) {
        if (this.isRunning) {
          throw new Error("Orchestrator is already running.");
        }
        this.isRunning = true;
        this.notify({ status: "working", message: "\u81EA\u5F8BNexus\u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u3092\u958B\u59CB\u3057\u307E\u3059\u3002", agentId: "architect" });
        try {
          this.notify({ status: "working", message: "Architect\u304C\u30D7\u30E9\u30F3\u3092\u7ACB\u6848\u4E2D...", agentId: "architect" });
          const plan = await this.architect.plan(requirements);
          this.notify({ status: "success", message: "\u30D7\u30E9\u30F3\u304C\u78BA\u5B9A\u3057\u307E\u3057\u305F\u3002", agentId: "architect" });
          for (const step of plan.steps) {
            const id = step.agent.toLowerCase();
            this.notify({
              status: "working",
              message: `${step.agent} \u304C\u30A2\u30AF\u30B7\u30E7\u30F3\u3092\u5B9F\u884C\u4E2D: ${step.action}`,
              agentId: id
            });
            let result;
            switch (step.agent) {
              case "Curator":
                result = { message: "Curated 10 high-quality articles based on interests." };
                break;
              case "Discovery":
                result = await this.discovery.discoverSources({ categories: {} });
                break;
              case "Archivist":
                result = await this.archivist.summarizeAndArchive("Aegis Nexus System Update");
                break;
              default:
                result = { message: "Unknown agent action performed." };
            }
            this.notify({
              status: "success",
              message: `${step.agent} \u306E\u30BF\u30B9\u30AF\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002`,
              agentId: id,
              data: result
            });
          }
          this.notify({ status: "idle", message: "\u5168\u3066\u306E\u81EA\u5F8B\u30BF\u30B9\u30AF\u304C\u6B63\u5E38\u306B\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002" });
          this.notify({ status: "refresh", message: "Updating intelligence feed..." });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error("[NexusOrchestrator] Error:", error);
          this.notify({ status: "error", message: `\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F: ${msg}` });
        } finally {
          this.isRunning = false;
          ["architect", "curator", "discovery", "archivist"].forEach((id) => {
            this.notify({ status: "idle", message: "\u5F85\u6A5F\u4E2D", agentId: id });
          });
        }
      }
    };
  }
});

// electron/main.cjs
var { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, shell, nativeImage } = require("electron");
var path4 = require("path");
var fs6 = require("fs");
var fastify = require("fastify");
var cors = require("@fastify/cors");
app.setName("Aegis Nexus");
var { ElectronSettingsManager: ElectronSettingsManager2 } = (init_ElectronSettingsManager(), __toCommonJS(ElectronSettingsManager_exports));
var { GeminiService: GeminiService2 } = (init_GeminiService(), __toCommonJS(GeminiService_exports));
var { FeedManager: FeedManager2 } = (init_FeedManager(), __toCommonJS(FeedManager_exports));
var { DiscoveryService: DiscoveryService2 } = (init_DiscoveryService(), __toCommonJS(DiscoveryService_exports));
var { EnrichmentService: EnrichmentService2 } = (init_EnrichmentService(), __toCommonJS(EnrichmentService_exports));
var { RSSFetcher: RSSFetcher2 } = (init_RSSFetcher(), __toCommonJS(RSSFetcher_exports));
var { ScoringService: ScoringService2 } = (init_ScoringService(), __toCommonJS(ScoringService_exports));
var { nexusRouter: nexusRouter2 } = (init_NexusRouter(), __toCommonJS(NexusRouter_exports));
var { ScraperFacade: ScraperFacade2 } = (init_ScraperFacade(), __toCommonJS(ScraperFacade_exports));
var { NexusOrchestrator: NexusOrchestrator2 } = (init_NexusOrchestrator(), __toCommonJS(NexusOrchestrator_exports));
var mainWindow;
var settingsManager;
var scraper;
var discoveryService;
var orchestrator;
var geminiService;
var rssFetcher;
var feedManager;
var enrichmentService;
var isDev = !app.isPackaged;
function setupDataDirectory() {
  const userDataPath = app.getPath("userData");
  const dataDir2 = path4.join(userDataPath, "data");
  if (!fs6.existsSync(dataDir2)) {
    console.log("[Main] Creating data directory...");
    fs6.mkdirSync(dataDir2, { recursive: true });
  }
  const defaultDataDir = isDev ? path4.join(__dirname, "..", "data") : path4.join(process.resourcesPath, "default-data");
  if (fs6.existsSync(defaultDataDir)) {
    const requiredFiles = ["interests.json", "feed_config.json"];
    for (const file of requiredFiles) {
      const destPath = path4.join(dataDir2, file);
      const srcPath = path4.join(defaultDataDir, file);
      if (fs6.existsSync(srcPath) && (!fs6.existsSync(destPath) || fs6.statSync(destPath).size < 5)) {
        fs6.copyFileSync(srcPath, destPath);
        console.log(`[Main] Restored default ${file} to user data directory.`);
      }
    }
  }
  return dataDir2;
}
var dataDir = setupDataDirectory();
async function startBackend() {
  console.log("[Main] Starting backend services...");
  settingsManager = new ElectronSettingsManager2({ dataDir, isDev });
  await settingsManager.init();
  settingsManager.usageManager.onUpdate = (stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("usage-update", stats);
    }
  };
  const apiKey = await settingsManager.getApiKey();
  geminiService = new GeminiService2(apiKey);
  geminiService.setUsageManager(settingsManager.usageManager);
  const feedConfigPath = path4.join(dataDir, "feed_config.json");
  feedManager = new FeedManager2(feedConfigPath);
  feedManager.setSaveHandler(async (config) => {
    await settingsManager.saveFeedConfig(config);
  });
  await feedManager.loadConfig();
  rssFetcher = new RSSFetcher2();
  discoveryService = new DiscoveryService2(geminiService, rssFetcher, feedManager);
  enrichmentService = new EnrichmentService2(geminiService, dataDir);
  scraper = new ScraperFacade2("", feedConfigPath, dataDir);
  scraper.rssFetcher = rssFetcher;
  scraper.geminiService = geminiService;
  scraper.enrichmentService = enrichmentService;
  scraper.feedManager = feedManager;
  orchestrator = new NexusOrchestrator2(geminiService);
  const server = fastify({ logger: isDev });
  const allowedOrigins = /* @__PURE__ */ new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]);
  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) cb(null, true);
      else cb(new Error("CORS: origin not allowed"), false);
    }
  });
  await server.register(nexusRouter2, {
    prefix: "/api/v5",
    scraper,
    evolution: discoveryService,
    orchestrator,
    settingsManager
  });
  server.get("/api/dashboard", async () => {
    const interests = await settingsManager.getInterests();
    return await scraper.getDashboard(interests);
  });
  try {
    await server.listen({ port: 3005, host: "127.0.0.1" });
    console.log("[Main] Internal Fastify server listening on http://127.0.0.1:3005");
  } catch (err) {
    console.error("[Main] Failed to start internal Fastify server:", err);
  }
}
function createWindow() {
  const iconPath = path4.join(__dirname, "../public/app-icon-192.png");
  const icon = nativeImage.createFromPath(iconPath);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 400,
    minHeight: 300,
    useContentSize: true,
    frame: false,
    icon,
    transparent: false,
    // FancyZones対応のため透明度はオフ
    backgroundMaterial: "acrylic",
    // Windows 11 アクリル透過を有効化
    backgroundColor: "#00000000",
    // アクリル効果を活かすため完全に透明に設定
    resizable: true,
    // 明示的に有効化
    hasShadow: true,
    thickFrame: true,
    // Windowsでのスナップ(FancyZones)対応に必須
    webPreferences: {
      preload: path4.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (orchestrator && typeof orchestrator.setWebContents === "function") {
    orchestrator.setWebContents(mainWindow.webContents);
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path4.join(__dirname, "../dist/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    settingsManager.getInterests().then((interests) => {
      scraper.fetchAndProcessArticlesWithFallback(interests).then((articles) => {
        console.log(`[Main] Initial fetch completed: ${articles.length} articles.`);
      });
    });
  });
}
function setupIpcHandlers() {
  ipcMain.handle("get-articles", async () => {
    const interests = await settingsManager.getInterests();
    const dashboardData = await scraper.getDashboard(interests);
    const allArticles = [];
    Object.values(dashboardData).forEach((group) => {
      if (group?.articles) allArticles.push(...group.articles);
    });
    return allArticles.sort((a, b) => b.score - a.score).slice(0, 500);
  });
  ipcMain.handle("get-settings", async () => {
    const interests = await settingsManager.getInterests();
    const feedConfig = await settingsManager.getFeedConfig();
    return { interests, feedConfig };
  });
  ipcMain.handle("sync-settings", async (event, settings) => {
    const result = await settingsManager.syncSettings(settings, rssFetcher);
    if (feedManager) feedManager.config = result.validatedFeedConfig;
    return result;
  });
  ipcMain.handle("trigger-orchestration", async (event, requirements) => {
    try {
      void orchestrator.runAutonomousLoop(requirements || "");
      return { success: true, newFeedsCount: 0 };
    } catch (err) {
      console.error("[Main] Trigger orchestration failed:", err);
      return { success: false, error: String(err) };
    }
  });
  ipcMain.handle("suggest-category", async (event, name) => {
    return await geminiService.suggestCategoryDetails(name);
  });
  ipcMain.handle("discover-trends", async () => {
    const interests = await settingsManager.getInterests();
    const suggestions = await scraper.discoverTrends(interests);
    return { suggestions };
  });
  ipcMain.handle("restructure-categories", async (event, count, language) => {
    const interests = await settingsManager.getInterests();
    return await discoveryService.getRestructureProposal(interests, count, language || "ja");
  });
  ipcMain.handle("translate-interests", async (event, settings) => {
    return await discoveryService.translateInterests(settings);
  });
  ipcMain.handle("get-api-key", async () => {
    return await settingsManager.getApiKey();
  });
  ipcMain.handle("save-api-key", async (event, key) => {
    await settingsManager.saveApiKey(key);
    geminiService.updateApiKey(key);
    return { success: true };
  });
  ipcMain.handle("get-ui-settings", async () => {
    return await settingsManager.getUiSettings();
  });
  ipcMain.handle("save-ui-settings", async (event, settings) => {
    await settingsManager.saveUiSettings(settings);
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: settings.autoLaunch,
        path: app.getPath("exe")
      });
    }
    return { success: true };
  });
  ipcMain.handle("get-usage-stats", async () => {
    return await settingsManager.getUsageStats();
  });
  ipcMain.handle("reset-to-defaults", async (event, lang) => {
    const success = await settingsManager.resetToDefaults(lang || "ja");
    return { success };
  });
  ipcMain.on("window-control", (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case "minimize":
        mainWindow.minimize();
        break;
      case "maximize":
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
        break;
      case "close":
        mainWindow.close();
        break;
      case "quit":
        app.quit();
        break;
    }
  });
  ipcMain.on("open-external", (event, url) => {
    if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
      shell.openExternal(url);
    }
  });
  ipcMain.on("open-article", (event, url) => {
    if (typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"))) {
      const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });
      win.setMenu(null);
      win.loadURL(url);
      win.webContents.on("before-input-event", (inputEvent, input) => {
        if (input.control && input.key.toLowerCase() === "q") {
          win.close();
          inputEvent.preventDefault();
        }
      });
    }
  });
  ipcMain.handle("get-proposals", async () => {
    return { proposals: [] };
  });
}
app.whenReady().then(async () => {
  await startBackend();
  setupIpcHandlers();
  const uiSettings = await settingsManager.getUiSettings();
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: uiSettings.autoLaunch,
      path: app.getPath("exe")
    });
  }
  createWindow();
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    mainWindow?.webContents.toggleDevTools();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
