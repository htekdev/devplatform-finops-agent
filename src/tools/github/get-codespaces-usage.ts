import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface GitHubCodespacesUsageData {
  totalCoreHours: number;
  breakdown: Array<{
    machine: string;
    hours: number;
  }>;
}

export async function getGitHubCodespacesUsage(
  octokit: any,
  org: string
): Promise<ToolResult<GitHubCodespacesUsageData>> {
  return wrapToolHandler(async () => {
    try {
      const { data } = await octokit.request("GET /orgs/{org}/settings/billing/codespaces", {
        org,
      });
      
      return {
        totalCoreHours: data.total_core_hours || 0,
        breakdown: data.machines?.map((m: any) => ({
          machine: m.name,
          hours: m.core_hours || 0,
        })) || [],
      };
    } catch (error: any) {
      if (error.status === 404) {
        return {
          totalCoreHours: 0,
          breakdown: [],
        };
      }
      throw error;
    }
  }, `get GitHub Codespaces usage for ${org}`);
}
