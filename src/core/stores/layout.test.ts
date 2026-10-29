import { describe, expect, it } from 'vitest';
import { SIDEBAR_MAX, SIDEBAR_MIN, useLayout } from './layout';

describe('layout store', () => {
  it('clamps the sidebar width', () => {
    useLayout.getState().setSidebarWidth(10);
    expect(useLayout.getState().sidebarWidth).toBe(SIDEBAR_MIN);
    useLayout.getState().setSidebarWidth(5000);
    expect(useLayout.getState().sidebarWidth).toBe(SIDEBAR_MAX);
  });

  it('toggles collapse without losing the width', () => {
    useLayout.getState().setSidebarWidth(300);
    useLayout.getState().toggleSidebar();
    expect(useLayout.getState().sidebarCollapsed).toBe(true);
    expect(useLayout.getState().sidebarWidth).toBe(300);
  });
});
