import Handlebars from "handlebars";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScaffoldOptions } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");

export async function generateScaffold(
  options: ScaffoldOptions,
): Promise<string[]> {
  const outputDir =
    options.outputDir ?? path.join(process.cwd(), options.name);
  const createdFiles: string[] = [];
  const context = {
    name: options.name,
    serviceId: options.serviceId,
    accountId: options.accountId ?? "<YOUR_ACCOUNT_ID>",
    dbName: options.dbName ?? `${options.name}-db`,
    harnessKitVersion: "workspace:*",
  };

  await walkTemplates(TEMPLATES_DIR, outputDir, context, createdFiles);
  return createdFiles;
}

async function walkTemplates(
  templateDir: string,
  outputDir: string,
  context: Record<string, string>,
  createdFiles: string[],
): Promise<void> {
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(templateDir, entry.name);
    if (entry.isDirectory()) {
      const destDir = path.join(outputDir, entry.name);
      fs.mkdirSync(destDir, { recursive: true });
      await walkTemplates(srcPath, destDir, context, createdFiles);
    } else if (entry.name.endsWith(".hbs")) {
      const destName = entry.name.replace(".hbs", "");
      const destPath = path.join(outputDir, destName);
      const templateSrc = fs.readFileSync(srcPath, "utf-8");
      const compiled = Handlebars.compile(templateSrc);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, compiled(context));
      createdFiles.push(destPath);
    }
  }
}
