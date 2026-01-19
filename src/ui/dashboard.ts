import blessed from 'reblessed';
import { Runner } from '../runner.js';
import type { WorkspacePackage, DashboardState } from '../types.js';
import { createSidebar, updateSidebarItems } from './sidebar.js';
import { 
  createLogView, 
  updateLogView, 
  appendLog, 
  toggleLogAutoScroll, 
  expandLogView,
  collapseLogView 
} from './logview.js';
import { createStatusBar, updateStatusBar } from './statusbar.js';

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private sidebar: blessed.Widgets.ListElement;
  private logView: blessed.Widgets.Log;
  private statusBar: blessed.Widgets.BoxElement;
  private runner: Runner;
  private state: DashboardState;
  private packageNames: string[] = [];
  private copyMode: boolean = false;

  constructor(runner: Runner, packages: WorkspacePackage[]) {
    this.runner = runner;
    this.packageNames = packages.map((p) => p.name);

    this.state = {
      packages: runner.getStates(),
      selectedIndex: 0,
      autoScroll: true,
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
      this.toggleCopyMode();
    });
  }

  private setupRunnerEvents(): void {
    this.runner.on('start', (packageName) => {
      this.refreshSidebar();
      this.screen.render();
    });

    this.runner.on('log', (packageName, line) => {
      appendLog(
        this.logView,
        this.getSelectedPackageName(),
        packageName,
        line,
      );
    });

    this.runner.on('exit', (packageName, code) => {
      this.refreshSidebar();
      this.screen.render();
    });

    this.runner.on('error', (packageName, error) => {
      this.refreshSidebar();
      this.screen.render();
    });
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
  }

  private selectPrev(): void {
    if (this.state.selectedIndex > 0) {
      this.state.selectedIndex--;
    } else if (this.packageNames.length > 1) {
      this.state.selectedIndex = this.packageNames.length - 1;
    }
    this.refreshSidebar();
    this.refreshLogView();
  }

  private clearSelected(): void {
    const state = this.getSelectedState();
    if (state) {
      state.logs = [];
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
    updateStatusBar(this.statusBar, this.state.autoScroll, this.copyMode);
    this.screen.render();
  }

  private toggleCopyMode(): void {
    this.copyMode = !this.copyMode;

    if (this.copyMode) {
      this.sidebar.hide();
      expandLogView(this.logView);
    } else {
      this.sidebar.show();
      collapseLogView(this.logView);
    }

    updateStatusBar(this.statusBar, this.state.autoScroll, this.copyMode);
    this.screen.render();
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
    await this.runner.stopAll();

    this.screen.destroy();
    process.exit(0);
  }

  start(): void {
    this.refreshSidebar();
    this.refreshLogView();
    this.logView.focus();
    this.screen.render();
  }
}
