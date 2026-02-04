# DevPlatform FinOps Agent

> Multi-agent system for analyzing GitHub and Azure DevOps platform costs using AI-powered insights

## Overview

A TypeScript-based multi-agent system built with the GitHub Copilot SDK that provides FinOps analysis for engineering platforms:

- **GitHub:** Actions minutes, LFS storage/bandwidth, Codespaces usage
- **Azure DevOps:** User licenses, parallel jobs, agent pools, self-hosted vs hosted ROI
- **Combined Analysis:** Cross-platform optimization recommendations

## Features

✅ **GitHub Analysis**
- Actions billing and usage patterns
- LFS storage costs
- Codespaces utilization
- Actionable recommendations with dollar impact

✅ **Azure DevOps Analysis**
- User license utilization and inactive users
- Agent pool efficiency
- Build queue time analysis
- Parallel job capacity optimization

✅ **Combined Platform Analysis**
- Unified cost breakdown across platforms
- Cross-platform optimization opportunities
- Consolidated recommendations

## Quick Start

### Installation

```bash
npm install
npm run build
```

### Configuration

Set environment variables:

```bash
# GitHub (optional)
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_ORGS="org1,org2"

# Azure DevOps (optional)
export AZURE_DEVOPS_PAT="your_pat_here"
export AZURE_DEVOPS_ORG="your-org"

# Optional: LLM model (defaults to gpt-4o)
export COPILOT_MODEL="gpt-4o"
```

Or create a config file at `~/.finops-agent/config.json`:

```json
{
  "github": {
    "token": "ghp_your_token_here",
    "organizations": ["org1", "org2"]
  },
  "azureDevOps": {
    "pat": "your_pat_here",
    "organization": "your-org"
  },
  "llm": {
    "model": "gpt-4o"
  }
}
```

### Usage

```bash
# Analyze GitHub organization(s)
npx finops-agent analyze github --org github
npx finops-agent analyze github  # Uses GITHUB_ORGS from config

# Analyze Azure DevOps organization
npx finops-agent analyze azdo --org your-org
npx finops-agent analyze azdo --projects "Project1,Project2"

# Combined analysis (both platforms)
npx finops-agent analyze all

# Options
npx finops-agent analyze github --days 90  # Analysis period
npx finops-agent analyze azdo --inactive-days 120  # Inactive user threshold
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Orchestrator Agent              │
│  (Combines multi-platform analysis)     │
├─────────────────────────────────────────┤
│  GitHub           │  Azure DevOps       │
│  Analyzer Agent   │  Analyzer Agent     │
├─────────────────────────────────────────┤
│  Tools Layer:                           │
│  • GitHub API (Octokit)                 │
│  • Azure DevOps API                     │
│  • Cost Calculators                     │
└─────────────────────────────────────────┘
```

### Agent Architecture

The system uses the GitHub Copilot SDK agent pattern:
- **Agents**: Use LLMs to orchestrate analysis and generate recommendations
- **Tools**: Wrapped API calls that agents can invoke via `defineTool`
- **MCP Integration**: Connects to GitHub's Model Context Protocol

Each agent:
1. Creates a CopilotClient session
2. Registers tools (GitHub API, Azure DevOps API)
3. Provides a system message (defines capabilities and output format)
4. Uses LLM reasoning to analyze data and generate recommendations

## Required PAT Scopes

### GitHub Personal Access Token
- `read:org` - Read organization information
- `read:billing` - Read billing information

### Azure DevOps Personal Access Token
- `vso.memberentitlementmanagement` - Read user entitlements
- `vso.agentpools` - Read agent pools
- `vso.build` - Read build/pipeline information

## Output

The agent produces Markdown reports with:

1. **Executive Summary**: Total costs and top recommendations
2. **Usage Metrics**: Current consumption by service
3. **Cost Breakdown**: Itemized costs
4. **Recommendations**: Prioritized, actionable suggestions with:
   - Dollar impact (monthly and annual)
   - Implementation steps
   - Risk assessment
   - Priority level

## Development

```bash
# Build
npm run build

# Run tests (note: vitest config issue with ESM - tests written but not running)
npm test

# Lint
npm run lint

# Clean
npm run clean
```

## Project Structure

```
src/
├── agents/           # Agent implementations
│   ├── github-analyzer.ts
│   ├── azdo-analyzer.ts
│   └── orchestrator.ts
├── tools/            # API wrappers
│   ├── github/
│   └── azdo/
├── lib/              # Shared utilities
│   ├── config.ts
│   └── error-handling.ts
├── models/           # Data models
└── cli/              # Command-line interface

specs/                # Design specifications
└── 001-finops-analyzer/
    ├── contracts/    # Reference implementations
    ├── tasks.md      # Implementation tasks
    └── plan.md       # Project plan
```

## Documentation

- [Implementation Plan](docs/PLAN.md) - Current status and roadmap
- [Specification](specs/001-finops-analyzer/spec.md) - Detailed spec
- [Research](specs/001-finops-analyzer/research.md) - API research
- [Data Model](specs/001-finops-analyzer/data-model.md) - Data structures

## Known Issues

- Vitest configuration has ESM + TypeScript module resolution issues
- Unit tests are written but not currently running
- Will be addressed in future iterations

## Contributing

1. Review the [plan](docs/PLAN.md) and [tasks](specs/001-finops-analyzer/tasks.md)
2. Follow the [agent pattern](specs/001-finops-analyzer/contracts/agent-pattern.reference.ts)
3. Ensure changes build: `npm run build`

## License

MIT
