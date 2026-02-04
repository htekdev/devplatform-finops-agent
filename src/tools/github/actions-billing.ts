import { Octokit } from '@octokit/rest';
import { z } from 'zod';

export const GetGitHubActionsBillingSchema = z.object({
  org: z.string().describe('GitHub organization name'),
});

export type GetGitHubActionsBillingInput = z.infer<typeof GetGitHubActionsBillingSchema>;

export interface ActionsBillingData {
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
  octokit: Octokit,
  org: string
): Promise<ActionsBillingData> {
  try {
    const { data } = await octokit.billing.getGithubActionsBillingOrg({
      org,
    });

    return {
      totalMinutesUsed: data.total_minutes_used || 0,
      totalPaidMinutesUsed: data.total_paid_minutes_used || 0,
      includedMinutes: data.included_minutes || 0,
      minutesUsedBreakdown: {
        UBUNTU: data.minutes_used_breakdown?.UBUNTU || 0,
        MACOS: data.minutes_used_breakdown?.MACOS || 0,
        WINDOWS: data.minutes_used_breakdown?.WINDOWS || 0,
      },
    };
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      throw new Error(`Organization '${org}' not found or no billing access`);
    }
    throw error;
  }
}
