# DevPlatform FinOps Agent

> Multi-agent system for analyzing GitHub and Azure DevOps platform costs

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

## Overview

FinOps Agent is a CLI tool that analyzes GitHub Actions, LFS, Codespaces, Azure DevOps parallel jobs, user licenses, and agent pools to identify cost-saving opportunities. It generates actionable recommendations with dollar impact and execution parameters for automation.

Built with the [GitHub Copilot SDK](https://github.com/github/copilot-sdk) for intelligent agent orchestration.

## Features

- **Multi-Platform Analysis**: Analyze GitHub and Azure DevOps organizations separately or together
- **Cost Attribution**: Break down costs by platform, category, and organizational unit
- **Actionable Recommendations**: Get specific, automation-ready suggestions with estimated savings
- **Flexible Output**: Export as JSON (for automation) or Markdown (for humans)
- **Smart Pricing**: Uses current platform pricing with support for custom rates

## Quick Start

### Prerequisites

- Node.js 18+
- GitHub Copilot CLI: `gh extension install github/gh-copilot`

### Installation

```bash
# Install dependencies
npm install

# Build
npm run build
```

### Configuration

Set up credentials via environment variables:

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export AZURE_DEVOPS_PAT="xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Or create `~/.finops-agent/config.json`:

```json
{
  "github": { "token": "ghp_xxxxxxxxxxxx" },
  "azureDevOps": { "pat": "xxxxxxxxxxxxxxxxxxxxxxxxxx" },
  "thresholds": { "inactiveDays": 90 }
}
```

### Usage

```bash
# Analyze GitHub organization
node dist/index.js analyze github --org my-org

# Analyze Azure DevOps organization
node dist/index.js analyze azdo --org my-org

# Analyze both platforms
node dist/index.js analyze all --github-org my-gh-org --azdo-org my-ado-org

# Export to JSON
node dist/index.js analyze github --org my-org --format json --output report.json
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Supervisor Agent                │
├─────────────────────────────────────────┤
│  GitHub      │  Azure DevOps            │
│  Analyzer    │  Analyzer                │
├─────────────────────────────────────────┤
│  Cost Calculator  │  Report Generator   │
└─────────────────────────────────────────┘
```

The system uses specialized agents:
- **GitHub Analyzer** - Actions, LFS, Codespaces usage
- **Azure DevOps Analyzer** - Parallel jobs, licenses, agent pools
- **Cost Calculator** - Cost attribution and projections
- **Report Generator** - JSON/Markdown output
- **Supervisor** - Multi-platform orchestration

## Documentation

- [Implementation Plan](specs/001-finops-analyzer/plan.md)
- [Data Model](specs/001-finops-analyzer/data-model.md)
- [Quickstart Guide](specs/001-finops-analyzer/quickstart.md)
- [API Contracts](specs/001-finops-analyzer/contracts/)

## Development

```bash
npm install      # Install dependencies
npm run build    # Build TypeScript
npm test         # Run tests
npm run lint     # Lint code
```

## License

ISC
