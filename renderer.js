let editor;
let activeTabId = null;
const openTabs = new Map();
let tabCounter = 0;
let currentFolderPath = null;
let pathSep = "/";

const editorContainer = document.getElementById("editor-container");
const tabBar = document.getElementById("tab-bar");
const outputArea = document.getElementById("output-area");
const fileTreeElement = document.getElementById("file-tree");
const openFolderButtons = document.querySelectorAll("#btn-open-folder");
const closeFolderButton = document.getElementById("btn-close-folder");
const newFileButton = document.getElementById("btn-new-file");
const openFileButton = document.getElementById("btn-open-file");
const saveFileButton = document.getElementById("btn-save-file");
const playButton = document.getElementById("btn-play");
const newFileInFolderButton = document.getElementById("btn-new-file-in-folder");
const newFolderButton = document.getElementById("btn-new-folder");
const toggleOutputButton = document.getElementById("btn-toggle-output");
const clearOutputButton = document.getElementById("btn-clear-output");
const toggleSidebarButton = document.getElementById("btn-toggle-sidebar");
const toggleSidebarRightButton = document.getElementById(
  "btn-toggle-sidebar-right"
);
const settingsButton = document.getElementById("btn-settings");
const settingsDialog = document.getElementById("settings-dialog");
const themeSelector = document.getElementById("theme-selector");
const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
const removeBgApiKeyInput = document.getElementById("remove-bg-api-key-input");
const closeSettingsButton = document.getElementById("btn-close-settings");
const introMessage = document.getElementById("intro-message");
const buildToolPathInput = document.getElementById("build-tool-path");
const autoSaveCheckbox = document.getElementById("auto-save");
const fontSizeInput = document.getElementById("font-size");
const fileExtensionsInput = document.getElementById("file-extensions");
const logLevelSelector = document.getElementById("log-level");
const recentProjectsList = document.getElementById("recent-projects-list");
const clearRecentProjectsButton = document.getElementById(
  "btn-clear-recent-projects"
);
const spriteGenerateForm = document.getElementById("sprite-generate-form");
const toggleRightSidebarButton = document.getElementById(
  "btn-toggle-sidebar-right"
);

console.log("[renderer] Renderer script loaded");

(async () => {
  if (!window.electronAPI) {
    console.error(
      "[renderer] FATAL: electronAPI is undefined. Check preload.js loading."
    );
    outputArea.textContent =
      "Error: Electron API not available. Ensure preload.js loads correctly.";
    return;
  }

  console.log("[renderer] Waiting for Monaco loader...");
  try {
    if (
      typeof require === "undefined" ||
      typeof require.config === "undefined"
    ) {
      throw new Error("Monaco loader not available");
    }
    console.log("[renderer] Monaco loader ready.");

    require.config({
      paths: {
        vs: "node_modules/monaco-editor/min/vs",
      },
    });

    require(["vs/editor/editor.main"], async function () {
      console.log("[renderer] Monaco editor.main loaded.");
      try {
        const platformInfo = await window.electronAPI.getPlatform();
        pathSep = platformInfo.pathSep;
        console.log(
          `[renderer] Running on ${platformInfo.platform}, path separator: ${pathSep}`
        );

        if (!editorContainer) {
          console.error("[renderer] Editor container not found!");
          outputArea.textContent = "Error: Editor container not found.";
          return;
        }

        // Define custom Monaco themes
        monaco.editor.defineTheme("charcoal-teal", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "1f2a30" }],
          colors: {
            "editor.background": "#1f2a30",
            "editor.foreground": "#e8f1f2",
            "editorLineNumber.foreground": "#a0a4b1",
            "editor.selectionBackground": "#3b4cca50",
          },
        });

        monaco.editor.defineTheme("neon-purple", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "1a1a2e" }],
          colors: {
            "editor.background": "#1a1a2e",
            "editor.foreground": "#e0d7ff",
            "editorLineNumber.foreground": "#8a6bff",
            "editor.selectionBackground": "#6b48ff50",
          },
        });

        monaco.editor.defineTheme("retro-red", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "2b1b1b" }],
          colors: {
            "editor.background": "#2b1b1b",
            "editor.foreground": "#ff9999",
            "editorLineNumber.foreground": "#cc6666",
            "editor.selectionBackground": "#cc333350",
          },
        });

        monaco.editor.defineTheme("cyber-green", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "0a1a1a" }],
          colors: {
            "editor.background": "#0a1a1a",
            "editor.foreground": "#00ffcc",
            "editorLineNumber.foreground": "#00cc99",
            "editor.selectionBackground": "#00cc9950",
          },
        });
        monaco.editor.defineTheme("github-dark", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "24292e" }],
          colors: {
            "editor.background": "#24292e",
            "editor.foreground": "#d1d5da",
            "editorLineNumber.foreground": "#6a737d",
            "editor.selectionBackground": "#4c566a50",
          },
        });

        const fontSize = await window.electronAPI.getSettings("fontSize", 12);

        try {
          // Initialize editor with default theme
          editor = monaco.editor.create(editorContainer, {
            model: null,
            language: "c",
            theme: "charcoal-teal", // Default theme
            automaticLayout: true,
            contextmenu: true,
            minimap: { enabled: true },
            fontSize,
          });
          console.log("[renderer] Monaco Editor initialized.");
        } catch (monacoError) {
          console.error(
            "[renderer] Failed to initialize Monaco Editor: " + monacoError
          );
          outputArea.textContent = "Error: Failed to initialize editor.";
          return;
        }

        require(["./completions/arcadeCompletion"], function (
          arcadeCompletion
        ) {
          arcadeCompletion.registerArcadeCompletionProvider(monaco);
          console.log("[renderer] Arcade completions registered.");
        });

        require(["./completions/cCompletionProvider"], function (cCompletion) {
          cCompletion.registerCCompletionProvider(monaco);
          console.log("[renderer] C completions registered.");
        });

        const isSidebarCollapsed = await window.electronAPI.getSettings(
          "sidebarCollapsed",
          false
        );
        const isOutputCollapsed = await window.electronAPI.getSettings(
          "outputCollapsed",
          false
        );

        if (isSidebarCollapsed) toggleSidebar(true);
        if (isOutputCollapsed) toggleOutput(true);

        const selectedTheme = await window.electronAPI.getSettings(
          "selectedTheme",
          "style.css"
        );
        console.log(`[renderer] Restoring theme: ${selectedTheme}`);
        await applyTheme(selectedTheme);

        await loadRecentProjects();

        toggleIntroMessage();

        editor.onDidChangeModelContent(async () => {
          if (activeTabId && openTabs.has(activeTabId)) {
            const tabInfo = openTabs.get(activeTabId);
            if (!tabInfo.isModified && !tabInfo.isPreview) {
              setTabModified(activeTabId, true);
              if (await window.electronAPI.getSettings("autoSave", false)) {
                await handleSaveFile(activeTabId);
              }
            }
          }
        });

        editor.onDidChangeModel((e) => {
          let newActiveTabId = null;
          const newModel = editor.getModel();
          if (newModel) {
            for (const [id, tabInfo] of openTabs.entries()) {
              if (tabInfo.model === newModel) {
                newActiveTabId = id;
                break;
              }
            }
          }
          if (newActiveTabId !== activeTabId) {
            setActiveTab(newActiveTabId, false);
          }
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
          handleSaveFile()
        );
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB,
          handlePlay
        );

        if (typeof window.electronAPI.onContextMenuAction === "function") {
          window.electronAPI.onContextMenuAction((action, filePath) => {
            console.log(
              `[renderer] Received context menu action: ${action} for ${filePath}`
            );
            switch (action) {
              case "rename":
                promptRename(filePath);
                break;
              case "delete":
                confirmDelete(filePath);
                break;
              case "newFile":
                handleNewFileInFolder(filePath);
                break;
              case "newFolder":
                handleNewFolder(filePath);
                break;
              default:
                console.warn(
                  `[renderer] Unknown context menu action: ${action}`
                );
            }
          });
          console.log("[renderer] Context menu action listener registered");
        } else {
          console.error(
            "[renderer] window.electronAPI.onContextMenuAction is not a function"
          );
          outputArea.textContent =
            "Error: Context menu actions not supported. Check preload.js.";
        }

        attachUIEventListeners();
      } catch (error) {
        console.error("[renderer] Initialization error: " + error);
        outputArea.textContent = `Error: ${error.message}`;
      }
    }, (err) => {
      console.error("[renderer] Failed to load Monaco Editor: " + err);
      outputArea.textContent = "Error: Failed to load Monaco Editor.";
    });
  } catch (error) {
    console.error("[renderer] Monaco loader error: " + error);
    outputArea.textContent = `Error loading Monaco: ${error.message}`;
  }
})();

