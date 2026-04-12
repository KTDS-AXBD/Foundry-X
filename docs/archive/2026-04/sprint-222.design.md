---
code: FX-DSGN-S222
title: "Sprint 222 Design — Prototype 자동 생성 + 등록"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 222: Prototype 자동 생성 + 등록 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F457 (Prototype Builder) + F458 (Prototype 등록 + Offering 연동) |
| Sprint | 222 |
| 핵심 전략 | 기존 prototype_jobs 파이프라인 활용 + biz_items JOIN으로 gap 해소 |
| 참조 | [[FX-PLAN-S222]], prototype-service.ts, prototype-job-service.ts |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | PRD → Prototype 수동 전환, Offering 연동 누락, biz item 이름 미표시 |
| Solution | Job Queue 기반 자동 생성 + offering_prototypes 자동 연결 + JOIN 쿼리 |
| Function UX Effect | Prototype 목록/상세에서 출처와 연결 Offering을 즉시 확인 |
| Core Value | 형상화 파이프라인 완결 — PRD 확정 → Prototype 생성 → Portfolio 반영 자동화 |

---

## 1. API 변경 사항

### 1.1 기존 엔드포인트 (수정)

#### GET /ax-bd/prototypes — 목록 (biz item 이름 추가)

**파일**: `packages/api/src/core/harness/services/prototype-service.ts`

```typescript
// 변경: biz_items JOIN으로 bizItemTitle 추가
async list(orgId: string, opts: ListOpts): Promise<{ items: PrototypeListItem[]; total: number }> {
  const rows = await this.db.prepare(`
    SELECT p.*, bi.title AS biz_item_title
    FROM prototypes p
    JOIN biz_items bi ON bi.id = p.biz_item_id
    WHERE bi.org_id = ?
    ORDER BY p.generated_at DESC
    LIMIT ? OFFSET ?
  `).bind(orgId, opts.limit, opts.offset).all<ProtoRow & { biz_item_title: string }>();
  // ...
}
```

**응답 추가 필드**:
```typescript
export interface PrototypeListItem {
  id: string;
  bizItemId: string;
  bizItemTitle: string;  // ← 신규 (gap H4 해소)
  version: number;
  format: string;
  templateUsed: string | null;
  generatedAt: string;
}
```

#### GET /ax-bd/prototypes/:id — 상세 (biz item 이름 + Offering 연결)

```typescript
// 변경: biz_items JOIN + offering_prototypes 서브쿼리
export interface PrototypeDetail extends PrototypeListItem {
  content: string;
  modelUsed: string | null;
  tokensUsed: number;
  pocEnv: PocEnvDetail | null;
  techReview: TechReviewDetail | null;
  linkedOfferings: LinkedOffering[];  // ← 신규
}

interface LinkedOffering {
  offeringId: string;
  offeringTitle: string;
}
```

**서비스 쿼리**:
```sql
SELECT o.id AS offering_id, o.title AS offering_title
FROM offering_prototypes op
JOIN offerings o ON o.id = op.offering_id
WHERE op.prototype_id = ?
```

### 1.2 신규 엔드포인트

#### POST /ax-bd/prototypes/build — Prototype Builder 실행

**파일**: `packages/api/src/core/shaping/routes/ax-bd-prototypes.ts`

```typescript
// 신규: PRD 기반 Prototype 생성 요청
axBdPrototypesRoute.post("/ax-bd/prototypes/build", async (c) => {
  const body = await c.req.json();
  const parsed = PrototypeBuildSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid", details: parsed.error.flatten() }, 400);

  const jobSvc = new PrototypeJobService(c.env.DB);
  const job = await jobSvc.create({
    orgId: c.get("orgId"),
    prdContent: parsed.data.prdContent,
    prdTitle: parsed.data.prdTitle,
    bizItemId: parsed.data.bizItemId,
    builderType: parsed.data.builderType || "cli",
  });
  return c.json(job, 201);
});
```

