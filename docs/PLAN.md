# DevPlatform FinOps Agent - Implementation Plan

> **Status:** Ready for Implementation  
> **Last Updated:** 2026-02-03  
> **Total Tasks:** 47 across 7 phases  
> **Estimated Effort:** ~2-3 weeks for MVP (Phases 1-6)

## Quick Navigation

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Work Plan](#work-plan)
  - [Phase 1: Project Foundation](#phase-1-project-foundation)
  - [Phase 2: GitHub Analyzer Agent](#phase-2-github-analyzer-agent)
  - [Phase 3: Azure DevOps Analyzer Agent](#phase-3-azure-devops-analyzer-agent)
  - [Phase 4: Cost Calculator Agent](#phase-4-cost-calculator-agent)
  - [Phase 5: Report Generator Agent](#phase-5-report-generator-agent)
  - [Phase 6: Orchestration & CLI](#phase-6-orchestration--cli)
  - [Phase 7: Polish & Documentation](#phase-7-polish--documentation)
- [Configuration Schema](#configuration-schema)
- [Success Criteria](#success-criteria)
- [Research Documents](#research-documents)

---

## Project Overview

**Name:** `devplatform-finops-agent`  
**Description:** A multi-agent system that analyzes GitHub and Azure DevOps usage to provide FinOps insights for engineering platforms—identifying waste, optimizing costs, and tracking license utilization.

**Tech Stack:**
- TypeScript with GitHub Copilot SDK
- Multi-agent orchestration pattern (shared state)
- GitHub Copilot SDK built-in LLM (no separate Azure OpenAI needed)

---

## Problem Statement

Engineering teams lack visibility into their CI/CD and platform spending:

| Platform | Cost Drivers | Pain Points |
|----------|--------------|-------------|
| **GitHub** | Actions minutes, LFS storage/bandwidth, Codespaces | Hidden costs, excessive usage, no optimization guidance |
| **Azure DevOps** | Parallel jobs (hosted vs self-hosted), user licenses | Purchased capacity underutilized, inactive licenses |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   DevPlatform FinOps Agent                      │
│                  (Orchestrator / Supervisor)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  GitHub Analyzer │  │ Azure DevOps     │                    │
│  │                  │  │ Analyzer         │                    │
│  │  • Actions mins  │  │  • Parallel jobs │                    │
│  │  • LFS usage     │  │  • Self-hosted   │                    │
│  │  • Codespaces    │  │  • User licenses │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Cost Calculator │  │  Report          │                    │
│  │                  │  │  Generator       │                    │
│  │  • Pricing data  │  │  • Markdown      │                    │
│  │  • Projections   │  │  • JSON export   │                    │
│  │  • Comparisons   │  │  • Recommendations│                   │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │         Shared State (TypeScript)       │                   │
│  │  • GitHub usage data                    │                   │
│  │  • Azure DevOps usage data              │                   │
│  │  • Calculated costs                     │                   │
│  │  • Recommendations                      │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  APIs:                                                          │
│  • GitHub REST API (billing, actions, LFS, codespaces)         │
│  • Azure DevOps REST API (pipelines, licensing, agents)        │
│  LLM: GitHub Copilot SDK built-in                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Responsibilities

### 1. GitHub Analyzer Agent
**Purpose:** Analyze GitHub platform costs

| Metric | API Source | Analysis |
|--------|------------|----------|
| Actions minutes by repo/workflow | `/orgs/{org}/settings/billing/actions` | Top consumers, trends, inefficient workflows |
| LFS storage & bandwidth | `/orgs/{org}/settings/billing/shared-storage` | Large files, bandwidth spikes |
| Codespaces usage | `/orgs/{org}/settings/billing/codespaces` | Hours used, idle time, machine specs |

### 2. Azure DevOps Analyzer Agent
**Purpose:** Analyze Azure DevOps platform costs

| Metric | API Source | Analysis |
|--------|------------|----------|
| Parallel job consumption | `/_apis/distributedtask/pools` | Hosted vs self-hosted utilization |
| Pipeline run history | `/_apis/pipelines/runs` | Queue times, duration trends |
| User license status | `/_apis/graph/users` | Last access date, license type |
| Agent pool usage | `/_apis/distributedtask/pools/{poolId}/agents` | Self-hosted capacity |

### 3. Cost Calculator Agent
**Purpose:** Convert usage metrics to dollars

- Fetch pricing data from GitHub/Azure APIs (research availability, fallback to config)
- Apply current pricing tiers (GitHub/Azure)
- Calculate cost per team/repo/project
- Project future spend based on trends
- Compare self-hosted vs hosted ROI

### 4. Report Generator Agent
**Purpose:** Synthesize findings into actionable reports

- Executive summary with top 3 recommendations
- Detailed breakdown by platform
- Optimization opportunities with $ impact
- License cleanup candidates
- Export formats: Markdown, JSON

---

## Delivery Modes

| Mode | Description | Priority |
|------|-------------|----------|
| **CLI** | On-demand analysis via command line | P0 (MVP) |
| **Scheduled** | Cron-based weekly/monthly reports | P1 |
| **API** | REST endpoint for integrations | P1 |
| **Webhooks** | Real-time alerts on thresholds | P2 |

---

## Work Plan

---

### Phase 1: Project Foundation

**Goal:** Set up the project infrastructure, dependencies, and core patterns.

**Dependencies:** None (starting point)

#### 1.1 Initialize TypeScript Project
- [x] Create `package.json` with project metadata
- [x] Install dependencies:
  - `@github/copilot-sdk` - Agent runtime
  - `@octokit/rest` - GitHub API client
  - `axios` - Azure DevOps API client
  - `zod` - Schema validation
  - `commander` - CLI framework
  - `chalk` - Terminal styling
  - `dotenv` - Environment config
- [x] Configure `tsconfig.json` with strict mode
- [x] Set up ESLint and Prettier
- [x] Create npm scripts: `build`, `dev`, `test`, `lint`

**Acceptance Criteria:**
- [x] `npm install` completes without errors
- [x] `npm run build` compiles TypeScript successfully
- [x] `npm run lint` passes with no errors

#### 1.2 Set Up Project Structure
- [x] Create directory structure:
  ```
  src/
  ├── agents/           # Agent definitions
  │   ├── github-analyzer.ts
  │   ├── azdo-analyzer.ts
  │   ├── cost-calculator.ts
  │   ├── report-generator.ts
  │   └── orchestrator.ts
  ├── tools/            # Agent tools
  │   ├── github/
  │   ├── azdo/
  │   ├── cost/
  │   └── report/
  ├── clients/          # API clients
  │   ├── github-client.ts
  │   └── azdo-client.ts
  ├── types/            # TypeScript interfaces
  │   ├── config.ts
  │   ├── state.ts
  │   ├── github.ts
  │   ├── azdo.ts
  │   └── report.ts
  ├── utils/            # Shared utilities
  │   ├── cache.ts
  │   ├── logger.ts
  │   └── pricing.ts
  ├── cli/              # CLI entry points
  │   └── index.ts
  └── index.ts          # Main export
  ```

**Acceptance Criteria:**
- [x] All directories exist with placeholder files
- [x] Main entry point exports key modules

#### 1.3 Define Shared State Interface
- [x] Create `src/types/state.ts` with:
  - `FinOpsState` - Root state interface
  - `GitHubUsageData` - GitHub metrics
  - `AzureDevOpsUsageData` - ADO metrics
  - `CalculatedCosts` - Cost calculations
  - `Recommendation` - Individual recommendation
- [x] State must support multiple organizations
- [x] State must be serializable to JSON (for debugging/caching)

**Acceptance Criteria:**
- [x] State interface compiles with no type errors
- [x] State can represent data from 5+ GitHub orgs and 5+ ADO orgs
- [x] State includes timestamps for cache invalidation

#### 1.4 Create Configuration Schema
- [x] Create `src/types/config.ts` with Zod schemas:
  - `GitHubConfigSchema` - GitHub org config + thresholds
  - `AzureDevOpsConfigSchema` - ADO org config + thresholds
  - `ReportingConfigSchema` - Output preferences
  - `FinOpsConfigSchema` - Combined root config
- [x] Support loading from:
  - JSON file (`--config config.json`)
  - Environment variables (`GITHUB_TOKEN`, `AZDO_PAT`)
  - CLI flags (override config file)
- [x] Create `src/utils/config-loader.ts`

**Acceptance Criteria:**
- [x] Invalid config throws descriptive Zod errors
- [x] Environment variables override config file values
- [x] Sensitive values (tokens) can be provided via env vars only

#### 1.5 Implement API Response Caching
- [x] Create `src/utils/cache.ts` with:
  - File-based cache (JSON in `.cache/` directory)
  - TTL-based expiration (configurable, default 1 hour)
  - Cache key generation from request params
  - `get<T>(key)`, `set<T>(key, value, ttl)`, `invalidate(key)`
- [x] Add `--no-cache` CLI flag to bypass cache
- [x] Add `--cache-ttl <seconds>` CLI flag

**Acceptance Criteria:**
- [x] Repeated API calls return cached data within TTL
- [x] Cache files are human-readable JSON
- [x] `--no-cache` forces fresh API calls
- [x] Cache directory can be configured

#### 1.6 Set Up Development Environment
- [x] Create `.env.example` with all required variables:
  ```
  GITHUB_TOKEN=ghp_xxx
  GITHUB_ORGS=org1,org2
  AZDO_PAT=xxx
  AZDO_ORGS=org1,org2
  LOG_LEVEL=info
  CACHE_TTL=3600
  ```
- [x] Create `src/utils/logger.ts` with log levels
- [x] Add npm scripts for development:
  - `dev` - Run with ts-node and watch
  - `debug` - Run with debugger attached

**Acceptance Criteria:**
- [x] `npm run dev` starts the CLI in watch mode
- [x] Missing required env vars produce helpful error messages
- [x] Logger respects LOG_LEVEL setting

---

### Phase 2: GitHub Analyzer Agent

**Goal:** Build the agent that fetches and analyzes GitHub billing/usage data.

**Dependencies:** Phase 1 complete

#### 2.1 Implement GitHub API Client
- [ ] Create `src/clients/github-client.ts`:
  - Initialize Octokit with token from config
  - Implement rate limit handling (check headers, exponential backoff)
  - Implement pagination helper for large result sets
  - Add request/response logging at debug level
- [ ] Methods to implement:
  - `getActionsBilling(org: string)`
  - `getStorageBilling(org: string)`
  - `getCodespacesBilling(org: string)`
  - `getCacheUsage(org: string)`
  - `listWorkflowRuns(org: string, repo: string, options?)`
  - `listRepositories(org: string)`

**Acceptance Criteria:**
- Client handles 403 rate limit responses gracefully
- Client paginates automatically for >100 results
- All methods return typed responses matching API docs
- Network errors produce actionable error messages

#### 2.2 Build Actions Billing Data Fetcher
- [ ] Create `src/tools/github/actions-billing.ts`:
  - Fetch org-level Actions billing summary
  - Fetch per-repo workflow run history (last 30 days)
  - Calculate minutes by OS type (Ubuntu, Windows, macOS)
  - Identify top 10 workflows by minutes consumed
  - Detect failed runs that consumed significant minutes
- [ ] Store results in shared state under `github.actions`

**Acceptance Criteria:**
- Returns total minutes, paid minutes, included minutes
- Breaks down by runner OS type
- Identifies workflows consuming >10% of total minutes
- Handles orgs with no Actions usage gracefully

#### 2.3 Build LFS Usage Data Fetcher
- [ ] Create `src/tools/github/lfs-billing.ts`:
  - Fetch shared storage billing
  - Calculate storage cost projections
  - Identify bandwidth trends (if available)
- [ ] Store results in shared state under `github.lfs`

**Acceptance Criteria:**
- Returns current storage, estimated monthly storage
- Calculates projected paid storage
- Handles orgs with no LFS usage gracefully

#### 2.4 Build Codespaces Usage Data Fetcher
- [ ] Create `src/tools/github/codespaces-billing.ts`:
  - Fetch Codespaces billing summary
  - List active Codespaces with machine types
  - Calculate hours by machine spec
  - Identify potentially idle Codespaces (last_used_at > 7 days)
- [ ] Store results in shared state under `github.codespaces`

**Acceptance Criteria:**
- Returns total hours, paid hours, included hours
- Lists Codespaces with machine specs and last activity
- Flags Codespaces inactive for >7 days
- Handles orgs with Codespaces disabled gracefully

#### 2.5 Create GitHub Analyzer Agent
- [x] Create `src/agents/github-analyzer.ts`:
  - Use Copilot SDK `defineTool` for each data fetcher
  - Define agent system prompt for GitHub analysis context
  - Agent should analyze data and identify:
    - Unusual spikes in usage
    - Inefficient workflows (high failure rate, long duration)
    - Cost optimization opportunities
- [x] Tools to register:
  - `fetch_actions_billing` - Get Actions usage
  - `fetch_lfs_billing` - Get LFS usage
  - `fetch_codespaces_billing` - Get Codespaces usage
  - `analyze_workflow_efficiency` - Analyze specific workflow
  - `get_github_usage_summary` - Get all GitHub data at once

**Acceptance Criteria:**
- [x] Agent can be invoked standalone for GitHub-only analysis
- [x] Agent populates shared state with all GitHub metrics
- [x] Agent produces preliminary insights (not just raw data)
- [x] Agent handles API errors and reports them clearly

#### 2.6 Write Unit Tests
- [ ] Create `tests/github/` with tests for:
  - API client mocking and response parsing
  - Billing data calculations
  - Edge cases (empty orgs, rate limits, API errors)
  - Cache hit/miss scenarios

**Acceptance Criteria:**
- >80% code coverage for GitHub client and tools
- Tests run in <30 seconds
- Tests don't make real API calls (fully mocked)

---

### Phase 3: Azure DevOps Analyzer Agent

**Goal:** Build the agent that fetches and analyzes Azure DevOps usage data.

**Dependencies:** Phase 1 complete (can run parallel with Phase 2)

#### 3.1 Implement Azure DevOps API Client
- [x] Create `src/clients/azdo-client.ts`:
  - Initialize axios with PAT auth (Basic auth header)
  - Handle multiple base URLs (dev.azure.com, vssps.dev.azure.com, vsaex.dev.azure.com)
  - Implement continuation token pagination
  - Add request/response logging at debug level
- [x] Methods to implement:
  - `getAgentPools(org: string)`
  - `getAgentsInPool(org: string, poolId: number)`
  - `getPipelineRuns(org: string, project: string, options?)`
  - `getUserEntitlements(org: string)`
  - `getProjects(org: string)`

**Acceptance Criteria:**
- [x] Client correctly uses different base URLs per API
- [x] Client handles continuation tokens automatically
- [x] All methods return typed responses
- [x] Auth errors produce clear "check PAT scopes" message

#### 3.2 Build Parallel Job Usage Fetcher
- [x] Create `src/tools/azdo/parallel-jobs.ts`:
  - Fetch all agent pools (hosted and self-hosted)
  - Calculate utilization: (running jobs / pool size)
  - Compare hosted vs self-hosted capacity
  - Identify pools with low utilization (<30%)
  - Identify pools with high queue times
- [x] Store results in shared state under `azdo.parallelJobs`

**Acceptance Criteria:**
- [x] Returns pool list with hosted/self-hosted classification
- [x] Calculates utilization percentage per pool
- [x] Identifies underutilized pools
- [x] Handles orgs with only hosted runners gracefully

#### 3.3 Build Pipeline Run History Fetcher
- [x] Create `src/tools/azdo/pipeline-runs.ts`:
  - Fetch pipeline runs (last 30 days)
  - Calculate average duration, queue time, success rate
  - Identify slowest pipelines (top 10 by duration)
  - Identify most failed pipelines (top 10 by failure rate)
  - Calculate total pipeline minutes consumed
- [x] Store results in shared state under `azdo.pipelines`

**Acceptance Criteria:**
- [x] Returns pipeline statistics aggregated by pipeline
- [x] Includes success rate, avg duration, avg queue time
- [x] Identifies pipelines with >20% failure rate
- [x] Handles projects with no pipelines gracefully

#### 3.4 Build User License Status Fetcher
- [x] Create `src/tools/azdo/user-licenses.ts`:
  - Fetch all user entitlements
  - Categorize by license type (Basic, Stakeholder, etc.)
  - Calculate days since last access
  - Identify inactive users (no access in N days, configurable)
  - Calculate potential savings from license reclamation
- [x] Store results in shared state under `azdo.licenses`

**Acceptance Criteria:**
- [x] Returns user count by license type
- [x] Lists users inactive for >30 days (configurable threshold)
- [x] Calculates monthly cost of inactive licenses
- [x] Handles orgs with <10 users gracefully

#### 3.5 Build Agent Pool Metrics Fetcher
- [x] Create `src/tools/azdo/agent-pools.ts`:
  - Fetch agent details per pool
  - Calculate online vs offline agents
  - Identify agents that haven't run jobs recently
  - Estimate self-hosted infrastructure utilization
- [x] Store results in shared state under `azdo.agents`

**Acceptance Criteria:**
- [x] Returns agent list with status (online/offline)
- [x] Calculates self-hosted agent utilization
- [x] Identifies agents offline for >7 days
- [x] Handles pools with no agents gracefully

#### 3.6 Create Azure DevOps Analyzer Agent
- [x] Create `src/agents/azdo-analyzer.ts`:
  - Use Copilot SDK `defineTool` for each data fetcher
  - Define agent system prompt for ADO analysis context
  - Agent should analyze data and identify:
    - License waste (inactive users)
    - Hosted vs self-hosted ROI opportunities
    - Pipeline efficiency issues
- [x] Tools to register:
  - `fetch_parallel_job_usage` - Get pool utilization
  - `fetch_pipeline_runs` - Get pipeline stats
  - `fetch_user_licenses` - Get license data
  - `fetch_agent_metrics` - Get agent health
  - `get_azdo_usage_summary` - Get all ADO data at once

**Acceptance Criteria:**
- [x] Agent can be invoked standalone for ADO-only analysis
- [x] Agent populates shared state with all ADO metrics
- [x] Agent produces preliminary insights
- [x] Agent handles API errors and reports them clearly

#### 3.7 Write Unit Tests
- [ ] Create `tests/azdo/` with tests for:
  - API client mocking and response parsing
  - License calculations
  - Utilization calculations
  - Edge cases (empty orgs, auth errors)

**Acceptance Criteria:**
- >80% code coverage for ADO client and tools
- Tests run in <30 seconds
- Tests don't make real API calls (fully mocked)

---

### Phase 4: Cost Calculator Agent

**Goal:** Convert usage metrics into dollar amounts and projections.

**Dependencies:** Phase 2 and Phase 3 complete

#### 4.1 Define Pricing Data Structures
- [x] Create `src/types/pricing.ts`:
  - `GitHubPricing` - Actions per-minute rates, LFS rates, Codespaces rates
  - `AzureDevOpsPricing` - Parallel job costs, license costs
  - `PricingSource` - Config-based or API-fetched
- [x] Create `src/utils/pricing.ts`:
  - Load pricing from config file (JSON)
  - Fallback to hardcoded defaults with warning
  - Support currency conversion (optional)
- [x] Default pricing (as of 2024)

**Acceptance Criteria:**
- [x] Pricing can be overridden via config file
- [x] Pricing data includes last-updated timestamp
- [x] Warning shown if using hardcoded defaults >90 days old

#### 4.2 Implement Cost Calculation Logic
- [x] Create `src/tools/cost/calculator.ts`:
  - `calculateGitHubCosts(usage: GitHubUsageData): GitHubCosts`
  - `calculateAzdoCosts(usage: AzureDevOpsUsageData): AzdoCosts`
  - `calculateTotalCosts(state: FinOpsState): TotalCosts`
- [x] Breakdown costs by:
  - Organization
  - Repository (GitHub) / Project (ADO)
  - Cost category (compute, storage, licenses)
- [x] Store results in shared state under `costs`

**Acceptance Criteria:**
- [x] Costs match billing API data (self-validating)
- [x] Costs broken down to org/repo/project level
- [x] Handles partial data (GitHub only or ADO only)
- [x] Returns $0 for unused features (not errors)

#### 4.3 Build Self-Hosted vs Hosted Comparison
- [x] Create `src/tools/cost/hosted-comparison.ts`:
  - Calculate current hosted runner costs
  - Estimate self-hosted equivalent (hardware, maintenance)
  - Calculate break-even point
  - Factor in:
    - Queue time savings
    - Infrastructure management overhead
    - Scaling flexibility
- [x] Produce recommendation: "Stay hosted" or "Consider self-hosted"

**Acceptance Criteria:**
- [x] Comparison includes TCO (Total Cost of Ownership)
- [x] Includes non-cost factors (maintenance burden)
- [x] Produces clear recommendation with reasoning
- [x] Handles orgs already using self-hosted

#### 4.4 Create Cost Calculator Agent
- [x] Create `src/agents/cost-calculator.ts`:
  - Use Copilot SDK `defineTool` for cost functions
  - Agent reads from shared state (populated by analyzer agents)
  - Agent should:
    - Calculate all costs
    - Identify top cost drivers
    - Compare to previous periods (if data available)
    - Suggest cost optimization opportunities
- [x] Tools to register:
  - `calculate_github_costs` - GitHub cost breakdown
  - `calculate_azdo_costs` - ADO cost breakdown
  - `compare_hosted_options` - Self-hosted ROI analysis
  - `project_future_costs` - Trend-based projection
  - `get_cost_summary` - Full cost analysis

**Acceptance Criteria:**
- [x] Agent produces accurate cost calculations
- [x] Agent identifies top 3 cost drivers
- [x] Agent can project costs 1/3/6 months ahead
- [x] Agent handles missing data gracefully

#### 4.5 Add Trend Analysis and Projections
- [x] Create `src/tools/cost/projections.ts`:
  - Calculate month-over-month growth rate
  - Project costs for next 1, 3, 6 months
  - Identify accelerating cost trends
  - Flag projected threshold breaches

**Acceptance Criteria:**
- [x] Projections based on actual historical data
- [x] Projections include confidence range
- [x] Flags projected costs exceeding thresholds
- [x] Handles insufficient historical data gracefully

---

### Phase 5: Report Generator Agent

**Goal:** Generate human-readable reports with actionable recommendations.

**Dependencies:** Phase 4 complete

#### 5.1 Design Report Schema
- [ ] Create `src/types/report.ts`:
  - `FinOpsReport` - Full report structure
  - `ExecutiveSummary` - High-level overview
  - `PlatformSection` - GitHub or ADO details
  - `RecommendationItem` - Individual recommendation
  - `CostBreakdown` - Tabular cost data
- [ ] Report sections:
  1. Executive Summary (1 paragraph + top 3 recommendations)
  2. Cost Overview (total, by platform, by category)
  3. GitHub Analysis (if applicable)
  4. Azure DevOps Analysis (if applicable)
  5. Recommendations (prioritized list)
  6. Appendix (raw data, methodology notes)

**Acceptance Criteria:**
- Report schema supports all required sections
- Schema is serializable to JSON
- Schema includes metadata (generated date, orgs analyzed)

#### 5.2 Implement Markdown Report Generator
- [ ] Create `src/tools/report/markdown-generator.ts`:
  - Generate clean, readable Markdown
  - Include tables for cost breakdowns
  - Include charts (ASCII or Mermaid diagrams)
  - Use clear headings and formatting
  - Make recommendations actionable (include steps)

**Acceptance Criteria:**
- Markdown renders correctly in GitHub/GitLab
- Tables align properly
- Report is <5 pages for typical org
- Each recommendation includes "How to implement" steps

#### 5.3 Implement JSON Export
- [ ] Create `src/tools/report/json-generator.ts`:
  - Export full report as JSON
  - Include raw data for programmatic access
  - Include calculated metrics
  - Schema documented in types

**Acceptance Criteria:**
- JSON validates against TypeScript types
- JSON includes all data needed to regenerate Markdown
- JSON is properly formatted (indented)

#### 5.4 Create Recommendations Engine
- [ ] Create `src/tools/report/recommendations.ts`:
  - Generate recommendations based on findings:
    - High Actions usage → Optimize workflows, use caching
    - Inactive licenses → Reclaim licenses
    - Low pool utilization → Reduce parallel jobs
    - High failure rate → Fix flaky pipelines
  - Prioritize by estimated $ impact
  - Include implementation steps for each
  - Categorize: Quick Wins, Medium Effort, Strategic

**Acceptance Criteria:**
- At least 3 recommendations generated per report
- Each recommendation has $ impact estimate
- Recommendations sorted by impact (highest first)
- No generic recommendations (all based on actual data)

#### 5.5 Create Report Generator Agent
- [ ] Create `src/agents/report-generator.ts`:
  - Use Copilot SDK `defineTool` for report functions
  - Agent reads from shared state (costs + recommendations)
  - Agent should:
    - Generate executive summary
    - Create full report in requested format
    - Tailor language for target audience
- [ ] Tools to register:
  - `generate_executive_summary` - Quick overview
  - `generate_markdown_report` - Full Markdown report
  - `generate_json_report` - Machine-readable export
  - `generate_recommendations` - Prioritized action items

**Acceptance Criteria:**
- Agent produces complete reports
- Reports are actionable (not just data dumps)
- Reports can be generated in <10 seconds
- Reports handle partial data (GitHub-only or ADO-only)

---

### Phase 6: Orchestration & CLI

**Goal:** Wire everything together with a usable CLI interface.

**Dependencies:** Phases 2-5 complete

#### 6.1 Build Orchestrator Agent
- [ ] Create `src/agents/orchestrator.ts`:
  - Supervisor agent that coordinates other agents
  - Execution flow:
    1. Parse user request
    2. Initialize shared state
    3. Run GitHub Analyzer (if GitHub orgs configured)
    4. Run ADO Analyzer (if ADO orgs configured)
    5. Run Cost Calculator
    6. Run Report Generator
    7. Return final report
  - Support partial runs (e.g., GitHub only)
  - Support interactive follow-up questions

**Acceptance Criteria:**
- Orchestrator correctly sequences agent calls
- Orchestrator handles agent failures gracefully
- Orchestrator supports "GitHub only" or "ADO only" modes
- Orchestrator can answer follow-up questions about data

#### 6.2 Implement Shared State Management
- [ ] Create `src/utils/state-manager.ts`:
  - Initialize empty state
  - Provide typed getters/setters
  - Support state snapshots (for debugging)
  - Validate state after each agent run
- [ ] State persistence (optional):
  - Save state to file after run
  - Load previous state for comparison

**Acceptance Criteria:**
- State is never mutated directly (always via manager)
- State can be serialized/deserialized to JSON
- Invalid state updates throw descriptive errors

#### 6.3 Create CLI Interface
- [ ] Create `src/cli/index.ts` using Commander:
  - `finops analyze github --org <org> [--org <org2>...]`
  - `finops analyze azdo --org <org> [--org <org2>...]`
  - `finops analyze all --config <file>`
  - `finops report --format md|json --output <path>`
  - `finops interactive` - Interactive Q&A mode
- [ ] Global options:
  - `--config <file>` - Config file path
  - `--output <path>` - Output file path
  - `--format <md|json>` - Output format
  - `--no-cache` - Disable caching
  - `--verbose` - Debug logging
  - `--quiet` - Minimal output

**Acceptance Criteria:**
- `finops --help` shows all commands and options
- Invalid commands produce helpful error messages
- CLI works without config file (uses env vars)
- Exit code 0 on success, non-zero on failure

#### 6.4 Add Interactive Mode
- [ ] Implement `finops interactive`:
  - After analysis, enter Q&A mode
  - User can ask follow-up questions:
    - "Which workflows are most expensive?"
    - "How much would we save by removing inactive users?"
    - "Show me the top 5 cost drivers"
  - Use Copilot SDK streaming for responses

**Acceptance Criteria:**
- Interactive mode works after analysis completes
- Questions answered based on collected data
- Graceful exit with Ctrl+C or "exit" command
- Context maintained across questions

---

### Phase 7: Polish & Documentation

**Goal:** Make the project production-ready and well-documented.

**Dependencies:** Phase 6 complete

#### 7.1 Create README
- [ ] Write comprehensive README.md:
  - Project overview and features
  - Quick start guide (5 minutes to first report)
  - Installation instructions
  - Configuration reference
  - CLI command reference
  - Authentication setup (GitHub PAT, ADO PAT)
  - Example output
  - Troubleshooting guide
  - Contributing guidelines

**Acceptance Criteria:**
- New user can run first analysis in <10 minutes
- All CLI commands documented with examples
- PAT scope requirements clearly documented
- FAQ section addresses common issues

#### 7.2 Add Example Configurations
- [ ] Create `examples/` directory:
  - `config.example.json` - Full config with all options
  - `config.github-only.json` - GitHub-only analysis
  - `config.azdo-only.json` - ADO-only analysis
  - `config.multi-org.json` - Multiple organizations

**Acceptance Criteria:**
- Examples are valid and work out of the box
- Each example has comments explaining options
- Examples cover common use cases

#### 7.3 Create Sample Reports
- [ ] Generate sample outputs:
  - `examples/sample-report.md` - Example Markdown report
  - `examples/sample-report.json` - Example JSON export
  - Include realistic (but fake) data

**Acceptance Criteria:**
- Sample reports demonstrate all report sections
- Data is realistic but clearly marked as sample
- Recommendations are realistic examples

#### 7.4 Add CI/CD
- [ ] Create GitHub Actions workflows:
  - `ci.yml` - Build, lint, test on PR
  - `release.yml` - Publish to npm on tag
- [ ] Add badges to README (build status, coverage)

**Acceptance Criteria:**
- CI runs on every PR
- CI fails if tests fail or lint errors exist
- Release workflow publishes to npm

#### 7.5 Performance Testing
- [ ] Test with large organizations:
  - 100+ repositories
  - 1000+ users
  - 10,000+ workflow runs
- [ ] Optimize bottlenecks:
  - Parallel API calls where possible
  - Efficient pagination
  - Memory usage for large datasets
- [ ] Document performance characteristics

**Acceptance Criteria:**
- Full analysis of 100-repo org completes in <5 minutes
- Memory usage stays under 512MB
- No rate limit errors with default settings

---

## Key APIs Reference

> **Full documentation available in `docs/research/`**

### GitHub Billing APIs
| Endpoint | Use | Doc Reference |
|----------|-----|---------------|
| `GET /orgs/{org}/settings/billing/actions` | Actions minutes | `octokit-github-api.md` |
| `GET /orgs/{org}/settings/billing/shared-storage` | LFS storage | `octokit-github-api.md` |
| `GET /orgs/{org}/settings/billing/codespaces` | Codespaces hours | `octokit-github-api.md` |
| `GET /orgs/{org}/actions/cache/usage` | Cache usage | `octokit-github-api.md` |
| `GET /repos/{owner}/{repo}/actions/runs` | Workflow runs | `octokit-github-api.md` |

**Required PAT Scopes:** `admin:org` (minimum), `repo` (recommended)

### Azure DevOps APIs
| Endpoint | Use | Doc Reference |
|----------|-----|---------------|
| `GET /_apis/distributedtask/pools` | Agent pools | `azure-devops-api.md` |
| `GET /_apis/distributedtask/pools/{id}/agents` | Agents in pool | `azure-devops-api.md` |
| `GET /{project}/_apis/pipelines/runs` | Pipeline runs | `azure-devops-api.md` |
| `GET https://vsaex.dev.azure.com/_apis/userentitlements` | User licenses | `azure-devops-api.md` |

**Required PAT Scopes:** `vso.agentpools`, `vso.build`, `vso.memberentitlementmanagement`

---

## Configuration Schema

### Full Configuration Interface

```typescript
interface FinOpsConfig {
  // GitHub Configuration
  github?: {
    organizations: string[];          // Orgs to analyze
    token: string;                    // PAT (env: GITHUB_TOKEN)
    thresholds?: {
      actionsMinutesWarning: number;  // Alert if monthly minutes exceed
      actionsMinutesCritical: number; // Critical alert threshold
      lfsStorageWarning: number;      // GB - alert threshold
      codespacesHoursWarning: number; // Hours - alert threshold
      workflowFailureRate: number;    // % - flag workflows above this
    };
    include?: {
      actions: boolean;               // Analyze Actions (default: true)
      lfs: boolean;                   // Analyze LFS (default: true)
      codespaces: boolean;            // Analyze Codespaces (default: true)
      cache: boolean;                 // Analyze cache usage (default: true)
    };
  };
  
  // Azure DevOps Configuration
  azureDevOps?: {
    organizations: string[];          // Orgs to analyze
    pat: string;                      // PAT (env: AZDO_PAT)
    thresholds?: {
      parallelJobUtilization: number; // % - flag pools below this
      inactiveUserDays: number;       // Days since last login
      pipelineFailureRate: number;    // % - flag pipelines above this
      queueTimeWarning: number;       // Minutes - alert if avg exceeds
    };
    include?: {
      parallelJobs: boolean;          // Analyze parallel jobs (default: true)
      pipelines: boolean;             // Analyze pipeline runs (default: true)
      licenses: boolean;              // Analyze user licenses (default: true)
      agents: boolean;                // Analyze agent pools (default: true)
    };
  };
  
  // Reporting Configuration
  reporting?: {
    format: 'markdown' | 'json' | 'both';
    outputDir: string;                // Output directory
    includeRecommendations: boolean;  // Include actionable recommendations
    includeRawData: boolean;          // Include raw API data in JSON
    maxRecommendations: number;       // Limit recommendations (default: 10)
  };
  
  // Caching Configuration
  cache?: {
    enabled: boolean;                 // Enable caching (default: true)
    ttlSeconds: number;               // Cache TTL (default: 3600)
    directory: string;                // Cache directory (default: .cache/)
  };
  
  // Pricing Overrides (optional)
  pricing?: {
    github?: {
      actions?: {
        ubuntu?: number;              // $/minute
        windows?: number;
        macos?: number;
      };
      lfs?: {
        storage?: number;             // $/GB/month
        bandwidth?: number;           // $/GB
      };
    };
    azureDevOps?: {
      parallelJobs?: {
        hosted?: number;              // $/month
        selfHosted?: number;
      };
      licenses?: {
        basic?: number;               // $/user/month
        basicTestPlans?: number;
      };
    };
  };
}
```

### Default Thresholds

| Platform | Metric | Warning | Critical |
|----------|--------|---------|----------|
| GitHub | Actions Minutes | 80% of included | 100% of included |
| GitHub | LFS Storage | 5 GB | 10 GB |
| GitHub | Codespaces Hours | 80% of included | 100% of included |
| GitHub | Workflow Failure Rate | 20% | 40% |
| ADO | Pool Utilization | <30% | <10% |
| ADO | Inactive User Days | 30 days | 90 days |
| ADO | Pipeline Failure Rate | 20% | 40% |
| ADO | Queue Time | 5 minutes | 15 minutes |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub PAT | If analyzing GitHub |
| `GITHUB_ORGS` | Comma-separated org list | If analyzing GitHub |
| `AZDO_PAT` | Azure DevOps PAT | If analyzing ADO |
| `AZDO_ORGS` | Comma-separated org list | If analyzing ADO |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | No (default: `info`) |
| `CACHE_TTL` | Cache TTL in seconds | No (default: `3600`) |
| `NO_CACHE` | Disable cache if set | No |

---

## Success Criteria

### MVP (Phases 1-6)

| Criteria | Metric | Target |
|----------|--------|--------|
| **Functionality** | CLI can analyze GitHub org | ✓ Pass |
| **Functionality** | CLI can analyze Azure DevOps org | ✓ Pass |
| **Functionality** | CLI produces cost report | ✓ Pass |
| **Functionality** | Report includes recommendations | ≥3 recommendations |
| **Accuracy** | Cost calculations match billing data | Self-validating |
| **Performance** | Full org analysis time | <5 minutes |
| **Performance** | Memory usage | <512 MB |
| **Reliability** | Handles API errors gracefully | No crashes |
| **Usability** | Time to first report (new user) | <10 minutes |

### Quality Gates

| Phase | Gate | Requirement |
|-------|------|-------------|
| Phase 1 | Build | `npm run build` succeeds |
| Phase 1 | Lint | `npm run lint` passes |
| Phase 2 | Tests | >80% coverage for GitHub client |
| Phase 3 | Tests | >80% coverage for ADO client |
| Phase 4 | Accuracy | Costs match billing API data |
| Phase 5 | Report | All report sections populated |
| Phase 6 | CLI | All commands work as documented |
| Phase 7 | Docs | README enables 10-minute onboarding |

### Definition of Done (per task)

- [ ] Code compiles with no TypeScript errors
- [ ] Unit tests written and passing
- [ ] Code reviewed (if team project)
- [ ] Documentation updated if API changed
- [ ] No new lint warnings introduced

---

## Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| **LLM Backend** | GitHub Copilot SDK built-in LLM | Simplest integration, no separate API keys needed |
| **Pricing Data Source** | Fetch from APIs, fallback to config | APIs may not exist, config provides flexibility |
| **Agent Communication** | Shared state pattern | Simple, debuggable, no message passing complexity |
| **Shared State Format** | TypeScript interface (in-memory) | Type-safe, fast, serializable for debugging |
| **Output Destination** | File with `--output` flag | CLI convention, supports piping |
| **API Caching** | Local file cache with TTL | Faster dev, avoids rate limits, debuggable |
| **Multi-Tenant Support** | Yes - multiple orgs per run | Common enterprise requirement |
| **Inactive User Alerts** | Reports only (no alerts in MVP) | Keep MVP simple, alerts are P1 |
| **Accuracy Validation** | Billing API as source of truth | Self-validating, no manual verification needed |
| **Token Scope Docs** | Minimum + recommended scopes | Users can choose based on needs |

---

## Dependencies

### NPM Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@github/copilot-sdk` | ^0.1.9 | Agent runtime and LLM |
| `@octokit/rest` | ^20.x | GitHub API client |
| `axios` | ^1.x | Azure DevOps API client |
| `zod` | ^3.x | Schema validation |
| `commander` | ^11.x | CLI framework |
| `chalk` | ^5.x | Terminal colors |
| `dotenv` | ^16.x | Environment config |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.x | Language |
| `vitest` | ^1.x | Testing framework |
| `eslint` | ^8.x | Linting |
| `prettier` | ^3.x | Formatting |
| `ts-node` | ^10.x | Dev execution |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GitHub billing API changes | Low | High | Pin API version, monitor deprecation notices |
| ADO API rate limiting | Medium | Medium | Implement caching, exponential backoff |
| Copilot SDK breaking changes | Medium | High | Pin SDK version, test upgrades carefully |
| Inaccurate pricing data | Low | Medium | Allow config override, warn if defaults old |
| Large org performance | Medium | Medium | Pagination, parallel calls, progress indicators |
| PAT permission errors | High | Low | Clear error messages, scope documentation |

---

## Research Documents

All API contracts and SDK documentation are in `docs/research/`:

| Document | Contents |
|----------|----------|
| `github-copilot-sdk.md` | Copilot SDK TypeScript API, sessions, tools, hooks |
| `github-copilot-custom-agents.md` | Custom agent file format (.agent.md) |
| `octokit-github-api.md` | GitHub billing APIs, Actions, Codespaces, LFS |
| `azure-devops-api.md` | ADO REST API, pools, agents, pipelines, licenses |

---

## Notes

- Reference `github-sre-agent` for Copilot SDK patterns
- Reference `github-research-agent` for multi-agent workflow patterns
- GitHub billing APIs require org admin permissions
- Azure DevOps user entitlements API requires Project Collection Admin
- Consider adding Mermaid diagrams in reports for visual cost breakdown
- Future: Add support for GitHub Enterprise Server (different API endpoints)
