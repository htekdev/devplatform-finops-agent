/**
 * Octokit Factory with Rate Limiting
 * 
 * Creates GitHub API clients with automatic rate limit handling.
 * Uses @octokit/plugin-throttling for intelligent retry behavior.
 * 
 * Reference: specs/001-finops-analyzer/contracts/rate-limiting.reference.ts
 */

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const ThrottledOctokit = Octokit.plugin(throttling);

export interface RateLimitConfig {
  /** Max retries on rate limit (default: 2) */
  maxRetries?: number;
  /** Whether to log warnings (default: true) */
  logWarnings?: boolean;
  /** Custom logger (default: console) */
  logger?: {
    warn: (message: string) => void;
    info: (message: string) => void;
  };
}

export function createThrottledOctokit(
  token: string,
  config: RateLimitConfig = {}
): Octokit {
  const {
    maxRetries = 2,
    logWarnings = true,
    logger = console,
  } = config;

  return new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, options, _octokit, retryCount) => {
        if (logWarnings) {
          logger.warn(
            `Rate limit exhausted for ${options.method} ${options.url}`
          );
        }

        if (retryCount < maxRetries) {
          logger.info(`Retrying after ${retryAfter} seconds (attempt ${retryCount + 1}/${maxRetries})`);
          return true;
        }

        logger.warn(`Max retries (${maxRetries}) exceeded, giving up`);
        return false;
      },

      onSecondaryRateLimit: (_retryAfter, options, _octokit) => {
        logger.warn(
          `Secondary rate limit (abuse detection) for ${options.method} ${options.url}. ` +
          `Consider reducing request frequency.`
        );
        return false;
      },
    },
  });
}

/**
 * Creates a configured Octokit instance for the FinOps agent
 */
export function createFinOpsOctokit(token: string): Octokit {
  return createThrottledOctokit(token, {
    maxRetries: 3,
    logWarnings: true,
    logger: {
      warn: (msg) => console.warn(`[FinOps][GitHub] ${msg}`),
      info: (msg) => console.info(`[FinOps][GitHub] ${msg}`),
    },
  });
}

/**
 * For unit tests - disables throttling to avoid delays
 */
export function createUnthrottledOctokit(token: string): Octokit {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      enabled: false,
    },
  });
}
