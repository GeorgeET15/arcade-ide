# Arcade IDE

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/GeorgeET15/arcade-ide)](https://github.com/GeorgeET15/arcade-ide)
[![GitHub Release](https://img.shields.io/github/v/release/GeorgeET15/arcade-ide)](https://github.com/GeorgeET15/arcade-ide/releases)

Arcade IDE is a retro-themed 2D game development environment powered by the `arcade.h` library. With a nostalgic arcade aesthetic, it offers a sleek interface for coding, project management, and building 2D games. Arcade IDE is open source, and we welcome contributions from the community to make it even better!

## Features

- **Arcade.h Integration**: Develop 2D games using the `arcade.h` library with seamless compilation support.
- **AI Sprite Generator**: Create retro-style sprites using AI-powered tools (requires Gemini and Remove.bg API keys).
- **Code Snippets**: Access pre-written code templates to speed up development.
- **Monaco Editor**: Write and edit code with a powerful, modern editor featuring syntax highlighting.
- **File Tree Navigation**: Easily manage your game project files with a clean interface.
- **Retro UI**: Enjoy a customizable, arcade-inspired interface.
- **Cross-Platform**: Runs on Windows and Linux with improved stability.
- **Enhanced Error Handling**: Robust validation for JSON configs and file operations.
- **Modern Electron Practices**: Secure context isolation and updated protocol handling.

## Installation

### Prerequisites

- Ensure `gcc` and `make` (or `mingw32-make` on Windows) are installed for compiling games.
- For AI sprite generation, configure Gemini and Remove.bg API keys in the IDE settings.

### Windows

1. Download the latest `ArcadeIDE-1.0.0-x64.exe` (64-bit) from the [Releases](https://github.com/GeorgeET15/arcade-ide/releases) page.
2. Run the installer, choose your installation directory, and follow the prompts.
3. Launch Arcade IDE from the desktop or Start Menu shortcut.
4. Verify build tools (`gcc` and `mingw32-make`) are in your system PATH.

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
4. Ensure `gcc` and `make` are installed:
   ```bash
   sudo apt-get install build-essential
   ```

## Usage

1. Open Arcade IDE.
2. Click "Open Folder" to select a project directory with your game files (e.g., `.c` files using `arcade.h`).
3. Navigate the file tree to open files in the Monaco Editor.
4. Configure API keys for the AI sprite generator in settings for full sprite creation functionality.
5. Leverage `arcade.h` integration, code snippets, and the AI sprite generator to build your retro 2D game.
6. Write, save, and compile your game code for development and packaging.

**Note**: The AI sprite generator requires valid Gemini and Remove.bg API keys. Without these, sprites are saved with backgrounds.

## Giving Credit

Arcade IDE is licensed under the [MIT License](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE). If you use Arcade IDE or its code in your projects, please give credit by including the following in your project’s documentation, README, or about page:

```
Arcade IDE (https://github.com/GeorgeET15/arcade-ide)
Copyright (c) 2025 GeorgeET15
Licensed under the MIT License
```

You must also include a copy of the [LICENSE](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE) file in any distribution that includes substantial portions of Arcade IDE’s code.

## Contributing

We love contributions! Whether you’re fixing bugs, adding features, or improving docs, your help is welcome. To get started:

1. Read our [CONTRIBUTING.md](https://github.com/GeorgeET15/arcade-ide/blob/master/CONTRIBUTING.md) for guidelines on submitting code, reporting issues, or suggesting features.
2. Fork the [repository](https://github.com/GeorgeET15/arcade-ide), create a branch, and submit a pull request.
3. Join the community by opening issues, participating in [GitHub Discussions](https://github.com/GeorgeET15/arcade-ide/discussions), or suggesting ideas!

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
   - Windows: `npm run make:win` (requires `wine` on Linux for cross-compilation)
   - Linux: `npm run make:linux`

**Note**: Ensure you’re using a compatible Electron version (20+ recommended). Install `wine` on Linux for Windows builds:

```bash
sudo apt-get install wine
```

## License

Arcade IDE is released under the [MIT License](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE). See the [LICENSE](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE) file for details.

## Contact

Have questions or ideas? Open an issue on [GitHub](https://github.com/GeorgeET15/arcade-ide/issues), join our [GitHub Discussions](https://github.com/GeorgeET15/arcade-ide/discussions), or email GeorgeET15 at georgeemmanuelthomas@gmail.com.

Let’s build the ultimate retro game dev IDE together!
