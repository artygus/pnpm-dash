import { findWorkspaceDir } from '@pnpm/find-workspace-dir';
import { findWorkspacePackages } from '@pnpm/workspace.find-packages';
import type { WorkspacePackage } from './types.js';

export async function discoverWorkspace(cwd: string = process.cwd()): Promise<{
  root: string;
  packages: WorkspacePackage[];
}> {
  const workspaceRoot = await findWorkspaceDir(cwd);

  if (!workspaceRoot) {
    throw new Error(
      'No pnpm workspace found. Make sure you have a pnpm-workspace.yaml file in your project root.'
    );
  }

  const projects = await findWorkspacePackages(workspaceRoot);

  const packages: WorkspacePackage[] = projects
    .filter((project) => project.manifest.name && project.rootDir !== workspaceRoot)
    .map((project) => ({
      name: project.manifest.name!,
      path: project.rootDir,
      scripts: project.manifest.scripts || {},
    }));

  return { root: workspaceRoot, packages };
}

function globMatch(name: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(name);
}

export function filterPackages(
  packages: WorkspacePackage[],
  scriptName: string,
  filterPatterns?: string[]
): WorkspacePackage[] {
  let targetPgks = packages.filter((pkg) => pkg.scripts[scriptName]);

  if (!filterPatterns?.length) {
    return targetPgks;
  }

  const includePatterns = filterPatterns.filter((p) => !p.startsWith('!'));
  const excludePatterns = filterPatterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1));

  if (includePatterns.length > 0) {
    targetPgks = targetPgks.filter((pkg) =>
      includePatterns.some((pattern) => globMatch(pkg.name, pattern))
    );
  }

  if (excludePatterns.length > 0) {
    targetPgks = targetPgks.filter((pkg) =>
      !excludePatterns.some((pattern) => globMatch(pkg.name, pattern))
    );
  }

  return targetPgks;
}
