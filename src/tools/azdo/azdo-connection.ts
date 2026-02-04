/**
 * Azure DevOps Connection Factory
 * 
 * Creates Azure DevOps API connections with authentication.
 * Uses azure-devops-node-api for standard API access.
 */

import * as azdev from "azure-devops-node-api";
import type { WebApi } from "azure-devops-node-api";

export interface AzDOConnectionConfig {
  /** Organization URL: https://dev.azure.com/{org} */
  orgUrl: string;
  /** Personal Access Token with required scopes */
  pat: string;
}

/**
 * Create Azure DevOps API connection
 * 
 * Required PAT Scopes:
 * - vso.memberentitlementmanagement - Read user entitlements
 * - vso.agentpools - Read agent pools
 * - vso.build - Read pipeline runs
 */
export async function createAzDOConnection(config: AzDOConnectionConfig): Promise<WebApi> {
  const authHandler = azdev.getPersonalAccessTokenHandler(config.pat);
  const connection = new azdev.WebApi(config.orgUrl, authHandler);
  
  // Verify connection works
  await connection.connect();
  
  return connection;
}

/**
 * Get organization URL from organization name
 */
export function getOrgUrl(organization: string): string {
  return `https://dev.azure.com/${organization}`;
}

/**
 * Get VSAEX URL (for user entitlements)
 */
export function getVSAEXUrl(organization: string): string {
  return `https://vsaex.dev.azure.com/${organization}`;
}

export const API_VERSION = "7.1";
