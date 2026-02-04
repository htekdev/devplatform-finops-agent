/**
 * Unit tests for getGitHubActionsBilling tool
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGitHubActionsBilling } from "../../../src/tools/github/actions-billing.js";
import type { Octokit } from "@octokit/rest";

describe("getGitHubActionsBilling", () => {
  let mockOctokit: Partial<Octokit>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOctokit = {
      billing: {
        getGithubActionsBillingOrg: vi.fn(),
      } as any,
    };
  });

  it("returns success with billing data when API call succeeds", async () => {
    const mockData = {
      total_minutes_used: 1500,
      total_paid_minutes_used: 0,
      included_minutes: 3000,
      minutes_used_breakdown: {
        UBUNTU: 1200,
        WINDOWS: 200,
        MACOS: 100,
      },
    };

    vi.mocked(mockOctokit.billing!.getGithubActionsBillingOrg).mockResolvedValue({
      data: mockData,
    } as any);

    const result = await getGitHubActionsBilling(mockOctokit as Octokit, "test-org");

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      totalMinutesUsed: 1500,
      includedMinutes: 3000,
      minutesUsedBreakdown: {
        UBUNTU: 1200,
        WINDOWS: 200,
        MACOS: 100,
      },
    });
  });

  it("returns zero usage when org has no Actions history", async () => {
    const mockData = {
      total_minutes_used: 0,
      total_paid_minutes_used: 0,
      included_minutes: 0,
      minutes_used_breakdown: {},
    };

    vi.mocked(mockOctokit.billing!.getGithubActionsBillingOrg).mockResolvedValue({
      data: mockData,
    } as any);

    const result = await getGitHubActionsBilling(mockOctokit as Octokit, "empty-org");

    expect(result.success).toBe(true);
    expect(result.data?.totalMinutesUsed).toBe(0);
    expect(result.data?.minutesUsedBreakdown).toEqual({});
  });

  it("returns error with AUTH_INSUFFICIENT code on 403 forbidden", async () => {
    const error = new Error("Resource not accessible by integration");
    (error as any).status = 403;

    vi.mocked(mockOctokit.billing!.getGithubActionsBillingOrg).mockRejectedValue(error);

    const result = await getGitHubActionsBilling(mockOctokit as Octokit, "no-access-org");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTH_INSUFFICIENT");
    expect(result.error?.message).toContain("Permission denied");
  });

  it("returns error with NOT_FOUND code on 404", async () => {
    const error = new Error("Not Found");
    (error as any).status = 404;

    vi.mocked(mockOctokit.billing!.getGithubActionsBillingOrg).mockRejectedValue(error);

    const result = await getGitHubActionsBilling(mockOctokit as Octokit, "nonexistent-org");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
    expect(result.error?.suggestedAction).toBe("SKIP");
  });

  it("returns error with RATE_LIMITED code on 429", async () => {
    const error = new Error("Rate limit exceeded");
    (error as any).status = 429;

    vi.mocked(mockOctokit.billing!.getGithubActionsBillingOrg).mockRejectedValue(error);

    const result = await getGitHubActionsBilling(mockOctokit as Octokit, "rate-limited-org");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("RATE_LIMITED");
    expect(result.error?.retryable).toBe(true);
    expect(result.error?.suggestedAction).toBe("RETRY_WITH_BACKOFF");
  });
});
