/**
 * PricingData Interface
 * 
 * Pricing information for GitHub and Azure DevOps resources.
 * Reference: specs/001-finops-analyzer/data-model.md
 */

export interface PricingData {
  /** When this pricing data was last updated */
  lastUpdated: string;
  
  /** GitHub pricing */
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
    freeTiers: {
      actionsMinutes: number;
      actionsMinutesMacOS: number;
      lfsStorage: number;
      lfsBandwidth: number;
      codespaces2Core: number;
      codespaces4Core: number;
    };
  };
  
  /** Azure DevOps pricing */
  azureDevOps: {
    parallelJobs: {
      hosted: number;
      selfHosted: number;
    };
    licenses: {
      basic: number;
      basicTestPlans: number;
    };
    freeTiers: {
      parallelJobs: number;
      basicUsers: number;
    };
  };
  
  /** Currency code */
  currency: string;
  
  /** Billing period */
  period: string;
}
