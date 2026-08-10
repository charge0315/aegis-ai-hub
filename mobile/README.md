# Aegis Nexus Mobile

**[Aegis Nexus](../README.md)（デスクトップ版・Windows 11 Electron アプリ）のコンセプトを、そのまま iOS / Android に持ち込んだモバイル版プロジェクトです。**

*自律学習型のパーソナル AI インテリジェンス・ダッシュボード。あなたの興味を学習し、4体の専門 AI エージェントが Web を能動的に探索し、価値ある情報だけを届けます。*

---

## 🌟 コンセプト（デスクトップ版と共通）

- **AI Agent Swarm** — Architect（構造最適化）/ Curator（記事スコアリング）/ Discovery（情報源探索）/ Archivist（トレンド蓄積）の4エージェント
- **Bring Your Own LLM** — Google Gemini / Anthropic Claude / OpenAI 互換 / Ollama（ローカルLLM）を切り替え可能
- **Privacy-First** — API キーは端末の Keychain（iOS）/ Keystore（Android）に安全に保存。外部送信なし
- **Aegis Chroma UI** — Acrylic Glassmorphism を踏襲したダーク基調のグラス質感UI
- **Knowledge Graph** — 興味カテゴリと記事の関連を可視化するインタラクティブなグラフ

## 🛠️ 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Expo (React Native) + TypeScript |
| ナビゲーション | React Navigation (Bottom Tabs) |
| UI | expo-blur / expo-linear-gradient によるグラスモーフィズム |
| 可視化 | react-native-svg（ナレッジグラフ） |
| ローカル永続化 | AsyncStorage（設定・興味）/ expo-secure-store（APIキー） |
| AI連携 | Gemini / Claude / OpenAI互換 / Ollama を共通インターフェースで抽象化（`src/services/llm`） |

対応プラットフォーム: **iOS** / **Android**（Expo により単一コードベースでビルド）

## 📁 プロジェクト構成

```
mobile/
├── App.tsx                     # エントリーポイント
├── src/
│   ├── theme/                  # デザイントークン（色・余白・グラデーション）
│   ├── navigation/              # Bottom Tab ナビゲーション
│   ├── screens/                 # Dashboard / Agents / Graph / Nexus / Settings
│   ├── components/              # GlassCard, ScoreBadge, AgentStatusPill 等
│   ├── services/
│   │   ├── llm/                 # Gemini/Claude/OpenAI/Ollama 抽象化レイヤー
│   │   ├── agents.ts            # 4エージェント定義とオーケストレーション実行
│   │   └── settingsStore.ts     # AsyncStorage / SecureStore ラッパー
│   ├── hooks/useAppSettings.tsx # 言語・LLM設定・興味プロファイルの共有状態
│   ├── data/                    # シードデータ（記事・興味カテゴリ）
│   ├── types/                   # 共通ドメイン型
│   └── i18n/                    # 日本語 / English
```

## 🚀 セットアップ

### 前提条件

- Node.js v20+
- Expo Go アプリ（実機で試す場合）または Xcode / Android Studio（シミュレータ/エミュレータ）

### インストールと起動

```bash
cd mobile
npm install
npm start          # Expo 開発サーバーを起動、QRコードを Expo Go でスキャン

npm run ios        # iOS シミュレータ (macOS + Xcode が必要)
npm run android    # Android エミュレータ (Android Studio が必要)
```

起動後、**設定** タブで利用したい LLM プロバイダー（Gemini / Claude / OpenAI互換 / Ollama）を選び、API キーを入力してください（Ollama はローカルサーバーの URL のみでOK、APIキー不要）。**エージェント** タブから「エージェントを実行」を押すと、選択した LLM が Architect / Discovery / Curator / Archivist として実際に応答します（APIキー未設定時はローカル推定にフォールバック）。

## 🔒 セキュリティ

- API キーは `expo-secure-store` により端末の Keychain（iOS）/ Keystore（Android）に保存され、平文でディスクに残りません
- LLM プロバイダーへの通信は各社の公式APIエンドポイントへの直接呼び出しのみで、独自バックエンドを経由しません
- Ollama 利用時はネットワーク内のローカルサーバーとのみ通信し、外部送信は発生しません

## 🗺️ 今後の展望

- Discovery エージェントによる実 RSS/Web 探索のモバイル実装（デスクトップ版 `RSSFetcher` / `DiscoveryService` 相当）
- プッシュ通知によるダイジェスト配信
- ナレッジグラフのインタラクティブなドラッグ操作（react-native-reanimated + react-native-gesture-handler）
- ネイティブアプリストア配信（EAS Build / EAS Submit）

---

デスクトップ版の詳細は [ルートの README](../README.md) を参照してください。
