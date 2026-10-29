# Roadmap

Work one milestone at a time. Each ends with: app runs, typecheck/lint pass, short summary, stop for review.

## M0 — Scaffold

- Tauri 2 + Vite + React + TS (strict), ESLint/Prettier, Vitest.
- `tokens.css` with light/dark; app shell with empty sidebar / tab area / status bar.
- Feature registry skeleton and typed `fs.ts` wrapper (stubs OK).
- **Done when:** `npm run tauri dev` opens a styled empty shell that follows system theme.

## M1 — Browse

- Open-folder dialog, lazy file tree, expand/collapse, ignore/hidden toggle, sorted folders-first.
- Sidebar resize/collapse.
- **Done when:** I can open a real project and navigate its structure smoothly.

## M2 — Open & edit ✅

- Tabs; CodeMirror editor for any text file with syntax highlighting (lazy language packs).
- Save (Ctrl+S), dirty indicators, atomic writes, unsaved-changes guard, binary/oversize handling.
- **Done when:** I can edit and save any text file without data-loss risk.

## M3 — Markdown ✅

- `.md` handler: split view with live preview, GFM (tables, task lists), code highlighting in preview, relative links/images, draggable splitter, view-mode toggle (source / split / preview).
- **Done when:** editing a long README feels good and the preview matches expectations.

## M3.5 — Local preview & dev server ✅

- `.html/.htm` handler with the same Source / Split / Preview chrome as Markdown, served from a loopback-only static server so relative assets work.
- Virtual Web tab (URL bar, localhost/127.0.0.1 only) for dev servers; Web tabs are remembered per folder and come back when the folder is reopened.
- Status-bar dev-server popover: run a user-typed command in the opened folder, stream output, offer to open the detected URL; the process tree dies with the app.
- **Done when:** I can edit a page or start my project's server and see it without leaving the app.

## M4 — Polish & robustness ✅

- File watcher with external-change prompt, settings (theme, font size) persisted, restore last folder and open file tabs (Web tabs already restore per folder; reuse that when restoring the folder), keyboard shortcuts, app icon, installer build.
- Known gaps to close: root-absolute references (`/css/a.css`) in served HTML 404; unsaved edits are not shown in the HTML preview until saved; `#anchor` links in the Markdown preview do nothing; sidebar width and hidden toggle are not persisted.
- Small additions: toolbar Save button (enabled when dirty); mouse back/forward buttons switch to the previous/next tab.

## Later (only on request)

Quick-open, search-in-files, outline panel, command palette, Mermaid, git badges, image/PDF viewers.
