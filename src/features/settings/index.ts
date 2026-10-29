import { FONT_SIZE_DEFAULT, useSettings } from '../../core/stores/settings';
import type { Feature } from '../types';
import { SettingsItem } from './SettingsItem';

const bump = (delta: number) => () => {
  const { fontSize, setFontSize } = useSettings.getState();
  setFontSize(fontSize + delta);
};

export const settings: Feature = {
  id: 'settings',
  statusBarItems: [{ id: 'settings', side: 'right', component: SettingsItem }],
  commands: [
    { id: 'view.fontLarger', title: 'Larger editor font', keybinding: 'Ctrl+=', run: bump(1) },
    { id: 'view.fontSmaller', title: 'Smaller editor font', keybinding: 'Ctrl+-', run: bump(-1) },
    {
      id: 'view.fontReset',
      title: 'Reset editor font size',
      keybinding: 'Ctrl+0',
      run: () => useSettings.getState().setFontSize(FONT_SIZE_DEFAULT),
    },
  ],
};
