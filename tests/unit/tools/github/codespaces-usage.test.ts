/**
 * Unit tests for getCodespacesUsage tool
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getCodespacesUsage } from "../../../dist/tools/github/codespaces-usage.js";
import type { Octokit } from "@octokit/rest";

describe("getCodespacesUsage", () => {
  let mockOctokit: Partial<Octokit>;

  beforeEach(() => {
    mockOctokit = {};
  });

  it("returns success with zero codespaces usage (placeholder implementation)", async () => {
    const result = await getCodespacesUsage(mockOctokit as Octokit, "test-org");

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      totalHours: 0,
    });
  });

  it("returns zero usage for any org (placeholder)", async () => {
    const result = await getCodespacesUsage(mockOctokit as Octokit, "any-org");

    expect(result.success).toBe(true);
    expect(result.data?.totalHours).toBe(0);
  });
});
