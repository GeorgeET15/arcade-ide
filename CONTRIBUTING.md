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
   - Use descriptive branch names (e.g., `fix/file-tree-bug`, `feature/new-theme`).

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
  - Use ES6+ syntax.
  - Follow consistent formatting (use Prettier or similar).
  - Add comments for complex logic.
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
  - Ensure the file tree, Monaco Editor, and `arcade.h` integration work as expected.

## Contribution Types

- **Bug Fixes**: Fix issues in the file tree, editor, or build process.
- **Features**: Add new functionality (e.g., new themes, tools, or `arcade.h` integrations).
- **Documentation**: Improve `README.md`, code comments, or tutorials.
- **Maintenance**: Update dependencies, refactor code, or optimize performance.

## Licensing

By contributing to Arcade IDE, you agree to license your contributions under the [MIT License](LICENSE). Ensure your contributions do not include proprietary or unlicensed code.

## Community Guidelines

- Be respectful and inclusive in all interactions.
- Report issues or suggest features via [GitHub Issues](https://github.com/GeorgeET15/arcade-ide/issues).
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) (to be added).

## Questions?

Contact GeorgeET15 via [GitHub Issues](https://github.com/GeorgeET15/arcade-ide) or email at georgeet15@example.com.

Thank you for helping make Arcade IDE awesome!
