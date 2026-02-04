# Tasks: FinOps Analyzer Agent

**Input**: Design documents from `/specs/001-finops-analyzer/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, research.md ✅

**Tests**: Per constitution and contracts/testing-strategy.md.ts, unit tests for all tool handlers are REQUIRED. Tests should be developed alongside implementation (not test-first for MVP).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [TaskID] [P?] [Story?] Description`

- **[TaskID]**: Sequential task ID (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

Single project structure (per plan.md):
- Source: `src/` at repository root
- Tests: `tests/` at repository root
- Config: `specs/001-finops-analyzer/` for specification documents

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize TypeScript project with ESM modules per plan.md (package.json with "type": "module")
- [ ] T002 Install core dependencies: @github/copilot-sdk, @octokit/rest, @octokit/plugin-throttling, azure-devops-node-api, @azure/identity, zod, commander, chalk, p-limit
- [ ] T003 [P] Install dev dependencies: typescript, vitest, vite-tsconfig-paths, @types/node
- [ ] T004 [P] Configure TypeScript for ESM in tsconfig.json (module: "ESNext", moduleResolution: "bundler")
- [ ] T005 [P] Configure Vitest with vite-tsconfig-paths plugin in vitest.config.ts per contracts/testing-strategy.md.ts
- [ ] T006 [P] Create .env.example with GITHUB_TOKEN, AZURE_DEVOPS_PAT, AZURE_DEVOPS_ORG
- [ ] T007 [P] Create project structure: src/agents/, src/tools/, src/models/, src/services/, src/lib/, src/cli/, tests/unit/, tests/fixtures/
- [ ] T008 Setup npm scripts in package.json: test, lint, typecheck, build, cli commands

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create ToolResult interface in src/lib/types.ts per contracts/error-handling.reference.ts
- [ ] T010 [P] Create ToolError type and toToolError utility in src/lib/error-handler.ts per contracts/error-handling.reference.ts
- [ ] T011 [P] Create wrapToolHandler utility function in src/lib/error-handler.ts
- [ ] T012 [P] Implement DEFAULT_PRICING configuration in src/lib/pricing.ts per research.md §4
- [ ] T013 [P] Implement date utilities for 90-day period calculations in src/lib/date-utils.ts
- [ ] T014 [P] Implement GitHub authentication with CLI fallback in src/services/auth/github-auth.ts per contracts/cli-auth.reference.ts
- [ ] T015 [P] Implement Azure DevOps authentication with CLI fallback in src/services/auth/azdo-auth.ts per contracts/cli-auth.reference.ts
- [ ] T016 [P] Create batchApiCalls utility with p-limit in src/lib/rate-limiter.ts per research.md §8
- [ ] T017 [P] Create Octokit factory with throttling plugin in src/lib/github-client.ts per contracts/rate-limiting.reference.ts
- [ ] T018 [P] Create UsageMetric Zod schema in src/models/usage-metric.ts per data-model.md
- [ ] T019 [P] Create Recommendation Zod schema in src/models/recommendation.ts per data-model.md
- [ ] T020 [P] Create CostBreakdown Zod schema in src/models/cost-breakdown.ts per data-model.md
- [ ] T021 [P] Create AnalysisReport Zod schema in src/models/analysis-report.ts per data-model.md
- [ ] T022 [P] Create PricingData Zod schema in src/models/pricing-data.ts per data-model.md
- [ ] T023 Unit test for error handler in tests/unit/lib/error-handler.test.ts
- [ ] T024 [P] Unit test for date utilities in tests/unit/lib/date-utils.test.ts
- [ ] T025 [P] Unit test for rate limiter in tests/unit/lib/rate-limiter.test.ts
- [ ] T026 [P] Unit test for GitHub auth in tests/unit/services/auth/github-auth.test.ts
- [ ] T027 [P] Unit test for Azure DevOps auth in tests/unit/services/auth/azdo-auth.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Analyze GitHub Organization Costs (Priority: P1) 🎯 MVP

**Goal**: Collect GitHub Actions, LFS, and Codespaces usage data for 90 days and generate cost report

**Independent Test**: Provide GitHub credentials and receive a report with at least one actionable recommendation with dollar impact

### Implementation for User Story 1

- [ ] T028 [P] [US1] Create getGitHubActionsBilling tool in src/tools/github/get-actions-billing.ts per research.md §2
- [ ] T029 [P] [US1] Create getGitHubLFSUsage tool in src/tools/github/get-lfs-usage.ts
- [ ] T030 [P] [US1] Create getGitHubCodespacesUsage tool in src/tools/github/get-codespaces-usage.ts
- [ ] T031 [P] [US1] Create listGitHubWorkflows tool in src/tools/github/list-workflows.ts
- [ ] T032 [US1] Implement GitHub pricing calculator in src/services/pricing/github-pricing.ts per research.md §4
- [ ] T033 [US1] Implement GitHub analyzer service in src/services/analysis/github-analyzer.ts
- [ ] T034 [US1] Create GitHub data collection agent in src/agents/data-collection.ts with Copilot SDK
- [ ] T035 [P] [US1] Unit test for getGitHubActionsBilling in tests/unit/tools/github/get-actions-billing.test.ts per contracts/test-pattern.reference.ts
- [ ] T036 [P] [US1] Unit test for getGitHubLFSUsage in tests/unit/tools/github/get-lfs-usage.test.ts
- [ ] T037 [P] [US1] Unit test for getGitHubCodespacesUsage in tests/unit/tools/github/get-codespaces-usage.test.ts
- [ ] T038 [P] [US1] Unit test for listGitHubWorkflows in tests/unit/tools/github/list-workflows.test.ts
- [ ] T039 [P] [US1] Unit test for GitHub pricing calculator in tests/unit/services/pricing/github-pricing.test.ts
- [ ] T040 [US1] Unit test for GitHub analyzer in tests/unit/services/analysis/github-analyzer.test.ts
- [ ] T041 [P] [US1] Create test fixtures for GitHub API responses in tests/fixtures/github-responses.json

**Checkpoint**: At this point, User Story 1 should collect GitHub usage data and calculate costs

---

## Phase 4: User Story 2 - Analyze Azure DevOps Organization Costs (Priority: P1)

**Goal**: Collect Azure DevOps parallel job utilization, user licenses, and pipeline data for 90 days

**Independent Test**: Provide Azure DevOps credentials and receive a report identifying at least one optimization opportunity

### Implementation for User Story 2

- [ ] T042 [P] [US2] Create getAzDoUserEntitlements tool in src/tools/azdo/get-user-entitlements.ts per research.md §3 and contracts/azdo-api.reference.ts
- [ ] T043 [P] [US2] Create getAzDoParallelJobs tool in src/tools/azdo/get-parallel-jobs.ts
- [ ] T044 [P] [US2] Create getAzDoPipelineRuns tool in src/tools/azdo/get-pipeline-runs.ts
- [ ] T045 [P] [US2] Create getAzDoAgentPools tool in src/tools/azdo/get-agent-pools.ts
- [ ] T046 [US2] Implement Azure DevOps pricing calculator in src/services/pricing/azdo-pricing.ts per research.md §4
- [ ] T047 [US2] Implement Azure DevOps analyzer service in src/services/analysis/azdo-analyzer.ts
- [ ] T048 [US2] Extend data collection agent to support Azure DevOps in src/agents/data-collection.ts
- [ ] T049 [P] [US2] Unit test for getAzDoUserEntitlements in tests/unit/tools/azdo/get-user-entitlements.test.ts
- [ ] T050 [P] [US2] Unit test for getAzDoParallelJobs in tests/unit/tools/azdo/get-parallel-jobs.test.ts
- [ ] T051 [P] [US2] Unit test for getAzDoPipelineRuns in tests/unit/tools/azdo/get-pipeline-runs.test.ts
- [ ] T052 [P] [US2] Unit test for getAzDoAgentPools in tests/unit/tools/azdo/get-agent-pools.test.ts
- [ ] T053 [P] [US2] Unit test for Azure DevOps pricing calculator in tests/unit/services/pricing/azdo-pricing.test.ts
- [ ] T054 [US2] Unit test for Azure DevOps analyzer in tests/unit/services/analysis/azdo-analyzer.test.ts
- [ ] T055 [P] [US2] Create test fixtures for Azure DevOps API responses in tests/fixtures/azdo-responses.json

**Checkpoint**: At this point, User Story 2 should collect Azure DevOps usage data and identify inactive users

---

## Phase 5: User Story 3 - Generate Actionable Recommendations (Priority: P1)

**Goal**: Generate recommendations with quantified savings, execution parameters, and approval requirements

**Independent Test**: Verify each recommendation contains all fields required for automated execution per data-model.md

### Implementation for User Story 3

- [ ] T056 [US3] Implement calculateCost shared tool in src/tools/shared/calculate-cost.ts per data-model.md UsageMetric cost calculation
- [ ] T057 [US3] Implement generateRecommendations shared tool in src/tools/shared/generate-recommendations.ts per data-model.md Recommendation schema
- [ ] T058 [US3] Implement cost calculation agent in src/agents/cost-calculation.ts with Copilot SDK
- [ ] T059 [US3] Implement recommendation generation agent in src/agents/recommendation.ts with Copilot SDK
- [ ] T060 [US3] Implement priority/ROI calculation logic per research.md §11 in src/lib/validators.ts
- [ ] T061 [P] [US3] Unit test for calculateCost in tests/unit/tools/shared/calculate-cost.test.ts
- [ ] T062 [P] [US3] Unit test for generateRecommendations in tests/unit/tools/shared/generate-recommendations.test.ts
- [ ] T063 [US3] Unit test for cost calculation agent in tests/unit/agents/cost-calculation.test.ts
- [ ] T064 [US3] Unit test for recommendation agent in tests/unit/agents/recommendation.test.ts
- [ ] T065 [P] [US3] Create expected recommendation fixtures in tests/fixtures/expected-reports.json

**Checkpoint**: At this point, User Story 3 should generate prioritized recommendations with savings estimates

---

## Phase 6: User Story 4 - Export Machine-Readable Output (Priority: P2)

**Goal**: Produce JSON output validated against schemas for automation and dashboards

**Independent Test**: Verify output parses as valid JSON and passes schema validation

### Implementation for User Story 4

- [ ] T066 [P] [US4] Implement JSON formatter in src/services/report/json-formatter.ts per research.md §9
- [ ] T067 [P] [US4] Implement schema validator in src/lib/validators.ts using Zod schemas
- [ ] T068 [P] [US4] Unit test for JSON formatter in tests/unit/services/report/json-formatter.test.ts
- [ ] T069 [P] [US4] Unit test for schema validator in tests/unit/lib/validators.test.ts
- [ ] T070 [US4] Integration test for full JSON output schema validation in tests/integration/json-output.test.ts

**Checkpoint**: At this point, User Story 4 should produce valid JSON reports

---

## Phase 7: User Story 5 - Combined Platform Analysis (Priority: P2)

**Goal**: Unified analysis showing total costs across GitHub and Azure DevOps with cross-platform optimizations

**Independent Test**: Provide credentials for both platforms and receive a single consolidated report

### Implementation for User Story 5

- [ ] T071 [US5] Implement orchestration agent in src/agents/orchestration.ts coordinating all other agents per plan.md
- [ ] T072 [US5] Implement combined cost aggregation logic in src/services/analysis/combined-analyzer.ts
- [ ] T073 [US5] Implement cross-platform recommendation logic per spec.md "Move CI from ADO to GitHub Actions"
- [ ] T074 [US5] Handle partial failure scenarios per FR-027 to FR-029 in orchestration agent
- [ ] T075 [P] [US5] Unit test for orchestration agent in tests/unit/agents/orchestration.test.ts
- [ ] T076 [P] [US5] Unit test for combined analyzer in tests/unit/services/analysis/combined-analyzer.test.ts
- [ ] T077 [US5] Integration test for partial failure handling in tests/integration/partial-failure.test.ts

**Checkpoint**: At this point, User Story 5 should provide unified cross-platform analysis

---

## Phase 8: CLI & Human-Readable Output

**Purpose**: Command-line interface and text formatting for human consumption

- [ ] T078 [P] Implement text formatter with executive summary in src/services/report/text-formatter.ts per research.md §9 and quickstart.md §6
- [ ] T079 [P] Implement CLI configuration loader in src/cli/config.ts
- [ ] T080 [P] Implement analyze command handler in src/cli/commands/analyze.ts
- [ ] T081 [P] Implement version command handler in src/cli/commands/version.ts
- [ ] T082 Setup CLI entry point in src/cli/index.ts using commander per research.md §5
- [ ] T083 Create main application entry point in src/index.ts
- [ ] T084 [P] Unit test for text formatter in tests/unit/services/report/text-formatter.test.ts
- [ ] T085 [P] Unit test for CLI config loader in tests/unit/cli/config.test.ts
- [ ] T086 Integration test for CLI commands in tests/integration/cli-commands.test.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T087 [P] Add comprehensive JSDoc comments to all public APIs
- [ ] T088 [P] Update README.md with installation, usage, and examples
- [ ] T089 [P] Create API documentation in docs/API.md
- [ ] T090 [P] Verify all FR-001 to FR-029 requirements are met with traceability matrix in docs/REQUIREMENTS.md
- [ ] T091 [P] Verify all NFR-001 to NFR-008 requirements are met
- [ ] T092 [P] Verify all SC-001 to SC-011 success criteria are met
- [ ] T093 Run full test suite with coverage report (target 80%+ per vitest.config.ts)
- [ ] T094 Validate pricing data staleness warning (FR-011, NFR-005) works correctly
- [ ] T095 Validate upfront credential validation (FR-026) fails fast with clear messages
- [ ] T096 Test sequential batching with 3-5 concurrent requests (NFR-001, NFR-002)
- [ ] T097 Test partial failure handling for combined analysis (FR-027, NFR-007, SC-010)
- [ ] T098 Test partial failure handling for API timeouts (FR-028, NFR-008, SC-011)
- [ ] T099 Validate approval-required vs auto-executable marking (FR-015, SC-009)
- [ ] T100 Run quickstart.md validation end-to-end
- [ ] T101 Performance test: GitHub org with 100 repos completes in <5 minutes (NFR-003, SC-001)
- [ ] T102 Performance test: Azure DevOps org with 50 projects completes in <5 minutes (NFR-004, SC-002)
- [ ] T103 [P] Code cleanup and ESLint configuration
- [ ] T104 [P] Security review: no credentials in logs or error messages
- [ ] T105 Final integration test: analyze both platforms and generate all output formats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (GitHub Analysis): Can start after Foundational - No dependencies on other stories
  - US2 (Azure DevOps Analysis): Can start after Foundational - No dependencies on other stories
  - US3 (Recommendations): Depends on US1 or US2 data (but can develop in parallel with mocks)
  - US4 (JSON Export): Can start after Foundational - No dependencies on other stories
  - US5 (Combined Analysis): Depends on US1 AND US2 completion
- **CLI & Output (Phase 8)**: Depends on US1, US2, US3, US4 completion
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational) → Blocks ALL user stories
    ↓
