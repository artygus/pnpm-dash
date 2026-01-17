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

export function filterPackages(
  packages: WorkspacePackage[],
  scriptName: string,
  filterPattern?: string
): WorkspacePackage[] {
  let filtered = packages.filter((pkg) => pkg.scripts[scriptName]);

  if (filterPattern) {
    const pattern = filterPattern.toLowerCase();
    filtered = filtered.filter((pkg) => {
      const name = pkg.name.toLowerCase();
      if (pattern.includes('*')) {
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*') + '$'
        );
        return regex.test(name);
      }
      return name.includes(pattern);
    });
  }

  return filtered;
}
