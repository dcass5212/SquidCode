# Architecture

Goal: a tiny, stable core with features plugged in through registries so later additions are additive.

## Layers

```
UI (React)  →  core services (TS)  →  Tauri commands (Rust)  →  OS filesystem
```

### Rust (src-tauri) — deliberately thin

Typed commands only:

- `pick_folder() -> path | null` — shows the native dialog from Rust and records the opened root (one workspace at a time)
- `read_dir(path) -> Entry[]` (one level; name, kind, size, mtime) — lazy tree loading
- `read_file(path) -> { text, mtime }` (rejects binary and files over 5 MB)
- `read_file_bytes(path)` — scoped binary read (20 MB cap) for Markdown preview images
- `write_file(path, text, expected_mtime?)` — atomic write; errors on mtime conflict
- `restore_folder() -> path | null` — re-grants the folder last picked (path kept by Rust in its config dir, never supplied by the webview)
- `stat(path)`; external changes are found by polling `stat` from TypeScript (no Rust watcher)
- Preview server (`preview.rs`): loopback-only static server for `.html` previews; random token in the URL, Host check, GET/HEAD only, every path through the scope check. Root-absolute requests are accepted when the Referer carries the token; `preview_buffer` swaps in a page's unsaved text
- Dev server (`devserver.rs`, `job.rs`): runs one user-typed shell command in the opened folder, streams `dev:output` / `dev:exit` events; a Windows Job Object kills the whole process tree when the app dies
- Every path command canonicalizes and rejects anything outside a root the user opened (`outside_scope`). The webview cannot grant itself access.

### Core (src/core) — stable API, rarely edited

- `fs.ts`: typed wrapper over the Rust commands (the only place that calls `invoke`).
- `stores/`: Zustand stores — `workspace` (root, tree cache, expanded, hidden toggle), `documents` (tabs, text, dirty flag, mtime, EOL; also virtual `web:N` tabs that are never dirty or saved), `settings` (theme, editor font size; persisted), `layout` (sidebar width/collapse; persisted), `dialog` (in-app confirm modal), `sourcePreview` (shared Source / Split / Preview mode and split ratio for Markdown and HTML).
- `events.ts`: tiny typed event bus (`file:saved`, `doc:opened`, `doc:closed`, `workspace:closing`, `workspace:changed`).

### Features (src/features) — the extension surface

Each feature is a folder exporting a `Feature` object and registered in `registry.ts`:

```ts
interface Feature {
  id: string;
  // file viewers/editors, chosen by match priority
  fileHandlers?: { match: (path: string) => number; component: React.ComponentType<DocProps> }[];
  sidebarPanels?: { id: string; title: string; icon: IconName; component: React.ComponentType }[];
  commands?: { id: string; title: string; keybinding?: string; run: () => void }[];
  statusBarItems?: { id: string; side: 'left' | 'right'; component: React.ComponentType }[];
}
```

Core shell reads the registry to build tabs content, sidebar, command handling and status bar. Examples:

- `editor` registers a generic text handler (match priority 1).
- `markdown-preview` registers a `.md` handler (priority 10) that composes the editor + preview in a split.
- `web-preview` registers an `.html` handler (priority 10) and a virtual `web:` handler (priority 20), a command, and a status-bar item. It keeps each folder's Web tab URLs in `localStorage` and reopens them on `workspace:changed`.
- `dev-server` registers a status-bar item (command popover and output).
- `settings` registers a status-bar popover and font-size commands; `file-watch` polls open files for outside changes; `session` saves and restores open file tabs per folder (both side-effect features with no UI of their own).
- Later: `search`, `outline`, `git-status`, `image-viewer` are new folders plus one line in `registry.ts`.

## Key decisions

- **CodeMirror 6** for editing: small, modular, great for Markdown + many languages (lazy-load language packs).
- **Markdown preview** via `react-markdown` + `remark-gfm`; sanitize output, no raw HTML by default; resolve relative links/images against the file's folder.
- **State**: Zustand, because stores can be read outside React (commands, event bus).
- **Persistence**: `localStorage` (via `core/persist.ts`) for settings, layout, the hidden toggle, per-folder file tabs, dev-server commands and Web tab URLs. Only the last folder lives in Rust, because Rust owns the scope.
- **No global CSS leakage**: CSS Modules per component + shared `tokens.css`.

## Data-safety rules

- Atomic writes; no write if disk mtime changed unless the user confirms overwrite.
- Dirty-doc guard on tab close, folder switch and app exit.
- Treat files as UTF-8; preserve line endings (LF/CRLF) and a trailing newline on save.
