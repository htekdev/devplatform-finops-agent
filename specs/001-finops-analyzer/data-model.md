# Data Model: FinOps Analyzer Agent

**Date**: 2026-02-04  
**Status**: Draft

## Core Entities

### 1. UsageMetric

Represents a measurement of resource consumption from either GitHub or Azure DevOps.

```typescript
interface UsageMetric {
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
    project?: string;      // Azure DevOps only
    repository?: string;   // GitHub only
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
    isEstimated: boolean;  // true if using default pricing
  };
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
```

**Validation Rules**:
- `quantity` must be >= 0
- `period.end` must be >= `period.start`
- `cost.amount` must be >= 0

---

### 2. Recommendation

Represents an actionable suggestion for cost optimization.

```typescript
interface Recommendation {
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
  sourceMetrics: string[];  // Array of UsageMetric IDs
  
  /** When this recommendation was generated */
  generatedAt: Date;
}
```

**Validation Rules**:
- `savings.monthly` and `savings.annual` must be >= 0
- `priority` must be >= 1
- If `approval.required` is true, `approval.reason` must be provided
- `savings.annual` should equal `savings.monthly * 12` (±5% for rounding)

**State Transitions**:
- Recommendations are stateless in this system; tracking execution status is deferred to the automation agent.

---

### 3. CostBreakdown

Attribution of costs to organizational units.

```typescript
interface CostBreakdown {
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
    | "compute"      // Actions, Codespaces, parallel jobs
    | "storage"      // LFS, artifacts
    | "bandwidth"    // LFS bandwidth
    | "licensing"    // User licenses
    | "other";
  
  /** Time period for this breakdown */
  period: {
    start: Date;
    end: Date;
  };
  
  /** Cost amounts */
  amounts: {
    actual: number;      // Actual cost incurred
    projected: number;   // Projected monthly cost based on trends
    currency: "USD";
  };
  
  /** Trend analysis */
  trend: {
    direction: "increasing" | "stable" | "decreasing";
    percentChange: number;  // vs previous period
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
```

**Validation Rules**:
- `amounts.actual` and `amounts.projected` must be >= 0
- `details[].percentage` values should sum to ~100%
- `trend.percentChange` is a decimal (0.1 = 10% increase)

---

### 4. AnalysisReport

Complete output of an analysis run.

```typescript
interface AnalysisReport {
  /** Unique identifier */
  id: string;
  
  /** Report metadata */
  metadata: {
    generatedAt: Date;
    generatedBy: string;  // Agent version
    duration: number;     // Analysis duration in seconds
  };
  
  /** Analysis scope */
  scope: {
    platforms: Array<"github" | "azure-devops">;
    organizations: string[];
    dateRange: {
      start: Date;
      end: Date;
    };
    filters?: {
      repositories?: string[];
      projects?: string[];
      users?: string[];
    };
  };
  
  /** Executive summary */
  summary: {
    /** Total monthly spend across all platforms */
    totalMonthlyCost: number;
    
    /** Top 3 cost drivers */
    topCostDrivers: Array<{
      description: string;
      monthlyCost: number;
      percentage: number;
    }>;
    
    /** Top 3 recommendations */
    topRecommendations: Array<{
      title: string;
      monthlySavings: number;
      priority: number;
    }>;
    
    /** Total potential savings */
    totalPotentialSavings: {
      monthly: number;
      annual: number;
    };
  };
  
  /** All collected metrics */
  metrics: UsageMetric[];
  
  /** Cost breakdowns by various dimensions */
  costBreakdowns: {
    byPlatform: CostBreakdown[];
    byCategory: CostBreakdown[];
    byOrgUnit: CostBreakdown[];
  };
  
  /** All generated recommendations */
  recommendations: Recommendation[];
  
  /** Any warnings or errors encountered */
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
}
```

**Validation Rules**:
- `summary.topCostDrivers` should have exactly 3 items (or fewer if not enough data)
- `summary.topRecommendations` should have exactly 3 items (or fewer if not enough)
- `recommendations` must be sorted by priority (ascending)
- All `UsageMetric` and `Recommendation` objects must pass their own validation

---

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     AnalysisReport                          │
│ - Contains many UsageMetrics                                │
│ - Contains many CostBreakdowns (aggregated from metrics)    │
│ - Contains many Recommendations (derived from metrics)       │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │ UsageMetric │    │ CostBreakdown│    │Recommendation│
   │             │    │              │    │              │
   │ - Raw data  │───▶│ - Aggregated │    │ - sourceIds  │
   │   point     │    │   view       │    │   reference  │
   │             │    │              │    │   metrics    │
   └─────────────┘    └──────────────┘    └──────────────┘
