/**
 * REFERENCE IMPLEMENTATION - Copilot SDK Agent Pattern
 * 
 * This file documents the REQUIRED pattern for all agents in this project.
 * Implementation agents MUST follow this structure.
 * 
 * Source: htekdev/github-sre-agent (proven working implementation)
 */

import { CopilotClient, defineTool } from "@github/copilot-sdk";
import type { SessionEvent, MCPServerConfig } from "@github/copilot-sdk";
import { z } from "zod";

// ============================================================================
// PATTERN 1: Agent Class Structure
// ============================================================================

export class ExampleAgent {
  private client: CopilotClient;
  private initialized = false;

  constructor() {
    // REQUIRED: CopilotClient with autoStart/autoRestart
    this.client = new CopilotClient({
      autoStart: true,
      autoRestart: true,
    });
  }

  // ============================================================================
  // PATTERN 2: Tool Definition with defineTool()
  // ============================================================================

  /**
   * Tools MUST be defined using defineTool() from @github/copilot-sdk
   * Tools MUST use Zod schemas for parameter validation
   * Tools MUST return structured objects (not throw errors)
   */
  private createTools() {
    return [
      defineTool("example_tool", {
        description: `Description of what this tool does.
Include usage guidance for the LLM.`,
        parameters: z.object({
          requiredParam: z.string().describe("What this parameter is for"),
          optionalParam: z.boolean().optional().default(false).describe("Optional param"),
        }),
        handler: async ({ requiredParam, optionalParam }) => {
          try {
            // Tool implementation here
            const result = await someApiCall(requiredParam, optionalParam);
            return { success: true, data: result };
          } catch (error) {
            // REQUIRED: Return error object, don't throw
            return { success: false, error: String(error) };
          }
        },
      }),
    ];
  }

  // ============================================================================
  // PATTERN 3: Initialization and Lifecycle
  // ============================================================================

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

  // ============================================================================
  // PATTERN 4: Session Creation with Tools and MCP Servers
  // ============================================================================

  async analyze(context: AnalysisContext): Promise<string> {
    await this.init();

    const sessionId = `finops-${Date.now()}`;

    // REQUIRED: MCP servers configuration
    const mcpServers: Record<string, MCPServerConfig> = {
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
        tools: ["*"],
      },
    };

    // REQUIRED: Create session with tools, NOT direct function calls
    const session = await this.client.createSession({
      sessionId,
      model: "gpt-4o", // or config.COPILOT_MODEL
      streaming: true,
      tools: this.createTools(),  // <-- Tools registered here
      mcpServers,
      systemMessage: {
        content: this.buildSystemMessage(context),
      },
    });

    // ============================================================================
    // PATTERN 5: Event Streaming
    // ============================================================================

    let response = "";

    session.on((evt: SessionEvent) => {
      if (evt.type === "assistant.message_delta") {
        response += evt.data.deltaContent;
      }
      if (evt.type === "tool.execution_start") {
        console.log(`Tool executing: ${evt.data.toolName}`);
      }
      if (evt.type === "session.error") {
        console.error("Session error:", evt.data);
      }
    });

    // ============================================================================
    // PATTERN 6: Prompt-Based Orchestration (LLM decides what tools to call)
    // ============================================================================

    // REQUIRED: Use sendAndWait() - the LLM decides which tools to invoke
    // DO NOT: Call tool functions directly in imperative code
    const result = await session.sendAndWait({
      prompt: this.buildAnalysisPrompt(context),
    }, 120000); // timeout in ms

    await session.destroy();

    return result?.data?.content || response;
  }

  // ============================================================================
  // PATTERN 7: System Message (Agent Personality/Capabilities)
  // ============================================================================

  private buildSystemMessage(context: AnalysisContext): string {
    return `You are a FinOps analyst agent.

## Your Capabilities
You have access to tools for:
- **get_github_actions_billing**: Fetch Actions usage for an org
- **get_lfs_storage**: Fetch LFS storage metrics
- **get_codespaces_usage**: Fetch Codespaces hours

## Your Task
Analyze platform usage and identify cost optimization opportunities.
Each recommendation MUST include:
- Quantified dollar impact (monthly/annual)
- Specific action to take
- Risk level and approval requirements

## Response Format
Provide structured JSON output with metrics and recommendations.`;
  }

  // ============================================================================
  // PATTERN 8: Context Prompt (What to analyze)
  // ============================================================================

  private buildAnalysisPrompt(context: AnalysisContext): string {
    return `## Analysis Request

**Organization:** ${context.org}
**Analysis Period:** ${context.days} days
**Platforms:** ${context.platforms.join(", ")}

## Task
1. Use the available tools to gather usage metrics
2. Calculate costs based on current pricing
3. Identify optimization opportunities
4. Generate prioritized recommendations

Begin your analysis.`;
  }
}

// ============================================================================
// ANTI-PATTERNS - DO NOT DO THESE
// ============================================================================

/**
 * ❌ WRONG: Calling tool functions directly (bypasses LLM orchestration)
 */
class BadAgent {
  async analyze(org: string) {
    // ❌ This bypasses the Copilot SDK entirely
    const billing = await getGitHubActionsBilling(org);
    const storage = await getLFSStorage(org);
    // ... imperative code that doesn't use sessions
  }
}

/**
 * ❌ WRONG: Defining tools but never using them in a session
 */
class AnotherBadAgent {
  getTools() {
    return [defineTool("my_tool", { /* ... */ })];
  }

  async analyze() {
    // ❌ getTools() is never passed to createSession()
    // The tools are defined but never used
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

interface AnalysisContext {
  org: string;
  days: number;
  platforms: string[];
}

// Placeholder for example
async function someApiCall(param: string, flag?: boolean): Promise<unknown> {
  return { param, flag };
}
