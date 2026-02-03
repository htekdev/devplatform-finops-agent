/**
 * Recommendations engine for generating actionable cost optimization recommendations
 */

import type { FinOpsState } from '../../types/state';
import type { RecommendationItem } from '../../types/report';
import { getLogger } from '../../utils/logger';

/**
 * Generate recommendations from analyzed data
 */
export function generateRecommendations(state: FinOpsState): RecommendationItem[] {
  const logger = getLogger();
  logger.info('Generating recommendations from analyzed data');

  const recommendations: RecommendationItem[] = [];
  let recommendationCounter = 1;

  // GitHub Actions recommendations
  for (const [org, data] of Object.entries(state.githubData)) {
    if (data.actions) {
      // Recommendation: Excessive macOS usage
      const macosMinutes = data.actions.minutesByOS.macos;
      const totalMinutes = data.actions.totalMinutesUsed;

      if (macosMinutes > 1000 && macosMinutes / totalMinutes > 0.3) {
        const ubuntuEquivalentCost = macosMinutes * 0.008;
        const currentMacosCost = macosMinutes * 0.08;
        const potentialSavings = currentMacosCost - ubuntuEquivalentCost;

        recommendations.push({
          id: `rec-${recommendationCounter++}`,
          title: `Reduce macOS runner usage for ${org}`,
          description: `${macosMinutes.toLocaleString()} minutes on macOS runners (${((macosMinutes / totalMinutes) * 100).toFixed(1)}% of total). macOS is 10x more expensive than Ubuntu ($0.08/min vs $0.008/min).`,
          priority: potentialSavings > 100 ? 'high' : 'medium',
          category: 'medium-effort',
          estimatedMonthlySavings: Math.round(potentialSavings * 100) / 100,
          implementationSteps: [
            'Review workflows using macOS runners',
            'Identify if macOS-specific features are truly needed',
            'Migrate compatible workflows to Ubuntu runners',
            'Use macOS only for iOS/macOS builds or testing',
          ],
          platform: 'github',
          tags: ['github-actions', 'runner-optimization', 'cost-reduction'],
        });
      }

      // Recommendation: High workflow failure rates
      if (data.actions.topWorkflows && data.actions.topWorkflows.length > 0) {
        const highFailureWorkflows = data.actions.topWorkflows.filter((w) => w.failureRate > 0.2);

        if (highFailureWorkflows.length > 0) {
          const wastedMinutes = highFailureWorkflows.reduce(
            (sum, w) => sum + w.minutesConsumed * w.failureRate,
            0
          );
          const estimatedSavings = wastedMinutes * 0.016; // Assume average of Ubuntu and Windows

          recommendations.push({
            id: `rec-${recommendationCounter++}`,
            title: `Fix high-failure workflows in ${org}`,
            description: `${highFailureWorkflows.length} workflows have >20% failure rate, wasting ~${Math.round(wastedMinutes).toLocaleString()} minutes/month.`,
            priority: estimatedSavings > 50 ? 'high' : 'medium',
            category: 'medium-effort',
            estimatedMonthlySavings: Math.round(estimatedSavings * 100) / 100,
            implementationSteps: [
              `Investigate failing workflows: ${highFailureWorkflows.slice(0, 3).map((w) => w.workflow).join(', ')}`,
              'Review failure logs for common patterns',
              'Fix flaky tests or timing issues',
              'Add retry logic for transient failures',
            ],
            platform: 'github',
            tags: ['github-actions', 'reliability', 'waste-reduction'],
          });
        }
      }
    }

    // GitHub Codespaces recommendations
    if (data.codespaces) {
      // Recommendation: Idle Codespaces
      if (data.codespaces.idleCodespaces && data.codespaces.idleCodespaces.length > 0) {
        const totalIdleHours = data.codespaces.idleCodespaces.reduce((sum, cs) => sum + cs.daysIdle * 24, 0);
        const estimatedSavings = totalIdleHours * 0.36; // Assume 4-core average

        recommendations.push({
          id: `rec-${recommendationCounter++}`,
          title: `Delete idle Codespaces in ${org}`,
          description: `${data.codespaces.idleCodespaces.length} Codespaces idle for >7 days, consuming compute and storage.`,
          priority: estimatedSavings > 100 ? 'high' : 'medium',
          category: 'quick-win',
          estimatedMonthlySavings: Math.round(estimatedSavings * 100) / 100,
          implementationSteps: [
            `Review idle Codespaces for owners: ${data.codespaces.idleCodespaces.slice(0, 5).map((cs) => cs.owner).join(', ')}`,
            'Contact owners to confirm they can be deleted',
            'Delete unused Codespaces',
            'Set up automatic timeout policies (e.g., delete after 30 days inactive)',
          ],
          platform: 'github',
          tags: ['codespaces', 'idle-resources', 'quick-win'],
        });
      }

      // Recommendation: Premium machine overuse
      const totalHours = data.codespaces.totalHours;
      const premiumHours =
        (data.codespaces.hoursByMachineType['8-core'] || 0) +
        (data.codespaces.hoursByMachineType['16-core'] || 0) +
        (data.codespaces.hoursByMachineType['32-core'] || 0);

      if (premiumHours > 100 && premiumHours / totalHours > 0.5) {
        const currentCost = premiumHours * 0.72; // Average premium cost
        const optimizedCost = premiumHours * 0.36; // 4-core cost
        const savings = currentCost - optimizedCost;

        recommendations.push({
          id: `rec-${recommendationCounter++}`,
          title: `Optimize Codespaces machine types in ${org}`,
          description: `${((premiumHours / totalHours) * 100).toFixed(1)}% of Codespaces hours use premium machines (8+ cores). Many workloads can run on 4-core machines.`,
          priority: savings > 50 ? 'medium' : 'low',
          category: 'medium-effort',
          estimatedMonthlySavings: Math.round(savings * 100) / 100,
          implementationSteps: [
            'Review devcontainer.json configurations',
            'Set default machine type to 4-core',
            'Use 8+ core machines only for compute-intensive tasks',
            'Educate users on selecting appropriate machine sizes',
          ],
          platform: 'github',
          tags: ['codespaces', 'machine-optimization'],
        });
      }
    }
  }

  // Azure DevOps recommendations
  for (const [org, data] of Object.entries(state.azureDevOpsData)) {
    // Recommendation: Inactive licenses
    if (data.licenses && data.licenses.inactiveUsers > 0) {
      const savings = data.licenses.inactiveUsers * 6; // Assume average $6/user

      recommendations.push({
        id: `rec-${recommendationCounter++}`,
        title: `Reclaim inactive licenses in ${org}`,
        description: `${data.licenses.inactiveUsers} users have not accessed Azure DevOps recently, consuming paid licenses.`,
        priority: savings > 100 ? 'high' : 'medium',
        category: 'quick-win',
        estimatedMonthlySavings: Math.round(savings * 100) / 100,
        implementationSteps: [
          'Review inactive user list',
          'Contact users to confirm they no longer need access',
          'Remove or downgrade to Stakeholder licenses',
          'Set up monthly license audit process',
        ],
        platform: 'azdo',
        tags: ['licenses', 'inactive-users', 'quick-win'],
      });
    }

    // Recommendation: Underutilized agent pools
    if (data.parallelJobs && data.parallelJobs.pools) {
      const underutilized = data.parallelJobs.pools.filter((p) => p.utilizationRate < 0.3);

      if (underutilized.length > 0) {
        const wastedJobs = underutilized.reduce((sum, p) => sum + p.totalJobs, 0);
        const savings = wastedJobs * 40 * 0.7; // Assume could reduce by 70%

        recommendations.push({
          id: `rec-${recommendationCounter++}`,
          title: `Reduce underutilized parallel jobs in ${org}`,
          description: `${underutilized.length} agent pools have <30% utilization, indicating excess capacity.`,
          priority: savings > 100 ? 'medium' : 'low',
          category: 'strategic',
          estimatedMonthlySavings: Math.round(savings * 100) / 100,
          implementationSteps: [
            `Review underutilized pools: ${underutilized.slice(0, 3).map((p) => p.poolName).join(', ')}`,
            'Analyze pipeline concurrency patterns',
            'Reduce parallel job count incrementally',
            'Monitor queue times after reduction',
          ],
          platform: 'azdo',
          tags: ['parallel-jobs', 'capacity-planning'],
        });
      }
    }

    // Recommendation: Pipeline optimization
    if (data.pipelines && data.pipelines.length > 0) {
      const allPipelines = data.pipelines.flatMap((p) => p.pipelines);
      const slowPipelines = allPipelines.filter((p) => p.avgDuration > 60); // >60 min
      const failedPipelines = allPipelines.filter((p) => p.failureRate > 0.2);

      if (slowPipelines.length > 0 || failedPipelines.length > 0) {
        recommendations.push({
          id: `rec-${recommendationCounter++}`,
          title: `Optimize slow and failing pipelines in ${org}`,
          description: `${slowPipelines.length} pipelines average >60 minutes, ${failedPipelines.length} have >20% failure rate.`,
          priority: 'medium',
          category: 'medium-effort',
          estimatedMonthlySavings: 0, // Indirect savings (time/reliability)
          implementationSteps: [
            'Profile slow pipelines to identify bottlenecks',
            'Implement pipeline caching strategies',
            'Parallelize independent build steps',
            'Fix flaky tests causing high failure rates',
            'Consider incremental builds',
          ],
          platform: 'azdo',
          tags: ['pipelines', 'performance', 'reliability'],
        });
      }
    }
  }

  // Sort recommendations by priority (high → medium → low) and then by savings
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedMonthlySavings - a.estimatedMonthlySavings;
  });

  logger.info(`Generated ${recommendations.length} recommendations`);

  // Ensure at least 3 recommendations
  if (recommendations.length < 3) {
    // Add generic recommendations
    if (state.githubData && Object.keys(state.githubData).length > 0) {
      recommendations.push({
        id: `rec-${recommendationCounter++}`,
        title: 'Implement GitHub Actions caching',
        description: 'Using cache actions can significantly reduce build times and Actions minutes consumption.',
        priority: 'low',
        category: 'medium-effort',
        estimatedMonthlySavings: 0,
        implementationSteps: [
          'Add cache actions to workflows',
          'Cache dependencies (npm, pip, maven, etc.)',
          'Cache build outputs',
          'Monitor cache hit rates',
        ],
        platform: 'github',
        tags: ['github-actions', 'performance', 'best-practice'],
      });
    }

    if (state.azureDevOpsData && Object.keys(state.azureDevOpsData).length > 0) {
      recommendations.push({
        id: `rec-${recommendationCounter++}`,
        title: 'Regular license audits',
        description: 'Implement monthly reviews of user licenses to ensure optimal utilization.',
        priority: 'low',
        category: 'quick-win',
        estimatedMonthlySavings: 0,
        implementationSteps: [
          'Set up monthly calendar reminder for license review',
          'Export user entitlements report',
          'Identify inactive users',
          'Reclaim or downgrade unused licenses',
        ],
        platform: 'azdo',
        tags: ['licenses', 'process', 'best-practice'],
      });
    }

    if (recommendations.length < 3) {
      recommendations.push({
        id: `rec-${recommendationCounter++}`,
        title: 'Establish cost monitoring dashboard',
        description: 'Set up regular monitoring to track costs and trends over time.',
        priority: 'low',
        category: 'strategic',
        estimatedMonthlySavings: 0,
        implementationSteps: [
          'Run this analysis monthly',
          'Track cost trends in a spreadsheet or dashboard',
          'Set up alerts for cost threshold breaches',
          'Review recommendations and track implementation progress',
        ],
        platform: 'both',
        tags: ['monitoring', 'process', 'governance'],
      });
    }
  }

  return recommendations.slice(0, 10); // Limit to top 10
}

/**
 * Prioritize recommendations by impact
 */
export function prioritizeRecommendations(
  recommendations: RecommendationItem[]
): {
  quickWins: RecommendationItem[];
  mediumEffort: RecommendationItem[];
  strategic: RecommendationItem[];
} {
  return {
    quickWins: recommendations.filter((r) => r.category === 'quick-win'),
    mediumEffort: recommendations.filter((r) => r.category === 'medium-effort'),
    strategic: recommendations.filter((r) => r.category === 'strategic'),
  };
}

/**
 * Calculate total potential savings from all recommendations
 */
export function calculateTotalPotentialSavings(recommendations: RecommendationItem[]): number {
  return recommendations.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);
}
