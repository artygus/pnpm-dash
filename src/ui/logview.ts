import blessed from 'reblessed';
import type { PackageState } from '../types.js';

export function createLogView(
  screen: blessed.Widgets.Screen,
  autoScroll: boolean,
): blessed.Widgets.Log {
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
    scrollOnInput: autoScroll,
  });

  return logView;
}

export function updateLogView(
  logView: blessed.Widgets.Log,
  state: PackageState | undefined,
): void {
  if (!state) {
    logView.setLabel(' Logs ');
    logView.setContent('');
    logView.setScroll(0);
    return;
  }

  logView.setLabel(` Logs - ${state.package.name} `);
  logView.setContent(state.logs.join('\n'));
  logView.setScroll(0);
}

export function appendLog(
  logView: blessed.Widgets.Log,
  currentPackage: string | undefined,
  packageName: string,
  line: string,
): void {
  if (currentPackage !== packageName) {
    return;
  }

  logView.add(line);
}

export function toggleLogAutoScroll(
  logView: blessed.Widgets.Log,
  autoScroll: boolean,
): void {
  logView.scrollOnInput = autoScroll;

  if (autoScroll) {
    logView.setScrollPerc(100);
  }
}