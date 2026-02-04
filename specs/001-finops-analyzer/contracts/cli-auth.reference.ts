/**
 * CLI Authentication Contract - SDK-Native Methods
 * 
 * Implements: FR-023, FR-024, FR-025 from spec.md
 * 
 * VERIFIED: 2026-02-04
 * Both approaches tested and confirmed working without execSync/CLI calls.
 * 
 * ============================================================================
 * REQUIRED DEPENDENCIES - Add to package.json
 * ============================================================================
 * 
 * {
 *   "dependencies": {
 *     "octokit-from-auth": "^0.2.0",
 *     "@azure/identity": "^4.0.0"
 *   }
 * }
 * 
 * Install: npm install octokit-from-auth @azure/identity
 * 
 * Note: These are in ADDITION to existing dependencies:
 *   - @octokit/rest (already required for GitHub API)
 *   - azure-devops-node-api (already required for Azure DevOps API)
 * ============================================================================
 */

// =============================================================================
// GITHUB AUTHENTICATION (VERIFIED ✓)
// =============================================================================
// 
// Package: octokit-from-auth
// 
// Auto-discovers credentials in order:
//   1. GITHUB_TOKEN environment variable
//   2. GH_TOKEN environment variable
//   3. gh CLI credential store (reads token cache, NOT execSync)
//
// This is fully SDK-native - no shell calls.

import { Octokit } from "@octokit/rest";
import { octokitFromAuth } from "octokit-from-auth";

/**
 * Get an authenticated Octokit instance using automatic credential discovery.
 * 
 * @example
 * const octokit = await getGitHubClient();
 * const { data } = await octokit.rest.users.getAuthenticated();
 */
export async function getGitHubClient(): Promise<Octokit> {
  try {
    return await octokitFromAuth();
  } catch (error) {
    throw new AuthenticationError(
      "GitHub authentication failed",
      "GITHUB_AUTH_FAILED",
      [
        "Set GITHUB_TOKEN or GH_TOKEN environment variable",
        "Run 'gh auth login' to authenticate GitHub CLI",
      ],
      error
    );
  }
}

// =============================================================================
// AZURE DEVOPS AUTHENTICATION (VERIFIED ✓)
// =============================================================================
//
// Package: @azure/identity
//
// DefaultAzureCredential tries in order (SDK-native, no shell calls):
//   1. EnvironmentCredential (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
//   2. WorkloadIdentityCredential (Kubernetes)
//   3. ManagedIdentityCredential (Azure VMs, App Service, etc.)
//   4. AzureCliCredential (reads az CLI token cache)
//   5. AzurePowerShellCredential
//   6. AzureDeveloperCliCredential
//
// For Azure DevOps, we also support explicit PAT via environment variable.

import { DefaultAzureCredential, AzureCliCredential } from "@azure/identity";
import * as azdev from "azure-devops-node-api";

/** Azure DevOps resource ID - well-known constant for token requests */
const AZURE_DEVOPS_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";
const AZURE_DEVOPS_SCOPE = `${AZURE_DEVOPS_RESOURCE_ID}/.default`;

export interface AzureDevOpsConnection {
  connection: azdev.WebApi;
  authType: "pat" | "entra";
}

/**
 * Get an authenticated Azure DevOps connection.
 * 
 * Tries in order:
 *   1. AZURE_DEVOPS_PAT environment variable (explicit PAT)
 *   2. DefaultAzureCredential (Entra ID via az CLI, managed identity, etc.)
 * 
 * @param organization - Azure DevOps organization name
 * 
 * @example
 * const { connection } = await getAzureDevOpsClient("myorg");
 * const coreApi = await connection.getCoreApi();
 */
export async function getAzureDevOpsClient(
  organization: string
): Promise<AzureDevOpsConnection> {
  const orgUrl = `https://dev.azure.com/${organization}`;

  // Option 1: Explicit PAT from environment
  const pat = process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_EXT_PAT;
  if (pat) {
    const authHandler = azdev.getPersonalAccessTokenHandler(pat);
    return {
      connection: new azdev.WebApi(orgUrl, authHandler),
      authType: "pat",
    };
  }

  // Option 2: Entra ID via DefaultAzureCredential
  try {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken(AZURE_DEVOPS_SCOPE);
    
    const authHandler = azdev.getBearerHandler(tokenResponse.token);
    return {
      connection: new azdev.WebApi(orgUrl, authHandler),
      authType: "entra",
    };
  } catch (error) {
    throw new AuthenticationError(
      "Azure DevOps authentication failed",
      "AZDO_AUTH_FAILED",
      [
        "Set AZURE_DEVOPS_PAT environment variable",
        "Run 'az login' to authenticate Azure CLI",
        "Configure managed identity (if running in Azure)",
      ],
      error
    );
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestedActions: string[],
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AuthenticationError";
  }

  /** Format for CLI output */
  toUserMessage(): string {
    return [
      `Error: ${this.message}`,
      "",
      "To resolve, try one of:",
      ...this.suggestedActions.map((a, i) => `  ${i + 1}. ${a}`),
    ].join("\n");
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate GitHub credentials by making a lightweight API call.
 * Returns the authenticated username.
 */
export async function validateGitHubAuth(octokit: Octokit): Promise<string> {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}

/**
 * Validate Azure DevOps credentials by listing projects.
 * Returns the project count.
 */
export async function validateAzureDevOpsAuth(
  connection: azdev.WebApi
): Promise<number> {
  const coreApi = await connection.getCoreApi();
  const projects = await coreApi.getProjects();
  return projects.length;
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
// In application code:

import { getGitHubClient, getAzureDevOpsClient, validateGitHubAuth } from "./auth";

async function main() {
  // GitHub - automatic credential discovery
  const octokit = await getGitHubClient();
  const username = await validateGitHubAuth(octokit);
  console.log(`GitHub: Authenticated as ${username}`);

  // Azure DevOps - automatic credential discovery
  const { connection, authType } = await getAzureDevOpsClient("myorg");
  const projectCount = await validateAzureDevOpsAuth(connection);
  console.log(`Azure DevOps: Found ${projectCount} projects (auth: ${authType})`);
}
*/
