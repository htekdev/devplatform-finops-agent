# Feature Specification: FinOps Analyzer Agent

**Feature Branch**: `001-finops-analyzer`  
**Created**: 2026-02-04  
**Status**: Draft  
**Input**: "FinOps analyzer agent that reviews GitHub and Azure DevOps usage patterns to generate actionable cost-saving recommendations that are invokable by a future automation agent"

## Clarifications

### Session 2026-02-04

- Q: Data Retention Period → A: 90 days - retrieve 90 days of usage data for trend analysis
- Q: Structured Output Format → A: JSON - machine-readable reports in JSON format
- Q: Concurrent API Queries → A: Sequential with batching - 3-5 concurrent queries max, safer for rate limits
- Q: Stale Pricing Threshold → A: 30 days - warn if cached pricing data is older than 30 days
- Q: Approval-Required Actions → A: User/license changes only - protect human assets, automate resource changes

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analyze GitHub Organization Costs (Priority: P1)

As a platform administrator, I want to analyze my GitHub organization's usage to identify cost-saving opportunities so that I can reduce our monthly platform spend.

**Why this priority**: GitHub Actions minutes and storage are the primary cost drivers for most organizations. This delivers immediate, quantifiable value.

**Independent Test**: Can be fully tested by providing GitHub organization credentials and receiving a report with at least one actionable recommendation with dollar impact.

**Acceptance Scenarios**:

1. **Given** valid GitHub organization credentials, **When** I request an analysis, **Then** I receive a report showing Actions minutes consumption by repository and workflow
2. **Given** a GitHub organization with LFS usage, **When** I request an analysis, **Then** I receive storage and bandwidth costs broken down by repository
3. **Given** a GitHub organization with Codespaces enabled, **When** I request an analysis, **Then** I receive usage hours and estimated costs by user and machine type
4. **Given** analysis results, **When** the report is generated, **Then** each finding includes estimated monthly cost impact in dollars

---

### User Story 2 - Analyze Azure DevOps Organization Costs (Priority: P1)

As a platform administrator, I want to analyze my Azure DevOps organization's usage to identify underutilized resources and license waste so that I can optimize our subscription costs.

**Why this priority**: Azure DevOps parallel jobs and user licenses represent significant recurring costs. Identifying inactive users directly saves money.

**Independent Test**: Can be fully tested by providing Azure DevOps organization credentials and receiving a report identifying at least one optimization opportunity.

**Acceptance Scenarios**:

1. **Given** valid Azure DevOps organization credentials, **When** I request an analysis, **Then** I receive parallel job utilization showing hosted vs self-hosted usage patterns
2. **Given** an Azure DevOps organization with user licenses, **When** I request an analysis, **Then** I receive a list of users who have not accessed the system in 90+ days
3. **Given** pipeline run history exists, **When** I request an analysis, **Then** I receive queue time trends that indicate if more parallel jobs would improve efficiency
4. **Given** self-hosted agent pools exist, **When** I request an analysis, **Then** I receive utilization metrics comparing self-hosted ROI vs hosted alternatives

---

### User Story 3 - Generate Actionable Recommendations (Priority: P1)

As a platform administrator, I want recommendations that are specific and actionable enough that I (or an automation agent) can execute them directly.

**Why this priority**: The value of FinOps analysis is in driving action. Vague recommendations provide no value.

**Independent Test**: Can be tested by verifying each recommendation contains all fields required for automated execution.

**Acceptance Scenarios**:

1. **Given** analysis identifies an inefficient workflow, **When** recommendations are generated, **Then** each recommendation includes: action type, target resource identifier, expected savings, and execution parameters
2. **Given** analysis identifies inactive users, **When** recommendations are generated, **Then** the recommendation includes user identifiers and the specific license to revoke
3. **Given** multiple recommendations exist, **When** the report is generated, **Then** recommendations are prioritized by annual savings potential (highest first)
4. **Given** a recommendation requires human approval, **When** it is generated, **Then** it is clearly marked as requiring approval vs auto-executable

---

### User Story 4 - Export Machine-Readable Output (Priority: P2)

As a platform administrator, I want analysis results in a structured format so that I can feed them to automation systems or dashboards.

**Why this priority**: Enables integration with existing tooling and future automation agents.

**Independent Test**: Can be tested by verifying output parses as valid structured data and contains all required fields.

