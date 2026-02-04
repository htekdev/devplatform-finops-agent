import type { ToolResult, ToolError, ErrorCode, SuggestedAction } from "./types.js";

export function toToolError(error: unknown, context: string): ToolError {
  if (error instanceof Error) {
    const err = error as Error & {
      status?: number;
      statusCode?: number;
      code?: string;
      response?: { status: number; data?: unknown };
    };

    const statusCode = err.status || err.statusCode || err.response?.status;

    if (statusCode === 401) {
      return {
        code: "AUTH_INVALID",
        message: `Authentication failed for ${context}: Invalid or expired credentials`,
        details: err.message,
        retryable: false,
        suggestedAction: "ABORT",
      };
    }

    if (statusCode === 403) {
      return {
        code: "AUTH_INSUFFICIENT",
        message: `Permission denied for ${context}: Check PAT scopes`,
        details: err.message,
        retryable: false,
        suggestedAction: "ABORT",
      };
    }

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

    if (statusCode === 404) {
      return {
        code: "NOT_FOUND",
        message: `Resource not found for ${context}`,
        details: err.message,
        retryable: false,
        suggestedAction: "SKIP",
      };
    }

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

    return {
      code: "INTERNAL_ERROR",
      message: `Unexpected error for ${context}: ${err.message}`,
      details: err.stack,
      retryable: false,
      suggestedAction: "SKIP",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: `Unknown error for ${context}: ${String(error)}`,
    retryable: false,
    suggestedAction: "SKIP",
  };
}

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
