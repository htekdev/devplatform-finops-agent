/**
 * User Entitlements Tool
 * 
 * Retrieves user license information for an Azure DevOps organization.
 * Uses VSAEX API (vsaex.dev.azure.com) for member entitlement management.
 */

import { wrapToolHandler, type ToolResult } from "../../lib/error-handling.js";
import { getVSAEXUrl, API_VERSION } from "./azdo-connection.js";

export interface UserEntitlement {
  id: string;
  displayName: string;
  mailAddress: string;
  principalName: string;
  accountLicenseType: string;
  licensingSource: string;
  status: string;
  dateCreated: string;
  lastAccessedDate: string;
}

export interface UserEntitlementsData {
  users: UserEntitlement[];
  totalCount: number;
  inactiveCount: number;
  inactiveDays: number;
}

/**
 * Get user entitlements for an Azure DevOps organization
 * Includes inactive user detection
 */
export async function getUserEntitlements(
  organization: string,
  pat: string,
  inactiveDays: number = 90
): Promise<ToolResult<UserEntitlementsData>> {
  return wrapToolHandler(
    async () => {
      const baseUrl = getVSAEXUrl(organization);
      const url = new URL(`${baseUrl}/_apis/userentitlements`);
      url.searchParams.set("api-version", API_VERSION);
      
      const response = await fetch(url.toString(), {
        headers: {
          "Authorization": `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { items?: any[] };
      const users: UserEntitlement[] = (data.items || []).map((item: any) => ({
        id: item.id,
        displayName: item.user?.displayName || "",
        mailAddress: item.user?.mailAddress || "",
        principalName: item.user?.principalName || "",
        accountLicenseType: item.accessLevel?.accountLicenseType || "unknown",
        licensingSource: item.accessLevel?.licensingSource || "unknown",
        status: item.accessLevel?.status || "unknown",
        dateCreated: item.dateCreated || "",
        lastAccessedDate: item.lastAccessedDate || "",
      }));
      
      // Calculate inactive users
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      
      const inactiveCount = users.filter(user => {
        if (!user.lastAccessedDate || user.status !== "active") return false;
        const lastAccess = new Date(user.lastAccessedDate);
        return lastAccess < cutoffDate;
      }).length;
      
      return {
        users,
        totalCount: users.length,
        inactiveCount,
        inactiveDays,
      };
    },
    `get user entitlements for ${organization}`
  );
}
