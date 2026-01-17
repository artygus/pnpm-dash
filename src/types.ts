import type { ChildProcess } from 'node:child_process';

export interface WorkspacePackage {
  name: string;
  path: string;
  scripts: Record<string, string>;
}

export type PackageStatus = 'idle' | 'running' | 'success' | 'error';

export interface PackageState {
  package: WorkspacePackage;
  status: PackageStatus;
  process: ChildProcess | null;
  logs: string[];
  exitCode: number | null;
}

export interface DashboardState {
  packages: Map<string, PackageState>;
  selectedIndex: number;
  autoScroll: boolean;
}

export interface CLIOptions {
  filter?: string;
}

export interface RunnerEvents {
  log: (packageName: string, line: string) => void;
  exit: (packageName: string, code: number | null) => void;
  error: (packageName: string, error: Error) => void;
  start: (packageName: string) => void;
}
