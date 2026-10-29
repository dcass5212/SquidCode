# SquidCode

A fast, lightweight desktop app for opening a project folder, browsing its structure, and reading and editing files, with first-class Markdown support. Think "the calm 10% of VS Code plus the nicest Markdown pane."

Built with Tauri 2, React, TypeScript and CodeMirror 6. Windows 11 is the primary target.

## Features

- **File tree**: open a folder, lazy-loaded tree, folders first, hidden/ignored files toggle
- **Tabs and editing**: CodeMirror 6 with syntax highlighting for most languages, Ctrl+S save, unsaved-change indicators
- **Markdown**: split view with live GFM preview (tables, task lists, code highlighting, relative links and images), or source-only / preview-only
- **HTML**: the same Source / Split / Preview layout, served from a loopback-only static server so relative assets work
- **Web tab and dev server**: preview a local dev server (localhost only) and run the project's start command from the status bar
- **Safe by design**: atomic writes, external-change detection, unsaved-changes guard, large/binary file handling
- Light/dark theme following the system, with manual override; restores your last folder and open tabs

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri's [platform prerequisites](https://v2.tauri.app/start/prerequisites/) (on Windows: Microsoft C++ Build Tools and WebView2)

### Run

```bash
npm install
npm run tauri dev
```

### Build an installer

```bash
npm run tauri build
```

Output lands in `src-tauri/target/release/bundle/`.

### Other commands

```bash
npm run typecheck
npm run lint
npm test
npm run format
```

## Project layout

```
src/         React app: app/, core/, features/ (registry-based), ui/, styles/
src-tauri/   Rust backend: filesystem commands and window plumbing only
docs/        Vision, architecture, design, roadmap, decisions
```

New capabilities register themselves in `src/features/registry.ts`. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/VISION.md](docs/VISION.md).

## License

[MIT](LICENSE)
