/**
 * Azure DevOps Analyzer Agent
 * 
 * Agent that analyzes Azure DevOps organization usage to identify cost optimization opportunities.
 * Uses Copilot SDK to orchestrate Azure DevOps analysis via LLM.
 */

import { CopilotClient, defineTool } from "@github/copilot-sdk";
import type { SessionEvent, MCPServerConfig } from "@github/copilot-sdk";
import { z } from "zod";
import { createAzDOConnection, getOrgUrl } from "../tools/azdo/azdo-connection.js";
import { getUserEntitlements } from "../tools/azdo/user-entitlements.js";
import { getAgentPools, getAgentsInPool } from "../tools/azdo/agent-pools.js";
import { getPipelineRuns, getBuilds } from "../tools/azdo/pipeline-runs.js";
import type { WebApi } from "azure-devops-node-api";

export interface AzDOAnalysisContext {
  pat: string;
  organization: string;
  projects?: string[];
  inactiveDays?: number;
}

export class AzDOAnalyzerAgent {
  private client: CopilotClient;
  private initialized = false;
  private connection?: WebApi;

  constructor(private model: string = "gpt-4o") {
    this.client = new CopilotClient({
      autoStart: true,
      autoRestart: true,
    });
  }

  /**
   * Define tools for the agent - wraps Azure DevOps tools with defineTool
   */
  private createTools(organization: string, pat: string, connection: WebApi) {
    return [
      defineTool("get_user_entitlements", {
        description: `Get user license information for the Azure DevOps organization.
Returns all users, their license types, and identifies inactive users.
Use this to find license waste and optimization opportunities.`,
        parameters: z.object({
          inactiveDays: z.number().optional().default(90).describe("Days of inactivity to flag users (default: 90)"),
        }),
        handler: async ({ inactiveDays }) => {
          const result = await getUserEntitlements(organization, pat, inactiveDays);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_agent_pools", {
        description: `Get all agent pools in the organization.
Shows hosted vs self-hosted pools and their sizes.
Use this to analyze pipeline infrastructure costs.`,
        parameters: z.object({}),
        handler: async () => {
          const result = await getAgentPools(connection);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_agents_in_pool", {
        description: `Get detailed agent information for a specific pool.
Shows agent status, utilization, and last activity.
Use this to identify underutilized self-hosted agents.`,
        parameters: z.object({
          poolId: z.number().describe("Agent pool ID"),
          poolName: z.string().describe("Agent pool name for context"),
        }),
        handler: async ({ poolId, poolName }) => {
          const result = await getAgentsInPool(connection, poolId, poolName);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_pipeline_runs", {
        description: `Get recent pipeline runs for a specific pipeline.
Shows run states, results, and timing.
Use this for pipeline efficiency analysis.`,
        parameters: z.object({
          project: z.string().describe("Project name"),
          pipelineId: z.number().describe("Pipeline ID"),
          limit: z.number().optional().default(100).describe("Maximum runs to fetch (default: 100)"),
        }),
        handler: async ({ project, pipelineId, limit }) => {
          const result = await getPipelineRuns(connection, project, pipelineId, limit);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_builds", {
        description: `Get recent builds for a project with queue time analysis.
Shows build timing including queue duration.
Use this to identify if more parallel jobs are needed (high queue times) or if capacity is underutilized.`,
        parameters: z.object({
          project: z.string().describe("Project name"),
          limit: z.number().optional().default(100).describe("Maximum builds to fetch (default: 100)"),
        }),
        handler: async ({ project, limit }) => {
          const result = await getBuilds(connection, project, limit);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),
    ];
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    await this.client.start();
    this.initialized = true;
  }

  async stop(): Promise<void> {
    if (!this.initialized) return;
    
    await this.client.stop();
    this.initialized = false;
  }

  /**
   * Analyze Azure DevOps organization usage and costs
   */
  async analyze(context: AzDOAnalysisContext): Promise<string> {
    await this.init();

    // Create Azure DevOps connection
    const orgUrl = getOrgUrl(context.organization);
    this.connection = await createAzDOConnection({
      orgUrl,
      pat: context.pat,
    });

    const sessionId = `azdo-finops-${Date.now()}`;

    const mcpServers: Record<string, MCPServerConfig> = {
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        tools: ["*"],
      },
    };

    const session = await this.client.createSession({
      sessionId,
      model: this.model,
      streaming: true,
      tools: this.createTools(context.organization, context.pat, this.connection),
      mcpServers,
      systemMessage: {
        content: this.buildSystemMessage(context),
      },
    });

    let response = "";

    session.on((evt: SessionEvent) => {
      if (evt.type === "assistant.message_delta") {
        response += evt.data.deltaContent;
      }
      if (evt.type === "tool.execution_start") {
        console.log(`[Azure DevOps Analyzer] Tool executing: ${evt.data.toolName}`);
      }
      if (evt.type === "session.error") {
        console.error("[Azure DevOps Analyzer] Session error:", evt.data);
      }
    });

    const result = await session.sendAndWait({
      prompt: this.buildAnalysisPrompt(context),
    }, 120000);

    await session.destroy();

    return result?.data?.content || response;
  }

  /**
   * Build system message defining agent capabilities and output format
   */
  private buildSystemMessage(_context: AzDOAnalysisContext): string {
    return `You are an Azure DevOps FinOps analyst agent specialized in analyzing Azure DevOps organization costs.

## Your Capabilities
You have access to tools for analyzing Azure DevOps usage:
- **get_user_entitlements**: Fetch user license information and identify inactive users
- **get_agent_pools**: Fetch agent pool information (hosted vs self-hosted)
- **get_agents_in_pool**: Get detailed agent utilization for a specific pool
- **get_pipeline_runs**: Fetch pipeline run history and states
- **get_builds**: Fetch build history with queue time analysis

## Your Task
Analyze Azure DevOps platform usage for the organization and identify cost optimization opportunities.

## Analysis Requirements
You must:
1. Gather usage metrics using the available tools
2. Calculate current costs based on Azure DevOps pricing
3. Identify optimization opportunities
4. Generate actionable recommendations

## Key Cost Areas to Analyze

### 1. License Optimization
- Identify inactive users (no access in 90+ days)
- Calculate potential savings from reclaiming licenses
- Basic license: ~$6/user/month
- Basic + Test Plans: ~$52/user/month

### 2. Pipeline Capacity Analysis
- Check average build queue times
- HIGH queue times (>5 min average): Need more parallel jobs
- LOW queue times (<1 min average): May have excess capacity
- Parallel job pricing: ~$40/month for MS-hosted, ~$15/month for self-hosted

### 3. Self-Hosted vs Microsoft-Hosted ROI
- Compare self-hosted agent costs vs MS-hosted usage
- Self-hosted: Infrastructure costs + $15/month per parallel job
- MS-hosted: $40/month per parallel job + $0.008/min for usage
- Recommend migration if ROI is positive

## Recommendation Format
Each recommendation MUST include:
- **Title**: Clear, specific action to take
- **Impact**: Quantified dollar savings (monthly AND annual)
- **Category**: Type of optimization (e.g., "license_reclamation", "parallel_jobs", "agent_optimization")
- **Priority**: High, Medium, or Low based on impact
- **Risk**: Assessment of implementation risk
- **Actions**: Specific steps to implement the recommendation

## Output Format
Provide a structured Markdown report with:
1. Executive Summary (total costs, top 3 recommendations)
2. Usage Metrics (licenses, parallel jobs, agent pools)
3. Cost Breakdown (itemized costs by service)
4. Recommendations (prioritized list with quantified impact)

Be specific, data-driven, and actionable.`;
  }

  /**
   * Build analysis prompt with context
   */
  private buildAnalysisPrompt(context: AzDOAnalysisContext): string {
    const projects = context.projects || [];
    const projectsStr = projects.length > 0 ? projects.join(", ") : "all projects";

    return `## Azure DevOps Cost Analysis Request

**Organization:** ${context.organization}
**Projects:** ${projectsStr}
**Inactive User Threshold:** ${context.inactiveDays || 90} days
**Goal:** Identify cost optimization opportunities and generate actionable recommendations

## Task
1. Use get_user_entitlements to:
   - Identify total licensed users
   - Find inactive users who haven't accessed in ${context.inactiveDays || 90}+ days
   - Calculate license waste (inactive licenses × cost per license)

2. Use get_agent_pools and get_agents_in_pool to:
   - Inventory hosted vs self-hosted pools
   - Identify underutilized self-hosted agents
   - Calculate infrastructure efficiency

3. Use get_builds for key projects to:
   - Analyze average queue times
   - Determine if more parallel jobs are needed
   - Or if current capacity is underutilized

4. Generate prioritized recommendations with:
   - License reclamation opportunities
   - Parallel job capacity optimization
   - Self-hosted vs hosted agent ROI analysis
   - Infrastructure right-sizing

Begin your analysis now.`;
  }
}
