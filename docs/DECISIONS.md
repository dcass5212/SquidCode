# Decisions

Short ADR-style log. Add an entry whenever a non-obvious choice is made. Format: `## YYYY-MM-DD — Title` / Context / Decision / Consequences.

## 2026-10-28 — Tauri 2 + React/TS + CodeMirror 6

Context: personal, lightweight, good-looking desktop tool on Windows 11.
Decision: Tauri for small footprint, React/TS for fast UI iteration, CodeMirror 6 for editing, feature registry for extensibility.
Consequences: requires Rust toolchain and MSVC Build Tools; WebView2 is already present on Windows 11.

## 2026-10-28 — Product name is SquidCode

Context: the docs started with the working name "Lumen"; the project folder and kickoff use "SquidCode", which the user confirmed as the official name.
Decision: `productName`, window title, npm and crate names are `squidcode`; `CLAUDE.md` and `docs/VISION.md` were updated to match.
Consequences: nothing in code or docs depends on "Lumen" any more.

## 2026-10-28 — Rust owns the FS scope; the webview cannot grant itself access

Context: ARCHITECTURE.md says fs scope is granted only for user-opened folders via the dialog plugin. Our own Rust commands are not covered by Tauri's `fs` plugin scope, so they need their own check.
Decision: Rust keeps the list of opened roots. `pick_folder` shows the native dialog itself and records the root; `read_dir`/`read_file`/`write_file`/`stat` canonicalize their path and reject anything outside a recorded root (`outside_scope`). No `fs` plugin and no frontend-side dialog call. Capabilities stay at `core:default`.
Consequences: M0 only defines the typed contract (`src-tauri/src/fs.rs`, `src/core/fs.ts`); every command returns `not_implemented`. M1 adds the dialog plugin and the scope check; M2 the read/write bodies.

## 2026-10-28 — CSS Modules + tokens, dark set duplicated in tokens.css

Context: DESIGN.md wants `prefers-color-scheme` plus a `data-theme` override.
Decision: Light is the `:root` default. The dark values appear twice, once under `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) }` and once under `:root[data-theme='dark']`, because CSS cannot share a block between a media query and an attribute selector without a build step. A comment marks the pair.
Consequences: when editing dark colors, change both blocks. Contrast was checked at 4.5:1 or better for text, muted text, accent and danger in both themes.

## 2026-10-28 — M0 scope trims

Decision: only a `settings` store (theme, applied as `data-theme`) was added; `workspace`, `documents` and `layout` stores wait for the milestones that use them. The shell's "Open folder" button is disabled until M1. The registry exposes `commands()` but no keybinding dispatcher yet. No opener plugin and no template demo code.
Consequences: none beyond the above; each is additive later.

## 2026-10-28 — M1 browse: single workspace, flat row model, hidden = dot-folders + ignored dirs

Decision: Rust `pick_folder` uses `tauri-plugin-dialog` from Rust only (no JS plugin, no new capability) and replaces the recorded roots, so there is one workspace at a time. Roots are canonicalized; the `\?\` prefix is stripped before paths reach the UI. `read_dir` skips entries it cannot stat instead of failing the listing, and reports symlinks as `symlink` without following them. The tree is flattened into rows (`treeModel.buildRows`) so rendering and keyboard navigation (arrows, Home/End, Enter) stay simple. The hidden toggle covers dot-folders and `node_modules`, `target`, `dist`; default off, and when on they render dimmed. Dotfiles (`.gitignore`, `.env.example`, ...) are never hidden: they are config worth tracking. File-tree is a feature registering a sidebar panel; `workspace` and `layout` stores were added in core.
Consequences: clicking a file only highlights it (`activePath`); tabs and editing are M2. Sidebar width/collapse and the hidden toggle are not persisted until M4. No tree virtualization — lazy per-folder loading is the only large-folder defense for now.

## 2026-10-28 — M2 open & edit: data-safety choices

Decision: Rust `write_file` writes a sibling temp file, fsyncs, then renames over the target (temp removed on failure); it rejects with `conflict` when disk mtime differs from the one we last saw (1 ms slack). `read_file` refuses files over 5 MB (`too_large`) and anything with a NUL in the first 8 KB or invalid UTF-8 (`binary`), so a lossy decode can never be saved back. The editor works on LF text; the file's first line break decides CRLF vs LF and is restored on save (mixed files are normalized to that style). A UTF-8 BOM is kept as a leading character, so it round-trips. The `documents` store owns tabs, text, saved text, and the dirty flag (`text !== savedText`); per-tab undo history lives in the editor feature and is dropped on `doc:closed`.
Guards: closing a dirty tab, switching folder, and closing the window all ask Save / Don't save / Cancel through a small in-app modal (`ui/Dialog`, `core/stores/dialog.ts`) rather than `window.confirm`, which cannot offer three choices. The folder-switch guard runs before the native dialog because picking a folder replaces Rust's scope immediately. Window close uses `onCloseRequested` and needs the `core:window:allow-destroy` capability.
Consequences: Ctrl+S / Ctrl+W come from a generic keybinding dispatcher in the shell reading `registry.commands()`. Tabs are always permanent (no preview tabs). A file deleted on disk while open fails to save with an error dialog; no "save as" yet. Syntax colors are `--syntax-*` tokens; language packs load lazily via `@codemirror/language-data`.

## 2026-10-28 — M3 markdown: preview via react-markdown, images through a scoped Rust read

Decision: `features/markdown-preview` registers a `.md/.markdown/.mdx` handler (priority 10, above the generic editor) showing source / split / preview over the same `documents` entry, so edits, dirty state and undo are shared. The preview renders `useDeferredValue(text)` with `remark-gfm` and `rehype-highlight` (`detect: false`: only fences naming a language are colored; hljs classes map onto `--syntax-*` tokens). Relative `.md`/file links open in a tab; every link click is `preventDefault`ed so the webview never navigates, and external links are inert until an opener plugin is justified. Relative images load through a new `read_file_bytes` command (same scope check, 20 MB cap) into blob URLs, because the CSP and the asset protocol are not scoped to opened folders; remote images are blocked by the CSP and show alt text. `Splitter` gained an optional `fromPointer` so it can drive a ratio inside a pane.
Consequences: view mode and split ratio live in a feature store, not persisted until M4. `rehype-highlight` bundles highlight.js' common languages, which grows the main chunk. No scroll sync between source and preview; `#anchor` links do nothing.