Phase 3 (US1: GitHub) ──┐
                        ├→ Phase 7 (US5: Combined)
Phase 4 (US2: AzDO) ────┘
    ↓
Phase 5 (US3: Recommendations) ← needs US1 or US2 data
    ↓
Phase 6 (US4: JSON Export) ← needs recommendations
    ↓
Phase 8 (CLI & Text Output)
    ↓
Phase 9 (Polish)
```

### Within Each Phase

- Tasks marked [P] can run in parallel (different files)
- Tests should be developed alongside implementation (not test-first for MVP per constitution)
- Tools before agents (agents use tools)
- Models before services (services use models)
- Services before agents (agents use services)

### Parallel Opportunities

**Phase 1 Setup**: T003, T004, T005, T006, T007 can run in parallel after T001, T002

**Phase 2 Foundational**: 
- T010, T011, T012, T013, T014, T015, T016, T017 can run in parallel after T009
- T018, T019, T020, T021, T022 can run in parallel (all models)
- T024, T025, T026, T027 can run in parallel after T023 (all auth tests)

**Phase 3 User Story 1**:
- T028, T029, T030, T031 can run in parallel (all GitHub tools)
- T035, T036, T037, T038, T039, T041 can run in parallel (all US1 tests)

**Phase 4 User Story 2**:
- T042, T043, T044, T045 can run in parallel (all Azure DevOps tools)
- T049, T050, T051, T052, T053, T055 can run in parallel (all US2 tests)

**Phase 6 User Story 4**:
- T066, T067, T068, T069 can run in parallel (formatters and validators)

**Phase 8 CLI**:
- T078, T079, T080, T081, T084, T085 can run in parallel

**Phase 9 Polish**:
- T087, T088, T089, T090, T091, T092, T103, T104 can run in parallel (documentation and validation)

---

## Parallel Example: User Story 1 GitHub Tools

```bash
# Launch all GitHub tool implementations together:
Task T028: "Create getGitHubActionsBilling tool in src/tools/github/get-actions-billing.ts"
Task T029: "Create getGitHubLFSUsage tool in src/tools/github/get-lfs-usage.ts"
Task T030: "Create getGitHubCodespacesUsage tool in src/tools/github/get-codespaces-usage.ts"
Task T031: "Create listGitHubWorkflows tool in src/tools/github/list-workflows.ts"

