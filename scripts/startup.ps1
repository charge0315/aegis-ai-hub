# Aegis Nexus v5.2 - Startup Configuration Script
# This script handles the setup for the new Standalone Desktop App.

$ProjectRoot = Get-Location

Write-Host "--- Aegis Nexus v5.2 Setup ---" -ForegroundColor Cyan

# Modern Desktop App Setup
# The app now manages its own startup via 'app.setLoginItemSettings' in production.
# For development/manual setup, we point to the project folder.

Write-Host "Setup complete. The Desktop App (v5.2) will now manage its own auto-launch settings." -ForegroundColor Green
Write-Host "To manually launch in dev mode: cd dashboard; npm run electron:dev" -ForegroundColor Gray
