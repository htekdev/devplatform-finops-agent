import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const ThrottledOctokit = Octokit.plugin(throttling);

export interface OctokitFactoryOptions {
  auth?: string;
  onRateLimit?: (retryAfter: number, options: any) => boolean;
  onSecondaryRateLimit?: (retryAfter: number, options: any) => boolean;
}

export function createFinOpsOctokit(options: OctokitFactoryOptions = {}): Octokit {
  const {
    auth,
    onRateLimit,
    onSecondaryRateLimit,
  } = options;

  return new ThrottledOctokit({
    auth,
    throttle: {
      onRateLimit: onRateLimit || ((_retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
          `Rate limit hit for ${options.method} ${options.url}, retry ${retryCount + 1}/3`
        );
        if (retryCount < 2) {
          return true;
        }
        return false;
      }),
      onSecondaryRateLimit: onSecondaryRateLimit || ((_retryAfter, options, octokit) => {
        octokit.log.warn(
          `Secondary rate limit hit for ${options.method} ${options.url} - not retrying`
        );
        return false;
      }),
    },
  });
}
