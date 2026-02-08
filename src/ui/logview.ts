import blessed from 'reblessed';
import type { PackageState } from '../types.js';
import { MAX_LOG_LINES } from '../constants.js';

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
    scrollback: MAX_LOG_LINES,
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
  logView.setContent(state.logs.toArray().join('\n'));
  logView.setScroll(0);
}

export function appendLog(
  logView: blessed.Widgets.Log,
  lines: string[],
): void {
  logView.add(lines.join("\n"));
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

export function expandLogView(
  logView: blessed.Widgets.Log,
): void {
  logView.left = 0;
  logView.width = '100%';
  logView.border = { type: 'line', top: true, left: false, right: false, bottom: false } as any;
}

export function shrinkLogView(
  logView: blessed.Widgets.Log,
): void {
  logView.left = '25%';
  logView.width = '75%';
  logView.border = { type: 'line', top: true, left: true, right: true, bottom: true } as any;
}

export function scrollLogLine(
  logView: blessed.Widgets.Log,
  direction: 1 | -1,
): void {
  logView.scroll(direction);
}

export function scrollLogPage(
  logView: blessed.Widgets.Log,
  direction: 1 | -1,
): void {
  const pageSize = (logView.height as number) - 2;
  logView.scroll(direction * pageSize);
}