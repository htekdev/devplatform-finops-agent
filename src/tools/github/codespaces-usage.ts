import { Octokit } from '@octokit/rest';
import { z } from 'zod';

export const GetCodespacesUsageSchema = z.object({
  org: z.string().describe('GitHub organization name'),
});

export type GetCodespacesUsageInput = z.infer<typeof GetCodespacesUsageSchema>;

export interface CodespacesUsageData {
  totalHours: number;
  includedHours: number;
  paidHours: number;
  usageByUser: Array<{
    userName: string;
    hours: number;
  }>;
}

/**
 * Get Codespaces usage for an organization.
 * 
 * Note: This is a placeholder implementation. The GitHub API does not yet have
 * a public Codespaces billing endpoint. This function will be implemented when
 * the API becomes available. For now, it returns empty data.
 * 
 * @param _octokit - Octokit instance (unused in placeholder)
 * @param _org - Organization name (unused in placeholder)
 * @returns Empty usage data
 */
export async function getCodespacesUsage(
  _octokit: Octokit,
  _org: string
): Promise<CodespacesUsageData> {
  try {
    // Note: GitHub API doesn't have a direct Codespaces billing endpoint yet
    // This is a placeholder that returns mock data
    // In production, you would use the actual API when available
    
    // For now, return empty data
    return {
      totalHours: 0,
      includedHours: 0,
      paidHours: 0,
      usageByUser: [],
    };
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      throw new Error(`Organization '${_org}' not found or no billing access`);
    }
    throw error;
  }
}
