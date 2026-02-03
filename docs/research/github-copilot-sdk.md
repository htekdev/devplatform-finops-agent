# GitHub Copilot SDK - Contract Documentation

> **Source**: [GitHub Copilot SDK Repository](https://github.com/github/copilot-sdk)
> **NPM Package**: [@github/copilot-sdk](https://www.npmjs.com/package/@github/copilot-sdk)
> **Version**: 0.1.9 (Technical Preview)
> **Retrieved**: 2026-02-03

## Overview

The GitHub Copilot SDK is a multi-platform SDK for integrating GitHub Copilot Agent into apps and services. It provides programmatic control of GitHub Copilot CLI via JSON-RPC.

**Available SDKs:**
| SDK | Package | Installation |
|-----|---------|--------------|
| Node.js/TypeScript | `@github/copilot-sdk` | `npm install @github/copilot-sdk` |
| Python | `github-copilot-sdk` | `pip install github-copilot-sdk` |
| Go | `github.com/github/copilot-sdk/go` | `go get github.com/github/copilot-sdk/go` |
| .NET | `GitHub.Copilot.SDK` | `dotnet add package GitHub.Copilot.SDK` |

## Architecture

```
Your Application
    ↓
SDK Client
    ↓
JSON-RPC
    ↓
Copilot CLI (server mode)
```

The SDK manages the CLI process lifecycle automatically.

## Requirements

- **Copilot Subscription**: Required (free tier has limited usage)
- **Copilot CLI**: Must be installed separately and in PATH
- **Node.js**: >= 18.0.0 (for TypeScript SDK)

## Billing

- Based on same model as Copilot CLI
- Each prompt counts towards premium request quota
- See [Requests in GitHub Copilot](https://docs.github.com/en/copilot/managing-copilot/managing-copilot-as-an-individual-subscriber/about-github-copilot-free)

## TypeScript API Reference

### Installation

```bash
npm install @github/copilot-sdk
```

### CopilotClient

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient(options?: CopilotClientOptions);
```

**CopilotClientOptions:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cliPath` | string | "copilot" | Path to CLI executable |
| `cliArgs` | string[] | - | Extra arguments for CLI |
| `cliUrl` | string | - | URL of existing CLI server |
| `port` | number | 0 (random) | Server port |
| `useStdio` | boolean | true | Use stdio transport instead of TCP |
| `logLevel` | string | "info" | Log level |
| `autoStart` | boolean | true | Auto-start server |
| `autoRestart` | boolean | true | Auto-restart on crash |
| `githubToken` | string | - | GitHub token for auth |
| `useLoggedInUser` | boolean | true | Use logged-in user for auth |

**Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | `Promise<void>` | Start CLI server and connect |
| `stop()` | `Promise<Error[]>` | Stop server, close sessions |
| `forceStop()` | `Promise<void>` | Force stop without cleanup |
| `createSession(config?)` | `Promise<CopilotSession>` | Create conversation session |
| `resumeSession(id, config?)` | `Promise<CopilotSession>` | Resume existing session |
| `ping(message?)` | `Promise<{message, timestamp}>` | Check connectivity |
| `getState()` | `ConnectionState` | Get connection state |
| `listSessions()` | `Promise<SessionMetadata[]>` | List all sessions |
| `deleteSession(id)` | `Promise<void>` | Delete a session |

### SessionConfig

```typescript
interface SessionConfig {
    sessionId?: string;              // Custom session ID
    model?: string;                  // Model to use (required for custom providers)
    reasoningEffort?: "low" | "medium" | "high" | "xhigh";
    tools?: Tool[];                  // Custom tools
    systemMessage?: SystemMessageConfig;
    infiniteSessions?: InfiniteSessionConfig;
    provider?: ProviderConfig;       // BYOK - custom API provider
    onUserInputRequest?: UserInputHandler;
    hooks?: SessionHooks;
}
```

**Available Models:**
- `gpt-5`
- `claude-sonnet-4.5`
- And others available via Copilot CLI

### CopilotSession

```typescript
interface CopilotSession {
    sessionId: string;
    workspacePath?: string;  // For infinite sessions
    
    send(options: MessageOptions): Promise<string>;
    sendAndWait(options: MessageOptions, timeout?: number): Promise<AssistantMessageEvent | undefined>;
    on(eventType: string, handler: TypedSessionEventHandler): () => void;
    on(handler: SessionEventHandler): () => void;
    abort(): Promise<void>;
    getMessages(): Promise<SessionEvent[]>;
    destroy(): Promise<void>;
}

interface MessageOptions {
    prompt: string;
    attachments?: Array<{type: string, path: string, displayName?: string}>;
    mode?: "enqueue" | "immediate";
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `user.message` | User message added |
| `assistant.message` | Assistant response (final) |
| `assistant.message_delta` | Streaming response chunk |
| `assistant.reasoning` | Reasoning content (final) |
| `assistant.reasoning_delta` | Streaming reasoning chunk |
| `tool.execution_start` | Tool execution started |
| `tool.execution_end` | Tool execution completed |
| `session.idle` | Session finished processing |
| `session.compaction_start` | Background compaction started |
| `session.compaction_complete` | Compaction finished |

### Custom Tools

```typescript
import { z } from "zod";
import { defineTool } from "@github/copilot-sdk";

const session = await client.createSession({
    model: "gpt-5",
    tools: [
        defineTool("my_tool", {
            description: "Tool description",
            parameters: z.object({
                param1: z.string().describe("Parameter description"),
            }),
            handler: async ({ param1 }) => {
                // Implementation
                return result;
            },
        }),
    ],
});
```

### Custom Providers (BYOK)

```typescript
interface ProviderConfig {
    type?: "openai" | "azure" | "anthropic";  // Default: "openai"
    baseUrl: string;                           // Required
    apiKey?: string;                           // Optional for local providers
    bearerToken?: string;                      // Takes precedence over apiKey
    wireApi?: "completions" | "responses";     // Default: "completions"
    azure?: {
        apiVersion?: string;                   // Default: "2024-10-21"
    };
}
```

**Example with Azure OpenAI:**
```typescript
const session = await client.createSession({
    model: "gpt-4",
    provider: {
        type: "azure",  // Must be "azure" for Azure endpoints
        baseUrl: "https://my-resource.openai.azure.com",
        apiKey: process.env.AZURE_OPENAI_KEY,
        azure: {
            apiVersion: "2024-10-21",
        },
    },
});
```

### Session Hooks

```typescript
interface SessionHooks {
    onPreToolUse?: (input, invocation) => Promise<{
        permissionDecision: "allow" | "deny" | "ask";
        modifiedArgs?: any;
        additionalContext?: string;
    }>;
    onPostToolUse?: (input, invocation) => Promise<{
        additionalContext?: string;
    }>;
    onUserPromptSubmitted?: (input, invocation) => Promise<{
        modifiedPrompt?: string;
    }>;
    onSessionStart?: (input, invocation) => Promise<{
        additionalContext?: string;
    }>;
    onSessionEnd?: (input, invocation) => Promise<void>;
    onErrorOccurred?: (input, invocation) => Promise<{
        errorHandling: "retry" | "skip" | "abort";
    }>;
}
```

### Infinite Sessions

Automatically manages context window limits through background compaction.

```typescript
const session = await client.createSession({
    model: "gpt-5",
    infiniteSessions: {
        enabled: true,  // Default
        backgroundCompactionThreshold: 0.80,  // Start compacting at 80%
        bufferExhaustionThreshold: 0.95,      // Block at 95%
    },
});

// Workspace path for checkpoints
console.log(session.workspacePath);
// => ~/.copilot/session-state/{sessionId}/
```

## Quick Start Example

```typescript
import { CopilotClient } from "@github/copilot-sdk";

// Create and start client
const client = new CopilotClient();
await client.start();

// Create a session
const session = await client.createSession({
    model: "gpt-5",
});

// Wait for response using typed event handlers
const done = new Promise<void>((resolve) => {
    session.on("assistant.message", (event) => {
        console.log(event.data.content);
    });
    session.on("session.idle", () => {
        resolve();
    });
});

// Send a message and wait for completion
await session.send({ prompt: "What is 2+2?" });
await done;

// Clean up
await session.destroy();
await client.stop();
```

## Default Tools

By default, the SDK operates with `--allow-all`, enabling:
- File system operations
- Git operations
- Web requests
- And more (see Copilot CLI documentation)

Tools can be customized via session config.

## References

- [GitHub Copilot SDK Repository](https://github.com/github/copilot-sdk)
- [NPM Package](https://www.npmjs.com/package/@github/copilot-sdk)
- [Getting Started Guide](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md)
- [Cookbook](https://github.com/github/copilot-sdk/tree/main/cookbook)
- [Blog Announcement](https://github.blog/news-insights/company-news/build-an-agent-into-any-app-with-the-github-copilot-sdk/)