async function closeCurrentFolder() {
  if (!currentFolderPath) {
    console.log("[renderer] No folder open to close");
    return;
  }
  console.log(`[renderer] Closing folder: ${currentFolderPath}`);
  try {
    await window.electronAPI.setSettings("lastOpenFolder", null);
    console.log("[renderer] Cleared lastOpenFolder setting");
    currentFolderPath = null;
    console.log("[renderer] Set currentFolderPath to null");
    fileTreeElement.innerHTML =
      '<li class="placeholder">Open a folder to see files</li>';
    newFileInFolderButton.disabled = true;
    newFolderButton.disabled = true;
    closeFolderButton.disabled = true;
    outputArea.textContent = "Folder closed.";
    showToast("Folder closed");
  } catch (error) {
    console.error(`[renderer] Error closing folder: ${error.message}`);
    outputArea.textContent = `Error closing folder: ${error.message}`;
    showToast("Failed to close folder");
  }
}

function showInputDialog({ title, message, defaultInput }) {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "custom-dialog";
    dialog.innerHTML = `
      <h2>${title}</h2>
      <p>${message}</p>
      <input type="text" value="${defaultInput}" />
      <div class="dialog-buttons">
        <button class="ok-button">OK</button>
        <button class="cancel-button">Cancel</button>
      </div>
    `;
    document.body.appendChild(dialog);

    const input = dialog.querySelector("input");
    const okButton = dialog.querySelector(".ok-button");
    const cancelButton = dialog.querySelector(".cancel-button");

    okButton.addEventListener("click", () => {
      dialog.close();
      resolve(input.value.trim() || null);
    });

    cancelButton.addEventListener("click", () => {
      dialog.close();
      resolve(null);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        dialog.close();
        resolve(input.value.trim() || null);
      } else if (e.key === "Escape") {
        dialog.close();
        resolve(null);
      }
    });

    dialog.addEventListener("close", () => {
      dialog.remove();
    });

    dialog.showModal();
    input.focus();
  });
}

