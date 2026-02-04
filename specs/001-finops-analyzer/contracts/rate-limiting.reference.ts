/**
 * REFERENCE IMPLEMENTATION - Octokit Rate Limiting
 * 
 * This file documents the REQUIRED pattern for GitHub API rate limiting.
 * Generated from research on @octokit/plugin-throttling.
 * 
 * Sources:
 * - https://github.com/octokit/plugin-throttling.js
 * - https://github.com/octokit/rest.js/docs/throttling
 */

import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

// ============================================================================
// PATTERN 1: Create Throttled Octokit Instance
// ============================================================================

/**
 * REQUIRED: Use plugin pattern to add throttling to Octokit
 * This handles both primary rate limits (5000 req/hr) and secondary limits (abuse detection)
 */
const ThrottledOctokit = Octokit.plugin(throttling);

// ============================================================================
// PATTERN 2: Configure Rate Limit Handlers
// ============================================================================

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
      /**
       * onRateLimit: Called when primary rate limit (5000 req/hr) is hit
       * 
       * @param retryAfter - Seconds to wait before retry
       * @param options - Request options (method, url, etc.)
       * @param octokit - Octokit instance for logging
       * @param retryCount - Number of retries already attempted
       * @returns true to retry, false/undefined to fail
       */
      onRateLimit: (
        retryAfter: number,
        options: { method: string; url: string; request: { retryCount: number } },
        octokit: Octokit,
        retryCount: number
      ) => {
        if (logWarnings) {
          logger.warn(
            `Rate limit exhausted for ${options.method} ${options.url}`
          );
        }

        // Retry up to maxRetries times
        if (retryCount < maxRetries) {
          logger.info(`Retrying after ${retryAfter} seconds (attempt ${retryCount + 1}/${maxRetries})`);
          return true; // Returning true triggers automatic retry after retryAfter seconds
        }

        // Give up after max retries
        logger.warn(`Max retries (${maxRetries}) exceeded, giving up`);
        return false;
      },

      /**
       * onSecondaryRateLimit: Called when abuse detection triggers (too many concurrent requests)
       * 
       * This is different from primary rate limits - it means you're making requests too fast.
       * Usually should NOT retry automatically as it indicates a usage pattern problem.
       */
      onSecondaryRateLimit: (
        retryAfter: number,
        options: { method: string; url: string },
        octokit: Octokit
      ) => {
        logger.warn(
          `Secondary rate limit (abuse detection) for ${options.method} ${options.url}. ` +
          `Consider reducing request frequency.`
        );
        // DO NOT retry by default - this indicates a problem with request patterns
        return false;
      },
    },
  });
}

// ============================================================================
// PATTERN 3: Factory Function for FinOps Agent
// ============================================================================

/**
 * Creates a configured Octokit instance for the FinOps agent
 * with appropriate rate limiting for billing API calls
 */
export function createFinOpsOctokit(token: string): Octokit {
  return createThrottledOctokit(token, {
    maxRetries: 3, // Billing data is important, retry more
    logWarnings: true,
    logger: {
      warn: (msg) => console.warn(`[FinOps][GitHub] ${msg}`),
      info: (msg) => console.info(`[FinOps][GitHub] ${msg}`),
    },
  });
}

// ============================================================================
// PATTERN 4: Usage Example
// ============================================================================

async function exampleUsage() {
  const octokit = createFinOpsOctokit(process.env.GITHUB_TOKEN!);

  // These calls automatically handle rate limiting
  const billing = await octokit.billing.getGithubActionsBillingOrg({
    org: "my-org",
  });

  // If rate limited:
  // 1. onRateLimit is called
  // 2. If it returns true, waits retryAfter seconds
  // 3. Retries the request
  // 4. Repeats up to maxRetries times

  return billing.data;
}

// ============================================================================
// PATTERN 5: Disable Throttling (for testing)
// ============================================================================

/**
 * For unit tests, you may want to disable throttling entirely
 * to avoid delays and test rate limit handling separately
 */
export function createUnthrottledOctokit(token: string): Octokit {
  return new ThrottledOctokit({
    auth: token,
    throttle: {
      enabled: false, // Disables all throttling behavior
    },
  });
}

// ============================================================================
// DEPENDENCIES
// ============================================================================

/**
 * Required packages:
 * 
 * npm install @octokit/rest @octokit/plugin-throttling
 * 
 * package.json:
 * {
 *   "dependencies": {
 *     "@octokit/rest": "^21.x",
 *     "@octokit/plugin-throttling": "^9.x"
 *   }
 * }
 */

// ============================================================================
// ANTI-PATTERNS - DO NOT DO THESE
// ============================================================================

/**
 * ❌ WRONG: Using Octokit without throttling plugin
 */
// const octokit = new Octokit({ auth: token });
// ^ Will fail hard on rate limits with no retry

/**
 * ❌ WRONG: Manual rate limit handling
 */
// try {
//   await octokit.request(...)
// } catch (e) {
//   if (e.status === 403) {
//     await sleep(60000);
//     // retry...
//   }
// }
// ^ The plugin does this better, don't reinvent it

/**
 * ❌ WRONG: Always retrying on secondary rate limit
 */
// onSecondaryRateLimit: () => true
// ^ This means you're abusing the API, fix the root cause

/**
 * ❌ WRONG: Infinite retries
 */
// onRateLimit: () => true // Always retry
// ^ Can hang forever, always limit retries
