# GitHub REST API & Octokit - Contract Documentation

> **Source**: [GitHub REST API Documentation](https://docs.github.com/en/rest)
> **Octokit**: [@octokit/rest](https://www.npmjs.com/package/@octokit/rest)
> **Retrieved**: 2026-02-03

## Overview

GitHub provides REST APIs for billing, actions, codespaces, and other resources. Octokit is the official JavaScript/TypeScript client.

## Authentication

### Personal Access Token (PAT)

**Classic PAT Scopes Required:**
| Scope | Description | Use Case |
|-------|-------------|----------|
| `admin:org` | Full control of orgs | Billing API access |
| `repo` | Full control of repositories | Actions usage per repo |
| `read:org` | Read org membership | Organization data |

**Fine-Grained PAT (Recommended):**
| Permission | Access | Use Case |
|------------|--------|----------|
| Organization permissions → Administration | Read | Billing data |
| Organization permissions → Members | Read | Org membership |
| Repository permissions → Actions | Read | Workflow runs |

### Using Octokit

```typescript
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
```

## Rate Limits

| Auth Type | Limit |
|-----------|-------|
| Authenticated | 5,000 requests/hour |
| Unauthenticated | 60 requests/hour |
| GitHub App | 15,000 requests/hour |

**Headers to check:**
- `X-RateLimit-Limit`: Total allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp for reset

**Best Practices:**
- Check rate limit headers before bulk operations
- Use conditional requests with `If-None-Match`
- Implement exponential backoff on 403/429

---

## Billing APIs

### Actions Billing

**Get Actions Billing for Organization:**

```http
GET /orgs/{org}/settings/billing/actions
```

**Octokit:**
```typescript
const { data } = await octokit.rest.billing.getGithubActionsBillingOrg({
  org: "my-org"
});
```

**Response:**
```json
{
  "total_minutes_used": 1500,
  "total_paid_minutes_used": 500,
  "included_minutes": 2000,
  "minutes_used_breakdown": {
    "UBUNTU": 1000,
    "MACOS": 200,
    "WINDOWS": 300
  }
}
```

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `total_minutes_used` | number | Total minutes consumed |
| `total_paid_minutes_used` | number | Minutes beyond free tier |
| `included_minutes` | number | Free minutes in plan |
| `minutes_used_breakdown` | object | By runner OS |

### Shared Storage Billing (LFS)

**Get Shared Storage Billing:**

```http
GET /orgs/{org}/settings/billing/shared-storage
```

**Octokit:**
```typescript
const { data } = await octokit.rest.billing.getSharedStorageBillingOrg({
  org: "my-org"
});
```

**Response:**
```json
{
  "days_left_in_billing_cycle": 15,
  "estimated_paid_storage_for_month": 10,
  "estimated_storage_for_month": 110
}
```

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `estimated_storage_for_month` | number | Total GB projected |
| `estimated_paid_storage_for_month` | number | Paid GB projected |

### Codespaces Billing

**Get Codespaces Billing:**

```http
GET /orgs/{org}/settings/billing/codespaces
```

**Octokit:**
```typescript
const { data } = await octokit.rest.billing.getGithubCodespacesBillingOrg({
  org: "my-org"
});
```

**Response:**
```json
{
  "total_hours_used": 100,
  "total_paid_hours_used": 50,
  "included_hours": 60
}
```

### Advanced Security Billing

**Get GHAS Active Committers:**

```http
GET /orgs/{org}/settings/billing/advanced-security
```

**Response:**
```json
{
  "total_advanced_security_committers": 25,
  "total_count": 10,
  "maximum_advanced_security_committers": 50,
  "purchased_advanced_security_committers": 50,
  "repositories": [
    {
      "name": "repo-name",
      "advanced_security_committers": 5,
      "advanced_security_committers_breakdown": [
        {
          "user_login": "username",
          "last_pushed_date": "2024-01-15"
        }
      ]
    }
  ]
}
```

---

## Usage Reports API

### Get Billing Usage Report

```http
GET /orgs/{org}/settings/billing/usage
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | int | Year (e.g., 2024) |
| `month` | int | Month (1-12) |
| `day` | int | Day (optional) |
| `hour` | int | Hour (optional) |

**Response includes:**
- Actions usage by repository
- Storage usage
- Codespaces hours
- Premium request counts

### Get Usage Summary

```http
GET /orgs/{org}/settings/billing/usage/summary
```

Returns aggregated usage across all products.

---

## Actions Cache API

### Get Actions Cache Usage

```http
GET /orgs/{org}/actions/cache/usage
```

**Response:**
```json
{
  "total_active_caches_size_in_bytes": 1073741824,
  "total_active_caches_count": 150
}
```

### Get Cache Usage by Repository

```http
GET /repos/{owner}/{repo}/actions/cache/usage
```

**Response:**
```json
{
  "full_name": "owner/repo",
  "active_caches_size_in_bytes": 104857600,
  "active_caches_count": 10
}
```

---

## Workflow Runs API

### List Workflow Runs for Repository

```http
GET /repos/{owner}/{repo}/actions/runs
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `completed`, `in_progress`, `queued` |
| `per_page` | int | Results per page (max 100) |
| `page` | int | Page number |
| `created` | string | Date filter (e.g., `>=2024-01-01`) |

**Response:**
```json
{
  "total_count": 500,
  "workflow_runs": [
    {
      "id": 123456789,
      "name": "CI",
      "head_branch": "main",
      "status": "completed",
      "conclusion": "success",
      "run_started_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:15:00Z",
      "run_attempt": 1,
      "workflow_id": 12345,
      "usage": {
        "billable": {
          "UBUNTU": {
            "total_ms": 60000,
            "jobs": 2
          }
        },
        "run_duration_ms": 900000
      }
    }
  ]
}
```

**Key Fields for Cost Analysis:**
| Field | Type | Description |
|-------|------|-------------|
| `usage.billable` | object | Billable time by runner type |
| `usage.run_duration_ms` | number | Total run duration |
| `conclusion` | string | `success`, `failure`, `cancelled` |

### Get Workflow Run Usage

```http
GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing
```

**Response:**
```json
{
  "billable": {
    "UBUNTU": {
      "total_ms": 60000,
      "jobs": 2
    },
    "MACOS": {
      "total_ms": 120000,
      "jobs": 1
    }
  },
  "run_duration_ms": 180000
}
```

---

## Codespaces API

### List Codespaces in Organization

```http
GET /orgs/{org}/codespaces
```

**Response:**
```json
{
  "total_count": 10,
  "codespaces": [
    {
      "id": 123,
      "name": "codespace-name",
      "owner": {
        "login": "username"
      },
      "machine": {
        "name": "standardLinux",
        "display_name": "4 cores, 8 GB RAM",
        "storage_in_bytes": 32212254720,
        "cpus": 4,
        "memory_in_bytes": 8589934592
      },
      "state": "Available",
      "created_at": "2024-01-15T10:00:00Z",
      "last_used_at": "2024-01-15T14:00:00Z"
    }
  ]
}
```

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `machine` | object | Machine specs (for cost calculation) |
| `state` | string | `Available`, `Shutdown`, etc. |
| `last_used_at` | datetime | For idle detection |

---

## Pagination

GitHub uses Link headers for pagination:

```
Link: <https://api.github.com/resource?page=2>; rel="next",
      <https://api.github.com/resource?page=5>; rel="last"
```

**Octokit Pagination:**
```typescript
const allRuns = await octokit.paginate(
  octokit.rest.actions.listWorkflowRunsForRepo,
  {
    owner: "my-org",
    repo: "my-repo",
    per_page: 100
  }
);
```

---

## TypeScript Client Example

```typescript
import { Octokit } from "@octokit/rest";

interface GitHubBillingClient {
  octokit: Octokit;
  org: string;
}

async function getActionsBilling(client: GitHubBillingClient) {
  const { data } = await client.octokit.rest.billing.getGithubActionsBillingOrg({
    org: client.org
  });
  return {
    totalMinutes: data.total_minutes_used,
    paidMinutes: data.total_paid_minutes_used,
    includedMinutes: data.included_minutes,
    breakdown: data.minutes_used_breakdown
  };
}

async function getLFSBilling(client: GitHubBillingClient) {
  const { data } = await client.octokit.rest.billing.getSharedStorageBillingOrg({
    org: client.org
  });
  return {
    estimatedStorageGB: data.estimated_storage_for_month,
    paidStorageGB: data.estimated_paid_storage_for_month
  };
}

async function getCodespacesBilling(client: GitHubBillingClient) {
  const { data } = await client.octokit.rest.billing.getGithubCodespacesBillingOrg({
    org: client.org
  });
  return {
    totalHours: data.total_hours_used,
    paidHours: data.total_paid_hours_used,
    includedHours: data.included_hours
  };
}

async function getWorkflowUsage(client: GitHubBillingClient, repo: string) {
  const runs = await client.octokit.paginate(
    client.octokit.rest.actions.listWorkflowRunsForRepo,
    {
      owner: client.org,
      repo,
      per_page: 100,
      created: ">=2024-01-01"
    }
  );
  
  return runs.map(run => ({
    id: run.id,
    name: run.name,
    status: run.status,
    conclusion: run.conclusion,
    duration: run.run_started_at && run.updated_at
      ? new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()
      : 0
  }));
}
```

---

## Installation

```bash
npm install @octokit/rest
```

## Error Handling

```typescript
try {
  const { data } = await octokit.rest.billing.getGithubActionsBillingOrg({
    org: "my-org"
  });
} catch (error) {
  if (error.status === 403) {
    // Rate limited or insufficient permissions
  } else if (error.status === 404) {
    // Organization not found or no access
  }
}
```

## References

- [GitHub REST API](https://docs.github.com/en/rest)
- [Billing REST API](https://docs.github.com/en/rest/billing)
- [Actions REST API](https://docs.github.com/en/rest/actions)
- [Codespaces REST API](https://docs.github.com/en/rest/codespaces)
- [Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [Octokit.js](https://github.com/octokit/octokit.js)
