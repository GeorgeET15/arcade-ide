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
const newFileButton = document.getElementById("btn-new-file");
const openFileButton = document.getElementById("btn-open-file");
const saveFileButton = document.getElementById("btn-save-file");
const playButton = document.getElementById("btn-play");
const newFileInFolderButton = document.getElementById("btn-new-file-in-folder");
const newFolderButton = document.getElementById("btn-new-folder");
const toggleOutputButton = document.getElementById("btn-toggle-output");
const clearOutputButton = document.getElementById("btn-clear-output");
const toggleSidebarButton = document.getElementById("btn-toggle-sidebar");
const settingsButton = document.getElementById("btn-settings");
const settingsDialog = document.getElementById("settings-dialog");
const themeSelector = document.getElementById("theme-selector");
const closeSettingsButton = document.getElementById("btn-close-settings");
const introMessage = document.getElementById("intro-message");

console.log("Renderer script loaded");

(async () => {
  if (!window.electronAPI) {
    console.error("FATAL: electronAPI is undefined. Check preload.js loading.");
    outputArea.textContent =
      "Error: Electron API not available. Ensure preload.js loads correctly.";
    return;
  }

  console.log("Waiting for Monaco loader...");
  try {
    if (
      typeof require === "undefined" ||
      typeof require.config === "undefined"
    ) {
      throw new Error("Monaco loader not available");
    }
    console.log("Monaco loader ready.");

    require.config({
      paths: {
        vs: "node_modules/monaco-editor/min/vs",
      },
    });

    require(["vs/editor/editor.main"], async function () {
      console.log("Monaco editor.main loaded.");
      try {
        const platformInfo = await window.electronAPI.getPlatform();
        pathSep = platformInfo.pathSep;
        console.log(
          `Running on ${platformInfo.platform}, path separator: ${pathSep}`
        );

        if (!editorContainer) {
          console.error("Editor container not found!");
          outputArea.textContent = "Error: Editor container not found.";
          return;
        }

        try {
          editor = monaco.editor.create(editorContainer, {
            model: null,
            language: "c",
            theme: "vs-dark",
            automaticLayout: true,
            contextmenu: true,
            minimap: { enabled: true },
          });
          console.log("Monaco Editor initialized.");
        } catch (monacoError) {
          console.error("Failed to initialize Monaco Editor:", monacoError);
          outputArea.textContent = "Error: Failed to initialize editor.";
          return;
        }

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
        console.log(`Restoring theme: ${selectedTheme}`);
        await applyTheme(selectedTheme);

        toggleIntroMessage();

        editor.onDidChangeModelContent(() => {
          if (activeTabId && openTabs.has(activeTabId)) {
            const tabInfo = openTabs.get(activeTabId);
            if (!tabInfo.isModified && !tabInfo.isPreview) {
              setTabModified(activeTabId, true);
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
      } catch (error) {
        console.error("Initialization error:", error);
        outputArea.textContent = `Error: ${error.message}`;
      }

      attachUIEventListeners();
    }, (err) => {
      console.error("Failed to load Monaco Editor:", err);
      outputArea.textContent = "Error: Failed to load Monaco Editor.";
    });
  } catch (error) {
    console.error("Monaco loader error:", error);
    outputArea.textContent = `Error loading Monaco: ${error.message}`;
  }
})();

// Rest of the functions
function getBaseName(filePath) {
  if (!filePath) return null;
  return filePath.substring(filePath.lastIndexOf(pathSep) + 1);
}

function createNewTab(
  filePath = null,
  content = "",
  isPreview = false,
  previewType = null
) {
  if (!monaco || !monaco.editor) {
    console.error("Cannot create tab: Monaco editor not available.");
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
    console.log(`Creating model for ${fileName} with language ${language}`);
    model = monaco.editor.createModel(content, language, fileUri);
  } else {
    previewContainer = document.createElement("div");
    previewContainer.className = "preview-container";
    previewContainer.style.display = "none";
    if (previewType === "image") {
      const img = document.createElement("img");
      img.className = "preview-image";
      img.src = `file://${filePath}`;
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
  closeButton.innerHTML = "×";
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
  console.log(`Created tab ${tabId}: ${fileName}`);
  return tabId;
}

function setActiveTab(tabId, setModel = true) {
  if (!editor) {
    console.warn("setActiveTab called before editor is ready.");
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
    closeButton.innerHTML = "×";
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
    if (!result.canceled && result.filePath) {
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
    return true;
  }

  outputArea.textContent = `Saving ${tabInfo.name}...`;
  try {
    const result = await window.electronAPI.saveFile(
      tabInfo.filePath,
      currentCode
    );
    if (!result.canceled && result.filePath) {
      outputArea.textContent = `Saved: ${getBaseName(result.filePath)}`;
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
      return false;
    } else {
      outputArea.textContent = "Save canceled.";
      return false;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    return false;
  }
}

async function handlePlay() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!activeTabId || !openTabs.has(activeTabId)) {
    outputArea.textContent = "No active file to build/play.";
    return;
  }
  const tabInfo = openTabs.get(activeTabId);
  if (tabInfo.isPreview) {
    outputArea.textContent = `Cannot build/play ${tabInfo.name}: Previews are not executable.`;
    return;
  }
  if (tabInfo.isModified || tabInfo.isNew) {
    const saved = await handleSaveFile(activeTabId);
    if (!saved) {
      outputArea.textContent = "Cannot build/play: Save failed or canceled.";
      return;
    }
  }

  const currentCode = tabInfo.model.getValue();
  outputArea.textContent = `Building and playing ${tabInfo.name}...`;
  try {
    const result = await window.electronAPI.runOrBuild(
      tabInfo.filePath,
      currentCode
    );
    outputArea.textContent = `--- Output for ${tabInfo.name} ---\n\n${result.output}`;
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

async function handleOpenFolder() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  try {
    const result = await window.electronAPI.openFolder();
    if (!result.canceled && result.folderPath) {
      await Promise.all(
        Array.from(openTabs.keys()).map((tabId) => closeTab(tabId))
      );
      await loadAndDisplayFolder(result.folderPath);
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

async function handleNewProject() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  const result = await window.electronAPI.openFolder();
  if (result.canceled || !result.folderPath) {
    outputArea.textContent = "Project creation canceled.";
    return;
  }
  const folderPath = result.folderPath;

  outputArea.textContent = `Creating new Arcade project in ${folderPath}...`;
  try {
    const projectResult = await window.electronAPI.newArcadeProject(folderPath);
    if (projectResult.success) {
      await Promise.all(
        Array.from(openTabs.keys()).map((tabId) => closeTab(tabId))
      );
      await loadAndDisplayFolder(projectResult.folderPath);
      outputArea.textContent = `Created Arcade project in ${projectResult.folderPath}`;
    } else {
      outputArea.textContent = `Error: ${projectResult.error}`;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

async function handleNewFileInFolder() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!currentFolderPath) {
    outputArea.textContent = "No folder open. Please open a folder first.";
    return;
  }
  const fileName = prompt("Enter file name (e.g., game.c):");
  if (!fileName) {
    outputArea.textContent = "File creation canceled.";
    return;
  }
  try {
    const filePath = await window.electronAPI.pathJoin(
      currentFolderPath,
      fileName
    );
    const result = await window.electronAPI.writeFile(filePath, "");
    if (result.success) {
      await loadAndDisplayFolder(currentFolderPath);
      openOrFocusTab(filePath, "");
      outputArea.textContent = `Created and opened ${fileName}`;
    } else {
      outputArea.textContent = `Error: ${result.error}`;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

async function handleNewFolder() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  if (!currentFolderPath) {
    outputArea.textContent = "No folder open. Please open a folder first.";
    return;
  }
  const folderName = prompt("Enter folder name:");
  if (!folderName) {
    outputArea.textContent = "Folder creation canceled.";
    return;
  }
  try {
    const folderPath = await window.electronAPI.pathJoin(
      currentFolderPath,
      folderName
    );
    const result = await window.electronAPI.createFolder(folderPath);
    if (result.success) {
      await loadAndDisplayFolder(currentFolderPath);
      outputArea.textContent = `Created folder ${folderName}`;
    } else {
      outputArea.textContent = `Error: ${result.error}`;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

function toggleOutput(forceCollapsed = null) {
  const outputContainer = document.getElementById("output-container");
  const toggleButton = document.getElementById("btn-toggle-output");
  const isCollapsed =
    forceCollapsed !== null
      ? forceCollapsed
      : outputContainer.classList.contains("collapsed");

  if (isCollapsed) {
    outputContainer.classList.remove("collapsed");
    toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    toggleButton.title = "Collapse Output";
  } else {
    outputContainer.classList.add("collapsed");
    toggleButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
    toggleButton.title = "Expand Output";
  }

  window.electronAPI.setSettings("outputCollapsed", !isCollapsed);
}

function clearOutput() {
  outputArea.textContent = "";
}

function toggleSidebar(forceCollapsed = null) {
  const sidebar = document.getElementById("sidebar");
  const toggleButton = document.getElementById("btn-toggle-sidebar");
  const isCollapsed =
    forceCollapsed !== null
      ? forceCollapsed
      : sidebar.classList.contains("collapsed");

  if (isCollapsed) {
    sidebar.classList.remove("collapsed");
    toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    toggleButton.title = "Collapse Sidebar";
  } else {
    sidebar.classList.add("collapsed");
    toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    toggleButton.title = "Expand Sidebar";
  }

  window.electronAPI.setSettings("sidebarCollapsed", !isCollapsed);
}

async function applyTheme(themeFile) {
  console.log(`Applying theme: ${themeFile}`);
  const themeStylesheet = document.getElementById("theme-stylesheet");
  if (!themeStylesheet) {
    console.error("Theme stylesheet element not found!");
    return;
  }
  try {
    themeStylesheet.href = themeFile;
    await window.electronAPI.setSettings("selectedTheme", themeFile);
    if (themeSelector) {
      themeSelector.value = themeFile;
    }

    let monacoTheme = "vs-dark";
    if (themeFile === "themes/vs-light.css") {
      monacoTheme = "vs";
    }
    monaco.editor.setTheme(monacoTheme);
    console.log(`Monaco Editor theme set to: ${monacoTheme}`);
  } catch (error) {
    console.error(`Error applying theme ${themeFile}: ${error.message}`);
  }
}

function toggleSettingsDialog() {
  console.log("Settings button clicked, toggling dialog");
  if (!settingsDialog) {
    console.error("Settings dialog element not found!");
    return;
  }
  if (settingsDialog.style.display === "none") {
    settingsDialog.style.display = "block";
    console.log("Dialog opened");
  } else {
    settingsDialog.style.display = "none";
    console.log("Dialog closed");
  }
}

function toggleIntroMessage() {
  if (!introMessage) {
    console.error("Intro message element not found!");
    return;
  }
  if (openTabs.size === 0) {
    introMessage.style.display = "flex";
    editorContainer.style.overflow = "hidden";
    if (activeTabId && openTabs.has(activeTabId)) {
      const tabInfo = openTabs.get(activeTabId);
      if (tabInfo.previewContainer) {
        tabInfo.previewContainer.style.display = "none";
      }
    }
    console.log("Intro message shown");
  } else {
    introMessage.style.display = "none";
    editorContainer.style.overflow = "hidden";
    console.log("Intro message hidden");
  }
}

async function loadAndDisplayFolder(
  folderPath,
  parentElement = fileTreeElement,
  depth = 0
) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  currentFolderPath = folderPath;
  parentElement.innerHTML = "<li><i>Loading...</i></li>";
  try {
    const result = await window.electronAPI.readDir(folderPath);
    parentElement.innerHTML = "";

    if (result.success) {
      if (result.files.length === 0) {
        parentElement.innerHTML =
          '<li class="placeholder">No relevant files found.</li>';
      } else {
        result.files.sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });

        for (const file of result.files) {
          const li = document.createElement("li");
          li.dataset.filePath = file.path;
          li.classList.add(file.isDir ? "folder" : "is-file");
          li.style.paddingLeft = `${depth * 8 + 10}px`;

          if (file.isDir) {
            const folderHeader = document.createElement("div");
            folderHeader.className = "folder-header";

            const toggleSpan = document.createElement("span");
            toggleSpan.className = "toggle-icon";
            toggleSpan.innerHTML = '<i class="fas fa-chevron-right"></i>';
            folderHeader.appendChild(toggleSpan);

            const iconSpan = document.createElement("span");
            const iconClass = window.electronAPI.getIconClass(file.name, true);
            iconSpan.className = `file-icon ${iconClass}`;
            console.log(`Applying icon class for ${file.name}: ${iconClass}`);
            folderHeader.appendChild(iconSpan);

            const nameSpan = document.createElement("span");
            nameSpan.className = "file-name";
            nameSpan.textContent = file.name;
            folderHeader.appendChild(nameSpan);

            li.appendChild(folderHeader);

            const ul = document.createElement("ul");
            ul.style.display = "none";
            li.appendChild(ul);

            folderHeader.onclick = async (e) => {
              e.stopPropagation();
              const wasExpanded = ul.style.display !== "none";
              document
                .querySelectorAll("#file-tree li")
                .forEach((el) => el.classList.remove("selected"));
              li.classList.add("selected");

              if (!wasExpanded) {
                toggleSpan.innerHTML =
                  '<i class="fas fa-chevron-down expanded"></i>';
                ul.style.display = "block";
                if (ul.children.length === 0) {
                  await loadAndDisplayFolder(file.path, ul, depth + 1);
                }
              } else {
                toggleSpan.innerHTML = '<i class="fas fa-chevron-right"></i>';
                ul.style.display = "none";
              }
            };
          } else {
            const toggleSpan = document.createElement("span");
            toggleSpan.className = "toggle-icon";
            toggleSpan.innerHTML = " ";
            li.appendChild(toggleSpan);

            const iconSpan = document.createElement("span");
            const iconClass = window.electronAPI.getIconClass(file.name, false);
            iconSpan.className = `file-icon ${iconClass}`;
            console.log(`Applying icon class for ${file.name}: ${iconClass}`);
            li.appendChild(iconSpan);

            const nameSpan = document.createElement("span");
            nameSpan.className = "file-name";
            nameSpan.textContent = file.name;
            li.appendChild(nameSpan);

            li.onclick = async (e) => {
              e.stopPropagation();
              const filePathToOpen = li.dataset.filePath;
              const normalizedPath = filePathToOpen.replace(/\\/g, pathSep);
              document
                .querySelectorAll("#file-tree li")
                .forEach((el) => el.classList.remove("selected"));
              li.classList.add("selected");

              let existingTabId = null;
              for (const [id, tabInfo] of openTabs.entries()) {
                if (
                  tabInfo.filePath &&
                  tabInfo.filePath.replace(/\\/g, pathSep) === normalizedPath
                ) {
                  existingTabId = id;
                  break;
                }
              }

              if (existingTabId) {
                setActiveTab(existingTabId);
              } else {
                outputArea.textContent = `Opening ${file.name}...`;
                if (
                  file.name.toLowerCase().endsWith(".png") ||
                  file.name.toLowerCase().endsWith(".wav")
                ) {
                  const previewType = file.name.toLowerCase().endsWith(".png")
                    ? "image"
                    : "audio";
                  openOrFocusTab(filePathToOpen, "", true, previewType);
                  outputArea.textContent = `Previewing ${file.name}`;
                } else {
                  try {
                    const readResult = await window.electronAPI.readFile(
                      filePathToOpen
                    );
                    if (readResult.success) {
                      openOrFocusTab(filePathToOpen, readResult.content);
                      outputArea.textContent = `Opened ${file.name}`;
                    } else {
                      outputArea.textContent = `Error: ${readResult.error}`;
                    }
                  } catch (readError) {
                    outputArea.textContent = `Error: ${readError.message}`;
                  }
                }
              }
            };
          }
          parentElement.appendChild(li);
        }
      }
    } else {
      outputArea.textContent = `Error: ${result.error}`;
      parentElement.innerHTML =
        '<li class="placeholder error">Error loading folder</li>';
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    parentElement.innerHTML =
      '<li class="placeholder error">Error loading folder</li>';
  }
}

function attachUIEventListeners() {
  console.log("Attaching UI event listeners...");
  if (newFileButton)
    newFileButton.addEventListener("click", () => createNewTab());
  if (openFileButton) openFileButton.addEventListener("click", handleOpenFile);
  if (saveFileButton)
    saveFileButton.addEventListener("click", () => handleSaveFile());
  if (playButton) playButton.addEventListener("click", handlePlay);
  if (openFolderButtons) {
    openFolderButtons.forEach((button) =>
      button.addEventListener("click", handleOpenFolder)
    );
  }
  if (newFileInFolderButton)
    newFileInFolderButton.addEventListener("click", handleNewFileInFolder);
  if (newFolderButton)
    newFolderButton.addEventListener("click", handleNewFolder);
  if (toggleOutputButton)
    toggleOutputButton.addEventListener("click", () => toggleOutput());
  if (clearOutputButton)
    clearOutputButton.addEventListener("click", clearOutput);
  if (toggleSidebarButton)
    toggleSidebarButton.addEventListener("click", () => toggleSidebar());
  if (settingsButton) {
    console.log("Attaching listener to settings button");
    settingsButton.addEventListener("click", () => {
      console.log("Settings button clicked");
      toggleSettingsDialog();
    });
  }
  if (themeSelector) {
    console.log("Attaching listener to theme selector");
    themeSelector.addEventListener("change", () => {
      console.log("Theme selector changed to:", themeSelector.value);
      applyTheme(themeSelector.value);
    });
  }
  if (closeSettingsButton) {
    console.log("Attaching listener to close settings button");
    closeSettingsButton.addEventListener("click", () => {
      console.log("Close settings button clicked");
      toggleSettingsDialog();
    });
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSaveFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      handlePlay();
    }
  });

  newFileInFolderButton.disabled = !currentFolderPath;
  newFolderButton.disabled = !currentFolderPath;
}
