import type { Feature } from '../types';
import { DevServerItem } from './DevServerItem';
import './store'; // starts listening for the dev server's output events

export const devServer: Feature = {
  id: 'dev-server',
  statusBarItems: [{ id: 'dev-server', side: 'right', component: DevServerItem }],
};
