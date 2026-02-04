# Implementation Plan: FinOps Analyzer Agent

**Branch**: `001-finops-analyzer` | **Date**: 2025-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-finops-analyzer/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a multi-agent FinOps analyzer that collects 90-day usage data from GitHub and Azure DevOps platforms, calculates costs, and generates actionable cost-saving recommendations with quantified dollar impact. The system uses the GitHub Copilot SDK for agent orchestration, where tools provide data collection capabilities and the LLM decides which tools to invoke and how to synthesize findings into prioritized recommendations. Output is provided in both human-readable and JSON formats for automation consumption.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (inferred from jest.config.js, industry standard for Copilot SDK)  
**Primary Dependencies**: 
  - `@github/copilot-sdk` - LLM agent orchestration
  - `@octokit/rest` + `@octokit/plugin-throttling` - GitHub API with rate limiting
  - `azure-devops-node-api` - Azure DevOps standard APIs
  - `zod` - Parameter validation for tools
  - NEEDS CLARIFICATION: HTTP client for Azure DevOps VSAEX APIs (fetch vs axios)
  - NEEDS CLARIFICATION: Pricing data source/format (API vs static config)

**Storage**: Files (JSON for cached pricing data) - no database needed for MVP  
**Testing**: Vitest (modern alternative to Jest, better TypeScript support)  
**Target Platform**: Node.js CLI application (cross-platform: Linux/Windows/macOS)  
**Project Type**: Single project (agent + tools)  
**Performance Goals**: 
  - Complete analysis of 100 GitHub repos within 5 minutes
  - Complete analysis of 50 Azure DevOps projects within 5 minutes
  - 3-5 concurrent API requests (rate limit compliance)
  
**Constraints**: 
  - Sequential batching required (per spec: avoid rate limit violations)
  - 90-day data retrieval window (per spec)
  - 30-day pricing staleness warning threshold (per spec)
  - Must return partial results on individual resource failures
  
**Scale/Scope**: 
  - GitHub: up to 100 repositories per organization
  - Azure DevOps: up to 50 projects per organization
  - Output: JSON reports 100KB-1MB (depending on org size)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Modular Agent Architecture ✅ PASS
- **Requirement**: Multi-agent system with clear separation of concerns
- **Plan Compliance**: 
  - GitHub data collection agent (separate responsibility)
  - Azure DevOps data collection agent (separate responsibility)
  - Recommendation generator agent (separate responsibility)
  - Orchestrator coordinates execution order
  - Each agent independently testable via tool mocks
- **Status**: Compliant - natural decomposition by platform and analysis phase

### II. Research-First Development ✅ PASS
- **Requirement**: Research APIs/libraries before implementation
- **Plan Compliance**: 
  - Phase 0 includes research.md generation
  - Reference contracts already document GitHub/Azure DevOps APIs (from prior research)
  - Research tasks: pricing data source, HTTP client choice, configuration management
- **Status**: Compliant - research phase planned

### III. Specification as Source of Truth ✅ PASS
- **Requirement**: Spec defines WHAT/WHY, plan defines HOW
- **Plan Compliance**: 
  - spec.md defines requirements, user stories, success criteria
  - plan.md (this file) defines technical choices, architecture
  - tasks.md will break down into executable work
- **Status**: Compliant - following spec-driven workflow

### IV. Test-First Development ✅ PASS
- **Requirement**: All production code must have tests
- **Plan Compliance**: 
  - contracts/test-pattern.reference.ts defines required patterns
  - contracts/testing-strategy.md.ts specifies tool tests (required)
  - Phase 1 includes test scaffolding
  - Every tool handler must have unit tests
- **Status**: Compliant - testing strategy defined

### V. Actionable Output ✅ PASS
- **Requirement**: All analysis must produce actionable recommendations
- **Plan Compliance**: 
  - Spec FR-012 through FR-016 mandate quantified recommendations
  - Spec requires execution parameters for automation
  - Spec requires prioritization by ROI
  - JSON schema defines structured output format
