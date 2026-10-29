# Design

Direction: **clean, minimal, calm** (Notion/Obsidian-adjacent). Content first, chrome quiet.

## Layout

```
┌────────────┬──────────────────────────────────────────┐
│  Sidebar   │  Tab bar                                 │
│  (tree)    ├───────────────────┬──────────────────────┤
│            │  Source editor    │  Live preview (.md)  │
│            │                   │                      │
├────────────┴───────────────────┴──────────────────────┤
│  Status bar: path · line:col · encoding · saved state │
└───────────────────────────────────────────────────────┘
```

- Sidebar resizable and collapsible (Ctrl+B). Splitter between editor and preview is draggable.
- Empty state: friendly "Open a folder" call to action with recent folders later.

## Tokens (define in `src/styles/tokens.css`; components use only these)

- Color roles: `--bg`, `--bg-subtle`, `--bg-hover`, `--border`, `--text`, `--text-muted`, `--accent`, `--danger`, `--selection`. Light and dark sets, switched via `prefers-color-scheme` plus a `data-theme` override.
- Palette feel: neutral greys with one restrained accent (soft blue or indigo). Avoid pure black/white.
- Spacing scale: 4, 8, 12, 16, 24, 32. Radius: 6 (controls), 10 (panels).
- Type: UI in system sans (Segoe UI Variable / Inter); editor in a monospace (Cascadia Code / JetBrains Mono); **preview uses a readable prose style** — 16–17px, line-height ~1.7, max-width ~72ch, clear heading scale, styled code blocks, tables, blockquotes, task lists.
- Motion: 120–180ms ease-out for hover, expand/collapse and panel resize; respect `prefers-reduced-motion`.

## File tree

- Indent guides, chevrons that rotate, folder/file icons (single icon set, e.g. Lucide), current file highlighted with a soft accent tint.
- Folders first, then files, alphabetical, case-insensitive. Dot-folders and ignored folders (`node_modules`, `.git`, `target`, `dist`) dimmed/hidden behind a toggle; dotfiles like `.gitignore` always show.
- `.md` files get a subtle distinguishing icon so docs stand out.

## Tabs

Slim tabs, dirty dot instead of close-x when unsaved, middle-click to close, Ctrl+Tab cycling.

## Accessibility

Keyboard-navigable tree and tabs, visible focus rings, contrast ≥ 4.5:1 in both themes.