```

## Output Formats

### JSON Output
Full structured data as defined above, suitable for automation and dashboards.

**Schema Reference**: `contracts/report-output.schema.json`

### Markdown Output
Human-readable report with:
1. Executive Summary section
2. Cost Analysis by Platform
3. Recommendations table
4. Trend charts (ASCII)
5. Detailed findings

Example:
```markdown
# FinOps Analysis Report
**Generated**: 2026-02-04 | **Organizations**: acme-corp (GitHub), acme (ADO)

## Executive Summary
- **Total Monthly Spend**: $4,523
- **Potential Monthly Savings**: $1,247 (28%)

### Top Cost Drivers
1. GitHub Actions (macOS runners) - $2,100/mo (46%)
2. Azure DevOps Basic Licenses - $1,200/mo (27%)
3. GitHub LFS Storage - $523/mo (12%)

### Priority Recommendations
| # | Action | Monthly Savings | Effort |
|---|--------|----------------|--------|
| 1 | Remove 15 inactive ADO users | $90/mo | Low |
| 2 | Switch macOS jobs to Linux | $1,890/mo | Medium |
| 3 | Archive 3 unused repositories | $52/mo | Low |
```

---

## 5. PricingData

Represents pricing configuration with staleness tracking.

```typescript
interface PricingData {
  /** Unique identifier */
  id: string;
  
  /** Version of pricing data */
  version: string;
  
  /** When this pricing was last updated */
  lastUpdated: Date;
  
  /** Source of pricing data */
  source: "default" | "custom" | "api";
  
  /** GitHub pricing rates */
  github: {
    actions: {
      UBUNTU: number;    // per minute
      WINDOWS: number;   // per minute
      MACOS: number;     // per minute
    };
    lfs: {
      storage: number;   // per GB/month
      bandwidth: number; // per GB
    };
    codespaces: {
      "2-core": number;  // per hour
      "4-core": number;  // per hour
      "8-core": number;  // per hour
    };
  };
  
  /** Azure DevOps pricing rates */
  azureDevOps: {
    parallelJobs: {
      hosted: number;      // per job/month
      selfHosted: number;  // per job/month
    };
    licenses: {
      basic: number;           // per user/month
      basicTestPlans: number;  // per user/month
    };
  };
}
```

**Staleness Rules**:
- Warning if `lastUpdated` > 30 days ago
- Error if `lastUpdated` > 90 days ago
- `source: "default"` should trigger recommendation to configure custom pricing

---

## JSON Schema References

All entities are validated against JSON schemas in the `contracts/` directory:

| Entity | Schema File | Purpose |
|--------|-------------|---------|
| UsageMetric | `contracts/usage-metric.schema.json` | API response validation |
| Recommendation | `contracts/recommendation.schema.json` | Output validation |
| CostBreakdown | `contracts/cost-breakdown.schema.json` | Aggregation validation |
| AnalysisReport | `contracts/report-output.schema.json` | Complete report validation |
| PricingData | `contracts/pricing-data.schema.json` | Configuration validation |
| GitHub Billing | `contracts/github-billing.schema.json` | GitHub API responses |
| Azure DevOps Usage | `contracts/azdo-usage.schema.json` | ADO API responses |

---

## Recommendation Categories (GAP #2)

| Category | Definition | Example Actions |
|----------|------------|-----------------|
| **cleanup** | Remove unused/abandoned resources | Delete inactive users, archive repos, remove stale workflows |
| **optimization** | Improve efficiency of existing resources | Switch runner types, reduce concurrency, consolidate jobs |
| **migration** | Move to different service/tier | Self-hosted agents, different license tier, platform switch |
| **policy-change** | Organizational policy updates | Enforce branch policies, require approvals, set quotas |

---

## Effort Units (GAP #3)

| Effort | Time Estimate | Risk Profile | Examples |
|--------|---------------|--------------|----------|
| **trivial** | < 1 hour | Very Low | Remove single user, toggle setting |
| **low** | 1-4 hours | Low | Update workflow files, reconfigure pool |
| **medium** | 4-16 hours | Medium | Migrate runners, restructure permissions |
| **high** | > 16 hours | High | Major infrastructure changes, policy rollout |

---

## Filter Syntax (GAP #4)

Analysis scope can be filtered via configuration-based JSON:

```json
{
  "scope": {
    "platforms": ["github", "azure-devops"],
    "organizations": ["my-org"],
    "dateRange": {
      "start": "2024-11-05",
      "end": "2025-02-04"
    },
    "filters": {
      "repositories": {
        "include": ["frontend-*", "backend-*"],
        "exclude": ["*-deprecated"]
      },
      "projects": {
        "include": ["ProjectA", "ProjectB"]
      },
      "users": {
        "exclude": ["service-account-*", "bot-*"]
      },
      "resourceTypes": {
        "include": ["actions-minutes", "user-license"]
      }
    }
  }
}
```

**Filter Rules**:
- Glob patterns supported (`*` wildcard)
- `exclude` takes precedence over `include`
- Empty `include` means "include all"
- Empty `exclude` means "exclude none"
