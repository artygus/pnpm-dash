import { execa, type ResultPromise } from 'execa';
import { EventEmitter } from 'node:events';
import type { WorkspacePackage, PackageState } from './types.js';
import { RingBuffer } from './ringbuf.js';

const MAX_LOG_LINES = 10000;

export class Runner extends EventEmitter {
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
    let state = this.states.get(pkg.name);

    if (state) {
      if (state.subprocess && state.subprocess.exitCode == null) {
        console.error(`${pkg.name} subprocess is still running`, state!.subprocess!.pid);
        return;
      }
      state.status = 'running';
    } else {
      state = {
        package: pkg,
        status: 'running',
        subprocess: null,
        logs: new RingBuffer<string>(MAX_LOG_LINES),
      };
      this.states.set(pkg.name, state);
    }

    const subprocess = execa('pnpm', ['run', this.scriptName], {
      cwd: pkg.path,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
      all: true,
      buffer: false,
      reject: false,
      cleanup: false,
      detached: true,
    });

    state.subprocess = subprocess;
    this.emit('start', pkg.name);

    subprocess.all.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line) {
          state.logs.push(line);
          this.emit('log', pkg.name, line);
        }
      }
    });

    subprocess.then((result) => {
      state.status = result.exitCode === 0 ? 'success' : 'error';
      state.subprocess = null;
      this.emit('exit', pkg.name, result.exitCode ?? null);
    }).catch((error) => {
      state.status = 'error';
      state.logs.push(`Error: ${error.message}`);
      state.subprocess = null;
      this.emit('error', pkg.name, error);
    });
  }

  private killProcessGroup(pid: number, force: boolean = false): void {
    const signal = force ? 'SIGKILL' : 'SIGTERM';

    try {
      process.kill(-pid, signal);
    } catch {
      // Negative pid will throw on windows, back to SIGTERM
      try {
        process.kill(pid, signal);
      } catch {
        // Ignore
      }
    }
  }

  async restartPackage(packageName: string): Promise<void> {
    const state = this.states.get(packageName);
    if (!state) return;

    await this.stopPackage(packageName);
    this.startPackage(state.package);
  }

  async restartAll(): Promise<void> {
    await this.stopAll();

    for (const state of this.states.values()) {
      this.startPackage(state.package);
    }
  }

  async stopPackage(packageName: string): Promise<void> {
    const state = this.states.get(packageName);
    const subprocess = state?.subprocess;
    if (!subprocess?.pid) return;

    const pid = subprocess.pid;

    this.killProcessGroup(pid);
    const forceKillTimeout = setTimeout(() => {
      this.killProcessGroup(pid, true);
    }, 2000);

    try {
      await subprocess;
    } finally {
      clearTimeout(forceKillTimeout);
    }
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.states.keys()).map((name) => this.stopPackage(name))
    );
  }
}
