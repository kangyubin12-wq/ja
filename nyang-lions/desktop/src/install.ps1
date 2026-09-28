$ErrorActionPreference = 'Stop'
trap { Write-Host ''; Write-Host "  설치 중 문제가 생겼어요: $_" -ForegroundColor Red; Write-Host '  인터넷 연결을 확인하고 install.bat 을 다시 실행해 주세요.'; Read-Host '  엔터를 누르면 창이 닫혀요'; exit 1 }
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest   = Join-Path $env:LOCALAPPDATA 'Kkukkukiz'
$oldDir = Join-Path $env:LOCALAPPDATA 'NyangLions'
$exeName = '꾹꾹이즈.exe'
$ver  = '33.4.11'
$url  = "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-x64.zip"
$tmp  = Join-Path $env:TEMP "kkukkukiz-electron-$ver.zip"
$exe  = Join-Path $dest $exeName
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

Write-Host ''
Write-Host '  꾹꾹이즈 바탕화면 고양이 설치' -ForegroundColor Cyan
Write-Host '  ---------------------------------'
Get-Process -Name 'NyangLions','꾹꾹이즈' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 700

# 예전 이름(NyangLions)으로 설치돼 있으면 새 이름으로 옮기기 (다시 내려받지 않아도 됨)
if ((Test-Path (Join-Path $oldDir 'NyangLions.exe')) -and -not (Test-Path $exe)) {
  Write-Host '  예전 버전(냥이 라이온즈)을 꾹꾹이즈로 옮기는 중...'
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Move-Item $oldDir $dest
  Rename-Item (Join-Path $dest 'NyangLions.exe') $exeName
}

if (-not (Test-Path $exe)) {
  Write-Host '  1/3  실행 엔진 내려받는 중 (약 110MB, 1~3분)...'
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  Write-Host '  2/3  압축 푸는 중...'
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Expand-Archive -Path $tmp -DestinationPath $dest -Force
  Remove-Item $tmp -Force
  Rename-Item (Join-Path $dest 'electron.exe') $exeName
} else {
  Write-Host '  1/3  실행 엔진은 이미 있어요. 게임 파일만 새로 바꿔요.'
}

# 작업 관리자 등에 'Electron' 대신 '꾹꾹이즈'로 보이게 (실패해도 설치는 계속)
try {
  $rc = Join-Path $env:TEMP 'kkukkukiz-rcedit.exe'
  if (-not (Test-Path $rc)) { Invoke-WebRequest -Uri 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe' -OutFile $rc -UseBasicParsing }
  & $rc $exe --set-version-string FileDescription '꾹꾹이즈' --set-version-string ProductName '꾹꾹이즈' --set-version-string OriginalFilename $exeName --set-icon (Join-Path $here 'app\icon.ico') | Out-Null
} catch { }

Write-Host '  3/3  게임 파일 복사하고 바로가기 만드는 중...'
$appDir = Join-Path $dest 'resources\app'
if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
Copy-Item (Join-Path $here 'app') $appDir -Recurse -Force
$ico = Join-Path $appDir 'icon.ico'

# 예전 바로가기 지우기
$desk  = [Environment]::GetFolderPath('Desktop')
$start = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
foreach ($n in @('냥이 라이온즈.lnk','꾹꾹이즈.lnk')) { foreach ($d in @($desk, $start)) { $p = Join-Path $d $n; if (Test-Path $p) { Remove-Item $p -Force } } }

# 'PC 켤 때 자동 실행'이 예전 경로로 켜져 있었으면 새 경로로 바꾸기
$run = Get-ItemProperty -Path $runKey -ErrorAction SilentlyContinue
if ($run) { foreach ($pr in $run.PSObject.Properties) { if ("$($pr.Value)" -like '*NyangLions*NyangLions.exe*') { Set-ItemProperty -Path $runKey -Name $pr.Name -Value ('"' + $exe + '"') } } }

$ws = New-Object -ComObject WScript.Shell
foreach ($dir in @($desk, $start)) {
  $lnk = $ws.CreateShortcut((Join-Path $dir '꾹꾹이즈.lnk'))
  $lnk.TargetPath = $exe; $lnk.WorkingDirectory = $dest; $lnk.IconLocation = $ico; $lnk.Description = '꾹꾹이즈 바탕화면 고양이'
  $lnk.Save()
}
Write-Host ''
Write-Host '  설치 완료! 바탕화면의 [꾹꾹이즈] 아이콘으로 언제든 다시 켤 수 있어요.' -ForegroundColor Green
Write-Host '  앞으로 새 버전은 켜져 있을 때 저절로 업데이트돼요.'
Start-Process $exe
Start-Sleep -Seconds 3
