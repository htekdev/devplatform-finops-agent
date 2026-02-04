export interface CLIConfig {
  github?: {
    organization: string;
  };
  azureDevOps?: {
    organization: string;
  };
  output?: {
    format: "json" | "text" | "both";
    file?: string;
  };
  filters?: {
    repositories?: string[];
    projects?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export function loadConfig(): CLIConfig {
  const config: CLIConfig = {};

  if (process.env.GITHUB_ORG) {
    config.github = {
      organization: process.env.GITHUB_ORG,
    };
  }

  if (process.env.AZURE_DEVOPS_ORG) {
    config.azureDevOps = {
      organization: process.env.AZURE_DEVOPS_ORG,
    };
  }

  config.output = {
    format: (process.env.OUTPUT_FORMAT as "json" | "text" | "both") || "text",
    file: process.env.OUTPUT_FILE,
  };

  return config;
}
