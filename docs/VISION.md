# Vision

**Name:** SquidCode.

## What it is

A fast, lightweight desktop app for one user (me) to open a project folder, see its structure at a glance, and read/edit files, especially Markdown docs. Think "the calm 10% of VS Code plus the nicest Markdown pane."

## Why

Claude Code projects produce lots of `.md` files (CLAUDE.md, specs, notes). I want a clean place to browse and edit them without opening a full IDE.

## Core experience (v1)

1. Open a folder; a file tree shows the structure (expand/collapse, icons, hidden/ignored files dimmed or toggled).
2. Click a file to open it in a tab.
3. `.md` files open in **split view**: source editor on the left, live rendered preview on the right (scroll-synced if cheap).
4. Any other text/code file opens in the same editor with syntax highlighting and is fully editable.
5. Save with Ctrl+S; unsaved indicator on tabs; safe against data loss.
6. Light/dark follows the system, with a manual override.
7. `.html` files open in the same Source / Split / Preview layout, and a Web tab previews my local dev server. A status-bar control runs the project's start command and shows its output, so I can see a site while editing it.

## Non-goals (for now)

A general terminal (the dev-server runner is one command with read-only output, no stdin), general web browsing (only localhost is framed), git UI, debugger, LSP/autocomplete, extensions marketplace, multi-user/sync, mobile. These may come later via the feature registry; do not build them speculatively.

## Quality bar

- Starts in under ~1s; idle memory modest (Tauri, no bundled Chromium).
- Looks intentional: generous spacing, clear hierarchy, smooth but restrained motion.
- Handles large folders (node_modules ignored by default, lazy-load tree children) and large files (graceful read-only fallback past a size threshold).

## Future ideas (parking lot, not scope)

Quick-open (Ctrl+P), search in files, outline/TOC for Markdown, wiki-link navigation, image/PDF preview, recent folders, session restore, git status badges, command palette, Mermaid rendering, export Markdown to PDF.
