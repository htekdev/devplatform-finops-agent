export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
};

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delayMs = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = opts.retryableErrors.some(
        (code) =>
          error instanceof Error &&
          ('code' in error ? (error as any).code === code : error.message.includes(code))
      );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === opts.maxAttempts || !isRetryable) {
        throw error;
      }

      // Wait before retrying
      await sleep(delayMs);

      // Exponential backoff
      delayMs = Math.min(delayMs * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryableError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'RetryableError';
  }
}
