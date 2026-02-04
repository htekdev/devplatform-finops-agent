#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('finops-agent')
  .description('Multi-agent system for analyzing GitHub and Azure DevOps platform costs')
  .version('1.0.0');

const analyzeCommand = program.command('analyze').description('Analyze platform costs');

analyzeCommand
  .command('github')
  .description('Analyze GitHub organization costs')
  .requiredOption('--org <name>', 'GitHub organization name')
  .option('--days <number>', 'Analysis period in days', '30')
  .option('--format <type>', 'Output format: json, markdown', 'markdown')
  .option('--output <path>', 'Output file path')
  .option('--verbose', 'Show detailed progress')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Analyzing GitHub organization...'));
    console.log(chalk.yellow('Not yet implemented - coming soon!'));
    console.log('Options:', options);
  });

analyzeCommand
  .command('azdo')
  .description('Analyze Azure DevOps organization costs')
  .requiredOption('--org <name>', 'Azure DevOps organization name')
  .option('--days <number>', 'Analysis period in days', '30')
  .option('--format <type>', 'Output format: json, markdown', 'markdown')
  .option('--output <path>', 'Output file path')
  .option('--verbose', 'Show detailed progress')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Analyzing Azure DevOps organization...'));
    console.log(chalk.yellow('Not yet implemented - coming soon!'));
    console.log('Options:', options);
  });

analyzeCommand
  .command('all')
  .description('Analyze both GitHub and Azure DevOps')
  .requiredOption('--github-org <name>', 'GitHub organization name')
  .requiredOption('--azdo-org <name>', 'Azure DevOps organization name')
  .option('--days <number>', 'Analysis period in days', '30')
  .option('--format <type>', 'Output format: json, markdown', 'markdown')
  .option('--output <path>', 'Output file path')
  .option('--verbose', 'Show detailed progress')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Analyzing both platforms...'));
    console.log(chalk.yellow('Not yet implemented - coming soon!'));
    console.log('Options:', options);
  });

program.parse();
