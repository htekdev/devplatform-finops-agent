# Quickstart: FinOps Analyzer Agent

Get up and running with the FinOps Analyzer in under 10 minutes.

## Prerequisites

### 1. Install GitHub Copilot CLI

The FinOps Analyzer uses the Copilot SDK which requires the Copilot CLI to be installed:

```bash
# macOS
brew install gh
gh auth login
gh extension install github/gh-copilot

# Windows (via winget)
winget install --id GitHub.cli
gh auth login
gh extension install github/gh-copilot

# Verify installation
copilot --version
```

### 2. Required Credentials

You'll need API credentials for the platforms you want to analyze:

#### GitHub (choose one):
- **Personal Access Token (PAT)** with `repo` and `admin:org` scopes
- **GitHub App** with organization billing permissions

#### Azure DevOps:
- **Personal Access Token (PAT)** with:
  - User Entitlements: Read
  - Agent Pools: Read
  - Build: Read (for pipeline analysis)

## Installation

```bash
# Install globally
npm install -g finops-agent

# Or run directly with npx
npx finops-agent --help
```

## Configuration

### Option 1: Environment Variables (Recommended)

```bash
# GitHub credentials
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# Azure DevOps credentials
export AZURE_DEVOPS_PAT="xxxxxxxxxxxxxxxxxxxxxxxxxx"
export AZURE_DEVOPS_ORG="https://dev.azure.com/my-org"
```

### Option 2: Configuration File

Create `~/.finops-agent/config.json`:

```json
{
  "github": {
    "token": "ghp_xxxxxxxxxxxx",
    "organizations": ["my-github-org"]
  },
  "azureDevOps": {
    "pat": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
    "organizations": ["https://dev.azure.com/my-azdo-org"]
  },
  "thresholds": {
    "inactiveDays": 90,
    "minSavingsToReport": 10
  }
}
```

## Basic Usage

### Analyze GitHub Organization

```bash
finops-agent analyze github --org my-github-org
```

### Analyze Azure DevOps Organization

```bash
finops-agent analyze azdo --org my-azdo-org
```

### Analyze Both Platforms

```bash
finops-agent analyze all \
  --github-org my-github-org \
  --azdo-org my-azdo-org
```

### Export Results

```bash
# JSON output for automation
finops-agent analyze github --org my-org --format json > report.json

# Markdown report for humans
finops-agent analyze github --org my-org --format markdown > report.md
```

## Example Output

```
🔍 FinOps Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Executive Summary
   Total Monthly Spend: $4,523
   Potential Savings:   $1,247/month (28%)

💰 Top Cost Drivers
   1. GitHub Actions (macOS) .......... $2,100/mo (46%)
   2. Azure DevOps Basic Licenses ..... $1,200/mo (27%)
   3. GitHub LFS Storage .............. $523/mo (12%)

🎯 Priority Recommendations
┌────┬─────────────────────────────────┬──────────┬────────┐
│ #  │ Recommendation                  │ Savings  │ Effort │
├────┼─────────────────────────────────┼──────────┼────────┤
│ 1  │ Remove 15 inactive ADO users    │ $90/mo   │ Low    │
│ 2  │ Switch macOS jobs to Linux      │ $1,890/mo│ Medium │
│ 3  │ Archive 3 unused repositories   │ $52/mo   │ Low    │
└────┴─────────────────────────────────┴──────────┴────────┘

Full report saved to: ./finops-report-2026-02-04.json
```

## CLI Reference

```
finops-agent <command> [options]

Commands:
  analyze github    Analyze GitHub organization costs
  analyze azdo      Analyze Azure DevOps organization costs
  analyze all       Analyze both platforms

Options:
  --org <name>        Organization to analyze
  --github-org <name> GitHub organization (for 'all' command)
  --azdo-org <name>   Azure DevOps organization (for 'all' command)
  --format <type>     Output format: json, markdown (default: markdown)
  --output <path>     Output file path (default: stdout)
  --days <number>     Analysis period in days (default: 30)
  --verbose           Show detailed progress
  --help              Show help

Examples:
  finops-agent analyze github --org acme-corp
  finops-agent analyze azdo --org acme --days 60
  finops-agent analyze all --github-org acme-gh --azdo-org acme-ado --format json
```

## Troubleshooting

### "Copilot CLI not found"

Ensure the Copilot CLI is installed and in your PATH:
```bash
copilot --version
```

### "Rate limit exceeded"

GitHub has API rate limits. The tool automatically handles rate limiting, but you can:
- Wait for the rate limit reset (shown in error message)
- Use a GitHub App instead of PAT for higher limits

### "Insufficient permissions"

Verify your credentials have the required scopes:
- GitHub: `repo`, `admin:org` (for billing endpoints)
- Azure DevOps: User Entitlements (Read), Agent Pools (Read)

### "No data available"

The analysis requires at least 30 days of usage history for meaningful recommendations.

## Next Steps

- [Full Documentation](../docs/README.md)
- [API Reference](./contracts/)
- [Data Model](./data-model.md)
