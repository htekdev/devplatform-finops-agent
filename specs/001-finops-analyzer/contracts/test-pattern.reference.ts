/**
 * REFERENCE TEST - Follow this pattern for all tests
 * 
 * This file demonstrates the REQUIRED testing style for this project.
 * Copy this structure when writing new tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// GOOD TEST PATTERNS
// ============================================================================

describe("ToolName", () => {
  // Setup/teardown for each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // PATTERN 1: Test describes BEHAVIOR, not implementation
  // -------------------------------------------------------------------------
  
  // ✅ GOOD: Describes what the user/system experiences
  it("returns billing breakdown by runner type when org has Actions usage", async () => {
    // Arrange - setup mock data
    const mockBilling = {
      total_minutes_used: 1000,
      minutes_used_breakdown: { UBUNTU: 800, MACOS: 200 },
    };
    vi.mocked(octokit.billing.getGithubActionsBillingOrg).mockResolvedValue({
      data: mockBilling,
    });

    // Act - call the thing
    const result = await getGitHubActionsBilling(octokit, "test-org");

    // Assert - verify behavior
    expect(result.totalMinutesUsed).toBe(1000);
    expect(result.minutesUsedBreakdown.UBUNTU).toBe(800);
  });

  // ❌ BAD: Tests implementation details
  // it("calls octokit.billing.getGithubActionsBillingOrg with correct params")
  // ^ This tests HOW, not WHAT. If we refactor, test breaks for no reason.

  // -------------------------------------------------------------------------
  // PATTERN 2: Test edge cases explicitly
  // -------------------------------------------------------------------------

  it("returns zero usage when org has no Actions history", async () => {
    vi.mocked(octokit.billing.getGithubActionsBillingOrg).mockResolvedValue({
      data: { total_minutes_used: 0, minutes_used_breakdown: {} },
    });

    const result = await getGitHubActionsBilling(octokit, "empty-org");

    expect(result.totalMinutesUsed).toBe(0);
    expect(result.minutesUsedBreakdown).toEqual({});
  });

  it("throws descriptive error when API returns 403 forbidden", async () => {
    vi.mocked(octokit.billing.getGithubActionsBillingOrg).mockRejectedValue(
      new Error("Resource not accessible by integration")
    );

    await expect(getGitHubActionsBilling(octokit, "no-access-org")).rejects.toThrow(
      /not accessible/
    );
  });

  // -------------------------------------------------------------------------
  // PATTERN 3: Test tool handler returns structured results
  // -------------------------------------------------------------------------

  it("returns success:true with data on successful API call", async () => {
    const handler = createToolHandler(octokit);
    
    const result = await handler({ org: "test-org" });

    expect(result).toMatchObject({
      success: true,
      data: expect.any(Object),
    });
  });

  it("returns success:false with error message on failure (does not throw)", async () => {
    vi.mocked(octokit.billing.getGithubActionsBillingOrg).mockRejectedValue(
      new Error("API Error")
    );
    const handler = createToolHandler(octokit);

    const result = await handler({ org: "bad-org" });

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("API Error"),
    });
    // Note: Handler catches and returns error, does NOT throw
  });
});

// ============================================================================
// INTEGRATION TEST PATTERN (for agent orchestration)
// ============================================================================

describe("FinOpsAgent Integration", () => {
  it("creates session with tools and sends prompt to LLM", async () => {
    // Mock the CopilotClient
    const mockSession = {
      on: vi.fn(),
      sendAndWait: vi.fn().mockResolvedValue({
        data: { content: "Analysis complete" },
      }),
      destroy: vi.fn(),
    };
    const mockClient = {
      start: vi.fn(),
      stop: vi.fn(),
      createSession: vi.fn().mockResolvedValue(mockSession),
    };

    const agent = new FinOpsAgent(mockClient as any);
    await agent.analyze({ org: "test-org", days: 30 });

    // Verify session was created with tools
    expect(mockClient.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "get_github_actions_billing" }),
        ]),
      })
    );

    // Verify prompt was sent (LLM orchestrates from here)
    expect(mockSession.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("test-org"),
      }),
      expect.any(Number)
    );

    // Verify cleanup
    expect(mockSession.destroy).toHaveBeenCalled();
  });
});

// ============================================================================
// ANTI-PATTERNS - DO NOT DO THESE
// ============================================================================

/**
 * ❌ BAD: Testing implementation details
 */
// it("calls fetch with correct headers", ...)
// ^ Who cares? Test the RESULT, not the HTTP call.

/**
 * ❌ BAD: Tests that pass when code is broken
 */
// it("returns something", () => {
//   const result = doThing();
//   expect(result).toBeDefined();  // Too weak! Doesn't verify correctness
// });

/**
 * ❌ BAD: Tests that are flaky (depend on timing, external services, etc.)
 */
// it("fetches from real GitHub API", ...)
// ^ Use mocks! Real APIs are slow, rate-limited, and can fail.

/**
 * ❌ BAD: Giant tests that test everything at once
 */
// it("does the whole workflow", () => { /* 200 lines of code */ });
// ^ Break into focused tests. Each test = one behavior.

// Placeholder types for example
declare const octokit: any;
declare function getGitHubActionsBilling(client: any, org: string): Promise<any>;
declare function createToolHandler(client: any): (params: any) => Promise<any>;
declare class FinOpsAgent {
  constructor(client: any);
  analyze(ctx: any): Promise<void>;
}
