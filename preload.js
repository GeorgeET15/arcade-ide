const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: async (key, defaultValue) => {
    try {
      const result = await ipcRenderer.invoke(
        "settings:get",
        key,
        defaultValue
      );
      console.log(`[electronAPI] getSettings(${key}):`, result);
      return result;
    } catch (error) {
      console.error(`[electronAPI] getSettings(${key}) failed:`, error.message);
      throw error;
    }
  },
  setSettings: async (key, value) => {
    try {
      const result = await ipcRenderer.invoke("settings:set", key, value);
      console.log(`[electronAPI] setSettings(${key}, ${value}):`, result);
      return result;
    } catch (error) {
      console.error(`[electronAPI] setSettings(${key}) failed:`, error.message);
      throw error;
    }
  },
  getPlatform: async () => {
    try {
      const platform = await ipcRenderer.invoke("platform:get");
      console.log("[electronAPI] getPlatform:", platform);
      return platform;
    } catch (error) {
      console.error("[electronAPI] getPlatform failed:", error.message);
      throw error;
    }
  },
  openFile: async () => {
    try {
      const result = await ipcRenderer.invoke("dialog:openFile");
      console.log("[electronAPI] openFile:", result);
      return result;
    } catch (error) {
      console.error("[electronAPI] openFile failed:", error.message);
      throw error;
    }
  },
  saveFile: async (filePath, content) => {
    try {
      const result = await ipcRenderer.invoke("fs:saveFile", filePath, content);
      console.log(`[electronAPI] saveFile(${filePath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] saveFile(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  runOrBuild: async (filePath, code) => {
    try {
      const result = await ipcRenderer.invoke(
        "code:runOrBuild",
        filePath,
        code
      );
      console.log(`[electronAPI] runOrBuild(${filePath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] runOrBuild(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  openFolder: async () => {
    try {
      const folderPath = await ipcRenderer.invoke("dialog:openFolder");
      console.log("[electronAPI] openFolder:", folderPath);
      return folderPath;
    } catch (error) {
      console.error("[electronAPI] openFolder failed:", error.message);
      throw error;
    }
  },
  readDir: async (folderPath) => {
    try {
      const result = await ipcRenderer.invoke("fs:readDir", folderPath);
      console.log(`[electronAPI] readDir(${folderPath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] readDir(${folderPath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  readFile: async (filePath) => {
    try {
      const result = await ipcRenderer.invoke("fs:readFile", filePath);
      console.log(`[electronAPI] readFile(${filePath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] readFile(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  writeFile: async (filePath, content) => {
    try {
      const result = await ipcRenderer.invoke(
        "fs:writeFile",
        filePath,
        content
      );
      console.log(`[electronAPI] writeFile(${filePath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] writeFile(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  createFolder: async (folderPath) => {
    try {
      const result = await ipcRenderer.invoke("fs:createFolder", folderPath);
      console.log(`[electronAPI] createFolder(${folderPath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] createFolder(${folderPath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  newArcadeProject: async (folderPath) => {
    try {
      const result = await ipcRenderer.invoke("project:newArcade", folderPath);
      console.log(`[electronAPI] newArcadeProject(${folderPath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] newArcadeProject(${folderPath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  renameFile: async (oldPath, newPath) => {
    try {
      const result = await ipcRenderer.invoke(
        "fs:renameFile",
        oldPath,
        newPath
      );
      console.log(`[electronAPI] renameFile(${oldPath}, ${newPath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] renameFile(${oldPath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  deleteFile: async (filePath) => {
    try {
      const result = await ipcRenderer.invoke("fs:deleteFile", filePath);
      console.log(`[electronAPI] deleteFile(${filePath}):`, result);
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] deleteFile(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  getIconClass: async (fileName, isDir) => {
    try {
      const iconClass = await ipcRenderer.invoke(
        "icon:getClass",
        fileName,
        isDir
      );
      console.log(
        `[electronAPI] getIconClass(${fileName}, isDir: ${isDir}):`,
        iconClass
      );
      return iconClass;
    } catch (error) {
      console.error(
        `[electronAPI] getIconClass(${fileName}) failed:`,
        error.message
      );
      throw error;
    }
  },
  showContextMenu: async (filePath, isDir) => {
    try {
      const result = await ipcRenderer.invoke(
        "menu:showContextMenu",
        filePath,
        isDir
      );
      console.log(
        `[electronAPI] showContextMenu(${filePath}, isDir: ${isDir}):`,
        result
      );
      return result;
    } catch (error) {
      console.error(
        `[electronAPI] showContextMenu(${filePath}) failed:`,
        error.message
      );
      throw error;
    }
  },
  pathJoin: async (...args) => {
    try {
      const result = await ipcRenderer.invoke("path:join", ...args);
      console.log(`[electronAPI] pathJoin(${args.join(", ")}):`, result);
      return result;
    } catch (error) {
      console.error(`[electronAPI] pathJoin failed:`, error.message);
      throw error;
    }
  },
  onContextMenuAction: (callback) => {
    ipcRenderer.on("contextMenu:action", (event, data) => {
      console.log("[electronAPI] onContextMenuAction:", data);
      callback(data.action, data.filePath);
    });
  },
  showInputDialog: async (options) => {
    try {
      const result = await ipcRenderer.invoke("dialog:showInput", options);
      console.log("[electronAPI] showInputDialog:", result);
      return result;
    } catch (error) {
      console.error("[electronAPI] showInputDialog failed:", error.message);
      throw error;
    }
  },
});
