import type { FreshnessReport } from "@foundry-x/shared";
import type { GitHubService } from "../modules/portal/services/github.js";
import type { KVCacheService } from "./kv-cache.js";

const HARNESS_DOCS = ["CLAUDE.md", "SPEC.md", "docs/specs/prd-v4.md"];

export class FreshnessChecker {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService,
  ) {}

  async check(): Promise<FreshnessReport> {
    return this.cache.getOrFetch(
      "freshness:report",
      async () => {
        const documents: FreshnessReport["documents"] = [];

        const codeCommits = await this.github.getCommits("packages", 1);
        const codeLastCommit =
          codeCommits[0]?.commit.author.date ??
          new Date().toISOString();

        for (const docPath of HARNESS_DOCS) {
          try {
            const docCommits = await this.github.getCommits(
              docPath,
              1,
            );
            const lastModified =
              docCommits[0]?.commit.author.date ??
              new Date().toISOString();

            const staleDays = Math.floor(
              (new Date(codeLastCommit).getTime() -
                new Date(lastModified).getTime()) /
                (1000 * 60 * 60 * 24),
            );

            documents.push({
              file: docPath,
              lastModified,
              codeLastCommit,
              stale: staleDays > 7,
              staleDays: Math.max(0, staleDays),
            });
          } catch {
            // skip if file not found in git history
          }
        }

        const overallStale = documents.some((d) => d.stale);
        return {
          documents,
          overallStale,
          checkedAt: new Date().toISOString(),
        };
      },
      300,
    );
  }
}
