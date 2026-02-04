import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';

export const GetUserLicensesSchema = z.object({
  org: z.string().describe('Azure DevOps organization name'),
});

export type GetUserLicensesInput = z.infer<typeof GetUserLicensesSchema>;

export interface UserLicenseData {
  totalUsers: number;
  basicUsers: number;
  basicTestPlansUsers: number;
  inactiveUsers: Array<{
    userId: string;
    userName: string;
    lastAccessDate: Date | null;
    daysSinceLastAccess: number;
    licenseType: string;
  }>;
}

/**
 * Get user license information for an organization.
 * 
 * Note: This is a placeholder implementation. The azure-devops-node-api package
 * does not expose the MemberEntitlementManagement API in the standard WebApi client.
 * A separate API client or direct REST calls would be needed.
 * 
 * Expected implementation: Use the User Entitlements API
 * (https://learn.microsoft.com/en-us/rest/api/azure/devops/memberentitlementmanagement/)
 * 
 * @param _connection - Azure DevOps WebApi connection (unused in placeholder)
 * @param _org - Organization name (unused in placeholder)
 * @param _inactiveDaysThreshold - Inactive days threshold (unused in placeholder)
 * @returns Empty license data
 */
export async function getUserLicenses(
  _connection: azdev.WebApi,
  _org: string,
  _inactiveDaysThreshold: number = 90
): Promise<UserLicenseData> {
  try {
    // Note: The MemberEntitlementManagement API is not available in the standard WebApi
    // This would require using a different API client or endpoint
    // For now, returning placeholder data
    
    return {
      totalUsers: 0,
      basicUsers: 0,
      basicTestPlansUsers: 0,
      inactiveUsers: [],
    };
  } catch (error) {
    throw new Error(`Failed to get user licenses for organization '${_org}': ${error}`);
  }
}
