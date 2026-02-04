import { Octokit } from '@octokit/rest';
import { z } from 'zod';

export const GetLFSStorageSchema = z.object({
  org: z.string().describe('GitHub organization name'),
});

export type GetLFSStorageInput = z.infer<typeof GetLFSStorageSchema>;

export interface LFSStorageData {
  daysLeftInBillingCycle: number;
  estimatedPaidStorageForMonth: number;
  estimatedStorageForMonth: number;
}

export async function getLFSStorage(octokit: Octokit, org: string): Promise<LFSStorageData> {
  try {
    const { data } = await octokit.billing.getSharedStorageBillingOrg({
      org,
    });

    return {
      daysLeftInBillingCycle: data.days_left_in_billing_cycle || 0,
      estimatedPaidStorageForMonth: data.estimated_paid_storage_for_month || 0,
      estimatedStorageForMonth: data.estimated_storage_for_month || 0,
    };
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      throw new Error(`Organization '${org}' not found or no billing access`);
    }
    throw error;
  }
}
