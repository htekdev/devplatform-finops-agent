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
  .action((options: {
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

      // TODO: Implement orchestrator agent execution in Phase 6
      logger.warn('Analysis not yet implemented. Phase 1 complete - project foundation ready.');
      logger.info('Next: Implement Phase 2 (GitHub Analyzer Agent)');
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

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
