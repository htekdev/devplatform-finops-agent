# Research: FinOps Analyzer Agent

**Date**: 2026-02-04  
**Status**: Complete

## 1. GitHub Copilot SDK for Node.js/TypeScript

### Decision
Use `@github/copilot-sdk` (v0.1.x) as the agent orchestration layer.

### Rationale
- Production-tested agent runtime (same engine as Copilot CLI)
- Native TypeScript support with full type definitions
- Built-in tool registration via `defineTool()` with Zod schemas
- Session management with streaming support
- Handles planning, context management, and tool invocation automatically

### Key Implementation Details

**Critical Constraint**: ESM-only package - project MUST use ECMAScript Modules.

```typescript
// package.json must have "type": "module"
import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { z } from "zod";

// Create client
const client = new CopilotClient();
await client.start();

// Create session with custom tools
const session = await client.createSession({
    model: "gpt-5", // or claude-sonnet-4.5
    tools: [
        defineTool("get_github_actions_billing", {
            description: "Get GitHub Actions billing for an organization",
            parameters: z.object({
                org: z.string().describe("Organization name"),
            }),
            handler: async ({ org }) => {
                // Custom tool implementation
                return await fetchActionsBilling(org);
            },
        }),
    ],
});

// Send prompts and process responses
const result = await session.sendAndWait({
    prompt: "Analyze the GitHub Actions usage for organization 'acme-corp'",
});
```

**Multi-Agent Pattern**: Create multiple sessions with different tool sets for specialized agents, then orchestrate via a supervisor session.

### Alternatives Considered
- **LangChain.js**: More complex setup, less TypeScript-native
- **Custom orchestration**: Significant engineering effort for planning/context management
- **OpenAI Assistants API**: Vendor lock-in, less flexible tool registration

### Sources
- https://github.com/github/copilot-sdk
- https://www.npmjs.com/package/@github/copilot-sdk
- https://deepwiki.com/github/copilot-sdk

---

## 2. GitHub Billing APIs

### Decision
Use GitHub REST API billing endpoints via `@octokit/rest`.

### Rationale
- Official API with stable endpoints
- Supports organization-level billing data
- Provides Actions minutes, Packages storage, and shared storage metrics

### Key Endpoints

#### Get GitHub Actions Billing for Organization
```
GET /orgs/{org}/settings/billing/actions
```

**Response**:
```json
{
  "total_minutes_used": 305,
  "total_paid_minutes_used": 0,
  "included_minutes": 3000,
  "minutes_used_breakdown": {
    "UBUNTU": 205,
    "MACOS": 10,
    "WINDOWS": 90
  }
}
```

**Required Scope**: `repo` or `admin:org`

#### Get Billing Usage Report for Organization
```
GET /orgs/{org}/settings/billing/usage
```

**Note**: This is a newer endpoint providing comprehensive usage reports including Actions, Packages, Codespaces, and Copilot usage.

#### Get Shared Storage Billing
```
GET /orgs/{org}/settings/billing/shared-storage
```

**Response**:
```json
{
  "days_left_in_billing_cycle": 20,
  "estimated_paid_storage_for_month": 15,
  "estimated_storage_for_month": 40
}
```

### Implementation with Octokit
```typescript
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Get Actions billing
const { data: actionsBilling } = await octokit.billing.getGithubActionsBillingOrg({
  org: "my-org",
});

// Get storage billing
const { data: storageBilling } = await octokit.billing.getSharedStorageBillingOrg({
  org: "my-org",
});
```

### Rate Limiting
- Primary rate limit: 5,000 requests/hour for authenticated requests
- Implement exponential backoff on 403 responses

### Alternatives Considered
- **GraphQL API**: Billing endpoints not available in GraphQL
- **CSV export**: Manual process, not automatable

### Sources
- https://docs.github.com/en/rest/billing
- https://actions-cool.github.io/octokit-rest/api/billing/

---

## 3. Azure DevOps REST APIs

### Decision
Use Azure DevOps REST APIs via `azure-devops-node-api` for pipeline and user data.

