# Gadget Concierge Plus - Windows Startup Script 🚀🎸

# プロジェクトディレクトリへ移動
cd "C:\Users\charg\myWorkspace\gadget-concierge-plus"

# Dockerコンテナを起動 (バックグラウンド)
Write-Host "バックエンド・サーバーを起動中..." -ForegroundColor Cyan
docker-compose up -d

# APIが準備できるまで数秒待機
Start-Sleep -Seconds 3

# ダッシュボードをブラウザで表示
Write-Host "ダッシュボードを表示します..." -ForegroundColor Cyan
start chrome "C:\Users\charg\myWorkspace\gadget-concierge-plus\dashboard\index.html"

# Gemini CLI を起動
Write-Host "Gemini CLI を起動します。準備はいいですか、みつひでさん？ 🚀" -ForegroundColor Yellow
gemini
