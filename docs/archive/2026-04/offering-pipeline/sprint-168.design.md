---
code: FX-DSGN-S168
title: "Sprint 168 Design — Offering Export API + Validate API"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S168]], [[FX-SPEC-001]]"
---

# Sprint 168 Design: Offering Export API + Validate API

## 1. Overview

Sprint 167에서 구축한 Offering CRUD + Sections 인프라 위에 두 가지 핵심 API를 추가한다:
- **F372 Export API** — 섹션을 HTML로 조합하여 렌더링
- **F373 Validate API** — O-G-D Generic Runner(F360)를 활용한 교차검증

## 2. F372: Offering Export API

### 2-1. API 설계

```
GET /api/offerings/:id/export?format=html
```

| 항목 | 값 |
|------|------|
| Method | GET |
| Path | /offerings/:id/export |
| Query | format: "html" (기본값, 향후 "pdf" 확장) |
| Auth | JWT + org tenant |
| Response | `Content-Type: text/html`, 200 |
| Error | 404 (offering not found), 400 (invalid format) |

### 2-2. HTML 렌더링 구조

```
<!DOCTYPE html>
<html>
<head>
  <style>
    :root { /* design tokens → CSS variables */ }
    /* base 스타일 */
  </style>
</head>
<body>
  <div class="offering-doc">
    <!-- 섹션별 컴포넌트 (is_included=true만) -->
    <section data-key="hero">...</section>
    <section data-key="exec_summary">...</section>
    ...
  </div>
</body>
</html>
```

**렌더링 규칙**:
1. `offering_sections`에서 `is_included = 1`인 섹션만 포함
2. `sort_order` 순서대로 배치
3. `offering_design_tokens`에서 CSS variable 생성
4. 각 섹션: `<section data-key="{section_key}" class="offering-section">` 래퍼
5. `content`가 null이면 빈 placeholder 표시
6. 마크다운 content → HTML 변환 (간단한 규칙 기반, DOM 파서 불필요)

### 2-3. 스키마

```typescript
// offering-export.schema.ts
export const ExportFormatSchema = z.enum(["html"]);
export const ExportQuerySchema = z.object({
  format: ExportFormatSchema.default("html"),
});
```

### 2-4. 서비스

```typescript
// offering-export-service.ts
export class OfferingExportService {
  constructor(private db: D1Database) {}

  async exportHtml(orgId: string, offeringId: string): Promise<string | null>
  // 1. offering 존재 확인 (org 검증)
  // 2. sections 조회 (is_included=1, sort_order ASC)
  // 3. design_tokens 조회 → CSS variables
  // 4. offering 메타 + sections + tokens → HTML 조합
}
```

### 2-5. 라우트

```typescript
// offering-export.ts (routes)
offeringExportRoute.get("/offerings/:id/export", async (c) => {
  // ExportQuerySchema 검증
  // OfferingExportService.exportHtml() 호출
  // Content-Type: text/html 반환
});
```

## 3. F373: Offering Validate API

### 3-1. API 설계

```
POST /api/offerings/:id/validate
GET  /api/offerings/:id/validations
```

**POST /offerings/:id/validate**

| 항목 | 값 |
|------|------|
| Method | POST |
| Path | /offerings/:id/validate |
| Body | `{ mode?: "full" \| "quick" }` |
| Auth | JWT + org tenant |
| Response | 201, 검증 결과 JSON |
| Error | 404 (offering not found), 409 (validation already running) |

**GET /offerings/:id/validations**

| 항목 | 값 |
|------|------|
| Method | GET |
| Path | /offerings/:id/validations |
| Auth | JWT + org tenant |
| Response | 200, 검증 히스토리 배열 |

### 3-2. D1 마이그레이션

```sql
-- 0111_offering_validations.sql
CREATE TABLE IF NOT EXISTS offering_validations (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'full' CHECK(mode IN ('full','quick')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK(status IN ('running','passed','failed','error')),
  ogd_run_id TEXT,
  gan_score REAL,
  gan_feedback TEXT,
  sixhats_summary TEXT,
  expert_summary TEXT,
  overall_score REAL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_validations_offering
  ON offering_validations(offering_id, created_at DESC);
```

### 3-3. 검증 파이프라인

```
POST /offerings/:id/validate
  ↓
[1] Offering + Sections 조회
  ↓
[2] 섹션 콘텐츠를 검증 입력으로 구성
  ↓
[3] O-G-D Generic Runner (offering-validate 도메인) 호출
    ├── Generator: 섹션 내용 기반 개선 제안 생성
    └── Discriminator: 7개 표준 질문 기반 품질 평가
  ↓
[4] offering_validations 테이블에 결과 저장
  ↓
[5] offering.status → 'review' 자동 전환 (optional)
```

