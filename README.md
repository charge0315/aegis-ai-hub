# Gadget Concierge Plus 🚀🎸

みつひでさんの興味に特化した、自律学習型ガジェットニュース・ダッシュボード。

## 🌟 主な機能

- **並列スクレイピング・エンジン (New!)**: 複数カテゴリのフィードを同時に取得し、更新速度を劇的に向上。
- **自律型ヘルスチェック (New!)**: バックグラウンドでフィードの死活監視を自動実行し、故障したフィードを予備プールから補充。
- **インテリジェント・エンリッチメント (New!)**: RSSに画像がない場合、元記事から `og:image` を自動抽出し、ダッシュボードを華やかに。
- **モダン・モジュール化 UI (New!)**: 
  - **スケルトンスクリーン**: 読み込み中の体感速度を向上。
  - **Masonryレイアウト**: 記事カードを隙間なく美しく配置。
  - **クイック検索**: 取得済み記事をリアルタイムに絞り込み。
  - **既読管理**: LocalStorageを活用したスマートな既読追跡。

## 🛠 テックスタック

- **Backend**: Node.js, Express, RSS-Parser, Cheerio (Docker / Service-Oriented Architecture)
- **Frontend**: Vanilla JS (ES Modules), Tailwind CSS, FontAwesome, LocalStorage
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
