# launch-brave.ps1 — Inicia Brave con remote debugging habilitado
# Después de ejecutar esto, navegá a riders.uber.com e iniciá sesión
# Luego ejecutá: node extract.js

$bravePath = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
$userData = "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"

Write-Host ">> Iniciando Brave con remote debugging en puerto 9222..." -ForegroundColor Cyan
Write-Host "   Perfil: $userData" -ForegroundColor Gray

# Matamos procesos Brave existentes para evitar conflicto de perfil
Get-Process -Name "brave" -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 1

& $bravePath --remote-debugging-port=9222 "--user-data-dir=$userData"

Write-Host ""
Write-Host "[OK] Brave iniciado con CDP en http://localhost:9222" -ForegroundColor Green
Write-Host "[*] Navega a https://riders.uber.com/trips e inicia sesion" -ForegroundColor Yellow
Write-Host "[*] Luego ejecuta: node extract.js" -ForegroundColor Yellow
