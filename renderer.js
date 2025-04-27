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
const buildToolPathInput = document.getElementById("build-tool-path");
const autoSaveCheckbox = document.getElementById("auto-save");
const fontSizeInput = document.getElementById("font-size");
const fileExtensionsInput = document.getElementById("file-extensions");
const logLevelSelector = document.getElementById("log-level");
const recentProjectsList = document.getElementById("recent-projects-list");
const clearRecentProjectsButton = document.getElementById(
  "btn-clear-recent-projects"
);

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

        // Define custom Monaco themes
        monaco.editor.defineTheme("charcoal-teal", {
          base: "vs-dark",
          inherit: true,
          rules: [{ background: "1f2a30" }],
          colors: {
            "editor.background": "#1f2a30",
            "editor.foreground": "#e8f1f2",
            "editorLineNumber.foreground": "#a0a4b1",
            "editorCursor.foreground": "#00ffd1",
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
            "editorCursor.foreground": "#ff00ff",
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
            "editorCursor.foreground": "#ff3333",
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
            "editorCursor.foreground": "#00ff00",
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
            "editorCursor.foreground": "#79b8ff",
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
          console.log("Monaco Editor initialized.");
        } catch (monacoError) {
          console.error("Failed to initialize Monaco Editor: " + monacoError);
          outputArea.textContent = "Error: Failed to initialize editor.";
          return;
        }

        monaco.languages.registerCompletionItemProvider("c", {
          triggerCharacters: ["("],
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            return {
              suggestions: [
                {
                  label: "arcade_init",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_init(${1:800}, ${2:600}, ${3:"My Game"}, ${4:0x000000})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Initialize the Arcade window.\nParameters:\n- window_width: int (e.g., 800)\n- window_height: int (e.g., 600)\n- window_title: const char*\n- bg_color: uint32_t (0xRRGGBB)\nReturns: int (0 on success, non-zero on failure)",
                  range: range,
                },
                {
                  label: "arcade_running",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_running()$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check if the Arcade window is running.\nReturns: int (1 if running, 0 if stopped)",
                  range: range,
                },
                {
                  label: "arcade_update",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_update()$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Update the Arcade game state (processes events).\nReturns: int (1 to continue, 0 to stop)",
                  range: range,
                },
                {
                  label: "arcade_quit",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_quit()$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Close the Arcade window and free resources.",
                  range: range,
                },
                {
                  label: "arcade_set_running",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_set_running(${1|1,0|})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Set the running state of the game.\nParameters:\n- value: int (1 = running, 0 = stopped)",
                  range: range,
                },
                {
                  label: "arcade_sleep",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_sleep(${1:16})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Pause execution for specified milliseconds to control frame rate.\nParameters:\n- milliseconds: unsigned int (e.g., 16 for ~60 FPS)",
                  range: range,
                },
                {
                  label: "arcade_key_pressed",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_key_pressed(${1|a_up,a_down,a_left,a_right,a_w,a_a,a_s,a_d,a_r,a_p,a_space,a_esc|})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check if a specific key is currently pressed.\nParameters:\n- key_val: unsigned int (e.g., a_space)\nReturns: int (2 if pressed, 0 if not)",
                  range: range,
                },
                {
                  label: "arcade_key_pressed_once",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_key_pressed_once(${1|a_up,a_down,a_left,a_right,a_w,a_a,a_s,a_d,a_r,a_p,a_space,a_esc|})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check if a key was pressed in the current frame.\nParameters:\n- key_val: unsigned int (e.g., a_space)\nReturns: int (2 if pressed this frame, 0 otherwise)",
                  range: range,
                },
                {
                  label: "arcade_clear_keys",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_clear_keys()$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Reset all key states to unpressed.",
                  range: range,
                },
                {
                  label: "arcade_move_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_move_sprite(&${1:sprite}, ${2:0.1f}, ${3:600})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Update position of a color-based sprite with gravity and boundary checks.\nParameters:\n- sprite: ArcadeSprite*\n- gravity: float (e.g., 0.1f)\n- window_height: int",
                  range: range,
                },
                {
                  label: "arcade_move_image_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_move_image_sprite(&${1:sprite}, ${2:0.1f}, ${3:600})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Update position of an image-based sprite with gravity and boundary checks.\nParameters:\n- sprite: ArcadeImageSprite*\n- gravity: float\n- window_height: int",
                  range: range,
                },
                {
                  label: "arcade_check_collision",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_check_collision(&${1:a}, &${2:b})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check for collision between two color-based sprites using AABB.\nParameters:\n- a: ArcadeSprite*\n- b: ArcadeSprite*\nReturns: int (1 if collision, 0 otherwise)",
                  range: range,
                },
                {
                  label: "arcade_check_image_collision",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_check_image_collision(&${1:a}, &${2:b})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check for collision between two image-based sprites using AABB.\nParameters:\n- a: ArcadeImageSprite*\n- b: ArcadeImageSprite*\nReturns: int (1 if collision, 0 otherwise)",
                  range: range,
                },
                {
                  label: "arcade_create_image_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_create_image_sprite(${1:100.0f}, ${2:100.0f}, ${3:50.0f}, ${4:50.0f}, ${5:"sprite.png"})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Create an image-based sprite from a file.\nParameters:\n- x: float\n- y: float\n- w: float\n- h: float\n- filename: const char*\nReturns: ArcadeImageSprite",
                  range: range,
                },
                {
                  label: "arcade_free_image_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_free_image_sprite(&${1:sprite})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Free the pixel data of an image-based sprite.\nParameters:\n- sprite: ArcadeImageSprite*",
                  range: range,
                },
                {
                  label: "arcade_create_animated_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_create_animated_sprite(${1:100.0f}, ${2:100.0f}, ${3:50.0f}, ${4:50.0f}, ${5:filenames}, ${6:3}, ${7:5})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Create an animated sprite with multiple frames.\nParameters:\n- x: float\n- y: float\n- w: float\n- h: float\n- filenames: const char**\n- frame_count: int\n- frame_interval: int\nReturns: ArcadeAnimatedSprite",
                  range: range,
                },
                {
                  label: "arcade_free_animated_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_free_animated_sprite(&${1:anim})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Free all frames of an animated sprite.\nParameters:\n- anim: ArcadeAnimatedSprite*",
                  range: range,
                },
                {
                  label: "arcade_move_animated_sprite",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_move_animated_sprite(&${1:anim}, ${2:0.1f}, ${3:600})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Update position and animation of an animated sprite.\nParameters:\n- anim: ArcadeAnimatedSprite*\n- gravity: float\n- window_height: int",
                  range: range,
                },
                {
                  label: "arcade_check_animated_collision",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_check_animated_collision(&${1:anim}, &${2:other})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Check for collision between an animated sprite and an image-based sprite.\nParameters:\n- anim: ArcadeAnimatedSprite*\n- other: ArcadeImageSprite*\nReturns: int (1 if collision, 0 otherwise)",
                  range: range,
                },
                {
                  label: "arcade_render_scene",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_render_scene(${1:sprites}, ${2:count}, ${3:types})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Render a scene with multiple sprites.\nParameters:\n- sprites: ArcadeAnySprite*\n- count: int\n- types: int* (SPRITE_COLOR or SPRITE_IMAGE)",
                  range: range,
                },
                {
                  label: "arcade_render_text",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_render_text(${1:"Score: 10"}, ${2:10.0f}, ${3:10.0f}, ${4:0xFFFFFF})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Render text at a specified position.\nParameters:\n- text: const char*\n- x: float\n- y: float\n- color: unsigned int (0xRRGGBB)",
                  range: range,
                },
                {
                  label: "arcade_render_text_centered",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_render_text_centered(${1:"Game Over"}, ${2:300.0f}, ${3:0xFF0000})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Render text centered horizontally.\nParameters:\n- text: const char*\n- y: float\n- color: unsigned int (0xRRGGBB)",
                  range: range,
                },
                {
                  label: "arcade_render_text_centered_blink",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_render_text_centered_blink(${1:"Press Space"}, ${2:300.0f}, ${3:0xFFFFFF}, ${4:30})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Render centered text that blinks.\nParameters:\n- text: const char*\n- y: float\n- color: unsigned int (0xRRGGBB)\n- blink_interval: int",
                  range: range,
                },
                {
                  label: "arcade_init_group",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_init_group(&${1:group}, ${2:10})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Initialize a sprite group with a specified capacity.\nParameters:\n- group: SpriteGroup*\n- capacity: int",
                  range: range,
                },
                {
                  label: "arcade_add_sprite_to_group",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_add_sprite_to_group(&${1:group}, (ArcadeAnySprite){.${2|sprite,image_sprite|} = ${3:sprite}}, ${4|SPRITE_COLOR,SPRITE_IMAGE|})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Add a sprite to a sprite group.\nParameters:\n- group: SpriteGroup*\n- sprite: ArcadeAnySprite\n- type: int (SPRITE_COLOR or SPRITE_IMAGE)",
                  range: range,
                },
                {
                  label: "arcade_add_animated_to_group",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    "arcade_add_animated_to_group(&${1:group}, &${2:anim})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Add an animated sprite’s current frame to a group.\nParameters:\n- group: SpriteGroup*\n- anim: ArcadeAnimatedSprite*",
                  range: range,
                },
                {
                  label: "arcade_render_group",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_render_group(&${1:group})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Render all sprites in a sprite group.\nParameters:\n- group: SpriteGroup*",
                  range: range,
                },
                {
                  label: "arcade_free_group",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: "arcade_free_group(&${1:group})$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Free the memory allocated for a sprite group.\nParameters:\n- group: SpriteGroup*",
                  range: range,
                },
                {
                  label: "arcade_play_sound",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: 'arcade_play_sound(${1:"audio/sfx.wav"})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Play a WAV audio file asynchronously.\nParameters:\n- audio_file_path: const char*\nReturns: int (0 on success, non-zero on failure)",
                  range: range,
                },
                {
                  label: "arcade_flip_image",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_flip_image(${1:"sprite.png"}, ${2|0,1|})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Flip an image vertically (1) or horizontally (0).\nParameters:\n- input_path: const char*\n- flip_type: int\nReturns: char* (path to flipped image, or NULL)",
                  range: range,
                },
                {
                  label: "arcade_rotate_image",
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText:
                    'arcade_rotate_image(${1:"sprite.png"}, ${2|0,90,180,270|})$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Rotate an image by 0, 90, 180, or 270 degrees.\nParameters:\n- input_path: const char*\n- degrees: int\nReturns: char* (path to rotated image, or NULL)",
                  range: range,
                },
                {
                  label: "ArcadeSprite",
                  kind: monaco.languages.CompletionItemKind.Struct,
                  insertText:
                    "ArcadeSprite ${1:sprite} = {${2:100.0f}, ${3:100.0f}, ${4:50.0f}, ${5:50.0f}, ${6:0.0f}, ${7:0.0f}, ${8:0xFF0000}, ${9:1}};$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Color-based sprite.\nFields:\n- x: float\n- y: float\n- width: float\n- height: float\n- vy: float\n- vx: float\n- color: unsigned int (0xRRGGBB)\n- active: int",
                  range: range,
                },
                {
                  label: "ArcadeImageSprite",
                  kind: monaco.languages.CompletionItemKind.Struct,
                  insertText:
                    'ArcadeImageSprite ${1:sprite} = arcade_create_image_sprite(${2:100.0f}, ${3:100.0f}, ${4:50.0f}, ${5:50.0f}, ${6:"sprite.png"});$0',
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Image-based sprite.\nFields:\n- x: float\n- y: float\n- width: float\n- height: float\n- vy: float\n- vx: float\n- pixels: uint32_t*\n- image_width: int\n- image_height: int\n- active: int",
                  range: range,
                },
                {
                  label: "ArcadeAnimatedSprite",
                  kind: monaco.languages.CompletionItemKind.Struct,
                  insertText:
                    "ArcadeAnimatedSprite ${1:anim} = arcade_create_animated_sprite(${2:100.0f}, ${3:100.0f}, ${4:50.0f}, ${5:50.0f}, ${6:filenames}, ${7:3}, ${8:5});$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Animated sprite with multiple frames.\nFields:\n- frames: ArcadeImageSprite*\n- frame_count: int\n- current_frame: int\n- frame_interval: int\n- frame_counter: int",
                  range: range,
                },
                {
                  label: "ArcadeAnySprite",
                  kind: monaco.languages.CompletionItemKind.Struct,
                  insertText:
                    "ArcadeAnySprite ${1:sprite} = {.$2|sprite,image_sprite| = ${3:src_sprite}};$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Union for color or image-based sprites.\nFields:\n- sprite: ArcadeSprite\n- image_sprite: ArcadeImageSprite",
                  range: range,
                },
                {
                  label: "SpriteGroup",
                  kind: monaco.languages.CompletionItemKind.Struct,
                  insertText:
                    "SpriteGroup ${1:group};\narcade_init_group(&${1:group}, ${2:10});$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation:
                    "Manages a collection of sprites.\nFields:\n- sprites: ArcadeAnySprite*\n- types: int*\n- count: int\n- capacity: int",
                  range: range,
                },
                {
                  label: "SPRITE_COLOR",
                  kind: monaco.languages.CompletionItemKind.EnumMember,
                  insertText: "SPRITE_COLOR$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Enum value for color-based sprite (0).",
                  range: range,
                },
                {
                  label: "SPRITE_IMAGE",
                  kind: monaco.languages.CompletionItemKind.EnumMember,
                  insertText: "SPRITE_IMAGE$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Enum value for image-based sprite (1).",
                  range: range,
                },
                {
                  label: "a_up",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_up$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for up arrow (0xff52).",
                  range: range,
                },
                {
                  label: "a_down",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_down$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for down arrow (0xff54).",
                  range: range,
                },
                {
                  label: "a_left",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_left$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for left arrow (0xff51).",
                  range: range,
                },
                {
                  label: "a_right",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_right$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for right arrow (0xff53).",
                  range: range,
                },
                {
                  label: "a_w",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_w$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for W key (0x0077).",
                  range: range,
                },
                {
                  label: "a_a",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_a$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for A key (0x0061).",
                  range: range,
                },
                {
                  label: "a_s",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_s$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for S key (0x0073).",
                  range: range,
                },
                {
                  label: "a_d",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_d$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for D key (0x0064).",
                  range: range,
                },
                {
                  label: "a_r",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_r$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for R key (0x0072).",
                  range: range,
                },
                {
                  label: "a_p",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_p$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for P key (0x0070).",
                  range: range,
                },
                {
                  label: "a_space",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_space$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for spacebar (0x0020).",
                  range: range,
                },
                {
                  label: "a_esc",
                  kind: monaco.languages.CompletionItemKind.Constant,
                  insertText: "a_esc$0",
                  insertTextRules:
                    monaco.languages.CompletionItemInsertTextRule
                      .InsertAsSnippet,
                  documentation: "Key code for escape key (0xff1b).",
                  range: range,
                },
              ],
            };
          },
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
        console.log(`Restoring theme: ${selectedTheme}`);
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
              `Received context menu action: ${action} for ${filePath}`
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
                console.warn(`Unknown context menu action: ${action}`);
            }
          });
          console.log("Context menu action listener registered");
        } else {
          console.error(
            "window.electronAPI.onContextMenuAction is not a function"
          );
          outputArea.textContent =
            "Error: Context menu actions not supported. Check preload.js.";
        }

        attachUIEventListeners();
      } catch (error) {
        console.error("Initialization error: " + error);
        outputArea.textContent = `Error: ${error.message}`;
      }
    }, (err) => {
      console.error("Failed to load Monaco Editor: " + err);
      outputArea.textContent = "Error: Failed to load Monaco Editor.";
    });
  } catch (error) {
    console.error("Monaco loader error: " + error);
    outputArea.textContent = `Error loading Monaco: ${error.message}`;
  }
})();

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
  showToast(`Opened ${fileName}`);
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
    console.log(`Creating file: ${filePath}`);
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
    console.error(`Error creating file: ${error.message}`);
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
    console.log(`Creating folder: ${folderPath}`);
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
    console.error(`Error creating folder: ${error.message}`);
  }
}

