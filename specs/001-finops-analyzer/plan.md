# Implementation Plan: FinOps Analyzer Agent

**Branch**: `001-finops-analyzer` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-finops-analyzer/spec.md`

## Summary

Build a CLI tool in Node.js/TypeScript that uses the **GitHub Copilot SDK** (`@github/copilot-sdk`) as the agent orchestrator to analyze GitHub and Azure DevOps platform costs. The system employs a multi-agent architecture with specialized agents for:
1. **GitHub Analysis** - Actions minutes, LFS storage, Codespaces usage via GitHub REST API billing endpoints
2. **Azure DevOps Analysis** - Parallel jobs, user licenses, agent pools via Azure DevOps REST APIs
3. **Cost Calculation** - Pricing lookup, projections, and cost attribution
4. **Report Generation** - Human-readable and machine-readable output with actionable recommendations

The Copilot SDK provides the agentic orchestration layer (planning, tool invocation, context management) while custom tools expose platform-specific data collection capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 18+ (ESM-only required by Copilot SDK)  
**Primary Dependencies**:
- `@github/copilot-sdk` ^0.1.x - Agent orchestration runtime
- `@octokit/rest` ^21.x - GitHub REST API client
- `azure-devops-node-api` ^14.x - Azure DevOps REST API client
- `zod` ^3.x - Schema validation for tools
- `commander` ^12.x - CLI argument parsing
- `chalk` ^5.x - Terminal styling (ESM)

**Storage**: Local filesystem for configuration (~/.finops-agent/config.json) and report output  
**Testing**: Vitest (ESM-compatible, consistent with Copilot SDK)  
**Target Platform**: Node.js 18+ CLI (Windows, macOS, Linux)  
**Project Type**: Single CLI application with multi-agent architecture  
**Performance Goals**: 
- Analysis completes within 5 minutes for GitHub orgs with up to 100 repos (SC-001)
- Analysis completes within 5 minutes for ADO orgs with up to 50 projects (SC-002)

**Constraints**: 
- Must handle API rate limits gracefully with retry/backoff
- Credentials via environment variables or config file, not CLI args (FR-019)
- Copilot CLI must be installed and authenticated

**Scale/Scope**: Organizations with 100+ repositories, 50+ projects, 500+ users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Modular Agent Architecture** | ✅ PASS | 4 specialized agents (GitHub Analyzer, ADO Analyzer, Cost Calculator, Report Generator) + Supervisor orchestrator. Each agent is independently testable with isolated tool definitions. |
| **II. Research-First Development** | ✅ PASS | Completed research on Copilot SDK, GitHub Billing APIs, and Azure DevOps APIs before implementation planning. Findings documented in research.md. |
| **III. Specification as Source of Truth** | ✅ PASS | spec.md defines WHAT/WHY, this plan.md defines HOW. Tasks will be generated via /speckit.tasks. |
| **IV. Test-First Development** | 🔲 PENDING | Will be verified during implementation. Contract tests for APIs, unit tests for tools, integration tests for agent flows. |
| **V. Actionable Output** | ✅ PASS | FR-011 through FR-015 mandate quantified dollar impact, prioritization by ROI, execution parameters for automation. |

## Project Structure

### Documentation (this feature)

```text
specs/001-finops-analyzer/
├── plan.md              # This file
├── research.md          # Phase 0: API research findings
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Setup and usage guide
├── contracts/           # Phase 1: API schemas
│   ├── github-billing.schema.json
│   ├── azdo-usage.schema.json
│   └── report-output.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts                 # CLI entry point
├── client.ts                # CopilotClient wrapper and lifecycle
├── config/
│   └── index.ts             # Configuration loading/validation
├── agents/
│   ├── supervisor.ts        # Orchestrates all agents
│   ├── github-analyzer.ts   # GitHub platform analysis
│   ├── azdo-analyzer.ts     # Azure DevOps analysis
│   ├── cost-calculator.ts   # Pricing and projections
│   └── report-generator.ts  # Output formatting
├── tools/
│   ├── github/
│   │   ├── actions-billing.ts    # Get Actions minutes usage
│   │   ├── lfs-storage.ts        # Get LFS storage/bandwidth
│   │   └── codespaces-usage.ts   # Get Codespaces hours
│   ├── azdo/
│   │   ├── parallel-jobs.ts      # Get parallel job utilization
│   │   ├── user-licenses.ts      # Get license assignments
│   │   └── agent-pools.ts        # Get agent pool metrics
│   └── shared/
│       ├── pricing.ts            # Pricing lookup
│       └── report.ts             # Report generation utilities
├── models/
│   ├── usage-metric.ts           # UsageMetric entity
│   ├── recommendation.ts         # Recommendation entity
│   ├── cost-breakdown.ts         # CostBreakdown entity
│   └── analysis-report.ts        # AnalysisReport entity
└── lib/
    ├── rate-limiter.ts           # API rate limit handling
    └── retry.ts                  # Retry with exponential backoff

tests/
├── contract/                     # API response validation
├── integration/                  # End-to-end agent flows
└── unit/                         # Tool and model tests
```

**Structure Decision**: Single project structure appropriate for a CLI tool with clear separation between agents, tools (Copilot SDK callbacks), and domain models.

## Complexity Tracking

> No constitution violations requiring justification.
