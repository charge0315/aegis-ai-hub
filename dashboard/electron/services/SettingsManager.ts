import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { InterestsSchema, FeedConfigSchema, Interests, FeedConfig, SyncSettings, WindowStateSchema, CredentialsSchema, Credentials } from '../models/Schemas';

class SettingsManager {
  private interestsPath: string;
  private feedConfigPath: string;
  private credentialsPath: string;
  private dataDir: string;

  constructor() {
    // Electron環境では app.getPath('userData') を使用
    this.dataDir = path.join(app.getPath('userData'), 'data');
    
    this.interestsPath = path.join(this.dataDir, 'interests.json');
    this.feedConfigPath = path.join(this.dataDir, 'feed_config.json');
    this.credentialsPath = path.join(this.dataDir, 'credentials.json');
    
    console.log(`[SettingsManager] Using interests path: ${this.interestsPath}`);
    console.log(`[SettingsManager] Using feed config path: ${this.feedConfigPath}`);
    console.log(`[SettingsManager] Using credentials path: ${this.credentialsPath}`);
  }

  /**
   * 初期化：データディレクトリの作成
   */
  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      const defaultInterests = {
        "categories": {
          "ゲーム・配信": {
            "emoji": "🎮",
            "brands": ["Sony Interactive Entertainment", "Nintendo", "SEGA", "Capcom", "Square Enix", "バンダイナムコエンターテインメント", "CD PROJEKT RED", "HoYoverse", "Epic Games", "Valve", "FromSoftware", "Riot Games", "Electronic Arts", "Pocketpair", "ZETA DIVISION", "Crazy Raccoon", "Tencent Games", "KRAFTON", "Naughty Dog", "Elgato", "AVerMedia", "OBS Studio", "SCUF Gaming", "Secretlab", "ZOWIE", "SteelSeries"],
            "keywords": ["PS5 Pro", "Nintendo Switch 2", "Xbox", "Steam", "Steam Deck", "GeForce NOW", "eスポーツ", "Twitch", "Discord", "Valorant", "Apex Legends", "ストリートファイター6", "モンスターハンターワイルズ", "原神", "崩壊：スターレイル", "パルワールド", "ゲーミングUMPC", "DLSS / FSR", "レイトレーシング", "インディーゲーム", "VTuber", "キャプチャーボード", "クラウドゲーミング", "ゲーミングルーター", "フレームジェネレーション", "リロードキャンセル", "ストリーマー", "仁王"],
            "score": 10,
            "reason": "クリエイターエコノミーの文脈として欠かせない「ゲーム配信・ストリーミング機材（Elgato, AVerMedia）」をこのカテゴリに統合し、プレイから配信までを一元化しました。"
          },
          "AI・ソフトウェア": {
            "emoji": "🤖",
            "brands": ["OpenAI", "Anthropic", "Google", "Microsoft", "Meta", "DeepSeek", "GitHub", "Genspark", "Mistral AI", "Hugging Face", "Perplexity", "Midjourney", "Stability AI", "Notion", "Figma", "Cursor", "Vercel", "Groq", "xAI", "Cohere", "Canva", "Runway", "Luma AI", "Zapier", "ElevenLabs", "Poe", "Weights & Biases"],
            "keywords": ["ChatGPT", "GPT-4o", "Claude", "Gemini", "Llama", "Copilot", "AIエージェント", "RAG", "ローカルLLM", "LangChain", "画像生成AI", "動画生成AI", "音楽生成AI", "Sora", "SaaS", "Zenn", "Qiita", "VLM (視覚言語モデル)", "AI検索", "Dify", "SLM (小規模言語モデル)", "ノーコード/ローコード", "MoE (Mixture of Experts)", "GPUクラスター", "プロンプトエンジニアリング", "AIコーディングアシスタント", "音声合成AI"],
            "score": 10,
            "reason": "名称を簡潔化。近年のオープンモデルや新興AIの台頭を受け「DeepSeek」などの重要ブランドと最新モデル名を追加。また、音楽生成AIなどのクリエイティブAIトレンドを補完しました。"
          },
          "PCパーツ": {
            "emoji": "⚙️",
            "brands": ["NVIDIA", "AMD", "Intel", "Qualcomm", "Arm", "TSMC", "ASML", "ASRock", "ZOTAC", "GIGABYTE", "Corsair", "KIOXIA", "Western Digital", "Crucial", "Broadcom", "SK hynix", "Samsung Foundry", "Noctua", "Lian Li", "Supermicro", "Phanteks", "NZXT", "Cooler Master", "be quiet!", "Micron"],
            "keywords": ["RTX 50シリーズ", "Ryzen", "Core Ultra", "Snapdragon X", "NPU", "GPU", "マザーボード", "メモリ", "SSD", "自作PC", "冷却クーラー", "水冷", "AI PC", "HBM (広帯域メモリ)", "2nmプロセス", "チップレット", "RISC-V", "裏配線マザーボード", "PCIe 5.0", "GDDR7", "ガラス基板", "AIアクセラレータ", "シリコンフォトニクス"],
            "score": 10,
            "reason": "直感的な名称に変更。AIインフラとして存在感を増すSupermicroを追加し、GPUや最新のRTX 50シリーズといった、直近のハードウェア・トレンドワードを更新しました。"
          },
          "オーディオ・音楽制作": {
            "emoji": "🎧",
            "brands": ["Sony", "Audio-Technica", "Technics", "Sennheiser", "Bose", "Shokz", "YAMAHA", "Roland", "KORG", "Fender", "Gibson", "Furch", "Universal Audio", "Focusrite", "Steinberg", "Apple Music", "Spotify", "FiiO", "Moondrop", "Genelec", "Teenage Engineering", "Native Instruments", "Sonos", "Shure", "Neumann", "AKG", "beyerdynamic", "Arturia", "Ableton"],
            "keywords": ["ワイヤレスイヤホン", "ヘッドホン", "ノイズキャンセリング", "空間オーディオ", "ハイレゾ", "サウンドバー", "ポッドキャスト", "ギター", "アコースティックギター", "アンプ", "エフェクター", "オーディオインターフェース", "DAW", "DAC", "DTM", "オープンイヤー型イヤホン", "LDAC", "MEMSスピーカー", "ドルビーアトモス", "VSTプラグイン", "MIDIキーボード", "シンセサイザー", "IEM (インイヤーモニター)", "マスタリングAI", "32bit Float録音", "バイノーラルマイク", "プラナーマグネティック"],
            "score": 10,
            "reason": "スマートスピーカー/オーディオとして評価の高いSonosや、マイク・オーディオの定番Shureを追加し、リスニングと制作機材のハイブリッドカテゴリとして完成度を高めました。"
          },
          "PC・デバイス": {
            "emoji": "💻",
            "brands": ["Apple", "HP", "Dell", "Lenovo", "ASUS", "MSI", "Minisforum", "Logicool", "Razer", "Wooting", "Keychron", "HHKB", "REALFORCE", "ELECOM", "FLEXISPOT", "Herman Miller", "Ergotron", "Steelcase", "GPD", "AYANEO", "NuPhy", "Wacom", "BenQ", "LG", "PFU", "Epomaker", "Kinesis", "TourBox", "Grovemade"],
            "keywords": ["Mac", "MacBook", "ゲーミングPC", "ミニPC", "ポータブルゲーミングPC", "メカニカルキーボード", "ゲーミングマウス", "ゲーミングモニター", "デスクセットアップ", "電動昇降デスク", "モニターアーム", "Thunderbolt 5", "Copilot+ PC", "ラピッドトリガー", "デスクツアー", "ウルトラワイドモニター", "ガススプリング式", "ペンタブレット", "液タブ", "NPU搭載PC", "8000Hzポーリングレート", "マグネティックキースイッチ", "左手デバイス", "PBTキーキャップ"],
            "score": 10,
            "reason": "入力機器とディスプレイ環境の重要性を強調するため名称を変更。モニター市場で欠かせないBenQ、LGを追加し、最新規格（Thunderbolt 5）を補完しました。"
          },
          "周辺機器・PCアクセサリ": {
            "emoji": "⚡",
            "brands": ["Anker", "CIO", "Belkin", "UGREEN", "EcoFlow", "Jackery", "BLUETTI", "Baseus", "Sharge", "SATECHI", "MOFT", "dbrand", "Zendure", "NITECORE", "Orico", "Hyper", "Nomad", "PITAKA"],
            "keywords": ["モバイルバッテリー", "急速充電器", "USB-C", "Qi2", "MagSafe", "窒化ガリウム (GaN)", "ケーブル", "ポータブル電源", "ソーラーパネル", "USB4", "パススルー充電", "リン酸鉄リチウムイオン電池", "USB PD EPR (240W)", "PPS (Programmable Power Supply)", "Thunderbolt 4ドック", "ソリッドステートバッテリー", "ケーブルマネジメント", "Vマウントバッテリー", "GaNFast"],
            "score": 10,
            "reason": "ガジェットの運用に直結する電源系ブランドにZendureを追加し、名称を一般的な「周辺機器」に変更することで、より広範なアクセサリニュースをカバーできるようにしました。"
          },
          "モバイル・タブレット": {
            "emoji": "📱",
            "brands": ["Apple", "Google", "Samsung", "Sony", "Xiaomi", "HUAWEI", "OPPO", "Nothing", "Motorola", "ASUS", "XREAL", "VITURE", "PICO", "vivo", "HONOR", "HTC", "Rokid", "Bigscreen", "Meta", "Immersed", "Lenovo", "Shiftall", "OnePlus", "TCL"],
            "keywords": ["iPhone", "iPad", "Android", "Androidタブレット", "Xperia", "Pixel", "Galaxy", "折りたたみスマホ", "空間コンピューティング", "Apple Vision Pro", "Meta Quest 3", "XR", "AR", "VR", "スマートグラス", "オンデバイスAI", "衛星通信", "マイクロOLED", "空間ビデオ", "カラーパススルー", "チタンフレーム", "120Hzリフレッシュレート", "アイトラッキング", "ハンドトラッキング", "BCI連携"],
            "score": 10,
            "reason": "名称を「モバイル」に統合。XR領域の基盤プラットフォームであるMeta、スマートグラス市場を牽引するVITUREを補完し、モバイルとXRのシームレスな情報連携を強化しました。"
          }
        },
        "lastUpdated": Date.now()
      };