async function handleOpenFolder() {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  outputArea.textContent = "Opening folder dialog...";
  try {
    const result = await window.electronAPI.openFolder();
    if (!result.canceled && result.folderPath && result.success) {
      await loadAndDisplayFolder(result.folderPath);
      outputArea.textContent = `Opened: ${getBaseName(result.folderPath)}`;
    } else if (result.error) {
      outputArea.textContent = `Error: ${result.error}`;
    } else {
      outputArea.textContent = "Folder open canceled.";
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
  }
}

async function loadAndDisplayFolder(folderPath) {
  if (!window.electronAPI) {
    outputArea.textContent = "Error: Electron API not available.";
    return;
  }
  currentFolderPath = folderPath;
  newFileInFolderButton.disabled = !currentFolderPath;
  newFolderButton.disabled = !currentFolderPath;
  console.log(`Loading folder: ${folderPath}`);
  try {
    const result = await window.electronAPI.readDir(folderPath);
    console.log(`readDir result for ${folderPath}:`, result);
    if (result.success && result.files) {
      fileTreeElement.innerHTML = "";
      await Promise.all(
        result.files.map((file) => addFileToTree(file, folderPath, 0))
      );
      console.log(
        `File tree populated for ${folderPath}, HTML length: ${fileTreeElement.innerHTML.length}`
      );
      await loadRecentProjects();
    } else {
      outputArea.textContent = `Error: ${result.error || "No files found"}`;
      console.error(
        `Error loading folder ${folderPath}: ${
          result.error || "No files found"
        }`
      );
      currentFolderPath = null;
      newFileInFolderButton.disabled = true;
      newFolderButton.disabled = true;
    }
  } catch (error) {
    outputArea.textContent = `Error: ${error.message}`;
    console.error(`Error in loadAndDisplayFolder: ${error.message}`);
    currentFolderPath = null;
    newFileInFolderButton.disabled = true;
    newFolderButton.disabled = true;
  }
}

async function toggleFolder(li, folderPath, level) {
  console.log(`Toggle clicked for folder: ${folderPath}`);
  const isExpanded = li.classList.contains("expanded");
  li.classList.toggle("expanded");
  console.log(`Folder ${folderPath} expanded: ${!isExpanded}`);
  if (!isExpanded) {
    let ul = li.querySelector("ul");
    if (!ul) {
      console.log(`Loading subfolder: ${folderPath}`);
      const subResult = await window.electronAPI.readDir(folderPath);
      console.log(`readDir subfolder result for ${folderPath}:`, subResult);
      if (subResult.success && subResult.files) {
        console.log(
          `Subfolder ${folderPath} contains ${subResult.files.length} items:`,
          subResult.files.map((f) => `${f.name} (${f.isDir ? "dir" : "file"})`)
        );
        ul = document.createElement("ul");
        li.appendChild(ul);
        await Promise.all(
          subResult.files.map((subFile) =>
            addFileToTree(subFile, folderPath, level + 1)
          )
        );
        // Force DOM reflow
        ul.getBoundingClientRect();
        console.log(
          `Subfolder ${folderPath} loaded, <ul> has ${ul.childElementCount} children`
        );
        console.log(`<ul> content: ${ul.innerHTML.substring(0, 200)}...`);
      } else {
        outputArea.textContent = `Error loading folder: ${
          subResult.error || "No files found"
        }`;
        console.error(
          `Error loading subfolder ${folderPath}: ${
            subResult.error || "No files found"
          }`
        );
        li.classList.remove("expanded");
      }
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

  const iconClass = await window.electronAPI.getIconClass(
    file.name,
    file.isDir
  );
  let content = `<span class="file-content" style="padding-left: ${indent}px;">`;
  if (file.isDir) {
    content += `<span class="toggle"><i class="fas fa-chevron-right"></i></span>`;
  } else {
    content += `<span class="file-icon-placeholder"></span>`;
  }
  content += `<i class="${iconClass}"></i> <span class="file-name">${displayName}</span></span>`;
  li.innerHTML = content;
  console.log(`Added file to tree: ${file.path}, isDir: ${file.isDir}`);

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
      console.log(`File clicked: ${file.path}`);
      const result = await window.electronAPI.readFile(file.path);
      if (result.success) {
        openOrFocusTab(file.path, result.content);
      } else {
        outputArea.textContent = `Error: ${result.error}`;
        console.error(`Error reading file ${file.path}: ${result.error}`);
      }
    }
  });

  li.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    console.log(`Context menu triggered for: ${file.path}`);
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
    console.error(`Error renaming file: ${error.message}`);
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
    console.error(`Error deleting file: ${error.message}`);
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
    console.error(`Error clearing recent projects: ${error.message}`);
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
    toggleSidebarButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    window.electronAPI.setSettings("sidebarCollapsed", true);
  } else {
    sidebar.classList.remove("collapsed");
    toggleSidebarButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    window.electronAPI.setSettings("sidebarCollapsed", false);
  }
}

