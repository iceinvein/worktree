# Contributing to Worktree Manager

Thank you for your interest in contributing! This guide covers how to set up your development environment, build the extension, and release it.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [Git](https://git-scm.com/)
- [VS Code](https://code.visualstudio.com/)

## Development Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd worktree-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the Extension (Development Mode)**:
   - Open the project in VS Code (`code .`).
   - Press `F5` (or go to **Run and Debug** side bar > click generic "Play" icon next to **Run Extension**).
   - This launches a new VS Code window titled **[Extension Development Host]**.
   - In this new window, open any folder that is a git repository.
   - You should now see the "Worktrees" view in the Source Control side bar.

4. **Testing with a VSIX (User Mode)**:
   If you want to test how a real user would install it (without running the debugger):
   - Package the extension:
     ```bash
     vsce package
     ```
   - This creates a `.vsix` file (e.g., `worktree-manager-0.0.1.vsix`).
   - Open VS Code, go to the **Extensions** view.
   - Click the `...` menu (Views and More Actions) at the top right of the Extensions pane.
   - Select **Install from VSIX...**.
   - Choose your generated file.
   - Reload VS Code.

5. **Debugging**:
   - You can set breakpoints in your source code (`.ts` files) in the original window.
   - Interactions in the [Extension Development Host] window will trigger these breakpoints.
   - Use the **Debug Console** in the original window to view `console.log` output.

## Building / Packaging

To package the extension into a `.vsix` file for checking or manual installation:

1. Install `vsce` (VS Code Extensions CLI) globally:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```
   This will create a `worktree-manager-0.0.1.vsix` file in the root.

## Releasing

To publish the extension to the Visual Studio Marketplace:

1. **Get a Publisher ID** from the [Marketplace Management Page](https://marketplace.visualstudio.com/manage).
2. **Login** via CLI:
   ```bash
   vsce login <publisher id>
   ```
3. **Publish**:
   ```bash
   vsce publish
   ```
   
   To bump the version automatically:
   ```bash
   vsce publish patch  # 0.0.1 -> 0.0.2
   vsce publish minor  # 0.0.1 -> 0.1.0
   vsce publish major  # 0.0.1 -> 1.0.0
   ```

## Development Guidelines

- **Async/Await**: We use strictly async/await for all Git operations to prevent UI freezing. Do not use `execSync`.
- **Linting**: Run `npm run lint` before committing to ensure code quality.
