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
    },
    mouse: true,
    scrollbar: {
      ch: '│',
    },
  });

  return logView;
}

export function updateLogView(
  logView: blessed.Widgets.Log,
  state: PackageState | undefined,
  autoScroll: boolean
): void {
  if (!state) {
    logView.setLabel(' Logs ');
    logView.setContent('');
    return;
  }

  logView.setLabel(` Logs - ${state.package.name} `);
  logView.setContent(state.logs.join('\n'));

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
  if (currentPackage !== packageName) {
    return;
  }

  logView.add(line);

  if (autoScroll) {
    logView.setScrollPerc(100);
  }
}
