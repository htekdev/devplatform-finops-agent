#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync } from 'fs';
import { loadConfig, validateCredentials } from './config/index.js';
import { GitHubAnalyzer } from './agents/github-analyzer.js';
import { AzDOAnalyzer } from './agents/azdo-analyzer.js';
import { Supervisor } from './agents/supervisor.js';
import { CostCalculator } from './agents/cost-calculator.js';
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

      // Calculate cost breakdowns
      const costCalculator = new CostCalculator();
      const costBreakdowns = costCalculator.calculateCostBreakdowns(result.metrics);

      const topDrivers = result.metrics
        .sort((a, b) => b.cost.amount - a.cost.amount)
        .slice(0, 3)
        .map((m) => ({
          description: m.resourceName,
          monthlyCost: m.cost.amount,
          percentage: totalCost > 0 ? (m.cost.amount / totalCost) * 100 : 0,
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
        costBreakdowns,
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
    const startTime = Date.now();
    try {
      if (options.verbose) {
        console.log(chalk.blue('🔍 Analyzing Azure DevOps organization...'));
      }

      // Load and validate configuration
      const config = loadConfig();
      validateCredentials(config, 'azdo');

      if (!config.azureDevOps?.pat) {
        throw new Error('Azure DevOps PAT not found in configuration');
      }

      // Construct organization URL
      const orgUrl = options.org.startsWith('https://')
        ? options.org
        : `https://dev.azure.com/${options.org}`;

      // Initialize Azure DevOps analyzer
      const analyzer = new AzDOAnalyzer(
        orgUrl,
        config.azureDevOps.pat,
        config.thresholds?.inactiveDays
      );

      if (options.verbose) {
        console.log(chalk.gray(`Fetching data for organization: ${options.org}`));
      }

      // Run analysis
      const result = await analyzer.analyze(options.org, parseInt(options.days, 10));

      if (options.verbose) {
        console.log(
          chalk.gray(
            `Found ${result.metrics.length} metrics and ${result.recommendations.length} recommendations`
          )
        );
      }

      // Create report
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(options.days, 10));

      const totalCost = result.metrics.reduce((sum, m) => sum + m.cost.amount, 0);
      const totalSavings = result.recommendations.reduce((sum, r) => sum + r.savings.monthly, 0);

      // Calculate cost breakdowns
      const costCalculator2 = new CostCalculator();
      const costBreakdowns2 = costCalculator2.calculateCostBreakdowns(result.metrics);

      const topDrivers = result.metrics
        .sort((a, b) => b.cost.amount - a.cost.amount)
        .slice(0, 3)
        .map((m) => ({
          description: m.resourceName,
          monthlyCost: m.cost.amount,
          percentage: totalCost > 0 ? (m.cost.amount / totalCost) * 100 : 0,
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
          platforms: ['azure-devops'],
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
        costBreakdowns: costBreakdowns2,
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
  .command('all')
  .description('Analyze both GitHub and Azure DevOps')
  .requiredOption('--github-org <name>', 'GitHub organization name')
  .requiredOption('--azdo-org <name>', 'Azure DevOps organization name')
  .option('--days <number>', 'Analysis period in days', '30')
  .option('--format <type>', 'Output format: json, markdown', 'markdown')
  .option('--output <path>', 'Output file path')
  .option('--verbose', 'Show detailed progress')
  .action(async (options) => {
    try {
      if (options.verbose) {
        console.log(chalk.blue('🔍 Analyzing both platforms...'));
      }

      // Load and validate configuration
      const config = loadConfig();
      validateCredentials(config, 'all');

      // Initialize supervisor
      const supervisor = new Supervisor(config);

      if (options.verbose) {
        console.log(
          chalk.gray(`Analyzing GitHub (${options.githubOrg}) and Azure DevOps (${options.azdoOrg})`)
        );
      }

      // Run combined analysis
      const report = await supervisor.analyzeAll(
        options.githubOrg,
        options.azdoOrg,
        parseInt(options.days, 10)
      );

      if (options.verbose) {
        console.log(
          chalk.gray(
            `Found ${report.metrics.length} total metrics and ${report.recommendations.length} recommendations`
          )
        );
      }

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

program.parse();