function toggleOutput(force = false) {
  const outputContainer = document.getElementById("output-container");
  const isCollapsed = outputContainer.classList.contains("collapsed");
  if (force || !isCollapsed) {
    outputContainer.classList.add("collapsed");
    editorContainer.style.height = "100%";
    toggleOutputButton.innerHTML = '<i class="fas fa-chevron-up"></i>';
    window.electronAPI.setSettings("outputCollapsed", true);
  } else {
    outputContainer.classList.remove("collapsed");
    editorContainer.style.height = "60%";
    toggleOutputButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
    window.electronAPI.setSettings("outputCollapsed", false);
  }
}

async function applyTheme(themePath) {
  console.log(`Applying theme: ${themePath}`);
  const themeStylesheet = document.getElementById("theme-stylesheet");
  if (!themeStylesheet) {
    console.error("Theme stylesheet element (#theme-stylesheet) not found");
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
    console.error(`Invalid theme path: ${themePath}`);
    outputArea.textContent = "Error: Invalid theme path.";
    return;
  }
  if (themeStylesheet.href !== themePath) {
    themeStylesheet.href = themePath;
    console.log(`Theme stylesheet updated to: ${themeStylesheet.href}`);
    themeStylesheet.onerror = () => {
      console.error(`Failed to load theme: ${themePath}`);
      outputArea.textContent = `Error: Failed to load theme ${themePath}`;
    };
  }

  await window.electronAPI.setSettings("selectedTheme", themePath);
  console.log(`Theme saved: ${themePath}`);

  // Apply Monaco editor theme
  if (editor) {
    monaco.editor.setTheme(monacoTheme);
    console.log(`Monaco editor theme set to: ${monacoTheme}`);
  }
}

