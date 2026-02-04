export const DEFAULT_PRICING = {
  github: {
    actions: {
      UBUNTU: 0.008, // per minute
      WINDOWS: 0.016, // per minute
      MACOS: 0.08, // per minute
    },
    lfs: {
      storage: 0.0875, // per GB/month
      bandwidth: 0.0875, // per GB
    },
    codespaces: {
      '2-core': 0.18, // per hour
      '4-core': 0.36, // per hour
      '8-core': 0.72, // per hour
    },
  },
  azureDevOps: {
    parallelJobs: {
      hosted: 40, // per job/month
      selfHosted: 15, // per job/month
    },
    licenses: {
      basic: 6, // per user/month
      basicTestPlans: 52, // per user/month
    },
  },
} as const;

export type PricingConfig = typeof DEFAULT_PRICING;

export function getGitHubActionsCost(os: 'UBUNTU' | 'WINDOWS' | 'MACOS', minutes: number): number {
  return DEFAULT_PRICING.github.actions[os] * minutes;
}

export function getGitHubLFSStorageCost(gb: number): number {
  return DEFAULT_PRICING.github.lfs.storage * gb;
}

export function getGitHubLFSBandwidthCost(gb: number): number {
  return DEFAULT_PRICING.github.lfs.bandwidth * gb;
}

export function getGitHubCodespacesCost(machineType: '2-core' | '4-core' | '8-core', hours: number): number {
  return DEFAULT_PRICING.github.codespaces[machineType] * hours;
}

export function getAzDOParallelJobCost(type: 'hosted' | 'selfHosted', count: number): number {
  return DEFAULT_PRICING.azureDevOps.parallelJobs[type] * count;
}

export function getAzDOLicenseCost(type: 'basic' | 'basicTestPlans', count: number): number {
  return DEFAULT_PRICING.azureDevOps.licenses[type] * count;
}
