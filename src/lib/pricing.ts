/**
 * Default pricing configuration for GitHub and Azure DevOps
 * Source: Public pricing pages as of 2026-02-04
 */

export interface PricingConfig {
  github: {
    actions: {
      UBUNTU: number;
      WINDOWS: number;
      MACOS: number;
    };
    lfs: {
      storage: number;
      bandwidth: number;
    };
    codespaces: {
      "2-core": number;
      "4-core": number;
      "8-core": number;
    };
  };
  azureDevOps: {
    parallelJobs: {
      hosted: number;
      selfHosted: number;
    };
    licenses: {
      basic: number;
      basicTestPlans: number;
    };
  };
  lastUpdated: Date;
}

export const DEFAULT_PRICING: PricingConfig = {
  github: {
    actions: {
      UBUNTU: 0.008,
      WINDOWS: 0.016,
      MACOS: 0.08,
    },
    lfs: {
      storage: 0.07,
      bandwidth: 0.0875,
    },
    codespaces: {
      "2-core": 0.18,
      "4-core": 0.36,
      "8-core": 0.72,
    },
  },
  azureDevOps: {
    parallelJobs: {
      hosted: 40,
      selfHosted: 15,
    },
    licenses: {
      basic: 6,
      basicTestPlans: 52,
    },
  },
  lastUpdated: new Date("2026-02-04"),
};

export function isPricingStale(lastUpdated: Date, thresholdDays: number = 30): boolean {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > thresholdDays;
}

export function getPricing(): PricingConfig {
  const config = { ...DEFAULT_PRICING };
  
  if (process.env.PRICING_GITHUB_ACTIONS_UBUNTU) {
    config.github.actions.UBUNTU = parseFloat(process.env.PRICING_GITHUB_ACTIONS_UBUNTU);
  }
  if (process.env.PRICING_GITHUB_ACTIONS_WINDOWS) {
    config.github.actions.WINDOWS = parseFloat(process.env.PRICING_GITHUB_ACTIONS_WINDOWS);
  }
  if (process.env.PRICING_GITHUB_ACTIONS_MACOS) {
    config.github.actions.MACOS = parseFloat(process.env.PRICING_GITHUB_ACTIONS_MACOS);
  }
  if (process.env.PRICING_GITHUB_LFS_STORAGE) {
    config.github.lfs.storage = parseFloat(process.env.PRICING_GITHUB_LFS_STORAGE);
  }
  if (process.env.PRICING_GITHUB_LFS_BANDWIDTH) {
    config.github.lfs.bandwidth = parseFloat(process.env.PRICING_GITHUB_LFS_BANDWIDTH);
  }
  if (process.env.PRICING_AZDO_PARALLEL_JOB_HOSTED) {
    config.azureDevOps.parallelJobs.hosted = parseFloat(process.env.PRICING_AZDO_PARALLEL_JOB_HOSTED);
  }
  if (process.env.PRICING_AZDO_PARALLEL_JOB_SELFHOSTED) {
    config.azureDevOps.parallelJobs.selfHosted = parseFloat(process.env.PRICING_AZDO_PARALLEL_JOB_SELFHOSTED);
  }
  if (process.env.PRICING_AZDO_LICENSE_BASIC) {
    config.azureDevOps.licenses.basic = parseFloat(process.env.PRICING_AZDO_LICENSE_BASIC);
  }
  if (process.env.PRICING_AZDO_LICENSE_BASIC_TEST_PLANS) {
    config.azureDevOps.licenses.basicTestPlans = parseFloat(process.env.PRICING_AZDO_LICENSE_BASIC_TEST_PLANS);
  }
  
  return config;
}
