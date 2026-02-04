import { getPricing } from "../../lib/pricing.js";
import type { GitHubActionsBillingData } from "../../tools/github/get-actions-billing.js";

export interface GitHubCostCalculation {
  totalCost: number;
  breakdown: {
    actions: number;
    lfs: number;
    codespaces: number;
  };
  details: {
    actionsMinutes: Record<string, { minutes: number; cost: number }>;
    lfsStorage: { gb: number; cost: number };
    lfsBandwidth: { gb: number; cost: number };
    codespaces: { hours: number; cost: number };
  };
}

export function calculateGitHubActionsCost(billingData: GitHubActionsBillingData): number {
  const pricing = getPricing();
  let totalCost = 0;

  if (billingData.minutesUsedBreakdown.UBUNTU) {
    totalCost += billingData.minutesUsedBreakdown.UBUNTU * pricing.github.actions.UBUNTU;
  }
  if (billingData.minutesUsedBreakdown.WINDOWS) {
    totalCost += billingData.minutesUsedBreakdown.WINDOWS * pricing.github.actions.WINDOWS;
  }
  if (billingData.minutesUsedBreakdown.MACOS) {
    totalCost += billingData.minutesUsedBreakdown.MACOS * pricing.github.actions.MACOS;
  }

  return totalCost;
}

export function calculateGitHubLFSCost(storageGB: number, bandwidthGB: number): number {
  const pricing = getPricing();
  return storageGB * pricing.github.lfs.storage + bandwidthGB * pricing.github.lfs.bandwidth;
}

export function calculateGitHubCodespacesCost(coreHours: number, machineType: string): number {
  const pricing = getPricing();
  const cores = parseInt(machineType.match(/(\d+)-core/)?.[1] || "2", 10);
  const key = `${cores}-core` as "2-core" | "4-core" | "8-core";
  return coreHours * (pricing.github.codespaces[key] || pricing.github.codespaces["2-core"]);
}