## 2026-10-28 — Markdown scroll sync by source line; preview chunk lazy-loaded

Decision: a rehype plugin stamps block elements with `data-line`; `useScrollSync` maps editor top line <-> preview offset by piecewise-linear interpolation between those anchors (top/bottom edges snap), with an echo guard so a programmatic scroll doesn't bounce back. It listens in the capture phase on the split container so the lazy preview can mount in any order. `MarkdownPreview` is `React.lazy`: main chunk 944 kB -> 615 kB, with a 331 kB chunk fetched on first `.md` open.
Consequences: the remaining >500 kB warning is react-dom + CodeMirror, which every session needs; not worth splitting. Anchors are re-read on each scroll event (a few hundred elements), which is fine for README-sized files.

## 2026-10-28 — External links open in the system browser via a scoped opener permission

Decision: `tauri-plugin-opener` is registered with only `opener:allow-open-url` (not `opener:default`, which also allows opening arbitrary paths), scoped to `http(s)://` and `mailto:`. The Markdown preview calls `openUrl` for those links; relative links still open tabs, and every click is still `preventDefault`ed.
Consequences: a webview cannot ask the OS to open files or other schemes. Anything else that needs to open URLs should reuse this permission rather than widen it.

## 2026-10-28 — Local web preview: loopback static server + virtual Web tab

Context: previewing the user's own `.html` files and dev servers (not general browsing).
Decision: `.html/.htm` get the same Source/Split/Preview chrome as Markdown (extracted to `ui/SourcePreview`, view state in `core/stores/sourcePreview`, so the mode preference is shared). The preview is an iframe on a small Rust static server (`src-tauri/src/preview.rs`) so relative CSS/JS/images work: 127.0.0.1 only, random per-run token as the first URL segment, Host header must match (DNS-rebinding guard), GET/HEAD only, and every file goes through `Scope::resolve`. It shows the saved file, reloading on any `file:saved`. Dev servers open in a `web:N` tab: a virtual document (`isVirtualPath` in the documents store: always ready, never dirty, never saved) with a URL bar. Only `localhost`/`127.0.0.1` are framed; anything else offers "Open in browser". The CSP gained `frame-src http://127.0.0.1:* http://localhost:*`. Frames use `sandbox="allow-scripts allow-same-origin allow-forms allow-modals"`; they are cross-origin to the app.
Consequences: root-absolute references (`/css/a.css`) in served HTML 404 because the token prefix sits in front of the root; dev servers are unaffected. Unsaved edits are not shown until saved. Sites that send `X-Frame-Options` won't frame (rare for dev servers). Web tabs aren't restored on restart (M4 session restore should skip `web:` paths or persist their URLs).

## 2026-10-28 — Dev server runs inside the app (user-typed command, status-bar popover)

Context: the user's projects start servers in different ways (`run.bat` → uvicorn, `npm run dev`), so an npm-only runner is not enough.
Decision: `src-tauri/src/devserver.rs` runs one shell command (`cmd /C` / `sh -c`) in the opened folder, streams stdout+stderr as `dev:output` events, and reports `dev:exit`. The command string is typed in the app's popover (remembered per folder in localStorage, prefilled from `run.bat` / `package.json`), and never read from a file in the folder, so opening a cloned repo cannot run anything. The whole process tree is killed (`taskkill /T /F`) on Stop, on folder switch (`workspace:changed`) and on app exit (`RunEvent::Exit`). `PYTHONUNBUFFERED=1` is set so Python servers show output. The frontend detects `http://localhost|127.0.0.1|0.0.0.0:PORT` in the output and offers to open it in a Web tab (not automatic, to stay discreet).
Consequences: this is the first Rust code that runs arbitrary commands; it is only reachable from our own UI (CSP `default-src 'self'`). One server at a time; a closed app mid-run relies on the exit hook (a hard kill of SquidCode can orphan it). No stdin. Split view now uses `flex: 0 0 <ratio>%` so the default is a true 50/50 (before, the source pane also grew into the leftover space).

