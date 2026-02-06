import blessed from 'reblessed';
import { Runner } from '../runner.js';
import type { WorkspacePackage, DashboardState } from '../types.js';
import { createSidebar, updateSidebarItems } from './sidebar.js';
import {
  createLogView,
  updateLogView,
  toggleLogAutoScroll,
  expandLogView,
  shrinkLogView
} from './logview.js';
import { createStatusBar, updateStatusBar } from './statusbar.js';

const RENDER_INTERVAL = 33;

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private sidebar: blessed.Widgets.ListElement;
  private logView: blessed.Widgets.Log;
  private statusBar: blessed.Widgets.BoxElement;
  private runner: Runner;
  private state: DashboardState;
  private packageNames: string[] = [];
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private needsRender: boolean = false;
  private pendingLogs: boolean = false;

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

    this.sidebar = createSidebar(this.screen);
    this.logView = createLogView(this.screen, this.state.autoScroll);
    this.statusBar = createStatusBar(this.screen);

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
  }

  private setupRunnerEvents(): void {
    this.runner.on('start', (packageName) => {
      this.refreshSidebar();
      this.needsRender = true;
    });

    this.runner.on('log', (packageName, line) => {
      if (packageName === this.getSelectedPackageName()) {
        this.pendingLogs = true;
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
    if (this.pendingLogs) {
      this.refreshLogView();
      this.pendingLogs = false;
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
    this.pendingLogs = false;
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
    this.pendingLogs = false;
    this.needsRender = true;
  }

  private clearSelected(): void {
    const state = this.getSelectedState();
    if (state) {
      state.logs.clear();
      this.refreshLogView();
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
    toggleLogAutoScroll(this.logView, this.state.autoScroll);
    updateStatusBar(this.statusBar, this.state.autoScroll);
    this.needsRender = true;
  }

  private toggleSidebar(): void {
    this.state.sidebarHidden = !this.state.sidebarHidden;

    if (this.state.sidebarHidden) {
      this.sidebar.hide();
      expandLogView(this.logView);
    } else {
      this.sidebar.show();
      shrinkLogView(this.logView);
    }

    updateStatusBar(this.statusBar, this.state.autoScroll);
    this.needsRender = true;
  }

  private refreshSidebar(): void {
    updateSidebarItems(
      this.sidebar,
      this.state.packages,
      this.state.selectedIndex
    );
  }

  private refreshLogView(): void {
    updateLogView(this.logView, this.getSelectedState());
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
    this.logView.focus();
    this.screen.render();

    this.renderTimer = setInterval(() => {
      this.flushRender();
    }, RENDER_INTERVAL);
  }
}
