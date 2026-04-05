const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('aiko', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getMemoryStats: () => ipcRenderer.invoke('get-memory-stats'),

  // File system
  fsList: (path) => ipcRenderer.invoke('fs-list', path),
  fsRead: (path) => ipcRenderer.invoke('fs-read', path),
  fsWrite: (path, content) => ipcRenderer.invoke('fs-write', path, content),
  fsDelete: (path) => ipcRenderer.invoke('fs-delete', path),
  fsMkdir: (path) => ipcRenderer.invoke('fs-mkdir', path),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),

  // Shell
  exec: (cmd) => ipcRenderer.invoke('exec-command', cmd),

  // AIOS (LLM-as-OS)
  aiosDispatch: (agentId, query) => ipcRenderer.invoke('aios-dispatch', agentId, query),
  onAiosResponse: (callback) => ipcRenderer.on('aios-response', (_, data) => callback(data)),

  // Misc
  openExternal: (url) => ipcRenderer.send('open-external', url),
  notify: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Platform info
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
})
