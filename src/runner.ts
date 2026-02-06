import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { WorkspacePackage, PackageState } from './types.js';
import { RingBuffer } from './ringbuf.js';
import { MAX_LOG_LINES } from './constants.js';

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

    const cmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const subprocess = spawn(cmd, ['run', this.scriptName], {
      cwd: pkg.path,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    state.subprocess = subprocess;
    this.emit('start', pkg.name);

    const handleData = (data: Buffer) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line) {
          state.logs.push(line);
          this.emit('log', pkg.name, line);
        }
      }
    };

    subprocess.stdout?.on('data', handleData);
    subprocess.stderr?.on('data', handleData);

    subprocess.on('close', (code) => {
      state.status = code === 0 ? 'success' : 'error';
      state.subprocess = null;
      this.emit('exit', pkg.name, code);
    });

    subprocess.on('error', (error) => {
      state.status = 'error';
      state.subprocess = null;

      const logLine = `Error: ${error.message}`;
      state.logs.push(logLine);
      this.emit('log', pkg.name, logLine);
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

    return new Promise((resolve) => {
      const forceKillTimeout = setTimeout(() => {
        this.killProcessGroup(pid, true);
      }, 2000);

      subprocess.once('close', () => {
        clearTimeout(forceKillTimeout);
        resolve();
      });

      this.killProcessGroup(pid);
    });
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.states.keys()).map((name) => this.stopPackage(name))
    );
  }
}
