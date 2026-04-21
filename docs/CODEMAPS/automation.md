# Automation & Lifecycle Codemap

**Last Updated:** 2026-04-21
**Key File:** `scripts/startup.ps1`

## 概要
Gadget Concierge Plus は、Windows 起動時に自動で立ち上がり、まるで OS の一部（ウィジェット）のように動作するライフサイクル管理を提供します。

## Windows 起動自動化 (`startup.ps1`)
- **インストール**: `startup.ps1 -Install` を実行すると、Windows の `Startup` フォルダにショートカット (`.lnk`) を作成。
- **ショートカット設定**:
  - **TargetPath**: `powershell.exe`
  - **Arguments**: `-ExecutionPolicy Bypass -File "startup.ps1"`
- **動作**: Windows ログイン直後に自動でバックエンドを起動し、Chrome を「アプリ・モード」で起動します。

## Chrome アプリ・モード
- **引数**: `--app=http://localhost:3005/`
- **効果**: ブラウザのタブやアドレスバー、ツールバーを非表示にし、専用のウィンドウとして表示。デスクトップ・ウィジェットのような外観を実現。

## Docker によるバックエンド管理
- `docker-compose.yml` により、Node.js API サーバーをコンテナ化。
- **依存環境の隔離**: ローカルの Node.js バージョンに依存せず、常に安定した環境で動作。
- `docker-compose up -d --build` により、常に最新のソースコードを反映。

## バックグラウンド監視 (`HealthMonitor`)
- バックエンド・コンテナ内で `setInterval` により定期実行される。
- フィードの異常を検知した際は、ログ出力と設定ファイルの自動更新を行い、自己修復を図る。
