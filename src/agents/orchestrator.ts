/**
 * Orchestrator Agent
 * Coordinates all specialized agents (GitHub, Azure DevOps, Cost Calculator, Report Generator)
 */

import type { FinOpsConfig } from '../types/config';
import type { FinOpsState } from '../types/state';
import { analyzeGitHubUsage } from './github-analyzer';
import { analyzeAzureDevOpsUsage } from './azdo-analyzer';
import { StateManager } from '../utils/state-manager';
import { getLogger } from '../utils/logger';
import { loadPricing } from '../utils/pricing';
import { calculateTotalCosts } from '../tools/cost/calculator';
import { generateMarkdownReport } from '../tools/report/markdown-generator';
import { generateJSONReport } from '../tools/report/json-generator';
import { generateRecommendations } from '../tools/report/recommendations';

export interface OrchestratorOptions {
  config: FinOpsConfig;
  stateManager?: StateManager;
  githubOnly?: boolean;
  azdoOnly?: boolean;
}

export interface OrchestratorResult {
  success: boolean;
  state: FinOpsState;
  markdownReport?: string;
  jsonReport?: string;
  error?: string;
}

/**
 * Run the complete FinOps analysis pipeline
 */
export async function runFinOpsAnalysis(options: OrchestratorOptions): Promise<OrchestratorResult> {
  const logger = getLogger();
  const { config, githubOnly, azdoOnly } = options;

  logger.info('Starting FinOps Analysis Pipeline...');

  // Initialize state manager
  const githubOrgs = config.github?.organizations || [];
  const azdoOrgs = config.azureDevOps?.organizations || [];
  const stateManager = options.stateManager || new StateManager({
    organizations: { github: githubOrgs, azureDevOps: azdoOrgs },
    githubData: {},
    azureDevOpsData: {},
    recommendations: [],
    analysisStartTime: new Date().toISOString(),
    cacheUsed: false,
  });
  const state = stateManager.getState() as FinOpsState;

  try {
    // Initialize pricing
    if (config.reporting?.outputDir) {
      const pricingPath = `${config.reporting.outputDir}/pricing.json`;
      try {
        await loadPricing(pricingPath);
      } catch {
        // Use default pricing
        await loadPricing();
      }
    } else {
      await loadPricing();
    }

    // Phase 1: GitHub Analysis
    if (!azdoOnly && config.github?.organizations && config.github.organizations.length > 0) {
      logger.info('Phase 1: Running GitHub Analyzer...');
      const { GitHubClient } = await import('../clients/github-client');
      const githubClient = new GitHubClient({ token: config.github.token });

      for (const org of config.github.organizations) {
        logger.info(`Analyzing GitHub org: ${org}`);
        try {
          const usageData = await analyzeGitHubUsage(githubClient, org);
          if (!state.githubData[org]) {
            state.githubData[org] = {};
          }
          state.githubData[org] = usageData;
        } catch (error) {
          logger.warn(`Failed to analyze GitHub org ${org}:`, error);
        }
      }

      logger.info('GitHub analysis complete');
    } else {
      logger.info('Skipping GitHub analysis (no orgs configured or ADO-only mode)');
    }

    // Phase 2: Azure DevOps Analysis
    if (
      !githubOnly &&
      config.azureDevOps?.organizations &&
      config.azureDevOps.organizations.length > 0
    ) {
      logger.info('Phase 2: Running Azure DevOps Analyzer...');

      for (const org of config.azureDevOps.organizations) {
        logger.info(`Analyzing Azure DevOps org: ${org}`);
        try {
          const { AzureDevOpsClient } = await import('../clients/azdo-client');
          const azdoClient = new AzureDevOpsClient({ pat: config.azureDevOps.pat, organization: org });
          
          const usageData = await analyzeAzureDevOpsUsage(azdoClient, org, {
            inactiveUserThresholdDays: config.azureDevOps.thresholds?.inactiveUserDays || 90,
          });
          if (!state.azureDevOpsData[org]) {
            state.azureDevOpsData[org] = {};
          }
          state.azureDevOpsData[org] = usageData;
        } catch (error) {
          logger.warn(`Failed to analyze Azure DevOps org ${org}:`, error);
        }
      }

      logger.info('Azure DevOps analysis complete');
    } else {
      logger.info('Skipping Azure DevOps analysis (no orgs configured or GitHub-only mode)');
    }

    // Phase 3: Cost Calculation
    logger.info('Phase 3: Running Cost Calculator...');
    try {
      const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);
      state.costs = costs;
      logger.info('Cost calculation complete');
    } catch (error) {
      logger.error('Failed to calculate costs:', error);
    }

    // Phase 4: Report Generation
    logger.info('Phase 4: Running Report Generator...');

    // Generate recommendations
    try {
      const recommendations = generateRecommendations(state);
      state.recommendations = recommendations as any; // Type mismatch between RecommendationItem and Recommendation
      logger.info(`Generated ${state.recommendations.length} recommendations`);
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
    }

    let markdownReport: string | undefined;
    let jsonReport: string | undefined;

    try {
      markdownReport = generateMarkdownReport(state);
      logger.info('Markdown report generated');
    } catch (error) {
      logger.error('Failed to generate Markdown report:', error);
    }

    try {
      jsonReport = generateJSONReport(state);
      logger.info('JSON report generated');
    } catch (error) {
      logger.error('Failed to generate JSON report:', error);
    }

    state.analysisEndTime = new Date().toISOString();
    logger.info('✅ FinOps Analysis Pipeline Complete!');

    return {
      success: true,
      state,
      markdownReport,
      jsonReport,
    };
  } catch (error) {
    logger.error('FinOps Analysis Pipeline failed:', error);
    return {
      success: false,
      state,
      error: String(error),
    };
  }
}