function getBaseName(filePath) {
  if (!filePath) return null;
  return filePath.substring(filePath.lastIndexOf(pathSep) + 1);
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

function createNewTab(
  filePath = null,
  content = "",
  isPreview = false,
  previewType = null
) {
  if (!monaco || !monaco.editor) {
    console.error("[renderer] Cannot create tab: Monaco editor not available.");
    outputArea.textContent = "Error: Editor not ready.";
    return null;
  }
  const tabId = `tab-${tabCounter++}`;
  const isNew = !filePath;
  const fileName = getBaseName(filePath) || `Untitled-${tabCounter - 1}`;
  let model = null;
  let previewContainer = null;

  if (!isPreview) {
    const fileUri = filePath
      ? monaco.Uri.file(filePath)
      : monaco.Uri.parse(`untitled:Untitled-${tabCounter - 1}`);
    let language = "c";
    if (fileName.toLowerCase() === "makefile") language = "makefile";
    else if (!/\.(c|h)$/i.test(fileName) && !isNew) language = "plaintext";
    console.log(
      `[renderer] Creating model for ${fileName} with language ${language}`
    );
    model = monaco.editor.createModel(content, language, fileUri);
  } else {
    previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";
    previewContainer.style.display = "none";
    if (previewType === "image") {
      const img = document.createElement("img");
      img.className = "preview-image";
      img.src = `file://${filePath}`;
      img.addEventListener("click", () => img.classList.toggle("zoomed"));
      previewContainer.appendChild(img);
    } else if (previewType === "audio") {
      const audioDiv = document.createElement("div");
      audioDiv.className = "preview-audio";
      const label = document.createElement("p");
      label.textContent = `Previewing: ${fileName}`;
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = `file://${filePath}`;
      audioDiv.appendChild(label);
      audioDiv.appendChild(audio);
      previewContainer.appendChild(audioDiv);
    }
    editorContainer.appendChild(previewContainer);
  }

  const tabElement = document.createElement("div");
  tabElement.className = "tab";
  tabElement.dataset.tabId = tabId;
  tabElement.title = filePath || "New unsaved file";

  const nameSpan = document.createElement("span");
  nameSpan.className = "tab-name";
  nameSpan.textContent = fileName;
  tabElement.appendChild(nameSpan);

  const modifiedIndicator = document.createElement("span");
  modifiedIndicator.className = "tab-modified-indicator";
  modifiedIndicator.innerHTML = " ";
  tabElement.appendChild(modifiedIndicator);

  const closeButton = document.createElement("button");
  closeButton.className = "tab-close";
  closeButton.innerHTML = `<svg  xmlns="http://www.w3.org/2000/svg"  width="14"  height="14"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>`;
  closeButton.title = "Close Tab";
  closeButton.onclick = (e) => {
    e.stopPropagation();
    closeTab(tabId);
  };
  tabElement.appendChild(closeButton);

  tabElement.onclick = () => setActiveTab(tabId);
  tabBar.appendChild(tabElement);

  const tabInfo = {
    filePath,
    model,
    previewContainer,
    isPreview,
    previewType,
    isModified: isNew && !isPreview,
    isNew,
    domElement: tabElement,
    name: fileName,
  };
  openTabs.set(tabId, tabInfo);

  if (tabInfo.isModified) setTabModified(tabId, true);
  setActiveTab(tabId);
  toggleIntroMessage();
  console.log(`[renderer] Created tab ${tabId}: ${fileName}`);
  showToast(`Opened ${fileName}`);
  return tabId;
}

function setActiveTab(tabId, setModel = true) {
  if (!editor) {
    console.warn("[renderer] setActiveTab called before editor is ready.");
    return;
  }
  if (!tabId || !openTabs.has(tabId)) {
    if (openTabs.size === 0 && activeTabId !== null) {
      if (setModel) editor.setModel(null);
      const prevTabInfo = activeTabId && openTabs.get(activeTabId);
      if (prevTabInfo?.previewContainer) {
        prevTabInfo.previewContainer.style.display = "none";
      }
      updateWindowTitle();
      activeTabId = null;
      toggleIntroMessage();
    }
    return;
  }

  const tabInfo = openTabs.get(tabId);
  if (activeTabId === tabId) {
    if (setModel && !tabInfo.isPreview && editor.getModel() !== tabInfo.model) {
      editor.setModel(tabInfo.model);
    }
    return;
  }

  if (activeTabId && openTabs.has(activeTabId)) {
    const prevTabInfo = openTabs.get(activeTabId);
    prevTabInfo.domElement.classList.remove("active");
    if (prevTabInfo.previewContainer) {
      prevTabInfo.previewContainer.style.display = "none";
    }
  }

  activeTabId = tabId;
  tabInfo.domElement.classList.add("active");
  if (setModel) {
    if (tabInfo.isPreview) {
      editor.setModel(null);
      tabInfo.previewContainer.style.display = "block";
    } else {
      editor.setModel(tabInfo.model);
      if (tabInfo.previewContainer) {
        tabInfo.previewContainer.style.display = "none";
      }
      editor.focus();
    }
  }
  updateWindowTitle(tabInfo.name, tabInfo.isModified);
  tabInfo.domElement.scrollIntoView({ behavior: "smooth", inline: "center" });
  toggleIntroMessage();
}

function setTabModified(tabId, isModified) {
  if (!openTabs.has(tabId)) return;
  const tabInfo = openTabs.get(tabId);
  if (tabInfo.isModified === isModified || tabInfo.isPreview) return;

  tabInfo.isModified = isModified;
  const indicator = tabInfo.domElement.querySelector(".tab-modified-indicator");
  const closeButton = tabInfo.domElement.querySelector(".tab-close");

  if (isModified) {
    indicator.innerHTML = "●";
    indicator.style.display = "inline-block";
    closeButton.innerHTML = "●";
    tabInfo.domElement.classList.add("modified");
  } else {
    indicator.innerHTML = " ";
    indicator.style.display = "none";
    closeButton.innerHTML = `<svg  xmlns="http://www.w3.org/2000/svg"  width="14"  height="14"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>`;
    tabInfo.domElement.classList.remove("modified");
  }

  if (activeTabId === tabId) updateWindowTitle(tabInfo.name, isModified);
  tabInfo.domElement.title =
    (tabInfo.filePath || "New unsaved file") +
    (isModified ? " (modified)" : "");
}

async function closeTab(tabId) {
  if (!openTabs.has(tabId)) return;
  const tabInfo = openTabs.get(tabId);

  if (tabInfo.isModified && !tabInfo.isPreview) {
    const choice = confirm(`Do you want to save changes to ${tabInfo.name}?`);
    if (choice) {
      const saved = await handleSaveFile(tabId);
      if (!saved) return;
    }
  }

  if (tabInfo.model && !tabInfo.model.isDisposed()) tabInfo.model.dispose();
  if (tabInfo.previewContainer) tabInfo.previewContainer.remove();
  if (tabInfo.domElement) tabInfo.domElement.remove();
  openTabs.delete(tabId);

  if (activeTabId === tabId) {
    const nextTabId =
      openTabs.size > 0 ? Array.from(openTabs.keys()).pop() : null;
    setActiveTab(nextTabId);
  }
  toggleIntroMessage();
}

function updateWindowTitle(fileName = null, isModified = false) {
  const baseTitle = "Arcade IDE";
  document.title = fileName
    ? `${isModified ? "● " : ""}${fileName} - ${baseTitle}`
    : baseTitle;
}

async function handleOpenFile() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  outputArea.textContent = "Opening file dialog...";
  try {
    const result = await window.electronAPI.openFile();
    if (!result.canceled && result.filePath && result.success) {
      openOrFocusTab(result.filePath, result.content);
      outputArea.textContent = `Opened: ${getBaseName(result.filePath)}`;
    } else if (result.error) {
      outputArea.textContent = `Error: ${result.error}`;
    } else {
      outputArea.textContent = "File open canceled.";
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

function openOrFocusTab(
  filePath,
  content,
  isPreview = false,
  previewType = null
) {
  const normalizedPath = filePath.replace(/\\/g, pathSep);
  for (const [id, tabInfo] of openTabs.entries()) {
    if (
      tabInfo.filePath &&
      tabInfo.filePath.replace(/\\/g, pathSep) === normalizedPath
    ) {
      setActiveTab(id);
      return id;
    }
  }
  const fileNameLower = getBaseName(filePath)?.toLowerCase();
  if (fileNameLower?.endsWith(".png")) {
    return createNewTab(filePath, "", true, "image");
  } else if (fileNameLower?.endsWith(".wav")) {
    return createNewTab(filePath, "", true, "audio");
  }
  return createNewTab(filePath, content, isPreview, previewType);
}

async function handleSaveFile(tabIdToSave = activeTabId) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return false;
  }
  if (!tabIdToSave || !openTabs.has(tabIdToSave)) {
    outputArea.textContent = "No active file to save.";
    return false;
  }
  const tabInfo = openTabs.get(tabIdToSave);
  if (tabInfo.isPreview) {
    outputArea.textContent = `Cannot save ${tabInfo.name}: Previews are read-only.`;
    return false;
  }
  const currentCode = tabInfo.model.getValue();

  if (!tabInfo.isModified && !tabInfo.isNew) {
    outputArea.textContent = `No changes to save for ${tabInfo.name}.`;
    showToast(`No changes in ${tabInfo.name}`);
    return true;
  }

  outputArea.textContent = `Saving ${tabInfo.name}...`;
  try {
    const result = await window.electronAPI.saveFile(
      tabInfo.filePath,
      currentCode
    );
    if (!result.canceled && result.filePath && result.success) {
      outputArea.textContent = `Saved: ${getBaseName(result.filePath)}`;
      showToast(`Saved ${getBaseName(result.filePath)}`);
      const needsUpdate = tabInfo.isNew || tabInfo.filePath !== result.filePath;
      tabInfo.filePath = result.filePath;
      tabInfo.name = getBaseName(result.filePath);
      tabInfo.isNew = false;

      if (needsUpdate) {
        const nameSpan = tabInfo.domElement.querySelector(".tab-name");
        if (nameSpan) nameSpan.textContent = tabInfo.name;
        tabInfo.domElement.title = tabInfo.filePath;

        const newUri = monaco.Uri.file(result.filePath);
        let language = "c";
        if (tabInfo.name.toLowerCase() === "makefile") language = "makefile";
        else if (!/\.(c|h)$/i.test(tabInfo.name)) language = "plaintext";

        if (
          tabInfo.model.uri.toString() !== newUri.toString() ||
          tabInfo.model.getLanguageId() !== language
        ) {
          const currentViewState = editor.saveViewState();
          const oldModel = tabInfo.model;
          tabInfo.model = monaco.editor.createModel(
            currentCode,
            language,
            newUri
          );
          if (activeTabId === tabIdToSave) {
            editor.setModel(tabInfo.model);
            editor.restoreViewState(currentViewState);
          }
          if (oldModel && !oldModel.isDisposed()) oldModel.dispose();
        }
      }
      setTabModified(tabIdToSave, false);
      if (activeTabId === tabIdToSave) updateWindowTitle(tabInfo.name, false);
      if (currentFolderPath) await loadAndDisplayFolder(currentFolderPath);
      return true;
    } else if (result.error) {
      outputArea.textContent = `Error: ${result.error}`;
      showToast(`Error saving ${tabInfo.name}`);
      return false;
    } else {
      outputArea.textContent = "Save canceled.";
      return false;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    showToast(`Error saving ${tabInfo.name}`);
    return false;
  }
}

async function handlePlay() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!activeTabId || !openTabs.has(activeTabId)) {
    outputArea.textContent = "No active file to run.";
    return;
  }
  const tabInfo = openTabs.get(activeTabId);
  if (tabInfo.isPreview) {
    outputArea.textContent = `Cannot run ${tabInfo.name}: Previews are not executable.`;
    return;
  }
  outputArea.textContent = `Running ${tabInfo.name}...`;
  try {
    const currentCode = tabInfo.model.getValue();
    const saved = await handleSaveFile(activeTabId);
    if (!saved) {
      outputArea.textContent = `Failed to save ${tabInfo.name} before running.`;
      return;
    }
    const result = await window.electronAPI.runOrBuild(
      tabInfo.filePath,
      currentCode
    );
    outputArea.textContent = result.output;
    if (result.success) {
      showToast(`Ran ${tabInfo.name}`);
    } else {
      showToast(`Failed to run ${tabInfo.name}`);
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    showToast(`Error running ${tabInfo.name}`);
  }
}

async function handleNewFileInFolder(targetFolder = currentFolderPath) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!targetFolder) {
    outputArea.textContent = "No folder open. Please open a folder first.";
    showToast("Open a folder to create files");
    return;
  }
  try {
    const fileName = await showInputDialog({
      title: "New File",
      message: "Enter file name (e.g., newfile.c):",
      defaultInput: "newfile.c",
    });
    if (!fileName) {
      outputArea.textContent = "File creation canceled.";
      return;
    }
    if (!/\.(c|h|makefile|png|wav)$/i.test(fileName)) {
      outputArea.textContent =
        "Invalid file extension. Use .c, .h, .makefile, .png, or .wav.";
      showToast("Invalid file extension");
      return;
    }
    const filePath = await window.electronAPI.pathJoin(targetFolder, fileName);
    console.log(`[renderer] Creating file: ${filePath}`);
    const writeResult = await window.electronAPI.writeFile(filePath, "");
    if (writeResult.success) {
      outputArea.textContent = `Created: ${fileName}`;
      showToast(`Created ${fileName}`);
      await loadAndDisplayFolder(currentFolderPath);
      openOrFocusTab(filePath, "");
    } else {
      outputArea.textContent = `Error: ${writeResult.error}`;
      showToast(`Failed to create ${fileName}`);
    }
  } catch (error) {
    outputArea.textContent = `Error creating file: ${error.message}`;
    showToast(`Failed to create file`);
    console.error(`[renderer] Error creating file: ${error.message}`);
  }
}

