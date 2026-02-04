/**
 * CostBreakdown Interface
 * 
 * Attribution of costs to organizational units.
 * Reference: specs/001-finops-analyzer/data-model.md
 */

export interface CostBreakdown {
  /** Unique identifier */
  id: string;
  
  /** Source platform */
  platform: "github" | "azure-devops" | "combined";
  
  /** Organizational unit */
  orgUnit: {
    organization: string;
    project?: string;
    repository?: string;
    team?: string;
    user?: string;
  };
  
  /** Cost category */
  category:
    | "compute"
    | "storage"
    | "bandwidth"
    | "licensing"
    | "other";
  
  /** Time period for this breakdown */
  period: {
    start: Date;
    end: Date;
  };
  
  /** Cost amounts */
  amounts: {
    actual: number;
    projected: number;
    currency: "USD";
  };
  
  /** Trend analysis */
  trend: {
    direction: "increasing" | "stable" | "decreasing";
    percentChange: number;
    projection30Days: number;
    projection60Days: number;
    projection90Days: number;
  };
  
  /** Breakdown by sub-category */
  details: Array<{
    label: string;
    amount: number;
    percentage: number;
  }>;
}
