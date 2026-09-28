"""꾹꾹이즈 빌드 스크립트
사용법:  python3 nyang-lions/dev/build.py [새버전]   (예: 1.1.2)
- dev/nyang-src.html 을 원본으로 폰트 subset 을 넣어 nyang-lions/index.html 을 만든다.
- 같은 파일을 desktop/app, desktop/src/app 에 복사한다 (바탕화면 프로그램 자동 업데이트용).
- 새버전을 주면 desktop/app/package.json, version.json, src/app/package.json 버전을 올린다.
- 임베드(스프라이트 data URI) 버전을 /tmp/nyang-lions-embed.html 로 만든다 (아티팩트용).
필요: pip install fonttools brotli, npm (Galmuri 폰트 자동 다운로드)
"""
import base64, subprocess, re, sys, os, json, shutil, glob
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
src = open(f'{D}/nyang-src.html', encoding='utf-8').read()
fdir = f'{D}/.fonts'
if not glob.glob(f'{fdir}/package/dist/Galmuri11.ttf'):
    os.makedirs(fdir, exist_ok=True)
    subprocess.run('npm pack galmuri@2.40.3 >/dev/null && tar xzf galmuri-2.40.3.tgz', shell=True, cwd=fdir, check=True)
chars = set(src) | set('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ !"#$%&\'()*+,-./:;<=>?@[]^_`{|}~·…')
for b1 in range(0xB0, 0xC9):
    for b2 in range(0xA1, 0xFF):
        try: chars.add(bytes([b1, b2]).decode('euc-kr'))
        except Exception: pass
open(f'{fdir}/chars.txt', 'w', encoding='utf-8').write(''.join(sorted(chars)))
fonts = ''
for name, w in [('Galmuri11', 400), ('Galmuri11-Bold', 700)]:
    out = f'{fdir}/{name}.sub.woff2'
    subprocess.run(['pyftsubset', f'{fdir}/package/dist/{name}.ttf', f'--text-file={fdir}/chars.txt', '--flavor=woff2', f'--output-file={out}'], check=True, stderr=subprocess.DEVNULL)
    b = base64.b64encode(open(out, 'rb').read()).decode()
    fonts += f"@font-face{{font-family:'Galmuri11';src:url(data:font/woff2;base64,{b}) format('woff2');font-weight:{w};font-display:swap}}\n"
src = re.sub(r'window\.__nyang = .*\n', '', src)
repo_src = src.replace('/*@FONTS@*/', fonts).replace('@SPRITES@', 'cat-sprites.png')
uri = 'data:image/png;base64,' + base64.b64encode(open(f'{R}/cat-sprites.png', 'rb').read()).decode()
open('/tmp/nyang-lions-embed.html', 'w', encoding='utf-8').write(src.replace('/*@FONTS@*/', fonts).replace('@SPRITES@', uri))
head = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="야구 모자를 쓴 픽셀 고양이를 먹이고 놀아 주고 타격 훈련시키는 다마고치 스타일 육성 게임.">
<meta property="og:type" content="website">
<meta property="og:title" content="꾹꾹이즈">
<meta property="og:description" content="우리 팀 막내 고양이를 주전 선수로 키워 주세요. 밥 주고, 놀아 주고, 같이 타격 연습!">
<meta property="og:url" content="https://kangyubin12-wq.github.io/ja/nyang-lions/">
<meta name="theme-color" content="#2f4a9a">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
'''
i = repo_src.index('<div class="page">')
html = head + repo_src[:i] + '</head>\n<body>\n' + repo_src[i:] + '\n</body>\n</html>\n'
open(f'{R}/index.html', 'w', encoding='utf-8').write(html)
for d in [f'{R}/desktop/app', f'{R}/desktop/src/app']:
    open(f'{d}/index.html', 'w', encoding='utf-8').write(html)
    shutil.copy(f'{R}/cat-sprites.png', f'{d}/cat-sprites.png')
if len(sys.argv) > 1:
    v = sys.argv[1]
    for p in [f'{R}/desktop/app/package.json', f'{R}/desktop/src/app/package.json', f'{R}/desktop/app/version.json']:
        j = json.load(open(p, encoding='utf-8')); j['version'] = v
        if p.endswith('version.json') and len(sys.argv) > 2: j['note'] = sys.argv[2]
        open(p, 'w', encoding='utf-8').write(json.dumps(j, ensure_ascii=False, indent=2) + '\n')
    print('version ->', v)
print('built', os.path.getsize(f'{R}/index.html'), 'bytes')
