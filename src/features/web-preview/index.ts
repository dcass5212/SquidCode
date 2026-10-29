import type { Feature } from '../types';
import { HtmlPane } from './HtmlPane';
import { OpenWebButton } from './OpenWebButton';
import { openWebTab } from './store';
import { WebTab } from './WebTab';

export const webPreview: Feature = {
  id: 'web-preview',
  fileHandlers: [
    { match: (path) => (/\.html?$/i.test(path) ? 10 : 0), component: HtmlPane },
    // Virtual `web:N` tabs; must outrank the generic editor's catch-all.
    { match: (path) => (path.startsWith('web:') ? 20 : 0), component: WebTab },
  ],
  commands: [
    {
      id: 'web.open',
      title: 'Preview local dev server',
      keybinding: 'Ctrl+Shift+L',
      run: () => openWebTab(),
    },
  ],
  statusBarItems: [{ id: 'web-open', side: 'right', component: OpenWebButton }],
};
