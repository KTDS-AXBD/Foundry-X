import { describe, it, expect } from "vitest";
import { SkillMdGeneratorService } from "../src/services/skill-md-generator.js";

describe("SkillMdGeneratorService (F306)", () => {
  const svc = new SkillMdGeneratorService();

  it("기본 SKILL.md 생성 — frontmatter + body", () => {
    const md = svc.generate({
      skillId: "derived_abc",
      name: "Cost Analysis",
      description: "Analyzes project costs",
      category: "analysis",
      tags: ["cost", "finance"],
      sourceType: "derived",
    });

    expect(md).toContain("---");
    expect(md).toContain('name: "Cost Analysis"');
    expect(md).toContain('category: "analysis"');
    expect(md).toContain('source: "derived"');
    expect(md).toContain('tags: ["cost", "finance"]');
    expect(md).toContain('version: "1.0"');
    expect(md).toContain("# Cost Analysis");
    expect(md).toContain("Analyzes project costs");
    expect(md).toContain("## Gotchas");
    expect(md).toContain("derived 소스에서 자동 생성");
  });

  it("promptTemplate 포함 시 실행 프롬프트 섹션 생성", () => {
    const md = svc.generate({
      skillId: "derived_xyz",
      name: "Quick Audit",
      description: "Fast audit skill",
      category: "validation",
      tags: [],
      sourceType: "derived",
      promptTemplate: "Run audit on {{target}}",
    });

    expect(md).toContain("## Steps");
    expect(md).toContain("### 실행 프롬프트");
    expect(md).toContain("Run audit on {{target}}");
  });

  it("promptTemplate 없으면 Steps 섹션 없음", () => {
    const md = svc.generate({
      skillId: "captured_1",
      name: "Workflow Skill",
      description: "A captured workflow",
      category: "general",
      tags: ["workflow"],
      sourceType: "captured",
    });

    expect(md).not.toContain("## Steps");
    expect(md).not.toContain("### 실행 프롬프트");
  });

  it("빈 tags 배열 처리", () => {
    const md = svc.generate({
      skillId: "test_1",
      name: "Empty Tags",
      description: "No tags",
      category: "general",
      tags: [],
      sourceType: "custom",
    });

    expect(md).toContain("tags: []");
  });

  it("version 지정 시 반영", () => {
    const md = svc.generate({
      skillId: "test_v3",
      name: "Versioned Skill",
      description: "Has version",
      category: "bd-process",
      tags: ["bd"],
      sourceType: "derived",
      version: 3,
    });

    expect(md).toContain('version: "3.0"');
    expect(md).toContain("생성 버전: v3");
  });

  it("description에 쌍따옴표 포함 시 이스케이프", () => {
    const md = svc.generate({
      skillId: "test_esc",
      name: 'Skill "Alpha"',
      description: 'Uses "special" chars',
      category: "general",
      tags: [],
      sourceType: "derived",
    });

    expect(md).toContain('name: "Skill \\"Alpha\\""');
    expect(md).toContain('description: "Uses \\"special\\" chars"');
  });
});
