# SquidCode — lightweight personal code viewer/editor

Personal-use desktop app (Windows 11 primary). Open a folder, browse its structure, read and edit files, with first-class Markdown editing. Read `docs/VISION.md` before making product decisions.

## Stack
- Tauri 2 (Rust backend, minimal) + Vite + React + TypeScript (strict)
- CodeMirror 6 for all editing/viewing
- `react-markdown` + `remark-gfm` for the Markdown preview
- Zustand for state; plain CSS with design tokens (no UI framework)

## Commands
- `npm install` — install deps
- `npm run tauri dev` — run the app with hot reload
- `npm run build` / `npm run tauri build` — production build
- `npm run typecheck`, `npm run lint`, `npm test`

## Principles (follow these)
1. **Keep it small.** Basics first. Do not add features not in `docs/ROADMAP.md` without asking.
2. **Extensible by registry, not by edits.** New capabilities (file-type viewers, sidebar panels, commands) register themselves in `src/features/registry.ts`. Adding a feature should mean adding a folder under `src/features/`, not touching core files. See `docs/ARCHITECTURE.md`.
3. **Thin Rust.** Rust only does filesystem access and window plumbing, exposed as a few typed commands. UI logic lives in TypeScript.
4. **Never lose user data.** Writes are atomic (temp file + rename); warn on unsaved changes; detect external file changes before overwriting.
5. **Look matters.** Follow `docs/DESIGN.md` tokens. No hard-coded colors or spacing in components.
6. **Small files, clear names.** Prefer many small modules over a few large ones. Comment the why, not the what.

## Layout
```
src/
  app/          shell, layout, providers
  core/         fs API wrapper, state stores, event bus (stable, rarely edited)
  features/     file-tree/, editor/, markdown-preview/, tabs/, ... (+ registry.ts)
  ui/           shared primitives (Button, Splitter, Icon, ...)
  styles/       tokens.css, base.css
src-tauri/      Rust: fs commands, capabilities, tauri.conf.json
docs/           VISION, ARCHITECTURE, DESIGN, ROADMAP, DECISIONS
```

## Workflow
- Work one roadmap milestone at a time; finish, verify the app runs, summarize, then stop for review.
- Record non-obvious decisions in `docs/DECISIONS.md` (short ADR entries).
- Tauri fs access must be scoped via capabilities to user-opened folders only.