### Rationale
- Official Microsoft SDK with TypeScript support
- Comprehensive coverage of DevOps resources
- Supports both Azure DevOps Services and Server

### Key API Areas

#### 3.1 User Entitlements (Licenses)
```
GET https://vsaex.dev.azure.com/{organization}/_apis/userentitlements?api-version=7.1
```

**Response includes**:
- User information (id, displayName, dateCreated)
- Access level (stakeholder, basic, basic+test, vs enterprise)
- Last access date

**Use Case**: Identify inactive users (no access in 90+ days) for license optimization.

#### 3.2 Agent Pools and Agents
```
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools?api-version=7.1
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents?api-version=7.1
```

**Agent response includes**:
- Agent status (online, offline)
- Capabilities
- `includeLastCompletedRequest` parameter for utilization data

#### 3.3 Pipeline Runs (for parallel job analysis)
```
GET https://dev.azure.com/{organization}/{project}/_apis/pipelines/runs?api-version=7.1
```

**Response includes**:
- `createdDate` (when queued)
- `startedDate` (when started)
- `finishedDate` (when completed)

**Use Case**: Calculate queue wait times to determine if more parallel jobs would help.

#### 3.4 Pool Consumption Report (Preview)
Azure DevOps Portal provides a pool consumption report showing job concurrency over 30 days. This data is not directly exposed via API but can be approximated by analyzing pipeline run timestamps.

### Implementation Pattern
```typescript
import * as azdev from "azure-devops-node-api";

const orgUrl = "https://dev.azure.com/my-org";
const token = process.env.AZURE_DEVOPS_PAT;

const authHandler = azdev.getPersonalAccessTokenHandler(token);
const connection = new azdev.WebApi(orgUrl, authHandler);

// Get user entitlements
const memberEntitlementClient = await connection.getMemberEntitlementManagementApi();
const entitlements = await memberEntitlementClient.getUserEntitlements();

// Get agent pools
const taskAgentClient = await connection.getTaskAgentApi();
const pools = await taskAgentClient.getAgentPools();
```

### Audit Logs for User Activity
```
GET https://auditservice.dev.azure.com/{organization}/_apis/audit/auditlog?api-version=7.1
```

**Note**: Requires organization-level "View audit log" permission. Events retained for 90 days.

### Alternatives Considered
- **Azure Portal scraping**: Fragile, not recommended
- **Power BI connector**: Good for visualization but not programmatic analysis

### Sources
- https://learn.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs
- https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/agents/list
- https://learn.microsoft.com/en-us/azure/devops/organizations/audit/azure-devops-auditing

---

## 4. Pricing Data

### Decision
Use hardcoded pricing with configurable overrides.

### Rationale
- Platform pricing APIs are not publicly available
- Pricing is relatively stable and published on public pricing pages
- Allows organizations to override with negotiated rates

### GitHub Pricing (as of 2026)
| Resource | Free Tier | Overage |
|----------|-----------|---------|
| Actions (Linux) | 2,000 min/mo | $0.008/min |
| Actions (Windows) | 2,000 min/mo | $0.016/min |
| Actions (macOS) | 200 min/mo | $0.08/min |
| LFS Storage | 1 GB | $0.0875/GB/mo |
| LFS Bandwidth | 1 GB | $0.0875/GB |
| Codespaces (2-core) | 60 hrs/mo | $0.18/hr |
| Codespaces (4-core) | 30 hrs/mo | $0.36/hr |

**Note**: Minutes multipliers apply for macOS (10x) and Windows (2x).

### Azure DevOps Pricing (as of 2026)
| Resource | Free Tier | Overage |
|----------|-----------|---------|
| Parallel jobs (MS-hosted) | 1 job | $40/job/mo |
| Parallel jobs (self-hosted) | 1 job | $15/job/mo |
| Basic user license | 5 users | $6/user/mo |
| Basic + Test Plans | - | $52/user/mo |

