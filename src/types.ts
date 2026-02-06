import type { ResultPromise } from 'execa';
import type { RingBuffer } from './ringbuf.js';

export interface WorkspacePackage {
  name: string;
  path: string;
  scripts: Record<string, string>;
}

export type PackageStatus = 'idle' | 'running' | 'success' | 'error';

export interface PackageState {
  package: WorkspacePackage;
  status: PackageStatus;
  subprocess: ResultPromise | null;
  logs: RingBuffer<string>;
}

export interface DashboardState {
  packages: Map<string, PackageState>;
  selectedIndex: number;
  sidebarHidden: boolean;
}

export interface CLIOptions {
  filter?: string[];
}
