import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';

export const GetParallelJobsSchema = z.object({
  org: z.string().describe('Azure DevOps organization name'),
});

export type GetParallelJobsInput = z.infer<typeof GetParallelJobsSchema>;

export interface ParallelJobsData {
  hostedJobs: number;
  selfHostedJobs: number;
  utilizationPercent: number;
}

export async function getParallelJobs(
  _connection: azdev.WebApi,
  _org: string
): Promise<ParallelJobsData> {
  try {
    // Note: Azure DevOps doesn't have a direct API for parallel job count
    // This would typically require parsing organization settings or billing data
    // For now, returning placeholder data
    
    return {
      hostedJobs: 1, // Free tier default
      selfHostedJobs: 1, // Free tier default
      utilizationPercent: 0,
    };
  } catch (error) {
    throw new Error(`Failed to get parallel jobs for organization '${_org}': ${error}`);
  }
}
