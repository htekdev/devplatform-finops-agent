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

## Summary of Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18+ |
| Language | TypeScript | 5.x |
| Module System | ESM | Required |
| Agent Orchestration | @github/copilot-sdk | 0.1.x |
| GitHub API | @octokit/rest | 21.x |
| Azure DevOps API | azure-devops-node-api | 14.x |
| Schema Validation | zod | 3.x |
| CLI Framework | commander | 12.x |
| Testing | vitest | 2.x |
| Output Styling | chalk | 5.x |
