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

---

## Authentication Options

### Explicit Credentials (Recommended for CI/CD)

Use environment variables for explicit credential configuration:

```bash
# GitHub - Personal Access Token
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# Azure DevOps - Personal Access Token
export AZURE_DEVOPS_PAT="xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Pros**: Predictable, works in all environments, no external dependencies  
**Cons**: Requires manual token management and rotation

### CLI Auth Fallback (Local Development)

For local development, the agent can discover credentials from existing CLI tools:

```bash
# GitHub - Uses gh CLI auth
gh auth login
gh auth status  # Verify authentication

# Azure - Uses az CLI auth
az login
az account show  # Verify authentication
```

**Pros**: No token management, reuses existing auth  
**Cons**: Requires CLI tools installed, may not work in CI/CD

### Authentication Priority

The agent checks credentials in this order:
1. Environment variables (explicit)
2. Configuration file
3. CLI credential discovery (fallback)

### Credential Validation

On startup, the agent validates credentials with a test API call:

```bash
# What happens internally:
# GitHub: GET /user (verify token works)
# Azure DevOps: GET /_apis/projects (verify PAT works)

finops-agent analyze github --org my-org
# ✓ GitHub credentials validated
# ✓ Starting analysis...
```

If validation fails, you'll see:
```
✗ GitHub authentication failed
  - Check that GITHUB_TOKEN is set and has 'repo' and 'admin:org' scopes
  - Or run 'gh auth login' to authenticate via CLI
```

---

## Human-Readable Report Structure (GAP #6)

The text output follows this structure:

```
================================================================================
  FINOPS ANALYSIS REPORT
================================================================================

Analysis Date: 2025-02-04T10:00:00Z
Period: 2024-11-05 to 2025-02-04 (90 days)
Platforms: GitHub, Azure DevOps
Organizations: acme-corp (GitHub), acme (Azure DevOps)

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Total Monthly Cost: $4,523.00
Potential Savings: $1,247.00/month ($14,964.00/year)

Cost Breakdown:
  • GitHub Actions:        $2,100.00 (46%)
  • Azure DevOps Licenses: $1,200.00 (27%)
  • GitHub LFS Storage:      $523.00 (12%)
  • Other:                   $700.00 (15%)

TOP 3 RECOMMENDATIONS
--------------------------------------------------------------------------------
1. Switch macOS GitHub Actions to Linux runners
   Category: optimization | Effort: medium (4-16 hours)
   Impact: $1,890.00/month ($22,680.00/year)
   ✅ Auto-executable (no approval required)
   
   Details: 15 workflows use macOS runners for tasks that can run on Linux.
   macOS costs $0.08/min vs Linux at $0.008/min (10x savings).
   
   Affected workflows:
   - acme-corp/frontend: build.yml, test.yml
   - acme-corp/mobile: ci.yml

2. Remove 15 inactive Azure DevOps user licenses
   Category: cleanup | Effort: low (1-4 hours)
   Impact: $90.00/month ($1,080.00/year)
   ⚠️  Requires approval (user account changes)
   
   Details: 15 users have not accessed Azure DevOps in 90+ days.
   Each Basic license costs $6/month.
   
   Inactive users:
   - john.doe@acme.com (last access: 2024-08-15)
   - jane.smith@acme.com (last access: 2024-09-01)
   ... and 13 more (see JSON report for full list)

3. Archive 3 unused GitHub repositories
   Category: cleanup | Effort: trivial (<1 hour)
   Impact: $52.00/month ($624.00/year)
   ✅ Auto-executable (no approval required)
   
   Details: 3 repositories have no commits in 180+ days and consume
   LFS storage.
   
   Repositories:
   - acme-corp/legacy-api (42 GB LFS)
   - acme-corp/old-docs (8 GB LFS)
   - acme-corp/prototype-2023 (12 GB LFS)

DETAILED METRICS
--------------------------------------------------------------------------------
GitHub Actions Usage (90 days):
  Linux:   12,500 minutes ($100.00)
  Windows:  3,200 minutes ($51.20)
  macOS:   26,250 minutes ($2,100.00)
  Total:   41,950 minutes ($2,251.20)

Azure DevOps Licenses:
  Basic:           45 users ($270.00/month)
  Basic + Test:    12 users ($624.00/month)
  Stakeholder:     89 users (free)
  Inactive (90d):  15 users ($90.00/month potential savings)

DIAGNOSTICS
--------------------------------------------------------------------------------
ℹ️  [INFO] Analysis completed in 45 seconds
ℹ️  [INFO] 127 repositories analyzed
⚠️  [WARNING] Pricing data is 45 days old. Consider updating.
⚠️  [WARNING] 3 repositories returned partial data (rate limited)

================================================================================
End of Report | Generated by FinOps Agent v1.0.0
================================================================================
```

---

## Testing Commands

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- tests/unit/tools/github/get-actions-billing.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Validate JSON Schemas
```bash
npm run validate:schemas
```

### Type Check
```bash
npm run typecheck
```

### Lint
```bash
npm run lint
```

### Full CI Check (lint + typecheck + test)
```bash
npm run ci
```

---

## Filter Configuration

Limit analysis scope with filter configuration:

```bash
# Via command line
finops-agent analyze github --org my-org \
  --include-repos "frontend-*,backend-*" \
  --exclude-repos "*-deprecated"

# Via config file (~/.finops-agent/config.json)
{
  "filters": {
    "repositories": {
      "include": ["frontend-*", "backend-*"],
      "exclude": ["*-deprecated"]
    }
  }
}
```

### Available Filters

| Filter | Applies To | Example |
|--------|------------|---------|
| `repositories` | GitHub repos | `frontend-*`, `!archive-*` |
| `projects` | Azure DevOps projects | `ProjectA`, `Team-*` |
| `users` | User licenses | `!service-*`, `!bot-*` |
| `resourceTypes` | Metric types | `actions-minutes`, `user-license` |

---

## Output Files

By default, reports are saved to the current directory:

```
./finops-report-2026-02-04.json   # Machine-readable JSON
./finops-report-2026-02-04.txt    # Human-readable text
```

Customize output location:
```bash
finops-agent analyze github --org my-org \
  --output ./reports/latest.json \
  --format json
```
