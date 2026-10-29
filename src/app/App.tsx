import { useEffect } from 'react';
import { useSettings } from '../core/stores/settings';
import { useWorkspace } from '../core/stores/workspace';
import { Shell } from './Shell';

export function App() {
  const theme = useSettings((s) => s.theme);
  const fontSize = useSettings((s) => s.fontSize);

  // 'system' removes the override so tokens.css follows prefers-color-scheme.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    void useWorkspace.getState().restoreLastFolder();
  }, []);

  return <Shell />;
}
