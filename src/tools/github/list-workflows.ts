import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export async function listGitHubWorkflows(
  octokit: any,
  owner: string,
  repo: string
): Promise<ToolResult<GitHubWorkflow[]>> {
  return wrapToolHandler(async () => {
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
    });
    
    return data.workflows.map((wf: any) => ({
      id: wf.id,
      name: wf.name,
      path: wf.path,
      state: wf.state,
      createdAt: wf.created_at,
      updatedAt: wf.updated_at,
    }));
  }, `list workflows for ${owner}/${repo}`);
}
