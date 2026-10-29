/** Shortcuts that are not registry commands: the shell's own and CodeMirror's defaults. */
export const EXTRA_SHORTCUTS: { title: string; keys: string }[] = [
  { title: 'Toggle sidebar', keys: 'Ctrl+B' },
  { title: 'Find in file', keys: 'Ctrl+F' },
  { title: 'Undo', keys: 'Ctrl+Z' },
  { title: 'Redo', keys: 'Ctrl+Y' },
  { title: 'Select all', keys: 'Ctrl+A' },
  { title: 'Navigate the file tree', keys: 'Arrows, Home, End, Enter' },
];

/** Hand-written overview; update when a feature is added. */
export const FEATURES: { title: string; text: string }[] = [
  {
    title: 'File tree',
    text: 'Open a folder, browse it lazily, toggle hidden folders, and refresh after outside changes.',
  },
  {
    title: 'Editor',
    text: 'Syntax-highlighted editing of any text file with atomic saves, dirty markers and an unsaved-changes guard.',
  },
  {
    title: 'Markdown',
    text: 'Source, split or preview view with GFM tables and task lists, code highlighting, relative links and images, and scroll sync.',
  },
  {
    title: 'HTML preview',
    text: 'Edit a page and see it served locally, including unsaved edits and relative assets.',
  },
  {
    title: 'Web tabs',
    text: 'Preview a local dev server (localhost only); tabs return when the folder is reopened.',
  },
  {
    title: 'Dev server',
    text: 'Run a command in the opened folder from the status bar and open the detected URL.',
  },
  {
    title: 'External changes',
    text: 'Files changed outside the app reload automatically, or ask first if you have unsaved edits.',
  },
  {
    title: 'Session',
    text: 'The last folder, its open tabs, layout and settings are restored on launch.',
  },
  { title: 'Settings', text: 'Theme (system, light, dark) and editor font size.' },
];
