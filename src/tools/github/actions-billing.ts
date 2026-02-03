/**
 * GitHub Actions Billing Data Fetcher
 * Fetches and processes Actions usage data
 */

import type { GitHubActionsData } from '../../types/state';
import type { GitHubClient } from '../../clients/github-client';
import { getLogger } from '../../utils/logger';

export interface WorkflowStats {
  repo: string;
  workflow: string;
  minutesConsumed: number;
  failureRate: number;
  totalRuns: number;
}

/**
 * Fetch Actions billing data for an organization
 */
export async function fetchActionsBilling(
  client: GitHubClient,
  org: string
): Promise<GitHubActionsData> {
  const logger = getLogger();
  logger.info(`Fetching Actions billing for org: ${org}`);

  try {
    // Get billing summary
    const billing = await client.getActionsBilling(org);

    // Get repositories to analyze workflow runs
    const repos = await client.listRepositories(org);
    logger.debug(`Found ${repos.length} repositories for ${org}`);

    // Fetch workflow runs for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const createdFilter = `>=${thirtyDaysAgo.toISOString().split('T')[0]}`;

    // Collect workflow statistics
    const workflowStats = new Map<string, WorkflowStats>();

    // Sample up to 20 most active repositories to avoid excessive API calls
    const activeRepos = repos
      .filter((r) => !r.archived && !r.fork)
      .slice(0, 20);

    for (const repo of activeRepos) {
      try {
        const runs = await client.listWorkflowRuns(org, repo.name, {
          status: 'completed',
          created: createdFilter,
          per_page: 100,
        });

        logger.debug(`Fetched ${runs.length} runs for ${repo.name}`);

        // Process each run
        for (const run of runs) {
          // Skip if workflow name is missing
          if (!run.name) {
            continue;
          }

          const key = `${repo.name}:${run.name}`;
          
          if (!workflowStats.has(key)) {
            workflowStats.set(key, {
              repo: repo.name,
              workflow: run.name,
              minutesConsumed: 0,
              failureRate: 0,
              totalRuns: 0,
            });
          }

          const stats = workflowStats.get(key)!;
          stats.totalRuns++;

          // Calculate run duration in minutes (approximate from timestamps)
          if (run.run_started_at && run.updated_at) {
            const startTime = new Date(run.run_started_at).getTime();
            const endTime = new Date(run.updated_at).getTime();
            const durationMinutes = (endTime - startTime) / 1000 / 60;
            stats.minutesConsumed += durationMinutes;
          }

          // Track failures
          if (run.conclusion === 'failure' || run.conclusion === 'cancelled') {
            stats.failureRate++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch runs for ${repo.name}:`, error);
        // Continue with other repos
      }
    }

    // Calculate failure rates and sort by minutes consumed
    const workflowArray = Array.from(workflowStats.values()).map((stats) => ({
      ...stats,
      failureRate: stats.totalRuns > 0 ? stats.failureRate / stats.totalRuns : 0,
    }));

    // Get top 10 workflows by minutes consumed
    const topWorkflows = workflowArray
      .sort((a, b) => b.minutesConsumed - a.minutesConsumed)
      .slice(0, 10);

    logger.info(`Processed ${workflowArray.length} unique workflows for ${org}`);

    return {
      organization: org,
      totalMinutesUsed: billing.total_minutes_used,
      paidMinutesUsed: billing.total_paid_minutes_used,
      includedMinutes: billing.included_minutes,
      minutesByOS: {
        ubuntu: billing.minutes_used_breakdown.UBUNTU || 0,
        windows: billing.minutes_used_breakdown.WINDOWS || 0,
        macos: billing.minutes_used_breakdown.MACOS || 0,
      },
      topWorkflows: topWorkflows.map((w) => ({
        repo: w.repo,
        workflow: w.workflow,
        minutesConsumed: Math.round(w.minutesConsumed),
        failureRate: Math.round(w.failureRate * 100) / 100,
      })),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to fetch Actions billing for ${org}:`, error);
    throw new Error(`Failed to fetch Actions billing for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze workflow efficiency
 */
export function analyzeWorkflowEfficiency(data: GitHubActionsData): {
  inefficientWorkflows: Array<{ repo: string; workflow: string; reason: string }>;
  recommendations: string[];
} {
  const inefficient: Array<{ repo: string; workflow: string; reason: string }> = [];
  const recommendations: string[] = [];

  // Check for high failure rates
  for (const workflow of data.topWorkflows) {
    if (workflow.failureRate > 0.2) {
      inefficient.push({
        repo: workflow.repo,
        workflow: workflow.workflow,
        reason: `High failure rate: ${(workflow.failureRate * 100).toFixed(1)}%`,
      });
    }
  }

  // Check for workflows consuming >10% of total minutes
  const threshold = data.totalMinutesUsed * 0.1;
  for (const workflow of data.topWorkflows) {
    if (workflow.minutesConsumed > threshold) {
      recommendations.push(
        `Workflow "${workflow.workflow}" in ${workflow.repo} consumes ${workflow.minutesConsumed} minutes (${((workflow.minutesConsumed / data.totalMinutesUsed) * 100).toFixed(1)}% of total). Consider optimizing.`
      );
    }
  }

  // Check for excessive macOS usage (macOS is 10x more expensive)
  if (data.minutesByOS.macos > data.minutesByOS.ubuntu * 0.5) {
    recommendations.push(
      `macOS runners are expensive (10x Ubuntu cost). ${data.minutesByOS.macos} macOS minutes used. Consider if all macOS builds are necessary.`
    );
  }

  // Check if approaching or exceeding included minutes
  if (data.paidMinutesUsed > 0) {
    recommendations.push(
      `Organization has exceeded included minutes (${data.includedMinutes}). ${data.paidMinutesUsed} paid minutes used this month.`
    );
  }

  return { inefficientWorkflows: inefficient, recommendations };
}
