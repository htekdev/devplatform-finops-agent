#!/usr/bin/env node
/**
 * FinOps Agent CLI
 * 
 * Command-line interface for analyzing GitHub and Azure DevOps platform costs.
 */

import { Command } from "commander";
import { loadConfig, validateConfig } from "../lib/config.js";
import { GitHubAnalyzerAgent } from "../agents/github-analyzer.js";
import { AzDOAnalyzerAgent } from "../agents/azdo-analyzer.js";
import { OrchestratorAgent } from "../agents/orchestrator.js";
import chalk from "chalk";

const program = new Command();

program
  .name("finops-agent")
  .description("Multi-agent FinOps analyzer for GitHub and Azure DevOps platform costs")
  .version("0.1.0");

/**
 * GitHub analysis command
 */
program
  .command("analyze")
  .description("Analyze platform costs and usage")
  .argument("<platform>", "Platform to analyze: github, azdo, or all")
  .option("-o, --org <org>", "Organization to analyze (overrides config)")
  .option("-d, --days <days>", "Analysis period in days", "30")
  .option("-p, --projects <projects>", "Comma-separated list of Azure DevOps projects to analyze")
  .option("--inactive-days <days>", "Days of inactivity to flag users (Azure DevOps)", "90")
  .action(async (platform: string, options) => {
    try {
      const config = await loadConfig();
      
      if (platform === "github") {
        validateConfig(config, "github");
        
        if (!config.github) {
          console.error(chalk.red("GitHub configuration is missing"));
          process.exit(1);
        }

        const orgs = options.org ? [options.org] : config.github.organizations;
        
        if (orgs.length === 0) {
          console.error(chalk.red("No GitHub organizations specified. Use --org or set GITHUB_ORGS"));
          process.exit(1);
        }

        console.log(chalk.blue("🔍 Starting GitHub cost analysis..."));
        console.log(chalk.gray(`Organizations: ${orgs.join(", ")}`));
        console.log(chalk.gray(`Analysis period: ${options.days} days\n`));

        const agent = new GitHubAnalyzerAgent(config.llm?.model);
        const result = await agent.analyze({
          token: config.github.token,
          organizations: orgs,
          days: parseInt(options.days),
        });

        console.log(result);
        
        await agent.stop();
        console.log(chalk.green("\n✅ Analysis complete"));
        
      } else if (platform === "azdo") {
        validateConfig(config, "azdo");
        
        if (!config.azureDevOps) {
          console.error(chalk.red("Azure DevOps configuration is missing"));
          process.exit(1);
        }

        const org = options.org || config.azureDevOps.organization;
        
        if (!org) {
          console.error(chalk.red("No Azure DevOps organization specified. Use --org or set AZURE_DEVOPS_ORG"));
          process.exit(1);
        }

        const projects = options.projects ? options.projects.split(",").map((p: string) => p.trim()) : undefined;

        console.log(chalk.blue("🔍 Starting Azure DevOps cost analysis..."));
        console.log(chalk.gray(`Organization: ${org}`));
        if (projects) {
          console.log(chalk.gray(`Projects: ${projects.join(", ")}`));
        }
        console.log(chalk.gray(`Inactive user threshold: ${options.inactiveDays} days\n`));

        const agent = new AzDOAnalyzerAgent(config.llm?.model);
        const result = await agent.analyze({
          pat: config.azureDevOps.pat,
          organization: org,
          projects,
          inactiveDays: parseInt(options.inactiveDays),
        });

        console.log(result);
        
        await agent.stop();
        console.log(chalk.green("\n✅ Analysis complete"));
        
      } else if (platform === "all") {
        // Validate at least one platform is configured
        if (!config.github?.token && !config.azureDevOps?.pat) {
          console.error(chalk.red("No platforms configured. Set GITHUB_TOKEN and/or AZURE_DEVOPS_PAT"));
          process.exit(1);
        }

        console.log(chalk.blue("🔍 Starting combined platform cost analysis...\n"));
        
        if (config.github?.token) {
          console.log(chalk.gray(`GitHub orgs: ${config.github.organizations.join(", ")}`));
        }
        if (config.azureDevOps?.pat) {
          console.log(chalk.gray(`Azure DevOps org: ${config.azureDevOps.organization}`));
        }
        console.log(chalk.gray(`Analysis period: ${options.days} days\n`));

        const orchestrator = new OrchestratorAgent(config.llm?.model);
        const result = await orchestrator.analyze({
          config,
          days: parseInt(options.days),
        });

        console.log(result);
        console.log(chalk.green("\n✅ Combined analysis complete"));
        
      } else {
        console.error(chalk.red(`Unknown platform: ${platform}`));
        console.error(chalk.gray("Valid platforms: github, azdo, all"));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