      const defaultFeedConfig = {
        "AI・ソフトウェア": {
          "active": ["https://japan.googleblog.com/atom.xml", "https://zenn.dev/topics/ai/feed", "https://rss.itmedia.co.jp/rss/2.0/ait.xml"],
          "pool": [],
          "failures": {}
        },
        "ゲーム": {
          "active": ["https://www.4gamer.net/rss/index.xml", "https://news.denfaminicogamer.jp/feed"],
          "pool": ["https://www.famitsu.com/rss/all.xml", "https://game.watch.impress.co.jp/data/rss/gmw/index.rdf"],
          "failures": {}
        },
        "PC・ハードウェア": {
          "active": ["https://ascii.jp/digital/rss.xml", "https://rss.itmedia.co.jp/rss/2.0/pcuser.xml"],
          "pool": ["https://akiba-pc.watch.impress.co.jp/data/rss/akiba/index.rdf", "https://srad.jp/srad.rss"],
          "failures": {}
        }
      };

      // 初期ファイルが存在しない場合はデフォルトの内容を作成
      await this._ensureFile(this.interestsPath, { categories: defaultInterests.categories, lastUpdated: Date.now() });
      await this._ensureFile(this.feedConfigPath, defaultFeedConfig);
      await this._ensureFile(this.credentialsPath, { geminiApiKey: '' });
    } catch (err) {
      console.error('Failed to initialize SettingsManager:', err);
    }
  }

  private async _ensureFile(filePath: string, defaultContent: unknown) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    }
  }

  /**
   * Get API Key from credentials.json or environment
   */
  async getApiKey(): Promise<string> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);
      return creds.geminiApiKey || process.env.GEMINI_API_KEY || '';
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return process.env.GEMINI_API_KEY || '';
    }
  }

  /**
   * Save API Key to credentials.json
   */
  async saveApiKey(apiKey: string): Promise<void> {
    const creds: Credentials = { geminiApiKey: apiKey };
    await this._safeWrite(this.credentialsPath, creds);
  }

  /**
   * Read and validate interests.json
   */
  async getInterests(): Promise<Interests> {
    try {
      const data = await fs.readFile(this.interestsPath, 'utf8');
      const json = JSON.parse(data);
      return InterestsSchema.parse(json);
    } catch (error) {
      console.error('Failed to load interests:', error);
      return { categories: {}, lastUpdated: Date.now() };
    }
  }

  /**
   * Read and validate feed_config.json
   */
  async getFeedConfig(): Promise<FeedConfig> {
    try {
      const data = await fs.readFile(this.feedConfigPath, 'utf8');
      const json = JSON.parse(data);
      return FeedConfigSchema.parse(json);
    } catch (error) {
      console.error('Failed to load feed config:', error);
      return {};
    }
  }

  /**
   * Save settings with validation, backup, and atomic write.
   */
  async syncSettings({ interests, feedConfig, windowState, lastUpdated }: SyncSettings): Promise<{ success: boolean; timestamp: string; lastUpdated: number }> {
    console.log('[SettingsManager] syncSettings started');
    // 1. Validate
    const validatedInterests = InterestsSchema.parse(interests);
    const validatedFeedConfig = FeedConfigSchema.parse(feedConfig);
    const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : undefined;

    // 2. Conflict Resolution
    const currentInterests = await this.getInterests();
    const serverLastUpdated = currentInterests.lastUpdated || 0;
    
    if (lastUpdated && lastUpdated < serverLastUpdated) {
      console.warn(`[SettingsManager] Conflict detected: client=${lastUpdated}, server=${serverLastUpdated}`);
      throw new Error('CONFLICT: Settings on device are newer.');
    }

    const now = Date.now();
    validatedInterests.lastUpdated = now;

    // 3. Save
    await this._safeWrite(this.interestsPath, validatedInterests);
    await this._safeWrite(this.feedConfigPath, validatedFeedConfig);

    if (validatedWindowState) {
      const windowStatePath = path.join(this.dataDir, 'window_state.json');
      await this._safeWrite(windowStatePath, validatedWindowState);
    }

    console.log('[SettingsManager] syncSettings complete');
    return { 
      success: true, 
      timestamp: new Date().toISOString(),
      lastUpdated: now
    };
  }

  async getWindowState(): Promise<unknown | null> {
    const windowStatePath = path.join(this.dataDir, 'window_state.json');
    try {
      const content = await fs.readFile(windowStatePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async _safeWrite(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        await fs.copyFile(filePath, `${filePath}.bak`);
      }
      await fs.writeFile(filePath, content, 'utf8');
    } catch (writeError: unknown) {
      const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
      console.error(`[SettingsManager] Write failed for ${filePath}:`, errorMessage);
      throw writeError;
    }
  }
}

export default new SettingsManager();