/**
 * Interactive Q&A mode after analysis
 */
export async function runInteractiveMode(
  state: FinOpsState,
  _config: FinOpsConfig,
): Promise<void> {
  const logger = getLogger();
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n🤖 FinOps Agent> ',
  });

  logger.info('\n📊 Entering Interactive Q&A Mode');
  logger.info('Ask questions about your analysis. Type "exit" to quit.\n');
  logger.info('Example questions:');
  logger.info('  - Show me cost drivers');
  logger.info('  - Show me recommendations');
  logger.info('  - How much can we save on inactive licenses?\n');

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      logger.info('Goodbye! 👋');
      rl.close();
      return;
    }

    if (!input) {
      rl.prompt();
      return;
    }

    // Process the question
    if (input.toLowerCase().includes('cost') || input.toLowerCase().includes('driver')) {
      if (state.costs) {
        console.log('\n💰 Cost Summary:');
        console.log(`   Total Monthly Cost: $${state.costs.grandTotal.toFixed(2)}`);
        if (state.costs.github) {
          console.log(`   GitHub: $${state.costs.github.total.toFixed(2)}`);
        }
        if (state.costs.azureDevOps) {
          console.log(`   Azure DevOps: $${state.costs.azureDevOps.total.toFixed(2)}`);
        }
      } else {
        console.log('\n⚠️  No cost data available');
      }
    } else if (input.toLowerCase().includes('recommendation')) {
      if (state.recommendations.length > 0) {
        console.log(`\n📋 Top ${Math.min(5, state.recommendations.length)} Recommendations:`);
        state.recommendations.slice(0, 5).forEach((rec, i) => {
          console.log(`\n${i + 1}. ${rec.title}`);
          console.log(`   Priority: ${rec.priority} | Savings: $${rec.estimatedSavings}/month`);
          console.log(`   ${rec.description}`);
        });
      } else {
        console.log('\n✅ No recommendations generated');
      }
    } else if (input.toLowerCase().includes('inactive') || input.toLowerCase().includes('license')) {
      const inactiveSavings = state.recommendations
        .filter((r) => r.title.toLowerCase().includes('inactive'))
        .reduce((sum, r) => sum + r.estimatedSavings, 0);

      if (inactiveSavings > 0) {
        console.log(`\n💰 Potential savings from inactive license reclamation: $${inactiveSavings.toFixed(2)}/month`);
      } else {
        console.log('\n✅ No inactive licenses found or data not available');
      }
    } else {
      console.log('\n🤔 I can help you with:');
      console.log('  - Cost drivers and expensive resources');
      console.log('  - Recommendations and savings opportunities');
      console.log('  - Inactive licenses and waste identification');
      console.log('\nTry asking about costs, recommendations, or inactive users!');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}
