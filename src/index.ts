#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { loadConfig, validateCredentials } from './config/index.js';
import { GitHubAnalyzer } from './agents/github-analyzer.js';
import { createAnalysisReport } from './models/analysis-report.js';
import { formatAsMarkdown, formatAsJson } from './tools/shared/report.js';

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
    const startTime = Date.now();
    try {
      if (options.verbose) {
        console.log(chalk.blue('🔍 Analyzing GitHub organization...'));
      }

      // Load and validate configuration
      const config = loadConfig();
      validateCredentials(config, 'github');

      if (!config.github?.token) {
        throw new Error('GitHub token not found in configuration');
      }

      // Initialize GitHub analyzer
      const analyzer = new GitHubAnalyzer(config.github.token);

      if (options.verbose) {
        console.log(chalk.gray(`Fetching data for organization: ${options.org}`));
      }

      // Run analysis
      const result = await analyzer.analyze(options.org, parseInt(options.days, 10));

      if (options.verbose) {
        console.log(
          chalk.gray(`Found ${result.metrics.length} metrics and ${result.recommendations.length} recommendations`)
        );
      }

      // Create report
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(options.days, 10));

      const totalCost = result.metrics.reduce((sum, m) => sum + m.cost.amount, 0);
      const totalSavings = result.recommendations.reduce((sum, r) => sum + r.savings.monthly, 0);

      const topDrivers = result.metrics
        .sort((a, b) => b.cost.amount - a.cost.amount)
        .slice(0, 3)
        .map((m) => ({
          description: m.resourceName,
          monthlyCost: m.cost.amount,
          percentage: (m.cost.amount / totalCost) * 100,
        }));

      const topRecs = result.recommendations
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
        .map((r) => ({
          title: r.title,
          monthlySavings: r.savings.monthly,
          priority: r.priority,
        }));

      const report = createAnalysisReport({
        scope: {
          platforms: ['github'],
          organizations: [options.org],
          dateRange: { start: startDate, end: endDate },
        },
        summary: {
          totalMonthlyCost: totalCost,
          topCostDrivers: topDrivers,
          topRecommendations: topRecs,
          totalPotentialSavings: {
            monthly: totalSavings,
            annual: totalSavings * 12,
          },
        },
        metrics: result.metrics,
        costBreakdowns: {
          byPlatform: [],
          byCategory: [],
          byOrgUnit: [],
        },
        recommendations: result.recommendations,
        diagnostics: [],
      });

      // Update metadata
      report.metadata.duration = (Date.now() - startTime) / 1000;

      // Format and output
      const output =
        options.format === 'json' ? formatAsJson(report) : formatAsMarkdown(report);

      if (options.output) {
        writeFileSync(options.output, output);
        console.log(chalk.green(`✓ Report saved to ${options.output}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
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
