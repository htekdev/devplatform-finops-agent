/**
 * Self-Hosted vs Hosted Runner Comparison
 * Analyzes TCO and ROI for infrastructure decisions
 */

import { getPricing } from '../../utils/pricing';
import { getLogger } from '../../utils/logger';

/**
 * Infrastructure cost estimates for self-hosted runners
 */
export interface SelfHostedInfrastructureCosts {
  hardwareCost: number; // Amortized monthly cost
  maintenanceCost: number; // Admin time, updates, monitoring
  networkCost: number; // Bandwidth, networking
  otherCosts: number; // Power, cooling, etc.
  totalMonthlyCost: number;
}

/**
 * Hosted vs Self-Hosted comparison result
 */
export interface HostedComparisonResult {
  scenario: string;
  currentSetup: {
    hostedJobs: number;
    selfHostedAgents: number;
    monthlyCost: number;
  };
  hostedOnly: {
    requiredJobs: number;
    monthlyCost: number;
    pros: string[];
    cons: string[];
  };
  selfHostedOnly: {
    requiredAgents: number;
    infrastructureCost: number;
    monthlyCost: number;
    pros: string[];
    cons: string[];
  };
  recommendation: {
    option: 'stay-current' | 'move-to-hosted' | 'move-to-self-hosted' | 'hybrid';
    reasoning: string;
    estimatedSavings: number;
    breakEvenMonths: number;
  };
}

/**
 * Compare hosted vs self-hosted options for GitHub Actions or Azure DevOps
 */
