import type { HealthScore } from "@foundry-x/shared";
import type { GitHubService } from "../../../modules/portal/services/github.js";
import type { KVCacheService } from "../../../services/kv-cache.js";
import { parseSpecRequirements } from "../../../core/spec/services/spec-parser.js";

export class HealthCalculator {
  constructor(
    private github: GitHubService,
    private cache: KVCacheService,
  ) {}

  async calculate(): Promise<HealthScore> {
    return this.cache.getOrFetch(
      "health:score",
      async () => {
        const { content: specContent } =
          await this.github.getFileContent("SPEC.md");
        const requirements = parseSpecRequirements(specContent);
        const totalItems = requirements.length;
        const doneItems = requirements.filter(
          (r) => r.status === "done",
        ).length;
        const specToCode =
          totalItems > 0
            ? Math.round((doneItems / totalItems) * 100)
            : 0;

        const codeToTest = await this.calculateTestCoverage();

        const specToTest = Math.round((specToCode + codeToTest) / 2);
        const overall = Math.round(
          (specToCode + codeToTest + specToTest) / 3,
        );

        return {
          overall,
          specToCode,
          codeToTest,
          specToTest,
          grade: computeGrade(overall),
        };
      },
      120,
    );
  }

  private async calculateTestCoverage(): Promise<number> {
    try {
      const { content } =
        await this.github.getFileContent("package.json");
      const pkg = JSON.parse(content);
      return pkg.scripts?.test ? 75 : 30;
    } catch {
      return 50;
    }
  }
}

function computeGrade(
  score: number,
): HealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
