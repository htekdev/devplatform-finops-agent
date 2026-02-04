/**
 * Recommendation Interface
 * 
 * Represents an actionable suggestion for cost optimization.
 * Reference: specs/001-finops-analyzer/data-model.md
 */

export interface Recommendation {
  /** Unique identifier */
  id: string;
  
  /** Human-readable title */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Category of recommendation */
  category: "cleanup" | "optimization" | "migration" | "policy-change";
  
  /** Type of action to take */
  actionType:
    | "delete-workflow"
    | "optimize-workflow"
    | "reduce-runners"
    | "downgrade-machine"
    | "remove-user-license"
    | "reduce-parallel-jobs"
    | "switch-to-self-hosted"
    | "consolidate-repos"
    | "archive-repo"
    | "other";
  
  /** Target resource for this recommendation */
  target: {
    platform: "github" | "azure-devops";
    resourceType: string;
    resourceId: string;
    resourceName: string;
    orgUnit: {
      organization: string;
      project?: string;
      repository?: string;
    };
  };
  
  /** Execution parameters for automation */
  executionParams: {
    /** API endpoint or CLI command pattern */
    method: string;
    
    /** Parameters required to execute */
    params: Record<string, unknown>;
    
    /** Estimated effort to implement */
    effort: "trivial" | "low" | "medium" | "high";
    
    /** Risk level of this change */
    risk: "low" | "medium" | "high";
  };
  
  /** Estimated savings */
  savings: {
    monthly: number;
    annual: number;
    currency: "USD";
    confidence: "high" | "medium" | "low";
  };
  
  /** Priority based on ROI (1 = highest) */
  priority: number;
  
  /** Approval requirements */
  approval: {
    required: boolean;
    reason?: string;
    approvers?: string[];
  };
  
  /** Source metrics that led to this recommendation */
  sourceMetrics: string[];
  
  /** When this recommendation was generated */
  generatedAt: Date;
}
