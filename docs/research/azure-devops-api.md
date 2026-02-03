# Azure DevOps REST API - Contract Documentation

> **Source**: [Azure DevOps REST API Documentation](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
> **API Version**: 7.0
> **Retrieved**: 2026-02-03

## Overview

Azure DevOps provides REST APIs for programmatic access to pipelines, agent pools, users, and other resources.

## Authentication

### Personal Access Tokens (PAT)

**Recommended for scripts and tools.**

```bash
# Linux/macOS
curl -u :{PAT} https://dev.azure.com/{organization}/_apis/...

# Or with Base64 encoding
Authorization: Basic BASE64(:{PAT})
```

**PAT Scopes Required for FinOps Agent:**

| Scope | Description | Use Case |
|-------|-------------|----------|
| `vso.agentpools` | View tasks, pools, queues, agents, jobs | Agent pool metrics |
| `vso.build` | View builds | Pipeline run history |
| `vso.graph` | Read user, group, scope information | User license analysis |
| `vso.memberentitlementmanagement` | Read member entitlements | License utilization |

**Creating a PAT:**
1. Sign in to `https://dev.azure.com/{organization}`
2. User settings → Personal access tokens
3. + New Token
4. Select minimum required scopes
5. Set expiration (max 90 days for Entra-backed orgs)

**Best Practices:**
- Use minimum required scopes
- Keep lifespans short (weekly ideal)
- Store in secure key management (Azure Key Vault)
- Rotate regularly
- Never share or commit to source

### Microsoft Entra Tokens (Recommended)

More secure than PATs. Use for production applications.

```bash
# Via Azure CLI
az account get-access-token --resource https://app.vssps.visualstudio.com
```

## Base URLs

| Service | URL Pattern |
|---------|-------------|
| Core APIs | `https://dev.azure.com/{organization}/` |
| Graph APIs | `https://vssps.dev.azure.com/{organization}/` |
| User Entitlements | `https://vsaex.dev.azure.com/{organization}/` |

## Rate Limits

- No published hard limits, but excessive requests may be throttled
- Use pagination for large result sets
- Implement exponential backoff on 429 responses

---

## Agent Pools API

### List Agent Pools

```http
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools?api-version=7.0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `poolName` | string | Filter by name |
| `poolType` | string | `automation` or `deployment` |
| `actionFilter` | string | `none`, `manage`, `use` |

**Response (TaskAgentPool[]):**
```json
{
  "value": [
    {
      "id": 1,
      "name": "Default",
      "isHosted": false,
      "poolType": "automation",
      "size": 5,
      "targetSize": 10,
      "createdOn": "2024-01-01T00:00:00Z",
      "autoProvision": true,
      "autoSize": false,
      "autoUpdate": true
    }
  ],
  "count": 1
}
```

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Pool identifier |
| `name` | string | Pool name |
| `isHosted` | boolean | True = Microsoft-hosted |
| `poolType` | enum | `automation` or `deployment` |
| `size` | int | Current number of agents |
| `targetSize` | int | Target parallelism |

### List Agents in Pool

```http
GET https://dev.azure.com/{organization}/_apis/distributedtask/pools/{poolId}/agents?api-version=7.0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `agentName` | string | Filter by name |
| `includeCapabilities` | boolean | Include agent capabilities |
| `includeAssignedRequest` | boolean | Include current work |
| `includeLastCompletedRequest` | boolean | Include recent completed work |

**Response (TaskAgent[]):**
```json
{
  "value": [
    {
      "id": 1,
      "name": "agent-01",
      "version": "3.232.1",
      "osDescription": "Linux 5.15.0-1050-azure",
      "enabled": true,
      "status": "online",
      "statusChangedOn": "2024-01-15T10:30:00Z",
      "createdOn": "2024-01-01T00:00:00Z",
      "maxParallelism": 1,
      "assignedRequest": { /* current job if any */ },
      "lastCompletedRequest": { /* last job */ }
    }
  ],
  "count": 1
}
```

**Key Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Agent identifier |
| `name` | string | Agent name |
| `status` | enum | `online` or `offline` |
| `enabled` | boolean | Whether agent runs jobs |
| `maxParallelism` | int | Max concurrent jobs |
| `assignedRequest` | object | Current job (if any) |
| `lastCompletedRequest` | object | Most recent completed job |

---

## Pipeline Runs API

### List Pipeline Runs

```http
GET https://dev.azure.com/{organization}/{project}/_apis/pipelines/runs?api-version=7.0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `pipelineId` | int | Filter by pipeline |
| `$top` | int | Max results (default 10000) |

**Response:**
```json
{
  "value": [
    {
      "id": 123,
      "name": "20240115.1",
      "state": "completed",
      "result": "succeeded",
      "createdDate": "2024-01-15T10:00:00Z",
      "finishedDate": "2024-01-15T10:15:00Z",
      "pipeline": {
        "id": 1,
        "name": "Build Pipeline"
      }
    }
  ],
  "count": 1
}
```

---

## User Entitlements API

**Base URL:** `https://vsaex.dev.azure.com/{organization}/`

### List User Entitlements

```http
GET https://vsaex.dev.azure.com/{organization}/_apis/userentitlements?api-version=7.0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `$top` | int | Max results (default 100) |
| `$skip` | int | Pagination offset |
| `$filter` | string | OData filter |

**Response:**
```json
{
  "members": [
    {
      "id": "user-guid",
      "user": {
        "displayName": "John Doe",
        "mailAddress": "john@example.com",
        "principalName": "john@example.com"
      },
      "accessLevel": {
        "accountLicenseType": "express",
        "licensingSource": "account",
        "status": "active"
      },
      "lastAccessedDate": "2024-01-15T10:00:00Z",
      "dateCreated": "2023-01-01T00:00:00Z"
    }
  ],
  "totalCount": 100,
  "continuationToken": "..."
}
```

**Key Fields for License Analysis:**
| Field | Type | Description |
|-------|------|-------------|
| `accessLevel.accountLicenseType` | string | `express`, `stakeholder`, `basic`, `professional` |
| `accessLevel.status` | string | `active`, `disabled`, `pending` |
| `lastAccessedDate` | datetime | Last activity (for inactive user detection) |

---

## Graph Users API

**Base URL:** `https://vssps.dev.azure.com/{organization}/`

### List Users

```http
GET https://vssps.dev.azure.com/{organization}/_apis/graph/users?api-version=7.0
```

**Response:**
```json
{
  "value": [
    {
      "subjectKind": "user",
      "displayName": "John Doe",
      "mailAddress": "john@example.com",
      "principalName": "john@example.com",
      "descriptor": "aad.abc123..."
    }
  ],
  "count": 1
}
```

---

## Pagination

Most APIs support continuation tokens:

```http
GET ...?continuationToken={token}&api-version=7.0
```

Or `$top` and `$skip`:

```http
GET ...?$top=100&$skip=0&api-version=7.0
```

---

## Error Handling

**Common Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Too many requests (rate limited) |

**Error Response Format:**
```json
{
  "$id": "1",
  "innerException": null,
  "message": "Error description",
  "typeName": "Microsoft.VisualStudio.Services.Common.VssServiceException",
  "typeKey": "VssServiceException",
  "errorCode": 0
}
```

---

## TypeScript Client Example

```typescript
import axios from 'axios';

interface AzureDevOpsClient {
  organization: string;
  pat: string;
}

async function getAgentPools(client: AzureDevOpsClient) {
  const response = await axios.get(
    `https://dev.azure.com/${client.organization}/_apis/distributedtask/pools`,
    {
      params: { 'api-version': '7.0' },
      auth: { username: '', password: client.pat }
    }
  );
  return response.data.value;
}

async function getAgentsInPool(client: AzureDevOpsClient, poolId: number) {
  const response = await axios.get(
    `https://dev.azure.com/${client.organization}/_apis/distributedtask/pools/${poolId}/agents`,
    {
      params: {
        'api-version': '7.0',
        includeCapabilities: true,
        includeAssignedRequest: true,
        includeLastCompletedRequest: true
      },
      auth: { username: '', password: client.pat }
    }
  );
  return response.data.value;
}

async function getUserEntitlements(client: AzureDevOpsClient) {
  const response = await axios.get(
    `https://vsaex.dev.azure.com/${client.organization}/_apis/userentitlements`,
    {
      params: { 'api-version': '7.0' },
      auth: { username: '', password: client.pat }
    }
  );
  return response.data.members;
}
```

## References

- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Distributed Task API](https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/)
- [User Entitlements API](https://learn.microsoft.com/en-us/rest/api/azure/devops/memberentitlementmanagement/)
- [PAT Authentication](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Entra Tokens](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/entra)
