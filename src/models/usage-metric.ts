/**
 * UsageMetric Interface
 * 
 * Represents a measurement of resource consumption from GitHub or Azure DevOps.
 * Reference: specs/001-finops-analyzer/data-model.md
 */

export interface UsageMetric {
  /** Unique identifier */
  id: string;
  
  /** Source platform */
  platform: "github" | "azure-devops";
  
  /** Type of resource being measured */
  resourceType: 
    | "actions-minutes"
    | "lfs-storage"
    | "lfs-bandwidth"
    | "codespaces-hours"
    | "parallel-jobs"
    | "user-license"
    | "agent-pool";
  
  /** Resource identifier (repo name, pool name, user ID, etc.) */
  resourceId: string;
  
  /** Human-readable resource name */
  resourceName: string;
  
  /** Organizational unit for attribution */
  orgUnit: {
    organization: string;
    project?: string;
    repository?: string;
    team?: string;
  };
  
  /** Quantity consumed */
  quantity: number;
  
  /** Unit of measurement */
  unit: "minutes" | "hours" | "gb" | "users" | "jobs";
  
  /** Time period for this measurement */
  period: {
    start: Date;
    end: Date;
  };
  
  /** Calculated cost in USD */
  cost: {
    amount: number;
    currency: "USD";
    isEstimated: boolean;
  };
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
