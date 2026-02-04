# Tasks: FinOps Analyzer Agent

**Input**: Design documents from `/specs/001-finops-analyzer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (per plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and ESM-based TypeScript structure

- [x] T001 Initialize Node.js project with ESM (`"type": "module"`) in package.json
- [x] T002 Configure TypeScript 5.x with strict mode in tsconfig.json
- [x] T003 [P] Install core dependencies: @github/copilot-sdk, @octokit/rest, azure-devops-node-api, zod, commander, chalk
- [x] T004 [P] Configure Vitest for ESM-compatible testing in vitest.config.ts
- [x] T005 [P] Setup linting with ESLint and Prettier in .eslintrc.json and .prettierrc
- [x] T006 Create project directory structure per plan.md (src/agents/, src/tools/, src/models/, src/lib/, src/config/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create configuration loader and validator in src/config/index.ts (env vars + ~/.finops-agent/config.json)
- [x] T008 [P] Create CopilotClient wrapper and lifecycle management in src/client.ts
- [x] T009 [P] Implement rate limiter utility with exponential backoff in src/lib/rate-limiter.ts
- [x] T010 [P] Implement retry utility with configurable attempts in src/lib/retry.ts
- [x] T011 Create UsageMetric model with Zod validation in src/models/usage-metric.ts
- [x] T012 [P] Create Recommendation model with Zod validation in src/models/recommendation.ts
- [x] T013 [P] Create CostBreakdown model with Zod validation in src/models/cost-breakdown.ts
- [x] T014 Create AnalysisReport model with Zod validation in src/models/analysis-report.ts
- [x] T015 [P] Create default pricing constants in src/tools/shared/pricing.ts
- [x] T016 [P] Create report formatting utilities (markdown/JSON) in src/tools/shared/report.ts
- [x] T017 Create CLI entry point with commander structure in src/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Analyze GitHub Organization Costs (Priority: P1) 🎯 MVP

**Goal**: Analyze GitHub organization's usage (Actions, LFS, Codespaces) to identify cost-saving opportunities with dollar impact.

**Independent Test**: Provide GitHub organization credentials → receive report with at least one actionable recommendation with dollar impact.

### Implementation for User Story 1

- [ ] T018 [P] [US1] Implement get_github_actions_billing tool in src/tools/github/actions-billing.ts
- [ ] T019 [P] [US1] Implement get_lfs_storage tool in src/tools/github/lfs-storage.ts
- [ ] T020 [P] [US1] Implement get_codespaces_usage tool in src/tools/github/codespaces-usage.ts
- [ ] T021 [US1] Create GitHub Analyzer agent with tool registration in src/agents/github-analyzer.ts
- [ ] T022 [US1] Add `analyze github --org <name>` CLI command in src/index.ts
- [ ] T023 [US1] Implement GitHub cost calculation logic using pricing data in src/agents/github-analyzer.ts
- [ ] T024 [US1] Generate UsageMetric entries for Actions minutes by OS (UBUNTU, WINDOWS, MACOS)
- [ ] T025 [US1] Generate UsageMetric entries for LFS storage and bandwidth by repository
- [ ] T026 [US1] Generate UsageMetric entries for Codespaces hours by user and machine type
- [ ] T027 [US1] Add recommendation generation for GitHub optimization opportunities

**Checkpoint**: User Story 1 should be fully functional - can analyze GitHub org and produce actionable recommendations

---

## Phase 4: User Story 2 - Analyze Azure DevOps Organization Costs (Priority: P1)

**Goal**: Analyze Azure DevOps organization's usage (parallel jobs, licenses, agent pools) to identify underutilized resources.

**Independent Test**: Provide Azure DevOps organization credentials → receive report identifying at least one optimization opportunity.

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement get_parallel_jobs tool in src/tools/azdo/parallel-jobs.ts
- [ ] T029 [P] [US2] Implement get_user_licenses tool in src/tools/azdo/user-licenses.ts
- [ ] T030 [P] [US2] Implement get_agent_pools tool in src/tools/azdo/agent-pools.ts
- [ ] T031 [US2] Create Azure DevOps Analyzer agent with tool registration in src/agents/azdo-analyzer.ts
- [ ] T032 [US2] Add `analyze azdo --org <name>` CLI command in src/index.ts
- [ ] T033 [US2] Implement parallel job utilization calculation (hosted vs self-hosted)
- [ ] T034 [US2] Implement inactive user detection (90+ days threshold, configurable)
- [ ] T035 [US2] Implement queue time trend analysis from pipeline run history
- [ ] T036 [US2] Implement agent pool utilization metrics and self-hosted ROI calculation
- [ ] T037 [US2] Add recommendation generation for ADO optimization opportunities

**Checkpoint**: User Story 2 should be fully functional - can analyze ADO org independently

---

## Phase 5: User Story 3 - Generate Actionable Recommendations (Priority: P1)

**Goal**: Produce recommendations specific and actionable enough for automation agents to execute directly.

**Independent Test**: Each recommendation contains: action type, target resource identifier, expected savings, and execution parameters.

### Implementation for User Story 3

- [ ] T038 [US3] Create Cost Calculator agent for pricing and projections in src/agents/cost-calculator.ts
- [ ] T039 [US3] Implement cost attribution logic by org unit (repos, projects, teams)
- [ ] T040 [US3] Implement 30/60/90 day cost projections based on usage trends
- [ ] T041 [US3] Implement recommendation prioritization by ROI (annual savings / effort)
- [ ] T042 [US3] Ensure all recommendations include executionParams with method, params, effort, risk
- [ ] T043 [US3] Mark recommendations as "auto-executable" or "requires-approval" based on risk level
- [ ] T044 [US3] Validate recommendation schema matches contracts/report-output.schema.json

**Checkpoint**: All recommendations are now automation-ready with complete execution parameters

---

## Phase 6: User Story 4 - Export Machine-Readable Output (Priority: P2)

**Goal**: Produce structured output suitable for automation systems and dashboards.

**Independent Test**: Output parses as valid JSON and passes schema validation.

### Implementation for User Story 4

- [ ] T045 [US4] Create Report Generator agent in src/agents/report-generator.ts
- [ ] T046 [US4] Implement JSON output format with full AnalysisReport structure
- [ ] T047 [US4] Implement markdown output format with executive summary and tables
- [ ] T048 [US4] Add `--format json|markdown` CLI option in src/index.ts
- [ ] T049 [US4] Add `--output <path>` CLI option for file output
- [ ] T050 [US4] Validate JSON output against contracts/report-output.schema.json

**Checkpoint**: Machine-readable output available for automation and dashboard integration

---

## Phase 7: User Story 5 - Combined Platform Analysis (Priority: P2)

**Goal**: Unified analysis showing total platform costs across GitHub and Azure DevOps with cross-platform optimization opportunities.

**Independent Test**: Provide credentials for both platforms → receive single consolidated report with total costs.

### Implementation for User Story 5

- [ ] T051 [US5] Create Supervisor agent that orchestrates all sub-agents in src/agents/supervisor.ts
- [ ] T052 [US5] Add `analyze all --github-org <org> --azdo-org <org>` CLI command in src/index.ts
- [ ] T053 [US5] Implement combined CostBreakdown aggregation across platforms
- [ ] T054 [US5] Generate executive summary with total monthly spend, top 3 cost drivers, total potential savings
- [ ] T055 [US5] Implement cross-platform optimization detection (e.g., CI consolidation opportunities)
- [ ] T056 [US5] Ensure combined report includes separate platform breakdowns and unified totals

**Checkpoint**: Full multi-platform analysis with unified reporting complete

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T057 [P] Add graceful error handling for invalid/expired API credentials with clear messages
- [ ] T058 [P] Handle "no usage data" scenario with informative message (not failure)
- [ ] T059 [P] Implement partial results on API rate limit exhaustion with warning
- [ ] T060 [P] Add `--days <number>` CLI option for configurable analysis period (default: 30)
- [ ] T061 [P] Add `--verbose` CLI flag for detailed progress output
- [ ] T062 Implement fallback pricing with warning when API pricing unavailable
- [ ] T063 [P] Add configurable inactive user threshold via config (default: 90 days)
- [ ] T064 [P] Add configurable minimum savings threshold via config (default: $10/month)
- [ ] T065 Update quickstart.md if CLI interface changed during implementation
- [ ] T066 Run full validation against quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - US1, US2, US3 are all P1 and can proceed in parallel after Foundation
  - US4, US5 are P2 and can start after Foundation (but benefit from US1/US2 completion)
- **Polish (Phase 8)**: Can start after US1+US2 are complete, should complete after all stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Phase 2 - Benefits from US1/US2 for realistic testing
- **User Story 4 (P2)**: Can start after Phase 2 - Benefits from US1-US3 for complete reports
- **User Story 5 (P2)**: Requires US1+US2 components - orchestrates existing agents

### Within Each User Story

- Tools before agents (agents register tools)
- Core implementation before CLI integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- T018, T019, T020 (GitHub tools) can run in parallel
- T028, T029, T030 (ADO tools) can run in parallel
- T045-T050 (Report Generator) independent of T051-T056 (Supervisor)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```text
# Launch all GitHub tools together:
Task T018: "Implement get_github_actions_billing tool in src/tools/github/actions-billing.ts"
Task T019: "Implement get_lfs_storage tool in src/tools/github/lfs-storage.ts"
Task T020: "Implement get_codespaces_usage tool in src/tools/github/codespaces-usage.ts"
```

## Parallel Example: User Story 2

```text
# Launch all ADO tools together:
Task T028: "Implement get_parallel_jobs tool in src/tools/azdo/parallel-jobs.ts"
Task T029: "Implement get_user_licenses tool in src/tools/azdo/user-licenses.ts"
Task T030: "Implement get_agent_pools tool in src/tools/azdo/agent-pools.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (GitHub Analysis)
4. **STOP and VALIDATE**: Test GitHub org analysis independently
5. Deploy/demo if ready - delivers immediate value for GitHub-only users

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP for GitHub!)
3. Add User Story 2 → Test independently → Deploy (MVP for ADO!)
4. Add User Story 3 → Test recommendations → Deploy (Automation-ready!)
5. Add User Story 4 → Test exports → Deploy (Dashboard integration!)
6. Add User Story 5 → Test combined → Deploy (Full multi-platform!)
7. Polish → Final release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (GitHub Analysis)
   - Developer B: User Story 2 (ADO Analysis)
   - Developer C: User Story 3 (Cost Calculator/Recommendations)
3. After US1+US2 complete:
   - Developer A: User Story 4 (Report Generator)
   - Developer B: User Story 5 (Supervisor/Combined)
4. All: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- ESM-only: All imports must use ESM syntax, no require()
- Copilot SDK requires authenticated Copilot CLI installed
- Credentials via env vars (GITHUB_TOKEN, AZURE_DEVOPS_PAT) or config file, never CLI args
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
