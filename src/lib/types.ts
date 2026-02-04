/**
 * Core type definitions for tool handlers
 */

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolError;
}

export interface ToolError {
  code: ErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
  retryAfter?: number;
  suggestedAction?: SuggestedAction;
}

export type ErrorCode =
  | "AUTH_INVALID"
  | "AUTH_INSUFFICIENT"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export type SuggestedAction =
  | "RETRY"
  | "RETRY_WITH_BACKOFF"
  | "USE_FALLBACK"
  | "SKIP"
  | "ABORT"
  | "ASK_USER";
