/**
 * Report data structures for FinOps reports
 */

/**
 * Priority level for recommendations
 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * Recommendation category
 */
export type RecommendationCategory = 'quick-win' | 'medium-effort' | 'strategic';

/**
 * Individual recommendation item
 */
export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  estimatedMonthlySavings: number;
  implementationSteps: string[];
  platform: 'github' | 'azdo' | 'both';
  tags: string[];
}

/**
 * Executive summary for the report
 */
export interface ExecutiveSummary {
  totalMonthlyCost: number;
  topCostDrivers: Array<{
    platform: string;
    category: string;
    cost: number;
    percentage: number;
  }>;
  totalPotentialSavings: number;
  highPriorityRecommendations: number;
  keyFindings: string[];
  generatedAt: string;
}

/**
 * Platform-specific section (GitHub or Azure DevOps)
 */
export interface PlatformSection {
  platform: 'github' | 'azdo';
  organizationCount: number;
  totalCost: number;
  costBreakdown: Array<{
    category: string;
    cost: number;
    percentage: number;
    trend?: 'increasing' | 'decreasing' | 'stable';
  }>;
  findings: string[];
  concerns: string[];
}

/**
 * Cost breakdown table data
 */
export interface CostBreakdownTable {
  headers: string[];
  rows: Array<{
    organization: string;
    platform: string;
    category: string;
    cost: number;
    trend?: string;
  }>;
  totals: {
    github: number;
    azdo: number;
    overall: number;
  };
}

/**
 * Appendix data
 */
export interface ReportAppendix {
  methodology: string;
  pricingSource: 'config' | 'default';
  pricingLastUpdated: string;
  dataCollectionTimestamp: string;
  organizationsAnalyzed: {
    github: string[];
    azdo: string[];
  };
  toolVersion: string;
}

/**
 * Complete FinOps report structure
 */
export interface FinOpsReport {
  title: string;
  subtitle: string;
  executiveSummary: ExecutiveSummary;
  costOverview: CostBreakdownTable;
  githubSection?: PlatformSection;
  azureDevOpsSection?: PlatformSection;
  recommendations: RecommendationItem[];
  appendix: ReportAppendix;
  generatedAt: string;
  format: 'markdown' | 'json';
}
