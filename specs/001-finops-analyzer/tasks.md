# Tasks: FinOps Analyzer Agent

**Input**: Design documents from `/specs/001-finops-analyzer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: REQUIRED per constitution Test-First Development. All tool handlers MUST have unit tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description`

- **[TaskID]**: Sequential task ID (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure: src/{agents,tools,models,lib,cli}, tests/{unit,integration,fixtures}, config/
- [ ] T002 Initialize TypeScript project with package.json (type: "module" for ESM, Node.js 20+)
- [ ] T003 [P] Install core dependencies: @github/copilot-sdk, @octokit/rest, @octokit/plugin-throttling, azure-devops-node-api, zod, commander, p-limit, chalk
- [ ] T004 [P] Install dev dependencies: vitest, @types/node, typescript
- [ ] T005 [P] Configure TypeScript (tsconfig.json with ESM, strict mode)
- [ ] T006 [P] Configure Vitest (vitest.config.ts)
- [ ] T007 [P] Create .env.example with GITHUB_TOKEN, AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG
- [ ] T008 Create config/pricing.default.json with GitHub and Azure DevOps pricing per research.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Implement ToolResult<T> and ToolError types in src/lib/error-handling.ts per error-handling.reference.ts
- [ ] T010 [P] Implement toToolError() utility in src/lib/error-handling.ts per error-handling.reference.ts
- [ ] T011 [P] Implement wrapToolHandler() utility in src/lib/error-handling.ts per error-handling.reference.ts
- [ ] T012 [P] Create createThrottledOctokit() factory in src/tools/github/octokit-factory.ts per rate-limiting.reference.ts
- [ ] T013 [P] Implement config loading from env vars and .finops-agent/config.json in src/lib/config.ts
- [ ] T014 Create UsageMetric interface in src/models/usage-metric.ts per data-model.md
- [ ] T015 [P] Create Recommendation interface in src/models/recommendation.ts per data-model.md
- [ ] T016 [P] Create CostBreakdown interface in src/models/cost-breakdown.ts per data-model.md
- [ ] T017 [P] Create AnalysisReport interface in src/models/analysis-report.ts per data-model.md
- [ ] T018 [P] Create PricingData interface in src/models/pricing-data.ts per data-model.md
- [ ] T019 Implement pricing data loader with staleness detection in src/tools/shared/pricing-data.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Analyze GitHub Organization Costs (Priority: P1) 🎯 MVP

**Goal**: Analyze GitHub organization's usage to identify cost-saving opportunities

**Independent Test**: Provide GitHub org credentials, receive report with at least one actionable recommendation with dollar impact

### Unit Tests for User Story 1 Tools (REQUIRED)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T020 [P] [US1] Unit test for getGitHubActionsBilling tool in tests/unit/tools/github/actions-billing.test.ts
- [ ] T021 [P] [US1] Unit test for getLFSStorage tool in tests/unit/tools/github/lfs-storage.test.ts
- [ ] T022 [P] [US1] Unit test for getCodespacesUsage tool in tests/unit/tools/github/codespaces-usage.test.ts

### Implementation for User Story 1

- [ ] T023 [P] [US1] Implement getGitHubActionsBilling tool in src/tools/github/actions-billing.ts with ToolResult return
- [ ] T024 [P] [US1] Implement getLFSStorage tool in src/tools/github/lfs-storage.ts with ToolResult return
- [ ] T025 [P] [US1] Implement getCodespacesUsage tool in src/tools/github/codespaces-usage.ts with ToolResult return
- [ ] T026 [US1] Create GitHub analyzer agent in src/agents/github-analyzer.ts using agent-pattern.reference.ts (uses defineTool for T023-T025)
- [ ] T027 [US1] Implement system message for GitHub analyzer in src/agents/github-analyzer.ts
- [ ] T028 [US1] Add basic CLI command "analyze github" in src/cli/index.ts

**Checkpoint**: User Story 1 is fully functional - GitHub cost analysis works independently

---

## Phase 4: User Story 2 - Analyze Azure DevOps Organization Costs (Priority: P1)

**Goal**: Analyze Azure DevOps organization's usage to identify underutilized resources and license waste

**Independent Test**: Provide Azure DevOps org credentials, receive report identifying at least one optimization opportunity

### Unit Tests for User Story 2 Tools (REQUIRED)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T029 [P] [US2] Unit test for getUserEntitlements tool in tests/unit/tools/azdo/user-entitlements.test.ts
- [ ] T030 [P] [US2] Unit test for getAgentPools tool in tests/unit/tools/azdo/agent-pools.test.ts
- [ ] T031 [P] [US2] Unit test for getPipelineRuns tool in tests/unit/tools/azdo/pipeline-runs.test.ts

### Implementation for User Story 2

- [ ] T032 [P] [US2] Create Azure DevOps connection factory in src/tools/azdo/azdo-connection.ts using azure-devops-node-api
- [ ] T033 [P] [US2] Implement getUserEntitlements tool in src/tools/azdo/user-entitlements.ts (uses vsaex.dev.azure.com per azdo-api.reference.ts)
- [ ] T034 [P] [US2] Implement getAgentPools tool in src/tools/azdo/agent-pools.ts with ToolResult return
- [ ] T035 [P] [US2] Implement getPipelineRuns tool in src/tools/azdo/pipeline-runs.ts with ToolResult return
- [ ] T036 [US2] Create Azure DevOps analyzer agent in src/agents/azdo-analyzer.ts using agent-pattern.reference.ts
- [ ] T037 [US2] Implement system message for Azure DevOps analyzer in src/agents/azdo-analyzer.ts
- [ ] T038 [US2] Add CLI command "analyze azdo" in src/cli/index.ts

**Checkpoint**: User Story 2 is fully functional - Azure DevOps cost analysis works independently

---

## Phase 5: User Story 3 - Generate Actionable Recommendations (Priority: P1)

**Goal**: Generate recommendations that are specific and actionable enough for execution

**Independent Test**: Verify each recommendation contains all fields required for automated execution

### Unit Tests for User Story 3 (REQUIRED)

- [ ] T039 [P] [US3] Unit test for cost calculator in tests/unit/tools/shared/cost-calculator.test.ts
- [ ] T040 [P] [US3] Unit test for recommendation generation logic in tests/unit/agents/recommendation-engine.test.ts

### Implementation for User Story 3

- [ ] T041 [P] [US3] Implement cost calculator in src/tools/shared/cost-calculator.ts (calculates costs from UsageMetrics)
- [ ] T042 [US3] Create recommendation engine agent in src/agents/recommendation-engine.ts using agent-pattern.reference.ts
- [ ] T043 [US3] Implement system message for recommendation engine (must include ROI prioritization guidance)
- [ ] T044 [US3] Implement recommendation approval logic (user/license changes require approval, resources are auto-executable)
- [ ] T045 [US3] Add recommendation sorting by priority (ROI-based) in src/agents/recommendation-engine.ts

**Checkpoint**: User Story 3 is fully functional - Recommendations are actionable with quantified impact

---

## Phase 6: User Story 4 - Export Machine-Readable Output (Priority: P2)

**Goal**: Provide analysis results in structured format for automation systems and dashboards

**Independent Test**: Verify output parses as valid JSON and contains all required fields per report-output.schema.json

### Implementation for User Story 4

- [ ] T046 [P] [US4] Create JSON report generator in src/lib/report-json.ts (validates against report-output.schema.json)
- [ ] T047 [P] [US4] Create text report generator in src/lib/report-text.ts (human-readable format per research.md)
- [ ] T048 [US4] Implement executive summary generation (top 3 recommendations, total savings) in src/lib/report-text.ts
- [ ] T049 [US4] Add --format flag to CLI (json | text | both) in src/cli/index.ts
- [ ] T050 [US4] Add --output flag to CLI for file output in src/cli/index.ts

**Checkpoint**: User Story 4 is fully functional - Reports available in both JSON and text formats

---

## Phase 7: User Story 5 - Combined Platform Analysis (Priority: P2)

**Goal**: Provide unified analysis showing total platform costs and cross-platform optimization opportunities

**Independent Test**: Provide credentials for both platforms, receive single consolidated report

### Implementation for User Story 5

- [ ] T051 [US5] Create orchestrator agent in src/agents/orchestrator.ts using agent-pattern.reference.ts
- [ ] T052 [US5] Implement multi-platform coordination (calls GitHub and Azure DevOps analyzers)
- [ ] T053 [US5] Implement result merging logic (combines metrics and recommendations from both platforms)
- [ ] T054 [US5] Add cross-platform recommendation logic (e.g., "Move CI from ADO to GitHub Actions")
- [ ] T055 [US5] Add CLI command "analyze all" in src/cli/index.ts
- [ ] T056 [US5] Implement combined cost breakdown by platform in orchestrator

**Checkpoint**: User Story 5 is fully functional - Unified analysis across both platforms works

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and production readiness

- [ ] T057 [P] Add error handling tests in tests/unit/lib/error-handling.test.ts
- [ ] T058 [P] Add pricing data loader tests in tests/unit/tools/shared/pricing-data.test.ts
- [ ] T059 [P] Create integration test for GitHub analyzer in tests/integration/github-analyzer.test.ts (mocked CopilotClient)
- [ ] T060 [P] Create integration test for Azure DevOps analyzer in tests/integration/azdo-analyzer.test.ts (mocked CopilotClient)
- [ ] T061 [P] Create test fixtures in tests/fixtures/ (github-billing-response.json, azdo-entitlements-response.json)
- [ ] T062 [P] Add logging for API calls and agent decisions
- [ ] T063 [P] Implement rate limit handling with p-limit for concurrent requests (3-5 max per NFR-001)
- [ ] T064 [P] Add pricing staleness warnings to report diagnostics (>30 days per FR-011)
- [ ] T065 [P] Update README.md with usage examples and setup instructions
- [ ] T066 [P] Validate quickstart.md instructions work end-to-end
- [ ] T067 Add CLI --verbose flag for detailed progress output
- [ ] T068 Add CLI --days flag to customize analysis period (default 90 days)
- [ ] T069 Performance optimization: implement batch API calls with sequential batching
- [ ] T070 Security review: ensure credentials never logged or exposed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (GitHub analysis): Can start after Phase 2 - No dependencies on other stories
  - US2 (Azure DevOps analysis): Can start after Phase 2 - No dependencies on other stories
  - US3 (Recommendations): Can start after Phase 2 - Integrates with US1 and US2 but independently testable
  - US4 (Export formats): Can start after Phase 2 - Uses output from US1-US3
  - US5 (Combined analysis): Depends on US1, US2, US3 - Orchestrates all analyzers
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
    ├─> US1 (GitHub) ─┐
    ├─> US2 (Azure)   ├─> US3 (Recommendations) ─┐
    ├─> US4 (Export) ─┘                           ├─> US5 (Combined)
    └────────────────────────────────────────────┘
```

- **US1 & US2**: Can run in parallel (independent platforms)
- **US3**: Integrates with US1 and US2 but can develop in parallel with mocked data
- **US4**: Can develop in parallel with mocked reports
- **US5**: Requires US1, US2, US3 to be functional (orchestrates them)

### Within Each User Story

1. **Tests first** (T020-T022 for US1) - MUST fail before implementation
2. **Tools** (T023-T025 for US1) - Implement tool handlers
3. **Agent** (T026 for US1) - Create agent that uses tools
4. **Integration** (T027-T028 for US1) - System message, CLI integration

### Parallel Opportunities

**After Phase 2 completes, maximum parallelization:**

- **Track 1**: US1 (GitHub analysis) - T020-T028
- **Track 2**: US2 (Azure DevOps analysis) - T029-T038
- **Track 3**: US3 (Recommendations) - T039-T045 (with mocked data)
- **Track 4**: US4 (Export formats) - T046-T050 (with mocked reports)

**Within each user story:**
- All unit tests can run in parallel (marked [P])
- All tool implementations can run in parallel (marked [P])
- Agent creation must wait for tools

---

## Parallel Example: User Story 1 (GitHub Analysis)

```bash
# Step 1: Write all tests in parallel (they will fail)
Task T020: "Unit test for getGitHubActionsBilling tool"
Task T021: "Unit test for getLFSStorage tool"
Task T022: "Unit test for getCodespacesUsage tool"

# Step 2: Implement tools in parallel (tests turn green)
Task T023: "Implement getGitHubActionsBilling tool"
Task T024: "Implement getLFSStorage tool"
Task T025: "Implement getCodespacesUsage tool"

# Step 3: Sequential integration
Task T026: "Create GitHub analyzer agent" (uses T023-T025)
Task T027: "Implement system message"
Task T028: "Add CLI command"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

**Recommended approach for quickest value delivery:**

1. **Complete Phase 1 (Setup)** - T001-T008
2. **Complete Phase 2 (Foundational)** - T009-T019 ⚠️ CRITICAL BLOCKER
3. **Complete Phase 3 (US1: GitHub)** - T020-T028
4. **VALIDATE**: Test GitHub analysis independently with real org
5. **Complete Phase 4 (US2: Azure DevOps)** - T029-T038
6. **VALIDATE**: Test Azure DevOps analysis independently
7. **Complete Phase 5 (US3: Recommendations)** - T039-T045
8. **VALIDATE**: Verify recommendations are actionable
9. **STOP**: You now have a working MVP covering the core value proposition

**At this point you can:**
- Analyze GitHub organization costs ✅
- Analyze Azure DevOps organization costs ✅
- Generate actionable recommendations with quantified savings ✅
- Demo to stakeholders
- Gather feedback before adding export formats and combined analysis

### Incremental Delivery (All User Stories)

**Full feature delivery:**

1. Setup + Foundational → Foundation ready
2. US1 (GitHub) → Test independently → Deploy/Demo (MVP Milestone 1!)
3. US2 (Azure DevOps) → Test independently → Deploy/Demo (MVP Milestone 2!)
4. US3 (Recommendations) → Test independently → Deploy/Demo (MVP Complete!)
5. US4 (Export formats) → Test independently → Deploy (Enhanced: v1.1)
6. US5 (Combined analysis) → Test independently → Deploy (Full Feature: v1.2)
7. Phase 8 (Polish) → Production hardening → Release (Production Ready: v1.0)

### Parallel Team Strategy

With 3+ developers:

1. **Together**: Complete Setup + Foundational (T001-T019)
2. **Once Phase 2 completes:**
   - Developer A: User Story 1 (GitHub) - T020-T028
   - Developer B: User Story 2 (Azure DevOps) - T029-T038
   - Developer C: User Story 3 (Recommendations) - T039-T045 (with mocks)
3. **Integration point**: US5 (Combined) brings it together - T051-T056
4. **Finish together**: Polish phase - T057-T070

---

## Critical Implementation Constraints

### MANDATORY Patterns (Reference Contracts)

1. **Agent Pattern** (agent-pattern.reference.ts):
   - MUST use `CopilotClient` with `autoStart: true, autoRestart: true`
   - MUST define tools with `defineTool()` + Zod schemas
   - MUST create sessions with `createSession({ tools, mcpServers, systemMessage })`
   - MUST use `session.sendAndWait()` - LLM decides tool invocation
   - NEVER call tool functions directly in imperative code

2. **Error Handling** (error-handling.reference.ts):
   - MUST return `{ success: boolean, data?: T, error?: ToolError }`
   - NEVER throw exceptions from tool handlers
   - MUST include `suggestedAction` in errors for LLM guidance
   - MUST support partial failures (return successes + note failures)

3. **Rate Limiting** (rate-limiting.reference.ts):
   - MUST use `@octokit/plugin-throttling` for all GitHub API calls
   - MUST configure `onRateLimit` to retry 2-3 times
   - MUST configure `onSecondaryRateLimit` to log and NOT retry
   - MUST use `createFinOpsOctokit()` factory function

4. **Azure DevOps API** (azdo-api.reference.ts):
   - User Entitlements MUST use `vsaex.dev.azure.com` (NOT `dev.azure.com`)
   - MUST use `azure-devops-node-api` for standard APIs
   - MUST use fetch/axios directly for VSAEX APIs
   - Required PAT scopes: `vso.memberentitlementmanagement`, `vso.agentpools`, `vso.build`

5. **Testing** (test-pattern.reference.ts, testing-strategy.md.ts):
   - MUST have unit tests for every tool handler
   - MUST test both success and error paths
   - MUST mock external dependencies (APIs, CopilotClient)
   - MUST use Arrange/Act/Assert structure
   - Test descriptions MUST focus on behavior, not implementation

---

## Task Summary

**Total Tasks**: 70
**Critical Path**: T001-T019 (Setup + Foundational) → T020-T045 (US1-US3: MVP)

### Task Count by Phase
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 11 tasks ⚠️ BLOCKS ALL USER STORIES
- Phase 3 (US1: GitHub): 9 tasks (3 tests + 6 implementation)
- Phase 4 (US2: Azure DevOps): 10 tasks (3 tests + 7 implementation)
- Phase 5 (US3: Recommendations): 7 tasks (2 tests + 5 implementation)
- Phase 6 (US4: Export): 5 tasks
- Phase 7 (US5: Combined): 6 tasks
- Phase 8 (Polish): 14 tasks

### Task Count by User Story
- **US1 (GitHub Analysis)**: 9 tasks - Independent, can demo alone
- **US2 (Azure DevOps Analysis)**: 10 tasks - Independent, can demo alone
- **US3 (Recommendations)**: 7 tasks - Integrates US1+US2, independently testable
- **US4 (Export Formats)**: 5 tasks - Independent, uses any report
- **US5 (Combined Analysis)**: 6 tasks - Orchestrates US1+US2+US3

### Parallel Opportunities Identified
- **Phase 1**: 6 of 8 tasks can run in parallel
- **Phase 2**: 8 of 11 tasks can run in parallel
- **After Phase 2**: All 4 user stories (US1-US4) can start in parallel
- **Within each story**: Tests and tool implementations are parallelizable

### MVP Scope Recommendation
**Minimum Viable Product**: US1 + US2 + US3 (45 tasks total)
- ✅ Analyze GitHub costs
- ✅ Analyze Azure DevOps costs
- ✅ Generate actionable recommendations
- ✅ Deliver quantified savings impact
- ❌ Export formats (nice-to-have, can use basic text output)
- ❌ Combined analysis (can run platforms separately)

**Time Estimate** (for single developer):
- MVP (US1-US3): ~3-4 weeks
- Full Feature (All stories): ~5-6 weeks
- Production Polish: +1 week

---

## Format Validation

✅ **All 70 tasks follow strict checklist format**:
- Checkbox: `- [ ]`
- Task ID: T001-T070 (sequential)
- [P] marker: Present on all parallelizable tasks
- [Story] label: Present on all user story phase tasks (US1-US5)
- Description: Includes specific file paths
- No tasks in Setup/Foundational/Polish have [Story] labels (correct)

✅ **Independent Test Criteria**:
- US1: "Provide GitHub org credentials, receive report"
- US2: "Provide Azure DevOps org credentials, receive report"
- US3: "Verify recommendations contain execution fields"
- US4: "Verify JSON output validates against schema"
- US5: "Provide both platform credentials, receive consolidated report"

✅ **Suggested MVP Scope**: User Stories 1-3 (GitHub + Azure DevOps + Recommendations)

---

**Next Steps**: Execute tasks in dependency order, starting with Phase 1 (Setup), then Phase 2 (Foundational), then user stories in priority order or parallel tracks.