### Implementation
```typescript
// src/tools/shared/pricing.ts
export const DEFAULT_PRICING = {
  github: {
    actions: {
      UBUNTU: 0.008,    // per minute
      WINDOWS: 0.016,   // per minute  
      MACOS: 0.08,      // per minute
    },
    lfs: {
      storage: 0.0875,  // per GB/month
      bandwidth: 0.0875 // per GB
    },
    codespaces: {
      "2-core": 0.18,   // per hour
      "4-core": 0.36,   // per hour
      "8-core": 0.72,   // per hour
    }
  },
  azureDevOps: {
    parallelJobs: {
      hosted: 40,       // per job/month
      selfHosted: 15,   // per job/month
    },
    licenses: {
      basic: 6,         // per user/month
      basicTestPlans: 52 // per user/month
    }
  }
};
```

### Sources
- https://github.com/pricing
- https://azure.microsoft.com/en-us/pricing/details/devops/azure-devops-services/

---

## 5. CLI Framework

### Decision
Use `commander` for CLI argument parsing.

### Rationale
- Most popular Node.js CLI framework
- Excellent TypeScript support
- Simple API for subcommands and options

### CLI Structure
```bash
finops-agent analyze github --org <org-name>
finops-agent analyze azdo --org <org-name>
finops-agent analyze all --github-org <org> --azdo-org <org>
finops-agent report --format json|markdown
```

### Alternatives Considered
- **yargs**: More verbose API
- **oclif**: Overkill for single CLI tool
- **clipanion**: Less community adoption

---

## 6. Configuration Management

### Decision
Use environment variables with optional JSON config file.

### Rationale
- Follows 12-factor app principles
- Supports both local development and CI/CD environments
- Credentials never exposed in CLI arguments (FR-019)

### Configuration Schema
```typescript
interface FinOpsConfig {
  github?: {
    token: string;           // GITHUB_TOKEN env var
    organizations: string[]; // Orgs to analyze
  };
  azureDevOps?: {
    pat: string;             // AZURE_DEVOPS_PAT env var
    organizations: string[]; // Orgs to analyze
  };
  pricing?: {
    github?: Partial<GitHubPricing>;
    azureDevOps?: Partial<AzDOPricing>;
  };
  thresholds?: {
    inactiveDays: number;    // Default: 90
    minSavingsToReport: number; // Default: $10/month
  };
}
```

### Sources
- Best practices for credential management

---

## 7. HTTP Client for Azure DevOps VSAEX APIs

### Decision
Use Node.js built-in `fetch` (v18+)

### Rationale
- **Zero dependencies**: Already available in Node.js 20+
- **TypeScript native**: Built-in types, no @types package needed
- **ToolResult pattern alignment**: Forces explicit error checking (`response.ok`) which matches our structured error handling requirement
- **Azure DevOps compatibility**: Reference implementation already uses `fetch` successfully

**Comparison**:

| Aspect | `fetch` (v18+) | `axios` |
|--------|----------------|---------|
| Bundle Size | ✅ 0 bytes (built-in) | ❌ +30KB with dependencies |
| Error Handling | ⚠️ Only rejects on network errors | ✅ Rejects on any error |
| Basic Auth | ✅ Native via headers | ✅ Native via headers |
| TypeScript | ✅ Built-in types | ✅ Via @types/axios |

### Implementation Pattern

```typescript
async function fetchWithBasicAuth<T>(
  url: string,
  pat: string,
  options: { timeout?: number } = {}
): Promise<ToolResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'finops-agent/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: `Azure DevOps API error: ${response.statusText}`,
          retryable: response.status === 429 || response.status === 503,
        },
      };
    }

    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        code: (error as any).code === 'ABORT_ERR' ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: `Failed to fetch: ${(error as Error).message}`,
        retryable: true,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### Alternatives Considered
- **axios**: Adds dependency; automatic error throwing conflicts with ToolResult pattern

---

## 8. Sequential Batching for API Concurrency

### Decision
Use `p-limit` library for concurrency control (3-5 concurrent requests max per NFR-001)

### Rationale
- **Industry standard**: 100M+ downloads/week on npm
- **Simple API**: `const limit = pLimit(3); await limit(() => fetch(...))`
- **Per-item error handling**: Works with `Promise.allSettled` for partial failures
- **Octokit integration**: Doesn't interfere with Octokit's throttling plugin
- **TypeScript support**: Included types

**Comparison**:

| Pattern | Pros | Cons |
|---------|------|------|
| Manual Promise.all() chunks | No dependencies | Verbose, no per-item errors |
| **p-limit** ✅ | Clean API, error handling | +5KB dependency |
| RxJS queue | Fine-grained control | Overkill, learning curve |

### Implementation Pattern

```typescript
import pLimit from 'p-limit';

