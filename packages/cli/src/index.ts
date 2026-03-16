#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('foundry-x')
  .description('AI-human collaboration harness for Git repositories')
  .version('0.1.1');

program.addCommand(initCommand());
program.addCommand(syncCommand());
program.addCommand(statusCommand());

program.parse();
