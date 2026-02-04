import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface GitHubActionsBillingData {
  totalMinutesUsed: number;
  totalPaidMinutesUsed: number;
  includedMinutes: number;
  minutesUsedBreakdown: {
    UBUNTU?: number;
    MACOS?: number;
    WINDOWS?: number;
  };
}

export async function getGitHubActionsBilling(
  octokit: any,
  org: string
): Promise<ToolResult<GitHubActionsBillingData>> {
  return wrapToolHandler(async () => {
    const { data } = await octokit.rest.billing.getGithubActionsBillingOrg({ org });
    
    return {
      totalMinutesUsed: data.total_minutes_used,
      totalPaidMinutesUsed: data.total_paid_minutes_used,
      includedMinutes: data.included_minutes,
      minutesUsedBreakdown: data.minutes_used_breakdown,
    };
  }, `get GitHub Actions billing for ${org}`);
}
