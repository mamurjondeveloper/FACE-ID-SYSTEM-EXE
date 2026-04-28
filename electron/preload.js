const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  auth: {
    login: (payload) => ipcRenderer.invoke('auth:login', payload)
  },
  students: {
    list: () => ipcRenderer.invoke('students:list'),
    create: (payload) => ipcRenderer.invoke('students:create', payload),
    update: (payload) => ipcRenderer.invoke('students:update', payload),
    remove: (id) => ipcRenderer.invoke('students:delete', id)
  },
  attendance: {
    mark: (payload) => ipcRenderer.invoke('attendance:mark', payload),
    today: () => ipcRenderer.invoke('attendance:today'),
    stats: () => ipcRenderer.invoke('attendance:stats'),
    report: (filters) => ipcRenderer.invoke('attendance:report', filters)
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (payload) => ipcRenderer.invoke('settings:set', payload)
  },
  system: {
    backupDb: () => ipcRenderer.invoke('system:backup'),
    restoreDb: () => ipcRenderer.invoke('system:restore'),
    getDbPath: () => ipcRenderer.invoke('system:dbPath'),
    factoryResetDb: () => ipcRenderer.invoke('system:factoryReset')
  }
});
