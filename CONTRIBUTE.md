# Contributing to BF Portal Extension

Welcome! This document provides comprehensive information about the project structure, development tools, and how to contribute to BF Portal Extension.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Development Tools](#development-tools)
4. [Setting Up Your Development Environment](#setting-up-your-development-environment)
5. [Build Process](#build-process)
6. [Development Workflow](#development-workflow)
7. [Code Quality Standards](#code-quality-standards)
8. [Plugin Development](#plugin-development)
9. [Deployment & Release](#deployment--release)
10. [Getting Help](#getting-help)

---

## Project Overview

**BF Portal Extension** is a browser extension that adds advanced functionality to the Battlefield Portal Website.
It provides features like:

-   Documentation access and code clipboard operations
-   Block manipulation (expand/collapse, comments, layout changes)
-   Import/Export capabilities (JSON, SVG, PNG)
-   Multi-block selection and management
-   Plugin system for extensibility

As of v2.0.0, the project uses a **split architecture**:

-   **Browser Extension**: Minimal functionality, loads a Web Extension
-   **Web Extension**: Provides core functionality and manages plugins
-   **Plugin System**: Third-party plugins extend functionality

The extension is distributed across multiple game titles' Portal editors and available on:

-   Chrome Web Store
-   Edge Addons
-   Mozilla Addons
-   Manual installation (GitHub releases)

---

## Loading flow: Browser extension → Web extension → Plugins

The project uses a small handshake and script-injection flow so the lightweight browser extension can select and load the larger web extension bundle at runtime. Below is a concise, actionable summary contributors should follow when working on extension/plugin loading.

-   Browser extension bootstrap (`src/browser/extension/app.js`):

    -   Reads stored config (manifest URL + selected version) from `chrome.storage` or extension storage.
    -   Injects the web bootstrap script at `/web/app.js` into the page (`injectScript("/web/app.js")`).
    -   Dispatches a DOM event (`bf-portal-extension-init`) that the web bootstrap listens for to request the selected manifest and version.

-   Web bootstrap (`src/browser/web/app.js`):

    -   Listens for the `bf-portal-extension-init` event and responds with an object containing `version` and `manifest` (the selected manifest entry supplied by the browser extension).
    -   Waits for Blockly block definitions to be available, then appends a `<script src="${manifest.url}">` to `document.body` to load the full web extension bundle.

-   Web extension bundle (compiled TypeScript, entry `src/web/App.ts`):

    -   Initializes `BF2042Portal.*` runtime objects and calls `Extensions.init()` and other startup routines.
    -   Passes startup data into the plugin system: see the call in `src/web/Extensions.ts` where `pluginInit({ ..., pluginManager: BF2042Portal.Startup.getManifest().pluginManager })` is invoked. That `pluginManager` property is read from the selected extension manifest.

-   Plugin system (`src/web/Plugins.ts`):
    -   The web core exposes a `Plugins.init(data)` API. If `data.pluginManager` exists the core will call `loadPluginManager(...)`.
    -   The plugin manager itself is loaded as a plugin: the core creates a `BasePlugin` entry with id `plugin-manager` and injects a `<script>` tag for `pluginManager.baseUrl + pluginManager.main`.
    -   Each plugin is represented by a `BasePlugin` that provides convenience API methods (e.g., `getSelectedBlocks()`, `getMouseCoords()`, `registerMenu()`, etc.). When the plugin's script `load` event fires, the core calls `plugin.initializeWorkspace()`.

Key consequences and contributor guidance:

-   The plugin manager is not baked into the core runtime — it is a plugin that the web extension will automatically load when `pluginManager` is present in the manifest. In other words: the core provides the hook and loader; the plugin manager is an external plugin loaded through that hook.
-   Plugin manifests (the small JSON files that describe a plugin) should follow the project's `PluginManifest` shape: `id`, `main`, optional `loadAsModule`, etc. See `src/web/Plugins.ts` for the exact interface used at runtime.
-   To change which plugin manager is loaded, update the browser extension manifest/selected manifest entry (the extension stores per-version manifest entries via the options UI). The manifest's `pluginManager` field should provide `baseUrl` and `main` (or a fully-qualified `main` file under `baseUrl`).
-   For local testing, use the existing local server workflow (`npm run dev:server`) and point the browser extension options to the local `dist`/plugin manifest (or host plugin files via `localhost`).

## Project Structure

```
BF-Portal-Extension/
├── src/
│   ├── browser/                    # Browser extension code
│   │   ├── extension/
│   │   │   └── app.js             # Main extension script
│   │   ├── options/               # Extension options page
│   │   │   ├── index.html
│   │   │   ├── js/
│   │   │   └── css/
│   │   ├── web/                   # Web extension files
│   │   ├── manifest.*.json        # Manifest files (v2, v3, base)
│   │   └── icon-128.png
│   │
│   └── web/                        # Web extension (TypeScript)
│       ├── App.ts                 # Main entry point
│       ├── Extensions.ts          # Extension functionality
│       ├── Plugins.ts             # Plugin system
│       ├── Shared.ts              # Shared utilities
│       └── globals.d.ts           # TypeScript declarations
│
├── build/                          # Build scripts
│   ├── base.js                    # Base build utilities
│   ├── build.js                   # Main build orchestrator
│   ├── chromium.js                # Chrome/Edge-specific build
│   ├── firefox.js                 # Firefox-specific build
│   └── web.js                     # Web extension build
│
├── plugins/                        # Plugin ecosystem
│   ├── plugin-index.md            # List of available plugins
│   ├── README.md                  # Plugin development guide
│   ├── control-blocks-outline/    # Sample plugins
│   ├── dark-context-menu/
│   ├── disable-readonly/
│   ├── doubleclick-tools/
│   ├── plugin-manager/
│   ├── red-variables/
│   └── test/
│
├── dist/                          # Build output (generated)
│   └── latest/                    # Latest web extension build
│
├── package.json                   # Project dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
├── .eslintrc.js                   # ESLint rules
├── .editorconfig                  # Editor standards
├── README.md                       # Project documentation
└── LICENSE.md                      # GPL 3.0 License
```

### Key Directories

-   **`src/browser/`**: Code specific to browser extension manifest and options UI
-   **`src/web/`**: Main TypeScript source code for the web extension (compiled with Vite)
-   **`build/`**: Node.js scripts that handle packaging for different browsers
-   **`plugins/`**: Example plugins and plugin development documentation

---

## Development Tools

### Core Technologies

| Tool           | Version | Purpose                          |
| -------------- | ------- | -------------------------------- |
| **TypeScript** | 4.8.4   | Type-safe JavaScript development |
| **Vite**       | 4.3.3   | Modern build tool and bundler    |
| **ESLint**     | 8.39.0  | Code linting and quality         |
| **Prettier**   | 2.8.8   | Code formatting                  |
| **Blockly**    | 9.2.1   | Visual programming framework     |

### Development Dependencies

-   **@typescript-eslint/eslint-plugin** & **@typescript-eslint/parser**: TypeScript linting support
-   **vite-plugin-eslint**: ESLint integration with Vite
-   **nodemon**: File watcher for development
-   **live-server**: Local development server
-   **archiver**: ZIP file creation for browser extension packaging

### Build & Development Scripts

Located in `package.json`:

```json
{
    "scripts": {
        "build:web": "vite build", // Build web extension
        "build:browser:chromium": "node build/chromium.js", // Build Chrome/Edge
        "build:browser:firefox": "node build/firefox.js", // Build Firefox
        "build:browser:all": "node build/build.js", // Build all browsers
        "build:browser:all:nopack": "node build/build.js --nopack", // No compression
        "dev:source:browser": "nodemon --ext * --watch src/browser --exec npm run build:browser:all:nopack",
        "dev:source:web": "nodemon --ext * --watch src/web --exec npm run build:web",
        "dev:server": "live-server --port=1989 --cors --no-browser .",
        "prettier": "prettier --write \"**/*.{js,ts,css,html,json}\"",
        "eslint": "eslint ./src/web",
        "typecheck": "tsc --noEmit",
        "lint": "npm run eslint && npm run typecheck"
    }
}
```

### Code Quality Standards

**Editor Configuration** (`.editorconfig`):

-   Charset: UTF-8
-   Line endings: LF
-   Indentation: 4 spaces
-   Max line length: 80 characters

**Prettier Configuration** (in `package.json`):

-   Semicolons: enabled
-   Tab width: 4 spaces
-   Trailing commas: all

**ESLint Configuration** (`.eslintrc.js`):

-   Base: ESLint recommended rules
-   TypeScript: `@typescript-eslint/recommended`
-   Strict type annotations required
-   Linting targets: `src/web` only (excludes dist, vendors, etc.)

**Ignored by Formatters/Linters**:

-   `dist/`, `node_modules/`, `**/vendors`, `res/`, `temp/`
-   Configuration files: `.eslintrc.js`, `vite.config.ts`

---

## Setting Up Your Development Environment

### Prerequisites

-   **Node.js** 14+ and **npm** (comes with Node.js)
-   **Git** for version control
-   A modern code editor (VS Code recommended)
-   One or more browsers for testing:
    -   Chrome/Edge for Chromium builds
    -   Firefox for Firefox builds

### Installation Steps

1. **Clone the repository**

    ```bash
    git clone https://github.com/LennardF1989/BF-Portal-Extension.git
    cd BF-Portal-Extension
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Verify your setup**
    ```bash
    npm run lint
    npm run typecheck
    ```

### Optional: VS Code Setup

The project includes a workspace file: `bf-portal-extension.code-workspace`

For best experience, consider installing:

-   **ESLint** extension
-   **Prettier** extension
-   **TypeScript Vue Plugin** (if working with Vue-related code)

---

## Build Process

### Building the Web Extension

The web extension is the core functionality, written in TypeScript:

```bash
npm run build:web
```

Output: `dist/latest/app.js` (compiled CommonJS module)

### Building Browser Extensions

**Chrome/Edge (Chromium):**

```bash
npm run build:browser:chromium
```

**Firefox:**

```bash
npm run build:browser:firefox
```

**All browsers:**

```bash
npm run build:browser:all
```

**Without compression (for development):**

```bash
npm run build:browser:all:nopack
```

### Build Process Flow

1. Files are organized into temporary directories (`temp/`)
2. The manifest file is transformed based on the target browser
3. Web extension files are copied to the browser-specific package
4. Files are zipped (except with `--nopack` flag)
5. Final packages are placed in `dist/` with browser-specific naming

---

## Development Workflow

### Local Development with Live Reload

1. **Terminal 1: Watch & build browser extension**

    ```bash
    npm run dev:source:browser
    ```

    This watches `src/browser/` and rebuilds on changes.

2. **Terminal 2: Watch & build web extension**

    ```bash
    npm run dev:source:web
    ```

    This watches `src/web/` and rebuilds on changes.

3. **Terminal 3: Start local server**
    ```bash
    npm run dev:server
    ```
    This serves files on `http://localhost:1989` with CORS enabled.

### Testing the Extension

#### For Chrome/Edge:

1. Navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer Mode"
3. Click "Load unpacked" and select your `dist/` folder
4. Open Battlefield Portal and test features

#### For Firefox:

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `.xpi` file from `dist/`
4. Open Battlefield Portal and test features

### Code Quality Before Committing

Run all quality checks:

```bash
npm run lint
```

This runs:

-   ESLint for code style violations
-   TypeScript compiler for type errors

Auto-fix formatting issues:

```bash
npm run prettier
```

---

## Code Quality Standards

### TypeScript Requirements

-   **Strict mode**: `noImplicitAny: true` enforced
-   **Target**: ES2020
-   **Module system**: CommonJS
-   **Source maps**: Enabled for debugging

### Type Annotations

In `.eslintrc.js`, strict type requirements are enforced:

-   `@typescript-eslint/typedef` rule requires explicit types for:
    -   Function parameters
    -   Object destructuring
    -   Arrow function parameters
    -   Member variables
    -   Property declarations
    -   Array destructuring

Example:

```typescript
// ✅ Good
const getValue = (key: string): string => {
    return key;
};

// ❌ Bad
const getValue = (key) => {
    return key;
};
```

### Naming Conventions

-   Use camelCase for variables and functions
-   Use PascalCase for classes and types
-   Use UPPER_SNAKE_CASE for constants
-   Prefix private members with underscore: `_privateMethod()`

### Code Organization

-   Keep files focused on a single responsibility
-   Use appropriate file extensions (`.ts` for TypeScript, `.js` for JavaScript)
-   Group related functionality into directories
-   Use descriptive, meaningful file and variable names

---

## Plugin Development

### Overview

Plugins are scripts that extend the extension's functionality. They're loaded right after Blockly initializes and have access to a Runtime SDK.

### Plugin Structure

Each plugin requires:

1. **manifest.json** - Plugin metadata
2. **Main JavaScript file** - Plugin logic
3. **Hosting** - Live server or GitHub Pages

### Manifest Format

```json
{
    "id": "unique-plugin-id",
    "name": "Human Readable Name",
    "version": "1.0.0",
    "description": "What this plugin does",
    "author": "Your Name",
    "homepage": "https://example.com",
    "loadAsModule": false,
    "main": "dist/plugin.js"
}
```

**Manifest Keys:**

-   `id`: Required, unique identifier
-   `name`: Required, human-readable name
-   `version`: Required, semantic versioning (no `v` prefix)
-   `description`: Optional, plugin description
-   `author`: Optional, comma-separated if multiple
-   `homepage`: Optional, valid URL with protocol
-   `loadAsModule`: Optional, `true` for ESM, `false` for standard script
-   `main`: Required, relative path to main file from plugin root

### Plugin API

Plugins have access to the **Runtime SDK**:

```javascript
// Get plugin instance
const plugin = BFPortal.Plugins.getPlugin("your-plugin-id");

// Plugin instance contains:
// - manifest.json contents
// - baseUrl: URL where plugin is hosted
// - getUrl(relativePath): Get absolute URL
// - initializeWorkspace: Called when workspace reloads

// Convenience functions available:
// - getMouseCoords(): {x, y}
// - getSelectedBlocks(): Block[]
// - showContextMenuWithBack(options)
// - createMenu(config)
// - registerMenu(menu)
// - registerItem(item)

// Data persistence:
// Use localStorage with plugin ID as key
localStorage.setItem("plugin-id", JSON.stringify(pluginData));
```

### Development Workflow

1. Create plugin directory: `plugins/my-plugin/`
2. Create `manifest.json` with unique ID
3. Create main JS file referenced in manifest
4. Test locally using `npm run dev:server` on port 1989
5. Add plugin URL to Plugin Manager in Battlefield Portal

### Example Plugin

See example plugins in `plugins/` directory:

-   **control-blocks-outline**: Outlines blocks
-   **dark-context-menu**: Dark theme for context menus
-   **plugin-manager**: Manages plugin installation

### Plugin Security

Users must manually:

-   Provide the manifest URL
-   Approve plugin installation
-   Update plugins manually

**Important**: Be respectful of user trust. Plugins have broad access to modify Battlefield Portal.

### Licensing

Plugins are **exempt** from GPL 3.0 licensing requirements. You can open-source or keep proprietary.

### Distribution

For public plugins:

1. Create a GitHub repository
2. Place compiled files in `dist/` folder
3. Include `manifest.json` in dist folder
4. Use raw GitHub URL: `https://raw.githubusercontent.com/user/repo/main/dist/manifest.json`
5. Recommend using GitHub Pages for iframe-free hosting

---

## Deployment & Release

### Version Management

The project uses **Semantic Versioning** (MAJOR.MINOR.PATCH):

-   MAJOR: Breaking changes
-   MINOR: New features (backwards compatible)
-   PATCH: Bug fixes

Update version in `package.json` before release.

### Release Process

1. **Update version** in `package.json`
2. **Test thoroughly**
    - Run `npm run lint` for code quality
    - Test in Chrome/Edge and Firefox
    - Verify plugin system works
3. **Build for all platforms**
    ```bash
    npm run build:browser:all
    ```
4. **Create GitHub Release**
    - Tag: `v{version}`
    - Attach build artifacts:
        - `chromium.zip` for Chrome/Edge
        - `firefox.xpi` for Firefox
5. **Submit to stores** (if updates needed)
    - Chrome Web Store
    - Edge Addons
    - Mozilla Addons

### Distribution Channels

-   **Chrome Web Store**: Automatic updates when submitted
-   **Edge Addons**: Automatic updates when submitted
-   **Mozilla Addons**: Automatic updates when submitted
-   **GitHub Releases**: Manual downloads for offline installation

---

## Getting Help

### Documentation

-   **Main README**: `README.md` - Overview and installation
-   **Plugin Guide**: `plugins/README.md` - Plugin development
-   **Plugin Index**: `plugins/plugin-index.md` - Available plugins

### Community

-   **GitHub Issues**: Report bugs or request features
-   **GitHub Discussions**: Ask questions and discuss ideas
-   **Wiki**: Extended documentation and guides

### Common Tasks

#### Adding a new feature to the web extension:

1. Add code to `src/web/*.ts`
2. Update type definitions in `src/web/globals.d.ts` if needed
3. Run `npm run build:web`
4. Test in browser using Developer Mode

#### Creating a new browser manifest variant:

1. Create/update manifest in `src/browser/manifest.*.json`
2. Update build scripts in `build/*.js` if needed
3. Test build with `npm run build:browser:all`

#### Debugging:

1. Enable source maps: Built into Vite config
2. Use browser DevTools on Battlefield Portal page
3. Check console for errors
4. Use `npm run typecheck` to catch type issues early

---

## Summary

This project combines:

-   **TypeScript** for type safety
-   **Vite** for fast builds
-   **ESLint + Prettier** for code quality
-   **Browser APIs** for extension functionality
-   **Plugin system** for extensibility

All development happens in TypeScript in `src/web/`, while `src/browser/` handles browser-specific packaging. The build system creates optimized packages for Chrome, Edge, and Firefox across multiple Battlefield game titles.

Welcome to the team! Happy coding!
