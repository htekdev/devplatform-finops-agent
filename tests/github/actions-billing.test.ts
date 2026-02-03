import { fetchActionsBilling, analyzeWorkflowEfficiency } from '../../src/tools/github/actions-billing';
import { GitHubClient } from '../../src/clients/github-client';

jest.mock('../../src/clients/github-client');

describe('Actions Billing Tools', () => {
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    mockClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchActionsBilling', () => {
    it('should fetch and analyze Actions billing data', async () => {
      const mockBilling = {
        total_minutes_used: 50000,
        total_paid_minutes_used: 25000,
        included_minutes: 3000,
        minutes_used_breakdown: {
          UBUNTU: 30000,
          MACOS: 15000,
          WINDOWS: 5000,
        },
      };

      const mockRepos = [{ name: 'repo1', full_name: 'org/repo1' }];

      const mockWorkflowRuns = [
        {
          id: 1,
          name: 'CI',
          status: 'completed',
          conclusion: 'success',
          run_started_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:10:00Z',
        },
        {
          id: 2,
          name: 'CI',
          status: 'completed',
          conclusion: 'failure',
          run_started_at: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:15:00Z',
        },
      ];

      mockClient.getActionsBilling.mockResolvedValue(mockBilling);
      mockClient.listRepositories.mockResolvedValue(mockRepos);
      mockClient.listWorkflowRuns.mockResolvedValue(mockWorkflowRuns);

      const result = await fetchActionsBilling(mockClient, 'test-org');

      expect(result).toHaveProperty('billing');
      expect(result.billing).toEqual(mockBilling);
      expect(result).toHaveProperty('workflows');
      expect(mockClient.getActionsBilling).toHaveBeenCalledWith('test-org');
      expect(mockClient.listRepositories).toHaveBeenCalledWith('test-org');
    });

    it('should calculate minutes by OS type', async () => {
      const mockBilling = {
        total_minutes_used: 50000,
        total_paid_minutes_used: 25000,
        included_minutes: 3000,
        minutes_used_breakdown: {
          UBUNTU: 30000,
          MACOS: 15000,
          WINDOWS: 5000,
        },
      };

      mockClient.getActionsBilling.mockResolvedValue(mockBilling);
      mockClient.listRepositories.mockResolvedValue([]);

      const result = await fetchActionsBilling(mockClient, 'test-org');

      expect(result.billing.minutes_used_breakdown).toEqual({
        UBUNTU: 30000,
        MACOS: 15000,
        WINDOWS: 5000,
      });
    });

    it('should handle empty organization gracefully', async () => {
      mockClient.getActionsBilling.mockResolvedValue({
        total_minutes_used: 0,
        total_paid_minutes_used: 0,
        included_minutes: 3000,
        minutes_used_breakdown: {},
      });
      mockClient.listRepositories.mockResolvedValue([]);

      const result = await fetchActionsBilling(mockClient, 'empty-org');

      expect(result.billing.total_minutes_used).toBe(0);
      expect(result.workflows).toEqual([]);
    });

    it('should identify top 10 workflows by minutes', async () => {
      const mockBilling = {
        total_minutes_used: 1000,
        total_paid_minutes_used: 500,
        included_minutes: 3000,
        minutes_used_breakdown: { UBUNTU: 1000 },
      };

      const mockRepos = [{ name: 'repo1', full_name: 'org/repo1' }];

      const mockWorkflowRuns = Array(15).fill(null).map((_, i) => ({
        id: i,
        name: `Workflow ${i}`,
        status: 'completed',
        conclusion: 'success',
        run_started_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: `2024-01-01T00:${10 + i}:00Z`,
      }));

      mockClient.getActionsBilling.mockResolvedValue(mockBilling);
      mockClient.listRepositories.mockResolvedValue(mockRepos);
      mockClient.listWorkflowRuns.mockResolvedValue(mockWorkflowRuns);

      const result = await fetchActionsBilling(mockClient, 'test-org');

      expect(result.workflows.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analyzeWorkflowEfficiency', () => {
    it('should calculate failure rate for workflows', () => {
      const workflows = [
        { name: 'CI', conclusion: 'success', duration_minutes: 10 },
        { name: 'CI', conclusion: 'success', duration_minutes: 12 },
        { name: 'CI', conclusion: 'failure', duration_minutes: 15 },
        { name: 'CI', conclusion: 'failure', duration_minutes: 8 },
      ];

      const result = analyzeWorkflowEfficiency(workflows as any);

      expect(result).toHaveProperty('CI');
      expect(result.CI.failure_rate).toBe(0.5); // 2 failures out of 4 runs
      expect(result.CI.total_runs).toBe(4);
    });

    it('should calculate average duration for workflows', () => {
      const workflows = [
        { name: 'Build', conclusion: 'success', duration_minutes: 10 },
        { name: 'Build', conclusion: 'success', duration_minutes: 20 },
      ];

      const result = analyzeWorkflowEfficiency(workflows as any);

      expect(result.Build.avg_duration_minutes).toBe(15); // (10 + 20) / 2
    });

    it('should handle workflows with no failures', () => {
      const workflows = [
        { name: 'Deploy', conclusion: 'success', duration_minutes: 5 },
        { name: 'Deploy', conclusion: 'success', duration_minutes: 5 },
      ];

      const result = analyzeWorkflowEfficiency(workflows as any);

      expect(result.Deploy.failure_rate).toBe(0);
    });

    it('should handle empty workflow list', () => {
      const result = analyzeWorkflowEfficiency([]);

      expect(result).toEqual({});
    });
  });
});
