#!/usr/bin/env node
/**
 * FinOps Agent CLI
 * 
 * Command-line interface for analyzing GitHub and Azure DevOps platform costs.
 */

import { Command } from "commander";
import { loadConfig, validateConfig } from "../lib/config.js";
import { GitHubAnalyzerAgent } from "../agents/github-analyzer.js";
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
        console.error(chalk.yellow("Azure DevOps analysis not yet implemented"));
        process.exit(1);
      } else if (platform === "all") {
        console.error(chalk.yellow("Combined platform analysis not yet implemented"));
        process.exit(1);
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
