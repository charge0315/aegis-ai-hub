# Aegis AI Hub v5.0 - Windows Startup Script
# Powered by Gemini 3.1 - Fully Autonomous News Infrastructure
param (
    [switch]$Install
)

$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent
cd $ProjectRoot

if ($Install) {
    Write-Host 'Installing Aegis AI Hub to Startup...' -ForegroundColor Yellow
    $StartupFolder = [System.Environment]::GetFolderPath('Startup')
    
    $OldShortcuts = @('GadgetConcierge.lnk', 'GadgetConciergeStartup.lnk', 'AegisConcierge.lnk', 'AegisAIHub.lnk')
    foreach ($old in $OldShortcuts) {
        $oldPath = Join-Path $StartupFolder $old
        if (Test-Path $oldPath) {
            Remove-Item $oldPath -Force
            Write-Host "Old shortcut removed: $old" -ForegroundColor Gray
        }
    }

    $ShortcutPath = Join-Path $StartupFolder 'AegisAIHub.lnk'
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = 'powershell.exe'
    $Shortcut.Arguments = '-ExecutionPolicy Bypass -File \"' + $PSCommandPath + '\"'
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.IconLocation = 'chrome.exe,0'
    $Shortcut.Description = 'Aegis AI Hub - Autonomous Intelligence Dashboard'
    $Shortcut.Save()
    
    Write-Host 'Installation Complete!' -ForegroundColor Green
    exit
}

Write-Host 'Starting Backend (Docker)...' -ForegroundColor Cyan
docker-compose up -d

Write-Host 'Waiting for API...' -ForegroundColor Magenta
$MaxRetries = 30
$RetryCount = 0
$Url = 'http://localhost:3005/'

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            Write-Host 'API Server is UP!' -ForegroundColor Green
            break
        }
    } catch {
        $RetryCount++
        Write-Host '.' -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if ($RetryCount -eq $MaxRetries) {
    Write-Host "`nCould not connect to API. Please check Docker status." -ForegroundColor Red
    exit
}

Write-Host 'Launching Dashboard...' -ForegroundColor Cyan

Add-Type -AssemblyName System.Windows.Forms
$Screen = [System.Windows.Forms.Screen]::PrimaryScreen
$ScreenWidth = $Screen.Bounds.Width
$ScreenHeight = $Screen.Bounds.Height
$WinWidth = [Math]::Floor($ScreenWidth / 4)
$WinHeight = $ScreenHeight
$PosX = $ScreenWidth - $WinWidth
$PosY = 0

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

$CleanUrl = $Url.TrimEnd('/')
$Arguments = "--app=""$CleanUrl"" --window-position=$PosX,$PosY --window-size=$WinWidth,$WinHeight"

try {
    Start-Process $BrowserPath -ArgumentList $Arguments
} catch {
    Write-Host "Failed to launch browser. Please open $Url manually." -ForegroundColor Red
}

Write-Host 'Aegis AI Hub is ready.' -ForegroundColor Yellow
