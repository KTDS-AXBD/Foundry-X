import type { HarnessIntegrity, IntegrityCheck } from "@foundry-x/shared";
import type { GitHubService } from "../../../modules/portal/services/github.js";
import type { KVCacheService } from "../../../services/kv-cache.js";

const REQUIRED_FILES = [
  { path: "CLAUDE.md", name: "CLAUDE.md exists", required: true },
  {
    path: ".github/workflows/deploy.yml",
    name: "CI/CD pipeline",
    required: true,
  },
  { path: "package.json", name: "Package manifest", required: true },
  { path: "tsconfig.json", name: "TypeScript config", required: false },
  { path: "eslint.config.js", name: "ESLint config", required: false },
];

export class IntegrityChecker {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService,
  ) {}

  async check(): Promise<HarnessIntegrity> {
    return this.cache.getOrFetch(
      "integrity:checks",
      async () => {
        const checks: IntegrityCheck[] = [];

        for (const file of REQUIRED_FILES) {
          const exists = await this.github.fileExists(file.path);
          checks.push({
            name: file.name,
            passed: exists,
            level: exists ? "PASS" : file.required ? "FAIL" : "WARN",
            message: exists
              ? `${file.path} confirmed`
              : `${file.path} ${file.required ? "required file missing" : "recommended file missing"}`,
          });
        }

        try {
          const { content } =
            await this.github.getFileContent("CLAUDE.md");
          const hasProjectOverview =
            content.includes("## Project Overview");
          const hasDevCommands = content.includes(
            "## Development Commands",
          );
          checks.push({
            name: "CLAUDE.md required sections",
            passed: hasProjectOverview && hasDevCommands,
            level:
              hasProjectOverview && hasDevCommands ? "PASS" : "WARN",
            message:
              hasProjectOverview && hasDevCommands
                ? "Project Overview + Development Commands sections confirmed"
                : "Missing required sections",
          });
        } catch {
          // skip content check if file read fails
        }

        const passedCount = checks.filter((c) => c.passed).length;
        const score = Math.round((passedCount / checks.length) * 100);

        return {
          passed: checks.every((c) => c.level !== "FAIL"),
          score,
          checks,
        };
      },
      300,
    );
  }
}
