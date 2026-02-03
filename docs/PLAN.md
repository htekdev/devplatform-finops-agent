# DevPlatform FinOps Agent - Implementation Plan

## Project Overview

**Name:** `devplatform-finops-agent`  
**Description:** A multi-agent system that analyzes GitHub and Azure DevOps usage to provide FinOps insights for engineering platforms—identifying waste, optimizing costs, and tracking license utilization.

**Tech Stack:**
- TypeScript with GitHub Copilot SDK
- Multi-agent orchestration pattern
- Azure OpenAI for LLM backend

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
├─────────────────────────────────────────────────────────────────┤
│  APIs:                                                          │
│  • GitHub REST API (billing, actions, LFS, codespaces)         │
│  • Azure DevOps REST API (pipelines, licensing, agents)        │
│  • Azure OpenAI (GPT-4o for analysis)                          │
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

### Phase 1: Project Foundation
- [ ] Initialize TypeScript project with GitHub Copilot SDK
- [ ] Set up project structure (agents, tools, utils)
- [ ] Configure Azure OpenAI connection
- [ ] Create configuration schema (orgs, PATs, thresholds)
- [ ] Set up development environment (.env, scripts)

### Phase 2: GitHub Analyzer Agent
- [ ] Implement GitHub API client (Octokit)
- [ ] Build Actions billing data fetcher
- [ ] Build LFS usage data fetcher
- [ ] Build Codespaces usage data fetcher
- [ ] Create GitHub Analyzer agent with tools
- [ ] Write unit tests for GitHub data parsing

### Phase 3: Azure DevOps Analyzer Agent
- [ ] Implement Azure DevOps API client
- [ ] Build parallel job usage fetcher
- [ ] Build pipeline run history fetcher
- [ ] Build user license status fetcher
- [ ] Build agent pool metrics fetcher
- [ ] Create Azure DevOps Analyzer agent with tools
- [ ] Write unit tests for ADO data parsing

### Phase 4: Cost Calculator Agent
- [ ] Define pricing data structures (GitHub tiers, ADO pricing)
- [ ] Implement cost calculation logic
- [ ] Build self-hosted vs hosted comparison calculator
- [ ] Create Cost Calculator agent
- [ ] Add trend analysis and projections

### Phase 5: Report Generator Agent
- [ ] Design report schema/template
- [ ] Implement Markdown report generator
- [ ] Implement JSON export
- [ ] Create recommendations engine
- [ ] Create Report Generator agent

### Phase 6: Orchestration & CLI
- [ ] Build orchestrator/supervisor agent
- [ ] Define agent communication patterns
- [ ] Create CLI interface with commands:
  - `analyze github --org <org>`
  - `analyze azdo --org <org>`
  - `analyze all --config <file>`
  - `report --format md|json`
- [ ] Add interactive mode for follow-up questions

### Phase 7: Polish & Documentation
- [ ] Create README with setup instructions
- [ ] Add example configurations
- [ ] Create sample reports
- [ ] Add CI/CD for the project itself
- [ ] Performance testing with large orgs

---

## Key APIs Reference

### GitHub Billing APIs
```
GET /orgs/{org}/settings/billing/actions
GET /orgs/{org}/settings/billing/shared-storage
GET /orgs/{org}/settings/billing/codespaces
GET /orgs/{org}/actions/cache/usage
GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs
```

### Azure DevOps APIs
```
GET https://dev.azure.com/{org}/_apis/distributedtask/pools
GET https://dev.azure.com/{org}/_apis/distributedtask/pools/{poolId}/agents
GET https://dev.azure.com/{org}/{project}/_apis/pipelines/runs
GET https://vssps.dev.azure.com/{org}/_apis/graph/users
GET https://vsaex.dev.azure.com/{org}/_apis/userentitlements
```

---

## Configuration Schema (Draft)

```typescript
interface FinOpsConfig {
  github?: {
    organizations: string[];
    token: string;          // PAT with admin:org, repo scopes
    thresholds?: {
      actionsMinutesWarning: number;
      lfsStorageWarning: number;  // GB
      codespacesHoursWarning: number;
    };
  };
  azureDevOps?: {
    organizations: string[];
    pat: string;            // PAT with appropriate scopes
    thresholds?: {
      parallelJobUtilization: number;  // percentage
      inactiveUserDays: number;        // days since last login
    };
  };
  reporting?: {
    format: 'markdown' | 'json' | 'both';
    outputDir: string;
    includeRecommendations: boolean;
  };
}
```

---

## Success Criteria

1. **MVP (Phase 1-6):** CLI can analyze a GitHub org and Azure DevOps org, producing a cost report with recommendations
2. **Accuracy:** Cost calculations within 5% of actual billing
3. **Performance:** Full org analysis completes in < 5 minutes
4. **Actionability:** Every report includes specific, implementable recommendations with estimated $ savings

---

## Open Questions

1. Should we cache API responses to avoid rate limits during development?
2. Do we need multi-tenant support (multiple orgs in one run)?
3. What's the preferred output destination (file, stdout, webhook)?
4. Should inactive user detection trigger automatic alerts?

---

## Notes

- Reference `github-sre-agent` for Copilot SDK patterns
- Reference `github-research-agent` for multi-agent workflow patterns
- GitHub billing APIs require org admin permissions
- Azure DevOps user entitlements API requires Project Collection Admin
