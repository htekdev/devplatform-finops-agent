/**
 * Unit tests for getLFSStorage tool
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLFSStorage } from "../../../dist/tools/github/lfs-storage.js";
import type { Octokit } from "@octokit/rest";

describe("getLFSStorage", () => {
  let mockOctokit: Partial<Octokit>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOctokit = {
      billing: {
        getSharedStorageBillingOrg: vi.fn(),
      } as any,
    };
  });

  it("returns success with LFS storage data when API call succeeds", async () => {
    const mockData = {
      days_left_in_billing_cycle: 20,
      estimated_paid_storage_for_month: 15,
      estimated_storage_for_month: 40,
    };

    vi.mocked(mockOctokit.billing!.getSharedStorageBillingOrg).mockResolvedValue({
      data: mockData,
    } as any);

    const result = await getLFSStorage(mockOctokit as Octokit, "test-org");

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      totalStorageGB: 40,
      paidStorageGB: 15,
      daysLeftInCycle: 20,
    });
  });

  it("returns zero storage when org has no LFS usage", async () => {
    const mockData = {
      days_left_in_billing_cycle: 30,
      estimated_paid_storage_for_month: 0,
      estimated_storage_for_month: 0,
    };

    vi.mocked(mockOctokit.billing!.getSharedStorageBillingOrg).mockResolvedValue({
      data: mockData,
    } as any);

    const result = await getLFSStorage(mockOctokit as Octokit, "no-lfs-org");

    expect(result.success).toBe(true);
    expect(result.data?.totalStorageGB).toBe(0);
  });

  it("returns error on API failure", async () => {
    const error = new Error("API Error");
    (error as any).status = 500;

    vi.mocked(mockOctokit.billing!.getSharedStorageBillingOrg).mockRejectedValue(error);

    const result = await getLFSStorage(mockOctokit as Octokit, "bad-org");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("API_ERROR");
    expect(result.error?.retryable).toBe(true);
  });
});