**Acceptance Scenarios**:

1. **Given** an analysis is complete, **When** I request structured output, **Then** I receive data that can be parsed programmatically
2. **Given** structured output, **When** an automation agent reads recommendations, **Then** it can extract all parameters needed to execute the recommendation
3. **Given** structured output, **When** imported into a dashboard, **Then** all cost metrics and trends are represented accurately

---

### User Story 5 - Combined Platform Analysis (Priority: P2)

As a platform administrator managing both GitHub and Azure DevOps, I want a unified analysis that shows total platform costs and cross-platform optimization opportunities.

**Why this priority**: Many organizations use both platforms. A unified view provides complete cost visibility.

**Independent Test**: Can be tested by providing credentials for both platforms and receiving a single consolidated report.

**Acceptance Scenarios**:

1. **Given** credentials for both GitHub and Azure DevOps, **When** I request a combined analysis, **Then** I receive a single report with total costs across platforms
2. **Given** a combined analysis, **When** viewing the summary, **Then** I see total monthly spend, top cost drivers, and total potential savings
3. **Given** similar workloads exist on both platforms, **When** analysis is complete, **Then** the system identifies opportunities to consolidate (e.g., "Move CI from ADO to GitHub Actions to save X/month")

---

### Edge Cases

- What happens when API credentials are invalid or expired? → Clear error message indicating which platform and what permission is missing
- What happens when an organization has no usage data? → Report indicates "No usage data found" rather than failing
- What happens when API rate limits are hit? → Graceful retry with backoff; partial results returned if limits prevent completion
- What happens when pricing information is unavailable? → Use last known pricing with a warning; never omit cost estimates entirely
- What happens when a user has access to only one platform? → Analyze only the available platform without errors
- What happens when no explicit credentials are provided but platform CLI is authenticated? → System uses CLI credentials automatically
- What happens when neither explicit credentials nor CLI credentials are available? → Clear error message listing supported authentication methods

## Requirements *(mandatory)*

### Functional Requirements

**Data Collection**
- **FR-001**: System MUST collect GitHub Actions minutes consumption at organization, repository, and workflow levels for the past 90 days
- **FR-002**: System MUST collect GitHub LFS storage and bandwidth usage by repository for the past 90 days
- **FR-003**: System MUST collect GitHub Codespaces usage hours by user and machine type for the past 90 days
- **FR-004**: System MUST collect Azure DevOps parallel job utilization (hosted and self-hosted) for the past 90 days
- **FR-005**: System MUST collect Azure DevOps user license assignments and last access dates
- **FR-006**: System MUST collect Azure DevOps pipeline run history including queue times and durations for the past 90 days
- **FR-007**: System MUST collect Azure DevOps agent pool configuration and utilization for the past 90 days

**Cost Calculation**
- **FR-008**: System MUST calculate costs using current platform pricing (with fallback to configurable defaults)
- **FR-009**: System MUST attribute costs to organizational units (repositories, projects, teams) where possible
- **FR-010**: System MUST project future costs based on 90-day usage trends (30/60/90 day projections)
- **FR-011**: System MUST warn when cached pricing data is older than 30 days

**Recommendations**
- **FR-012**: System MUST generate recommendations with quantified dollar impact (monthly and annual)
- **FR-013**: System MUST categorize recommendations by type: cleanup, optimization, migration, policy change
- **FR-014**: System MUST include execution parameters for each recommendation sufficient for automation
- **FR-015**: System MUST mark recommendations as "auto-executable" or "requires-approval" (user/license changes require approval; resource changes are auto-executable)
- **FR-016**: System MUST prioritize recommendations by ROI (savings vs effort)

**Output**
- **FR-017**: System MUST produce human-readable reports (formatted text)
- **FR-018**: System MUST produce machine-readable output in JSON format
- **FR-019**: System MUST include an executive summary with top 3 recommendations and total savings potential

**Configuration**
- **FR-020**: System MUST accept platform credentials via secure configuration (not command-line arguments)
- **FR-021**: System MUST allow filtering analysis scope (specific repos, projects, date ranges with default of 90 days)
- **FR-022**: System MUST allow customization of thresholds (e.g., "inactive" = 90 days by default, configurable)

