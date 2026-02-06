import { Command } from 'commander';
import type { CLIOptions } from './types.js';

interface ParsedCLI {
  scriptName: string;
  options: CLIOptions;
}

export function parseCLI(): ParsedCLI {
  const program = new Command();

  program
    .name('pnpm-dash')
    .description(
      'A TUI dashboard for pnpm workspaces - run scripts across packages with a split-pane interface'
    )
    .version('0.1.3')
    .argument('<script>', 'Script name to run across workspace packages (e.g., dev, start)')
    .option(
      '-F, --filter <pattern...>',
      'Filter packages by name pattern, supports * for wildcard and ! for exclusions',
    )
    .parse();

  const scriptName = program.args[0];
  const options = program.opts<CLIOptions>();

  if (!scriptName) {
    console.error('Error: Script name is required');
    console.error('Usage: pnpm-dash <script> [options]');
    console.error('Example: pnpm-dash dev');
    console.error('Example: pnpm-dash dev -F "*abc"');
    console.error('Example: pnpm-dash dev -F "!*def"');
    process.exit(1);
  }

  return { scriptName, options };
}
