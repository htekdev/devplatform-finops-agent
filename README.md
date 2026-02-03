# DevPlatform FinOps Agent

[![CI](https://github.com/YOUR-USERNAME/devplatform-finops-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR-USERNAME/devplatform-finops-agent/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/devplatform-finops-agent.svg)](https://www.npmjs.com/package/devplatform-finops-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> AI-powered multi-agent system for analyzing GitHub and Azure DevOps platform costs, identifying waste, and generating actionable optimization recommendations.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Authentication Setup](#authentication-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [CLI Reference](#cli-reference)
- [Example Output](#example-output)
- [Architecture](#architecture)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🔍 Comprehensive Cost Analysis

**GitHub Platform:**
- ✅ **Actions Minutes** - Track consumption by repository, workflow, and runner OS (Linux/Windows/macOS)
- ✅ **LFS Storage & Bandwidth** - Monitor Git LFS usage and bandwidth costs
- ✅ **Codespaces** - Analyze Codespaces hours by machine type and identify idle instances
- ✅ **Workflow Efficiency** - Detect failed workflows wasting minutes and long-running jobs
- ✅ **Cache Usage** - Monitor Actions cache storage utilization

**Azure DevOps Platform:**
- ✅ **Parallel Jobs** - Analyze hosted vs self-hosted agent usage and ROI
- ✅ **Pipeline Efficiency** - Identify pipelines with high failure rates or excessive queue times
- ✅ **User Licenses** - Track license utilization and identify inactive users (30+ days)
- ✅ **Agent Pools** - Monitor agent pool utilization and capacity planning

### 💡 Intelligent Recommendations

- **Cost Optimization** - Actionable recommendations with estimated monthly savings
- **Priority Ranking** - Quick wins (high impact, low effort) vs strategic initiatives
- **Implementation Steps** - Clear, step-by-step guidance for each recommendation
- **ROI Analysis** - Compare self-hosted vs hosted runner costs

### 📊 Flexible Reporting

- **Markdown Reports** - Human-readable reports with cost breakdowns and recommendations
- **JSON Export** - Machine-readable data for integration with other tools
- **Executive Summaries** - High-level cost overview with key findings
- **Detailed Analytics** - Per-organization, per-repository, and per-workflow metrics

### 🚀 Production-Ready Features

- **Multi-Organization Support** - Analyze multiple GitHub orgs and Azure DevOps organizations
- **Intelligent Caching** - Reduce API calls with TTL-based caching
- **Rate Limit Handling** - Automatic retry with exponential backoff
- **Error Recovery** - Graceful handling of API errors with clear diagnostics
- **Concurrent Processing** - Parallel data fetching for faster analysis
- **Configurable** - JSON/YAML config files or environment variables

## Quick Start

Get your first cost analysis in under 5 minutes:

```bash
# 1. Install globally
npm install -g devplatform-finops-agent

# 2. Set up authentication
export GITHUB_TOKEN="ghp_your_github_token"
export AZDO_PAT="your_azdo_pat"

# 3. Run analysis
devplatform-finops analyze --github-orgs myorg --azdo-orgs myazdoorg --output report.md

# 4. View the report
cat report.md
```

## Installation

### Global Installation (Recommended)

```bash
npm install -g devplatform-finops-agent
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/devplatform-finops-agent.git
cd devplatform-finops-agent

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development
npm link
```

### Prerequisites

- **Node.js** >= 18.0.0 (LTS version recommended)
- **npm** >= 8.0.0
- **GitHub Personal Access Token** with appropriate scopes (see [Authentication Setup](#authentication-setup))
- **Azure DevOps Personal Access Token** with appropriate scopes (see [Authentication Setup](#authentication-setup))

## Authentication Setup

### GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name: `devplatform-finops-agent`
4. Select scopes:
   - ✅ `admin:org` → `read:org` - Read org and team data
   - ✅ `repo` → `repo:status` - Access commit status
   - ✅ `repo` → `public_repo` - Access public repositories
5. Click "Generate token" and copy the token (starts with `ghp_`)

**Required Scopes Explanation:**
- `admin:org` (read:org) - Required to access organization billing APIs (`/orgs/{org}/settings/billing/*`)
- `repo` - Required to read repository workflows and Actions usage

### Azure DevOps Personal Access Token (PAT)

1. Go to Azure DevOps → User Settings → [Personal Access Tokens](https://dev.azure.com/_usersSettings/tokens)
2. Click "+ New Token"
3. Name: `devplatform-finops-agent`
4. Organization: Select your organization or "All accessible organizations"
5. Select scopes:
   - ✅ `Build` (Read) → `vso.build` - Read build and pipeline data
   - ✅ `User Entitlements` (Read) → `vso.entitlements` - Read user license information
   - ✅ `Agent Pools` (Read) → `vso.agentpools` - Read agent pool data
6. Click "Create" and copy the token

**Required Scopes Explanation:**
- `vso.build` - Required to read pipeline runs and agent usage
- `vso.entitlements` - Required to read user license assignments
- `vso.agentpools` - Required to analyze agent pool utilization

### Storing Tokens Securely

**Option 1: Environment Variables (Recommended)**

```bash
# Add to ~/.bashrc or ~/.zshrc
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export AZDO_PAT="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Option 2: .env File (Development Only)**

```bash
# Create .env file (never commit this!)
cp .env.example .env

# Edit .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZDO_PAT=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Best Practices:**
- ⚠️ Never commit tokens to version control
- ✅ Use environment variables in CI/CD pipelines
- ✅ Rotate tokens every 90 days
- ✅ Use minimum required scopes
- ✅ Revoke tokens when no longer needed

## Configuration

### Configuration File

Create a `config.json` file:

```json
{
  "github": {
    "organizations": ["myorg", "another-org"],
    "token": "${GITHUB_TOKEN}"
  },
  "azureDevOps": {
    "organizations": ["myazdoorg"],
    "token": "${AZDO_PAT}"
  },
  "output": {
    "format": "markdown",
    "path": "./reports/finops-report.md"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "directory": "./.cache"
  },
  "analysis": {
    "inactiveUserThresholdDays": 30,
    "workflows": {
      "maxFailureRate": 0.2,
      "lookbackDays": 30
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `github.organizations` | string[] | `[]` | List of GitHub organizations to analyze |
| `github.token` | string | `$GITHUB_TOKEN` | GitHub PAT (use env var) |
| `azureDevOps.organizations` | string[] | `[]` | List of Azure DevOps organizations |
| `azureDevOps.token` | string | `$AZDO_PAT` | Azure DevOps PAT (use env var) |
| `output.format` | `markdown` \| `json` \| `both` | `markdown` | Report output format |
| `output.path` | string | `./report.md` | Output file path |
| `cache.enabled` | boolean | `true` | Enable API response caching |
| `cache.ttl` | number | `3600` | Cache time-to-live in seconds |
| `cache.directory` | string | `./.cache` | Cache storage directory |
| `analysis.inactiveUserThresholdDays` | number | `30` | Days to consider user inactive |
| `analysis.workflows.maxFailureRate` | number | `0.2` | Failure rate threshold (0-1) |
| `analysis.workflows.lookbackDays` | number | `30` | Days of workflow history to analyze |

### Example Configurations

See the [examples/](./examples/) directory for ready-to-use configurations:

- [`config.example.json`](./examples/config.example.json) - Full configuration with all options
- [`config.github-only.json`](./examples/config.github-only.json) - GitHub-only analysis
- [`config.azdo-only.json`](./examples/config.azdo-only.json) - Azure DevOps-only analysis
- [`config.multi-org.json`](./examples/config.multi-org.json) - Multiple organizations

## Usage

### Basic Analysis

```bash
# Analyze using config file
devplatform-finops analyze --config config.json

# Analyze using CLI flags
devplatform-finops analyze \
  --github-orgs myorg,another-org \
  --azdo-orgs myazdoorg \
  --output report.md

# GitHub only
devplatform-finops analyze --github-orgs myorg --no-azdo

# Azure DevOps only
devplatform-finops analyze --azdo-orgs myazdoorg --no-github
```

### Advanced Usage

```bash
# Custom output format
devplatform-finops analyze --config config.json --format json --output report.json

# Both formats
devplatform-finops analyze --config config.json --format both

# Disable caching (fresh data)
devplatform-finops analyze --config config.json --no-cache

# Custom cache TTL (1 hour = 3600 seconds)
devplatform-finops analyze --config config.json --cache-ttl 3600

# Verbose logging
devplatform-finops analyze --config config.json --log-level debug

# Quiet mode (errors only)
devplatform-finops analyze --config config.json --log-level error
```

### Configuration Management

```bash
# Validate configuration
devplatform-finops config --validate

# Show current configuration
devplatform-finops config --show

# Show configuration with resolved values (including env vars)
devplatform-finops config --show --resolve
```

### Cache Management

```bash
# Show cache statistics
devplatform-finops cache --stats

# Clear all cached data
devplatform-finops cache --clear

# Clear cache for specific org
devplatform-finops cache --clear --org myorg
```

## CLI Reference

### Global Options

| Flag | Alias | Description | Default |
|------|-------|-------------|---------|
| `--config <path>` | `-c` | Path to configuration file | `config.json` |
| `--log-level <level>` | `-l` | Log level (debug, info, warn, error) | `info` |
| `--help` | `-h` | Show help message | |
| `--version` | `-v` | Show version number | |

### `analyze` Command

Run cost analysis and generate reports.

```bash
devplatform-finops analyze [options]
```

| Option | Description | Example |
|--------|-------------|---------|
| `--github-orgs <orgs>` | Comma-separated list of GitHub orgs | `--github-orgs myorg,another-org` |
| `--azdo-orgs <orgs>` | Comma-separated list of Azure DevOps orgs | `--azdo-orgs myazdoorg` |
| `--no-github` | Skip GitHub analysis | `--no-github` |
| `--no-azdo` | Skip Azure DevOps analysis | `--no-azdo` |
| `--format <format>` | Output format (markdown, json, both) | `--format json` |
| `--output <path>` | Output file path | `--output report.md` |
| `--no-cache` | Bypass cache, fetch fresh data | `--no-cache` |
| `--cache-ttl <seconds>` | Cache TTL in seconds | `--cache-ttl 7200` |

### `config` Command

Manage and validate configuration.

```bash
devplatform-finops config [options]
```

| Option | Description |
|--------|-------------|
| `--validate` | Validate configuration file |
| `--show` | Display current configuration |
| `--resolve` | Show configuration with resolved environment variables |

### `cache` Command

Manage API response cache.

```bash
devplatform-finops cache [options]
```

| Option | Description |
|--------|-------------|
| `--stats` | Show cache statistics |
| `--clear` | Clear all cached data |
| `--org <name>` | Target specific organization |

## Example Output

### Executive Summary

```markdown
# DevPlatform FinOps Analysis Report

**Total Monthly Cost:** $12,450
**Potential Savings:** $2,850 per month
**High Priority Actions:** 3 recommendations

### Top Cost Drivers
1. **GitHub Actions**: $6,500/month (52.2%)
2. **Azure DevOps Parallel Jobs**: $2,400/month (19.3%)
3. **Azure DevOps Licenses**: $1,850/month (14.9%)
```

### Cost Overview

| Organization | Platform | Category | Monthly Cost | Trend |
|--------------|----------|----------|--------------|-------|
| myorg | GitHub | Actions | $6,500 | 📈 |
| myorg | GitHub | LFS | $1,200 | ➡️ |
| myorg | GitHub | Codespaces | $500 | 📉 |
| myazdoorg | Azure DevOps | Parallel Jobs | $2,400 | ➡️ |
| myazdoorg | Azure DevOps | Licenses | $1,850 | ➡️ |
| **Grand Total** | **All Platforms** | | **$12,450** | |

### Sample Recommendations

**🎯 Quick Wins**

#### 🔴 Optimize macOS Runner Usage - Savings: $1,200/month

High macOS runner usage (45% of total Actions minutes) at 10x the cost of Linux runners.

**How to implement:**
1. Audit workflows using macOS runners
2. Move non-macOS-specific tests to Linux runners
3. Use conditional jobs to run macOS only for macOS-specific tests

See full example in [examples/sample-report.md](./examples/sample-report.md).

## Architecture

### System Design

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
│  ┌─────────────────────────────────────────┐                   │
│  │         Shared State (TypeScript)       │                   │
│  │  • GitHub usage data                    │                   │
│  │  • Azure DevOps usage data              │                   │
│  │  • Calculated costs                     │                   │
│  │  • Recommendations                      │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Agent System

The project uses a **multi-agent architecture** powered by the GitHub Copilot SDK:

1. **Orchestrator Agent** - Coordinates analysis workflow and manages shared state
2. **GitHub Analyzer Agent** - Fetches and analyzes GitHub billing/usage data
3. **Azure DevOps Analyzer Agent** - Fetches and analyzes Azure DevOps data
4. **Cost Calculator Agent** - Calculates costs and projections using current pricing
5. **Report Generator Agent** - Produces Markdown/JSON reports with recommendations

Each agent has specialized tools and operates on shared state for efficient data flow.

### Tech Stack

- **TypeScript 5.3+** with strict mode
- **GitHub Copilot SDK 0.1.9+** for multi-agent orchestration
- **Octokit (@octokit/rest)** for GitHub API
- **Axios** for Azure DevOps REST API
- **Zod** for schema validation and config parsing
- **Commander** for CLI interface
- **Chalk** for colored terminal output

## Performance

### Benchmarks

Tested on a standard development machine (8GB RAM, 4 cores):

| Scenario | Organizations | Repositories | Time | Memory |
|----------|---------------|--------------|------|--------|
| Small org | 1 GitHub, 1 ADO | 10 repos | ~15s | ~80MB |
| Medium org | 2 GitHub, 2 ADO | 50 repos | ~45s | ~150MB |
| Large org | 5 GitHub, 5 ADO | 200 repos | ~3m | ~400MB |

### Optimization Tips

**1. Use Caching**
```bash
# First run: ~3 minutes
devplatform-finops analyze --config config.json

# Subsequent runs within TTL: ~5 seconds
devplatform-finops analyze --config config.json
```

**2. Limit Scope**
```bash
# Analyze only one platform if needed
devplatform-finops analyze --github-orgs myorg --no-azdo
```

**3. Adjust Lookback Period**
```json
{
  "analysis": {
    "workflows": {
      "lookbackDays": 7  // Reduce from 30 to 7 days
    }
  }
}
```

### Rate Limits

- **GitHub API**: 5,000 requests/hour per token (authenticated)
- **Azure DevOps API**: ~200 requests/minute per organization

The tool automatically handles rate limits with exponential backoff. Use caching to minimize API calls.

## Troubleshooting

### Common Issues

#### "GitHub API rate limit exceeded"

**Cause:** Too many API requests in a short time.

**Solutions:**
```bash
# Enable caching with longer TTL
devplatform-finops analyze --config config.json --cache-ttl 7200

# Wait for rate limit reset (check headers)
# Or use multiple GitHub tokens (rotate them)
```

#### "Azure DevOps authentication failed"

**Cause:** Invalid or expired PAT, or insufficient scopes.

**Solutions:**
1. Verify PAT has not expired: https://dev.azure.com/_usersSettings/tokens
2. Check required scopes: `vso.build`, `vso.entitlements`, `vso.agentpools`
3. Regenerate PAT if needed

#### "No data returned for organization"

**Cause:** Organization name incorrect or PAT lacks access.

**Solutions:**
1. Verify organization name (case-sensitive)
2. Ensure PAT has access to the organization
3. Check PAT scopes (`admin:org` for GitHub, `vso.entitlements` for ADO)

#### "Cache directory permission denied"

**Cause:** No write access to cache directory.

**Solutions:**
```bash
# Specify writable directory
devplatform-finops analyze --config config.json --cache-dir ~/finops-cache

# Or disable caching
devplatform-finops analyze --config config.json --no-cache
```

### Debug Mode

Enable verbose logging to diagnose issues:

```bash
devplatform-finops analyze --config config.json --log-level debug
```

This will show:
- API request/response details
- Cache hit/miss information
- Agent execution flow
- Error stack traces

### Getting Help

1. Check [GitHub Issues](https://github.com/YOUR-USERNAME/devplatform-finops-agent/issues)
2. Search [Discussions](https://github.com/YOUR-USERNAME/devplatform-finops-agent/discussions)
3. Review [docs/PLAN.md](./docs/PLAN.md) for implementation details
4. Open a new issue with:
   - Command executed
   - Error message (with `--log-level debug`)
   - Configuration (redact tokens)
   - Environment (Node.js version, OS)

## Development

### Project Structure

```
devplatform-finops-agent/
├── src/
│   ├── agents/           # Multi-agent system
│   │   ├── orchestrator.ts
│   │   ├── github-analyzer.ts
│   │   ├── azdo-analyzer.ts
│   │   ├── cost-calculator.ts
│   │   └── report-generator.ts
│   ├── tools/            # Agent tools
│   │   ├── github/       # GitHub analysis tools
│   │   ├── azdo/         # Azure DevOps tools
│   │   ├── cost/         # Cost calculation tools
│   │   └── report/       # Report generation tools
│   ├── clients/          # API clients
│   │   ├── github-client.ts
│   │   └── azdo-client.ts
│   ├── types/            # TypeScript interfaces
│   │   ├── state.ts
│   │   ├── config.ts
│   │   └── report.ts
│   ├── utils/            # Shared utilities
│   │   ├── config-loader.ts
│   │   ├── cache.ts
│   │   ├── logger.ts
│   │   └── pricing.ts
│   ├── cli/              # CLI entry point
│   │   └── index.ts
│   └── index.ts          # Main exports
├── examples/             # Example configurations
├── docs/                 # Documentation
│   ├── PLAN.md          # Implementation roadmap
│   └── research/        # API research documents
├── dist/                 # Compiled output
└── tests/                # Test suite (future)
```

### Building

```bash
# Clean build
npm run clean && npm run build

# Development mode (watch)
npm run dev
```

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Testing

```bash
# Run tests (when available)
npm test

# Run tests with coverage
npm run test:coverage
```

### Local Development

```bash
# Run CLI in development mode
npm run dev -- analyze --config config.json

# Debug with Node inspector
npm run debug -- analyze --config config.json
# Then attach debugger at chrome://inspect
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow code style** - Use Prettier and ESLint
3. **Write tests** - Maintain >80% code coverage (when tests are added)
4. **Update documentation** - Keep README and docs in sync
5. **Commit messages** - Use conventional commits format
6. **Open a PR** - Describe changes and link issues

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(github): add cache usage analysis
fix(azdo): handle empty agent pools
docs(readme): update authentication setup
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by the DevPlatform team**

**Powered by:**
- [GitHub Copilot SDK](https://github.com/copilot-extensions/github-copilot-sdk)
- [Octokit](https://github.com/octokit/rest.js)
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)