async function batchApiCalls<TItem, TResult>(
  items: TItem[],
  apiCall: (item: TItem) => Promise<TResult>,
  concurrencyLimit: number = 3
): Promise<{ results: TResult[]; errors: Array<{ item: TItem; error: Error }> }> {
  const limit = pLimit(concurrencyLimit);
  const results: TResult[] = [];
  const errors: Array<{ item: TItem; error: Error }> = [];

  const promises = items.map((item, index) =>
    limit(async () => {
      try {
        const result = await apiCall(item);
        results[index] = result;
        return result;
      } catch (error) {
        errors.push({ item, error: error as Error });
        return null;
      }
    })
  );

  await Promise.allSettled(promises);

  return {
    results: results.filter(r => r !== null),
    errors,
  };
}

// Usage: Fetch billing for 5 repos with 3 concurrent requests
const { results, errors } = await batchApiCalls(
  ['repo1', 'repo2', 'repo3', 'repo4', 'repo5'],
  (repo) => octokit.billing.getGithubActionsBillingOrg({ org: repo }),
  3 // Max 3 concurrent (per NFR-001)
);
```

**Integration with Rate Limiting**:
- `p-limit` controls **concurrency** (how many at once)
- Octokit throttling plugin handles **rate limits** (429 responses)
- Together: Efficient batching that respects GitHub rate limits

### Alternatives Considered
- **Manual chunking**: More code, no error handling
- **Async iterators**: Less intuitive API

---

## 9. Report Output Formats

### Decision
Dual-format reporter with shared data model (JSON + human-readable text)

### Rationale
- **FR-017**: Human-readable reports required
- **FR-018**: Machine-readable JSON required
- **FR-019**: Executive summary with top 3 recommendations
- **SC-006**: JSON must validate against schema
- **Single source of truth**: AnalysisReport entity contains all data, formatters are presentation layer

### JSON Schema Structure

```json
{
  "version": "1.0.0",
  "timestamp": "2025-02-04T10:00:00Z",
  "scope": {
    "platforms": ["github", "azdo"],
    "organizations": ["my-org"],
    "dateRange": { "start": "...", "end": "..." }
  },
  "summary": {
    "totalCost": 1250.50,
    "potentialSavings": {
      "monthly": 450.00,
      "annual": 5400.00
    },
    "topRecommendations": [...]
  },
  "metrics": [...],
  "recommendations": [...],
  "diagnostics": [
    {
      "level": "warning",
      "code": "PRICING_STALE_45DAYS",
      "message": "Pricing data is 45 days old..."
    }
  ]
}
```

### Text Format Template

```
================================================================================
  FINOPS ANALYSIS REPORT
================================================================================

Analysis Date: 2025-02-04T10:00:00Z
Period: 2024-11-05 to 2025-02-04
Platforms: GitHub, Azure DevOps

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Total Monthly Cost: $1,250.50
Potential Savings: $450.00/month ($5,400.00/year)

Top 3 Recommendations:
  1. Migrate macOS runners to Linux
     Impact: $3,600/year
     ✅ Auto-executable
  
  2. Remove 12 inactive user licenses
     Impact: $864/year
     ⚠️  Requires approval
  
  3. Optimize LFS storage for repo-xyz
     Impact: $420/year
     ✅ Auto-executable

DETAILED FINDINGS
--------------------------------------------------------------------------------
[Full recommendations with parameters for automation...]

DIAGNOSTICS
--------------------------------------------------------------------------------
⚠️ [PRICING_STALE_45DAYS] Pricing data is 45 days old...

