const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: (key, defaultValue) =>
    ipcRenderer.invoke("settings:get", key, defaultValue),
  setSettings: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  getPlatform: () => ipcRenderer.invoke("platform:get"),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (filePath, content) =>
    ipcRenderer.invoke("fs:saveFile", filePath, content),
  runOrBuild: (filePath, code) =>
    ipcRenderer.invoke("code:runOrBuild", filePath, code),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  readDir: (folderPath) => ipcRenderer.invoke("fs:readDir", folderPath),
  readFile: (filePath) => ipcRenderer.invoke("fs:readFile", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("fs:writeFile", filePath, content),
  createFolder: (folderPath) =>
    ipcRenderer.invoke("fs:createFolder", folderPath),
  newArcadeProject: (folderPath) =>
    ipcRenderer.invoke("project:newArcade", folderPath),
  renameFile: (oldPath, newPath) =>
    ipcRenderer.invoke("fs:renameFile", oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke("fs:deleteFile", filePath),
  getIconClass: (fileName, isDir) =>
    ipcRenderer.invoke("icon:getClass", fileName, isDir),
  showContextMenu: (filePath, isDir) =>
    ipcRenderer.invoke("menu:showContextMenu", filePath, isDir),
  pathJoin: (...args) => ipcRenderer.invoke("path:join", ...args),
  onContextMenuAction: (callback) =>
    ipcRenderer.on("contextMenu:action", (event, data) =>
      callback(data.action, data.filePath)
    ),
  showInputDialog: (options) => ipcRenderer.invoke("dialog:showInput", options),
});
