#!/usr/bin/env node
import { Command } from "commander";
import { createCommand } from "./create.js";

const program = new Command()
  .name("harness")
  .description("harness-kit CLI — AX BD 서비스 scaffold 생성")
  .version("0.1.0");

program.addCommand(createCommand);
program.parse();
