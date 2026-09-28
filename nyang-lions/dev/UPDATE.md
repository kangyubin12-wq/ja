# 꾹꾹이즈 업데이트 방법 (Claude 작업용 메모)

원본은 `nyang-lions/dev/nyang-src.html` 하나. 게임 수정은 여기서만 한다.

1. `dev/nyang-src.html` 수정
2. `python3 nyang-lions/dev/build.py 1.x.y "바뀐 점 한 줄"` (버전은 이전보다 크게)
   - 웹(`nyang-lions/index.html`)과 바탕화면 앱 파일(`desktop/app`, `desktop/src/app`)이 함께 갱신되고
     `desktop/app/version.json`, `package.json` 버전이 올라간다.
3. (선택) 설치 zip 다시 만들기: `cd nyang-lions/desktop && cp -r src Kkukkukiz && zip -qr Kkukkukiz-setup.zip Kkukkukiz && rm -rf Kkukkukiz`
4. commit → push (main). GitHub Pages 반영 1~2분.
   - 웹: 새로고침하면 바로 새 버전
   - 바탕화면 앱(v1.1.0 이상): 켤 때 + 6시간마다 version.json 확인 → 자동으로 받아서 다시 켜짐. 우클릭 [업데이트 확인]으로 즉시 가능.
   - `main.js`, `preload.js` 도 version.json 의 files 목록에 있으면 같이 교체된다. 실행 엔진(Electron) 자체 교체는 install.bat 재실행 필요.

저장 키: localStorage `nyang-lions-v1` (바탕화면 앱 userData 폴더는 `%APPDATA%\NyangLions` 고정 — 이름 바꿔도 기록 유지)

## 폰 앱 (PWA)
- `manifest.webmanifest`, `sw.js`, `icon-192/512.png`, `apple-touch-icon.png` 가 nyang-lions/ 에 있음.
- 홈 화면 아이콘으로 켜면(standalone) 또는 `?app=1` 이면 다마고치 모드(`html.mob`). 코드: nyang-src.html 의 "phone app mode" 블록.
- sw.js 는 네트워크 우선이라 push 하면 앱도 다음 실행 때 새 버전. 캐시 구조를 바꾸면 `CACHE` 이름을 올릴 것.