**Zod 스키마** (`packages/api/src/core/harness/schemas/prototype-build.ts`):
```typescript
import { z } from "zod";

export const PrototypeBuildSchema = z.object({
  prdContent: z.string().min(100, "PRD 내용이 너무 짧아요"),
  prdTitle: z.string().min(1),
  bizItemId: z.string().min(1),
  builderType: z.enum(["cli", "api", "ensemble"]).default("cli"),
});
```

#### POST /ax-bd/prototypes/:id/link-offering — Offering 연결

```typescript
// 신규: Prototype ↔ Offering 연결
axBdPrototypesRoute.post("/ax-bd/prototypes/:id/link-offering", async (c) => {
  const { offeringId } = await c.req.json();
  if (!offeringId) return c.json({ error: "offeringId required" }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO offering_prototypes (id, offering_id, prototype_id)
    VALUES (?, ?, ?)
  `).bind(id, offeringId, c.req.param("id")).run();

  return c.json({ id, offeringId, prototypeId: c.req.param("id") }, 201);
});
```

---

## 2. DB 변경 사항

### 2.1 기존 테이블 (변경 없음)

| 테이블 | 상태 | 비고 |
|--------|------|------|
| prototypes | 유지 | biz_item_id FK로 이미 연결 |
| prototype_jobs | 유지 | queued→building→live 흐름 그대로 |
| offering_prototypes | 유지 | F382에서 생성, 이번에 실제 데이터 투입 |

### 2.2 마이그레이션

**신규 마이그레이션 불필요** — 기존 스키마로 충분해요. 주요 활용:

- `prototypes`: Deny v2 (version=2) + 추가 1건 (version=1) INSERT
- `prototype_jobs`: 2건 job INSERT (status flow 추적)
- `offering_prototypes`: 2건 연결 INSERT

---

## 3. Prototype Builder 흐름

### 3.1 시퀀스 다이어그램

```
Client → POST /ax-bd/prototypes/build
  → PrototypeJobService.create() → prototype_jobs (queued)
  → PrototypeJobService.transition(building)
  → LLM API 호출 (PRD → HTML/React 코드 생성)
     ├── 성공 → prototypes INSERT + R2 업로드
     │        → transition(deploying → live)
     │        → POST /link-offering (자동)
     └── 실패 → transition(failed)
              → retry (max 3) or dead_letter
```

### 3.2 LLM 생성 전략

| 항목 | 값 |
|------|-----|
| 1차 모델 | claude-3-5-haiku (비용 최적) |
| fallback 모델 | claude-3-5-sonnet (품질 우선) |
| 프롬프트 | PRD title + 핵심 기능 목록 + "HTML single-page prototype" 지시 |
| 출력 형식 | HTML (self-contained, inline CSS/JS) |
| 최대 토큰 | 8192 |
| retry | 최대 3회 (prototype-fallback.ts 기존 로직) |

### 3.3 대상 아이템

| # | biz_item_id | 이름 | Prototype 버전 | 비고 |
|---|-------------|------|---------------|------|
| 1 | bi-deny-semi-001 | Deny Semi | v2 | 기존 v1 개선 — PRD v3 반영 |
| 2 | (확정 필요) | KOAMI or XR | v1 | Sprint 221 PRD 기반 신규 생성 |

---

## 4. UI 컴포넌트 변경

### 4.1 Prototype 목록 (`shaping-prototype.tsx`)

**변경 사항**:

```typescript
// 기존 PrototypeItem에 bizItemTitle 추가
interface PrototypeItem {
  id: string;
  bizItemId: string;
  bizItemTitle: string;  // ← 신규
  version: number;
  format: string;
  templateUsed: string | null;
  generatedAt: string;
}

// 목록 카드에 biz item 이름 표시
<div className="proto-card">
  <h3>{proto.bizItemTitle}</h3>           {/* gap H4 해소 */}
  <Badge>{`v${proto.version}`}</Badge>
  <span>{proto.format}</span>