- **Status**: Compliant - spec enforces actionable output

**Overall Gate Status**: ✅ **PASS** - All principles satisfied, no violations require justification

## Project Structure

### Documentation (this feature)

```text
specs/001-finops-analyzer/
├── spec.md              # Feature specification (exists)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output - API research, pricing strategy
├── data-model.md        # Phase 1 output - Entities and schemas
├── quickstart.md        # Phase 1 output - Setup and usage guide
├── contracts/           # Reference contracts (exist)
│   ├── agent-pattern.reference.ts
│   ├── error-handling.reference.ts
│   ├── rate-limiting.reference.ts
│   ├── azdo-api.reference.ts
│   ├── test-pattern.reference.ts
│   ├── testing-strategy.md.ts
│   ├── github-billing.schema.json
│   ├── azdo-usage.schema.json
│   └── report-output.schema.json
└── tasks.md             # Phase 2 output - Generated by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── orchestrator.ts           # Main coordinator agent
│   ├── github-analyzer.ts        # GitHub data collection agent
│   ├── azdo-analyzer.ts          # Azure DevOps data collection agent
│   └── recommendation-engine.ts  # Generates cost-saving recommendations
│
├── tools/
│   ├── github/
│   │   ├── actions-billing.ts    # FR-001: Actions minutes tool
│   │   ├── lfs-storage.ts        # FR-002: LFS storage tool
│   │   ├── codespaces-usage.ts   # FR-003: Codespaces tool
│   │   └── octokit-factory.ts    # Rate-limited Octokit creation
│   │
│   ├── azdo/
│   │   ├── user-entitlements.ts  # FR-005: User licenses tool
│   │   ├── agent-pools.ts        # FR-007: Agent pool utilization tool
│   │   ├── pipeline-runs.ts      # FR-006: Pipeline run history tool
│   │   └── azdo-connection.ts    # Azure DevOps connection factory
│   │
│   └── shared/
│       ├── cost-calculator.ts    # FR-008, FR-009: Cost calculations
│       └── pricing-data.ts       # FR-011: Pricing cache with staleness check
│
├── models/
│   ├── usage-metric.ts           # UsageMetric entity
│   ├── recommendation.ts         # Recommendation entity
│   ├── cost-breakdown.ts         # CostBreakdown entity
│   ├── analysis-report.ts        # AnalysisReport entity
│   └── pricing-data.ts           # PricingData entity
│
├── lib/
│   ├── error-handling.ts         # ToolResult, ToolError types and utilities
│   └── config.ts                 # Configuration loading (FR-020, FR-021, FR-022)
│
├── cli/
│   └── index.ts                  # CLI entry point
│
└── index.ts                      # Main export

tests/
├── unit/
│   ├── tools/
│   │   ├── github/
│   │   │   ├── actions-billing.test.ts
│   │   │   ├── lfs-storage.test.ts
│   │   │   └── codespaces-usage.test.ts
│   │   ├── azdo/
│   │   │   ├── user-entitlements.test.ts
│   │   │   ├── agent-pools.test.ts
│   │   │   └── pipeline-runs.test.ts
│   │   └── shared/
│   │       ├── cost-calculator.test.ts
│   │       └── pricing-data.test.ts
│   │
│   ├── models/
│   │   └── [entity tests]
│   │
│   └── lib/
│       └── error-handling.test.ts
│
├── integration/
│   ├── github-analyzer.test.ts   # Agent integration tests
│   └── azdo-analyzer.test.ts
│
└── fixtures/
    ├── github-billing-response.json
    └── azdo-entitlements-response.json

config/
├── pricing.default.json          # Default pricing fallbacks (FR-008)
└── .env.example                  # Example configuration (FR-020)
```