# Then launch all tests together after implementation:
Task T035: "Unit test for getGitHubActionsBilling in tests/unit/tools/github/get-actions-billing.test.ts"
Task T036: "Unit test for getGitHubLFSUsage in tests/unit/tools/github/get-lfs-usage.test.ts"
Task T037: "Unit test for getGitHubCodespacesUsage in tests/unit/tools/github/get-codespaces-usage.test.ts"
Task T038: "Unit test for listGitHubWorkflows in tests/unit/tools/github/list-workflows.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (GitHub Analysis)
4. **CHECKPOINT**: Test GitHub analysis independently with real credentials
5. Complete Phase 4: User Story 2 (Azure DevOps Analysis)  
6. **CHECKPOINT**: Test Azure DevOps analysis independently with real credentials
7. Complete Phase 5: User Story 3 (Recommendations)
8. **CHECKPOINT**: Verify recommendations meet all acceptance criteria
9. Complete Phase 6: User Story 4 (JSON Export)
10. **STOP and VALIDATE**: MVP complete - can analyze GitHub, Azure DevOps, generate recommendations, export JSON

### Incremental Delivery

1. **Foundation** (Phases 1-2): Setup + Core infrastructure → Ready for development
2. **MVP v1** (Phase 3): GitHub analysis only → Deploy/Demo
3. **MVP v2** (Phase 4): Add Azure DevOps analysis → Deploy/Demo
4. **MVP v3** (Phase 5): Add recommendations → Deploy/Demo
5. **Release Candidate** (Phases 6-8): Add JSON export, combined analysis, CLI → Deploy/Demo
6. **Production** (Phase 9): Polish and final validation → Ship it!

