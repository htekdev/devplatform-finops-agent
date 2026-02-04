/**
 * GitHub Analyzer Agent
 * 
 * Agent that analyzes GitHub organization usage to identify cost optimization opportunities.
 * Uses Copilot SDK to orchestrate GitHub billing/usage analysis via LLM.
 */

import { CopilotClient, defineTool } from "@github/copilot-sdk";
import type { SessionEvent, MCPServerConfig } from "@github/copilot-sdk";
import { z } from "zod";
import { createFinOpsOctokit } from "../tools/github/octokit-factory.js";
import { getGitHubActionsBilling } from "../tools/github/actions-billing.js";
import { getLFSStorage } from "../tools/github/lfs-storage.js";
import { getCodespacesUsage } from "../tools/github/codespaces-usage.js";

export interface GitHubAnalysisContext {
  token: string;
  organizations: string[];
  days?: number;
}

export class GitHubAnalyzerAgent {
  private client: CopilotClient;
  private initialized = false;

  constructor(private model: string = "gpt-4o") {
    this.client = new CopilotClient({
      autoStart: true,
      autoRestart: true,
    });
  }

  /**
   * Define tools for the agent - wraps GitHub tools with defineTool
   */
  private createTools(token: string) {
    const octokit = createFinOpsOctokit(token);

    return [
      defineTool("get_github_actions_billing", {
        description: `Get GitHub Actions billing data for an organization.
Returns total minutes used, included minutes, and breakdown by runner type.
Use this to analyze Actions usage and identify overage costs.`,
        parameters: z.object({
          org: z.string().describe("GitHub organization name"),
        }),
        handler: async ({ org }) => {
          const result = await getGitHubActionsBilling(octokit, org);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_lfs_storage", {
        description: `Get LFS storage billing data for an organization.
Returns total storage, paid storage, and days left in billing cycle.
Use this to identify storage costs and optimization opportunities.`,
        parameters: z.object({
          org: z.string().describe("GitHub organization name"),
        }),
        handler: async ({ org }) => {
          const result = await getLFSStorage(octokit, org);
          if (!result.success) {
            return { error: result.error };
          }
          return result.data;
        },
      }),

      defineTool("get_codespaces_usage", {
        description: `Get Codespaces usage data for an organization.
Returns total hours used.
Use this to analyze Codespaces usage patterns and costs.`,
        parameters: z.object({
          org: z.string().describe("GitHub organization name"),
        }),
        handler: async ({ org }) => {
          const result = await getCodespacesUsage(octokit, org);
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
   * Analyze GitHub organization usage and costs
   */
  async analyze(context: GitHubAnalysisContext): Promise<string> {
    await this.init();

    const sessionId = `github-finops-${Date.now()}`;

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
      tools: this.createTools(context.token),
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
        console.log(`[GitHub Analyzer] Tool executing: ${evt.data.toolName}`);
      }
      if (evt.type === "session.error") {
        console.error("[GitHub Analyzer] Session error:", evt.data);
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
  private buildSystemMessage(_context: GitHubAnalysisContext): string {
    return `You are a GitHub FinOps analyst agent specialized in analyzing GitHub organization costs.

## Your Capabilities
You have access to tools for analyzing GitHub usage:
- **get_github_actions_billing**: Fetch Actions usage and minutes for an organization
- **get_lfs_storage**: Fetch LFS storage metrics and costs
- **get_codespaces_usage**: Fetch Codespaces hours and costs

## Your Task
Analyze GitHub platform usage for the provided organizations and identify cost optimization opportunities.

## Analysis Requirements
For each organization, you must:
1. Gather usage metrics using the available tools
2. Calculate current costs based on standard GitHub pricing
3. Identify optimization opportunities
4. Generate actionable recommendations

## Recommendation Format
Each recommendation MUST include:
- **Title**: Clear, specific action to take
- **Impact**: Quantified dollar savings (monthly AND annual)
- **Category**: Type of optimization (e.g., "actions_usage", "storage", "codespaces")
- **Priority**: High, Medium, or Low based on impact
- **Risk**: Assessment of implementation risk
- **Actions**: Specific steps to implement the recommendation

## Cost Assumptions
Use these standard GitHub pricing rates:
- Actions: $0.008 per minute for Linux runners (included minutes vary by plan)
- LFS Storage: $0.07 per GB per month (1 GB included)
- Codespaces: $0.18 per hour for 2-core instances

## Output Format
Provide a structured Markdown report with:
1. Executive Summary (total costs, top 3 recommendations)
2. Usage Metrics (current consumption for each service)
3. Cost Breakdown (itemized costs by service)
4. Recommendations (prioritized list with quantified impact)

Be specific, data-driven, and actionable.`;
  }

  /**
   * Build analysis prompt with context
   */
  private buildAnalysisPrompt(context: GitHubAnalysisContext): string {
    const orgList = context.organizations.join(", ");
    const days = context.days || 30;

    return `## GitHub Cost Analysis Request

**Organizations:** ${orgList}
**Analysis Period:** ${days} days
**Goal:** Identify cost optimization opportunities and generate actionable recommendations

## Task
1. For each organization, use the available tools to gather:
   - GitHub Actions billing data (minutes used, overage costs)
   - LFS storage usage (paid storage, potential savings)
   - Codespaces usage (hours, efficiency opportunities)

2. Calculate total costs across all services

3. Identify optimization opportunities such as:
   - Actions workflow inefficiencies
   - Unused or underutilized storage
   - Codespaces left running
   - Opportunities to optimize runner types

4. Generate prioritized recommendations with dollar impact

Begin your analysis now.`;
  }
}
