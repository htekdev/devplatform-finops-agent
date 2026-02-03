# GitHub Copilot Custom Agents - Contract Documentation

> **Source**: [GitHub Docs - Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
> **Retrieved**: 2026-02-03

## Overview

Custom agents are specialized versions of Copilot coding agent that you can tailor to unique workflows, coding conventions, and use cases. They act like tailored teammates that follow your standards, use the right tools, and implement team-specific practices.

## File Location & Naming

- **Repository level**: `.github/agents/<agent-name>.agent.md`
- **Organization/Enterprise level**: `agents/<agent-name>.agent.md` in `.github-private` repository
- **VS Code user level**: User profile folder

**Filename constraints**: May only contain `.`, `-`, `_`, `a-z`, `A-Z`, `0-9`

## File Structure

Agent profiles are **Markdown files with YAML frontmatter**.

```markdown
---
name: my-agent-name
description: Required description of what the agent does
tools: ["read", "search", "edit"]
target: vscode | github-copilot  # optional, defaults to both
infer: true | false  # optional, defaults to true
---

Your agent's behavioral instructions go here in Markdown.
Maximum 30,000 characters.
```

## YAML Frontmatter Properties

| Property | Type | Required | Purpose |
|----------|------|----------|---------|
| `name` | string | No | Display name (defaults to filename) |
| `description` | string | **Yes** | Description of agent's purpose and capabilities |
| `tools` | list/string | No | Tools the agent can use (defaults to all) |
| `target` | string | No | `vscode` or `github-copilot` (defaults to both) |
| `infer` | boolean | No | Auto-select based on context (defaults to true) |
| `mcp-servers` | object | No | MCP server config (org/enterprise level only) |
| `metadata` | object | No | Annotation data (name/value pairs) |

**Note**: `model`, `argument-hint`, and `handoffs` properties from VS Code are NOT supported for Copilot coding agent on GitHub.com.

## Tools Configuration

### Available Tool Aliases

| Primary Alias | Compatible Aliases | Purpose |
|---------------|-------------------|---------|
| `execute` | `shell`, `Bash`, `powershell` | Execute shell commands |
| `read` | `Read`, `NotebookRead` | Read file contents |
| `edit` | `Edit`, `MultiEdit`, `Write`, `NotebookEdit` | Edit files |
| `search` | `Grep`, `Glob` | Search for files or text |
| `agent` | `custom-agent`, `Task` | Invoke other custom agents |
| `web` | `WebSearch`, `WebFetch` | Fetch URLs, web search |
| `todo` | `TodoWrite` | Create/manage task lists |

### Tools Configuration Options

```yaml
# Enable ALL tools (default)
tools: ["*"]

# Enable specific tools only
tools: ["read", "search", "edit"]

# Disable ALL tools
tools: []

# Include MCP server tools
tools: ["read", "edit", "some-mcp-server/tool-1"]

# All tools from specific MCP server
tools: ["some-mcp-server/*"]
```

### Built-in MCP Servers

| Server | Description |
|--------|-------------|
| `github` | Read-only GitHub tools, scoped to source repository |
| `playwright` | Browser automation, localhost only |

## Example Agent Profiles

### Testing Specialist (all tools)

```markdown
---
name: test-specialist
description: Focuses on test coverage, quality, and testing best practices without modifying production code
---

You are a testing specialist focused on improving code quality through comprehensive testing. Your responsibilities:
- Analyze existing tests and identify coverage gaps
- Write unit tests, integration tests, and end-to-end tests following best practices
- Review test quality and suggest improvements for maintainability
- Ensure tests are isolated, deterministic, and well-documented
- Focus only on test files and avoid modifying production code unless specifically requested

Always include clear test descriptions and use appropriate testing patterns for the language and framework.
```

### Implementation Planner (limited tools)

```markdown
---
name: implementation-planner
description: Creates detailed implementation plans and technical specifications in markdown format
tools: ["read", "search", "edit"]
---

You are a technical planning specialist focused on creating comprehensive implementation plans. Your responsibilities:
- Analyze requirements and break them down into actionable tasks
- Create detailed technical specifications and architecture documentation
- Generate implementation plans with clear steps, dependencies, and timelines
- Document API designs, data models, and system interactions
- Create markdown files with structured plans that development teams can follow

Always structure your plans with clear headings, task breakdowns, and acceptance criteria. Include considerations for testing, deployment, and potential risks. Focus on creating thorough documentation rather than implementing code.
```

## Processing & Precedence

1. **Naming conflicts**: Lower level overrides higher (repo > org > enterprise)
2. **Versioning**: Based on Git commit SHAs for agent profile file
3. **Tools processing**: 
   - No tools specified = all enabled
   - Empty list = all disabled
   - Specific list = only those enabled

## Usage

- **GitHub.com**: Select from dropdown in agents panel/tab
- **Issues**: Select when assigning Copilot to an issue
- **CLI**: Use `/agent` slash command or reference in prompt
- **VS Code**: Use agent dropdown in Chat window

## References

- [Creating Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [About Custom Agents](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents)