### Parallel Team Strategy

With multiple developers:

1. **Week 1**: Team completes Setup + Foundational together (Phases 1-2)
2. **Week 2**: Once Foundational is done:
   - Developer A: User Story 1 (GitHub Analysis)
   - Developer B: User Story 2 (Azure DevOps Analysis)
   - Developer C: User Story 4 (JSON Export with mock data)
3. **Week 3**: 
   - Developer A: User Story 3 (Recommendations using GitHub data)
   - Developer B: User Story 3 (Recommendations using Azure DevOps data)
   - Developer C: User Story 5 (Combined Analysis)
4. **Week 4**: All developers: Phase 8-9 (CLI, Polish, Testing)

---

## Requirements Traceability

### Functional Requirements Coverage

| Requirement | Tasks | Notes |
|-------------|-------|-------|
| FR-001 to FR-007 | T028-T055 | Data collection tools for GitHub and Azure DevOps |
| FR-008 to FR-011 | T012, T032, T046, T056, T094 | Cost calculation with pricing data and staleness warnings |
| FR-012 to FR-017a | T057, T059, T060 | Recommendation generation with savings, categories, parameters |
| FR-018 to FR-020 | T066, T078, T079-T083 | JSON and text output formats with executive summary |
| FR-021 to FR-023 | T006, T079 | Configuration and credential management |
| FR-024 to FR-026 | T014, T015, T095 | Authentication with CLI fallback and upfront validation |
| FR-027 to FR-029 | T074, T097, T098 | Partial failure handling with warnings |

