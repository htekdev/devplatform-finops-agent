# DevPlatform FinOps Agent

A multi-agent system that analyzes GitHub and Azure DevOps platform costs.

## Features

- **GitHub Analysis**: Actions minutes, LFS storage/bandwidth, Codespaces usage
- **Azure DevOps Analysis**: Parallel jobs, user licenses, pipeline efficiency
- **Cost Calculations**: Real-time pricing with 30-day staleness warnings
- **Actionable Recommendations**: Prioritized by ROI with quantified savings
- **Machine-Readable Output**: JSON format for automation and dashboards
- **CLI Authentication**: Automatic credential discovery from GitHub CLI and Azure CLI

## Quick Start

```bash
# Install dependencies
npm install
npm run build

# Set up credentials (Option 1: Environment variables)
export GITHUB_TOKEN=ghp_your_token
export AZURE_DEVOPS_PAT=your_pat

# Or use CLI authentication (Option 2)
gh auth login
az login

# Analyze GitHub organization
npm run cli -- analyze --github-org your-org --format text

# Analyze Azure DevOps organization  
npm run cli -- analyze --azdo-org your-org --format json

# Analyze both platforms
npm run cli -- analyze --github-org your-org --azdo-org your-azdo-org --format both
```

## Installation

```bash
git clone https://github.com/htekdev/devplatform-finops-agent
cd devplatform-finops-agent
npm install
npm run build
```

## Usage

### CLI Commands

```bash
# Analyze command
npm run cli -- analyze --github-org <org> [options]

Options:
  --github-org <org>    GitHub organization name
  --azdo-org <org>      Azure DevOps organization name
  --format <format>     Output format: json, text, both (default: text)
  --output <file>       Save report to file

# Version command
npm run cli -- version
```

## Requirements

- Node.js 20+ LTS
- GitHub personal access token (with `repo`, `read:org`, `read:billing` scopes)
- Azure DevOps PAT (with `vso.memberentitlementmanagement`, `vso.agentpools`, `vso.build` scopes)

## Architecture

### Tech Stack

- **TypeScript 5.x**: Type-safe implementation with ESM modules
- **Octokit**: GitHub REST API client with rate limiting
- **Azure DevOps Node API**: Azure DevOps REST API client
- **Zod**: Runtime schema validation
- **Vitest**: Fast unit testing

## Documentation

- [Implementation Plan](specs/001-finops-analyzer/plan.md)
- [Feature Specification](specs/001-finops-analyzer/spec.md)
- [Data Model](specs/001-finops-analyzer/data-model.md)

## License

MIT
