import type { Feature } from '../types';
import { HelpItem } from './HelpItem';

export const help: Feature = {
  id: 'help',
  statusBarItems: [{ id: 'help', side: 'right', component: HelpItem }],
};
