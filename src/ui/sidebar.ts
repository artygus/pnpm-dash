import blessed from 'reblessed';
import type { PackageState, PackageStatus } from '../types.js';

const STATUS_ICONS: Record<PackageStatus, { icon: string; color: string }> = {
  idle: { icon: '○', color: 'gray' },
  running: { icon: '●', color: 'green' },
  success: { icon: '✓', color: 'blue' },
  error: { icon: '✘', color: 'red' },
};

export function createSidebar(screen: blessed.Widgets.Screen): blessed.Widgets.ListElement {
  const sidebar = blessed.list({
    parent: screen,
    label: ' Packages ',
    left: 0,
    top: 0,
    width: '25%',
    height: '100%-1',
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'blue',
      },
      selected: {
        bg: 'blue',
        fg: 'white',
      },
      item: {
        fg: 'white',
      },
      label: {
        fg: 'blue',
      } as any // invalid type from @types/blessed :|
    },
    mouse: true,
    scrollable: true,
    scrollbar: {
      ch: '│',
    },
    tags: true,
  });

  return sidebar;
}

export function updateSidebarItems(
  sidebar: blessed.Widgets.ListElement,
  states: Map<string, PackageState>,
  selectedIndex: number
): void {
  const items: string[] = [];

  for (const [name, state] of states) {
    const { icon, color } = STATUS_ICONS[state.status];
    items.push(`{${color}-fg}${icon}{/${color}-fg} ${name}`);
  }

  sidebar.setItems(items);
  sidebar.select(selectedIndex);
}