### Non-Functional Requirements Coverage

| Requirement | Tasks | Notes |
|-------------|-------|-------|
| NFR-001 to NFR-002 | T016, T096 | Sequential batching with 3-5 concurrent API queries |
| NFR-003 to NFR-004 | T101, T102 | Performance testing for 100 repos / 50 projects |
| NFR-005 to NFR-008 | T094, T097, T098 | Data quality and partial failure handling |

### Success Criteria Coverage

| Criteria | Tasks | Notes |
|----------|-------|-------|
| SC-001 to SC-002 | T101, T102 | Performance benchmarks |
| SC-003 to SC-005 | T060, T062, T065 | Recommendation quality and parameters |
| SC-006 | T067, T069, T070 | JSON schema validation |
| SC-007 | T078, T084 | Human-readable executive summary |
| SC-008 | T094 | Pricing staleness warning |
| SC-009 | T099 | Approval requirement marking |
| SC-010 to SC-011 | T097, T098 | Partial failure handling validation |

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story should be independently completable and testable
- Total tasks: 105 (9 setup, 19 foundational, 70 user stories, 7 polish)
- Critical path: Setup → Foundational → US1+US2 → US3 → US5 → CLI → Polish
- MVP scope: Phases 1-6 (US1-US4) = 74 tasks
- Tests integrated with implementation (not test-first per constitution)
- All contracts from contracts/ directory are referenced in appropriate tasks
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
