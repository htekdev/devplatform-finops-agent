import type { WebApi } from "azure-devops-node-api";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface AzDoUserEntitlement {
  userId: string;
  userName: string;
  email: string;
  licenseType: string;
  lastAccessedDate?: string;
  status: string;
}

export async function getAzDoUserEntitlements(
  connection: WebApi,
  organization: string
): Promise<ToolResult<AzDoUserEntitlement[]>> {
  return wrapToolHandler(async () => {
    const url = `https://vsaex.dev.azure.com/${organization}/_apis/userentitlements?api-version=7.1-preview.3`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${await getAccessToken(connection)}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user entitlements: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    return data.members?.map((member: any) => ({
      userId: member.id,
      userName: member.user?.displayName || "",
      email: member.user?.mailAddress || "",
      licenseType: member.accessLevel?.licenseDisplayName || "Unknown",
      lastAccessedDate: member.lastAccessedDate,
      status: member.user?.subjectKind || "user",
    })) || [];
  }, `get Azure DevOps user entitlements for ${organization}`);
}

async function getAccessToken(connection: WebApi): Promise<string> {
  const handler = (connection as any).authHandler;
  if (handler && handler.token) {
    return handler.token;
  }
  throw new Error("No access token available");
}
