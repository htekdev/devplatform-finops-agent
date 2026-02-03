#!/usr/bin/env node
/**
 * CLI entry point for DevPlatform FinOps Agent
 */

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import { loadConfig } from '../utils/config-loader';
import { initLogger, getLogger } from '../utils/logger';
import { initCache } from '../utils/cache';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('devplatform-finops')
  .description('Multi-agent system analyzing GitHub and Azure DevOps platform costs')
  .version('0.1.0');

program
  .command('analyze')
  .description('Run FinOps analysis on configured platforms')
  .option('-c, --config <file>', 'Configuration file path')
  .option('--no-cache', 'Disable caching')
  .option('--cache-ttl <seconds>', 'Cache TTL in seconds', '3600')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .option('--github-only', 'Analyze GitHub only')
  .option('--azdo-only', 'Analyze Azure DevOps only')
  .option('-o, --output <dir>', 'Output directory for reports')
  .option('-f, --format <format>', 'Report format (markdown, json, both)', 'markdown')
  .action(async (options: {
    config?: string;
    cache: boolean;
    cacheTtl: string;
    logLevel: string;
    githubOnly?: boolean;
    azdoOnly?: boolean;
    output?: string;
    format: string;
  }) => {
    // Initialize logger
    const logLevel = (options.logLevel || 'info') as 'debug' | 'info' | 'warn' | 'error';
    initLogger(logLevel);
    const logger = getLogger();

    logger.info('Starting DevPlatform FinOps Analysis...');

    try {
      // Load configuration
      const config = loadConfig({
        configFile: options.config,
        cliOverrides: {
          cache: {
            enabled: options.cache,
            ttl: parseInt(options.cacheTtl, 10),
            directory: './.cache',
          },
          reporting: {
            outputDir: options.output || './reports',
            format: options.format as 'markdown' | 'json' | 'both',
            includeRecommendations: true,
            includeRawData: false,
            maxRecommendations: 10,
          },
        },
      });

      // Initialize cache
      initCache({
        enabled: config.cache?.enabled ?? true,
        ttl: config.cache?.ttl ?? 3600,
        directory: config.cache?.directory ?? './.cache',
      });

      logger.debug('Configuration loaded:', JSON.stringify(config, null, 2));

      // Run FinOps analysis pipeline via orchestrator
      const { runFinOpsAnalysis } = await import('../agents/orchestrator');
      const fs = await import('fs');
      const path = await import('path');

      logger.info('🚀 Running FinOps Analysis Pipeline...\n');

      const result = await runFinOpsAnalysis({
        config,
        githubOnly: options.githubOnly,
        azdoOnly: options.azdoOnly,
      });

      if (!result.success) {
        logger.error('❌ Analysis failed:', result.error);
        process.exit(1);
      }

      logger.info('\n✅ Analysis complete!\n');

      // Save reports to output directory
      const outputDir = options.output || './reports';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

      // Save state to file
      const { StateManager } = await import('../utils/state-manager');
      const stateManager = new StateManager(result.state);
      const statePath = path.join(outputDir, `state-${timestamp}.json`);
      await stateManager.saveToFile(statePath);
      logger.info(`💾 State saved: ${statePath}`);

      // Save Markdown report
      if (result.markdownReport && (options.format === 'markdown' || options.format === 'both')) {
        const mdPath = path.join(outputDir, `finops-report-${timestamp}.md`);
        fs.writeFileSync(mdPath, result.markdownReport, 'utf-8');
        logger.info(`📄 Markdown report saved: ${mdPath}`);
      }

      // Save JSON report
      if (result.jsonReport && (options.format === 'json' || options.format === 'both')) {
        const jsonPath = path.join(outputDir, `finops-report-${timestamp}.json`);
        fs.writeFileSync(jsonPath, result.jsonReport, 'utf-8');
        logger.info(`📊 JSON report saved: ${jsonPath}`);
      }

      // Summary
      logger.info('\n📊 Analysis Summary:');
      if (result.state.costs) {
        logger.info(`   Total Monthly Cost: $${result.state.costs.grandTotal.toFixed(2)}`);
        if (result.state.costs.github && result.state.costs.github.total > 0) {
          logger.info(`   GitHub: $${result.state.costs.github.total.toFixed(2)}`);
        }
        if (result.state.costs.azureDevOps && result.state.costs.azureDevOps.total > 0) {
          logger.info(`   Azure DevOps: $${result.state.costs.azureDevOps.total.toFixed(2)}`);
        }
      }

      const potentialSavings = result.state.recommendations.reduce(
        (sum, r) => sum + r.estimatedSavings,
        0,
      );
      if (potentialSavings > 0) {
        logger.info(`   💰 Potential Monthly Savings: $${potentialSavings.toFixed(2)}`);
        logger.info(`   📋 Recommendations: ${result.state.recommendations.length}`);
      }

      logger.info('\n✨ Done! Check the reports directory for detailed analysis.\n');
    } catch (error) {
      logger.error('Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Validate and display current configuration')
  .option('-c, --config <file>', 'Configuration file path')
  .action((options: { config?: string }) => {
    initLogger('info');
    const logger = getLogger();

    try {
      const config = loadConfig({
        configFile: options.config,
      });

      console.log(JSON.stringify(config, null, 2));
      logger.info('Configuration is valid');
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      process.exit(1);
    }
  });

program
  .command('cache')
  .description('Manage cache')
  .option('--clear', 'Clear all cache entries')
  .option('--stats', 'Show cache statistics')
  .action((options: { clear?: boolean; stats?: boolean }) => {
    initLogger('info');
    const logger = getLogger();

    try {
      const config = loadConfig({});
      const cache = initCache({
        enabled: true,
        ttl: config.cache?.ttl ?? 3600,
        directory: config.cache?.directory ?? './.cache',
      });

      if (options.clear) {
        cache.clear();
        logger.info('Cache cleared');
      } else if (options.stats) {
        const stats = cache.getStats();
        console.log(`Total entries: ${stats.totalEntries}`);
        console.log(`Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      } else {
        logger.warn('No action specified. Use --clear or --stats');
      }
    } catch (error) {
      logger.error('Cache operation failed:', error);
      process.exit(1);
    }
  });

program
  .command('interactive')
  .description('Interactive Q&A mode after analysis')
  .option('-c, --config <file>', 'Configuration file path')
  .option('--state <file>', 'Load previous state file')
  .action(async (options: { config?: string; state?: string }) => {
    initLogger('info');
    const logger = getLogger();

    try {
      const config = loadConfig({
        configFile: options.config,
      });

      const { StateManager } = await import('../utils/state-manager');
      const { runInteractiveMode } = await import('../agents/orchestrator');

      // Load state from file if provided
      let stateManager: typeof StateManager.prototype;
      if (options.state) {
        stateManager = StateManager.loadFromFile(options.state);
        logger.info(`Loaded state from: ${options.state}`);
      } else {
        logger.warn(
          'No state file provided. Please run analysis first or specify --state <file>',
        );
        logger.info('Example: devplatform-finops interactive --state ./reports/state.json');
        process.exit(1);
      }

      const state = stateManager.getState();
      await runInteractiveMode(state, config);
    } catch (error) {
      logger.error('Interactive mode failed:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
