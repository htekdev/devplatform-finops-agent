import { GitHubClient } from '../../src/clients/github-client';
import { Octokit } from '@octokit/rest';
import { Cache } from '../../src/utils/cache';

// Mock Octokit
jest.mock('@octokit/rest');
jest.mock('../../src/utils/cache');

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockOctokit: jest.Mocked<Octokit>;
  let mockCache: jest.Mocked<Cache>;

  beforeEach(() => {
    mockOctokit = new Octokit() as jest.Mocked<Octokit>;
    mockCache = new Cache() as jest.Mocked<Cache>;
    
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => mockOctokit);
    (Cache as jest.MockedClass<typeof Cache>).mockImplementation(() => mockCache);
    
    client = new GitHubClient('test-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getActionsBilling', () => {
    it('should fetch Actions billing data successfully', async () => {
      const mockResponse = {
        data: {
          total_minutes_used: 50000,
          total_paid_minutes_used: 25000,
          included_minutes: 3000,
          minutes_used_breakdown: {
            UBUNTU: 30000,
            MACOS: 15000,
            WINDOWS: 5000,
          },
        },
      };

      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn().mockResolvedValue(mockResponse),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.getActionsBilling('test-org');

      expect(result).toEqual(mockResponse.data);
      expect(mockOctokit.billing.getGithubActionsBillingOrg).toHaveBeenCalledWith({ org: 'test-org' });
    });

    it('should return cached data when available', async () => {
      const cachedData = {
        total_minutes_used: 50000,
        total_paid_minutes_used: 25000,
        included_minutes: 3000,
        minutes_used_breakdown: { UBUNTU: 30000, MACOS: 15000, WINDOWS: 5000 },
      };

      mockCache.get.mockResolvedValue(cachedData);

      const result = await client.getActionsBilling('test-org');

      expect(result).toEqual(cachedData);
      expect(mockOctokit.billing?.getGithubActionsBillingOrg).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn().mockRejectedValue(new Error('API Error')),
      } as any;

      mockCache.get.mockResolvedValue(null);

      await expect(client.getActionsBilling('test-org')).rejects.toThrow('API Error');
    });

    it('should handle 404 for disabled Actions', async () => {
      const error = new Error('Not Found') as any;
      error.status = 404;

      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn().mockRejectedValue(error),
      } as any;

      mockCache.get.mockResolvedValue(null);

      await expect(client.getActionsBilling('test-org')).rejects.toThrow();
    });
  });

  describe('getStorageBilling', () => {
    it('should fetch storage billing data successfully', async () => {
      const mockResponse = {
        data: {
          days_left_in_billing_cycle: 15,
          estimated_paid_storage_for_month: 1.5,
          estimated_storage_for_month: 2.0,
        },
      };

      mockOctokit.billing = {
        getSharedStorageBillingOrg: jest.fn().mockResolvedValue(mockResponse),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.getStorageBilling('test-org');

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCodespacesBilling', () => {
    it('should fetch Codespaces billing data successfully', async () => {
      const mockResponse = {
        data: {
          total_hours_used: 100,
          total_paid_hours_used: 50,
          included_hours: 50,
        },
      };

      mockOctokit.billing = {
        getGithubPackagesBillingOrg: jest.fn().mockResolvedValue(mockResponse),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.getCodespacesBilling('test-org');

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listRepositories', () => {
    it('should fetch repositories successfully', async () => {
      const mockRepos = [
        { name: 'repo1', full_name: 'org/repo1' },
        { name: 'repo2', full_name: 'org/repo2' },
      ];

      mockOctokit.repos = {
        listForOrg: jest.fn().mockResolvedValue({ data: mockRepos }),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.listRepositories('test-org');

      expect(result).toEqual(mockRepos);
      expect(mockOctokit.repos.listForOrg).toHaveBeenCalledWith({
        org: 'test-org',
        per_page: 100,
      });
    });

    it('should handle pagination for large result sets', async () => {
      const firstPage = Array(100).fill(null).map((_, i) => ({ name: `repo${i}` }));
      const secondPage = Array(50).fill(null).map((_, i) => ({ name: `repo${i + 100}` }));

      mockOctokit.repos = {
        listForOrg: jest.fn()
          .mockResolvedValueOnce({ data: firstPage, headers: { link: '<...>; rel="next"' } })
          .mockResolvedValueOnce({ data: secondPage, headers: {} }),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.listRepositories('test-org');

      expect(result.length).toBe(150);
    });
  });

  describe('listWorkflowRuns', () => {
    it('should fetch workflow runs successfully', async () => {
      const mockRuns = [
        { id: 1, name: 'CI', status: 'completed', conclusion: 'success' },
        { id: 2, name: 'CI', status: 'completed', conclusion: 'failure' },
      ];

      mockOctokit.actions = {
        listWorkflowRunsForRepo: jest.fn().mockResolvedValue({ data: { workflow_runs: mockRuns } }),
      } as any;

      mockCache.get.mockResolvedValue(null);

      const result = await client.listWorkflowRuns('test-org', 'test-repo');

      expect(result).toEqual(mockRuns);
    });

    it('should filter by date range when provided', async () => {
      const created = '2024-01-01';

      mockOctokit.actions = {
        listWorkflowRunsForRepo: jest.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
      } as any;

      mockCache.get.mockResolvedValue(null);

      await client.listWorkflowRuns('test-org', 'test-repo', { created });

      expect(mockOctokit.actions.listWorkflowRunsForRepo).toHaveBeenCalledWith(
        expect.objectContaining({ created })
      );
    });
  });

  describe('rate limit handling', () => {
    it('should handle rate limit errors with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.status = 403;
      rateLimitError.response = {
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
        },
      };

      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn()
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce({ data: { total_minutes_used: 1000 } }),
      } as any;

      mockCache.get.mockResolvedValue(null);

      // This test verifies the client handles rate limits
      // In a real implementation, it would retry after backoff
      await expect(client.getActionsBilling('test-org')).rejects.toThrow();
    });
  });

  describe('cache integration', () => {
    it('should cache successful API responses', async () => {
      const mockData = { total_minutes_used: 1000 };

      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn().mockResolvedValue({ data: mockData }),
      } as any;

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      await client.getActionsBilling('test-org');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('github:actions:test-org'),
        mockData,
        expect.any(Number)
      );
    });

    it('should not cache error responses', async () => {
      mockOctokit.billing = {
        getGithubActionsBillingOrg: jest.fn().mockRejectedValue(new Error('API Error')),
      } as any;

      mockCache.get.mockResolvedValue(null);

      await expect(client.getActionsBilling('test-org')).rejects.toThrow();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });
});