**Structure Decision**: Single project structure chosen because:
- All code targets Node.js runtime (no separate frontend/backend)
- Agent coordination happens within single process
- Tool modules naturally group by platform (GitHub vs Azure DevOps)
- Testing follows standard unit/integration split

## Complexity Tracking

> **No violations detected - this section left empty per instructions**

---

## Phase 0: Research & Outline

**Goal**: Resolve all "NEEDS CLARIFICATION" items from Technical Context through targeted research.

### Research Tasks

#### 1. HTTP Client for Azure DevOps VSAEX APIs
**Question**: Should we use `fetch` (Node.js built-in v18+) or `axios` for direct VSAEX API calls?

**Research Approach**:
- Compare fetch vs axios for PAT authentication patterns
- Check error handling capabilities (needed for ToolResult pattern)
- Verify Node.js 20+ built-in fetch stability for enterprise use
- Reference: contracts/azdo-api.reference.ts shows fetch example

**Decision Criteria**:
- Must support Basic auth (`Authorization: Basic <base64>`)
- Must provide structured error responses (status codes, bodies)
- Prefer fewer dependencies if fetch meets requirements

#### 2. Pricing Data Source and Management
**Question**: How do we obtain and refresh platform pricing data?

**Research Approach**:
- Investigate GitHub pricing API availability (likely none - manual pricing)
- Investigate Azure DevOps pricing API (likely none - manual pricing)
- Determine pricing update frequency (quarterly? annually?)
- Design staleness detection mechanism (FR-011: 30-day threshold)

**Decision Criteria**:
- Must support fallback to default prices when API unavailable
- Must warn when cached data exceeds 30 days old
- Must be updatable without code changes (JSON config file)

#### 3. Configuration Management Strategy
**Question**: How to securely manage credentials and thresholds (FR-020, FR-021, FR-022)?

**Research Approach**:
- Evaluate configuration sources: .env file, config.json, CLI args, environment variables
- Determine secure credential storage (never in code or CLI args per FR-020)
- Design threshold customization (inactive days, date ranges, cost thresholds)

**Decision Criteria**:
- Credentials via environment variables or secure config file only
- Support both single-platform and dual-platform configurations
- Allow threshold overrides (e.g., `INACTIVE_DAYS=60`)

#### 4. Sequential Batching Implementation
**Question**: How to implement "3-5 concurrent queries" with sequential batching?

**Research Approach**:
- Research concurrency control patterns (Promise.all with chunks, p-limit library)
- Determine appropriate batch sizes for each API
- Design retry logic integration with rate limiting

**Decision Criteria**:
- Must limit concurrent requests to 3-5 max
- Must respect rate limit headers from APIs
- Must work with Octokit throttling plugin

#### 5. Report Generation Format
**Question**: What's the structure of human-readable vs JSON output (FR-017, FR-018)?

**Research Approach**:
- Review spec requirements for report contents
- Design JSON schema for machine-readable output (reference: report-output.schema.json)
- Design text formatting for executive summary (top 3 recommendations)

**Decision Criteria**:
- JSON output validates against schema
- Human-readable includes executive summary, findings, recommendations
- Both formats contain identical data (just different presentation)

### Research Deliverables

**Output File**: `specs/001-finops-analyzer/research.md`

**Required Sections**:
1. **HTTP Client Decision**
   - Decision: [fetch | axios]
   - Rationale: [why chosen]
   - Usage pattern: [code example]

2. **Pricing Data Strategy**
   - Decision: [JSON config file + manual updates]
   - Rationale: [no API available]
   - Staleness detection: [timestamp comparison]
   - Update process: [documented in quickstart]

3. **Configuration Management**
   - Decision: [dotenv + environment variables]
   - Rationale: [secure, standard Node.js pattern]
   - Configuration schema: [documented]

4. **Concurrency Control**
   - Decision: [p-limit | manual Promise batching]
   - Rationale: [simplicity vs control]
   - Implementation pattern: [code example]

