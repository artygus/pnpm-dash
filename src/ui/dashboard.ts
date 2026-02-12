import termkit from 'terminal-kit';
import { Runner } from '../runner.js';
import type { WorkspacePackage, DashboardState } from '../types.js';
import { Sidebar } from './sidebar.js';
import { LogView } from './logview.js';
import { StatusBar } from './statusbar.js';

const RENDER_INTERVAL = 33;

export class Dashboard {
  private terminal: termkit.Terminal;
  private sidebar: Sidebar;
  private logView: LogView;
  private statusBar: StatusBar;
  private runner: Runner;
  private state: DashboardState;
  private packageNames: string[] = [];
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private pendingLogs: string[] = [];

  constructor(runner: Runner, packages: WorkspacePackage[]) {
    this.runner = runner;
    this.packageNames = packages.map((p) => p.name);
    this.terminal = termkit.terminal;

    this.state = {
      packages: runner.getStates(),
      selectedIndex: 0,
      sidebarHidden: false,
    };

    this.terminal.fullscreen(true);
    this.terminal.alternateScreenBuffer(true);
    this.terminal.hideCursor();

    this.sidebar = new Sidebar(this.terminal);
    this.logView = new LogView(this.terminal);
    this.statusBar = new StatusBar(this.terminal);

    this.setupKeyBindings();
    this.setupRunnerEvents();
    this.setupResizeHandler();
  }

  private setupKeyBindings(): void {
    this.terminal.grabInput({ mouse: 'motion' });

    this.terminal.on('key', (name: string) => {
      switch (name) {
        case 'CTRL_C':
            this.quit();
            break;
        case 'q':
          this.stopSelected();
          break;
        case 'Q':
          this.quit();
          break;
        case 'j':
        case 'DOWN':
          this.selectNext();
          break;
        case 'k':
        case 'UP':
          this.selectPrev();
          break;
        case 'r':
          this.restartSelected();
          break;
        case 'R':
          this.restartAll();
          break;
        case 'c':
          this.clearSelected();
          break;
        case 'TAB':
          this.toggleSidebar();
          break;
        case 'u':
          this.scrollLogUp();
          break;
        case 'd':
          this.scrollLogDown();
          break;
        case 'U':
          this.scrollLogPageUp();
          break;
        case 'D':
          this.scrollLogPageDown();
          break;
      }
    });
  }

  private setupResizeHandler(): void {
    this.terminal.on('resize', () => {
      this.terminal.clear();

      this.sidebar = new Sidebar(this.terminal);
      this.logView = new LogView(this.terminal);
      this.statusBar = new StatusBar(this.terminal);

      if (this.state.sidebarHidden) {
        this.sidebar.hide();
        this.logView.expand();
      }

      this.refreshSidebar();
      this.refreshLogView();
      this.refreshStatusBar();
    });
  }

  private setupRunnerEvents(): void {
    this.runner.on('start', (packageName) => {
      this.refreshSidebar();
    });

    this.runner.on('log', (packageName, line) => {
      if (packageName === this.getSelectedPackageName()) {
        this.pendingLogs.push(line);
      }
    });

    this.runner.on('exit', (packageName, code) => {
      this.refreshSidebar();
    });

    this.runner.on('error', (packageName, error) => {
      this.refreshSidebar();
    });
  }

  private flushRender(): void {
    if (this.pendingLogs.length > 0) {
      this.logView.appendLines(this.pendingLogs);
      this.pendingLogs = [];
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
  }

  private clearSelected(): void {
    const state = this.getSelectedState();
    if (state) {
      state.logs.clear();
      this.logView.clearLogs();
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

  private toggleSidebar(): void {
    this.state.sidebarHidden = !this.state.sidebarHidden;
    if (this.state.sidebarHidden) {
      this.sidebar.hide();
      this.logView.expand();
    } else {
      this.logView.shrink();
      this.sidebar.show();
    }
  }

  private scrollLogUp(): void {
    this.logView.scrollLine(-1);
  }

  private scrollLogDown(): void {
    this.logView.scrollLine(1);
  }

  private scrollLogPageUp(): void {
    this.logView.scrollPage(-1);
  }

  private scrollLogPageDown(): void {
    this.logView.scrollPage(1);
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
    this.statusBar.update();
  }

  async quit(): Promise<void> {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }

    await this.runner.stopAll();

    this.terminal.fullscreen(false);
    this.terminal.processExit(0);
  }

  start(): void {
    this.refreshSidebar();
    this.refreshLogView();
    this.refreshStatusBar();

    this.renderTimer = setInterval(() => this.flushRender(), RENDER_INTERVAL);
  }
}
