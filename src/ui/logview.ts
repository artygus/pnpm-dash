import termkit from 'terminal-kit';
import type { PackageState } from '../types.js';

export class LogView {
  private terminal: termkit.Terminal;
  private currentState: PackageState | undefined;
  private leftPos: number;
  private width: number;
  private height: number;
  private screenBuffer: any = null;
  private textBuffer: any = null;
  private scrollOffset: number = 0; // 0 = bottom (live mode), positive = scrolled up
  private lastLineCount: number = 0; // Track line count to detect new lines

  constructor(terminal: termkit.Terminal) {
    this.terminal = terminal;
    this.leftPos = Math.floor(terminal.width * 0.25) + 1;
    this.width = terminal.width - this.leftPos + 1;
    this.height = terminal.height - 1;
    this.createBuffers();
  }

  private createBuffers(): void {
    const contentWidth = this.width - 2;
    const contentHeight = this.height - 2;

    this.screenBuffer = new (termkit as any).ScreenBuffer({
      dst: this.terminal,
      width: contentWidth,
      height: contentHeight,
    });

    this.textBuffer = new (termkit as any).TextBuffer({
      dst: this.screenBuffer,
      lineWrapWidth: contentWidth,
    });
  }

  updateState(state: PackageState | undefined): void {
    this.currentState = state;
    this.scrollOffset = 0;
    this.lastLineCount = 0;
    this.renderContent();
  }

  appendLines(newLines: string[]): void {
    if (!this.currentState) return;
    this.renderContent();
  }

  private renderContent(): void {
    const contentHeight = this.height - 2;

    this.drawBorders();

    // Clear screen buffer
    this.screenBuffer.fill({ char: ' ', attr: {} });

    if (!this.currentState) {
      this.screenBuffer.draw({ dst: this.terminal, x: this.leftPos + 1, y: 2 });
      return;
    }

    const lines = this.currentState.logs.toArray();

    if (lines.length === 0) {
      this.screenBuffer.draw({ dst: this.terminal, x: this.leftPos + 1, y: 2 });
      return;
    }

    this.textBuffer.setText(lines.join('\n'), 'ansi');

    const totalLines = this.textBuffer.buffer.length;

    // If scrolled up, adjust offset to compensate for new lines
    if (this.scrollOffset > 0 && this.lastLineCount > 0) {
      const newLinesAdded = totalLines - this.lastLineCount;
      if (newLinesAdded > 0) {
        this.scrollOffset += newLinesAdded;
      }
    }

    const maxScroll = Math.max(0, totalLines - contentHeight);

    // Clamp scrollOffset
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    let offsetY = 0;
    if (this.scrollOffset === 0) {
      // At bottom - show most recent
      if (totalLines > contentHeight) {
        offsetY = -(totalLines - contentHeight);
      }
    } else {
      // Scrolled up
      offsetY = -(totalLines - contentHeight - this.scrollOffset);
    }

    this.textBuffer.draw({ y: offsetY });

    this.screenBuffer.draw({ dst: this.terminal, x: this.leftPos + 1, y: 2 });

    // Update last line count (wrapped) for next append
    this.lastLineCount = totalLines;
  }

  private drawBorders(): void {
    const boxWidth = this.width;

    this.terminal.styleReset();
    this.terminal.blue();

    // Top border
    this.terminal.moveTo(this.leftPos, 1);
    const label = this.currentState
      ? ` Logs - ${this.currentState.package.name} `
      : ' Logs ';
    this.terminal('┌─' + label + ' ');
    this.terminal('─'.repeat(Math.max(0, boxWidth - label.length - 4)));
    this.terminal('┐');

    // Side borders
    for (let i = 2; i < this.height; i++) {
      this.terminal.moveTo(this.leftPos, i);
      this.terminal('│');
      this.terminal.moveTo(this.leftPos + boxWidth - 1, i);
      this.terminal('│');
    }

    // Bottom border
    this.terminal.moveTo(this.leftPos, this.height);
    this.terminal('└');
    this.terminal('─'.repeat(boxWidth - 2));
    this.terminal('┘');

    this.terminal.styleReset();
  }

  expand(): void {
    this.clearCurrentArea();

    this.leftPos = 1;
    this.width = this.terminal.width;
    this.scrollOffset = 0;
    this.createBuffers();
    this.renderContent();
  }

  shrink(): void {
    this.clearCurrentArea();

    this.leftPos = Math.floor(this.terminal.width * 0.25) + 1;
    this.width = this.terminal.width - this.leftPos + 1;
    this.scrollOffset = 0;
    this.createBuffers();
    this.renderContent();
  }

  private clearCurrentArea(): void {
    this.terminal.styleReset();
    for (let i = 1; i <= this.height; i++) {
      this.terminal.moveTo(this.leftPos, i);
      this.terminal(' '.repeat(this.width));
    }
  }

  scrollLine(direction: 1 | -1): void {
    if (direction === -1) {
      // Scroll up
      this.scrollOffset++;
    } else {
      // Scroll down
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
    }
    this.renderContent();
  }

  scrollPage(direction: 1 | -1): void {
    const pageSize = this.height - 2;

    if (direction === -1) {
      // Page up
      this.scrollOffset += pageSize;
    } else {
      // Page down
      this.scrollOffset = Math.max(0, this.scrollOffset - pageSize);
    }
    this.renderContent();
  }

  clearLogs(): void {
    this.scrollOffset = 0;
    this.renderContent();
  }
}
