import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface GitHubLFSUsageData {
  gitLfsSize: number;
  dataUpcoming: number;
  bandwidth: number;
}

export async function getGitHubLFSUsage(
  octokit: any,
  org: string
): Promise<ToolResult<GitHubLFSUsageData>> {
  return wrapToolHandler(async () => {
    const { data } = await octokit.rest.billing.getSharedStorageBillingOrg({ org });
    
    return {
      gitLfsSize: data.estimated_storage_for_month || 0,
      dataUpcoming: data.estimated_paid_storage_for_month || 0,
      bandwidth: data.days_left_in_billing_cycle || 0,
    };
  }, `get GitHub LFS usage for ${org}`);
}
