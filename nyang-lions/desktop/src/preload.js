const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nyangDesktop', {
  move: (dx, dy) => ipcRenderer.send('move', dx, dy),
  setIgnore: (b) => ipcRenderer.send('ignore', b),
  setSize: (w, h) => ipcRenderer.send('size', w, h),
  showMenu: (state) => ipcRenderer.send('menu', state),
  onCmd: (cb) => ipcRenderer.on('cmd', (_e, o) => cb(o))
});
