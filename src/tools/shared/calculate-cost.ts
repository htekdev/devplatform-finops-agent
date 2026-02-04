import type { UsageMetric } from "../../models/usage-metric.js";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";
import { getPricing } from "../../lib/pricing.js";

export async function calculateCost(
  metric: UsageMetric
): Promise<ToolResult<UsageMetric>> {
  return wrapToolHandler(async () => {
    const pricing = getPricing();
    let cost = 0;

    switch (metric.resourceType) {
      case "actions-minutes":
        if (metric.metadata?.runnerType === "UBUNTU") {
          cost = metric.quantity * pricing.github.actions.UBUNTU;
        } else if (metric.metadata?.runnerType === "WINDOWS") {
          cost = metric.quantity * pricing.github.actions.WINDOWS;
        } else if (metric.metadata?.runnerType === "MACOS") {
          cost = metric.quantity * pricing.github.actions.MACOS;
        }
        break;

      case "lfs-storage":
        cost = metric.quantity * pricing.github.lfs.storage;
        break;

      case "lfs-bandwidth":
        cost = metric.quantity * pricing.github.lfs.bandwidth;
        break;

      case "codespaces-hours":
        cost = metric.quantity * pricing.github.codespaces["2-core"];
        break;

      case "user-license":
        if (metric.metadata?.licenseType === "basic + test plans") {
          cost = metric.quantity * pricing.azureDevOps.licenses.basicTestPlans;
        } else {
          cost = metric.quantity * pricing.azureDevOps.licenses.basic;
        }
        break;

      case "parallel-jobs":
        const isHosted = metric.metadata?.isHosted === true;
        cost = metric.quantity * (isHosted 
          ? pricing.azureDevOps.parallelJobs.hosted 
          : pricing.azureDevOps.parallelJobs.selfHosted);
        break;

      default:
        cost = metric.cost.amount;
    }

    return {
      ...metric,
      cost: {
        amount: cost,
        currency: "USD",
        isEstimated: true,
      },
    };
  }, `calculate cost for ${metric.resourceType}`);
}
