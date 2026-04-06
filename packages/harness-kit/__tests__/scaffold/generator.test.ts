import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { generateScaffold } from "../../src/scaffold/generator.js";

describe("Scaffold Generator", () => {
  const tmpDirs: string[] = [];

  function createTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it("should generate scaffold files", async () => {
    const outputDir = path.join(createTmpDir(), "test-service");
    const files = await generateScaffold({
      name: "test-service",
      serviceId: "gate-x",
      accountId: "abc123",
      outputDir,
    });

    expect(files.length).toBeGreaterThan(0);

    // Check key files exist
    expect(fs.existsSync(path.join(outputDir, "wrangler.toml"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "src", "index.ts"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "src", "app.ts"))).toBe(true);
  });

  it("should substitute template variables", async () => {
    const outputDir = path.join(createTmpDir(), "my-svc");
    await generateScaffold({
      name: "my-svc",
      serviceId: "launch-x",
      accountId: "acc-456",
      dbName: "my-svc-db",
      outputDir,
    });

    const wrangler = fs.readFileSync(path.join(outputDir, "wrangler.toml"), "utf-8");
    expect(wrangler).toContain('name = "my-svc"');
    expect(wrangler).toContain('account_id = "acc-456"');
    expect(wrangler).toContain('database_name = "my-svc-db"');

    const pkg = fs.readFileSync(path.join(outputDir, "package.json"), "utf-8");
    expect(pkg).toContain('"@ax-bd/my-svc"');

    const appTs = fs.readFileSync(path.join(outputDir, "src", "app.ts"), "utf-8");
    expect(appTs).toContain('"my-svc"');
    expect(appTs).toContain('"launch-x"');
  });

  it("should use default dbName when not specified", async () => {
    const outputDir = path.join(createTmpDir(), "svc");
    await generateScaffold({
      name: "svc",
      serviceId: "foundry-x",
      outputDir,
    });

    const wrangler = fs.readFileSync(path.join(outputDir, "wrangler.toml"), "utf-8");
    expect(wrangler).toContain('database_name = "svc-db"');
  });
});
