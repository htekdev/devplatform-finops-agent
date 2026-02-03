import { fetchAllPipelineRuns, analyzePipelinePerformance } from '../../src/tools/azdo/pipeline-runs';
import { AzureDevOpsClient } from '../../src/clients/azdo-client';

// Mock the client
jest.mock('../../src/clients/azdo-client');

describe('Pipeline Runs Fetcher', () => {
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

  describe('fetchAllPipelineRuns', () => {
    it('should fetch pipeline runs from all projects', async () => {
      const mockProjects = [
        { id: 'proj1', name: 'Project 1', description: '', state: 'wellFormed', visibility: 'private' },
        { id: 'proj2', name: 'Project 2', description: '', state: 'wellFormed', visibility: 'private' },
      ];

      const mockRuns1 = [
        {
          id: 1,
          name: 'Build-1',
          state: 'completed',
          result: 'succeeded',
          createdDate: '2024-01-15T10:00:00Z',
          finishedDate: '2024-01-15T10:30:00Z',
          pipeline: { id: 10, name: 'CI Pipeline' },
        },
      ];

      const mockRuns2 = [
        {
          id: 2,
          name: 'Build-2',
          state: 'completed',
          result: 'failed',
          createdDate: '2024-01-15T11:00:00Z',
          finishedDate: '2024-01-15T11:45:00Z',
          pipeline: { id: 20, name: 'Deploy Pipeline' },
        },
      ];

      mockClient.getProjects.mockResolvedValue(mockProjects as any);
      mockClient.getPipelineRuns
        .mockResolvedValueOnce(mockRuns1 as any)
        .mockResolvedValueOnce(mockRuns2 as any);

      const result = await fetchAllPipelineRuns(mockClient, 'test-org');

      expect(result.organization).toBe('test-org');
      expect(result.projects).toHaveLength(2);
      expect(mockClient.getPipelineRuns).toHaveBeenCalledTimes(2);
    });

    it('should calculate pipeline statistics correctly', async () => {
      const mockProjects = [
        { id: 'proj1', name: 'Project 1', description: '', state: 'wellFormed', visibility: 'private' },
      ];

      const mockRuns = [
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
          finishedDate: '2024-01-15T11:30:00Z',
          pipeline: { id: 10, name: 'CI Pipeline' },
        },
        {
          id: 3,
          name: 'Build-3',
          state: 'completed',
          result: 'succeeded',
          createdDate: '2024-01-15T12:00:00Z',
          finishedDate: '2024-01-15T13:00:00Z',
          pipeline: { id: 10, name: 'CI Pipeline' },
        },
      ];

      mockClient.getProjects.mockResolvedValue(mockProjects as any);
      mockClient.getPipelineRuns.mockResolvedValue(mockRuns as any);

      const result = await fetchAllPipelineRuns(mockClient, 'test-org');

      const projectData = result.projects[0];
      expect(projectData.totalRuns).toBe(3);
      expect(projectData.successRate).toBeCloseTo(2 / 3); // 2 succeeded out of 3
      expect(projectData.avgDurationMinutes).toBeGreaterThan(0);
    });

    it('should handle projects with no pipeline runs', async () => {
      const mockProjects = [
        { id: 'proj1', name: 'Empty Project', description: '', state: 'wellFormed', visibility: 'private' },
      ];

      mockClient.getProjects.mockResolvedValue(mockProjects as any);
      mockClient.getPipelineRuns.mockResolvedValue([]);

      const result = await fetchAllPipelineRuns(mockClient, 'test-org');

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].totalRuns).toBe(0);
      expect(result.projects[0].successRate).toBe(0);
    });

    it('should continue if one project fails', async () => {
      const mockProjects = [
        { id: 'proj1', name: 'Good Project', description: '', state: 'wellFormed', visibility: 'private' },
        { id: 'proj2', name: 'Bad Project', description: '', state: 'wellFormed', visibility: 'private' },
      ];

      const mockRuns = [
        {
          id: 1,
          name: 'Build-1',
          state: 'completed',
          result: 'succeeded',
          createdDate: '2024-01-15T10:00:00Z',
          finishedDate: '2024-01-15T10:30:00Z',
          pipeline: { id: 10, name: 'CI Pipeline' },
        },
      ];

      mockClient.getProjects.mockResolvedValue(mockProjects as any);
      mockClient.getPipelineRuns
        .mockResolvedValueOnce(mockRuns as any)
        .mockRejectedValueOnce(new Error('Project access denied'));

      const result = await fetchAllPipelineRuns(mockClient, 'test-org');

      // Should have data for the first project only
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].projectName).toBe('Good Project');
    });

    it('should throw error if getProjects fails', async () => {
      mockClient.getProjects.mockRejectedValue(new Error('API Error'));

      await expect(fetchAllPipelineRuns(mockClient, 'test-org')).rejects.toThrow(
        /Failed to fetch pipeline runs/
      );
    });
  });

  describe('analyzePipelinePerformance', () => {
    it('should identify slowest pipelines', () => {
      const data = {
        organization: 'test-org',
        projects: [
          {
            projectId: 'proj1',
            projectName: 'Project 1',
            totalRuns: 10,
            successRate: 0.8,
            avgDurationMinutes: 90, // Slow pipeline
            avgQueueTimeMinutes: 5,
            pipelines: [
              { pipelineId: 1, pipelineName: 'Slow Build', runCount: 10, avgDurationMinutes: 90, failureRate: 0.2 },
            ],
          },
          {
            projectId: 'proj2',
            projectName: 'Project 2',
            totalRuns: 5,
            successRate: 0.9,
            avgDurationMinutes: 15,
            avgQueueTimeMinutes: 2,
            pipelines: [
              { pipelineId: 2, pipelineName: 'Fast Build', runCount: 5, avgDurationMinutes: 15, failureRate: 0.1 },
            ],
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzePipelinePerformance(data);

      expect(analysis.slowestPipelines).toHaveLength(1);
      expect(analysis.slowestPipelines[0].pipelineName).toBe('Slow Build');
      expect(analysis.recommendations).toContain(expect.stringContaining('slow'));
    });

    it('should identify pipelines with high failure rates', () => {
      const data = {
        organization: 'test-org',
        projects: [
          {
            projectId: 'proj1',
            projectName: 'Project 1',
            totalRuns: 10,
            successRate: 0.5, // 50% failure rate
            avgDurationMinutes: 30,
            avgQueueTimeMinutes: 5,
            pipelines: [
              { pipelineId: 1, pipelineName: 'Flaky Build', runCount: 10, avgDurationMinutes: 30, failureRate: 0.5 },
            ],
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzePipelinePerformance(data);

      expect(analysis.mostFailedPipelines).toHaveLength(1);
      expect(analysis.mostFailedPipelines[0].pipelineName).toBe('Flaky Build');
      expect(analysis.recommendations).toContain(expect.stringContaining('failure'));
    });

    it('should handle empty pipeline data', () => {
      const data = {
        organization: 'test-org',
        projects: [],
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzePipelinePerformance(data);

      expect(analysis.slowestPipelines).toHaveLength(0);
      expect(analysis.mostFailedPipelines).toHaveLength(0);
      expect(analysis.recommendations).toHaveLength(0);
    });

    it('should sort pipelines by duration and failure rate', () => {
      const data = {
        organization: 'test-org',
        projects: [
          {
            projectId: 'proj1',
            projectName: 'Project 1',
            totalRuns: 30,
            successRate: 0.7,
            avgDurationMinutes: 45,
            avgQueueTimeMinutes: 5,
            pipelines: [
              { pipelineId: 1, pipelineName: 'Build A', runCount: 10, avgDurationMinutes: 120, failureRate: 0.1 },
              { pipelineId: 2, pipelineName: 'Build B', runCount: 10, avgDurationMinutes: 90, failureRate: 0.4 },
              { pipelineId: 3, pipelineName: 'Build C', runCount: 10, avgDurationMinutes: 60, failureRate: 0.5 },
            ],
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzePipelinePerformance(data);

      // Slowest should be Build A
      expect(analysis.slowestPipelines[0].pipelineName).toBe('Build A');

      // Most failed should be Build C
      expect(analysis.mostFailedPipelines[0].pipelineName).toBe('Build C');
    });
  });
});
