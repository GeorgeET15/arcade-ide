const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  protocol,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsAll = require("fs");
const { exec } = require("child_process");
const util = require("util");
const axios = require("axios");
const { GoogleGenAI, Modality } = require("@google/genai");
const archiver = require("archiver");
const rcedit = require("rcedit"); // Ensure this is at the top with other requires
const os = require("os");

console.log("Main process starting...");
console.log(`__dirname: ${__dirname}`);
console.log(`App userData path: ${app.getPath("userData")}`);
console.log(`Process versions: ${JSON.stringify(process.versions)}`);
console.log(`Node module paths: ${module.paths.join(", ")}`);

const execPromise = util.promisify(exec);

// Custom JSON storage
const configPath = path.join(app.getPath("userData"), "arcade-ide-config.json");
let config = { windowBounds: { width: 1100, height: 750 } };

async function loadConfig() {
  console.log(`[main] Loading config from: ${configPath}`);
  try {
    const data = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(data);
    console.log("[main] Config loaded:", config);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("[main] Error loading config:", error);
    }
    console.log("[main] Using default config");
  }
}

async function saveConfig() {
  console.log(`[main] Saving config to: ${configPath}`);
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log("[main] Config saved");
  } catch (error) {
    console.error("[main] Error saving config:", error);
  }
}

let mainWindow;

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    console.log(`[main] File exists: ${filePath}`);
    return true;
  } catch (e) {
    console.warn(`[main] File does not exist: ${filePath}`);
    return false;
  }
}

// Validate build tools
async function checkBuildTools() {
  const buildTool =
    config.buildToolPath ||
    (process.platform === "win32" ? "mingw32-make" : "make");
  try {
    await execPromise("gcc --version");
    await execPromise(`${buildTool} --version`);
    console.log("[main] Build tools validated successfully");
    return true;
  } catch (error) {
    console.error("[main] Build tools validation failed:", error);
    dialog.showErrorBox(
      "Build Tools Missing",
      "Please install gcc and " +
        (process.platform === "win32" ? "mingw32-make" : "make") +
        "."
    );
    return false;
  }
}

function registerFileProtocol() {
  console.log("[main] Registering file protocol handler...");
  protocol.registerFileProtocol("file", (request, callback) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const resolvedPath = path.join(__dirname, pathname);
    console.log(
      `[main] File protocol request: ${request.url} -> ${resolvedPath}`
    );
    callback({ path: resolvedPath });
  });

  protocol.registerFileProtocol("electron", (request, callback) => {
    console.error(`[main] Attempted to load electron: URL: ${request.url}`);
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const resolvedPath = path.join(__dirname, pathname);
    console.log(`[main] Redirecting electron: to file: ${resolvedPath}`);
    callback({ path: resolvedPath });
  });
}

async function createWindow() {
  console.log("[main] Creating window...");
  await loadConfig();
  const savedBounds = config.windowBounds || { width: 1100, height: 750 };
  console.log("[main] Retrieved windowBounds from config:", savedBounds);
  const preloadPath = path.join(__dirname, "preload.js");
  console.log(`[main] Attempting to load preload script from: ${preloadPath}`);
  const preloadExists = await fileExists(preloadPath);
  if (!preloadExists) {
    console.error(`[main] Preload script not found at: ${preloadPath}`);
    dialog.showErrorBox("Error", `Preload script not found at: ${preloadPath}`);
    app.quit();
    return;
  }

  const indexPath = path.join(__dirname, "index.html");
  console.log(`[main] Attempting to load index.html from: ${indexPath}`);
  if (!(await fileExists(indexPath))) {
    console.error(`[main] index.html not found at: ${indexPath}`);
    dialog.showErrorBox("Error", `index.html not found at: ${indexPath}`);
    app.quit();
    return;
  }

  const iconPath = path.join(__dirname, "icon.png");
  console.log(`[main] Attempting to load icon from: ${iconPath}`);
  if (!(await fileExists(iconPath))) {
    console.warn(
      `[main] Icon not found at: ${iconPath}, proceeding without custom icon`
    );
  }

  try {
    mainWindow = new BrowserWindow({
      ...savedBounds,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        enableRemoteModule: true,
      },
      title: "Arcade IDE",
      icon: iconPath,
    });

    mainWindow.setMenu(null);

    console.log(`[main] Loading index.html from: ${indexPath}`);
    try {
      await mainWindow.loadFile(indexPath);
      console.log("[main] index.html loaded successfully");
      //mainWindow.webContents.openDevTools();
    } catch (loadError) {
      console.error(`[main] Failed to load index.html: ${loadError.message}`);
      dialog.showErrorBox(
        "Error",
        `Failed to load index.html: ${loadError.message}`
      );
      app.quit();
      return;
    }
  } catch (error) {
    console.error(`[main] Error in createWindow: ${error.message}`);
    console.error(error.stack);
    dialog.showErrorBox("Window Creation Error", error.message);
    app.quit();
    return;
  }

  mainWindow.on("resized", saveBounds);
  mainWindow.on("moved", saveBounds);
  mainWindow.on("close", () => {
    saveBounds();
  });

  checkBuildTools();
}

function saveBounds() {
  if (mainWindow && !mainWindow.isMinimized() && !mainWindow.isDestroyed()) {
    console.log("[main] Saving windowBounds to config");
    config.windowBounds = mainWindow.getBounds();
    saveConfig();
  }
}

