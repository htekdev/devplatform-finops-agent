/**
 * GitHub Actions Billing Tool
 * 
 * Retrieves Actions minutes usage for an organization.
 */

import type { Octokit } from "@octokit/rest";
import { wrapToolHandler, type ToolResult } from "../../lib/error-handling.js";

export interface ActionsBillingData {
  totalMinutesUsed: number;
  includedMinutes: number;
  minutesUsedBreakdown: Record<string, number>;
}

/**
 * Get GitHub Actions billing data for an organization
 */
export async function getGitHubActionsBilling(
  octokit: Octokit,
  org: string
): Promise<ToolResult<ActionsBillingData>> {
  return wrapToolHandler(
    async () => {
      const { data } = await octokit.billing.getGithubActionsBillingOrg({ org });
      
      return {
        totalMinutesUsed: data.total_minutes_used,
        includedMinutes: data.included_minutes,
        minutesUsedBreakdown: data.minutes_used_breakdown,
      };
    },
    `get GitHub Actions billing for ${org}`
  );
}