async function handleNewFolder(targetFolder = currentFolderPath) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!targetFolder) {
    outputArea.textContent = "No folder open. Please open a folder first.";
    showToast("Open a folder to create folders");
    return;
  }
  try {
    const folderName = await showInputDialog({
      title: "New Folder",
      message: "Enter folder name:",
      defaultInput: "NewFolder",
    });
    if (!folderName) {
      outputArea.textContent = "Folder creation canceled.";
      return;
    }
    const folderPath = await window.electronAPI.pathJoin(
      targetFolder,
      folderName
    );
    console.log(`[renderer] Creating folder: ${folderPath}`);
    const createResult = await window.electronAPI.createFolder(folderPath);
    if (createResult.success) {
      outputArea.textContent = `Created: ${folderName}`;
      showToast(`Created ${folderName}`);
      await loadAndDisplayFolder(currentFolderPath);
    } else {
      outputArea.textContent = `Error: ${createResult.error}`;
      showToast(`Failed to create ${folderName}`);
    }
  } catch (error) {
    outputArea.textContent = `Error creating folder: ${error.message}`;
    showToast(`Failed to create folder`);
    console.error(`[renderer] Error creating folder: ${error.message}`);
  }
}

async function handleOpenFolder() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  outputArea.textContent = "Opening folder dialog...";
  console.log("[renderer] Initiating folder open dialog");
  try {
    const result = await window.electronAPI.openFolder();
    console.log("[renderer] openFolder result:", result);
    if (!result.canceled && result.folderPath && result.success) {
      await window.electronAPI.setSettings("lastOpenFolder", result.folderPath);
      console.log(`[renderer] Set lastOpenFolder to ${result.folderPath}`);
      await loadAndDisplayFolder(result.folderPath);
      outputArea.textContent = `Opened: ${getBaseName(result.folderPath)}`;
      console.log(
        "[renderer] currentFolderPath after open:",
        currentFolderPath
      );
      showToast(`Opened ${getBaseName(result.folderPath)}`);
    } else if (result.error) {
      outputArea.textContent = `Error: ${result.error}`;
      console.error("[renderer] openFolder error:", result.error);
      showToast("Failed to open folder");
    } else {
      outputArea.textContent = "Folder open canceled.";
      console.log("[renderer] Folder open canceled");
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    console.error("[renderer] handleOpenFolder error:", error.message);
    showToast("Failed to open folder");
  }
}