app.whenReady().then(() => {
  console.log("[main] App is ready");
  try {
    registerFileProtocol();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error("[main] Error during app initialization:", error);
    console.error(error.stack);
    dialog.showErrorBox("Initialization Error", error.message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  console.log("[main] All windows closed");
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers
ipcMain.handle("settings:get", (event, key, defaultValue) => {
  console.log(`[main] IPC settings:get called with key: ${key}`);
  const value = config[key] !== undefined ? config[key] : defaultValue;
  console.log(`[main] settings:get(${key}) ->`, value);
  return value;
});

ipcMain.handle("settings:set", (event, key, value) => {
  console.log(
    `[main] IPC settings:set called with key: ${key}, value: ${value}`
  );
  if (value === null && key in config) {
    delete config[key];
    console.log(`[main] settings:set deleted key: ${key}`);
  } else {
    config[key] = value;
    console.log(`[main] settings:set updated key: ${key} to ${value}`);
  }
  saveConfig();
});

ipcMain.handle("platform:get", async () => {
  console.log("[main] IPC platform:get called");
  try {
    return {
      platform: process.platform,
      pathSep: path.sep,
    };
  } catch (error) {
    console.error("[main] platform:get failed:", error.message);
    throw error;
  }
});

ipcMain.handle("path:join", async (event, ...args) => {
  console.log(`[main] IPC path:join called with args: ${args}`);
  try {
    const joinedPath = path.join(...args);
    console.log(`[main] Joined path: ${joinedPath}`);
    return joinedPath;
  } catch (error) {
    console.error(`[main] Error joining paths: ${error.message}`);
    throw error;
  }
});

ipcMain.handle("dialog:openFolder", async () => {
  console.log("[main] IPC dialog:openFolder called");
  try {
    // Validate defaultPath
    let defaultPath;
    if (typeof config.lastOpenFolder === "string" && config.lastOpenFolder) {
      defaultPath = config.lastOpenFolder;
      console.log(
        `[main] Using config.lastOpenFolder as defaultPath: ${defaultPath}`
      );
    } else {
      try {
        defaultPath = app.getPath("documents");
        console.log(
          `[main] Using documents path as defaultPath: ${defaultPath}`
        );
      } catch (error) {
        console.warn(`[main] Failed to get documents path: ${error.message}`);
        defaultPath = undefined;
        console.log("[main] defaultPath set to undefined");
      }
    }

    const dialogOptions = {
      properties: ["openDirectory"],
    };
    if (defaultPath) {
      dialogOptions.defaultPath = defaultPath;
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(
      mainWindow,
      dialogOptions
    );
    if (canceled || !filePaths || filePaths.length === 0) {
      console.log("[main] dialog:openFolder canceled");
      return { canceled: true, success: false };
    }

    const folderPath = filePaths[0];
    console.log(`[main] dialog:openFolder selected folder: ${folderPath}`);

    config.recentFolders = config.recentFolders || [];
    config.recentFolders = [
      ...new Set([folderPath, ...config.recentFolders]),
    ].slice(0, 5);
    config.lastOpenFolder = folderPath;
    await saveConfig();
    console.log(
      `[main] Updated config: lastOpenFolder=${folderPath}, recentFolders=${config.recentFolders}`
    );

    return {
      success: true,
      folderPath,
      canceled: false,
    };
  } catch (error) {
    console.error(`[main] Error in dialog:openFolder: ${error.message}`);
    return {
      success: false,
      error: error.message,
      canceled: false,
    };
  }
});

ipcMain.handle("dialog:openFile", async () => {
  console.log("[main] IPC dialog:openFile called");
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Supported Files",
          extensions: ["c", "h", "makefile", "png", "wav", "json"],
        },
        { name: "All Files", extensions: ["*"] },
      ],
      defaultPath: config.lastOpenFolder || app.getPath("documents"),
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      console.log("[main] dialog:openFile canceled");
      return { canceled: true, success: false };
    }

    const filePath = filePaths[0];
    let content = "";
    const ext = path.extname(filePath).toLowerCase();

    // Read content for text-based files, including JSON
    if ([".txt", ".c", ".h", ".makefile", ".json"].includes(ext)) {
      try {
        content = await fs.readFile(filePath, "utf-8");
        // Validate JSON if applicable
        if (ext === ".json") {
          try {
            JSON.parse(content);
            console.log(`[main] Valid JSON file read: ${filePath}`);
          } catch (jsonError) {
            console.warn(
              `[main] Invalid JSON in ${filePath}: ${jsonError.message}`
            );
            return {
              success: true,
              filePath,
              content,
              warning: `Invalid JSON: ${jsonError.message}`,
              canceled: false,
            };
          }
        }
      } catch (readError) {
        console.error(
          `[main] Error reading file ${filePath}: ${readError.message}`
        );
        return { success: false, canceled: false, error: readError.message };
      }
    }

    console.log(`[main] dialog:openFile returning filePath: ${filePath}`);
    return {
      success: true,
      filePath,
      content,
      canceled: false,
    };
  } catch (error) {
    console.error(`[main] Error in dialog:openFile: ${error.message}`);
    return {
      success: false,
      canceled: false,
      error: error.message,
    };
  }
});

// Update fs:readDir to ensure JSON files are included
ipcMain.handle("fs:readDir", async (event, folderPath) => {
  console.log(`[main] IPC fs:readDir called with folderPath: ${folderPath}`);
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    // Ensure json is always included in allowed extensions
    const defaultExtensions = ["c", "h", "makefile", "png", "wav", "json"];
    const allowedExtensions =
      config.fileExtensions && config.fileExtensions.length > 0
        ? [...new Set([...config.fileExtensions, "json"])] // Merge and ensure json
        : defaultExtensions;
    console.log(`[main] Allowed extensions: ${allowedExtensions.join(", ")}`);

    const files = entries
      .map((entry) => ({
        name: entry.name,
        isDir: entry.isDirectory(),
        path: path.join(folderPath, entry.name).replace(/\\/g, "/"),
      }))
      .filter((f) => {
        if (f.isDir) return true;
        const ext = path.extname(f.name).toLowerCase().slice(1);
        const isAllowed =
          allowedExtensions.includes(ext) ||
          (f.name.toLowerCase() === "makefile" && !ext);
        console.log(
          `[main] File: ${f.name}, ext: ${ext || "none"}, allowed: ${isAllowed}`
        );
        return isAllowed;
      })
      .filter((f) => !f.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    console.log(
      `[main] readDir returning ${files.length} files for ${folderPath}:`,
      files.map((f) => f.name)
    );
    return { success: true, files };
  } catch (error) {
    console.error(`[main] Error reading directory ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:readFile", async (event, filePath) => {
  console.log(`[main] IPC fs:readFile called with filePath: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error(`[main] Error reading file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:writeFile", async (event, filePath, content) => {
  console.log(`[main] IPC fs:writeFile called with filePath: ${filePath}`);
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    console.error(`[main] Error writing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:saveFile", async (event, filePath, content) => {
  console.log(`[main] IPC fs:saveFile called with filePath: ${filePath}`);
  try {
    if (!filePath) {
      // Show save dialog for new files
      const { canceled, filePath: selectedPath } = await dialog.showSaveDialog(
        mainWindow,
        {
          defaultPath: "untitled.c",
          filters: [
            { name: "C Files", extensions: ["c"] },
            { name: "Header Files", extensions: ["h"] },
            { name: "Makefile", extensions: ["makefile"] },
            { name: "JSON Files", extensions: ["json"] }, // Explicit JSON filter
            { name: "All Files", extensions: ["*"] },
          ],
        }
      );

      if (canceled || !selectedPath) {
        console.log("[main] fs:saveFile dialog canceled");
        return { canceled: true };
      }

      filePath = selectedPath;
    }

    // Validate JSON content if saving a .json file
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".json") {
      try {
        JSON.parse(content);
        console.log(`[main] Valid JSON content for ${filePath}`);
      } catch (jsonError) {
        console.error(`[main] Invalid JSON content: ${jsonError.message}`);
        return {
          success: false,
          error: `Invalid JSON: ${jsonError.message}`,
          canceled: false,
        };
      }
    }

    // Write content to the file
    await fs.writeFile(filePath, content, "utf-8");
    console.log(`[main] File saved successfully: ${filePath}`);
    return { success: true, filePath, canceled: false };
  } catch (error) {
    console.error(`[main] Error saving file ${filePath}: ${error.message}`);
    return { success: false, error: error.message, canceled: false };
  }
});

ipcMain.handle("fs:createFolder", async (event, folderPath) => {
  console.log(
    `[main] IPC fs:createFolder called with folderPath: ${folderPath}`
  );
  try {
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error(`[main] Error creating folder ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:renameFile", async (event, oldPath, newPath) => {
  console.log(`[main] IPC fs:renameFile called from ${oldPath} to ${newPath}`);
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    console.error(`[main] Error renaming file: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:deleteFile", async (event, filePath) => {
  console.log(`[main] IPC fs:deleteFile called for ${filePath}`);
  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true });
    } else {
      await fs.unlink(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error(`[main] Error deleting file: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Define the reusable runOrBuild function
async function runOrBuild(event, filePathToRun, codeToRun) {
  console.log(`[main] runOrBuild called with filePath: ${filePathToRun}`);
  if (!filePathToRun) {
    return {
      success: false,
      output: "Error: Cannot build and play. File needs to be saved first.",
    };
  }

  try {
    console.log(`[main] Ensuring file is saved: ${filePathToRun}`);
    await fs.writeFile(filePathToRun, codeToRun, "utf-8");

    const dir = path.dirname(filePathToRun);
    const parsedPath = path.parse(filePathToRun);
    const gameName = parsedPath.name;
    const executableName =
      process.platform === "win32" ? `${gameName}.exe` : gameName;
    const executablePath = path.join(dir, executableName);
    const makefilePath = path.join(dir, "Makefile");
    const libDir = path.join(__dirname, "lib");
    const arcadeSource = path.join(libDir, "arcade.c");
    const arcadeHeader = path.join(libDir, "arcade.h");
    const stbHeaders = [
      "stb_image.h",
      "stb_image_write.h",
      "stb_image_resize2.h",
    ].map((file) => path.join(libDir, file));

    console.log(`[main] Checking arcade library files in: ${libDir}`);
    if (!(await fileExists(arcadeSource))) {
      console.error(`[main] Arcade source not found at: ${arcadeSource}`);
      dialog.showErrorBox(
        "Build Error",
        `arcade.c not found at ${arcadeSource}. Ensure the lib directory contains arcade.c.`
      );
      return {
        success: false,
        output: `Error: arcade.c not found at ${arcadeSource}. Ensure the lib directory contains arcade.c.`,
      };
    }
    if (!(await fileExists(arcadeHeader))) {
      console.error(`[main] Arcade header not found at: ${arcadeHeader}`);
      dialog.showErrorBox(
        "Build Error",
        `arcade.h not found at ${arcadeHeader}. Ensure the lib directory contains arcade.h.`
      );
      return {
        success: false,
        output: `Error: arcade.h not found at ${arcadeHeader}. Ensure the lib directory contains arcade.h.`,
      };
    }
    for (const header of stbHeaders) {
      if (!(await fileExists(header))) {
        console.error(`[main] STB header not found at: ${header}`);
        dialog.showErrorBox(
          "Build Error",
          `STB header (${path.basename(
            header
          )}) not found at ${header}. Ensure all STB headers are present in lib.`
        );
        return {
          success: false,
          output: `Error: STB header (${path.basename(
            header
          )}) not found at ${header}. Ensure all STB headers are present in lib.`,
        };
      }
    }

    const shouldBuild = !(await fileExists(makefilePath));

    const escapedLibDir = libDir.replace(/\\/g, "/").replace(/"/g, '\\"');
    const escapedArcadeSource = arcadeSource
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');
    const escapedFilePathToRun = filePathToRun
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');

    let buildOutput = "";
    if (shouldBuild) {
      console.log("[main] No existing Makefile found, creating a new one");
      const makefileContent = `
CC = gcc
CFLAGS = -Wall -I"${escapedLibDir}"
TARGET = ${gameName}

ifeq ($(OS),Windows_NT)
    LIBS = -lgdi32 -lwinmm
else
    LIBS = -lX11 -lm
endif

all:
	$(CC) $(CFLAGS) -o "$(TARGET)" "${escapedFilePathToRun}" "${escapedArcadeSource}" $(LIBS)

clean:
	rm -f "$(TARGET)" *.o
`;
      console.log(`[main] Writing Makefile to: ${makefilePath}`);
      console.log("[main] Makefile content:\n", makefileContent);
      await fs.writeFile(makefilePath, makefileContent, "utf-8");
    } else {
      console.log("[main] Existing Makefile found, using it");
    }

    const makeCommand =
      config.buildToolPath ||
      (process.platform === "win32" ? "mingw32-make" : "make");
    const env = { ...process.env, TARGET: gameName };
    console.log(
      `[main] Running Makefile: ${makeCommand} in ${dir} with TARGET=${gameName}`
    );
    buildOutput = `> ${makeCommand}\n`;
    let buildSuccess = false;

    try {
      const { stdout, stderr } = await execPromise(makeCommand, {
        cwd: dir,
        env,
      });
      buildOutput += `${stdout}\n${stderr}`;
      buildSuccess =
        !stderr.toLowerCase().includes("error:") &&
        !stdout.toLowerCase().includes("error:");
    } catch (makeError) {
      console.error(`[main] Make execution error: ${makeError}`);
      buildOutput += `Build Failed:\n${
        makeError.stderr || makeError.stdout || makeError.message
      }`;
      return { success: false, output: buildOutput };
    }

    if (!buildSuccess) {
      console.error("[main] Build failed, output:\n", buildOutput);
      return { success: false, output: buildOutput };
    }

    console.log(`[main] Checking for executable at: ${executablePath}`);
    if (!(await fileExists(executablePath))) {
      buildOutput += `\nBuild successful, but executable (${executableName}) not found at ${executablePath}. Cannot play.`;
      try {
        const files = await fs.readdir(dir);
        console.log(`[main] Directory contents: ${files.join(", ")}`);
        buildOutput += `\nDirectory contents: ${files.join(", ")}`;
      } catch (dirError) {
        console.error(`[main] Error reading directory: ${dirError}`);
        buildOutput += `\nError reading directory: ${dirError.message}`;
      }
      return { success: true, output: buildOutput };
    }

    const runCommand =
      process.platform === "win32"
        ? `"${executablePath}"`
        : `./"${executableName}"`;
    console.log(`[main] Playing: ${runCommand} in ${dir}`);
    let runOutput = `\n--- Playing: ${runCommand} ---\nNote: Arcade game window should appear.\n`;
    try {
      const { stdout: runStdout, stderr: runStderr } = await execPromise(
        runCommand,
        { cwd: dir }
      );
      if (runStdout) runOutput += `Output:\n${runStdout}\n`;
      if (runStderr) runOutput += `Runtime Stderr:\n${runStderr}\n`;
      return {
        success: true,
        output:
          buildOutput + runOutput ||
          `${buildOutput}\nExecution finished with no output.`,
      };
    } catch (runError) {
      console.error(`[main] Runtime exec error: ${runError}`);
      runOutput += `--- Runtime Error ---\n`;
      if (runError.stderr) runOutput += runError.stderr + "\n";
      if (runError.stdout)
        runOutput += `Output before error:\n${runError.stdout}\n`;
      if (!runError.stderr && !runError.stdout && runError.message)
        runOutput += runError.message;
      if (runError.code)
        runOutput += `\nProcess exited with code ${runError.code}`;
      return { success: false, output: buildOutput + runOutput };
    }
  } catch (error) {
    console.error("[main] Error during build/play process:", error);
    return { success: false, output: `Error: ${error.message}` };
  }
}

ipcMain.handle("code:runOrBuild", runOrBuild);

async function buildOnly(event, filePathToRun, codeToRun) {
  console.log(`[main] buildOnly called with filePath: ${filePathToRun}`);
  const sendProgress = (progress, message) => {
    mainWindow.webContents.send("package:progress", { progress, message });
  };

  if (!filePathToRun) {
    sendProgress(20, "Error: Cannot build. File needs to be saved first.");
    return {
      success: false,
      output: "Error: Cannot build. File needs to be saved first.",
    };
  }

  try {
    console.log(`[main] Ensuring file is saved: ${filePathToRun}`);
    await fs.writeFile(filePathToRun, codeToRun, "utf-8");
    sendProgress(25, "Saved source file");

    const dir = path.dirname(filePathToRun);
    const parsedPath = path.parse(filePathToRun);
    const gameName = parsedPath.name; // This will be overridden by gameName from config in code:package
    const executableName =
      process.platform === "win32" ? `${gameName}.exe` : gameName;
    const executablePath = path.join(dir, executableName);
    const makefilePath = path.join(dir, "Makefile");
    const libDir = path.join(__dirname, "lib");
    const arcadeSource = path.join(libDir, "arcade.c");
    const arcadeHeader = path.join(libDir, "arcade.h");
    const stbHeaders = [
      "stb_image.h",
      "stb_image_write.h",
      "stb_image_resize2.h",
    ].map((file) => path.join(libDir, file));

    console.log(`[main] Checking arcade library files in: ${libDir}`);
    if (!(await fileExists(arcadeSource))) {
      console.error(`[main] Arcade source not found at: ${arcadeSource}`);
      dialog.showErrorBox(
        "Build Error",
        `arcade.c not found at ${arcadeSource}. Ensure the lib directory contains arcade.c.`
      );
      sendProgress(20, `Error: arcade.c not found at ${arcadeSource}`);
      return {
        success: false,
        output: `Error: arcade.c not found at ${arcadeSource}. Ensure the lib directory contains arcade.c.`,
      };
    }
    if (!(await fileExists(arcadeHeader))) {
      console.error(`[main] Arcade header not found at: ${arcadeHeader}`);
      dialog.showErrorBox(
        "Build Error",
        `arcade.h not found at ${arcadeHeader}. Ensure the lib directory contains arcade.h.`
      );
      sendProgress(20, `Error: arcade.h not found at ${arcadeHeader}`);
      return {
        success: false,
        output: `Error: arcade.h not found at ${arcadeHeader}. Ensure the lib directory contains arcade.h.`,
      };
    }
    for (const header of stbHeaders) {
      if (!(await fileExists(header))) {
        console.error(`[main] STB header not found at: ${header}`);
        dialog.showErrorBox(
          "Build Error",
          `STB header (${path.basename(
            header
          )}) not found at ${header}. Ensure all STB headers are present in lib.`
        );
        sendProgress(
          20,
          `Error: STB header (${path.basename(header)}) not found at ${header}`
        );
        return {
          success: false,
          output: `Error: STB header (${path.basename(
            header
          )}) not found at ${header}. Ensure all STB headers are present in lib.`,
        };
      }
    }

    sendProgress(30, "Validated library files");

    const shouldBuild = !(await fileExists(makefilePath));

    const escapedLibDir = libDir.replace(/\\/g, "/").replace(/"/g, '\\"');
    const escapedArcadeSource = arcadeSource
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');
    const escapedFilePathToRun = filePathToRun
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');

    let buildOutput = "";
    if (shouldBuild) {
      console.log("[main] No existing Makefile found, creating a new one");
      const makefileContent = `
CC = gcc
CFLAGS = -Wall -I"${escapedLibDir}"
TARGET = ${gameName}

ifeq ($(OS),Windows_NT)
    LIBS = -lgdi32 -lwinmm
else
    LIBS = -lX11 -lm
endif

all:
	$(CC) $(CFLAGS) -o "$(TARGET)" "${escapedFilePathToRun}" "${escapedArcadeSource}" $(LIBS)

clean:
	rm -f "$(TARGET)" *.o
`;
      console.log(`[main] Writing Makefile to: ${makefilePath}`);
      console.log("[main] Makefile content:\n", makefileContent);
      await fs.writeFile(makefilePath, makefileContent, "utf-8");
      sendProgress(35, "Created Makefile");
    } else {
      console.log("[main] Existing Makefile found, using it");
      sendProgress(35, "Using existing Makefile");
    }

    const makeCommand =
      config.buildToolPath ||
      (process.platform === "win32" ? "mingw32-make" : "make");
    const env = { ...process.env, TARGET: gameName };
    console.log(
      `[main] Running Makefile: ${makeCommand} in ${dir} with TARGET=${gameName}`
    );
    buildOutput = `> ${makeCommand}\n`;
    let buildSuccess = false;

    try {
      const { stdout, stderr } = await execPromise(makeCommand, {
        cwd: dir,
        env,
      });
      buildOutput += `${stdout}\n${stderr}`;
      buildSuccess =
        !stderr.toLowerCase().includes("error:") &&
        !stdout.toLowerCase().includes("error:");
      sendProgress(45, "Compilation completed");
    } catch (makeError) {
      console.error(`[main] Make execution error: ${makeError}`);
      buildOutput += `Build Failed:\n${
        makeError.stderr || makeError.stdout || makeError.message
      }`;
      sendProgress(20, `Build failed: ${makeError.message}`);
      return { success: false, output: buildOutput };
    }

    if (!buildSuccess) {
      console.error("[main] Build failed, output:\n", buildOutput);
      sendProgress(20, "Build failed");
      return { success: false, output: buildOutput };
    }

    console.log(`[main] Checking for executable at: ${executablePath}`);
    if (!(await fileExists(executablePath))) {
      buildOutput += `\nBuild successful, but executable (${executableName}) not found at ${executablePath}.`;
      try {
        const files = await fs.readdir(dir);
        console.log(`[main] Directory contents: ${files.join(", ")}`);
        buildOutput += `\nDirectory contents: ${files.join(", ")}`;
      } catch (dirError) {
        console.error(`[main] Error reading directory: ${dirError}`);
        buildOutput += `\nError reading directory: ${dirError.message}`;
      }
      sendProgress(20, `Executable not found at ${executablePath}`);
      return { success: true, output: buildOutput };
    }

    sendProgress(50, "Build successful, executable created");
    return { success: true, output: buildOutput };
  } catch (error) {
    console.error("[main] Error during build process:", error);
    sendProgress(20, `Build error: ${error.message}`);
    return { success: false, output: `Error: ${error.message}` };
  }
}

ipcMain.handle("project:newArcade", async (event, folderPath) => {
  console.log(
    `[main] IPC project:newArcade called with folderPath: ${folderPath}`
  );
  try {
    await fs.mkdir(folderPath, { recursive: true });

    const escapedLibDir = path
      .join(__dirname, "lib")
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');
    const escapedArcadeSource = path
      .join(__dirname, "lib", "arcade.c")
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');

    const makefileContent = `
CC = gcc
CFLAGS = -Wall -I"${escapedLibDir}"
TARGET = game

ifeq ($(OS),Windows_NT)
    LIBS = -lgdi32 -lwinmm
else
    LIBS = -lX11 -lm
endif

all:
	$(CC) $(CFLAGS) -o "$(TARGET)" game.c "${escapedArcadeSource}" $(LIBS)

clean:
	rm -f "$(TARGET)" *.o
`;
    const sampleCode = `#include "arcade.h"\n\nint main() {\n  arcade_init(800, 600, "My Game", 0x000000);\n  while (arcade_running()) {\n    arcade_update();\n    arcade_render_scene(NULL, 0, NULL);\n  }\n  arcade_quit();\n  return 0;\n}\n`;

    await fs.writeFile(
      path.join(folderPath, "Makefile"),
      makefileContent,
      "utf-8"
    );
    await fs.writeFile(path.join(folderPath, "game.c"), sampleCode, "utf-8");

    await fs.mkdir(path.join(folderPath, "assets"), { recursive: true });

    config.recentFolders = config.recentFolders || [];
    config.recentFolders = [
      ...new Set([folderPath, ...config.recentFolders]),
    ].slice(0, 5);
    await saveConfig();

    return { success: true, folderPath };
  } catch (error) {
    console.error("[main] Error creating Arcade project:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("project:newArcadeProject", async (event, folderPath) => {
  console.log(
    `[main] IPC project:newArcadeProject called with folderPath: ${folderPath}`
  );
  return ipcMain.handle("project:newArcade")(event, folderPath);
});

ipcMain.handle("icon:getClass", (event, fileName, isDir) => {
  console.log(
    `[main] IPC icon:getClass called for: ${fileName}, isDir: ${isDir}`
  );
  const ext = isDir ? "folder" : path.extname(fileName).toLowerCase().slice(1);
  console.log(`[main] Determined extension: ${ext}`); // Debug extension
  const iconMap = {
    folder: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>`,
    c: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-letter-c-small"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 10a2 2 0 1 0 -4 0v4a2 2 0 1 0 4 0" /></svg>`,
    h: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-letter-c-small"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 10a2 2 0 1 0 -4 0v4a2 2 0 1 0 4 0" /></svg>`,
    png: `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-png"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" /><path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3" /><path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6" /><path d="M11 21v-6l3 6v-6" /></svg>
  <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2v-1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zm-3.76 8.132q.114.23.14.492h-.776a.8.8 0 0 0-.097-.249.7.7 0 0 0-.17-.19.7.7 0 0 0-.237-.126 1 1 0 0 0-.299-.044q-.427 0-.665.302-.234.301-.234.85v.498q0 .351.097.615a.9.9 0 0 0 .304.413.87.87 0 0 0 .519.146 1 1 0 0 0 .457-.096.67.67 0 0 0 .272-.264q.09-.164.091-.363v-.255H8.82v-.59h1.576v.798q0 .29-.097.55a1.3 1.3 0 0 1-.293.458 1.4 1.4 0 0 1-.495.313q-.296.111-.697.111a2 2 0 0 1-.753-.132 1.45 1.45 0 0 1-.533-.377 1.6 1.6 0 0 1-.32-.58 2.5 2.5 0 0 1-.105-.745v-.506q0-.543.2-.95.201-.406.582-.633.384-.228.926-.228.357 0 .636.1.281.1.48.275.2.176.314.407Zm-8.64-.706H0v4h.791v-1.343h.803q.43 0 .732-.172.305-.177.463-.475a1.4 1.4 0 0 0 .161-.677q0-.374-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.381.57.57 0 0 1-.238.24.8.8 0 0 1-.375.082H.788v-1.406h.66q.327 0 .512.182.185.181.185.521m1.964 2.666V13.25h.032l1.761 2.675h.656v-3.999h-.75v2.66h-.032l-1.752-2.66h-.662v4z"/>
</svg>`,
    wav: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file-music"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M11 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M12 16l0 -5l2 1" /></svg>`,
    txt: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-file-type-txt"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M16.5 15h3" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" /><path d="M4.5 15h3" /><path d="M6 15v6" /><path d="M18 15v6" /><path d="M10 15l4 6" /><path d="M10 21l4 -6" /></svg>`,
    makefile: `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-file-3d"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 13.5l4 -1.5" /><path d="M8 11.846l4 1.654v4.5l4 -1.846v-4.308l-4 -1.846z" /><path d="M8 12v4.2l4 1.8" /></svg>`,
    json: `<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-json"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 16v-8l3 8v-8" /><path d="M15 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z" /><path d="M1 8h3v6.5a1.5 1.5 0 0 1 -3 0v-.5" /><path d="M7 15a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1h1a1 1 0 0 1 1 1" /></svg>`,
  };
  const iconSvg = iconMap[ext] || (isDir ? iconMap.folder : iconMap.txt);
  console.log(`[main] Returning icon SVG for ${ext}`);
  return iconSvg;
});

ipcMain.handle("menu:showContextMenu", async (event, filePath, isDir) => {
  console.log(
    `[main] IPC menu:showContextMenu called for ${filePath}, isDir: ${isDir}`
  );
  const template = [
    {
      label: "Rename",
      click: () => {
        event.sender.send("contextMenu:action", { action: "rename", filePath });
      },
    },
    {
      label: "Delete",
      click: () => {
        event.sender.send("contextMenu:action", { action: "delete", filePath });
      },
    },
  ];
  if (isDir) {
    template.unshift(
      {
        label: "New File",
        click: () => {
          event.sender.send("contextMenu:action", {
            action: "newFile",
            filePath,
          });
        },
      },
      {
        label: "New Folder",
        click: () => {
          event.sender.send("contextMenu:action", {
            action: "newFolder",
            filePath,
          });
        },
      }
    );
  }
  const menu = Menu.buildFromTemplate(template);
  menu.popup();
});

ipcMain.handle("dialog:showInput", async (event, options) => {
  console.log(`[main] IPC dialog:showInput called with options:`, options);
  try {
    const { response, input } = await dialog.showMessageBox(mainWindow, {
      type: "question",
      title: options.title || "Input",
      message: options.message || "Enter value:",
      buttons: ["OK", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      textInput: options.defaultInput || "",
    });
    console.log(
      `[main] dialog:showInput response: ${response}, input: ${input}`
    );
    if (response === 0 && input) {
      return { value: input };
    }
    return { value: null };
  } catch (error) {
    console.error(`[main] Error in dialog:showInput: ${error.message}`);
    return { error: error.message };
  }
});

ipcMain.handle("code:package", async (event, folderPath) => {
  console.log(`[main] IPC code:package called for ${folderPath}`);
  // Helper function to send progress updates
  const sendProgress = (progress, message) => {
    mainWindow.webContents.send("package:progress", { progress, message });
  };

  let tempDir = null;
  try {
    sendProgress(0, "Starting packaging process...");

    const configPath = path.join(folderPath, "arcade.config.json");
    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);
    if (!configExists) {
      console.error("[main] arcade.config.json not found");
      sendProgress(100, "Packaging failed: arcade.config.json not found");
      return { success: false, error: "arcade.config.json not found" };
    }
    const configContent = await fs.readFile(configPath, "utf8");
    let config;
    try {
      config = JSON.parse(configContent);
    } catch (error) {
      console.error("[main] Invalid arcade.config.json:", error.message);
      sendProgress(100, `Packaging failed: Invalid arcade.config.json`);
      return {
        success: false,
        error: `Invalid arcade.config.json: ${error.message}`,
      };
    }
    const { gameName, version, binaryName, iconPath = "" } = config;
    if (!gameName || !version) {
      console.error("[main] Missing required fields in arcade.config.json");
      sendProgress(
        100,
        "Packaging failed: Missing required fields in arcade.config.json"
      );
      return {
        success: false,
        error:
          "Missing required fields in arcade.config.json (gameName, version)",
      };
    }

    sendProgress(10, "Validated arcade.config.json");

    // Check if game.c exists
    const gameCPath = path.join(folderPath, "game.c");
    if (!(await fileExists(gameCPath))) {
      console.error(`[main] game.c not found at ${gameCPath}`);
      sendProgress(100, `Packaging failed: game.c not found`);
      return {
        success: false,
        error: `game.c not found at ${gameCPath}`,
      };
    }

    // Read the existing game.c content
    let gameCContent;
    try {
      gameCContent = await fs.readFile(gameCPath, "utf-8");
      console.log(
        `[main] Read game.c content, length: ${gameCContent.length} characters`
      );
    } catch (readError) {
      console.error(`[main] Failed to read game.c: ${readError.message}`);
      sendProgress(100, `Packaging failed: Failed to read game.c`);
      return {
        success: false,
        error: `Failed to read game.c: ${readError.message}`,
      };
    }

    sendProgress(20, "Read game.c content");

    // Call buildOnly with progress updates
    const buildResult = await buildOnly(event, gameCPath, gameCContent);
    if (!buildResult.success) {
      console.error("[main] Compilation failed:", buildResult.error);
      sendProgress(
        100,
        `Packaging failed: Compilation failed: ${buildResult.error}`
      );
      return {
        success: false,
        error: `Compilation failed: ${buildResult.error}`,
        output: buildResult.output || "No output from build process",
      };
    }

    sendProgress(50, "Code compiled successfully");

    const isWindows = process.platform === "win32";
    const binaryFileName = isWindows ? `${binaryName}.exe` : binaryName;
    const binaryPath = path.join(folderPath, binaryFileName);
    console.log(`[main] Checking for binary at ${binaryPath}`);

    const binaryExists = await fs
      .access(binaryPath)
      .then(() => true)
      .catch(() => false);
    if (!binaryExists) {
      console.error(`[main] Game binary not found at ${binaryPath}`);
      sendProgress(100, `Packaging failed: Game binary not found`);
      return {
        success: false,
        error: `Game binary not found: ${binaryFileName}`,
        output: buildResult.output || "No output from build process",
      };
    }

    sendProgress(60, "Verified game binary");

    // Create temporary directory for intermediate files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arcade-package-"));
    console.log(`[main] Created temporary directory: ${tempDir}`);

    // Create dist directory
    const outputDir = path.join(folderPath, "dist");
    await fs.mkdir(outputDir, { recursive: true });

    // Create a version file
    const versionFilePath = path.join(tempDir, "version");
    try {
      await fs.writeFile(versionFilePath, version, "utf-8");
      console.log(`[main] Created version file at ${versionFilePath}`);
    } catch (versionError) {
      console.error(
        `[main] Failed to create version file: ${versionError.message}`
      );
      sendProgress(100, `Packaging failed: Failed to create version file`);
      return {
        success: false,
        error: `Failed to create version file: ${versionError.message}`,
      };
    }

    sendProgress(65, "Created version file");

    // Rename binary to use gameName
    const finalBinaryName = isWindows ? `${gameName}.exe` : gameName;
    const finalBinaryPath = path.join(tempDir, finalBinaryName);
    try {
      await fs.copyFile(binaryPath, finalBinaryPath);
      console.log(`[main] Copied binary to ${finalBinaryPath}`);
    } catch (copyError) {
      console.error(`[main] Failed to copy binary: ${copyError.message}`);
      sendProgress(100, `Packaging failed: Failed to copy binary`);
      return {
        success: false,
        error: `Failed to copy binary: ${copyError.message}`,
      };
    }

    sendProgress(70, "Renamed binary to game name");

    // Embed icon in binary (Windows) or prepare .desktop file (Linux)
    let desktopFilePath = null;
    if (
      isWindows &&
      iconPath &&
      (await fileExists(path.join(folderPath, iconPath)))
    ) {
      try {
        await rcedit(finalBinaryPath, {
          icon: path.join(folderPath, iconPath),
        });
        console.log(`[main] Embedded icon into ${finalBinaryPath}`);
      } catch (rceditError) {
        console.warn(`[main] Failed to embed icon: ${rceditError.message}`);
        // Continue packaging, icon will still be included in zip
      }
    } else if (
      !isWindows &&
      iconPath &&
      (await fileExists(path.join(folderPath, iconPath)))
    ) {
      desktopFilePath = path.join(tempDir, `${gameName}.desktop`);
      const desktopContent = `[Desktop Entry]
Name=${gameName}
Exec=${finalBinaryName}
Type=Application
Icon=${path.basename(iconPath)}
Terminal=false
Categories=Game;
`;
      try {
        await fs.writeFile(desktopFilePath, desktopContent, "utf-8");
        console.log(`[main] Created .desktop file at ${desktopFilePath}`);
      } catch (desktopError) {
        console.warn(
          `[main] Failed to create .desktop file: ${desktopError.message}`
        );
        // Continue packaging, icon will still be included in zip
      }
    }

    sendProgress(75, "Processed icon for binary");

    // Create zip file
    const zipPath = path.join(outputDir, `${gameName}-${version}.zip`);
    console.log(`[main] Creating zip at ${zipPath}`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fsAll.createWriteStream(zipPath);
    archive.pipe(output);
    archive.file(finalBinaryPath, { name: finalBinaryName });
    archive.file(versionFilePath, { name: "version" });
    if (
      iconPath &&
      (await fs
        .access(path.join(folderPath, iconPath))
        .then(() => true)
        .catch(() => false))
    ) {
      archive.file(path.join(folderPath, iconPath), {
        name: path.basename(iconPath),
      });
      console.log(`[main] Included icon at ${iconPath} in zip`);
    }
    if (desktopFilePath) {
      archive.file(desktopFilePath, { name: `${gameName}.desktop` });
      console.log(`[main] Included .desktop file in zip`);
    }
    archive.directory(path.join(folderPath, "assets"), "assets");
    await archive.finalize();

    sendProgress(100, `Package generated at ${zipPath}`);
    console.log(`[main] Package generated successfully at ${zipPath}`);

    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`[main] Cleaned up temporary directory: ${tempDir}`);

    const outputMessage = `Package generated at ${zipPath}. ${
      isWindows
        ? "Icon embedded in binary (if provided)."
        : "Use the .desktop file to set the icon for launchers."
    }`;
    return {
      success: true,
      output: outputMessage,
    };
  } catch (error) {
    console.error(`[main] Error in code:package: ${error.message}`);
    sendProgress(100, `Packaging failed: ${error.message}`);
    if (tempDir) {
      await fs
        .rm(tempDir, { recursive: true, force: true })
        .catch((err) =>
          console.warn(`[main] Failed to clean up temp dir: ${err.message}`)
        );
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle("generateSprite", async (event, spriteData) => {
  console.log(`[main] IPC generateSprite called with data:`, spriteData);
  try {
    // Validate current folder path
    const currentFolderPath = config.lastOpenFolder;
    if (!currentFolderPath) {
      return {
        success: false,
        error: "No folder open. Please open a folder first.",
      };
    }

    // Retrieve API keys from config
    const geminiApiKey = config.geminiApiKey || "";
    const removeBgApiKey = config.removeBgApiKey || "";

    if (!geminiApiKey) {
      console.error("[main] Gemini API key is not set");
      return {
        success: false,
        error: "Gemini API key is not set. Please configure it in settings.",
      };
    }

    // Initialize Google AI with the retrieved API key
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Create assets/sprites folders if they don't exist
    const assetsPath = path.join(currentFolderPath, "assets");
    const spritesPath = path.join(assetsPath, "sprites");
    try {
      await fs.mkdir(assetsPath, { recursive: true });
      await fs.mkdir(spritesPath, { recursive: true });
    } catch (mkdirError) {
      console.error(
        `[main] Failed to create assets/sprites folders: ${mkdirError.message}`
      );
      return {
        success: false,
        error: `Failed to create assets/sprites folders: ${mkdirError.message}`,
      };
    }

    // Generate prompt with hex colors
    const prompt = `
      A pixel art sprite of a ${spriteData.subject} viewed from a ${
      spriteData.viewAngle
    } perspective, designed for a ${
      spriteData.gameGenre
    } game. The sprite has a fully transparent background (no scenery, patterns, or artifacts, only the ${
      spriteData.subject
    }). The sprite is saved as a transparent .png file.
      
      Design Style:
      - Pixel art with distinct, clean pixels
      - ${spriteData.artAesthetic} aesthetic
      - Use exactly these hex color codes: ${spriteData.hexColors.join(", ")}
      - Size: ${spriteData.pixelSize}
      - Clear, symmetrical, or balanced design as appropriate for the subject
      - Includes defining features relevant to the ${
        spriteData.subject
      } (e.g., wings for a dragon, weapon for a character)
      
      Goal:
      The sprite is optimized for use in a 2D game engine like Godot, Unity, or Phaser, with no background elements.
    `;

    // Generate image using Google AI
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    let imageBuffer = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageBuffer = Buffer.from(part.inlineData.data, "base64");
        break;
      }
    }

    if (!imageBuffer) {
      return { success: false, error: "No image generated" };
    }

    // Remove background using Remove.bg
    const outputFile = path.join(spritesPath, `${spriteData.imageName}.png`);
    try {
      if (!removeBgApiKey) {
        console.warn(
          "[main] Remove.bg API key is not set, saving original image"
        );
        await fs.writeFile(outputFile, imageBuffer);
        return {
          success: true,
          filePath: outputFile,
          warning: "Remove.bg API key not set. Original image saved.",
        };
      }

      const transparentBuffer = await removeBg(imageBuffer, removeBgApiKey);
      await fs.writeFile(outputFile, transparentBuffer);
      console.log(
        `[main] Sprite with transparent background saved to: ${outputFile}`
      );
    } catch (bgError) {
      console.error("[main] Background removal failed:", bgError.message);
      // Fallback: Save the original image
      await fs.writeFile(outputFile, imageBuffer);
      console.log(`[main] Original sprite saved to: ${outputFile}`);
      return {
        success: true,
        filePath: outputFile,
        warning: `Background removal failed: ${bgError.message}. Original image saved.`,
      };
    }

    return { success: true, filePath: outputFile };
  } catch (error) {
    console.error("[main] Sprite generation error:", error.message);
    return { success: false, error: error.message };
  }
});

// Updated removeBg function to accept API key as parameter
async function removeBg(buffer, apiKey) {
  const apiUrl = "https://api.remove.bg/v1.0/removebg";

  try {
    const formData = {
      image_file: buffer,
      size: "auto",
    };

    const response = await axios.post(apiUrl, formData, {
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "multipart/form-data",
      },
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(
      `Error processing background removal: ${
        error.response?.data?.errors?.[0]?.title || error.message
      }`
    );
  }
}