================================================================================
End of Report
================================================================================
```

### Report Generator

```typescript
class ReportGenerator {
  async generate(
    report: AnalysisReport,
    format: 'json' | 'text' | 'both'
  ): Promise<{ json?: string; text?: string }> {
    // JSON format with schema validation (SC-006)
    if (format === 'json' || format === 'both') {
      const json = JSON.stringify(report, null, 2);
      const valid = validateReport(JSON.parse(json));
      if (!valid) {
        throw new Error('Report failed schema validation');
      }
      return { json };
    }
    
    // Text format (SC-007: understandable without platform knowledge)
    if (format === 'text' || format === 'both') {
      return { text: formatTextReport(report) };
    }
  }
}
```

### Alternatives Considered
- **Markdown format**: More complex to parse, text is sufficient for human readability
- **Separate data models**: Violates DRY, risks inconsistency between formats
- **Only JSON**: Doesn't meet FR-017 (human-readable required)

---

## Summary of Technology Stack

| Component | Technology | Version | Decision Rationale |
|-----------|------------|---------|-------------------|
| Runtime | Node.js | 20+ | Required for built-in fetch, stable LTS |
| Language | TypeScript | 5.x | Type safety, Copilot SDK native support |
| Module System | ESM | Required | Copilot SDK dependency |
| Agent Orchestration | @github/copilot-sdk | 0.1.x | Production-tested, native tool registration |
| GitHub API | @octokit/rest + @octokit/plugin-throttling | 21.x + 9.x | Official SDK with automatic rate limiting |
| Azure DevOps API | azure-devops-node-api | 14.x | Official Microsoft SDK |
| HTTP Client | Node.js fetch | Built-in | Zero dependencies, ToolResult alignment |
| Schema Validation | zod | 3.x | Tool parameter validation |
| Concurrency Control | p-limit | 5.x | Simple API, per-item error handling |
| CLI Framework | commander | 12.x | Most popular, TypeScript support |
| Testing | vitest | 2.x | Fast, ESM native, better than Jest |
| Output Styling | chalk | 5.x | Terminal colors for human-readable reports |

**All "NEEDS CLARIFICATION" items from Technical Context have been resolved through research.**

---

## 10. Authentication Patterns

### Decision
Use SDK-native credential discovery with CLI fallback (no shell execution).

### Rationale
- **FR-026**: Must validate credentials upfront via test API calls
- **Security**: No `execSync` or shell calls for credential discovery
- **Simplicity**: Leverage existing CLI auth where possible

### GitHub Authentication
```typescript
// Option 1: Explicit token (recommended for CI/CD)
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Option 2: GitHub CLI credential discovery
import { createOctokit } from 'octokit-from-auth';
const octokit = await createOctokit();

// Credential validation (fail fast)
async function validateGitHubCredentials(octokit: Octokit): Promise<void> {
  try {
    await octokit.users.getAuthenticated();
  } catch (error) {
    throw new Error('GitHub authentication failed. Check GITHUB_TOKEN.');
  }
}
```

### Azure DevOps Authentication
```typescript
import { DefaultAzureCredential } from '@azure/identity';
import * as azdev from 'azure-devops-node-api';

// Option 1: Explicit PAT (recommended for CI/CD)
const authHandler = azdev.getPersonalAccessTokenHandler(process.env.AZURE_DEVOPS_PAT);

// Option 2: Azure CLI credential discovery
const credential = new DefaultAzureCredential();
const token = await credential.getToken('499b84ac-1321-427f-aa17-267ca6975798/.default');

