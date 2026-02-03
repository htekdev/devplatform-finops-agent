# DevPlatform FinOps Agent

> Multi-agent system for analyzing GitHub and Azure DevOps platform costs

## Overview

A TypeScript-based multi-agent system that provides FinOps insights for engineering platforms:

- **GitHub:** Actions minutes, LFS storage/bandwidth, Codespaces usage
- **Azure DevOps:** Parallel jobs, user licenses, self-hosted vs hosted ROI

## Status

🚧 **In Development** - See [docs/PLAN.md](docs/PLAN.md) for implementation roadmap.

## Quick Start

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your tokens

# Run analysis
npm run analyze -- github --org your-org
npm run analyze -- azdo --org your-org
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

## Documentation

- [Implementation Plan](docs/PLAN.md)
- [API Reference](docs/API.md) *(coming soon)*
- [Configuration Guide](docs/CONFIG.md) *(coming soon)*

## License

MIT
