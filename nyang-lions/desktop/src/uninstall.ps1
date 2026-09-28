$ErrorActionPreference = 'SilentlyContinue'
Get-Process -Name 'NyangLions' | Stop-Process -Force
Start-Sleep -Milliseconds 500
Remove-Item (Join-Path $env:LOCALAPPDATA 'NyangLions') -Recurse -Force
foreach ($n in @('냥이 라이온즈.lnk','꾹꾹이즈.lnk')) { Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) $n) -Force; Remove-Item (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$n") -Force }
Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'NyangLions'
Write-Host '  꾹꾹이즈를 지웠어요. (키우던 기록은 %APPDATA%\NyangLions 에 남아 있어요)'
Start-Sleep -Seconds 3
