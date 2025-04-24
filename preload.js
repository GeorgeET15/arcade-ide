const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: (key, defaultValue) =>
    ipcRenderer.invoke("settings:get", key, defaultValue),
  setSettings: (key, value) => ipcRenderer.invoke("settings:set", key, value),
  getPlatform: () => ipcRenderer.invoke("platform:get"),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (filePath, content) =>
    ipcRenderer.invoke("file:saveFile", filePath, content),
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
  getIconClass: (fileName, isDir) => {
    console.log(`Getting icon for ${fileName}, isDir: ${isDir}`);
    if (isDir) {
      return "fas fa-folder";
    }
    const fileNameLower = fileName.toLowerCase();
    if (fileNameLower === "makefile") {
      return "fas fa-cog";
    }
    if (fileNameLower.endsWith(".c") || fileNameLower.endsWith(".h")) {
      return "fas fa-code";
    }
    if (fileNameLower.endsWith(".png")) {
      return "fas fa-image";
    }
    if (fileNameLower.endsWith(".wav")) {
      return "fas fa-music";
    }
    return "fas fa-file";
  },
});
