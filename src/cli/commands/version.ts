import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createVersionCommand(): Command {
  const command = new Command("version");

  command
    .description("Display version information")
    .action(() => {
      const packageJsonPath = path.join(__dirname, "../../../package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      console.log(`finops-analyzer v${packageJson.version}`);
    });

  return command;
}
