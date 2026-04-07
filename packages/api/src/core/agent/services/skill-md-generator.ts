/**
 * F306: SkillMdGeneratorService — 승인된 스킬을 SKILL.md 포맷으로 렌더링
 * ax-marketplace SKILL.md 포맷 호환 (YAML frontmatter + Markdown body)
 */

export interface SkillMdParams {
  skillId: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  sourceType: string;
  promptTemplate?: string;
  version?: number;
}

export class SkillMdGeneratorService {
  generate(params: SkillMdParams): string {
    const version = params.version ?? 1;
    const tagsStr = params.tags.length > 0
      ? params.tags.map((t) => `"${t}"`).join(", ")
      : "";

    const lines: string[] = [
      "---",
      `name: "${escapeFrontmatter(params.name)}"`,
      `description: "${escapeFrontmatter(params.description)}"`,
      `version: "${version}.0"`,
      `category: "${params.category}"`,
      `source: "${params.sourceType}"`,
      `tags: [${tagsStr}]`,
      "---",
      "",
      `# ${params.name}`,
      "",
      params.description,
      "",
    ];

    if (params.promptTemplate) {
      lines.push(
        "## Steps",
        "",
        "### 실행 프롬프트",
        "",
        params.promptTemplate,
        "",
      );
    }

    lines.push(
      "## Gotchas",
      "",
      `- 이 스킬은 ${params.sourceType} 소스에서 자동 생성되었어요.`,
      `- 생성 버전: v${version}`,
      "",
    );

    return lines.join("\n");
  }
}

function escapeFrontmatter(value: string): string {
  return value.replace(/"/g, '\\"');
}