### 3-4. OfferingValidateAdapter (DomainAdapterInterface 구현)

```typescript
// adapters/offering-validate-ogd-adapter.ts
export class OfferingValidateOgdAdapter implements DomainAdapterInterface {
  readonly domain = "offering-validate";
  readonly displayName = "Offering 교차검증";
  readonly description = "사업기획서 섹션 내용의 논리적 정합성과 완성도를 평가합니다.";

  constructor(private ai: Ai) {}

  async generate(input: unknown, feedback?: string): Promise<{ output: unknown }>
  // 섹션 내용 분석 → 개선 포인트 생성

  async discriminate(output: unknown, rubric: string): Promise<{ score, feedback, pass }>
  // 7개 표준 질문 기반 평가 (0~1 점수)

  getDefaultRubric(): string
  // "사업성 교차검증" 루브릭 반환
}
```

### 3-5. 스키마

```typescript
// offering-validate.schema.ts
export const ValidateOfferingSchema = z.object({
  mode: z.enum(["full", "quick"]).default("full"),
});

export interface OfferingValidation {
  id: string;
  offeringId: string;
  orgId: string;
  mode: "full" | "quick";
  status: "running" | "passed" | "failed" | "error";
  ogdRunId: string | null;
  ganScore: number | null;
  ganFeedback: string | null;
  sixhatsSummary: string | null;
  expertSummary: string | null;
  overallScore: number | null;
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
}
```

### 3-6. 서비스

```typescript
// offering-validate-service.ts
export class OfferingValidateService {
  constructor(private db: D1Database) {}

  async startValidation(orgId, offeringId, userId, mode): Promise<OfferingValidation>
  // 1. offering 존재 확인
  // 2. offering_validations INSERT (status=running)
  // 3. sections 조회 → 검증 입력 구성
  // 4. OgdGenericRunner.run() 호출 (도메인: offering-validate)
  // 5. 결과로 validation row UPDATE
  // 6. 반환

  async listValidations(orgId, offeringId): Promise<OfferingValidation[]>
}
```

## 4. 파일 목록

### 신규 파일
| 파일 | 설명 |
|------|------|
| `schemas/offering-export.schema.ts` | Export Zod 스키마 |
| `schemas/offering-validate.schema.ts` | Validate Zod 스키마 + OfferingValidation 타입 |
| `services/offering-export-service.ts` | HTML 렌더링 서비스 |
| `services/offering-validate-service.ts` | 교차검증 서비스 |
| `services/adapters/offering-validate-ogd-adapter.ts` | O-G-D 어댑터 |
| `routes/offering-export.ts` | Export 라우트 |
| `routes/offering-validate.ts` | Validate 라우트 |
| `db/migrations/0111_offering_validations.sql` | D1 마이그레이션 |
| `__tests__/offerings-export.test.ts` | Export 테스트 |
| `__tests__/offerings-validate.test.ts` | Validate 테스트 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `app.ts` | 2개 라우트 import + 등록 |
| `__tests__/helpers/mock-d1.ts` | offering_validations 테이블 CREATE 추가 |

## 5. Worker 파일 매핑

### Worker 1: Export API (F372)
- `packages/api/src/schemas/offering-export.schema.ts`
- `packages/api/src/services/offering-export-service.ts`
- `packages/api/src/routes/offering-export.ts`
- `packages/api/src/__tests__/offerings-export.test.ts`

### Worker 2: Validate API (F373)
- `packages/api/src/db/migrations/0111_offering_validations.sql`
- `packages/api/src/schemas/offering-validate.schema.ts`
- `packages/api/src/services/offering-validate-service.ts`
- `packages/api/src/services/adapters/offering-validate-ogd-adapter.ts`
- `packages/api/src/routes/offering-validate.ts`
- `packages/api/src/__tests__/offerings-validate.test.ts`

### 공통 (리더)
- `packages/api/src/app.ts` — 라우트 등록
- `packages/api/src/__tests__/helpers/mock-d1.ts` — 테이블 추가

## 6. 테스트 계획

### F372 Export 테스트
1. GET /offerings/:id/export — 200 HTML 반환
2. HTML에 is_included=true 섹션만 포함
3. HTML에 design tokens CSS variable 포함
4. 존재하지 않는 offering — 404
5. 잘못된 format — 400

### F373 Validate 테스트
1. POST /offerings/:id/validate — 201 검증 결과
2. GET /offerings/:id/validations — 200 히스토리
3. 존재하지 않는 offering — 404
4. mode=quick 동작 확인
5. O-G-D 어댑터 mock 테스트
