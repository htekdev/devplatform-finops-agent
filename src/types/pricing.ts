/**
 * Pricing data structures for cost calculations
 */

/**
 * GitHub Actions pricing per minute by runner type
 */
export interface GitHubActionsPricing {
  ubuntu: number; // $/minute
  windows: number; // $/minute
  macos: number; // $/minute
}

/**
 * GitHub LFS pricing
 */
export interface GitHubLFSPricing {
  storage: number; // $/GB/month over free tier
  bandwidth: number; // $/GB over free tier
}

/**
 * GitHub Codespaces pricing
 */
export interface GitHubCodespacesPricing {
  compute: {
    '2-core': number; // $/hour
    '4-core': number; // $/hour
    '8-core': number; // $/hour
    '16-core': number; // $/hour
    '32-core': number; // $/hour
  };
  storage: number; // $/GB/month
}

/**
 * Complete GitHub pricing structure
 */
export interface GitHubPricing {
  actions: GitHubActionsPricing;
  lfs: GitHubLFSPricing;
  codespaces: GitHubCodespacesPricing;
  freeTiers: {
    actionsMinutes: number; // Free minutes per month
    lfsStorage: number; // Free GB
    lfsBandwidth: number; // Free GB
    codespacesHours: number; // Free hours per month
    codespacesStorage: number; // Free GB
  };
}

/**
 * Azure DevOps parallel job pricing
 */
export interface AzureDevOpsParallelJobPricing {
  hosted: number; // $/month per job
  selfHosted: number; // $/month per job
}

/**
 * Azure DevOps license pricing
 */
export interface AzureDevOpsLicensePricing {
  basic: number; // $/user/month
  basicTestPlans: number; // $/user/month
  stakeholder: number; // $/user/month (free)
  express: number; // $/user/month (free for VS subscribers)
  professional: number; // $/user/month
}

/**
 * Complete Azure DevOps pricing structure
 */
export interface AzureDevOpsPricing {
  parallelJobs: AzureDevOpsParallelJobPricing;
  licenses: AzureDevOpsLicensePricing;
  freeTiers: {
    hostedParallelJobs: number; // Free hosted jobs
    selfHostedParallelJobs: number; // Free self-hosted jobs
  };
}

/**
 * Complete pricing data
 */
export interface PricingData {
  github: GitHubPricing;
  azureDevOps: AzureDevOpsPricing;
  currency: string;
  lastUpdated: string;
  source: 'config' | 'default';
}

/**
 * Default pricing (as of January 2024)
 * Source: GitHub and Azure DevOps public pricing pages
 */
export const DEFAULT_PRICING: PricingData = {
  github: {
    actions: {
      ubuntu: 0.008, // $0.008/minute
      windows: 0.016, // $0.016/minute (2x Ubuntu)
      macos: 0.08, // $0.08/minute (10x Ubuntu)
    },
    lfs: {
      storage: 0.07, // $0.07/GB/month over 1GB
      bandwidth: 0.0875, // $0.0875/GB over 1GB
    },
    codespaces: {
      compute: {
        '2-core': 0.18, // $0.18/hour
        '4-core': 0.36, // $0.36/hour
        '8-core': 0.72, // $0.72/hour
        '16-core': 1.44, // $1.44/hour
        '32-core': 2.88, // $2.88/hour
      },
      storage: 0.07, // $0.07/GB/month
    },
    freeTiers: {
      actionsMinutes: 2000, // 2000 minutes/month (Team plan)
      lfsStorage: 1, // 1 GB
      lfsBandwidth: 1, // 1 GB/month
      codespacesHours: 120, // 120 core-hours/month
      codespacesStorage: 15, // 15 GB
    },
  },
  azureDevOps: {
    parallelJobs: {
      hosted: 40, // $40/month per hosted job
      selfHosted: 15, // $15/month per self-hosted job
    },
    licenses: {
      basic: 6, // $6/user/month
      basicTestPlans: 52, // $52/user/month
      stakeholder: 0, // Free
      express: 0, // Free (for Visual Studio subscribers)
      professional: 6, // $6/user/month (same as Basic in most contexts)
    },
    freeTiers: {
      hostedParallelJobs: 1, // 1 free hosted job for public projects
      selfHostedParallelJobs: 1, // 1 free self-hosted job
    },
  },
  currency: 'USD',
  lastUpdated: '2024-01-01',
  source: 'default',
};