async function loadAndDisplayFolder(folderPath) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  console.log(`[renderer] Loading folder: ${folderPath}`);
  try {
    const result = await window.electronAPI.readDir(folderPath);
    console.log(`[renderer] readDir result for ${folderPath}:`, result);
    if (result.success && result.files) {
      currentFolderPath = folderPath; // Set currentFolderPath before updating UI
      console.log("[renderer] Set currentFolderPath:", currentFolderPath);
      fileTreeElement.innerHTML = "";
      await Promise.all(
        result.files.map((file) => addFileToTree(file, folderPath, 0))
      );
      console.log(
        `[renderer] File tree populated for ${folderPath}, HTML length: ${fileTreeElement.innerHTML.length}`
      );
      newFileInFolderButton.disabled = false;
      newFolderButton.disabled = false;
      closeFolderButton.disabled = false;
      await loadRecentProjects();
    } else {
      outputArea.textContent = `Error: ${result.error || "No files found"}`;
      console.error(
        `[renderer] Error loading folder ${folderPath}: ${
          result.error || "No files found"
        }`
      );
      currentFolderPath = null;
      newFileInFolderButton.disabled = true;
      newFolderButton.disabled = true;
      closeFolderButton.disabled = true;
      fileTreeElement.innerHTML =
        '<li class="placeholder">Open a folder to see files</li>';
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    console.error(`[renderer] Error in loadAndDisplayFolder: ${error.message}`);
    currentFolderPath = null;
    newFileInFolderButton.disabled = true;
    newFolderButton.disabled = true;
    closeFolderButton.disabled = true;
    fileTreeElement.innerHTML =
      '<li class="placeholder">Open a folder to see files</li>';
  }
  console.log("[renderer] currentFolderPath after load:", currentFolderPath);
}

async function toggleFolder(li, folderPath, level) {
  console.log(`[renderer] Toggle clicked for folder: ${folderPath}`);
  const isExpanded = li.classList.contains("expanded");
  li.classList.toggle("expanded");
  const chevron = li.querySelector(".toggle i");
  if (chevron) {
    chevron.className = `icon icon-tabler icons-tabler-outline icon-tabler-chevron-${
      isExpanded ? "right" : "down"
    }`;
  }
  console.log(`[renderer] Folder ${folderPath} expanded: ${!isExpanded}`);
  if (!isExpanded) {
    let ul = li.querySelector("ul");
    if (!ul) {
      console.log(`[renderer] Loading subfolder: ${folderPath}`);
      const subResult = await window.electronAPI.readDir(folderPath);
      console.log(
        `[renderer] readDir subfolder result for ${folderPath}:`,
        subResult
      );
      if (subResult.success && subResult.files) {
        console.log(
          `[renderer] Subfolder ${folderPath} contains ${subResult.files.length} items:`,
          subResult.files.map((f) => `${f.name} (${f.isDir ? "dir" : "file"})`)
        );
        ul = document.createElement("ul");
        ul.style.display = "block";
        li.appendChild(ul);
        await Promise.all(
          subResult.files.map((subFile) =>
            addFileToTree(subFile, folderPath, level + 1)
          )
        );
        // Force DOM reflow
        ul.getBoundingClientRect();
        console.log(
          `[renderer] Subfolder ${folderPath} loaded, <ul> has ${ul.childElementCount} children`
        );
        console.log(
          `[renderer] <ul> content: ${ul.innerHTML.substring(0, 200)}...`
        );
      } else {
        outputArea.textContent = `Error loading folder: ${
          subResult.error || "No files found"
        }`;
        console.error(
          `[renderer] Error loading subfolder ${folderPath}: ${
            subResult.error || "No files found"
          }`
        );
        li.classList.remove("expanded");
        if (chevron) {
          chevron.className =
            "icon icon-tabler icons-tabler-outline icon-tabler-chevron-right";
        }
      }
    } else {
      ul.style.display = "block";
    }
  } else {
    const ul = li.querySelector("ul");
    if (ul) {
      ul.style.display = "none";
    }
  }
}

async function addFileToTree(file, parentPath, level) {
  const li = document.createElement("li");
  li.dataset.path = file.path;
  li.dataset.level = level;
  if (file.isDir) li.className = "folder";
  const indent = level * 20;
  const displayName = file.name;

  const iconSvg = await window.electronAPI.getIconClass(file.name, file.isDir);
  console.log(
    `[renderer] Icon SVG for ${file.name}: ${iconSvg.substring(0, 50)}...`
  );
  let content = `<span class="file-content" style="padding-left: ${indent}px;">`;
  if (file.isDir) {
    content += `<span class="toggle"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 6l6 6l-6 6" /></svg></span>`;
  } else {
    content += `<span class="file-icon-placeholder"></span>`;
  }
  content += `<span class="file-icon">${iconSvg}</span> <span class="file-name">${displayName}</span></span>`;
  li.innerHTML = content;
  console.log(
    `[renderer] Added file to tree: ${file.path}, isDir: ${file.isDir}`
  );

  if (file.isDir) {
    const toggle = li.querySelector(".toggle");
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFolder(li, file.path, level);
    });
  }

  li.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!file.isDir) {
      console.log(`[renderer] File clicked: ${file.path}`);
      const result = await window.electronAPI.readFile(file.path);
      if (result.success) {
        openOrFocusTab(file.path, result.content);
      } else {
        outputArea.textContent = `Error: ${result.error}`;
        console.error(
          `[renderer] Error reading file ${file.path}: ${result.error}`
        );
      }
    }
  });

  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    console.log(`[renderer] Context menu triggered for: ${file.path}`);
    window.electronAPI.showContextMenu(file.path, file.isDir);
  });

  fileTreeElement.appendChild(li);
}

