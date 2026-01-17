import { execa, ResultPromise } from 'execa';
import { EventEmitter } from 'node:events';
import type { WorkspacePackage, PackageState } from './types.js';

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
        console.error(`${pkg.name} subprocess is still running`, state!.subprocess!.pid)
        return;
      } else {
        state.status = 'running';
      }
    } else {
      state = {
        package: pkg,
        status: 'running',
        subprocess: null,
        logs: [],
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
    });

    state.subprocess = subprocess;

    this.emit('start', pkg.name);

    const handleLine = (line: string) => {
      state.logs.push(line);
      this.emit('log', pkg.name, line);
    };

    subprocess.all.on('data', (data: Buffer) => {
      data.toString().split('\n').forEach(handleLine);
    });

    subprocess.then((result) => {
      console.error('[subprocess] [then]', result.exitCode);
      state.status = result.exitCode === 0 ? 'success' : 'error';
      state.subprocess = null;
      this.emit('exit', pkg.name, result.exitCode ?? null);
    }).catch((error) => {
      console.error('[subprocess] [catch]', error);
      state.status = 'error';
      state.logs.push(`Error: ${error.message}`);
      state.subprocess = null;
      this.emit('error', pkg.name, error);
    });
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
    const subprocess = this.states.get(packageName)?.subprocess;
    if (!subprocess) return;

    subprocess.kill('SIGTERM');

    const killTimeout = setTimeout(() => {
      subprocess.kill('SIGKILL');
    }, 1000);

    try {
      await subprocess;
    } finally {
      clearTimeout(killTimeout);
    }
  }

  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.states.keys()).map((pkgName) => this.stopPackage(pkgName))
    );
  }
}
