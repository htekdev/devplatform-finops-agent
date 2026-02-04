import type { UsageMetric } from "../../models/usage-metric.js";
import type { Recommendation } from "../../models/recommendation.js";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";
import { calculatePriority } from "../../lib/validators.js";

export async function generateRecommendations(
  metrics: UsageMetric[]
): Promise<ToolResult<Recommendation[]>> {
  return wrapToolHandler(async () => {
    const recommendations: Recommendation[] = [];

    for (const metric of metrics) {
      if (metric.resourceType === "user-license") {
        const inactiveUsers = (metric.metadata?.inactiveUsers as number) || 0;
        if (inactiveUsers > 0) {
          const monthlySavings = metric.cost.amount * (inactiveUsers / metric.quantity);
          const priority = calculatePriority(monthlySavings, "low");

          recommendations.push({
            id: `rec-${metric.id}-inactive-users`,
            title: `Remove ${inactiveUsers} inactive users from Azure DevOps`,
            description: `${inactiveUsers} users have not accessed the system in 90+ days`,
            category: "cleanup",
            actionType: "remove-user-license",
            target: {
              platform: metric.platform,
              resourceType: metric.resourceType,
              resourceId: metric.resourceId,
              resourceName: metric.resourceName,
              orgUnit: metric.orgUnit,
            },
            executionParams: {
              method: "DELETE /user-entitlements/{userId}",
              params: { userIds: [] },
              effort: "low",
              risk: "low",
            },
            savings: {
              monthly: monthlySavings,
              annual: monthlySavings * 12,
              currency: "USD",
              confidence: "high",
            },
            priority,
            approval: {
              required: true,
              reason: "User license changes require approval",
            },
            sourceMetrics: [metric.id],
            generatedAt: new Date(),
          });
        }
      }

      if (metric.resourceType === "actions-minutes" && metric.metadata?.runnerType === "MACOS") {
        const macosMinutes = metric.quantity;
        if (macosMinutes > 1000) {
          const currentCost = metric.cost.amount;
          const potentialCost = macosMinutes * 0.008;
          const monthlySavings = currentCost - potentialCost;
          const priority = calculatePriority(monthlySavings, "medium");

          recommendations.push({
            id: `rec-${metric.id}-switch-to-linux`,
            title: "Switch macOS runners to Linux",
            description: `${macosMinutes} macOS minutes detected. Linux runners are 10x cheaper.`,
            category: "optimization",
            actionType: "optimize-workflow",
            target: {
              platform: metric.platform,
              resourceType: metric.resourceType,
              resourceId: metric.resourceId,
              resourceName: metric.resourceName,
              orgUnit: metric.orgUnit,
            },
            executionParams: {
              method: "Update workflow YAML",
              params: { runnerType: "ubuntu-latest" },
              effort: "medium",
              risk: "medium",
            },
            savings: {
              monthly: monthlySavings,
              annual: monthlySavings * 12,
              currency: "USD",
              confidence: "high",
            },
            priority,
            approval: {
              required: false,
            },
            sourceMetrics: [metric.id],
            generatedAt: new Date(),
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }, "generate recommendations");
}
