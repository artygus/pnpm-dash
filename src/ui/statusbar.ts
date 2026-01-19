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
  autoScroll: boolean,
  copyMode: boolean = false
): void {
  const scrollStatus = autoScroll ? 'ON' : 'OFF';

  if (copyMode) {
    statusBar.setContent(
      ` {bold}Tab{/bold}:exit copy mode  Use fn+mouse to select text ` +
      ` {bold}s{/bold}:autoscroll[${scrollStatus}] `
    );
  } else {
    statusBar.setContent(
      ` {bold}Q{/bold}:exit  {bold}q{/bold}:quit task  {bold}r{/bold}:restart task ` +
      ` {bold}R{/bold}:restart all  {bold}j/k{/bold}:navigate  {bold}c{/bold}:clear ` +
      ` {bold}tab{/bold}:copy mode  {bold}s{/bold}:autoscroll [${scrollStatus}] `
    );
  }
}
