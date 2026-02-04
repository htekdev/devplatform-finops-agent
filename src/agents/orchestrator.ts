/**
 * Orchestrator Agent
 * 
 * Coordinates multi-platform analysis across GitHub and Azure DevOps.
 * Provides unified cost analysis and cross-platform optimization recommendations.
 */

import { GitHubAnalyzerAgent } from "./github-analyzer.js";
import { AzDOAnalyzerAgent } from "./azdo-analyzer.js";
import type { FinOpsConfig } from "../lib/config.js";

export interface OrchestratorContext {
  config: FinOpsConfig;
  days?: number;
}

export interface PlatformResults {
  github?: string;
  azdo?: string;
}

export class OrchestratorAgent {
  constructor(private model: string = "gpt-4o") {}

  /**
   * Analyze both GitHub and Azure DevOps platforms
   * Returns combined analysis with cross-platform recommendations
   */
  async analyze(context: OrchestratorContext): Promise<string> {
    const results: PlatformResults = {};
    const errors: string[] = [];

    // Run GitHub analysis if configured
    if (context.config.github?.token) {
      console.log("🔍 Analyzing GitHub organizations...\n");
      try {
        const githubAgent = new GitHubAnalyzerAgent(this.model);
        results.github = await githubAgent.analyze({
          token: context.config.github.token,
          organizations: context.config.github.organizations,
          days: context.days || 30,
        });
        await githubAgent.stop();
      } catch (error) {
        const errorMsg = `GitHub analysis failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}\n`);
        errors.push(errorMsg);
      }
    }

    // Run Azure DevOps analysis if configured
    if (context.config.azureDevOps?.pat) {
      console.log("\n🔍 Analyzing Azure DevOps organization...\n");
      try {
        const azdoAgent = new AzDOAnalyzerAgent(this.model);
        results.azdo = await azdoAgent.analyze({
          pat: context.config.azureDevOps.pat,
          organization: context.config.azureDevOps.organization,
          inactiveDays: context.config.thresholds?.inactiveDays || 90,
        });
        await azdoAgent.stop();
      } catch (error) {
        const errorMsg = `Azure DevOps analysis failed: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`❌ ${errorMsg}\n`);
        errors.push(errorMsg);
      }
    }

    // Combine results
    return this.combineResults(results, errors);
  }

  /**
   * Combine platform-specific results into unified report
   */
  private combineResults(results: PlatformResults, errors: string[]): string {
    let report = "# DevPlatform FinOps Analysis - Combined Report\n\n";
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    if (errors.length > 0) {
      report += "## ⚠️ Errors\n\n";
      errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += "\n";
    }

    const platforms = [];
    if (results.github) platforms.push("GitHub");
    if (results.azdo) platforms.push("Azure DevOps");
    
    if (platforms.length === 0) {
      report += "❌ No platform data available. Please check your configuration.\n";
      return report;
    }

    report += `**Platforms Analyzed:** ${platforms.join(", ")}\n\n`;
    report += "---\n\n";

    // GitHub section
    if (results.github) {
      report += "## GitHub Analysis\n\n";
      report += results.github;
      report += "\n\n---\n\n";
    }

    // Azure DevOps section
    if (results.azdo) {
      report += "## Azure DevOps Analysis\n\n";
      report += results.azdo;
      report += "\n\n---\n\n";
    }

    // Cross-platform recommendations
    if (results.github && results.azdo) {
      report += this.generateCrossPlatformRecommendations();
    }

    return report;
  }

  /**
   * Generate cross-platform optimization recommendations
   */
  private generateCrossPlatformRecommendations(): string {
    let section = "## Cross-Platform Optimization Opportunities\n\n";
    
    section += "### Consider These Platform Comparisons:\n\n";
    
    section += "1. **CI/CD Workload Distribution**\n";
    section += "   - Compare GitHub Actions vs Azure Pipelines usage\n";
    section += "   - Evaluate if workloads should be consolidated on one platform\n";
    section += "   - Consider GitHub Actions for open-source, Azure Pipelines for enterprise\n\n";
    
    section += "2. **Self-Hosted Runner Strategy**\n";
    section += "   - If using self-hosted agents on both platforms, consider unified infrastructure\n";
    section += "   - Shared runner pools can reduce overall infrastructure costs\n";
    section += "   - Evaluate container-based runners for flexibility\n\n";
    
    section += "3. **License and User Management**\n";
    section += "   - Cross-reference active users across both platforms\n";
    section += "   - Identify users who need access to both vs single platform\n";
    section += "   - Consider consolidated SSO and user provisioning\n\n";
    
    section += "4. **Storage and Artifacts**\n";
    section += "   - Compare artifact storage costs across platforms\n";
    section += "   - Consider unified artifact management strategy\n";
    section += "   - Evaluate GitHub Packages vs Azure Artifacts pricing\n\n";
    
    section += "### Next Steps\n\n";
    section += "1. Review platform-specific recommendations above\n";
    section += "2. Identify workloads that could benefit from migration\n";
    section += "3. Calculate ROI for platform consolidation\n";
    section += "4. Plan phased migration if consolidation is beneficial\n\n";

    return section;
  }
}
