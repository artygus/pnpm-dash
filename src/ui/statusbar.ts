import blessed from 'reblessed';

export class StatusBar {
  private element: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen) {
    this.element = blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: 'blue',
        fg: 'white',
      },
      tags: true,
    });
  }

  update(): void {
    this.element.setContent(
      ` {bold}Q{/bold}:exit  {bold}tab{/bold}:toggle sidebar ` +
      ` {bold}q{/bold}:quit task  {bold}r{/bold}:restart task ` +
      ` {bold}R{/bold}:restart all  {bold}j/k{/bold}:navigate  {bold}u/d{/bold}:scroll  {bold}c{/bold}:clear `
    );
  }
}
