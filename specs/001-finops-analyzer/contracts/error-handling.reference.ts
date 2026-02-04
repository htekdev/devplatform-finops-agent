/**
 * REFERENCE IMPLEMENTATION - Error Handling for LLM Tools
 * 
 * This file documents the REQUIRED error handling pattern.
 * 
 * KEY INSIGHT: Tools are called by an LLM, not a human.
 * The LLM needs to SEE errors to decide what to do next.
 * Therefore: NEVER throw exceptions from tool handlers.
 * Instead: Return structured error objects.
 */

// ============================================================================
// PATTERN 1: Tool Result Structure
// ============================================================================

/**
 * ALL tool handlers MUST return this structure.
 * This is non-negotiable for LLM orchestration.
 */
export interface ToolResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  
  /** Data returned on success */
  data?: T;
  
  /** Error details on failure - REQUIRED when success=false */
  error?: ToolError;
}

/**
 * Structured error information the LLM can interpret
 */
export interface ToolError {
  /** Error category for LLM decision-making */
  code: ErrorCode;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional context (stack trace, API response, etc.) */
  details?: string;
  
  /** Whether retrying might succeed */
  retryable: boolean;
  
  /** Suggested wait time before retry (seconds) */
  retryAfter?: number;
  
  /** What the LLM should do next */
  suggestedAction?: SuggestedAction;
}

/**
 * Error codes the LLM can use for decision-making
 */
export type ErrorCode =
  | "AUTH_INVALID"       // Credentials are wrong/expired
  | "AUTH_INSUFFICIENT"  // Missing required permissions/scopes
  | "RATE_LIMITED"       // Hit API rate limit
  | "NOT_FOUND"          // Resource doesn't exist
  | "VALIDATION_ERROR"   // Bad input parameters
  | "API_ERROR"          // API returned unexpected error
  | "NETWORK_ERROR"      // Connection failed
  | "TIMEOUT"            // Request timed out
  | "INTERNAL_ERROR";    // Bug in our code

/**
 * What the LLM should do when encountering this error
 */
export type SuggestedAction =
  | "RETRY"              // Try the same request again
  | "RETRY_WITH_BACKOFF" // Wait and retry
  | "USE_FALLBACK"       // Try alternative approach
  | "SKIP"               // Skip this operation, continue with others
  | "ABORT"              // Stop the entire analysis
  | "ASK_USER";          // Need human intervention

// ============================================================================
// PATTERN 2: Error Handler Utility
// ============================================================================

/**
 * Map common errors to structured ToolError
 */
export function toToolError(error: unknown, context: string): ToolError {
  // Handle known error types
  if (error instanceof Error) {
    const err = error as Error & { 
      status?: number;
      statusCode?: number; 
      code?: string;
      response?: { status: number; data?: unknown };
    };
    
    const statusCode = err.status || err.statusCode || err.response?.status;
    
    // Authentication errors
    if (statusCode === 401) {
      return {
        code: "AUTH_INVALID",
        message: `Authentication failed for ${context}: Invalid or expired credentials`,
        details: err.message,
        retryable: false,
        suggestedAction: "ABORT",
      };
    }
    
    // Permission errors
    if (statusCode === 403) {
      return {
        code: "AUTH_INSUFFICIENT",
        message: `Permission denied for ${context}: Check PAT scopes`,
        details: err.message,
        retryable: false,
        suggestedAction: "ABORT",
      };
    }
    
    // Rate limiting
    if (statusCode === 429) {
      return {
        code: "RATE_LIMITED",
        message: `Rate limit hit for ${context}`,
        details: err.message,
        retryable: true,
        retryAfter: 60, // Default 1 minute
        suggestedAction: "RETRY_WITH_BACKOFF",
      };
    }
    
    // Not found
    if (statusCode === 404) {
      return {
        code: "NOT_FOUND",
        message: `Resource not found for ${context}`,
        details: err.message,
        retryable: false,
        suggestedAction: "SKIP",
      };
    }
    
    // Server errors
    if (statusCode && statusCode >= 500) {
      return {
        code: "API_ERROR",
        message: `Server error for ${context}: ${err.message}`,
        details: err.message,
        retryable: true,
        retryAfter: 5,
        suggestedAction: "RETRY",
      };
    }
    
    // Network errors
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
      return {
        code: "NETWORK_ERROR",
        message: `Network error for ${context}: ${err.message}`,
        details: err.message,
        retryable: true,
        retryAfter: 10,
        suggestedAction: "RETRY_WITH_BACKOFF",
      };
    }
    
    // Timeout
    if (err.code === "ETIMEDOUT" || err.message.toLowerCase().includes("timeout")) {
      return {
        code: "TIMEOUT",
        message: `Request timed out for ${context}`,
        details: err.message,
        retryable: true,
        retryAfter: 5,
        suggestedAction: "RETRY",
      };
    }
    
    // Generic error
    return {
      code: "INTERNAL_ERROR",
      message: `Unexpected error for ${context}: ${err.message}`,
      details: err.stack,
      retryable: false,
      suggestedAction: "SKIP",
    };
  }
  
  // Unknown error type
  return {
    code: "INTERNAL_ERROR",
    message: `Unknown error for ${context}: ${String(error)}`,
    retryable: false,
    suggestedAction: "SKIP",
  };
}