// Credential validation (fail fast)
async function validateAzDoCredentials(connection: azdev.WebApi): Promise<void> {
  try {
    await connection.getCoreApi();
  } catch (error) {
    throw new Error('Azure DevOps authentication failed. Check credentials.');
  }
}
```

---

## 11. Recommendation Patterns

### Categories

| Category | Definition | Examples |
|----------|------------|----------|
| **cleanup** | Remove unused/abandoned resources | Delete inactive users, archive repos |
| **optimization** | Improve efficiency of existing resources | Switch runner types, reduce parallelism |
| **migration** | Move to different service/tier | Self-hosted agents, different license tier |
| **policy-change** | Organizational policy updates | Enforce branch policies, require approvals |

### Effort Units

| Effort | Time Estimate | Examples |
|--------|---------------|----------|
| **trivial** | < 1 hour | Remove single user, archive one repo |
| **low** | 1-4 hours | Update workflow files, reconfigure pool |
| **medium** | 4-16 hours | Migrate runners, restructure permissions |
| **high** | > 16 hours | Major infrastructure changes, policy rollout |

### Priority Calculation
```typescript
function calculatePriority(rec: Recommendation): number {
  const roi = rec.savings.annual / getEffortHours(rec.executionParams.effort);
  const riskPenalty = { low: 1, medium: 0.8, high: 0.5 }[rec.executionParams.risk];
  return roi * riskPenalty;
}

function getEffortHours(effort: string): number {
  return { trivial: 0.5, low: 2, medium: 8, high: 24 }[effort];
}
```

---

## 12. Error Handling & Resilience

### ToolResult Pattern
All tool handlers return structured results:
```typescript
type ToolResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ToolError };

interface ToolError {
  code: string;           // Machine-readable error code
  message: string;        // Human-readable description
  retryable: boolean;     // Whether retry might succeed
  context?: Record<string, unknown>;
}
```

### Error Codes
| Code | Description | Retryable |
|------|-------------|-----------|
| `AUTH_FAILED` | Invalid credentials | No |
| `RATE_LIMITED` | API rate limit exceeded | Yes (with backoff) |
| `NOT_FOUND` | Resource doesn't exist | No |
| `PERMISSION_DENIED` | Insufficient permissions | No |
| `NETWORK_ERROR` | Connection failed | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `PARTIAL_FAILURE` | Some items failed | Partial |

### Partial Failure Handling (FR-027 to FR-029)
```typescript
interface PartialResult<T> {
  success: true;
  data: T[];
  warnings: Array<{
    code: string;
    message: string;
    affectedItems: string[];
  }>;
}
```

---

## 13. Testing Approach

### Test Categories

| Category | Purpose | Tools |
|----------|---------|-------|
| **Unit** | Test individual functions | Vitest + mocks |
| **Integration** | Test agent orchestration | Vitest + fixtures |
| **Contract** | Validate JSON schemas | ajv + schema files |
| **Snapshot** | Verify report output | Vitest snapshots |

### Mock Strategy
```typescript
// Mock GitHub API responses
import { vi } from 'vitest';

const mockOctokit = {
  billing: {
    getGithubActionsBillingOrg: vi.fn().mockResolvedValue({
      data: {
        total_minutes_used: 305,
        total_paid_minutes_used: 0,
        included_minutes: 3000,
        minutes_used_breakdown: { UBUNTU: 205, MACOS: 10, WINDOWS: 90 }
      }
    })
  }
};
```

### Test File Naming
- Source: `src/tools/github/get-actions-billing.ts`
- Test: `tests/unit/tools/github/get-actions-billing.test.ts`

---

## 14. Filter Syntax (Configuration-Based)

### Filter Configuration Format
```json
{
  "filters": {
    "repositories": {
      "include": ["frontend-*", "backend-*"],
      "exclude": ["*-deprecated", "archive-*"]
    },
    "projects": {
      "include": ["ProjectA", "ProjectB"],
      "exclude": []
    },
    "users": {
      "exclude": ["service-account-*", "bot-*"]
    },
    "resourceTypes": {
      "include": ["actions-minutes", "user-license"],
      "exclude": ["codespaces-hours"]
    }
  }
}
```

### Filter Evaluation
```typescript
function matchesFilter(
  value: string, 
  filter: { include?: string[]; exclude?: string[] }
): boolean {
  // Exclude takes precedence
  if (filter.exclude?.some(pattern => globMatch(value, pattern))) {
    return false;
  }
  // If include is specified, value must match
  if (filter.include && filter.include.length > 0) {
    return filter.include.some(pattern => globMatch(value, pattern));
  }
  // No include filter means include all
  return true;
}
```