5. **Report Format Specification**
   - JSON schema: [defined in contracts/report-output.schema.json]
   - Text template: [structure defined]
   - Examples: [sample outputs]

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete, all clarifications resolved

**Goal**: Define data model, API contracts, and agent interfaces before implementation.

### 1. Data Model (`data-model.md`)

Extract entities from spec and design their TypeScript representations:

#### Core Entities

**UsageMetric** (from spec Key Entities)
- Properties: type (string), resource (string), quantity (number), timePeriod (DateRange), cost (number)
- Validation: Zod schema ensuring non-negative quantities/costs
- Example: `{ type: "github-actions-minutes", resource: "my-repo", quantity: 1500, timePeriod: {...}, cost: 120.00 }`

**Recommendation** (from spec Key Entities)
- Properties: type (string), target (string), action (string), parameters (object), savings (MonthlyAnnual), priority (number), requiresApproval (boolean)
- Validation: requiresApproval=true for user/license changes, false for resources
- Relationships: References UsageMetric that triggered recommendation

**CostBreakdown** (from spec Key Entities)
- Properties: platform (string), orgUnit (string), category (string), amount (number), trend (TrendData)
- Validation: amount non-negative, trend covers 90-day period
- Aggregation: Rollup from UsageMetrics

**AnalysisReport** (from spec Key Entities)
- Properties: timestamp (ISO), scope (AnalysisScope), metrics (UsageMetric[]), recommendations (Recommendation[]), summary (ExecutiveSummary)
- Validation: JSON schema validation (report-output.schema.json)
- Relationships: Contains all entities

**PricingData** (from spec Key Entities)
- Properties: platform (string), service (string), price (number), lastUpdated (ISO), isStale (boolean)
- Validation: isStale=true when lastUpdated > 30 days ago
- Source: config/pricing.default.json

#### Supporting Types

- **DateRange**: { start: ISO, end: ISO } - represents 90-day analysis window
- **MonthlyAnnual**: { monthly: number, annual: number } - savings calculation
- **TrendData**: { day30: number, day60: number, day90: number } - cost trends
- **AnalysisScope**: { platforms: string[], orgs: string[], dateRange: DateRange } - what was analyzed
- **ExecutiveSummary**: { totalCost: number, potentialSavings: MonthlyAnnual, topRecommendations: Recommendation[3] }

### 2. API Contracts (`contracts/`)

Define tool interfaces that agents will use:

#### GitHub Tools Contract

**File**: `contracts/github-tools.contract.ts`

```typescript
// Tool: get_github_actions_billing
Input: { org: string, dateRange?: DateRange }
Output: ToolResult<{
  totalMinutesUsed: number;
  minutesUsedBreakdown: { UBUNTU: number; MACOS: number; WINDOWS: number };
  estimatedCost: number;
}>

// Tool: get_lfs_storage
Input: { org: string, repo?: string }
Output: ToolResult<{
  storageGB: number;
  bandwidthGB: number;
  estimatedCost: number;
  byRepository?: Record<string, { storage: number; bandwidth: number }>;
}>

// Tool: get_codespaces_usage
Input: { org: string, dateRange?: DateRange }
Output: ToolResult<{
  totalHours: number;
  byUser: Record<string, number>;
  byMachineType: Record<string, number>;
  estimatedCost: number;
}>
```

#### Azure DevOps Tools Contract

**File**: `contracts/azdo-tools.contract.ts`

```typescript
// Tool: get_user_entitlements
Input: { org: string, inactiveDays?: number }
Output: ToolResult<{
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: UserEntitlement[];
  potentialSavings: number; // License cost * inactive count
}>

// Tool: get_agent_pools
Input: { org: string }
Output: ToolResult<{
  pools: AgentPool[];
  utilization: Record<string, number>; // poolId -> utilization %
  recommendations: string[]; // e.g., "Pool X underutilized at 15%"
}>

// Tool: get_pipeline_runs
Input: { org: string, project: string, dateRange?: DateRange }
Output: ToolResult<{
  totalRuns: number;
  avgQueueTime: number;
  parallelJobRecommendation: string | null;
}>
```

