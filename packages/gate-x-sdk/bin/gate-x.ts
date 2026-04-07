#!/usr/bin/env node
import { Command } from "commander";
import { GateXClient, GateXRequestError } from "../src/index.js";

const program = new Command();

program
  .name("gate-x")
  .description("Gate-X CLI — TypeScript SDK for Gate-X API")
  .version("0.1.0")
  .option("--api-key <key>", "Gate-X API key (or set GATEX_API_KEY)")
  .option("--base-url <url>", "Gate-X base URL (or set GATEX_BASE_URL)")
  .option("--pretty", "Pretty-print JSON output");

function getClient(opts: { apiKey?: string; baseUrl?: string }) {
  const apiKey = opts.apiKey ?? process.env["GATEX_API_KEY"];
  const baseUrl = opts.baseUrl ?? process.env["GATEX_BASE_URL"];
  if (!apiKey) {
    console.error("Error: API key required. Use --api-key or set GATEX_API_KEY");
    process.exit(1);
  }
  return new GateXClient({ apiKey, baseUrl });
}

function output(data: unknown, pretty: boolean) {
  console.log(JSON.stringify(data, null, pretty ? 2 : undefined));
}

async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof GateXRequestError) {
      console.error(`Error ${e.status}: ${e.error}`);
      if (e.details) console.error(JSON.stringify(e.details, null, 2));
    } else {
      console.error((e as Error).message);
    }
    process.exit(1);
  }
}

// health
program
  .command("health")
  .description("Check Gate-X service health")
  .action(async () => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(await client.health(), opts.pretty ?? false);
    });
  });

// eval
const evalCmd = program.command("eval").description("Manage evaluations");

evalCmd
  .command("list")
  .description("List evaluations")
  .option("--status <status>", "Filter by status (draft|in_review|approved|rejected)")
  .option("--limit <n>", "Max results", "20")
  .option("--offset <n>", "Offset", "0")
  .action(async (cmdOpts: { status?: string; limit: string; offset: string }) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(
        await client.evaluations.list({
          status: cmdOpts.status as Parameters<typeof client.evaluations.list>[0]["status"],
          limit: Number(cmdOpts.limit),
          offset: Number(cmdOpts.offset),
        }),
        opts.pretty ?? false,
      );
    });
  });

evalCmd
  .command("create")
  .description("Create a new evaluation")
  .requiredOption("--title <title>", "Evaluation title")
  .requiredOption("--gate-type <type>", "Gate type (e.g. ax_bd)")
  .option("--biz-item-id <id>", "Linked biz item ID")
  .option("--description <desc>", "Description")
  .action(async (cmdOpts: { title: string; gateType: string; bizItemId?: string; description?: string }) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(
        await client.evaluations.create({
          title: cmdOpts.title,
          gateType: cmdOpts.gateType,
          bizItemId: cmdOpts.bizItemId,
          description: cmdOpts.description,
        }),
        opts.pretty ?? false,
      );
    });
  });

evalCmd
  .command("status <evalId> <status>")
  .description("Update evaluation status")
  .option("--reason <reason>", "Status change reason")
  .action(async (evalId: string, status: string, cmdOpts: { reason?: string }) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(
        await client.evaluations.updateStatus(
          evalId,
          status as Parameters<typeof client.evaluations.updateStatus>[1],
          cmdOpts.reason,
        ),
        opts.pretty ?? false,
      );
    });
  });

evalCmd
  .command("get <evalId>")
  .description("Get evaluation by ID")
  .action(async (evalId: string) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(await client.evaluations.get(evalId), opts.pretty ?? false);
    });
  });

// gate-package
const gpCmd = program.command("gate-package").description("Manage gate packages");

gpCmd
  .command("get <bizItemId>")
  .description("Get gate package")
  .action(async (bizItemId: string) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(await client.gatePackage.get(bizItemId), opts.pretty ?? false);
    });
  });

gpCmd
  .command("download <bizItemId>")
  .description("Get gate package download URL")
  .action(async (bizItemId: string) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(await client.gatePackage.download(bizItemId), opts.pretty ?? false);
    });
  });

// ogd
const ogdCmd = program.command("ogd").description("O-G-D pipeline operations");

ogdCmd
  .command("run")
  .description("Run O-G-D pipeline")
  .requiredOption("--content <text>", "Content to validate")
  .option("--rubric <text>", "Validation rubric")
  .option("--max-iterations <n>", "Max iterations", "3")
  .option("--model <provider>", "LLM provider (anthropic|openai|google)", "anthropic")
  .action(async (cmdOpts: { content: string; rubric?: string; maxIterations: string; model: string }) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(
        await client.ogd.run({
          content: cmdOpts.content,
          rubric: cmdOpts.rubric,
          maxIterations: Number(cmdOpts.maxIterations),
          modelProvider: cmdOpts.model as Parameters<typeof client.ogd.run>[0]["modelProvider"],
        }),
        opts.pretty ?? false,
      );
    });
  });

ogdCmd
  .command("status <jobId>")
  .description("Get O-G-D job status")
  .action(async (jobId: string) => {
    const opts = program.opts<{ apiKey?: string; baseUrl?: string; pretty?: boolean }>();
    await run(async () => {
      const client = getClient(opts);
      output(await client.ogd.getStatus(jobId), opts.pretty ?? false);
    });
  });

program.parse();
