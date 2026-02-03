# DevPlatform FinOps Agent

> Multi-agent system for analyzing GitHub and Azure DevOps platform costs

## Status

✅ **Phase 1 Complete** - Project foundation ready  
⏳ **Phase 2-7** - In progress

See [docs/PLAN.md](docs/PLAN.md) for detailed implementation roadmap.

## Overview

A TypeScript-based multi-agent system that provides FinOps insights for engineering platforms:

- **GitHub:** Actions minutes, LFS storage/bandwidth, Codespaces usage
- **Azure DevOps:** Parallel jobs, user licenses, self-hosted vs hosted ROI

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- GitHub Personal Access Token (with `admin:org`, `repo` scopes)
- Azure DevOps Personal Access Token (with appropriate scopes)

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your tokens and organizations
# GITHUB_TOKEN=ghp_xxx
# GITHUB_ORGS=org1,org2
# AZDO_PAT=xxx
# AZDO_ORGS=org1,org2
```

### Usage

```bash
# Run analysis
npm run dev analyze

# View help
npm run dev -- --help

# Validate configuration
npm run dev config

# Manage cache
npm run dev cache --stats
npm run dev cache --clear
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Orchestrator Agent              │
├─────────────────────────────────────────┤
│  GitHub      │  Azure DevOps            │
│  Analyzer    │  Analyzer                │
├─────────────────────────────────────────┤
│  Cost Calculator  │  Report Generator   │
└─────────────────────────────────────────┘
```

## Project Structure

```
src/
├── agents/           # Multi-agent system
├── tools/            # Agent tools
├── clients/          # API clients
├── types/            # TypeScript interfaces
├── utils/            # Shared utilities
└── cli/              # CLI entry point
```

## Development

```bash
# Build
npm run build

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check
```

## Documentation

- [Implementation Plan](docs/PLAN.md)
- [Research Documents](docs/research/)

## Tech Stack

- **TypeScript** with strict mode
- **GitHub Copilot SDK** for multi-agent orchestration
- **Octokit** for GitHub API
- **Axios** for Azure DevOps API
- **Zod** for schema validation
- **Commander** for CLI

## License

MIT

