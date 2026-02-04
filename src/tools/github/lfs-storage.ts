/**
 * LFS Storage Tool
 * 
 * Retrieves LFS storage usage for an organization.
 */

import type { Octokit } from "@octokit/rest";
import { wrapToolHandler, type ToolResult } from "../../lib/error-handling.js";

export interface LFSStorageData {
  totalStorageGB: number;
  paidStorageGB: number;
  daysLeftInCycle: number;
}

/**
 * Get LFS storage billing data for an organization
 */
export async function getLFSStorage(
  octokit: Octokit,
  org: string
): Promise<ToolResult<LFSStorageData>> {
  return wrapToolHandler(
    async () => {
      const { data } = await octokit.billing.getSharedStorageBillingOrg({ org });
      
      return {
        totalStorageGB: data.estimated_storage_for_month,
        paidStorageGB: data.estimated_paid_storage_for_month,
        daysLeftInCycle: data.days_left_in_billing_cycle,
      };
    },
    `get LFS storage for ${org}`
  );
}
