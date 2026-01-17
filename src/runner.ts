import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { WorkspacePackage, PackageState, RunnerEvents } from './types.js';

export class Runner extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private states: Map<string, PackageState> = new Map();
  private scriptName: string;

  constructor(scriptName: string) {
    super();
    this.scriptName = scriptName;
  }

  getStates(): Map<string, PackageState> {
    return this.states;
  }

  start(packages: WorkspacePackage[]): void {
    for (const pkg of packages) {
      this.startPackage(pkg);
    }
  }

  startPackage(pkg: WorkspacePackage): void {
    const state: PackageState = {
      package: pkg,
      status: 'running',
      process: null,
      logs: [],
      exitCode: null,
    };
    this.states.set(pkg.name, state);

    const child = spawn('pnpm', ['run', this.scriptName], {
      cwd: pkg.path,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    state.process = child;
    this.processes.set(pkg.name, child);

    this.emit('start', pkg.name);

    const handleData = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          state.logs.push(line);
          this.emit('log', pkg.name, line);
        }
      }
    };

    child.stdout?.on('data', handleData);
    child.stderr?.on('data', handleData);

    child.on('close', (code) => {
      state.exitCode = code;
      state.status = code === 0 ? 'success' : 'error';
      state.process = null;
      this.processes.delete(pkg.name);
      this.emit('exit', pkg.name, code);
    });

    child.on('error', (error) => {
      state.status = 'error';
      state.logs.push(`Error: ${error.message}`);
      this.emit('error', pkg.name, error);
    });
  }

  restartPackage(packageName: string): void {
    const state = this.states.get(packageName);
    if (!state) return;

    this.stopPackage(packageName);

    setTimeout(() => {
      state.logs = [];
      state.exitCode = null;
      this.startPackage(state.package);
    }, 100);
  }

  restartAll(): void {
    for (const [name] of this.states) {
      this.restartPackage(name);
    }
  }

  stopPackage(packageName: string): void {
    const child = this.processes.get(packageName);
    if (child) {
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.killed === false) {
          child.kill('SIGKILL');
        }
      }, 2000);
    }
  }

  stopAll(): void {
    for (const [name, child] of this.processes) {
      child.kill('SIGTERM');
    }

    setTimeout(() => {
      for (const [name, child] of this.processes) {
        if (child.killed === false) {
          child.kill('SIGKILL');
        }
      }
    }, 2000);
  }

  on<K extends keyof RunnerEvents>(event: K, listener: RunnerEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof RunnerEvents>(
    event: K,
    ...args: Parameters<RunnerEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
