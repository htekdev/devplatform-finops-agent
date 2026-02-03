import { fetchLFSBilling, analyzeLFSUsage } from '../../src/tools/github/lfs-billing';
import { GitHubClient } from '../../src/clients/github-client';

jest.mock('../../src/clients/github-client');

describe('LFS Billing Tools', () => {
  let mockClient: jest.Mocked<GitHubClient>;

  beforeEach(() => {
    mockClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    (GitHubClient as jest.MockedClass<typeof GitHubClient>).mockImplementation(() => mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchLFSBilling', () => {
    it('should fetch LFS billing data successfully', async () => {
      const mockBilling = {
        days_left_in_billing_cycle: 15,
        estimated_paid_storage_for_month: 1.5,
        estimated_storage_for_month: 2.0,
      };

      mockClient.getStorageBilling.mockResolvedValue(mockBilling);

      const result = await fetchLFSBilling(mockClient, 'test-org');

      expect(result).toEqual(mockBilling);
      expect(mockClient.getStorageBilling).toHaveBeenCalledWith('test-org');
    });

    it('should handle orgs with no LFS usage', async () => {
      const mockBilling = {
        days_left_in_billing_cycle: 30,
        estimated_paid_storage_for_month: 0,
        estimated_storage_for_month: 0,
      };

      mockClient.getStorageBilling.mockResolvedValue(mockBilling);

      const result = await fetchLFSBilling(mockClient, 'test-org');

      expect(result.estimated_storage_for_month).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getStorageBilling.mockRejectedValue(new Error('API Error'));

      await expect(fetchLFSBilling(mockClient, 'test-org')).rejects.toThrow('API Error');
    });
  });

  describe('analyzeLFSUsage', () => {
    it('should provide storage recommendations', () => {
      const billingData = {
        days_left_in_billing_cycle: 15,
        estimated_paid_storage_for_month: 5.0,
        estimated_storage_for_month: 6.0,
      };

      const result = analyzeLFSUsage(billingData);

      expect(result).toHaveProperty('current_storage_gb');
      expect(result).toHaveProperty('estimated_monthly_cost');
      expect(result).toHaveProperty('recommendations');
    });

    it('should calculate storage costs correctly', () => {
      const billingData = {
        days_left_in_billing_cycle: 15,
        estimated_paid_storage_for_month: 2.0,
        estimated_storage_for_month: 3.0,
      };

      const result = analyzeLFSUsage(billingData);

      // LFS costs $0.07 per GB beyond 1GB free tier
      const expectedCost = 2.0 * 0.07;
      expect(result.estimated_monthly_cost).toBeCloseTo(expectedCost, 2);
    });

    it('should recommend cleanup for high storage usage', () => {
      const billingData = {
        days_left_in_billing_cycle: 15,
        estimated_paid_storage_for_month: 10.0, // High usage
        estimated_storage_for_month: 11.0,
      };

      const result = analyzeLFSUsage(billingData);

      expect(result.recommendations).toContain(expect.stringContaining('cleanup'));
    });

    it('should handle zero storage usage', () => {
      const billingData = {
        days_left_in_billing_cycle: 30,
        estimated_paid_storage_for_month: 0,
        estimated_storage_for_month: 0,
      };

      const result = analyzeLFSUsage(billingData);

      expect(result.estimated_monthly_cost).toBe(0);
    });
  });
});
