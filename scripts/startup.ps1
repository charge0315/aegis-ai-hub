# Aegis AI Hub v5.0 - Windows Startup Script
# Powered by Gemini 3.1 - Fully Autonomous News Infrastructure
param (
    [switch]$Install
)

$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent
$LogFile = Join-Path $ProjectRoot "startup.log"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $FullMessage = "[$Timestamp] $Message"
    Add-Content -Path $LogFile -Value $FullMessage
    Write-Host $Message -ForegroundColor $Color
}

cd $ProjectRoot
"--- Startup Session started at $(Get-Date) ---" | Out-File $LogFile

if ($Install) {
    Write-Log 'Installing Aegis AI Hub to Startup...' 'Yellow'
    $StartupFolder = [System.Environment]::GetFolderPath('Startup')
    
    $OldShortcuts = @('GadgetConcierge.lnk', 'GadgetConciergeStartup.lnk', 'AegisConcierge.lnk', 'AegisAIHub.lnk')
    foreach ($old in $OldShortcuts) {
        $oldPath = Join-Path $StartupFolder $old
        if (Test-Path $oldPath) {
            Remove-Item $oldPath -Force
            Write-Log "Old shortcut removed: $old" 'Gray'
        }
    }

    $ShortcutPath = Join-Path $StartupFolder 'AegisAIHub.lnk'
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = 'powershell.exe'
    # Use double quotes for the file path, and ensure they are preserved in the shortcut
    $Shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""$PSCommandPath"""
    $Shortcut.WorkingDirectory = $ProjectRoot
    $Shortcut.IconLocation = 'chrome.exe,0'
    $Shortcut.Description = 'Aegis AI Hub - Autonomous Intelligence Dashboard'
    $Shortcut.Save()
    
    Write-Log 'Installation Complete!' 'Green'
    exit
}

Write-Log 'Checking Docker readiness...' 'Cyan'
$DockerRetry = 0
$MaxDockerRetry = 30
while ($DockerRetry -lt $MaxDockerRetry) {
    docker info > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log 'Docker is ready.' 'Green'
        break
    }
    $DockerRetry++
    Write-Log "Waiting for Docker Desktop... ($DockerRetry/$MaxDockerRetry)" 'Gray'
    Start-Sleep -Seconds 5
}

if ($DockerRetry -eq $MaxDockerRetry) {
    Write-Log 'Docker timed out. Please ensure Docker Desktop starts at login.' 'Red'
    exit
}

Write-Log 'Starting Backend (Docker)...' 'Cyan'
docker-compose up -d 2>&1 | Add-Content -Path $LogFile

Write-Log 'Waiting for API...' 'Magenta'
$MaxRetries = 30
$RetryCount = 0
$Url = 'http://localhost:3005/'

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            Write-Log 'API Server is UP!' 'Green'
            break
        }
    } catch {
        $RetryCount++
        Write-Log "Waiting for API... ($RetryCount/$MaxRetries)" 'Gray'
        Start-Sleep -Seconds 2
    }
}

if ($RetryCount -eq $MaxRetries) {
    Write-Log "Could connect to API. Please check Docker status." 'Red'
    exit
}

Write-Log 'Launching Dashboard...' 'Cyan'

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
    Write-Log 'Browser launched successfully.' 'Green'
} catch {
    Write-Log "Failed to launch browser. Please open $Url manually." 'Red'
}

Write-Log 'Aegis AI Hub is ready.' 'Yellow'
