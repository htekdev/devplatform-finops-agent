import { fetchAgentPoolMetrics, fetchAllAgentPoolMetrics, analyzeAgentPoolHealth } from '../../src/tools/azdo/agent-pools';
import { AzureDevOpsClient } from '../../src/clients/azdo-client';

// Mock the client
jest.mock('../../src/clients/azdo-client');

describe('Agent Pool Metrics Fetcher', () => {
  let mockClient: jest.Mocked<AzureDevOpsClient>;

  beforeEach(() => {
    mockClient = new AzureDevOpsClient({
      pat: 'test-pat',
      organization: 'test-org',
    }) as jest.Mocked<AzureDevOpsClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchAgentPoolMetrics', () => {
    it('should fetch agent metrics for a pool', async () => {
      const mockAgents = [
        {
          id: 1,
          name: 'Agent-1',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: true,
          status: 'online',
          statusChangedOn: '2024-01-15T10:00:00Z',
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
        {
          id: 2,
          name: 'Agent-2',
          version: '2.211.0',
          osDescription: 'Windows',
          enabled: true,
          status: 'offline',
          statusChangedOn: '2024-01-01T10:00:00Z', // Long offline
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
        {
          id: 3,
          name: 'Agent-3',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: false,
          status: 'offline',
          statusChangedOn: '2024-01-14T10:00:00Z',
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
      ];

      mockClient.getAgentsInPool.mockResolvedValue(mockAgents as any);

      const result = await fetchAgentPoolMetrics(mockClient, 'test-org', 1, 'Default');

      expect(result.poolId).toBe(1);
      expect(result.poolName).toBe('Default');
      expect(result.totalAgents).toBe(3);
      expect(result.onlineAgents).toBe(1);
      expect(result.offlineAgents).toBe(2);
      expect(result.enabledAgents).toBe(2);
      expect(result.disabledAgents).toBe(1);
    });

    it('should identify long offline agents', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

      const mockAgents = [
        {
          id: 1,
          name: 'Long-Offline',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: true,
          status: 'offline',
          statusChangedOn: tenDaysAgo,
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
        {
          id: 2,
          name: 'Recently-Offline',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: true,
          status: 'offline',
          statusChangedOn: yesterday,
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
      ];

      mockClient.getAgentsInPool.mockResolvedValue(mockAgents as any);

      const result = await fetchAgentPoolMetrics(mockClient, 'test-org', 1, 'Default');

      expect(result.longOfflineAgents).toHaveLength(1);
      expect(result.longOfflineAgents[0].agentName).toBe('Long-Offline');
      expect(result.longOfflineAgents[0].offlineDays).toBeGreaterThan(7);
    });

    it('should handle empty pools', async () => {
      mockClient.getAgentsInPool.mockResolvedValue([]);

      const result = await fetchAgentPoolMetrics(mockClient, 'test-org', 1, 'Empty Pool');

      expect(result.totalAgents).toBe(0);
      expect(result.onlineAgents).toBe(0);
      expect(result.offlineAgents).toBe(0);
      expect(result.longOfflineAgents).toHaveLength(0);
    });

    it('should throw error if getAgentsInPool fails', async () => {
      mockClient.getAgentsInPool.mockRejectedValue(new Error('API Error'));

      await expect(
        fetchAgentPoolMetrics(mockClient, 'test-org', 1, 'Pool')
      ).rejects.toThrow(/Failed to fetch agent pool metrics/);
    });
  });

  describe('fetchAllAgentPoolMetrics', () => {
    it('should fetch metrics for all pools', async () => {
      const mockPools = [
        { id: 1, name: 'Pool 1', isHosted: false, poolType: 'automation', size: 5 },
        { id: 2, name: 'Pool 2', isHosted: true, poolType: 'automation', size: 10 },
      ];

      const mockAgentsPool1 = [
        {
          id: 1,
          name: 'Agent-1',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: true,
          status: 'online',
          statusChangedOn: '2024-01-15T10:00:00Z',
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
      ];

      const mockAgentsPool2 = [
        {
          id: 2,
          name: 'Agent-2',
          version: '2.211.0',
          osDescription: 'Windows',
          enabled: true,
          status: 'offline',
          statusChangedOn: '2024-01-01T10:00:00Z',
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
      ];

      mockClient.getAgentPools.mockResolvedValue(mockPools as any);
      mockClient.getAgentsInPool
        .mockResolvedValueOnce(mockAgentsPool1 as any)
        .mockResolvedValueOnce(mockAgentsPool2 as any);

      const result = await fetchAllAgentPoolMetrics(mockClient, 'test-org');

      expect(result.organization).toBe('test-org');
      expect(result.pools).toHaveLength(2);
      expect(result.totalAgents).toBe(2);
      expect(result.onlineAgents).toBe(1);
      expect(result.offlineAgents).toBe(1);
    });

    it('should continue if one pool fails', async () => {
      const mockPools = [
        { id: 1, name: 'Good Pool', isHosted: false, poolType: 'automation', size: 5 },
        { id: 2, name: 'Bad Pool', isHosted: false, poolType: 'automation', size: 5 },
      ];

      const mockAgents = [
        {
          id: 1,
          name: 'Agent-1',
          version: '2.211.0',
          osDescription: 'Linux',
          enabled: true,
          status: 'online',
          statusChangedOn: '2024-01-15T10:00:00Z',
          createdOn: '2024-01-01T00:00:00Z',
          maxParallelism: 1,
        },
      ];

      mockClient.getAgentPools.mockResolvedValue(mockPools as any);
      mockClient.getAgentsInPool
        .mockResolvedValueOnce(mockAgents as any)
        .mockRejectedValueOnce(new Error('Pool access denied'));

      const result = await fetchAllAgentPoolMetrics(mockClient, 'test-org');

      // Should have data for the first pool only
      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].poolName).toBe('Good Pool');
    });

    it('should throw error if getAgentPools fails', async () => {
      mockClient.getAgentPools.mockRejectedValue(new Error('API Error'));

      await expect(fetchAllAgentPoolMetrics(mockClient, 'test-org')).rejects.toThrow(
        /Failed to fetch agent pool metrics/
      );
    });
  });

  describe('analyzeAgentPoolHealth', () => {
    it('should identify pools with low availability', () => {
      const data = {
        organization: 'test-org',
        pools: [
          {
            poolId: 1,
            poolName: 'Low Availability',
            totalAgents: 10,
            onlineAgents: 3,
            offlineAgents: 7,
            enabledAgents: 10,
            disabledAgents: 0,
            availabilityRate: 0.3,
            longOfflineAgents: [],
          },
          {
            poolId: 2,
            poolName: 'High Availability',
            totalAgents: 10,
            onlineAgents: 9,
            offlineAgents: 1,
            enabledAgents: 10,
            disabledAgents: 0,
            availabilityRate: 0.9,
            longOfflineAgents: [],
          },
        ],
        totalAgents: 20,
        onlineAgents: 12,
        offlineAgents: 8,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeAgentPoolHealth(data);

      expect(analysis.lowAvailabilityPools).toHaveLength(1);
      expect(analysis.lowAvailabilityPools[0].poolName).toBe('Low Availability');
      expect(analysis.recommendations).toContain(expect.stringContaining('availability'));
    });

    it('should recommend cleanup for long offline agents', () => {
      const data = {
        organization: 'test-org',
        pools: [
          {
            poolId: 1,
            poolName: 'Pool with Dead Agents',
            totalAgents: 5,
            onlineAgents: 3,
            offlineAgents: 2,
            enabledAgents: 5,
            disabledAgents: 0,
            availabilityRate: 0.6,
            longOfflineAgents: [
              { agentId: 1, agentName: 'Dead-Agent-1', offlineDays: 30 },
              { agentId: 2, agentName: 'Dead-Agent-2', offlineDays: 60 },
            ],
          },
        ],
        totalAgents: 5,
        onlineAgents: 3,
        offlineAgents: 2,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeAgentPoolHealth(data);

      expect(analysis.totalLongOfflineAgents).toBe(2);
      expect(analysis.recommendations).toContain(expect.stringContaining('cleanup'));
    });

    it('should handle empty agent pool data', () => {
      const data = {
        organization: 'test-org',
        pools: [],
        totalAgents: 0,
        onlineAgents: 0,
        offlineAgents: 0,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeAgentPoolHealth(data);

      expect(analysis.lowAvailabilityPools).toHaveLength(0);
      expect(analysis.totalLongOfflineAgents).toBe(0);
      expect(analysis.recommendations).toHaveLength(0);
    });

    it('should calculate overall availability rate', () => {
      const data = {
        organization: 'test-org',
        pools: [
          {
            poolId: 1,
            poolName: 'Pool 1',
            totalAgents: 10,
            onlineAgents: 8,
            offlineAgents: 2,
            enabledAgents: 10,
            disabledAgents: 0,
            availabilityRate: 0.8,
            longOfflineAgents: [],
          },
        ],
        totalAgents: 10,
        onlineAgents: 8,
        offlineAgents: 2,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeAgentPoolHealth(data);

      expect(analysis.overallAvailability).toBeCloseTo(0.8);
    });

    it('should identify pools with many disabled agents', () => {
      const data = {
        organization: 'test-org',
        pools: [
          {
            poolId: 1,
            poolName: 'Many Disabled',
            totalAgents: 10,
            onlineAgents: 3,
            offlineAgents: 2,
            enabledAgents: 5,
            disabledAgents: 5,
            availabilityRate: 0.3,
            longOfflineAgents: [],
          },
        ],
        totalAgents: 10,
        onlineAgents: 3,
        offlineAgents: 2,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeAgentPoolHealth(data);

      expect(analysis.recommendations).toContain(expect.stringContaining('disabled'));
    });
  });
});
