const { contextBridge, ipcRenderer } = require('electron');
const big = new URLSearchParams(location.search).get('big') === '1';
if (big) {
  contextBridge.exposeInMainWorld('nyangBig', { back: () => ipcRenderer.send('close-big') });
} else {
  contextBridge.exposeInMainWorld('nyangDesktop', {
    move: (dx, dy) => ipcRenderer.send('move', dx, dy),
    setIgnore: (b) => ipcRenderer.send('ignore', b),
    setSize: (w, h) => ipcRenderer.send('size', w, h),
    showMenu: (state) => ipcRenderer.send('menu', state),
    openBig: () => ipcRenderer.send('open-big'),
    onCmd: (cb) => ipcRenderer.on('cmd', (_e, o) => cb(o))
  });
}
