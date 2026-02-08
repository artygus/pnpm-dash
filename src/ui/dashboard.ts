import blessed from 'reblessed';
import { Runner } from '../runner.js';
import type { WorkspacePackage, DashboardState } from '../types.js';
import { Sidebar } from './sidebar.js';
import { LogView } from './logview.js';
import { StatusBar } from './statusbar.js';

const RENDER_INTERVAL = 33;

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private sidebar: Sidebar;
  private logView: LogView;
  private statusBar: StatusBar;
  private runner: Runner;
  private state: DashboardState;
  private packageNames: string[] = [];
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private needsRender: boolean = false;
  private pendingLogs: string[] = [];

  constructor(runner: Runner, packages: WorkspacePackage[]) {
    this.runner = runner;
    this.packageNames = packages.map((p) => p.name);

    this.state = {
      packages: runner.getStates(),
      selectedIndex: 0,
      autoScroll: true,
      sidebarHidden: false,
    };

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'pnpm-dash',
      fullUnicode: true,
    });

    this.sidebar = new Sidebar(this.screen);
    this.logView = new LogView(this.screen, this.state.autoScroll);
    this.statusBar = new StatusBar(this.screen);

    this.setupKeyBindings();
    this.setupRunnerEvents();
  }

  private setupKeyBindings(): void {
    this.screen.key(['S-q', 'C-c'], () => {
      this.quit();
    });

    this.screen.key(['q'], () => {
      this.stopSelected();
    });

    this.screen.key(['j', 'down'], () => {
      this.selectNext();
    });

    this.screen.key(['k', 'up'], () => {
      this.selectPrev();
    });

    this.screen.key(['r'], () => {
      this.restartSelected();
    });

    this.screen.key(['S-r'], () => {
      this.restartAll();
    });

    this.screen.key(['s'], () => {
      this.toggleAutoScroll();
    });

    this.screen.key(['c'], () => {
      this.clearSelected();
    });

    this.screen.key(['tab'], () => {
      this.toggleSidebar();
    });

    this.screen.key(['u'], () => {
      this.scrollLogUp();
    });

    this.screen.key(['d'], () => {
      this.scrollLogDown();
    });

    this.screen.key(['S-u'], () => {
      this.scrollLogPageUp();
    });

    this.screen.key(['S-d'], () => {
      this.scrollLogPageDown();
    });
  }

  private setupRunnerEvents(): void {
    this.runner.on('start', (packageName) => {
      this.refreshSidebar();
      this.needsRender = true;
    });

    this.runner.on('log', (packageName, line) => {
      if (packageName === this.getSelectedPackageName()) {
        this.pendingLogs.push(line);
        this.needsRender = true;
      }
    });

    this.runner.on('exit', (packageName, code) => {
      this.refreshSidebar();
      this.needsRender = true;
    });

    this.runner.on('error', (packageName, error) => {
      this.refreshSidebar();
      this.needsRender = true;
    });
  }

  private flushRender(): void {
    if (this.pendingLogs.length > 0) {
      this.logView.appendLines(this.pendingLogs);
      this.pendingLogs = [];
    }

    if (this.needsRender) {
      this.screen.render();
      this.needsRender = false;
    }
  }

  private getSelectedPackageName(): string | undefined {
    return this.packageNames[this.state.selectedIndex];
  }

  private getSelectedState() {
    const name = this.getSelectedPackageName();
    return name ? this.state.packages.get(name) : undefined;
  }

  private selectNext(): void {
    if (this.state.selectedIndex < this.packageNames.length - 1) {
      this.state.selectedIndex++;
    } else if (this.packageNames.length > 1) {
      this.state.selectedIndex = 0;
    }
    this.refreshSidebar();
    this.refreshLogView();
    this.pendingLogs = [];
    this.needsRender = true;
  }

  private selectPrev(): void {
    if (this.state.selectedIndex > 0) {
      this.state.selectedIndex--;
    } else if (this.packageNames.length > 1) {
      this.state.selectedIndex = this.packageNames.length - 1;
    }
    this.refreshSidebar();
    this.refreshLogView();
    this.pendingLogs = [];
    this.needsRender = true;
  }

  private clearSelected(): void {
    const state = this.getSelectedState();
    if (state) {
      state.logs.clear();
      this.logView.clearLogs();
      this.needsRender = true;
    }
  }

  private stopSelected(): void {
    const name = this.getSelectedPackageName();
    if (name) {
      this.runner.stopPackage(name);
    }
  }

  private restartSelected(): void {
    const name = this.getSelectedPackageName();
    if (name) {
      this.runner.restartPackage(name);
    }
  }

  private restartAll(): void {
    this.runner.restartAll();
  }

  private toggleAutoScroll(): void {
    this.state.autoScroll = !this.state.autoScroll;
    this.logView.setAutoScroll(this.state.autoScroll);
    this.statusBar.update(this.state.autoScroll);
    this.needsRender = true;
  }

  private toggleSidebar(): void {
    this.state.sidebarHidden = !this.state.sidebarHidden;
    if (this.state.sidebarHidden) {
      this.sidebar.hide();
      this.logView.expand();
    } else {
      this.sidebar.show();
      this.logView.shrink();
    }
    this.needsRender = true;
  }

  private scrollLogUp(): void {
    this.logView.scrollLine(-1);
    this.needsRender = true;
  }

  private scrollLogDown(): void {
    this.logView.scrollLine(1);
    this.needsRender = true;
  }

  private scrollLogPageUp(): void {
    this.logView.scrollPage(-1);
    this.needsRender = true;
  }

  private scrollLogPageDown(): void {
    this.logView.scrollPage(1);
    this.needsRender = true;
  }

  private refreshSidebar(): void {
    this.sidebar.updateItems(
      this.state.packages,
      this.state.selectedIndex
    );
  }

  private refreshLogView(): void {
    this.logView.updateState(this.getSelectedState());
  }

  private refreshStatusBar(): void {
    this.statusBar.update(this.state.autoScroll);
  }

  async quit(): Promise<void> {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }

    await this.runner.stopAll();

    this.screen.destroy();
    process.exit(0);
  }

  start(): void {
    this.refreshSidebar();
    this.refreshLogView();
    this.refreshStatusBar();

    this.logView.focus();
    this.screen.render();

    this.renderTimer = setInterval(() => this.flushRender(), RENDER_INTERVAL);
  }
}