#### Shared Tools Contract

**File**: `contracts/shared-tools.contract.ts`

```typescript
// Tool: calculate_cost
Input: { metrics: UsageMetric[], pricingData: PricingData[] }
Output: ToolResult<{
  costBreakdowns: CostBreakdown[];
  totalCost: number;
}>

// Tool: generate_recommendations
Input: { metrics: UsageMetric[], costs: CostBreakdown[] }
Output: ToolResult<{
  recommendations: Recommendation[];
}>
```

### 3. Agent System Message Templates

**File**: `contracts/agent-prompts.contract.ts`

Define system messages for each agent:

- **Orchestrator**: Coordinates sub-agents, merges results
- **GitHub Analyzer**: Uses GitHub tools, understands Actions/LFS/Codespaces
- **Azure DevOps Analyzer**: Uses Azure DevOps tools, understands licenses/pipelines
- **Recommendation Engine**: Synthesizes findings into actionable recommendations

### 4. Quickstart Guide (`quickstart.md`)

Create setup and usage documentation:

#### Sections

1. **Prerequisites**
   - Node.js 20+
   - GitHub PAT with `repo`, `admin:org` scopes
   - Azure DevOps PAT with `vso.memberentitlementmanagement`, `vso.agentpools`, `vso.build` scopes

2. **Installation**
   - `npm install`
   - Copy `.env.example` to `.env`
   - Configure credentials

3. **Configuration**
   - Environment variables reference
   - Threshold customization
   - Pricing data updates

4. **Usage**
   - Analyze GitHub only: `npx finops-agent analyze --platform github --org my-org`
   - Analyze Azure DevOps only: `npx finops-agent analyze --platform azdo --org my-org`
   - Analyze both: `npx finops-agent analyze --platform both --github-org my-gh-org --azdo-org my-ado-org`
   - Output formats: `--format json` | `--format text`

5. **Understanding Reports**
   - Report structure explanation
   - How to prioritize recommendations
   - Approval vs auto-executable actions

6. **Troubleshooting**
   - Authentication errors
   - Rate limiting
   - Missing permissions
   - Stale pricing warnings

### 5. Update Agent Context