async function promptRename(filePath) {
  const oldName = getBaseName(filePath);
  try {
    const newName = await showInputDialog({
      title: "Rename",
      message: `Rename "${oldName}" to:`,
      defaultInput: oldName,
    });
    if (!newName || newName === oldName) return;
    const parentDir = filePath.substring(0, filePath.lastIndexOf(pathSep));
    const newPath = await window.electronAPI.pathJoin(parentDir, newName);
    const renameResult = await window.electronAPI.renameFile(filePath, newPath);
    if (renameResult.success) {
      outputArea.textContent = `Renamed "${oldName}" to "${newName}"`;
      showToast(`Renamed to ${newName}`);
      for (const [id, tabInfo] of openTabs.entries()) {
        if (tabInfo.filePath === filePath && !tabInfo.isPreview) {
          tabInfo.filePath = newPath;
          tabInfo.name = newName;
          tabInfo.domElement.querySelector(".tab-name").textContent = newName;
          tabInfo.domElement.title = newPath;
          const newUri = monaco.Uri.file(newPath);
          if (tabInfo.model.uri.toString() !== newUri.toString()) {
            const currentCode = tabInfo.model.getValue();
            const currentViewState = editor.saveViewState();
            const oldModel = tabInfo.model;
            let language = "c";
            if (newName.toLowerCase() === "makefile") language = "makefile";
            else if (!/\.(c|h)$/i.test(newName)) language = "plaintext";
            tabInfo.model = monaco.editor.createModel(
              currentCode,
              language,
              newUri
            );
            if (activeTabId === id) {
              editor.setModel(tabInfo.model);
              editor.restoreViewState(currentViewState);
            }
            if (oldModel && !oldModel.isDisposed()) oldModel.dispose();
          }
          if (activeTabId === id)
            updateWindowTitle(newName, tabInfo.isModified);
        }
      }
      if (currentFolderPath) await loadAndDisplayFolder(currentFolderPath);
    } else {
      outputArea.textContent = `Error: ${renameResult.error}`;
      showToast(`Failed to rename ${oldName}`);
    }
  } catch (error) {
    outputArea.textContent = `Error renaming file: ${error.message}`;
    showToast(`Failed to rename ${oldName}`);
    console.error(`[renderer] Error renaming file: ${error.message}`);
  }
}