export function compareHostedOptions(
  currentHostedJobs: number,
  currentSelfHostedAgents: number,
  averageConcurrentJobs: number,
  platform: 'github' | 'azdo' = 'azdo',
  selfHostedInfraCosts?: Partial<SelfHostedInfrastructureCosts>
): HostedComparisonResult {
  const logger = getLogger();
  const pricing = getPricing();

  // Get pricing for the platform
  const hostedJobPrice = platform === 'azdo' 
    ? pricing.azureDevOps.parallelJobs.hosted 
    : 40; // GitHub Actions hosted pricing
  const selfHostedJobPrice = platform === 'azdo'
    ? pricing.azureDevOps.parallelJobs.selfHosted
    : 15; // GitHub Actions self-hosted pricing

  // Calculate current costs
  const currentHostedCost = currentHostedJobs * hostedJobPrice;
  const currentSelfHostedCost = currentSelfHostedAgents * selfHostedJobPrice;
  const currentTotalCost = currentHostedCost + currentSelfHostedCost;

  // Estimate infrastructure costs for self-hosted
  const estimatedInfraCosts: SelfHostedInfrastructureCosts = {
    hardwareCost: selfHostedInfraCosts?.hardwareCost || 100, // $100/month for hardware (amortized)
    maintenanceCost: selfHostedInfraCosts?.maintenanceCost || 200, // $200/month admin time
    networkCost: selfHostedInfraCosts?.networkCost || 50, // $50/month networking
    otherCosts: selfHostedInfraCosts?.otherCosts || 50, // $50/month misc
    totalMonthlyCost: 0,
  };
  estimatedInfraCosts.totalMonthlyCost =
    estimatedInfraCosts.hardwareCost +
    estimatedInfraCosts.maintenanceCost +
    estimatedInfraCosts.networkCost +
    estimatedInfraCosts.otherCosts;

  // Scenario 1: All hosted
  const requiredHostedJobs = Math.ceil(averageConcurrentJobs || currentHostedJobs || 1);
  const hostedOnlyCost = requiredHostedJobs * hostedJobPrice;

  // Scenario 2: All self-hosted
  const requiredSelfHostedAgents = Math.ceil(averageConcurrentJobs * 1.2) || currentSelfHostedAgents || 2; // 20% buffer
  const selfHostedOnlyCost = requiredSelfHostedAgents * selfHostedJobPrice + estimatedInfraCosts.totalMonthlyCost;

  // Determine recommendation
  let recommendation: HostedComparisonResult['recommendation'];

  if (currentTotalCost === 0) {
    // No current costs - recommend based on scale
    if (averageConcurrentJobs < 3) {
      recommendation = {
        option: 'move-to-hosted',
        reasoning: 'Low concurrent job volume makes hosted runners more cost-effective with no maintenance overhead.',
        estimatedSavings: 0,
        breakEvenMonths: 0,
      };
    } else {
      recommendation = {
        option: 'move-to-self-hosted',
        reasoning: 'Higher concurrent job volume makes self-hosted infrastructure cost-effective despite maintenance overhead.',
        estimatedSavings: hostedOnlyCost - selfHostedOnlyCost,
        breakEvenMonths: estimatedInfraCosts.totalMonthlyCost > 0 
          ? Math.ceil(estimatedInfraCosts.totalMonthlyCost / (hostedOnlyCost - selfHostedOnlyCost))
          : 0,
      };
    }
  } else {
    // Compare current to alternatives
    const savingsFromHosted = currentTotalCost - hostedOnlyCost;
    const savingsFromSelfHosted = currentTotalCost - selfHostedOnlyCost;

    if (Math.abs(savingsFromHosted) < 100 && Math.abs(savingsFromSelfHosted) < 100) {
      recommendation = {
        option: 'stay-current',
        reasoning: 'Current setup is already cost-optimized. Savings from switching (<$100/month) don\'t justify migration effort.',
        estimatedSavings: 0,
        breakEvenMonths: 0,
      };
    } else if (savingsFromHosted > savingsFromSelfHosted && savingsFromHosted > 100) {
      recommendation = {
        option: 'move-to-hosted',
        reasoning: `Moving to all hosted runners would save $${savingsFromHosted.toFixed(2)}/month with zero maintenance overhead.`,
        estimatedSavings: savingsFromHosted,
        breakEvenMonths: 0,
      };
    } else if (savingsFromSelfHosted > 100) {
      recommendation = {
        option: 'move-to-self-hosted',
        reasoning: `Self-hosted infrastructure would save $${savingsFromSelfHosted.toFixed(2)}/month despite maintenance costs.`,
        estimatedSavings: savingsFromSelfHosted,
        breakEvenMonths: estimatedInfraCosts.totalMonthlyCost > 0
          ? Math.ceil(estimatedInfraCosts.totalMonthlyCost / savingsFromSelfHosted)
          : 0,
      };
    } else {
      recommendation = {
        option: 'stay-current',
        reasoning: 'Current hybrid approach balances cost and flexibility. No significant savings from changing.',
        estimatedSavings: 0,
        breakEvenMonths: 0,
      };
    }
  }

  logger.debug(
    `Hosted comparison for ${platform}: Current $${currentTotalCost}/month, Hosted-only $${hostedOnlyCost}/month, Self-hosted-only $${selfHostedOnlyCost}/month`
  );

  return {
    scenario: `${platform.toUpperCase()} Runner Infrastructure`,
    currentSetup: {
      hostedJobs: currentHostedJobs,
      selfHostedAgents: currentSelfHostedAgents,
      monthlyCost: Math.round(currentTotalCost * 100) / 100,
    },
    hostedOnly: {
      requiredJobs: requiredHostedJobs,
      monthlyCost: Math.round(hostedOnlyCost * 100) / 100,
      pros: [
        'Zero maintenance overhead',
        'Automatic scaling',
        'Always up-to-date runner images',
        'No infrastructure management',
      ],
      cons: [
        'Higher per-job cost',
        'Less control over environment',
        'Potential queue times during peak usage',
        'Internet-dependent',
      ],
    },
    selfHostedOnly: {
      requiredAgents: requiredSelfHostedAgents,
      infrastructureCost: Math.round(estimatedInfraCosts.totalMonthlyCost * 100) / 100,
      monthlyCost: Math.round(selfHostedOnlyCost * 100) / 100,
      pros: [
        'Lower per-job cost at scale',
        'Full control over environment',
        'Can use existing infrastructure',
        'Faster builds with local caching',
      ],
      cons: [
        'Maintenance overhead (updates, monitoring, troubleshooting)',
        'Upfront infrastructure investment',
        'Scaling requires planning',
        `Estimated $${estimatedInfraCosts.maintenanceCost}/month admin time`,
      ],
    },
    recommendation,
  };
}

/**
 * Calculate TCO (Total Cost of Ownership) for different scenarios
 */
export function calculateTCO(
  monthlyOperatingCost: number,
  upfrontCost: number,
  months: number = 12
): {
  totalCost: number;
  monthlyCost: number;
  upfrontCost: number;
} {
  const totalCost = monthlyOperatingCost * months + upfrontCost;
  const effectiveMonthlyCost = totalCost / months;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    monthlyCost: Math.round(effectiveMonthlyCost * 100) / 100,
    upfrontCost: Math.round(upfrontCost * 100) / 100,
  };
}
