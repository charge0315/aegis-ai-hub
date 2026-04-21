# Gadget Concierge Plus 🚀🎸

みつひでさんの興味に特化した、自律学習型ガジェットニュース・ダッシュボード。

## 🌟 主な機能

- **パーソナライズ・スクレイピング**: 設定されたカテゴリ、ブランド、キーワードに基づき、最新のテックニュースを自動収集。
- **動的フィード管理システム (New!)**:
  - エラー（404等）が発生したRSSフィードを自動検出し、予備のフィードへ自動差し替え。
  - `data/feed_config.json` による自律的なURLメンテナンス。
- **鮮度優先フィルタリング (New!)**: 1ヶ月以上前の古い記事を自動除外。
- **高度な画像抽出ロジック**: `media:content` やサイト特有の埋め込みパターンに対応し、画像表示の精度を向上。
- **モダンなグラスモーフィズムUI**: Windows 11ライクな、美しくコンパクトなダッシュボード。

## 🛠 テックスタック

- **Backend**: Node.js, Express, RSS-Parser, Cheerio (Docker)
- **Frontend**: HTML5, Tailwind CSS, FontAwesome, JavaScript (Vanilla)
- **Data**: JSONベースの軽量・永続ストレージ

## 🚀 起動方法

### 1. 全システムの起動
付属のPowerShellスクリプトを実行するだけで、バックエンドのビルドからブラウザの起動まで自動で行われます。

```powershell
./scripts/startup.ps1
```

### 2. 手動起動
```bash
# バックエンド
cd server
docker-compose up -d --build

# フロントエンド
# dashboard/index.html をブラウザで開く
```

## 📝 設定と学習

- `data/interests.json`: みつひでさんの興味（カテゴリ・ブランド・キーワード）を管理。
- `data/feed_config.json`: 巡回対象のRSSフィードと予備プールを管理。
- ダッシュボード上の「Settings」パネルから、新しい興味を動的に学習させることが可能です。

---
*Created with Gemini CLI for Mitsuhide.*
