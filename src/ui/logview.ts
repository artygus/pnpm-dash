import blessed from 'reblessed';
import type { PackageState } from '../types.js';
import { MAX_LOG_LINES } from '../constants.js';

export class LogView {
  private element: blessed.Widgets.Log;

  constructor(screen: blessed.Widgets.Screen, autoScroll: boolean) {
    this.element = blessed.log({
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
  }

  updateState(state: PackageState | undefined): void {
    if (!state) {
      this.element.setLabel(' Logs ');
      this.element.setContent('');
      this.element.setScroll(0);
      return;
    }

    this.element.setLabel(` Logs - ${state.package.name} `);
    this.element.setContent(state.logs.toArray().join('\n'));
    this.element.setScroll(0);
  }

  appendLines(lines: string[]): void {
    this.element.add(lines.join("\n"));
  }

  setAutoScroll(enabled: boolean): void {
    this.element.scrollOnInput = enabled;

    if (enabled) {
      this.element.setScrollPerc(100);
    }
  }

  expand(): void {
    this.element.left = 0;
    this.element.width = '100%';
    this.element.border = { type: 'line', top: true, left: false, right: false, bottom: false } as any;
  }

  shrink(): void {
    this.element.left = '25%';
    this.element.width = '75%';
    this.element.border = { type: 'line', top: true, left: true, right: true, bottom: true } as any;
  }

  scrollLine(direction: 1 | -1): void {
    this.element.scroll(direction);
  }

  scrollPage(direction: 1 | -1): void {
    const pageSize = (this.element.height as number) - 2;
    this.element.scroll(direction * pageSize);
  }

  clearLogs(): void {
    this.element.setContent('');
  }

  focus(): void {
    this.element.focus();
  }
}
