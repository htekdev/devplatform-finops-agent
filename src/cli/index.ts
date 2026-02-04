#!/usr/bin/env node

import { Command } from "commander";
import { createAnalyzeCommand } from "./commands/analyze.js";
import { createVersionCommand } from "./commands/version.js";

const program = new Command();

program
  .name("finops")
  .description("FinOps analyzer for GitHub and Azure DevOps platform costs")
  .version("0.1.0");

program.addCommand(createAnalyzeCommand());
program.addCommand(createVersionCommand());

program.parse(process.argv);
