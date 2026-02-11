import termkit from 'terminal-kit';

export class StatusBar {
  private terminal: termkit.Terminal;

  constructor(terminal: termkit.Terminal) {
    this.terminal = terminal;
  }

  update(): void {
    const y = this.terminal.height;

    this.terminal.moveTo(1, y);
    this.terminal.bgBlue().white();

    const text =
      ' Q:exit  tab:toggle sidebar  q:quit task  r:restart task ' +
      ' R:restart all  j/k:navigate  u/d:scroll  c:clear ';

    // Pad to full width
    const padding = ' '.repeat(Math.max(0, this.terminal.width - text.length));
    this.terminal(text + padding);

    this.terminal.styleReset();
  }
}
