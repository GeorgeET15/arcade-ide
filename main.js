const { app, BrowserWindow, ipcMain, dialog, protocol } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");

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
  console.log(`Loading config from: ${configPath}`);
  try {
    const data = await fs.readFile(configPath, "utf-8");
    config = JSON.parse(data);
    console.log("Config loaded:", config);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Error loading config:", error);
    }
    console.log("Using default config");
  }
}

async function saveConfig() {
  console.log(`Saving config to: ${configPath}`);
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log("Config saved");
  } catch (error) {
    console.error("Error saving config:", error);
  }
}

let mainWindow;

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    console.log(`File exists: ${filePath}`);
    return true;
  } catch (e) {
    console.warn(`File does not exist: ${filePath}`);
    return false;
  }
}

function registerFileProtocol() {
  console.log("Registering file protocol handler...");
  protocol.registerFileProtocol("file", (request, callback) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const resolvedPath = path.join(__dirname, pathname);
    console.log(`File protocol request: ${request.url} -> ${resolvedPath}`);
    callback({ path: resolvedPath });
  });

  protocol.registerFileProtocol("electron", (request, callback) => {
    console.error(`Attempted to load electron: URL: ${request.url}`);
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const resolvedPath = path.join(__dirname, pathname);
    console.log(`Redirecting electron: to file: ${resolvedPath}`);
    callback({ path: resolvedPath });
  });
}

async function createWindow() {
  console.log("Creating window...");
  await loadConfig();
  const savedBounds = config.windowBounds || { width: 1100, height: 750 };
  console.log("Retrieved windowBounds from config:", savedBounds);
  const preloadPath = path.join(__dirname, "preload.js");
  console.log(`Attempting to load preload script from: ${preloadPath}`);
  const preloadExists = await fileExists(preloadPath);
  if (!preloadExists) {
    console.error(`Preload script not found at: ${preloadPath}`);
    dialog.showErrorBox("Error", `Preload script not found at: ${preloadPath}`);
    app.quit();
    return;
  }

  const indexPath = path.join(__dirname, "index.html");
  console.log(`Attempting to load index.html from: ${indexPath}`);
  if (!(await fileExists(indexPath))) {
    console.error(`index.html not found at: ${indexPath}`);
    dialog.showErrorBox("Error", `index.html not found at: ${indexPath}`);
    app.quit();
    return;
  }

  const iconPath = path.join(__dirname, "icon.png");
  console.log(`Attempting to load icon from: ${iconPath}`);
  if (!(await fileExists(iconPath))) {
    console.warn(
      `Icon not found at: ${iconPath}, proceeding without custom icon`
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
      },
      title: "Arcade IDE",
      icon: iconPath,
    });

    mainWindow.setMenu(null);

    console.log(`Loading index.html from: ${indexPath}`);
    await mainWindow.loadFile(indexPath);
    console.log("index.html loaded successfully");
  } catch (error) {
    console.error(`Error in createWindow: ${error.message}`);
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
}

function saveBounds() {
  if (mainWindow && !mainWindow.isMinimized() && !mainWindow.isDestroyed()) {
    console.log("Saving windowBounds to config");
    config.windowBounds = mainWindow.getBounds();
    saveConfig();
  }
}

