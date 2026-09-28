const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } = require('electron');
const path = require('path');

let win = null, tray = null, quitting = false;
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

function send(o) { if (win) win.webContents.send('cmd', o); }

function createWindow() {
  win = new BrowserWindow({
    width: 230, height: 316, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false,
    backgroundColor: '#00000000', title: '냥이 라이온즈',
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

function menuTemplate(s) {
  const act = (label, k, extra = {}) => ({ label, enabled: !s.training, click: () => send({ t: 'act', k }), ...extra });
  return [
    act('먹이 주기', 'feed'), act('놀아주기', 'play'), act('쓰다듬기', 'pet'),
    act(s.sleeping ? '깨우기' : '잠 재우기', 'sleep'), act('씻겨주기', 'brush'), act('야구 훈련', 'train'),
    { type: 'separator' },
    { label: '털 색', submenu: s.furs.map(f => ({ label: f.n, type: 'radio', checked: s.fur === f.k, click: () => send({ t: 'fur', k: f.k }) })) },
    { label: '모자 색', submenu: s.caps.map(c => ({ label: c.n, type: 'radio', checked: s.cap === c.k, click: () => send({ t: 'cap', k: c.k }) })) },
    { label: '소품', submenu: s.accs.map(a => ({ label: a.ok ? a.n : `${a.n} (🔒 ${a.how})`, type: 'checkbox', enabled: a.ok, checked: a.on, click: () => send({ t: 'acc', k: a.k }) })) },
    { label: '크기', submenu: [1, 2, 3].map(k => ({ label: ['작게', '보통', '크게'][k - 1], type: 'radio', checked: s.k === k, click: () => send({ t: 'size', k }) })) },
    { type: 'separator' },
    { label: '항상 위에 두기', type: 'checkbox', checked: win.isAlwaysOnTop(), click: (m) => win.setAlwaysOnTop(m.checked, 'floating') },
    { label: 'PC 켤 때 자동 실행', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked }) },
    { label: '숨기기', click: () => win.hide() },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } }
  ];
}
ipcMain.on('menu', (_e, s) => { Menu.buildFromTemplate(menuTemplate(s)).popup({ window: win }); });

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16, quality: 'best' });
  tray = new Tray(img);
  tray.setToolTip('냥이 라이온즈');
  const m = Menu.buildFromTemplate([
    { label: '고양이 보이기', click: () => { win.show(); } },
    { label: '고양이 숨기기', click: () => { win.hide(); } },
    { label: '오른쪽 아래로 옮기기', click: () => { const wa = screen.getPrimaryDisplay().workArea; const [w, h] = win.getSize(); win.setPosition(wa.x + wa.width - w - 30, wa.y + wa.height - h - 30); win.show(); } },
    { type: 'separator' },
    { label: '종료', click: () => { quitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(m);
  tray.on('click', () => { win.isVisible() ? win.hide() : win.show(); });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.nyanglions.pet');
  createWindow(); createTray();
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
