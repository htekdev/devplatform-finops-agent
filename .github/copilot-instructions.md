# Copilot Instructions for devplatform-finops-agent

## Critical Workflow Instructions

### 1. Keep This File Updated
Always update `.github/copilot-instructions.md` as the project evolves:
- Add new architectural decisions
- Document patterns and conventions adopted
- Record any important context for future sessions

### 2. Plan.md is the Source of Truth
The file `docs/PLAN.md` is the **single source of truth** for this project:
- Always keep it up-to-date as requirements change
- Mark completed tasks with `[x]` checkboxes
- Add new requirements, critiques, and findings as they emerge
- Document architectural changes and decisions
- Track open questions and their resolutions

### 3. When Making Changes
Before implementing:
1. Check `docs/PLAN.md` for current status and requirements
2. Update the plan if requirements have changed
3. After implementation, update the plan to reflect completion

---

## Project Context

**Project:** DevPlatform FinOps Agent  
**Purpose:** Multi-agent system analyzing GitHub and Azure DevOps platform costs

### Tech Stack
- TypeScript with GitHub Copilot SDK
- Multi-agent orchestration pattern
- Azure OpenAI (GPT-4o) for LLM backend
- Octokit for GitHub API
- Azure DevOps REST API

### Key Analysis Areas

**GitHub:**
- Actions minutes consumption
- LFS storage/bandwidth usage
- Codespaces hours and efficiency

**Azure DevOps:**
- Parallel job usage (hosted vs self-hosted ROI)
- User license utilization (active vs inactive)
- Agent pool efficiency

### Architecture
4 specialized agents orchestrated by a supervisor:
1. **GitHub Analyzer Agent** - GitHub billing and usage data
2. **Azure DevOps Analyzer Agent** - ADO pipelines and licensing
3. **Cost Calculator Agent** - Pricing, projections, comparisons
4. **Report Generator Agent** - Markdown/JSON reports with recommendations

---

## Code Conventions

*(To be updated as patterns emerge)*

- Use TypeScript strict mode
- Follow patterns from `github-sre-agent` for Copilot SDK usage
- Agents should be modular and independently testable

---

## Reference Projects

- `../github-sre-agent` - Copilot SDK patterns (TypeScript)
- `../github-research-agent` - Multi-agent workflow patterns (Python)
