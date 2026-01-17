import blessed from 'blessed';
import type { PackageState } from '../types.js';

export function createLogView(screen: blessed.Widgets.Screen): blessed.Widgets.Log {
  const logView = blessed.log({
    parent: screen,
    label: ' Logs ',
    left: '25%',
    top: 0,
    width: '75%',
    height: '100%-1',
    border: {
      type: 'line',
    },
    style: {
      border: {
        fg: 'blue',
      },
      label: {
        fg: 'blue',
      },
    } as any,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '│',
      style: 'blue',
    } as any,
    scrollOnInput: false,
  });

  return logView;
}

export function updateLogView(
  logView: blessed.Widgets.Log,
  state: PackageState | undefined,
  autoScroll: boolean
): void {
  logView.setContent('');

  if (!state) {
    logView.setLabel(' Logs ');
    return;
  }

  logView.setLabel(` Logs - ${state.package.name} `);

  for (const line of state.logs) {
    logView.add(line);
  }

  if (autoScroll) {
    logView.setScrollPerc(100);
  }
}

export function appendLog(
  logView: blessed.Widgets.Log,
  currentPackage: string | undefined,
  packageName: string,
  line: string,
  autoScroll: boolean
): void {
  if (currentPackage === packageName) {
    logView.add(line);
    if (autoScroll) {
      logView.setScrollPerc(100);
    }
  }
}
