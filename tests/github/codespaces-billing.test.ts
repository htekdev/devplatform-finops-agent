import { fetchCodespacesBilling, analyzeCodespacesUsage } from '../../src/tools/github/codespaces-billing';
import { GitHubClient } from '../../src/clients/github-client';

jest.mock('../../src/clients/github-client');

describe('Codespaces Billing Tools', () => {
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    mockClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchCodespacesBilling', () => {
    it('should fetch Codespaces billing data successfully', async () => {
      const mockBilling = {
        total_hours_used: 100,
        total_paid_hours_used: 50,
        included_hours: 50,
      };

      const mockCodespaces = [
        {
          name: 'codespace-1',
          machine: '4-core',
          state: 'Available',
          last_used_at: '2024-01-01T00:00:00Z',
        },
        {
          name: 'codespace-2',
          machine: '2-core',
          state: 'Available',
          last_used_at: '2024-01-15T00:00:00Z',
        },
      ];

      mockClient.getCodespacesBilling.mockResolvedValue(mockBilling);
      mockClient.listCodespaces.mockResolvedValue(mockCodespaces);

      const result = await fetchCodespacesBilling(mockClient, 'test-org');

      expect(result).toHaveProperty('billing');
      expect(result.billing).toEqual(mockBilling);
      expect(result).toHaveProperty('codespaces');
      expect(result.codespaces).toEqual(mockCodespaces);
    });

    it('should identify idle Codespaces', async () => {
      const now = new Date();
      const eightDaysAgo = new Date(now);
      eightDaysAgo.setDate(now.getDate() - 8);

      const mockCodespaces = [
        {
          name: 'idle-codespace',
          machine: '2-core',
          state: 'Available',
          last_used_at: eightDaysAgo.toISOString(),
        },
        {
          name: 'active-codespace',
          machine: '2-core',
          state: 'Available',
          last_used_at: now.toISOString(),
        },
      ];

      mockClient.getCodespacesBilling.mockResolvedValue({
        total_hours_used: 100,
        total_paid_hours_used: 50,
        included_hours: 50,
      });
      mockClient.listCodespaces.mockResolvedValue(mockCodespaces);

      const result = await fetchCodespacesBilling(mockClient, 'test-org');
      const analysis = analyzeCodespacesUsage(result);

      expect(analysis.idle_codespaces).toHaveLength(1);
      expect(analysis.idle_codespaces[0].name).toBe('idle-codespace');
    });

    it('should handle orgs with no Codespaces', async () => {
      mockClient.getCodespacesBilling.mockResolvedValue({
        total_hours_used: 0,
        total_paid_hours_used: 0,
        included_hours: 60,
      });
      mockClient.listCodespaces.mockResolvedValue([]);

      const result = await fetchCodespacesBilling(mockClient, 'test-org');

      expect(result.billing.total_hours_used).toBe(0);
      expect(result.codespaces).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getCodespacesBilling.mockRejectedValue(new Error('API Error'));

      await expect(fetchCodespacesBilling(mockClient, 'test-org')).rejects.toThrow('API Error');
    });
  });

  describe('analyzeCodespacesUsage', () => {
    it('should calculate hours by machine type', () => {
      const data = {
        billing: {
          total_hours_used: 100,
          total_paid_hours_used: 50,
          included_hours: 50,
        },
        codespaces: [
          { name: 'cs1', machine: '2-core', state: 'Available', last_used_at: new Date().toISOString() },
          { name: 'cs2', machine: '4-core', state: 'Available', last_used_at: new Date().toISOString() },
          { name: 'cs3', machine: '2-core', state: 'Available', last_used_at: new Date().toISOString() },
        ],
      };

      const result = analyzeCodespacesUsage(data);

      expect(result).toHaveProperty('machine_type_breakdown');
      expect(result.machine_type_breakdown['2-core']).toBe(2);
      expect(result.machine_type_breakdown['4-core']).toBe(1);
    });

    it('should calculate potential savings from idle Codespaces', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const data = {
        billing: {
          total_hours_used: 200,
          total_paid_hours_used: 150,
          included_hours: 50,
        },
        codespaces: [
          { name: 'idle1', machine: '16-core', state: 'Available', last_used_at: eightDaysAgo.toISOString() },
          { name: 'idle2', machine: '8-core', state: 'Available', last_used_at: eightDaysAgo.toISOString() },
        ],
      };

      const result = analyzeCodespacesUsage(data);

      expect(result.idle_codespaces).toHaveLength(2);
      expect(result.potential_savings).toBeGreaterThan(0);
    });

    it('should identify premium machine overuse', () => {
      const data = {
        billing: {
          total_hours_used: 100,
          total_paid_hours_used: 80,
          included_hours: 20,
        },
        codespaces: [
          { name: 'premium1', machine: '16-core', state: 'Available', last_used_at: new Date().toISOString() },
          { name: 'premium2', machine: '16-core', state: 'Available', last_used_at: new Date().toISOString() },
          { name: 'standard', machine: '2-core', state: 'Available', last_used_at: new Date().toISOString() },
        ],
      };

      const result = analyzeCodespacesUsage(data);

      expect(result.recommendations).toContain(expect.stringContaining('premium'));
    });

    it('should handle empty Codespaces list', () => {
      const data = {
        billing: {
          total_hours_used: 0,
          total_paid_hours_used: 0,
          included_hours: 60,
        },
        codespaces: [],
      };

      const result = analyzeCodespacesUsage(data);

      expect(result.idle_codespaces).toEqual([]);
      expect(result.machine_type_breakdown).toEqual({});
    });
  });
});
