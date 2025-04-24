const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { exec } = require("child_process");
const util = require("util");
const Store = require("electron-store").default;

const execPromise = util.promisify(exec);
const store = new Store();

let mainWindow;

async function fileExists(filePath) {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

async function createWindow() {
  const savedBounds = store.get("windowBounds", { width: 1100, height: 750 });
  const preloadPath = path.join(__dirname, "preload.js");
  console.log(`Attempting to load preload script from: ${preloadPath}`);
  const preloadExists = await fileExists(preloadPath);
  if (!preloadExists) {
    console.error(`Preload script not found at: ${preloadPath}`);
    dialog.showErrorBox("Error", `Preload script not found at: ${preloadPath}`);
    app.quit();
    return;
  } else {
    console.log(`Preload script found at: ${preloadPath}`);
  }

  mainWindow = new BrowserWindow({
    ...savedBounds,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: "Arcade IDE",
    icon: path.join(__dirname, "icon.png"), // Add icon for Windows/Linux
  });

  mainWindow.setMenu(null);

  mainWindow.loadFile("index.html");

  mainWindow.on("resized", saveBounds);
  mainWindow.on("moved", saveBounds);
  mainWindow.on("close", () => {
    saveBounds();
  });
}

function saveBounds() {
  if (mainWindow && !mainWindow.isMinimized() && !mainWindow.isDestroyed()) {
    store.set("windowBounds", mainWindow.getBounds());
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  store.delete("lastOpenFolder");
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers (unchanged)
ipcMain.handle("settings:get", (event, key, defaultValue) => {
  return store.get(key, defaultValue);
});

ipcMain.handle("settings:set", (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle("platform:get", () => {
  return {
    platform: process.platform,
    pathSep: path.sep,
  };
});

ipcMain.handle("dialog:openFile", async () => {
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
    return { canceled: false, filePath, content };
  } catch (error) {
    console.error("Failed to read file via dialog:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("file:saveFile", async (event, filePathToSave, content) => {
  let savePath = filePathToSave;

  if (!savePath) {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Save C File As",
      defaultPath: store.get("lastOpenFolder") || app.getPath("documents"),
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
    return { canceled: false, filePath: savePath };
  } catch (error) {
    console.error("Failed to save file:", error);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle("code:runOrBuild", async (event, filePathToRun, codeToRun) => {
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

    if (
      !(await fileExists(arcadeSource)) ||
      !(await fileExists(arcadeHeader))
    ) {
      return {
        success: false,
        output: `Error: Arcade Library files (arcade.c, arcade.h) not found in ${libDir}. Please ensure they are present.`,
      };
    }
    for (const header of stbHeaders) {
      if (!(await fileExists(header))) {
        return {
          success: false,
          output: `Error: STB header (${path.basename(
            header
          )}) not found in ${libDir}. Please ensure all STB headers are present.`,
        };
      }
    }

    const makefileContent = `
CC = gcc
CFLAGS = -Wall -I"${libDir}"
TARGET = ${gameName}

ifeq ($(OS),Windows_NT)
    LIBS = -lgdi32 -lwinmm
else
    LIBS = -lX11 -lm
endif

all:
	$(CC) $(CFLAGS) -o $(TARGET) ${filePathToRun} ${arcadeSource} $(LIBS)

clean:
	rm -f $(TARGET) *.o
`;
    console.log(`Writing Makefile to: ${makefilePath}`);
    await fs.writeFile(makefilePath, makefileContent, "utf-8");

    const makeCommand = store.get(
      "buildToolPath",
      process.platform === "win32" ? "mingw32-make" : "make"
    );
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

ipcMain.handle("dialog:openFolder", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    defaultPath: store.get("lastOpenFolder"),
  });
  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }
  const folderPath = filePaths[0];
  store.set("lastOpenFolder", folderPath);
  return { canceled: false, folderPath };
});

ipcMain.handle("fs:readDir", async (event, folderPath) => {
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
  try {
    console.log(`Reading file via IPC: ${filePath}`);
    const content = await fs.readFile(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:writeFile", async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true };
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("fs:createFolder", async (event, folderPath) => {
  try {
    await fs.mkdir(folderPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error(`Error creating folder ${folderPath}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("project:newArcade", async (event, folderPath) => {
  try {
    await fs.mkdir(folderPath, { recursive: true });

    const makefileContent = `
CC = gcc
CFLAGS = -Wall -I"${path.join(__dirname, "lib").replace(/\\/g, "/")}"
TARGET = game

ifeq ($(OS),Windows_NT)
    LIBS = -lgdi32 -lwinmm
else
    LIBS = -lX11 -lm
endif

all:
	$(CC) $(CFLAGS) -o $(TARGET) game.c ${path
    .join(__dirname, "lib", "arcade.c")
    .replace(/\\/g, "/")} $(LIBS)

clean:
	rm -f $(TARGET) *.o
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