function toggleIntroMessage() {
  introMessage.style.display = openTabs.size === 0 ? "block" : "none";
}

function attachUIEventListeners() {
  openFolderButtons.forEach((btn) =>
    btn.addEventListener("click", handleOpenFolder)
  );
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
    console.log(`Settings dialog opened, current theme: ${currentTheme}`);
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
  });
  themeSelector.addEventListener("change", async () => {
    const newTheme = themeSelector.value;
    console.log(`Theme selector changed to: ${newTheme}`);
    await applyTheme(newTheme);
    showToast(
      `Applied theme: ${
        newTheme.startsWith("themes/")
          ? newTheme.split("/").pop().replace(".css", "").replace("vs-", "VS ")
          : newTheme.replace(".css", "")
      }`
    );
  });
  closeSettingsButton.addEventListener("click", async () => {
    settingsDialog.style.display = "none";
    await window.electronAPI.setSettings(
      "buildToolPath",
      buildToolPathInput.value
    );
    await window.electronAPI.setSettings("autoSave", autoSaveCheckbox.checked);
    const fontSize = parseInt(fontSizeInput.value);
    if (fontSize >= 8 && fontSize <= 24) {
      await window.electronAPI.setSettings("fontSize", fontSize);
      editor.updateOptions({ fontSize });
    }
    const fileExtensions = fileExtensionsInput.value
      .split(",")
      .map((ext) => ext.trim())
      .filter((ext) => ext);
    await window.electronAPI.setSettings("fileExtensions", fileExtensions);
    await window.electronAPI.setSettings("logLevel", logLevelSelector.value);
    if (currentFolderPath) await loadAndDisplayFolder(currentFolderPath);
  });
  clearRecentProjectsButton.addEventListener("click", clearRecentProjects);
}
