import { Command } from "commander";
import { generateScaffold } from "../scaffold/generator.js";
import type { ServiceId } from "../types.js";

const VALID_SERVICE_IDS: ServiceId[] = [
  "foundry-x",
  "discovery-x",
  "ai-foundry",
  "gate-x",
  "launch-x",
  "eval-x",
];

export const createCommand = new Command("create")
  .argument("<name>", "서비스명 (kebab-case)")
  .option("--service-id <id>", "서비스 ID", "foundry-x")
  .option("--account-id <id>", "Cloudflare Account ID")
  .option("--db-name <name>", "D1 Database 이름")
  .option("-o, --output <dir>", "출력 디렉토리")
  .action(async (name: string, opts) => {
    if (!VALID_SERVICE_IDS.includes(opts.serviceId)) {
      console.error(
        `Invalid service ID: ${opts.serviceId}. Valid: ${VALID_SERVICE_IDS.join(", ")}`,
      );
      process.exit(1);
    }

    console.log(`Creating service scaffold: ${name}...`);
    const files = await generateScaffold({
      name,
      serviceId: opts.serviceId as ServiceId,
      accountId: opts.accountId,
      dbName: opts.dbName,
      outputDir: opts.output,
    });
    console.log(`Created ${files.length} files:`);
    files.forEach((f) => console.log(`  ${f}`));
  });