async function confirmDelete(filePath) {
  const fileName = getBaseName(filePath);
  if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
  try {
    const result = await window.electronAPI.deleteFile(filePath);
    if (result.success) {
      outputArea.textContent = `Deleted: ${fileName}`;
      showToast(`Deleted ${fileName}`);
      for (const [id, tabInfo] of openTabs.entries()) {
        if (tabInfo.filePath === filePath) {
          closeTab(id);
        }
      }
      if (currentFolderPath) await loadAndDisplayFolder(currentFolderPath);
    } else {
      outputArea.textContent = `Error: ${result.error}`;
      showToast(`Failed to delete ${fileName}`);
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    showToast(`Failed to delete ${fileName}`);
    console.error(`[renderer] Error deleting file: ${error.message}`);
  }
}

async function clearRecentProjects() {
  try {
    await window.electronAPI.setSettings("recentFolders", []);
    outputArea.textContent = "Cleared recent projects.";
    showToast("Recent projects cleared");
    await loadRecentProjects();
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    showToast("Failed to clear recent projects");
    console.error(
      `[renderer] Error clearing recent projects: ${error.message}`
    );
  }
}

async function loadRecentProjects() {
  const recentFolders = await window.electronAPI.getSettings(
    "recentFolders",
    []
  );
  recentProjectsList.innerHTML = "";
  if (recentFolders.length === 0) {
    const li = document.createElement("li");
    li.className = "placeholder";
    li.textContent = "No recent projects";
    recentProjectsList.appendChild(li);
  } else {
    recentFolders.forEach((folder) => {
      const li = document.createElement("li");
      li.textContent = getBaseName(folder) || folder;
      li.title = folder;
      li.addEventListener("click", () => loadAndDisplayFolder(folder));
      recentProjectsList.appendChild(li);
    });
  }
}

function toggleSidebar(force = false) {
  const sidebar = document.getElementById("sidebar");
  const isCollapsed = sidebar.classList.contains("collapsed");
  if (force || !isCollapsed) {
    sidebar.classList.add("collapsed");
    toggleSidebarButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="32"  height="32"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-layout-sidebar-left-expand"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4v16" /><path d="M14 10l2 2l-2 2" /></svg>';
    window.electronAPI.setSettings("sidebarCollapsed", true);
  } else {
    sidebar.classList.remove("collapsed");
    toggleSidebarButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="32"  height="32"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-layout-sidebar-left-collapse"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" /></svg>';
    window.electronAPI.setSettings("sidebarCollapsed", false);
  }
}

function toggleRightSidebar(force = false) {
  const sidebarRight = document.getElementById("sidebar-right");
  const isCollapsed = sidebarRight.classList.contains("collapsed");
  if (force || !isCollapsed) {
    sidebarRight.classList.add("collapsed");
    toggleRightSidebarButton.classList.remove("active");
    toggleRightSidebarButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="32"  height="32"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-layout-sidebar-right-expand"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M15 4v16" /><path d="M10 10l-2 2l2 2" /></svg>';
    window.electronAPI.setSettings("rightSidebarCollapsed", true);
    console.log("[renderer] Right sidebar collapsed");
  } else {
    sidebarRight.classList.remove("collapsed");
    toggleRightSidebarButton.classList.add("active");
    toggleRightSidebarButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="32"  height="32"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-layout-sidebar-right-collapse"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M15 4v16" /><path d="M9 10l2 2l-2 2" /></svg>';

    window.electronAPI.setSettings("rightSidebarCollapsed", false);
    console.log("[renderer] Right sidebar expanded");
  }
  sidebarRight.offsetHeight; // Trigger reflow
}

function toggleOutput(force = false) {
  const outputContainer = document.getElementById("output-container");
  const isCollapsed = outputContainer.classList.contains("collapsed");
  if (force || !isCollapsed) {
    outputContainer.classList.add("collapsed");
    editorContainer.style.height = "100%";
    toggleOutputButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="20"  height="20"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-up"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" /></svg>';
    window.electronAPI.setSettings("outputCollapsed", true);
  } else {
    outputContainer.classList.remove("collapsed");
    editorContainer.style.height = "60%";
    toggleOutputButton.innerHTML =
      '<svg  xmlns="http://www.w3.org/2000/svg"  width="20"  height="20"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>';
    window.electronAPI.setSettings("outputCollapsed", false);
  }
}

async function applyTheme(themePath) {
  console.log(`[renderer] Applying theme: ${themePath}`);
  const themeStylesheet = document.getElementById("theme-stylesheet");
  if (!themeStylesheet) {
    console.error(
      "[renderer] Theme stylesheet element (#theme-stylesheet) not found"
    );
    outputArea.textContent = "Error: Theme stylesheet not found.";
    return;
  }

  // Map theme paths to Monaco editor themes
  const themeMap = {
    "style.css": "charcoal-teal",
    "themes/neon-purple.css": "neon-purple",
    "themes/retro-red.css": "retro-red",
    "themes/cyber-green.css": "cyber-green",
    "themes/vs-light.css": "vs",
    "themes/vs-dark.css": "vs-dark",
    "themes/github-dark.css": "github-dark",
  };

  const monacoTheme = themeMap[themePath] || "charcoal-teal";

  if (!themePath.endsWith(".css")) {
    console.error(`[renderer] Invalid theme path: ${themePath}`);
    outputArea.textContent = "Error: Invalid theme path.";
    return;
  }
  if (themeStylesheet.href !== themePath) {
    themeStylesheet.href = themePath;
    console.log(
      `[renderer] Theme stylesheet updated to: ${themeStylesheet.href}`
    );
    themeStylesheet.onerror = () => {
      console.error(`[renderer] Failed to load theme: ${themePath}`);
      outputArea.textContent = `Error: Failed to load theme ${themePath}`;
    };
  }

  await window.electronAPI.setSettings("selectedTheme", themePath);
  console.log(`[renderer] Theme saved: ${themePath}`);

  // Apply Monaco editor theme
  if (editor) {
    monaco.editor.setTheme(monacoTheme);
    console.log(`[renderer] Monaco editor theme set to: ${monacoTheme}`);
  }
}

function toggleIntroMessage() {
  introMessage.style.display = openTabs.size === 0 ? "flex" : "none";
}

function attachUIEventListeners() {
  openFolderButtons.forEach((btn) =>
    btn.addEventListener("click", handleOpenFolder)
  );
  closeFolderButton.addEventListener("click", closeCurrentFolder);
  newFileButton.addEventListener("click", () => createNewTab());
  openFileButton.addEventListener("click", handleOpenFile);
  saveFileButton.addEventListener("click", () => handleSaveFile());
  playButton.addEventListener("click", handlePlay);
  newFileInFolderButton.addEventListener("click", () =>
    handleNewFileInFolder()
  );
  newFolderButton.addEventListener("click", () => handleNewFolder());
  toggleOutputButton.addEventListener("click", () => toggleOutput());
  clearOutputButton.addEventListener(
    "click",
    () => (outputArea.textContent = "")
  );
  toggleSidebarButton.addEventListener("click", () => toggleSidebar());
  if (toggleRightSidebarButton) {
    toggleRightSidebarButton.addEventListener("click", () =>
      toggleRightSidebar()
    );
  }
  settingsButton.addEventListener("click", async () => {
    settingsDialog.style.display = "block";
    // Populate theme selector with valid options
    themeSelector.innerHTML = `
      <option value="style.css">Charcoal Teal</option>
      <option value="themes/neon-purple.css">Neon Purple</option>
      <option value="themes/retro-red.css">Retro Red</option>
      <option value="themes/cyber-green.css">Cyber Green</option>
      <option value="themes/vs-light.css">VS Light</option>
      <option value="themes/vs-dark.css">VS Dark</option>
      <option value="themes/github-dark.css">GitHub Dark</option>
    `;
    const currentTheme = await window.electronAPI.getSettings(
      "selectedTheme",
      "style.css"
    );
    themeSelector.value = currentTheme;
    console.log(
      `[renderer] Settings dialog opened, current theme: ${currentTheme}`
    );
    buildToolPathInput.value =
      (await window.electronAPI.getSettings("buildToolPath", "")) || "";
    autoSaveCheckbox.checked = await window.electronAPI.getSettings(
      "autoSave",
      false
    );
    fontSizeInput.value = await window.electronAPI.getSettings("fontSize", 12);
    fileExtensionsInput.value = (
      (await window.electronAPI.getSettings("fileExtensions", [
        "c",
        "h",
        "png",
        "wav",
        "makefile",
      ])) || []
    ).join(",");
    logLevelSelector.value = await window.electronAPI.getSettings(
      "logLevel",
      "info"
    );
    // Populate API key inputs
    geminiApiKeyInput.value =
      (await window.electronAPI.getSettings("geminiApiKey", "")) || "";
    removeBgApiKeyInput.value =
      (await window.electronAPI.getSettings("removeBgApiKey", "")) || "";
  });
  themeSelector.addEventListener("change", async () => {
    const newTheme = themeSelector.value;
    console.log(`[renderer] Theme selector changed to: ${newTheme}`);
    await applyTheme(newTheme);
    showToast(
      `Applied theme: ${
        newTheme.startsWith("themes/")
          ? newTheme.split("/").pop().replace(".css", "")
          : "Charcoal Teal"
      }`
    );
  });

  buildToolPathInput.addEventListener("change", async () => {
    await window.electronAPI.setSettings(
      "buildToolPath",
      buildToolPathInput.value
    );
    console.log(
      `[renderer] Build tool path updated to: ${buildToolPathInput.value}`
    );
  });

  autoSaveCheckbox.addEventListener("change", async () => {
    await window.electronAPI.setSettings("autoSave", autoSaveCheckbox.checked);
    console.log(`[renderer] Auto-save set to: ${autoSaveCheckbox.checked}`);
  });

  fontSizeInput.addEventListener("change", async () => {
    const fontSize = parseInt(fontSizeInput.value) || 12;
    await window.electronAPI.setSettings("fontSize", fontSize);
    if (editor) {
      editor.updateOptions({ fontSize });
    }
    console.log(`[renderer] Font size updated to: ${fontSize}`);
  });

  fileExtensionsInput.addEventListener("change", async () => {
    const extensions = fileExtensionsInput.value
      .split(",")
      .map((ext) => ext.trim())
      .filter((ext) => ext);
    await window.electronAPI.setSettings("fileExtensions", extensions);
    console.log(
      `[renderer] File extensions updated to: ${extensions.join(", ")}`
    );
  });

  logLevelSelector.addEventListener("change", async () => {
    await window.electronAPI.setSettings("logLevel", logLevelSelector.value);
    console.log(`[renderer] Log level updated to: ${logLevelSelector.value}`);
  });

  // Add event listeners for API key inputs
  geminiApiKeyInput.addEventListener("change", async () => {
    await window.electronAPI.setSettings(
      "geminiApiKey",
      geminiApiKeyInput.value
    );
    console.log(`[renderer] Gemini API key updated`);
  });

  removeBgApiKeyInput.addEventListener("change", async () => {
    await window.electronAPI.setSettings(
      "removeBgApiKey",
      removeBgApiKeyInput.value
    );
    console.log(`[renderer] Remove.bg API key updated`);
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsDialog.style.display = "none";
    console.log("[renderer] Settings dialog closed");
  });

  clearRecentProjectsButton.addEventListener("click", clearRecentProjects);

  if (spriteGenerateForm) {
    spriteGenerateForm.addEventListener("submit", handleGenerateSprite);
  }
}

async function handleGenerateSprite(event) {
  event.preventDefault();
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    showToast("Electron API not available");
    return;
  }

  // Check if file tree indicates an open folder
  if (
    !currentFolderPath &&
    fileTreeElement.children.length > 0 &&
    !fileTreeElement.querySelector(".placeholder")
  ) {
    console.warn(
      "[renderer] currentFolderPath is null but file tree is populated, attempting to recover"
    );
    // Attempt to recover by checking lastOpenFolder
    try {
      const lastFolder = await window.electronAPI.getSettings(
        "lastOpenFolder",
        null
      );
      if (lastFolder) {
        console.log("[renderer] Recovering with lastOpenFolder:", lastFolder);
        await loadAndDisplayFolder(lastFolder);
      }
    } catch (error) {
      console.error("[renderer] Failed to recover folder:", error.message);
    }
  }

  if (!currentFolderPath) {
    outputArea.textContent = "No folder open. Please open a folder first.";
    showToast("Open a folder to generate sprites");
    return;
  }

  const errorMessage = spriteGenerateForm.querySelector(".error-message");
  if (errorMessage) {
    errorMessage.classList.remove("show");
    errorMessage.textContent = "";
  }

  const spriteData = {
    subject: spriteGenerateForm.querySelector("#subject").value.trim(),
    viewAngle: spriteGenerateForm.querySelector("#view-angle").value.trim(),
    gameGenre: spriteGenerateForm.querySelector("#game-genre").value.trim(),
    colorCount: spriteGenerateForm.querySelector("#color-count").value.trim(),
    pixelSize: spriteGenerateForm.querySelector("#pixel-size").value.trim(),
    artAesthetic: spriteGenerateForm
      .querySelector("#art-aesthetic")
      .value.trim(),
    imageName: spriteGenerateForm.querySelector("#image-name").value.trim(),
  };

  // Basic validation
  for (const [key, value] of Object.entries(spriteData)) {
    if (!value) {
      const errorText = `Please fill in the ${key} field.`;
      if (errorMessage) {
        errorMessage.textContent = errorText;
        errorMessage.classList.add("show");
      }
      outputArea.textContent = `Error: Missing ${key}`;
      showToast(`Missing ${key}`);
      return;
    }
  }

  // Validate imageName
  if (!/^[a-zA-Z0-9_-]+$/.test(spriteData.imageName)) {
    const errorText =
      "Image name must contain only letters, numbers, underscores, or hyphens.";
    if (errorMessage) {
      errorMessage.textContent = errorText;
      errorMessage.classList.add("show");
    }
    outputArea.textContent = "Error: Invalid image name";
    showToast("Invalid image name");
    return;
  }

  outputArea.textContent = `Generating sprite: ${spriteData.imageName}.png...`;
  console.log("[renderer] Generating sprite with data:", spriteData);
  try {
    const result = await window.electronAPI.generateSprite(spriteData);
    console.log("[renderer] generateSprite result:", result);
    if (result.success) {
      outputArea.textContent = `Generated: ${getBaseName(result.filePath)}`;
      showToast(`Generated ${getBaseName(result.filePath)}`);
      if (result.warning) {
        console.warn(`[renderer] Sprite generation warning: ${result.warning}`);
        outputArea.textContent += `\nWarning: ${result.warning}`;
      }

      // Refresh file tree and expand assets/sprites folders
      await loadAndDisplayFolder(currentFolderPath);
      const assetsPath = await window.electronAPI.pathJoin(
        currentFolderPath,
        "assets"
      );
      const spritesPath = await window.electronAPI.pathJoin(
        assetsPath,
        "sprites"
      );
      const assetsLi = fileTreeElement.querySelector(
        `li.folder[data-path="${assetsPath}"]`
      );
      if (assetsLi && !assetsLi.classList.contains("expanded")) {
        await toggleFolder(assetsLi, assetsPath, 1);
      }
      const spritesLi = fileTreeElement.querySelector(
        `li.folder[data-path="${spritesPath}"]`
      );
      if (spritesLi && !spritesLi.classList.contains("expanded")) {
        await toggleFolder(spritesLi, spritesPath, 2);
      }

      // Open the sprite as a preview tab
      openOrFocusTab(result.filePath, "", true, "image");
    } else {
      const errorText = result.error || "Failed to generate sprite";
      if (errorMessage) {
        errorMessage.textContent = errorText;
        errorMessage.classList.add("show");
      }
      outputArea.textContent = `Error: ${errorText}`;
      showToast("Failed to generate sprite");
    }
  } catch (error) {
    const errorText = error.message || "Failed to generate sprite";
    if (errorMessage) {
      errorMessage.textContent = errorText;
      errorMessage.classList.add("show");
    }
    outputArea.textContent = `Error: ${errorText}`;
    showToast("Failed to generate sprite");
    console.error(`[renderer] Error generating sprite: ${error.message}`);
  }
}
