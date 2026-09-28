$ErrorActionPreference = 'Stop'
trap { Write-Host ''; Write-Host "  설치 중 문제가 생겼어요: $_" -ForegroundColor Red; Write-Host '  인터넷 연결을 확인하고 install.bat 을 다시 실행해 주세요.'; Read-Host '  엔터를 누르면 창이 닫혀요'; exit 1 }
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $env:LOCALAPPDATA 'NyangLions'
$ver  = '33.4.11'
$url  = "https://github.com/electron/electron/releases/download/v$ver/electron-v$ver-win32-x64.zip"
$tmp  = Join-Path $env:TEMP "nyang-electron-$ver.zip"

Write-Host ''
Write-Host '  냥이 라이온즈 바탕화면 고양이 설치' -ForegroundColor Cyan
Write-Host '  ---------------------------------'
Get-Process -Name 'NyangLions' -ErrorAction SilentlyContinue | Stop-Process -Force
if (-not (Test-Path (Join-Path $dest 'NyangLions.exe'))) {
  Write-Host '  1/3  실행 엔진 내려받는 중 (약 110MB, 1~3분)...'
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  Write-Host '  2/3  압축 푸는 중...'
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  Expand-Archive -Path $tmp -DestinationPath $dest -Force
  Remove-Item $tmp -Force
  Rename-Item (Join-Path $dest 'electron.exe') 'NyangLions.exe'
} else {
  Write-Host '  1/3  실행 엔진은 이미 있어요. 게임 파일만 새로 바꿔요.'
}
Write-Host '  3/3  게임 파일 복사하고 바로가기 만드는 중...'
$appDir = Join-Path $dest 'resources\app'
if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
Copy-Item (Join-Path $here 'app') $appDir -Recurse -Force
$exe = Join-Path $dest 'NyangLions.exe'
$ico = Join-Path $appDir 'icon.ico'
$ws  = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))) {
  $lnk = $ws.CreateShortcut((Join-Path $dir '냥이 라이온즈.lnk'))
  $lnk.TargetPath = $exe; $lnk.WorkingDirectory = $dest; $lnk.IconLocation = $ico; $lnk.Description = '냥이 라이온즈 바탕화면 고양이'
  $lnk.Save()
}
Write-Host ''
Write-Host '  설치 완료! 바탕화면의 [냥이 라이온즈] 아이콘으로 언제든 다시 켤 수 있어요.' -ForegroundColor Green
Start-Process $exe
Start-Sleep -Seconds 3
