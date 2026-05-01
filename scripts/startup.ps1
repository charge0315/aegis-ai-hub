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

Write-Log 'Starting Aegis AI Hub (Desktop App)...' 'Cyan'
cd "$ProjectRoot/dashboard"

# 開発モードか製品モードか判断（distがあれば製品モードとみなす）
if (Test-Path "dist") {
    npm run electron:build
} else {
    npm run electron:dev
}

Write-Log 'Aegis AI Hub is ready.' 'Yellow'
