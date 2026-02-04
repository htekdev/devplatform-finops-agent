/**
 * Error Handling for LLM Tools
 * 
 * This module implements structured error handling for tool handlers.
 * Tools are called by an LLM, so errors must be returned (not thrown)
 * as structured objects that the LLM can interpret.
 * 
 * Reference: specs/001-finops-analyzer/contracts/error-handling.reference.ts
 */

/**
 * ALL tool handlers MUST return this structure.
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
        retryAfter: 60,
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