**Authentication**
- **FR-023**: System MUST support authentication via existing platform CLI credentials when explicit tokens are not configured
- **FR-024**: System MUST attempt credential resolution in order: 1) explicit configuration, 2) platform CLI credentials, 3) fail with clear guidance
- **FR-025**: System MUST validate that credentials have sufficient permissions before proceeding with analysis

### Non-Functional Requirements

**Performance & Reliability**
- **NFR-001**: System MUST execute API queries with maximum 3-5 concurrent requests to respect rate limits
- **NFR-002**: System MUST use sequential batching for API calls to prevent rate limit violations
- **NFR-003**: System MUST complete analysis of a GitHub organization with up to 100 repositories within 5 minutes
- **NFR-004**: System MUST complete analysis of an Azure DevOps organization with up to 50 projects within 5 minutes

**Data Quality**
- **NFR-005**: System MUST validate all pricing data freshness and warn if cached data exceeds 30 days
- **NFR-006**: System MUST handle partial data gracefully, returning available results with clear warnings about missing data

### Key Entities

- **UsageMetric**: A measurement of resource consumption (type, resource, quantity, time period up to 90 days, cost)
- **Recommendation**: An actionable suggestion (type, target, action, parameters, savings, priority, approval-required flag where user/license changes=true, resource changes=false)
- **CostBreakdown**: Attribution of costs to organizational units (platform, org-unit, category, amount, trend over 90 days)
- **AnalysisReport**: Complete output of an analysis run in JSON format (timestamp, scope, metrics, recommendations, summary)
- **PricingData**: Cached platform pricing information (platform, service, price, last-updated timestamp, stale-warning if >30 days)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysis of a GitHub organization completes within 5 minutes for organizations with up to 100 repositories using sequential batching with 3-5 concurrent API queries
- **SC-002**: Analysis of an Azure DevOps organization completes within 5 minutes for organizations with up to 50 projects using sequential batching with 3-5 concurrent API queries
- **SC-003**: 100% of recommendations include quantified monthly savings estimates
- **SC-004**: 100% of recommendations include sufficient parameters for automated execution (validated by JSON schema)
- **SC-005**: Reports identify at least 3 actionable cost-saving opportunities for organizations with 90+ days of usage history
- **SC-006**: JSON output passes schema validation with zero errors
- **SC-007**: Users can understand the executive summary without platform-specific knowledge (validated by stakeholder review)
- **SC-008**: System warns when pricing data is stale (>30 days old) in 100% of cases
- **SC-009**: 100% of user/license change recommendations are marked as "requires-approval"; 100% of resource-only recommendations are marked as "auto-executable"

## Assumptions

- GitHub and Azure DevOps billing APIs provide sufficient granularity for cost attribution
- Platform pricing is relatively stable; configurable fallback prices are acceptable when API pricing is unavailable or older than 30 days
- Organizations have at least 90 days of usage history for meaningful trend analysis
- Inactive user threshold of 90 days is a reasonable default for most organizations
- Recommendations do not need to handle rollback; they are advisory (execution is a separate concern)
- Sequential batching with 3-5 concurrent API queries provides sufficient performance while respecting rate limits
- JSON output format is compatible with target automation systems and dashboards
- User/license changes represent higher risk and require human approval; resource-only changes can be automated safely

---

## Implementation Constraints

**Reference Contracts**:
- `contracts/agent-pattern.reference.ts` - Copilot SDK agent structure
- `contracts/test-pattern.reference.ts` - Testing patterns
- `contracts/rate-limiting.reference.ts` - GitHub API rate limiting
- `contracts/azdo-api.reference.ts` - Azure DevOps API patterns
- `contracts/error-handling.reference.ts` - Error handling for LLM tools

**Working Example**: `htekdev/github-sre-agent` demonstrates the agent pattern in production.

### Azure DevOps API (MANDATORY)

See `contracts/azdo-api.reference.ts` for complete API documentation.

**Key Points**:
- User Entitlements API uses `vsaex.dev.azure.com` (NOT `dev.azure.com`!)
- Use `azure-devops-node-api` for standard APIs (pools, pipelines)
- Use fetch/axios directly for vsaex APIs (user entitlements)
- Required PAT scopes: `vso.memberentitlementmanagement`, `vso.agentpools`, `vso.build`

### Error Handling (MANDATORY)

See `contracts/error-handling.reference.ts` for complete pattern.

**Key Rule**: Tools are called by an LLM. The LLM needs to SEE errors to decide what to do.

