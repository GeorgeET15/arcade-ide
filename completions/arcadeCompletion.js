define([], function () {
  function registerArcadeCompletionProvider(monaco) {
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Initialize the Arcade window.\nParameters:\n- window_width: int (e.g., 800)\n- window_height: int (e.g., 600)\n- window_title: const char*\n- bg_color: uint32_t (0xRRGGBB)\nReturns: int (0 on success, non-zero on failure)",
              range: range,
            },
            {
              label: "arcade_running",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_running()$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Check if the Arcade window is running.\nReturns: int (1 if running, 0 if stopped)",
              range: range,
            },
            {
              label: "arcade_update",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_update()$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Update the Arcade game state (processes events).\nReturns: int (1 to continue, 0 to stop)",
              range: range,
            },
            {
              label: "arcade_quit",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_quit()$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Close the Arcade window and free resources.",
              range: range,
            },
            {
              label: "arcade_set_running",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_set_running(${1|1,0|})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Set the running state of the game.\nParameters:\n- value: int (1 = running, 0 = stopped)",
              range: range,
            },
            {
              label: "arcade_sleep",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_sleep(${1:16})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Check if a key was pressed in the current frame.\nParameters:\n- key_val: unsigned int (e.g., a_space)\nReturns: int (2 if pressed this frame, 0 otherwise)",
              range: range,
            },
            {
              label: "arcade_clear_keys",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_clear_keys()$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Reset all key states to unpressed.",
              range: range,
            },
            {
              label: "arcade_move_sprite",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText:
                "arcade_move_sprite(&${1:sprite}, ${2:0.1f}, ${3:600})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Update position of an image-based sprite with gravity and boundary checks.\nParameters:\n- sprite: ArcadeImageSprite*\n- gravity: float\n- window_height: int",
              range: range,
            },
            {
              label: "arcade_check_collision",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_check_collision(&${1:a}, &${2:b})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Check for collision between two color-based sprites using AABB.\nParameters:\n- a: ArcadeSprite*\n- b: ArcadeSprite*\nReturns: int (1 if collision, 0 otherwise)",
              range: range,
            },
            {
              label: "arcade_check_image_collision",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_check_image_collision(&${1:a}, &${2:b})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Create an image-based sprite from a file.\nParameters:\n- x: float\n- y: float\n- w: float\n- h: float\n- filename: const char*\nReturns: ArcadeImageSprite",
              range: range,
            },
            {
              label: "arcade_free_image_sprite",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_free_image_sprite(&${1:sprite})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Create an animated sprite with multiple frames.\nParameters:\n- x: float\n- y: float\n- w: float\n- h: float\n- filenames: const char**\n- frame_count: int\n- frame_interval: int\nReturns: ArcadeAnimatedSprite",
              range: range,
            },
            {
              label: "arcade_free_animated_sprite",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_free_animated_sprite(&${1:anim})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Render centered text that blinks.\nParameters:\n- text: const char*\n- y: float\n- color: unsigned int (0xRRGGBB)\n- blink_interval: int",
              range: range,
            },
            {
              label: "arcade_init_group",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_init_group(&${1:group}, ${2:10})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Add an animated sprite’s current frame to a group.\nParameters:\n- group: SpriteGroup*\n- anim: ArcadeAnimatedSprite*",
              range: range,
            },
            {
              label: "arcade_render_group",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_render_group(&${1:group})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Render all sprites in a sprite group.\nParameters:\n- group: SpriteGroup*",
              range: range,
            },
            {
              label: "arcade_free_group",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "arcade_free_group(&${1:group})$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Free the memory allocated for a sprite group.\nParameters:\n- group: SpriteGroup*",
              range: range,
            },
            {
              label: "arcade_play_sound",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'arcade_play_sound(${1:"audio/sfx.wav"})$0',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Play a WAV audio file asynchronously.\nParameters:\n- audio_file_path: const char*\nReturns: int (0 on success, non-zero on failure)",
              range: range,
            },
            {
              label: "arcade_flip_image",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'arcade_flip_image(${1:"sprite.png"}, ${2|0,1|})$0',
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
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
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation:
                "Manages a collection of sprites.\nFields:\n- sprites: ArcadeAnySprite*\n- types: int*\n- count: int\n- capacity: int",
              range: range,
            },
            {
              label: "SPRITE_COLOR",
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: "SPRITE_COLOR$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Enum value for color-based sprite (0).",
              range: range,
            },
            {
              label: "SPRITE_IMAGE",
              kind: monaco.languages.CompletionItemKind.EnumMember,
              insertText: "SPRITE_IMAGE$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Enum value for image-based sprite (1).",
              range: range,
            },
            {
              label: "a_up",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_up$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for up arrow (0xff52).",
              range: range,
            },
            {
              label: "a_down",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_down$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for down arrow (0xff54).",
              range: range,
            },
            {
              label: "a_left",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_left$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for left arrow (0xff51).",
              range: range,
            },
            {
              label: "a_right",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_right$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for right arrow (0xff53).",
              range: range,
            },
            {
              label: "a_w",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_w$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for W key (0x0077).",
              range: range,
            },
            {
              label: "a_a",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_a$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for A key (0x0061).",
              range: range,
            },
            {
              label: "a_s",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_s$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for S key (0x0073).",
              range: range,
            },
            {
              label: "a_d",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_d$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for D key (0x0064).",
              range: range,
            },
            {
              label: "a_r",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_r$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for R key (0x0072).",
              range: range,
            },
            {
              label: "a_p",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_p$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for P key (0x0070).",
              range: range,
            },
            {
              label: "a_space",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_space$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for spacebar (0x0020).",
              range: range,
            },
            {
              label: "a_esc",
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: "a_esc$0",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Key code for escape key (0xff1b).",
              range: range,
            },
          ],
        };
      },
    });
  }
  return { registerArcadeCompletionProvider };
});
