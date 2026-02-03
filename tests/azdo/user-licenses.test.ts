import { fetchUserLicenses, analyzeLicenseUtilization, calculateLicenseCosts } from '../../src/tools/azdo/user-licenses';
import { AzureDevOpsClient } from '../../src/clients/azdo-client';

// Mock the client
jest.mock('../../src/clients/azdo-client');

describe('User Licenses Fetcher', () => {
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

  describe('fetchUserLicenses', () => {
    it('should fetch and categorize user licenses', async () => {
      const mockEntitlements = [
        {
          id: '1',
          user: {
            displayName: 'Active User 1',
            mailAddress: 'user1@example.com',
            principalName: 'user1@example.com',
          },
          accessLevel: {
            accountLicenseType: 'express', // Basic
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: '2024-01-15T10:00:00Z',
          dateCreated: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          user: {
            displayName: 'Inactive User',
            mailAddress: 'user2@example.com',
            principalName: 'user2@example.com',
          },
          accessLevel: {
            accountLicenseType: 'advanced', // Basic + Test Plans
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: '2023-06-01T10:00:00Z', // Over 90 days ago
          dateCreated: '2023-01-01T00:00:00Z',
        },
        {
          id: '3',
          user: {
            displayName: 'Stakeholder',
            mailAddress: 'user3@example.com',
            principalName: 'user3@example.com',
          },
          accessLevel: {
            accountLicenseType: 'stakeholder',
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: '2024-01-10T10:00:00Z',
          dateCreated: '2023-01-01T00:00:00Z',
        },
      ];

      mockClient.getUserEntitlements.mockResolvedValue(mockEntitlements as any);

      const result = await fetchUserLicenses(mockClient, 'test-org', 90);

      expect(result.organization).toBe('test-org');
      expect(result.totalUsers).toBe(3);
      expect(result.licenseBreakdown.basic).toBe(1);
      expect(result.licenseBreakdown.basicPlusTest).toBe(1);
      expect(result.licenseBreakdown.stakeholder).toBe(1);
      expect(result.inactiveUsers).toHaveLength(1);
      expect(result.inactiveUsers[0].userName).toBe('Inactive User');
    });

    it('should handle users with no last accessed date', async () => {
      const mockEntitlements = [
        {
          id: '1',
          user: {
            displayName: 'New User',
            mailAddress: 'new@example.com',
            principalName: 'new@example.com',
          },
          accessLevel: {
            accountLicenseType: 'express',
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: null,
          dateCreated: '2024-01-15T00:00:00Z',
        },
      ];

      mockClient.getUserEntitlements.mockResolvedValue(mockEntitlements as any);

      const result = await fetchUserLicenses(mockClient, 'test-org', 90);

      // User with no last accessed date should not be considered inactive
      expect(result.totalUsers).toBe(1);
      expect(result.inactiveUsers).toHaveLength(0);
    });

    it('should calculate potential savings from inactive licenses', async () => {
      const mockEntitlements = [
        {
          id: '1',
          user: {
            displayName: 'Inactive Basic',
            mailAddress: 'user1@example.com',
            principalName: 'user1@example.com',
          },
          accessLevel: {
            accountLicenseType: 'express',
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: '2023-01-01T10:00:00Z',
          dateCreated: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          user: {
            displayName: 'Inactive Advanced',
            mailAddress: 'user2@example.com',
            principalName: 'user2@example.com',
          },
          accessLevel: {
            accountLicenseType: 'advanced',
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: '2023-01-01T10:00:00Z',
          dateCreated: '2023-01-01T00:00:00Z',
        },
      ];

      mockClient.getUserEntitlements.mockResolvedValue(mockEntitlements as any);

      const result = await fetchUserLicenses(mockClient, 'test-org', 90);

      expect(result.inactiveUsers).toHaveLength(2);
      // Basic: $6/month, Advanced: $52/month
      expect(result.potentialSavings).toBeGreaterThan(0);
    });

    it('should handle empty entitlements', async () => {
      mockClient.getUserEntitlements.mockResolvedValue([]);

      const result = await fetchUserLicenses(mockClient, 'test-org', 90);

      expect(result.totalUsers).toBe(0);
      expect(result.inactiveUsers).toHaveLength(0);
      expect(result.potentialSavings).toBe(0);
    });

    it('should throw error if getUserEntitlements fails', async () => {
      mockClient.getUserEntitlements.mockRejectedValue(new Error('API Error'));

      await expect(fetchUserLicenses(mockClient, 'test-org', 90)).rejects.toThrow(
        /Failed to fetch user licenses/
      );
    });

    it('should use custom inactive threshold', async () => {
      const mockEntitlements = [
        {
          id: '1',
          user: {
            displayName: 'User',
            mailAddress: 'user@example.com',
            principalName: 'user@example.com',
          },
          accessLevel: {
            accountLicenseType: 'express',
            licensingSource: 'account',
            status: 'active',
          },
          lastAccessedDate: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
          dateCreated: '2023-01-01T00:00:00Z',
        },
      ];

      mockClient.getUserEntitlements.mockResolvedValue(mockEntitlements as any);

      // With 30-day threshold, should be inactive
      const result30 = await fetchUserLicenses(mockClient, 'test-org', 30);
      expect(result30.inactiveUsers).toHaveLength(1);

      // With 60-day threshold, should not be inactive
      const result60 = await fetchUserLicenses(mockClient, 'test-org', 60);
      expect(result60.inactiveUsers).toHaveLength(0);
    });
  });

  describe('analyzeLicenseUtilization', () => {
    it('should provide recommendations for inactive licenses', () => {
      const data = {
        organization: 'test-org',
        totalUsers: 50,
        licenseBreakdown: {
          basic: 30,
          basicPlusTest: 15,
          stakeholder: 5,
          visualStudio: 0,
        },
        inactiveUsers: [
          { userName: 'User 1', licenseType: 'express', lastAccessDays: 180 },
          { userName: 'User 2', licenseType: 'advanced', lastAccessDays: 200 },
          { userName: 'User 3', licenseType: 'express', lastAccessDays: 150 },
        ],
        potentialSavings: 64, // 2*$6 + 1*$52
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeLicenseUtilization(data);

      expect(analysis.totalInactive).toBe(3);
      expect(analysis.potentialMonthlySavings).toBe(64);
      expect(analysis.recommendations).toContain(expect.stringContaining('inactive'));
    });

    it('should prioritize inactive users by license cost', () => {
      const data = {
        organization: 'test-org',
        totalUsers: 10,
        licenseBreakdown: {
          basic: 5,
          basicPlusTest: 3,
          stakeholder: 2,
          visualStudio: 0,
        },
        inactiveUsers: [
          { userName: 'Basic User', licenseType: 'express', lastAccessDays: 100 },
          { userName: 'Advanced User', licenseType: 'advanced', lastAccessDays: 100 },
        ],
        potentialSavings: 58,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeLicenseUtilization(data);

      // Advanced ($52) should be prioritized over Basic ($6)
      const prioritizedList = analysis.recommendations.find(r => r.includes('prioritize'));
      expect(prioritizedList).toBeDefined();
    });

    it('should handle no inactive users', () => {
      const data = {
        organization: 'test-org',
        totalUsers: 10,
        licenseBreakdown: {
          basic: 8,
          basicPlusTest: 2,
          stakeholder: 0,
          visualStudio: 0,
        },
        inactiveUsers: [],
        potentialSavings: 0,
        timestamp: new Date().toISOString(),
      };

      const analysis = analyzeLicenseUtilization(data);

      expect(analysis.totalInactive).toBe(0);
      expect(analysis.potentialMonthlySavings).toBe(0);
      expect(analysis.recommendations).toHaveLength(0);
    });
  });

  describe('calculateLicenseCosts', () => {
    it('should calculate total license costs correctly', () => {
      const licenseBreakdown = {
        basic: 10,
        basicPlusTest: 5,
        stakeholder: 3,
        visualStudio: 2,
      };

      const costs = calculateLicenseCosts(licenseBreakdown);

      // Basic: 10 * $6 = $60
      // Basic + Test: 5 * $52 = $260
      // Stakeholder: 3 * $0 = $0
      // Visual Studio: 2 * $45 = $90
      expect(costs.totalMonthlyCost).toBe(410);
      expect(costs.basicCost).toBe(60);
      expect(costs.basicPlusTestCost).toBe(260);
      expect(costs.stakeholderCost).toBe(0);
      expect(costs.visualStudioCost).toBe(90);
    });

    it('should handle zero licenses', () => {
      const licenseBreakdown = {
        basic: 0,
        basicPlusTest: 0,
        stakeholder: 0,
        visualStudio: 0,
      };

      const costs = calculateLicenseCosts(licenseBreakdown);

      expect(costs.totalMonthlyCost).toBe(0);
    });

    it('should use correct pricing for each license type', () => {
      const licenseBreakdown = {
        basic: 1,
        basicPlusTest: 1,
        stakeholder: 1,
        visualStudio: 1,
      };

      const costs = calculateLicenseCosts(licenseBreakdown);

      // Verify individual costs match expected pricing
      expect(costs.basicCost).toBe(6);
      expect(costs.basicPlusTestCost).toBe(52);
      expect(costs.stakeholderCost).toBe(0);
      expect(costs.visualStudioCost).toBe(45);
    });
  });
});
