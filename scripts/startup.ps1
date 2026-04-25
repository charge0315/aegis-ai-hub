# Aegis AI Hub - Windows Startup Script
param (
    [switch]$Install # スタートアップにショートカットを作成する場合に使用
)

# 実行ディレクトリの取得
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent
cd $ProjectRoot

# --- スタートアップ登録機能 ---
if ($Install) {
    Write-Host 'Windows スタートアップに登録しています...' -ForegroundColor Yellow
    $StartupFolder = [System.Environment]::GetFolderPath('Startup')
    $ShortcutPath = Join-Path $StartupFolder 'AegisAIHub.lnk'
    
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = 'powershell.exe'
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File \"' + $PSCommandPath + '\"'
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.IconLocation = 'chrome.exe,0'
    $Shortcut.Description = 'Aegis AI Hub Auto Startup'
    $Shortcut.Save()
    
    Write-Host '登録完了！次回 Windows 起動時に自動で実行されます。' -ForegroundColor Green
    exit
}

# --- メイン起動プロセス ---

# 1. Dockerコンテナを起動
Write-Host 'バックエンド・サーバーを起動中 (Docker)...' -ForegroundColor Cyan
docker-compose up -d

# 2. サーバーの準備ができるまで待機（ポーリング）
Write-Host 'APIの準備を待っています...' -ForegroundColor Magenta
$MaxRetries = 30
$RetryCount = 0
$Url = 'http://localhost:3005/'

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            Write-Host 'API サーバーが正常に起動しました！' -ForegroundColor Green
            break
        }
    } catch {
        $RetryCount++
        Write-Host '.' -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($RetryCount -eq $MaxRetries) {
    Write-Host "`nサーバーの起動を確認できませんでした。Dockerの状態を確認してください。" -ForegroundColor Red
    exit
}

# 3. ダッシュボードを「アプリ・モード」で起動
Write-Host 'ダッシュボードをアプリモードで表示します...' -ForegroundColor Cyan

# 画面解像度の取得 (プライマリモニタ)
Add-Type -AssemblyName System.Windows.Forms
$Screen = [System.Windows.Forms.Screen]::PrimaryScreen
$ScreenWidth = $Screen.Bounds.Width
$ScreenHeight = $Screen.Bounds.Height

# ウィンドウサイズの計算 (幅 1/4, 高さ フル)
$WinWidth = [Math]::Floor($ScreenWidth / 4)
$WinHeight = $ScreenHeight
$PosX = $ScreenWidth - $WinWidth
$PosY = 0

# 起動するブラウザのパスを特定 (Chrome -> Edge の順に確認)
$BrowserPath = ""
$PotentialPaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

foreach ($Path in $PotentialPaths) {
    if (Test-Path $Path) {
        $BrowserPath = $Path
        break
    }
}

if ($BrowserPath -eq "") { $BrowserPath = "chrome" }

# URLの末尾のスラッシュを除去して正規化
$CleanUrl = $Url.TrimEnd('/')

# Chrome/Edge を右側 1/4 のサイズと位置で起動
$Arguments = "--app=""$CleanUrl"" --window-position=$PosX,$PosY --window-size=$WinWidth,$WinHeight"
Write-Host "起動コマンド: $BrowserPath $Arguments" -ForegroundColor Gray

try {
    Start-Process $BrowserPath -ArgumentList $Arguments
} catch {
    Write-Host "ブラウザの起動に失敗しました。直接ブラウザで $Url を開いてください。" -ForegroundColor Red
}


# 4. Gemini CLI を起動（作業用）
Write-Host '準備完了！Gemini CLI を起動します。' -ForegroundColor Yellow
gemini