**DO**:
- Return `{ success: false, error: { code, message, retryable, suggestedAction } }`
- Include error codes the LLM can use for decision-making
- Include `suggestedAction` to guide the LLM's response
- Handle partial failures gracefully (return successful results + note failures)

**DO NOT**:
- Throw exceptions from tool handlers (LLM can't catch them)
- Return unstructured errors like `{ error: "failed" }`
- Swallow errors silently (return null/undefined)
- Return `success: true` when an error occurred

### GitHub API Rate Limiting (MANDATORY)

All GitHub API calls MUST use the throttling plugin. See `contracts/rate-limiting.reference.ts`.

**DO**:
- Use `@octokit/plugin-throttling` with `Octokit.plugin(throttling)`
- Configure `onRateLimit` to retry up to 2-3 times with logging
- Configure `onSecondaryRateLimit` to log and NOT retry (indicates abuse)
- Use the `createFinOpsOctokit()` factory function

**DO NOT**:
- Create `new Octokit()` without the throttling plugin
- Implement manual rate limit handling (the plugin does it better)
- Always retry on secondary rate limits (fix the root cause instead)
- Use infinite retries (always set a max)

### Copilot SDK Usage (MANDATORY)

All agents MUST use the GitHub Copilot SDK for orchestration:

**DO**:
- Use `CopilotClient` with `autoStart: true, autoRestart: true`
- Define tools using `defineTool()` with Zod schemas for parameters
- Create sessions via `client.createSession({ tools, mcpServers, systemMessage })`
- Use `session.sendAndWait({ prompt })` to let the LLM decide tool invocation
- Handle streaming events via `session.on((evt: SessionEvent) => ...)`
- Return `{ success: true, data }` or `{ success: false, error }` from tool handlers

**DO NOT**:
- Call tool/API functions directly in imperative code
- Define `getTools()` methods that are never passed to `createSession()`
- Bypass the session system with hardcoded orchestration logic
- Use `new CopilotClient()` without `autoStart`/`autoRestart` options

### Test Requirements (MANDATORY per Constitution)

Per the project constitution (`.specify/memory/constitution.md`), all production code MUST have tests.

**Reference**: See `contracts/testing-strategy.md.ts` for full testing strategy and `contracts/test-pattern.reference.ts` for code patterns.

#### Required Tests (MVP)

| Category | What to Test | Example |
|----------|-------------|---------|
| **Tool Handlers** | Every tool in `src/tools/` | `getGitHubActionsBilling` returns correct structure |
| **Error Handling** | Success and failure paths | Tool returns `{ success: false, error: {...} }` on API failure |
| **Cost Calculations** | Math is correct | macOS minutes × $0.08 = expected cost |
| **Data Transforms** | API response → internal model | Raw API JSON → UsageMetric object |
| **Thresholds** | Business logic | User inactive if lastAccess > 90 days |

#### Not Required for MVP (Future)

| Category | Why Deferred |
|----------|-------------|
| **Agent Evals** | Requires eval infrastructure; add when agent is stable |
| **E2E with Real APIs** | Expensive, slow, flaky; use mocks instead |
| **LLM Output Quality** | Non-deterministic; needs human judgment |

**Test Style Rules**:
- Tests describe BEHAVIOR, not implementation ("returns X when Y" not "calls Z")
- Each test = one behavior (no giant tests that verify everything)
- Use Arrange/Act/Assert structure
- Mock external dependencies (APIs, CopilotClient)
- Tool handlers return `{ success, data/error }` - test both paths
- Edge cases get explicit tests (empty data, errors, permissions)

**DO NOT**:
- Test implementation details (which functions were called)
- Write tests that pass when code is broken (`expect(x).toBeDefined()`)
- Hit real APIs in unit tests
- Write flaky tests that depend on timing

### Acceptance Criteria for Agent Orchestration

1. **Given** an agent is instantiated, **When** it starts, **Then** `CopilotClient.start()` is called
2. **Given** tools are defined, **When** analysis runs, **Then** tools are passed to `createSession()`
3. **Given** a session exists, **When** a prompt is sent, **Then** the LLM decides which tools to invoke
4. **Given** a tool is invoked by the LLM, **Then** the tool handler executes and returns structured data
5. **Given** analysis completes, **Then** `session.destroy()` is called to clean up