// ============================================================================
// PATTERN 3: Tool Handler Wrapper
// ============================================================================

/**
 * Wrap async operations to always return ToolResult
 * 
 * Usage:
 *   return await wrapToolHandler(
 *     async () => {
 *       const data = await fetchSomething();
 *       return data;
 *     },
 *     "fetch billing data"
 *   );
 */
export async function wrapToolHandler<T>(
  operation: () => Promise<T>,
  context: string
): Promise<ToolResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: toToolError(error, context),
    };
  }
}

// ============================================================================
// PATTERN 4: Example Tool Handler
// ============================================================================

/**
 * Example: GitHub Actions Billing Tool
 * 
 * CORRECT: Returns ToolResult, never throws
 */
export async function getGitHubActionsBillingTool(
  octokit: any, // Octokit instance
  org: string
): Promise<ToolResult<{ totalMinutes: number; breakdown: Record<string, number> }>> {
  return wrapToolHandler(
    async () => {
      const { data } = await octokit.billing.getGithubActionsBillingOrg({ org });
      return {
        totalMinutes: data.total_minutes_used,
        breakdown: data.minutes_used_breakdown,
      };
    },
    `get GitHub Actions billing for ${org}`
  );
}

/**
 * Example: Handling partial failures
 * 
 * When analyzing multiple resources, some may fail while others succeed.
 * Return partial results with errors noted.
 */
export async function analyzeMultipleOrgs(
  orgs: string[]
): Promise<ToolResult<{
  results: Array<{ org: string; data?: unknown; error?: ToolError }>;
  summary: { succeeded: number; failed: number };
}>> {
  const results: Array<{ org: string; data?: unknown; error?: ToolError }> = [];
  
  for (const org of orgs) {
    const result = await wrapToolHandler(
      async () => ({ /* fetch data */ }),
      `analyze ${org}`
    );
    
    if (result.success) {
      results.push({ org, data: result.data });
    } else {
      results.push({ org, error: result.error });
    }
  }
  
  const succeeded = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  // Return success with partial results
  return {
    success: true,
    data: {
      results,
      summary: { succeeded, failed },
    },
  };
}

// ============================================================================
// ANTI-PATTERNS - DO NOT DO THESE
// ============================================================================

/**
 * ❌ WRONG: Throwing exceptions from tool handlers
 */
async function badToolHandler(org: string) {
  const response = await fetch(`/api/${org}`);
  if (!response.ok) {
    throw new Error("API failed"); // ❌ LLM can't catch this!
  }
  return response.json();
}

/**
 * ❌ WRONG: Returning unstructured errors
 */
async function anotherBadToolHandler(org: string): Promise<any> {
  try {
    return await fetch(`/api/${org}`);
  } catch (e) {
    return { error: "something went wrong" }; // ❌ No code, no action, not useful
  }
}

/**
 * ❌ WRONG: Swallowing errors silently
 */
async function silentBadToolHandler(org: string): Promise<any> {
  try {
    return await fetch(`/api/${org}`);
  } catch {
    return null; // ❌ LLM doesn't know something failed
  }
}

/**
 * ❌ WRONG: Returning success:true with error data
 */
async function confusingToolHandler(org: string): Promise<ToolResult<any>> {
  try {
    return { success: true, data: await fetch(`/api/${org}`) };
  } catch (e) {
    return { success: true, data: null }; // ❌ success should be false!
  }
}

// ============================================================================
// LLM PROMPT GUIDANCE
// ============================================================================

/**
 * When writing system messages for agents, include guidance on error handling:
 * 
 * ```
 * ## Error Handling
 * 
 * Tools return { success, data, error } objects.
 * 
 * When a tool returns success: false:
 * 1. Check error.code to understand what went wrong
 * 2. Check error.retryable to know if retry might help
 * 3. Check error.suggestedAction for recommended next step
 * 4. If RETRY_WITH_BACKOFF, wait error.retryAfter seconds
 * 5. If SKIP, continue with other tools/resources
 * 6. If ABORT, stop analysis and report the error
 * 
 * For partial failures (some resources succeeded, some failed):
 * - Include successful results in the report
 * - Note which resources failed and why
 * - Do not fail the entire analysis due to one resource
 * ```
 */
