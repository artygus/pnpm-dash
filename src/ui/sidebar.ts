import termkit from 'terminal-kit';
import type { PackageState, PackageStatus } from '../types.js';

const STATUS_ICONS: Record<PackageStatus, { icon: string; color: string }> = {
  idle: { icon: '○', color: 'gray' },
  running: { icon: '●', color: 'green' },
  success: { icon: '✓', color: 'blue' },
  error: { icon: '✘', color: 'red' },
};

export class Sidebar {
  private terminal: termkit.Terminal;
  private visible: boolean = true;
  private width: number;
  private items: Array<{ name: string; status: PackageStatus }> = [];
  private selectedIndex: number = 0;

  constructor(terminal: termkit.Terminal) {
    this.terminal = terminal;
    this.width = Math.floor(terminal.width * 0.25);
  }

  updateItems(states: Map<string, PackageState>, selectedIndex: number): void {
    this.items = [];
    for (const [name, state] of states) {
      this.items.push({ name, status: state.status });
    }
    this.selectedIndex = selectedIndex;
    this.render();
  }

  private render(): void {
    if (!this.visible) return;

    const height = this.terminal.height - 1; // Reserve bottom line for status bar
    const boxWidth = this.width;

    // Draw border
    this.terminal.styleReset();
    this.terminal.blue();

    // Top border
    this.terminal.moveTo(1, 1);
    this.terminal('┌─ Packages ');
    this.terminal('─'.repeat(Math.max(0, boxWidth - 13)));
    this.terminal('┐');

    // Side borders
    for (let i = 2; i < height; i++) {
      this.terminal.moveTo(1, i);
      this.terminal('│');
      this.terminal.moveTo(boxWidth, i);
      this.terminal('│');
    }

    // Bottom border
    this.terminal.moveTo(1, height);
    this.terminal('└');
    this.terminal('─'.repeat(boxWidth - 2));
    this.terminal('┘');

    // Draw items
    const contentHeight = height - 3; // Exclude borders and label
    const startY = 2;

    for (let i = 0; i < Math.min(this.items.length, contentHeight); i++) {
      const item = this.items[i];
      const y = startY + i;
      const isSelected = i === this.selectedIndex;

      // Clear the line first
      this.terminal.moveTo(2, y);
      this.terminal.styleReset();
      this.terminal(' '.repeat(boxWidth - 2));
      this.terminal.moveTo(2, y);

      if (isSelected) {
        this.terminal.bgBrightBlue().white();
      }

      const { icon, color } = STATUS_ICONS[item.status];

      if (!isSelected) {
        const [r, g, b] = this.getColorCode(color);
        this.terminal.colorRgb(r, g, b);
      }

      this.terminal(icon);

      if (isSelected) {
        this.terminal.styleReset().bgBrightBlue().white();
      } else {
        this.terminal.styleReset();
      }

      this.terminal(' ');
      const maxNameLength = boxWidth - 5;
      const displayName = item.name.length > maxNameLength
        ? item.name.substring(0, maxNameLength - 1) + '…'
        : item.name;
      this.terminal(displayName);

      // Pad to full width when selected
      if (isSelected) {
        const textLength = 2 + displayName.length; // icon + space + text
        const padding = Math.max(0, boxWidth - 2 - textLength);
        this.terminal(' '.repeat(padding));
      }

      this.terminal.styleReset();
    }
  }

  private getColorCode(color: string): [number, number, number] {
    const colors: Record<string, [number, number, number]> = {
      gray: [128, 128, 128],
      green: [0, 255, 0],
      blue: [0, 128, 255],
      red: [255, 0, 0],
    };
    return colors[color] || [255, 255, 255];
  }

  show(): void {
    this.visible = true;
    this.render();
  }

  hide(): void {
    this.visible = false;
    // Clear the sidebar area
    const height = this.terminal.height - 1;
    this.terminal.styleReset();
    for (let i = 1; i <= height; i++) {
      this.terminal.moveTo(1, i);
      this.terminal(' '.repeat(this.width));
    }
  }
}
