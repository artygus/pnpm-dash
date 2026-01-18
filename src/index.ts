#!/usr/bin/env node

import { parseCLI } from './cli.js';
import { discoverWorkspace, filterPackages } from './workspace.js';
import { Runner } from './runner.js';
import { Dashboard } from './ui/dashboard.js';

async function main() {
  const { scriptName, options } = parseCLI();

  console.log(`Discovering pnpm workspace...`);

  let root: string;
  let packages;

  try {
    const workspace = await discoverWorkspace();
    root = workspace.root;
    packages = workspace.packages;
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const filtered = filterPackages(packages, scriptName, options.filter);

  if (filtered.length === 0) {
    const filterInfo = options.filter?.length
      ? ` matching filters: ${options.filter.join(', ')}`
      : '';
    console.error(`No packages found with script "${scriptName}"${filterInfo}`);
    process.exit(1);
  }

  console.log(
    `Found ${filtered.length} package(s) with "${scriptName}" script:`
  );
  for (const pkg of filtered) {
    console.log(`  - ${pkg.name}`);
  }
  console.log();

  const runner = new Runner(scriptName);
  const dashboard = new Dashboard(runner, filtered);

  runner.start(filtered);
  dashboard.start();

  process.on('SIGINT', async () => await dashboard.quit())
  process.on('SIGTERM', async () => await dashboard.quit())
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