app.whenReady().then(() => {
  console.log("App is ready");
  try {
    registerFileProtocol();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (error) {
    console.error("Error during app initialization:", error);
    console.error(error.stack);
    dialog.showErrorBox("Initialization Error", error.message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  console.log("All windows closed");
  delete config.lastOpenFolder;
  saveConfig();
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers
ipcMain.handle("settings:get", (event, key, defaultValue) => {
  console.log(`IPC settings:get called with key: ${key}`);
  return config[key] !== undefined ? config[key] : defaultValue;
});

ipcMain.handle("settings:set", (event, key, value) => {
  console.log(`IPC settings:set called with key: ${key}`);
  config[key] = value;
  saveConfig();
});

ipcMain.handle("platform:get", () => {
  console.log("IPC platform:get called");
  return {
    platform: process.platform,
    pathSep: path.sep,
  };
});

ipcMain.handle("path:join", async (event, ...args) => {
  console.log(`IPC path:join called with args: ${args}`);
  try {
    const joinedPath = path.join(...args);
    console.log(`Joined path: ${joinedPath}`);
    return joinedPath;
  } catch (error) {
    console.error(`Error joining paths: ${error.message}`);
    throw error;
  }
});

ipcMain.handle("dialog:openFile", async () => {
  console.log("IPC dialog:openFile called");
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "C Files", extensions: ["c", "h"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }
  const filePath = filePaths[0];
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { canceled: false, filePath, content, success: true };
  } catch (error) {
    console.error("Failed to read file via dialog:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("file:saveFile", async (event, filePathToSave, content) => {
  console.log(`IPC file:saveFile called with filePath: ${filePathToSave}`);
  let savePath = filePathToSave;

  if (!savePath) {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save C File As",
      defaultPath: config.lastOpenFolder || app.getPath("documents"),
      filters: [
        { name: "C Files", extensions: ["c"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (canceled || !filePath) {
      return { canceled: true };
    }
    savePath = filePath;
  }

  try {
    await fs.writeFile(savePath, content, "utf-8");
    return { canceled: false, filePath: savePath, success: true };
  } catch (error) {
    console.error("Failed to save file:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("dialog:openFolder", async () => {
  console.log("IPC dialog:openFolder called");
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    defaultPath: config.lastOpenFolder,
  });
  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }
  const folderPath = filePaths[0];
  config.lastOpenFolder = folderPath;
  saveConfig();
  return { canceled: false, folderPath, success: true };
});

ipcMain.handle("file:readDir", async (event, folderPath) => {
  console.log(`IPC file:readDir called with folderPath: ${folderPath}`);
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = entries
      .map((entry) => ({
        name: entry.name,
        isDir: entry.isDirectory(),
        path: path.join(folderPath, entry.name),
      }))
      .filter((f) => f.isDir || /\.(c|h|makefile|png|wav)$/i.test(f.name))
      .filter((f) => !f.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

    return { success: true, files };
  } catch (error) {
    console.error(`Error reading directory ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file:readFile", async (event, filePath) => {
  console.log(`IPC file:readFile called with filePath: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file:writeFile", async (event, filePath, content) => {
  console.log(`IPC file:writeFile called with filePath: ${filePath}`);
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("file:createFolder", async (event, folderPath) => {
  console.log(`IPC file:createFolder called with folderPath: ${folderPath}`);
  try {
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error(`Error creating folder ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:readDir", async (event, folderPath) => {
  console.log(`IPC fs:readDir called with folderPath: ${folderPath}`);
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const files = entries
      .map((entry) => ({
        name: entry.name,
        isDir: entry.isDirectory(),
        path: path.join(folderPath, entry.name),
      }))
      .filter((f) => f.isDir || /\.(c|h|makefile|png|wav)$/i.test(f.name))
      .filter((f) => !f.name.startsWith("."))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

    return { success: true, files };
  } catch (error) {
    console.error(`Error reading directory ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:readFile", async (event, filePath) => {
  console.log(`IPC fs:readFile called with filePath: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:writeFile", async (event, filePath, content) => {
  console.log(`IPC fs:writeFile called with filePath: ${filePath}`);
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:createFolder", async (event, folderPath) => {
  console.log(`IPC fs:createFolder called with folderPath: ${folderPath}`);
  try {
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error(`Error creating folder ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("code:runOrBuild", async (event, filePathToRun, codeToRun) => {
  console.log(`IPC code:runOrBuild called with filePath: ${filePathToRun}`);
  if (!filePathToRun) {
    return {
      success: false,
      output: "Error: Cannot build and play. File needs to be saved first.",
    };
  }

  try {
    console.log(`Ensuring file is saved: ${filePathToRun}`);
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

    console.log(`Checking arcade library files in: ${libDir}`);
    if (!(await fileExists(arcadeSource))) {
      console.error(`Arcade source not found at: ${arcadeSource}`);
      return {
        success: false,
        output: `Error: arcade.c not found at ${arcadeSource}. Ensure the lib directory contains arcade.c.`,
      };
    }
    if (!(await fileExists(arcadeHeader))) {
      console.error(`Arcade header not found at: ${arcadeHeader}`);
      return {
        success: false,
        output: `Error: arcade.h not found at ${arcadeHeader}. Ensure the lib directory contains arcade.h.`,
      };
    }
    for (const header of stbHeaders) {
      if (!(await fileExists(header))) {
        console.error(`STB header not found at: ${header}`);
        return {
          success: false,
          output: `Error: STB header (${path.basename(
            header
          )}) not found at ${header}. Ensure all STB headers are present in lib.`,
        };
      }
    }

    // Escape paths for Makefile to handle spaces
    const escapedLibDir = libDir.replace(/\\/g, "/").replace(/"/g, '\\"');
    const escapedArcadeSource = arcadeSource
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');
    const escapedFilePathToRun = filePathToRun
      .replace(/\\/g, "/")
      .replace(/"/g, '\\"');

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
    console.log(`Writing Makefile to: ${makefilePath}`);
    console.log("Makefile content:\n", makefileContent);
    await fs.writeFile(makefilePath, makefileContent, "utf-8");

    const makeCommand =
      config.buildToolPath ||
      (process.platform === "win32" ? "mingw32-make" : "make");
    const env = { ...process.env, TARGET: gameName };
    console.log(
      `Running Makefile: ${makeCommand} in ${dir} with TARGET=${gameName}`
    );
    let buildOutput = `> ${makeCommand}\n`;
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
      console.error(`Make execution error: ${makeError}`);
      buildOutput += `Build Failed:\n${
        makeError.stderr || makeError.stdout || makeError.message
      }`;
      return { success: false, output: buildOutput };
    }

    if (!buildSuccess) {
      console.error("Build failed, output:\n", buildOutput);
      return { success: false, output: buildOutput };
    }

    console.log(`Checking for executable at: ${executablePath}`);
    if (!(await fileExists(executablePath))) {
      buildOutput += `\nBuild successful, but executable (${executableName}) not found at ${executablePath}. Cannot play.`;
      try {
        const files = await fs.readdir(dir);
        console.log(`Directory contents: ${files.join(", ")}`);
        buildOutput += `\nDirectory contents: ${files.join(", ")}`;
      } catch (dirError) {
        console.error(`Error reading directory: ${dirError}`);
        buildOutput += `\nError reading directory: ${dirError.message}`;
      }
      return { success: true, output: buildOutput };
    }

    const runCommand =
      process.platform === "win32"
        ? `"${executablePath}"`
        : `./"${executableName}"`;
    console.log(`Playing: ${runCommand} in ${dir}`);
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
      console.error(`Runtime exec error: ${runError}`);
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
    console.error("Error during build/play process:", error);
    return { success: false, output: `Error: ${error.message}` };
  }
});

ipcMain.handle("project:newArcade", async (event, folderPath) => {
  console.log(`IPC project:newArcade called with folderPath: ${folderPath}`);
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
    await fs.writeFile(
      path.join(folderPath, "Makefile"),
      makefileContent,
      "utf-8"
    );

    await fs.mkdir(path.join(folderPath, "assets"), { recursive: true });

    return { success: true, folderPath };
  } catch (error) {
    console.error("Error creating Arcade project:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("project:newArcadeProject", async (event, folderPath) => {
  console.log(
    `IPC project:newArcadeProject called with folderPath: ${folderPath}`
  );
  // Delegate to project:newArcade for compatibility
  return ipcMain.handle("project:newArcade")(event, folderPath);
});

ipcMain.handle("icon:getClass", (event, fileName, isDir) => {
  console.log(`IPC icon:getClass called for: ${fileName}, isDir: ${isDir}`);
  const ext = isDir ? "folder" : path.extname(fileName).toLowerCase().slice(1);
  const iconMap = {
    folder: "fas fa-folder",
    c: "fas fa-file-code",
    h: "fas fa-file-code",
    png: "fas fa-file-image",
    wav: "fas fa-file-audio",
    txt: "fas fa-file-alt",
    makefile: "fas fa-file",
  };
  const iconClass = iconMap[ext] || (isDir ? "fas fa-folder" : "fas fa-file");
  console.log(`Returning icon class: ${iconClass}`);
  return iconClass;
});
