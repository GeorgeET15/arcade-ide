# Arcade IDE

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/GeorgeET15/arcade-ide)](https://github.com/GeorgeET15/arcade-ide)

Arcade IDE is a retro-themed 2D game development environment powered by the `arcade.h` library. With a nostalgic arcade aesthetic, it offers a sleek interface for coding, project management, and building 2D games. Arcade IDE is open source, and we welcome contributions from the community to make it even better!

## Features

- **Arcade.h Integration**: Develop 2D games using the `arcade.h` library.
- **AI Sprite Generator**: Create retro-style sprites using AI-powered tools.
- **Code Snippets**: Access pre-written code templates to speed up development.
- **Monaco Editor**: Write and edit code with a powerful, modern editor.
- **File Tree Navigation**: Easily manage your game project files.
- **Retro UI**: Enjoy a customizable, arcade-inspired interface.
- **Cross-Platform**: Runs on Windows and Linux.

## Installation

### Windows

1. Download the latest `ArcadeIDE-1.0.0-x64.exe` (64-bit) from the [Releases](https://github.com/GeorgeET15/arcade-ide/releases) page.
2. Run the installer, choose your installation directory, and follow the prompts.
3. Launch Arcade IDE from the desktop or Start Menu shortcut.

### Linux

1. Download the latest `.deb` package (e.g., `arcade-ide_1.0.0_amd64.deb`) from the [Releases](https://github.com/GeorgeET15/arcade-ide/releases) page.
2. Install the package:
   ```bash
   sudo dpkg -i arcade-ide_1.0.0_amd64.deb
   ```
3. Launch Arcade IDE from your application menu or by running:
   ```bash
   arcade-ide
   ```

## Usage

1. Open Arcade IDE.
2. Click "Open Folder" to select a project directory with your game files (e.g., `.c` files using `arcade.h`).
3. Navigate the file tree to open files in the Monaco Editor.
4. Leverage `arcade.h` integration, code snippets, and the AI sprite generator to build your retro 2D game.
5. Write, save, and compile your game code for development.

## Giving Credit

Arcade IDE is licensed under the [MIT License](LICENSE). If you use Arcade IDE or its code in your projects, please give credit by including the following in your project’s documentation, README, or about page:

```
Arcade IDE (https://github.com/GeorgeET15/arcade-ide)
Copyright (c) 2025 GeorgeET15
Licensed under the MIT License
```

You must also include a copy of the [LICENSE](LICENSE) file in any distribution that includes substantial portions of Arcade IDE’s code.

## Contributing

We love contributions! Whether you’re fixing bugs, adding features, or improving docs, your help is welcome. To get started:

1. Read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting code, reporting issues, or suggesting features.
2. Fork the [repository](https://github.com/GeorgeET15/arcade-ide), create a branch, and submit a pull request.
3. Join the community by opening issues or discussing ideas!

## Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/GeorgeET15/arcade-ide.git
   cd arcade-ide
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app:
   ```bash
   npm start
   ```
4. Build installers:
   - Windows: `npm run make:win` (requires `wine` on Linux)
   - Linux: `npm run make:linux`

## License

Arcade IDE is released under the [MIT License](LICENSE). See the [LICENSE](LICENSE) file for details.

## Contact

Have questions or ideas? Open an issue on [GitHub](https://github.com/GeorgeET15/arcade-ide/issues) or email GeorgeET15 at georgeemmanuelthomas@gmail.com.

Let’s build the ultimate retro game dev IDE together!
