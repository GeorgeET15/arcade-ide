# Contributing to Arcade IDE

Thank you for your interest in contributing to Arcade IDE! We welcome contributions from the community to make this retro-themed 2D game development IDE better. This document outlines the process for contributing code, documentation, or other improvements.

## How to Contribute

1. **Fork the Repository**:

   - Fork the [Arcade IDE repository](https://github.com/GeorgeET15/arcade-ide) on GitHub.
   - Clone your fork:
     ```bash
     git clone https://github.com/YOUR_USERNAME/arcade-ide.git
     cd arcade-ide
     ```

2. **Create a Branch**:

   - Create a new branch for your changes:
     ```bash
     git checkout -b feature/your-feature-name
     ```
   - Use descriptive branch names (e.g., `fix/file-tree-bug`, `feature/ai-sprite-enhancement`).

3. **Make Changes**:

   - Follow the coding standards below.
   - Test your changes locally:
     ```bash
     npm install
     npm start
     ```

4. **Commit Changes**:

   - Write clear, concise commit messages:
     ```bash
     git commit -m "Add feature: describe your change here"
     ```
   - Sign off your commits to agree to the Developer Certificate of Origin (DCO):
     ```bash
     git commit -s -m "Your commit message"
     ```

5. **Push and Create a Pull Request**:

   - Push your branch to your fork:
     ```bash
     git push origin feature/your-feature-name
     ```
   - Open a pull request (PR) on the [main repository](https://github.com/GeorgeET15/arcade-ide).
   - Describe your changes in the PR, referencing any related issues (e.g., “Fixes #123”).

6. **Respond to Feedback**:
   - Address any review comments or requested changes.
   - Update your branch and push additional commits as needed.

## Coding Standards

- **JavaScript**:
  - Use ES6+ syntax and target Electron 20+ for compatibility.
  - Follow consistent formatting (use Prettier or similar).
  - Add comments for complex logic, especially in IPC handlers.
  - Use `contextBridge` in `preload.js` for secure renderer-main communication.
  - Normalize file paths with forward slashes (`/`) for cross-platform consistency (e.g., `path.join(...).replace(/\\/g, "/")`).
- **CSS**:
  - Use CSS variables (e.g., `--primary-foreground`) for theme consistency.
  - Keep styles modular and scoped to components.
- **File Structure**:
  - Place new scripts in the root (e.g., `new-feature.js`) or appropriate subdirectories (e.g., `lib/` for C libraries).
  - Update `build.files` in `package.json` if new files are added.
- **Testing**:
  - Test changes in both Windows and Linux builds:
    ```bash
    npm run make:win
    npm run make:linux
    ```
  - Verify the file tree, Monaco Editor, `arcade.h` integration, and AI sprite generator (with valid Gemini and Remove.bg API keys).
  - Ensure JSON config files (e.g., `arcade.config.json`) are validated correctly.
  - Test error handling for file operations and compilation.

## Contribution Types

- **Bug Fixes**:
  - Example: Fix a file tree refresh issue when renaming files.
  - Example: Resolve compilation errors due to missing build tools.
- **Features**:
  - Example: Add a new retro theme for the UI.
  - Example: Enhance the AI sprite generator with additional customization options.
- **Documentation**:
  - Example: Update `README.md` with clearer installation steps.
  - Example: Add tutorials for using `arcade.h` with Arcade IDE.
- **Maintenance**:
  - Example: Update Electron or other dependencies to newer versions.
  - Example: Refactor IPC handlers for better performance.

## Licensing

By contributing to Arcade IDE, you agree to license your contributions under the [MIT License](https://github.com/GeorgeET15/arcade-ide/blob/main/LICENSE) and certify that your contributions comply with the [Developer Certificate of Origin (DCO)](https://developercertificate.org/). Ensure your contributions do not include proprietary or unlicensed code.

## Community Guidelines

- Be respectful and inclusive in all interactions.
- Report issues or suggest features via [GitHub Issues](https://github.com/GeorgeET15/arcade-ide/issues).
- Join discussions in [GitHub Discussions](https://github.com/GeorgeET15/arcade-ide/discussions) to share ideas or ask questions.
- Follow the [Code of Conduct](https://github.com/GeorgeET15/arcade-ide/blob/main/CODE_OF_CONDUCT.md) (if not yet created, adhere to general open-source principles of respect and collaboration).

## Questions?

Contact GeorgeET15 via [GitHub Issues](https://github.com/GeorgeET15/arcade-ide/issues), [GitHub Discussions](https://github.com/GeorgeET15/arcade-ide/discussions), or email at georgeemmanuelthomas@gmail.com.

Thank you for helping make Arcade IDE awesome!