</div>
```

### 4.2 Prototype 상세 (선택 시 패널)

**변경 사항**:

```typescript
// 상세 패널에 Offering 링크 추가
{detail.linkedOfferings.length > 0 && (
  <div className="linked-offerings">
    <h4>연결된 Offering</h4>
    {detail.linkedOfferings.map(o => (
      <a key={o.offeringId} href={`/offering/${o.offeringId}`}>
        {o.offeringTitle}
      </a>
    ))}
  </div>
)}
```

### 4.3 ReviewSummaryBar 분모 수정 (gap M5)

**파일**: `packages/web/src/components/feature/hitl/ReviewSummaryBar.tsx`

```typescript
// 변경: total을 PROTOTYPE_SECTIONS.length 기반으로 계산 (서버 반환값이 아닌 실제 섹션 수)
// 기존: summary.total (서버 반환 — 리뷰 작성된 건수만 카운트)
// 수정: Math.max(summary.total, PROTOTYPE_SECTIONS.length)
const denominator = Math.max(summary.total, PROTOTYPE_SECTIONS.length);
const progressPct = Math.round((summary.approved / denominator) * 100);
```

---

## 5. 파일 변경 요약

### 수정 파일

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `packages/api/src/core/harness/services/prototype-service.ts` | list/getById에 biz_items JOIN + linkedOfferings 쿼리 |
| 2 | `packages/api/src/core/shaping/routes/ax-bd-prototypes.ts` | POST /build, POST /:id/link-offering 2개 엔드포인트 추가 |
| 3 | `packages/web/src/routes/shaping-prototype.tsx` | bizItemTitle 표시 + linkedOfferings 링크 + 타입 갱신 |
| 4 | `packages/web/src/components/feature/hitl/ReviewSummaryBar.tsx` | 진행률 분모 계산 수정 |

### 신규 파일

| # | 파일 | 내용 |
|---|------|------|
| 5 | `packages/api/src/core/harness/schemas/prototype-build.ts` | PrototypeBuildSchema (Zod) |

### 테스트 파일

| # | 파일 | 검증 내용 |
|---|------|----------|
| 6 | `packages/api/src/core/harness/services/__tests__/prototype-service.test.ts` | bizItemTitle JOIN, linkedOfferings 쿼리 |
| 7 | `packages/api/src/core/shaping/routes/__tests__/ax-bd-prototypes.test.ts` | POST /build 201 + POST /link-offering 201 |
| 8 | `packages/web/src/components/feature/hitl/__tests__/ReviewSummaryBar.test.tsx` | 분모 계산 정확성 |

---

## 6. 검증 기준 (Design ↔ Implementation)

| # | 검증 항목 | 판정 기준 | 우선순위 |
|---|----------|----------|---------|
| D1 | Deny v2 Prototype 생성 | prototypes 테이블에 biz_item_id=bi-deny-semi-001, version=2 존재 | Must |
| D2 | 추가 1건 Prototype 생성 | prototypes 테이블에 신규 biz_item_id, version=1 존재 | Must |
| D3 | prototype_jobs 2건 live | status=live, cost_usd > 0 | Must |
| D4 | offering_prototypes 2건 연결 | offering_id + prototype_id 매핑 정확 | Must |
| D5 | UI 목록에 bizItemTitle 표시 | /shaping/prototype 페이지에서 biz item 이름 확인 | Must |
| D6 | UI 상세에 Offering 링크 | 클릭 시 /offering/:id 이동 | Should |
| D7 | ReviewSummaryBar 분모 정확 | approved / max(total, sections.length) 비율 | Must |
| D8 | API 테스트 통과 | build + link-offering 엔드포인트 201 응답 | Must |
| D9 | R2 업로드 완료 | content에 R2 URL 또는 inline HTML 존재 | Should |

**목표 일치율**: 90% 이상 (Must 7건 + Should 2건 중 Must 전체 + Should 1건 이상)