## 2026-10-28 — Web preview and dev server are in scope; Web tabs restore per folder

Context: the web preview and dev server were built beyond the original roadmap; the user confirmed they belong in the product (ROADMAP M3.5, VISION core experience).
Decision: Web tab URLs are saved to `localStorage` per folder root (`squidcode.webTabs:<root>`, in open order) whenever a tab opens, navigates or is closed, and reopened on `workspace:changed` without taking focus. A folder switch must not wipe the old folder's list: `closeAll` emits `doc:closed` while the doc is still in the store, a single close after removal, and the web store uses that to skip saving during bulk closes. `web:N` ids are not persisted, only URLs.
Consequences: this supersedes the "Web tabs aren't restored" note above. The app does not yet reopen the last folder on launch (M4), so Web tabs return when the folder is opened again; M4 session restore should only add the folder and file tabs. `localStorage` is per webview profile, which is fine for a single-user app.

## 2026-10-28 — Dev servers die with the app: Windows Job Object, kill-on-close

Context: `RunEvent::Exit` and `taskkill` only help on a normal quit; a crash or force-kill of SquidCode left the server (and its children) running.
Decision: each dev-server start creates a Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` (`src-tauri/src/job.rs`, `windows-sys`) and assigns the shell process to it; descendants join automatically. Windows closes the handle when SquidCode's process ends for any reason and kills the whole job. Stop drops the job. `taskkill /T /F` remains only as a fallback if the job could not be created or assigned; non-Windows has no job and kills the child directly.
Consequences: verified by a Rust test (job drop kills `cmd` and its `ping` child with no explicit kill). Remaining gap: the shell is assigned to the job just after spawn, so a grandchild started in that first few microseconds would escape; accepted, since `cmd` needs far longer than that to launch anything. Servers a script deliberately detaches with a job-breakaway are out of scope.

## 2026-10-29 — M4: persistence in localStorage; last folder remembered by Rust

Context: settings, layout, session restore and the last folder all need to survive restarts. The webview must not be able to grant itself folder access.
Decision: UI state (theme, font size, sidebar width/collapse, hidden toggle, open file tabs per folder) goes to `localStorage` through `core/persist.ts`, matching what Web tabs and dev-server commands already did; the Tauri store plugin would add a dependency and a capability for no gain. The last folder is the exception: `pick_folder` writes it to `last-folder.txt` in Rust's config dir and `restore_folder` re-grants only that path, so the webview never supplies a path to be trusted. Session restore skips `web:` tabs (they have their own store), drops files that vanished or became binary, and is gated by `workspace:closing` so a folder switch cannot overwrite the old folder's saved tabs.
Consequences: clearing WebView storage forgets settings and tabs but not the folder. Settings are per-machine, not synced.

## 2026-10-29 — M4: external changes found by polling, not a Rust watcher

Decision: `features/file-watch` calls `stat` on every open file every 2 s (and on window focus), only while the window is visible. A clean tab reloads silently; a dirty tab asks "Keep my version / Reload from disk". Keeping leaves the stored mtime alone, so a later save still gets the existing overwrite prompt, and the same disk mtime is not asked about twice. The editor follows the store's text, so a reload replaces the CodeMirror document (undo history is kept).
Consequences: no `notify` crate and no new Rust surface; latency is up to 2 s without focus changes. The file tree does not refresh on outside changes, and a file deleted on disk is not reported until save.

## 2026-10-29 — M4: preview server fixes (root-absolute paths, unsaved edits)

Decision: a request without the token prefix is served from the folder root only if its `Referer` path contains this run's token, which only our own pages can send; the token stays unguessable, so the scope story is unchanged. Unsaved HTML is pushed to Rust with `preview_buffer` (debounced 400 ms) and served instead of the disk copy for that one file, then cleared when the tab is clean or closed. Markdown `#anchor` links scroll to the heading whose GitHub-style slug matches.
Consequences: a dirty CSS/JS file still shows its saved version in the HTML preview. Referer-less root-absolute requests (e.g. some `fetch` policies) still 404.

## 2026-10-29 — M4: installer is NSIS only, icon generated from SVG

Decision: `bundle.targets` is `["nsis"]` (one per-user `.exe` installer; MSI needs WiX and a second download). The icon source is `src-tauri/icon-src/icon.svg`; regenerate with `npx tauri icon src-tauri/icon-src/icon.svg` and delete the unused `android/` and `ios/` output.
