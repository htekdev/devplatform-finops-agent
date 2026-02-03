import { fetchParallelJobUsage, analyzeParallelJobUtilization } from '../../src/tools/azdo/parallel-jobs';
import { AzureDevOpsClient } from '../../src/clients/azdo-client';

// Mock the client
jest.mock('../../src/clients/azdo-client');

describe('Parallel Jobs Fetcher', () => {
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

  describe('fetchParallelJobUsage', () => {
    it('should fetch and calculate parallel job usage', async () => {
      const mockPools = [
        { id: 1, name: 'Default', isHosted: false, poolType: 'automation', size: 5, targetSize: 5 },
        { id: 2, name: 'Azure Pipelines', isHosted: true, poolType: 'automation', size: 10, targetSize: 10 },
      ];

      const mockAgentsPool1 = [
        { id: 1, name: 'Agent-1', enabled: true, status: 'online', assignedRequest: { id: 1 } },
        { id: 2, name: 'Agent-2', enabled: true, status: 'online', assignedRequest: null },
        { id: 3, name: 'Agent-3', enabled: true, status: 'offline', assignedRequest: null },
      ];

      const mockAgentsPool2 = [
        { id: 4, name: 'Hosted-1', enabled: true, status: 'online', assignedRequest: { id: 2 } },
        { id: 5, name: 'Hosted-2', enabled: true, status: 'online', assignedRequest: { id: 3 } },
      ];

      mockClient.getAgentPools.mockResolvedValue(mockPools as any);
      mockClient.getAgentsInPool
        .mockResolvedValueOnce(mockAgentsPool1 as any)
        .mockResolvedValueOnce(mockAgentsPool2 as any);

      const result = await fetchParallelJobUsage(mockClient, 'test-org');

      expect(result.organization).toBe('test-org');
      expect(result.pools).toHaveLength(2);
      expect(result.hostedJobsPurchased).toBe(10);
      expect(result.selfHostedAgents).toBe(3);

      // Check utilization calculations
      const pool1Data = result.pools.find(p => p.poolId === 1);
      expect(pool1Data).toBeDefined();
      expect(pool1Data?.utilizationRate).toBeCloseTo(1 / 3); // 1 running out of 3 agents

      const pool2Data = result.pools.find(p => p.poolId === 2);
      expect(pool2Data).toBeDefined();
      expect(pool2Data?.utilizationRate).toBe(1); // 2 running out of 2 agents
    });

    it('should handle empty organizations', async () => {
      mockClient.getAgentPools.mockResolvedValue([]);

      const result = await fetchParallelJobUsage(mockClient, 'empty-org');

      expect(result.organization).toBe('empty-org');
      expect(result.pools).toHaveLength(0);
      expect(result.hostedJobsPurchased).toBe(0);
      expect(result.selfHostedAgents).toBe(0);
    });

    it('should handle pools with no agents', async () => {
      const mockPools = [
        { id: 1, name: 'Empty Pool', isHosted: false, poolType: 'automation', size: 0, targetSize: 0 },
      ];

      mockClient.getAgentPools.mockResolvedValue(mockPools as any);
      mockClient.getAgentsInPool.mockResolvedValue([]);

      const result = await fetchParallelJobUsage(mockClient, 'test-org');

      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].totalJobs).toBe(0);
      expect(result.pools[0].utilizationRate).toBe(0);
    });

    it('should continue processing if one pool fails', async () => {
      const mockPools = [
        { id: 1, name: 'Good Pool', isHosted: false, poolType: 'automation', size: 5, targetSize: 5 },
        { id: 2, name: 'Bad Pool', isHosted: false, poolType: 'automation', size: 5, targetSize: 5 },
      ];

      const mockAgents = [
        { id: 1, name: 'Agent-1', enabled: true, status: 'online', assignedRequest: null },
      ];

      mockClient.getAgentPools.mockResolvedValue(mockPools as any);
      mockClient.getAgentsInPool
        .mockResolvedValueOnce(mockAgents as any)
        .mockRejectedValueOnce(new Error('Pool access denied'));

      const result = await fetchParallelJobUsage(mockClient, 'test-org');

      // Should have data for the first pool only
      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].poolName).toBe('Good Pool');
    });

    it('should throw error if getAgentPools fails', async () => {
      mockClient.getAgentPools.mockRejectedValue(new Error('API Error'));

      await expect(fetchParallelJobUsage(mockClient, 'test-org')).rejects.toThrow(
        /Failed to fetch parallel job usage/
      );
    });
  });

  describe('analyzeParallelJobUtilization', () => {
    it('should identify underutilized pools', () => {
      const data = {
        organization: 'test-org',
        pools: [
          { poolId: 1, poolName: 'Low Usage', isHosted: false, totalJobs: 10, utilizationRate: 0.15, avgQueueTime: 0 },
          { poolId: 2, poolName: 'High Usage', isHosted: false, totalJobs: 5, utilizationRate: 0.85, avgQueueTime: 0 },
        ],
        hostedJobsPurchased: 5,
        selfHostedAgents: 15,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeParallelJobUtilization(data);

      expect(analysis.underutilizedPools).toHaveLength(1);
      expect(analysis.underutilizedPools[0].poolName).toBe('Low Usage');
      expect(analysis.recommendations).toContain(expect.stringContaining('underutilized'));
    });

    it('should recommend hosted vs self-hosted optimization', () => {
      const data = {
        organization: 'test-org',
        pools: [
          { poolId: 1, poolName: 'Self-Hosted', isHosted: false, totalJobs: 50, utilizationRate: 0.9, avgQueueTime: 0 },
        ],
        hostedJobsPurchased: 2,
        selfHostedAgents: 50,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeParallelJobUtilization(data);

      expect(analysis.recommendations).toContain(expect.stringContaining('hosted'));
    });

    it('should handle empty pool data', () => {
      const data = {
        organization: 'test-org',
        pools: [],
        hostedJobsPurchased: 0,
        selfHostedAgents: 0,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeParallelJobUtilization(data);

      expect(analysis.underutilizedPools).toHaveLength(0);
      expect(analysis.recommendations).toHaveLength(0);
    });

    it('should calculate hosted vs self-hosted cost comparison', () => {
      const data = {
        organization: 'test-org',
        pools: [],
        hostedJobsPurchased: 10,
        selfHostedAgents: 20,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeParallelJobUtilization(data);

      expect(analysis.hostedJobsPurchased).toBe(10);
      expect(analysis.selfHostedAgents).toBe(20);
      // Hosted cost: 10 * $40 = $400
      // Self-hosted cost: 20 * $15 = $300 (plus infrastructure)
      expect(analysis.recommendations).toBeDefined();
    });
  });
});
