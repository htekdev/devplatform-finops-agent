/**
 * Configuration Loading
 * 
 * Loads configuration from environment variables and optional JSON config file.
 * Follows 12-factor app principles for credential management.
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface FinOpsConfig {
  github?: {
    token: string;
    organizations: string[];
  };
  azureDevOps?: {
    pat: string;
    organization: string;
  };
  pricing?: {
    dataPath?: string;
  };
  thresholds?: {
    inactiveDays: number;
    minSavingsToReport: number;
  };
  llm?: {
    model: string;
  };
}

/**
 * Load configuration from environment variables and optional config file
 */
export async function loadConfig(): Promise<FinOpsConfig> {
  const config: FinOpsConfig = {
    thresholds: {
      inactiveDays: 90,
      minSavingsToReport: 10,
    },
    llm: {
      model: "gpt-4o",
    },
  };

  // Load from environment variables
  if (process.env.GITHUB_TOKEN) {
    config.github = {
      token: process.env.GITHUB_TOKEN,
      organizations: process.env.GITHUB_ORGS?.split(",") || [],
    };
  }

  if (process.env.AZURE_DEVOPS_PAT) {
    config.azureDevOps = {
      pat: process.env.AZURE_DEVOPS_PAT,
      organization: process.env.AZURE_DEVOPS_ORG || "",
    };
  }

  if (process.env.PRICING_DATA_PATH) {
    config.pricing = {
      dataPath: process.env.PRICING_DATA_PATH,
    };
  }

  if (process.env.COPILOT_MODEL) {
    config.llm = {
      model: process.env.COPILOT_MODEL,
    };
  }

  // Override with config file if it exists
  const configPath = join(homedir(), ".finops-agent", "config.json");
  if (existsSync(configPath)) {
    try {
      const fileContent = await readFile(configPath, "utf-8");
      const fileConfig = JSON.parse(fileContent);
      Object.assign(config, fileConfig);
    } catch (error) {
      console.warn(`Failed to load config file from ${configPath}:`, error);
    }
  }

  return config;
}

/**
 * Validate required configuration is present
 */
export function validateConfig(config: FinOpsConfig, platform: "github" | "azdo" | "all"): void {
  if (platform === "github" || platform === "all") {
    if (!config.github?.token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }
  }

  if (platform === "azdo" || platform === "all") {
    if (!config.azureDevOps?.pat) {
      throw new Error("AZURE_DEVOPS_PAT environment variable is required");
    }
    if (!config.azureDevOps?.organization) {
      throw new Error("AZURE_DEVOPS_ORG environment variable is required");
    }
  }
}
