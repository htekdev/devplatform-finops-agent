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
