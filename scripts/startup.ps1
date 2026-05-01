# Aegis Nexus v5.2 - Startup Configuration Script
# This script handles cleaning up old Docker-based startup logic and sets up the new Desktop App.

$ProjectRoot = Get-Location
$StartupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$OldShortcut = Join-Path $StartupFolder "AegisAIHub.lnk"

Write-Host "--- Aegis Nexus v5.2 Migration ---" -ForegroundColor Cyan

# 1. Old Docker-based cleanup
if (Test-Path $OldShortcut) {
    Write-Host "Removing legacy Docker-based startup shortcut..." -ForegroundColor Yellow
    Remove-Item $OldShortcut -Force
}

# 2. Modern Desktop App Setup
# The app now manages its own startup via 'app.setLoginItemSettings' in production.
# For development/manual setup, we point to the project folder.

Write-Host "Cleanup complete. The Desktop App (v5.2) will now manage its own auto-launch settings." -ForegroundColor Green
Write-Host "To manually launch in dev mode: cd dashboard; npm run electron:dev" -ForegroundColor Gray
