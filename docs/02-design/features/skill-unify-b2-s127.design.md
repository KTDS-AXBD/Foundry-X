---
code: FX-DSGN-S127
title: "Sprint 127 Design — F306 DERIVED/CAPTURED → SKILL.md 자동 생성"
version: 1.0
status: Active
category: DSGN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-PLAN-S127]]"
---

# Sprint 127 Design — F306 SKILL.md 자동 생성

## 1. D1 마이그레이션

`packages/api/src/db/migrations/0089_skill_md_content.sql`:

```sql
-- F306: SKILL.md 콘텐츠 저장 컬럼
ALTER TABLE skill_registry ADD COLUMN skill_md_content TEXT;
ALTER TABLE skill_registry ADD COLUMN skill_md_generated_at TEXT;
```

기존 스키마 변경 최소화 — `skill_registry`에 2개 컬럼만 추가.

## 2. SkillMdGeneratorService

`packages/api/src/services/skill-md-generator.ts`:

```typescript
export class SkillMdGeneratorService {
  /**
   * SkillRegistryEntry + 후보 상세 → SKILL.md 텍스트 생성
   * ax-marketplace SKILL.md 포맷 호환
   */
  generate(params: {
    skillId: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    sourceType: string;
    promptTemplate?: string;
    version?: number;
  }): string {
    const frontmatter = [
      "---",
      `name: "${params.name}"`,
      `description: "${params.description ?? ""}"`,
      `version: "${params.version ?? 1}.0"`,
      `category: "${params.category}"`,
      `source: "${params.sourceType}"`,
      `tags: [${params.tags.map(t => `"${t}"`).join(", ")}]`,
      "---",
    ].join("\n");

    const body = [
      "",
      `# ${params.name}`,
      "",
      params.description ?? "",
      "",
      "## Steps",
      "",
    ];

    if (params.promptTemplate) {
      body.push("### 실행 프롬프트", "", params.promptTemplate, "");
    }

    body.push(
      "## Gotchas",
      "",
      `- 이 스킬은 ${params.sourceType} 소스에서 자동 생성되었어요.`,
      `- 생성 버전: v${params.version ?? 1}`,
    );

    return frontmatter + "\n" + body.join("\n");
  }
}
```

## 3. Deploy API

`packages/api/src/routes/skill-registry.ts`에 추가:

```typescript
// POST /skills/registry/:skillId/deploy — SKILL.md 생성 (F306, admin only)
skillRegistryRoute.post("/skills/registry/:skillId/deploy", async (c) => {
  const role = c.get("userRole");
  if (role !== "admin" && role !== "owner") {
    return c.json({ error: "Admin access required" }, 403);
  }

  const skillId = c.req.param("skillId");
  const body = await c.req.json().catch(() => ({}));
  const format = body.format ?? "preview";

  const registrySvc = new SkillRegistryService(c.env.DB);
  const entry = await registrySvc.getById(c.get("orgId"), skillId);
  if (!entry) {
    return c.json({ error: "Skill not found" }, 404);
  }

  const mdGenerator = new SkillMdGeneratorService();
  const skillMd = mdGenerator.generate({
    skillId: entry.skillId,
    name: entry.name,
    description: entry.description ?? "",
    category: entry.category,
    tags: entry.tags,
    sourceType: entry.sourceType,
    promptTemplate: entry.promptTemplate ?? undefined,
    version: entry.currentVersion,
  });

  // D1에 SKILL.md 캐시 저장
  await c.env.DB.prepare(
    "UPDATE skill_registry SET skill_md_content = ?, skill_md_generated_at = datetime('now') WHERE tenant_id = ? AND skill_id = ?"
  ).bind(skillMd, c.get("orgId"), skillId).run();

  if (format === "download") {
    return new Response(skillMd, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="SKILL.md"`,
      },
    });
  }

  return c.json({
    skillId,
    skillMd,
    fileName: `${skillId}/SKILL.md`,
    generatedAt: new Date().toISOString(),
  });
});
```

## 4. 리뷰→생성 자동 연동

### DerivedReviewService 확장

`packages/api/src/services/derived-review.ts` — `review()` 메서드 승인 분기에 추가:

```typescript
// 기존 승인 로직 뒤에:
if (input.decision === "approve") {
  // ... 기존 registry 등록 코드 ...

  // F306: SKILL.md 자동 생성
  const mdGenerator = new SkillMdGeneratorService();
  const skillMd = mdGenerator.generate({
    skillId: newSkillId,
    name: candidate.name,
    description: candidate.description,
    category: candidate.category,
    tags: parsedTags,
    sourceType: "derived",
    promptTemplate: candidate.prompt_template,
    version: 1,
  });

  await this.db.prepare(
    "UPDATE skill_registry SET skill_md_content = ?, skill_md_generated_at = datetime('now') WHERE tenant_id = ? AND skill_id = ?"
  ).bind(skillMd, tenantId, newSkillId).run();
}
```

### CapturedReviewService 동일 패턴

`packages/api/src/services/captured-review.ts`에도 동일한 SKILL.md 생성 로직 추가.

## 5. 스키마 확장

`packages/api/src/schemas/skill-registry.ts`에 추가:

```typescript
export const deploySkillSchema = z.object({
  format: z.enum(["preview", "download"]).optional().default("preview"),
});
```

## 6. 테스트

### skill-md-generator.test.ts

| 테스트 | 검증 |
|--------|------|
| 기본 생성 | frontmatter + body 구조 확인 |
| promptTemplate 포함 | 실행 프롬프트 섹션 존재 |
| tags 매핑 | 빈 tags / 여러 tags |
| category 반영 | YAML frontmatter에 카테고리 |

### skill-deploy.test.ts

| 테스트 | 검증 |
|--------|------|
| POST deploy (preview) | 200 + skillMd 문자열 |
| POST deploy (download) | markdown Content-Type |
| 존재하지 않는 skillId | 404 |
| 비admin | 403 |

## 7. 구현 순서 (autopilot용)

```
1. D1 migration 0089_skill_md_content.sql
2. SkillMdGeneratorService 서비스 구현
3. skill-md-generator.test.ts 테스트
4. deploySkillSchema 스키마 추가
5. POST /skills/registry/:skillId/deploy 라우트
6. skill-deploy.test.ts 테스트
7. DerivedReviewService → SKILL.md 생성 연동
8. CapturedReviewService → SKILL.md 생성 연동
9. typecheck + lint + test 전체 통과 확인
```
