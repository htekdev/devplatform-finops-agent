import { getPricing } from "../../lib/pricing.js";

export function calculateAzDoLicenseCost(licenseType: string): number {
  const pricing = getPricing();
  
  if (licenseType.toLowerCase().includes("basic + test plans")) {
    return pricing.azureDevOps.licenses.basicTestPlans;
  }
  if (licenseType.toLowerCase().includes("basic")) {
    return pricing.azureDevOps.licenses.basic;
  }
  
  return 0;
}

export function calculateAzDoParallelJobCost(isHosted: boolean, count: number): number {
  const pricing = getPricing();
  const unitCost = isHosted 
    ? pricing.azureDevOps.parallelJobs.hosted 
    : pricing.azureDevOps.parallelJobs.selfHosted;
  
  return unitCost * count;
}
