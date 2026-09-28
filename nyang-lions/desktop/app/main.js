const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 이름이 꾹꾹이즈로 바뀌어도 예전(NyangLions) 저장 기록을 그대로 쓰기
app.setName('꾹꾹이즈');
app.setPath('userData', path.join(app.getPath('appData'), 'NyangLions'));

const UPDATE_BASE = 'https://kangyubin12-wq.github.io/ja/nyang-lions/desktop/app/';

let win = null, big = null, tray = null, quitting = false;
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (big) { big.focus(); } else if (win) { win.show(); win.focus(); } });

function send(o) { if (win) win.webContents.send('cmd', o); }

function createWindow() {
  win = new BrowserWindow({
    width: 230, height: 316, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false,
    backgroundColor: '#00000000', title: '꾹꾹이즈',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true }
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true);
  const wa = screen.getPrimaryDisplay().workArea;
  win.setPosition(wa.x + wa.width - 270, wa.y + wa.height - 360);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

ipcMain.on('move', (_e, dx, dy) => { if (!win) return; const [x, y] = win.getPosition(); win.setPosition(Math.round(x + dx), Math.round(y + dy)); });
ipcMain.on('ignore', (_e, b) => { if (win) win.setIgnoreMouseEvents(!!b, { forward: true }); });
ipcMain.on('size', (_e, w, h) => {
  if (!win) return;
  win.setResizable(true); win.setContentSize(Math.max(40, w), Math.max(40, h)); win.setResizable(false);
});

function openBig() {
  if (big) { big.show(); big.focus(); return; }
  send({ t: 'freeze' });
  setTimeout(() => {
    win.hide();
    big = new BrowserWindow({
      width: 1180, height: 920, minWidth: 420, minHeight: 600, title: '꾹꾹이즈', autoHideMenuBar: true,
      backgroundColor: '#ecebe4', icon: path.join(__dirname, 'icon.png'),
      webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
    });
    big.loadFile(path.join(__dirname, 'index.html'), { query: { big: '1' } });
    big.on('closed', () => { big = null; if (!quitting) { win.webContents.reload(); win.show(); } });
  }, 200);
}
ipcMain.on('open-big', openBig);
ipcMain.on('close-big', () => { if (big) big.close(); });

function menuTemplate(s) {
  const act = (label, k, extra = {}) => ({ label, enabled: !s.training, click: () => send({ t: 'act', k }), ...extra });
  return [
    act('먹이 주기', 'feed'), act('놀아주기', 'play'), act('쓰다듬기', 'pet'),
    act(s.sleeping ? '깨우기' : '잠 재우기', 'sleep'), act('씻겨주기', 'brush'), act('야구 훈련', 'train'),
    { type: 'separator' },
    { label: '크게 열기 (꾸미기 · 상태 · 기록)', click: openBig },
    { label: '고양이 크기', submenu: [1, 2, 3].map(k => ({ label: ['작게', '보통', '크게'][k - 1], type: 'radio', checked: s.k === k, click: () => send({ t: 'size', k }) })) },
    { type: 'separator' },
    { label: '항상 위에 두기', type: 'checkbox', checked: win.isAlwaysOnTop(), click: (m) => win.setAlwaysOnTop(m.checked, 'floating') },
    { label: 'PC 켤 때 자동 실행', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { label: '숨기기', click: () => win.hide() },
    { label: '업데이트 확인 (지금 v' + app.getVersion() + ')', click: () => checkUpdate(true) },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } }
  ];
}
ipcMain.on('menu', (_e, s) => { Menu.buildFromTemplate(menuTemplate(s)).popup({ window: win }); });

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16, quality: 'best' });
  tray = new Tray(img);
  tray.setToolTip('꾹꾹이즈');
  const m = Menu.buildFromTemplate([
    { label: '고양이 보이기', click: () => { if (!big) win.show(); } },
    { label: '크게 열기', click: openBig },
    { label: '고양이 숨기기', click: () => { win.hide(); } },
    { label: '업데이트 확인', click: () => checkUpdate(true) },
    { label: '오른쪽 아래로 옮기기', click: () => { const wa = screen.getPrimaryDisplay().workArea; const [w, h] = win.getSize(); win.setPosition(wa.x + wa.width - w - 30, wa.y + wa.height - h - 30); win.show(); } },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(m);
  tray.on('click', () => { win.isVisible() ? win.hide() : win.show(); });
}

// ---- 자동 업데이트: 깃허브에 올라간 새 버전 파일을 받아 교체하고 다시 켜기 ----
function newer(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
}
async function getBuf(url) {
  const r = await net.fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
let updating = false;
async function checkUpdate(manual) {
  if (updating) return; updating = true;
  try {
    const info = JSON.parse((await getBuf(UPDATE_BASE + 'version.json')).toString('utf8'));
    if (!newer(info.version, app.getVersion())) {
      if (manual) dialog.showMessageBox({ type: 'info', title: '꾹꾹이즈', message: '이미 최신 버전이에요 (v' + app.getVersion() + ')' });
      return;
    }
    const got = [];
    for (const f of info.files) {
      const b = await getBuf(UPDATE_BASE + f);
      if (!b.length) throw new Error(f + ' empty');
      got.push([f, b]);
    }
    for (const [f, b] of got) fs.writeFileSync(path.join(__dirname, f + '.new'), b);
    for (const [f] of got) fs.renameSync(path.join(__dirname, f + '.new'), path.join(__dirname, f));
    send({ t: 'freeze' }); if (big) big.webContents.send('cmd', { t: 'freeze' });
    if (manual) await dialog.showMessageBox({ type: 'info', title: '꾹꾹이즈', message: '새 버전 v' + info.version + ' 으로 업데이트했어요!\n' + (info.note || '') + '\n\n확인을 누르면 다시 켜져요.' });
    setTimeout(() => { quitting = true; app.relaunch(); app.exit(0); }, 400);
  } catch (e) {
    if (manual) dialog.showMessageBox({ type: 'warning', title: '꾹꾹이즈', message: '업데이트를 확인하지 못했어요.\n인터넷 연결을 확인해 주세요.\n\n(' + e.message + ')' });
  } finally { updating = false; }
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.nyanglions.pet');
  createWindow(); createTray();
  setTimeout(() => checkUpdate(false), 15000);
  setInterval(() => checkUpdate(false), 6 * 3600 * 1000);
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
