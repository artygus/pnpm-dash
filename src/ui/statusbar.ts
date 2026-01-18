import blessed from 'reblessed';

export function createStatusBar(screen: blessed.Widgets.Screen): blessed.Widgets.BoxElement {
  const statusBar = blessed.box({
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

  updateStatusBar(statusBar, true);

  return statusBar;
}

export function updateStatusBar(
  statusBar: blessed.Widgets.BoxElement,
  autoScroll: boolean
): void {
  const scrollStatus = autoScroll ? 'ON' : 'OFF';
  statusBar.setContent(
    ` {bold}Q{/bold}:exit  {bold}q{/bold}:quit task  {bold}r{/bold}:restart task  {bold}R{/bold}:restart all  {bold}j/k{/bold}:navigate  {bold}s{/bold}:scroll [${scrollStatus}]`
  );
}