**Action**: Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`

**Purpose**: 
- Updates `.github/copilot-instructions.md` with FinOps-specific context
- Adds technology stack (TypeScript, Copilot SDK, Octokit, Azure DevOps API)
- Preserves manual additions between markers
- Helps GitHub Copilot provide better code suggestions

**Expected Changes**:
- Add Copilot SDK patterns (agent creation, tool definition, session management)
- Add error handling patterns (ToolResult structure)
- Add rate limiting guidance (Octokit throttling plugin)
- Add Azure DevOps API specifics (VSAEX URL difference)

### Phase 1 Deliverables

- ✅ `specs/001-finops-analyzer/data-model.md` - Complete entity definitions
- ✅ `specs/001-finops-analyzer/contracts/github-tools.contract.ts` - GitHub tool interfaces
- ✅ `specs/001-finops-analyzer/contracts/azdo-tools.contract.ts` - Azure DevOps tool interfaces
- ✅ `specs/001-finops-analyzer/contracts/shared-tools.contract.ts` - Shared utilities
- ✅ `specs/001-finops-analyzer/contracts/agent-prompts.contract.ts` - System message templates
- ✅ `specs/001-finops-analyzer/quickstart.md` - Setup and usage guide
- ✅ `.github/copilot-instructions.md` - Updated with FinOps context

### Constitution Check (Post-Design)

**Re-evaluate constitution compliance after Phase 1**:

- ✅ **Modular Agent Architecture**: 4 agents identified (orchestrator, GitHub, Azure DevOps, recommendations)
- ✅ **Research-First**: research.md completed before design
- ✅ **Specification as Source**: Design derived from spec requirements
- ✅ **Test-First**: Tool contracts define testable interfaces
- ✅ **Actionable Output**: Recommendation entity enforces quantified impact

**Status**: All principles remain satisfied after design phase.

---

## Phase 2: Task Generation

**Command**: `/speckit.tasks` (NOT part of this command)

**Prerequisites**: 
- research.md complete
- data-model.md complete
- All contracts defined
- quickstart.md written

**Output**: `specs/001-finops-analyzer/tasks.md`

**Content**: Dependency-ordered implementation tasks derived from:
- Data model entity implementations
- Tool handler implementations (per contracts)
- Agent implementations (per agent pattern)
- Test implementations (per test strategy)
- CLI implementation
- Documentation completion

**Note**: Task generation is a separate command and NOT executed by `/speckit.plan`.

---

## Implementation Constraints (Reference)

This plan MUST adhere to the following constraints documented in `specs/001-finops-analyzer/contracts/`:

### 1. Agent Pattern (MANDATORY)
- **Source**: `contracts/agent-pattern.reference.ts`
- **Requirements**:
  - Use `CopilotClient` with `autoStart: true, autoRestart: true`
  - Define tools using `defineTool()` with Zod schemas
  - Create sessions via `client.createSession({ tools, mcpServers, systemMessage })`
  - Use `session.sendAndWait()` - LLM decides tool invocation
  - NO direct function calls in imperative orchestration code

### 2. Error Handling (MANDATORY)
- **Source**: `contracts/error-handling.reference.ts`
- **Requirements**:
  - All tools return `{ success: boolean, data?: T, error?: ToolError }`
  - Never throw exceptions from tool handlers
  - Include `suggestedAction` in errors for LLM guidance
  - Support partial failures (return successes + note failures)

### 3. Rate Limiting (MANDATORY)
- **Source**: `contracts/rate-limiting.reference.ts`
- **Requirements**:
  - Use `@octokit/plugin-throttling` for all GitHub API calls
  - Configure `onRateLimit` to retry 2-3 times with logging
  - Configure `onSecondaryRateLimit` to log and NOT retry
  - Use `createFinOpsOctokit()` factory function

### 4. Azure DevOps API (MANDATORY)
- **Source**: `contracts/azdo-api.reference.ts`
- **Requirements**:
  - User Entitlements use `vsaex.dev.azure.com` (NOT `dev.azure.com`)
  - Use `azure-devops-node-api` for standard APIs
  - Use fetch/axios directly for VSAEX APIs
  - Required PAT scopes: `vso.memberentitlementmanagement`, `vso.agentpools`, `vso.build`

### 5. Testing (MANDATORY)
- **Source**: `contracts/test-pattern.reference.ts`, `contracts/testing-strategy.md.ts`
- **Requirements**:
  - Every tool handler must have unit tests
  - Test both success and error paths
  - Mock external dependencies (APIs, CopilotClient)
  - Use Arrange/Act/Assert structure
  - Test descriptions focus on behavior, not implementation

### 6. Data Schemas (REFERENCE)
- **Source**: `contracts/github-billing.schema.json`, `contracts/azdo-usage.schema.json`, `contracts/report-output.schema.json`
- **Purpose**: Define expected API response structures and report output format
- **Usage**: Validate API responses and report generation

---

## Success Criteria

Implementation is complete when:

1. ✅ All "NEEDS CLARIFICATION" resolved (research.md)
2. ✅ Data model documented (data-model.md)
3. ✅ Tool contracts defined (contracts/*.contract.ts)
4. ✅ Quickstart guide written (quickstart.md)
5. ✅ Agent context updated (.github/copilot-instructions.md)
6. ✅ Constitution check passes (all principles satisfied)
7. ⏸️ Tasks generated (tasks.md) - separate command

**This plan is complete. Next step: Execute `/speckit.tasks` to generate implementation tasks.**
