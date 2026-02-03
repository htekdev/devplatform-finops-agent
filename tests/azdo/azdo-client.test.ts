import { AzureDevOpsClient } from '../../src/clients/azdo-client';
import axios from 'axios';
import { Cache } from '../../src/utils/cache';

// Mock axios and cache
jest.mock('axios');
jest.mock('../../src/utils/cache');

describe('AzureDevOpsClient', () => {
  let client: AzureDevOpsClient;
  let mockAxiosInstance: any;
  let mockCache: jest.Mocked<Cache>;

  beforeEach(() => {
    mockCache = new Cache() as jest.Mocked<Cache>;
    (Cache as jest.MockedClass<typeof Cache>).mockImplementation(() => mockCache);

    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    client = new AzureDevOpsClient({
      pat: 'test-pat',
      organization: 'test-org',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgentPools', () => {
    it('should fetch agent pools successfully', async () => {
      const mockResponse = {
        data: {
          value: [
            { id: 1, name: 'Default', isHosted: false, poolType: 'automation', size: 5 },
            { id: 2, name: 'Azure Pipelines', isHosted: true, poolType: 'automation', size: 10 },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAgentPools('test-org');

      expect(result).toEqual(mockResponse.data.value);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/test-org/_apis/distributedtask/pools')
      );
    });

    it('should return cached data when available', async () => {
      const cachedData = [
        { id: 1, name: 'Default', isHosted: false, poolType: 'automation', size: 5 },
      ];

      mockCache.get.mockResolvedValue(cachedData);

      const result = await client.getAgentPools('test-org');

      expect(result).toEqual(cachedData);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      await expect(client.getAgentPools('test-org')).rejects.toThrow('API Error');
    });

    it('should handle 401 unauthorized errors', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      await expect(client.getAgentPools('test-org')).rejects.toThrow();
    });
  });

  describe('getAgentsInPool', () => {
    it('should fetch agents in a pool successfully', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 1,
              name: 'Agent-1',
              version: '2.211.0',
              osDescription: 'Linux',
              enabled: true,
              status: 'online',
              statusChangedOn: '2024-01-15T10:00:00Z',
            },
            {
              id: 2,
              name: 'Agent-2',
              version: '2.211.0',
              osDescription: 'Windows',
              enabled: true,
              status: 'offline',
              statusChangedOn: '2024-01-10T10:00:00Z',
            },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAgentsInPool('test-org', 1);

      expect(result).toEqual(mockResponse.data.value);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/test-org/_apis/distributedtask/pools/1/agents')
      );
    });

    it('should handle empty pools', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAgentsInPool('test-org', 1);

      expect(result).toEqual([]);
    });
  });

  describe('getPipelineRuns', () => {
    it('should fetch pipeline runs successfully', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 1,
              name: 'Build-1',
              state: 'completed',
              result: 'succeeded',
              createdDate: '2024-01-15T10:00:00Z',
              finishedDate: '2024-01-15T10:30:00Z',
              pipeline: { id: 10, name: 'CI Pipeline' },
            },
            {
              id: 2,
              name: 'Build-2',
              state: 'completed',
              result: 'failed',
              createdDate: '2024-01-15T11:00:00Z',
              finishedDate: '2024-01-15T11:45:00Z',
              pipeline: { id: 10, name: 'CI Pipeline' },
            },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getPipelineRuns('test-org', 'test-project');

      expect(result).toEqual(mockResponse.data.value);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/test-org/test-project/_apis/pipelines/runs')
      );
    });

    it('should handle continuation token pagination', async () => {
      const mockResponse1 = {
        data: {
          value: [{ id: 1, name: 'Build-1' }],
        },
        headers: {
          'x-ms-continuationtoken': 'token123',
        },
      };

      const mockResponse2 = {
        data: {
          value: [{ id: 2, name: 'Build-2' }],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await client.getPipelineRuns('test-org', 'test-project');

      expect(result.length).toBe(2);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserEntitlements', () => {
    it('should fetch user entitlements successfully', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: '1',
              user: {
                displayName: 'John Doe',
                mailAddress: 'john@example.com',
                principalName: 'john@example.com',
              },
              accessLevel: {
                accountLicenseType: 'express',
                licensingSource: 'account',
                status: 'active',
              },
              lastAccessedDate: '2024-01-15T10:00:00Z',
              dateCreated: '2023-01-01T00:00:00Z',
            },
            {
              id: '2',
              user: {
                displayName: 'Jane Smith',
                mailAddress: 'jane@example.com',
                principalName: 'jane@example.com',
              },
              accessLevel: {
                accountLicenseType: 'advanced',
                licensingSource: 'account',
                status: 'active',
              },
              lastAccessedDate: '2023-12-01T10:00:00Z',
              dateCreated: '2023-01-01T00:00:00Z',
            },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getUserEntitlements('test-org');

      expect(result).toEqual(mockResponse.data.value);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('vsaex.dev.azure.com')
      );
    });

    it('should handle users with no access date', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: '1',
              user: {
                displayName: 'New User',
                mailAddress: 'new@example.com',
                principalName: 'new@example.com',
              },
              accessLevel: {
                accountLicenseType: 'stakeholder',
                licensingSource: 'account',
                status: 'pending',
              },
              lastAccessedDate: null,
              dateCreated: '2024-01-15T00:00:00Z',
            },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getUserEntitlements('test-org');

      expect(result).toEqual(mockResponse.data.value);
      expect(result[0].lastAccessedDate).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockResponse = {
        data: {
          value: [
            {
              id: 'proj1',
              name: 'Project 1',
              description: 'Test project 1',
              state: 'wellFormed',
              visibility: 'private',
            },
            {
              id: 'proj2',
              name: 'Project 2',
              description: 'Test project 2',
              state: 'wellFormed',
              visibility: 'public',
            },
          ],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProjects('test-org');

      expect(result).toEqual(mockResponse.data.value);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/test-org/_apis/projects')
      );
    });

    it('should handle organizations with no projects', async () => {
      const mockResponse = {
        data: {
          value: [],
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProjects('test-org');

      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle 403 forbidden errors with helpful message', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 403, data: { message: 'Insufficient scope' } },
      });

      await expect(client.getAgentPools('test-org')).rejects.toThrow();
    });

    it('should handle 429 rate limit errors', async () => {
      mockCache.get.mockResolvedValue(null);
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 429, data: { message: 'Rate limit exceeded' } },
      });

      await expect(client.getAgentPools('test-org')).rejects.toThrow();
    });
  });
});
