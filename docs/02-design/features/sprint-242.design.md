---
code: FX-DSGN-S242
title: "Sprint 242 Design — F493 발굴 평가결과서 v2"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-09
updated: 2026-04-09
author: Claude Opus 4.6 (master)
sprint: 242
f_items: [F493]
---

# Sprint 242 Design — F493 발굴 평가결과서 v2

## 1. 데이터 모델

### 1.1 D1 스키마 확장 (0123)

```sql
-- packages/api/src/db/migrations/0124_evaluation_reports_v2.sql
ALTER TABLE evaluation_reports ADD COLUMN report_data TEXT;
-- nullable JSON blob. null이면 레거시 v1 (skill_scores 사용), 존재하면 v2 (report_data 사용)
CREATE INDEX IF NOT EXISTS idx_eval_reports_biz_item ON evaluation_reports(org_id, biz_item_id);
```

번호는 `ls packages/api/src/db/migrations/*.sql | sort | tail -1` 로 확정.

### 1.2 Zod 스키마 (DiscoveryReportData)

`packages/api/src/modules/gate/schemas/evaluation-report.schema.ts`에 추가:

```ts
import { z } from "zod";

// 공통 빌딩 블록
const TagSchema = z.object({
  label: z.string(),
  color: z.enum(["mint", "blue", "amber", "red", "purple"]),
});

const MetricSchema = z.object({
  value: z.string(),       // "2,341억" / "7,000억"
  label: z.string(),       // "거래액 (2025)"
  color: z.enum(["default", "mint", "blue", "amber", "red", "purple"]).optional(),
});

const TableRowSchema = z.object({
  cells: z.array(z.string()),
  highlight: z.boolean().optional(),
});

const TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(TableRowSchema),
  caption: z.string().optional(),
});

const CardSchema = z.object({
  icon: z.string().optional(),           // emoji or name
  iconColor: z.enum(["mint", "blue", "amber", "red", "purple"]).optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.string().optional(),           // markdown
  metrics: z.array(MetricSchema).optional(),
  table: TableSchema.optional(),
});

const InsightBoxSchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const NextStepSchema = z.object({
  text: z.string(),
});

const ChartDataSchema = z.object({
  type: z.enum(["bar", "doughnut", "line"]),
  labels: z.array(z.string()),
  datasets: z.array(z.object({
    label: z.string(),
    data: z.array(z.number()),
    backgroundColor: z.array(z.string()).optional(),
  })),
});

// 탭 공통 스키마
const TabSchema = z.object({
  stepNumber: z.string(),                // "STEP 2-1"
  title: z.string(),                     // "레퍼런스 분석"
  engTitle: z.string().optional(),       // "Benchmark Deconstruction"
  subtitle: z.string().optional(),       // 인용구
  hitlVerified: z.boolean().default(false),
  tags: z.array(TagSchema).optional(),
  cards: z.array(CardSchema),
  chart: ChartDataSchema.optional(),
  insight: InsightBoxSchema.optional(),
  nextStep: NextStepSchema.optional(),
});

// 9탭 전체
export const DiscoveryReportDataSchema = z.object({
  version: z.literal("v2"),
  bizItemId: z.string(),
  bizItemTitle: z.string(),
  typeCode: z.enum(["I", "M", "P", "T", "S"]).optional(),
  subtitle: z.string().optional(),       // "AI 사업개발 2단계 발굴 리포트 — KOAMI"
  tabs: z.object({
    "2-1": TabSchema,                    // 레퍼런스 분석
    "2-2": TabSchema,                    // 수요 시장 검증
    "2-3": TabSchema,                    // 경쟁·자사 분석
    "2-4": TabSchema,                    // 사업 아이템 도출
    "2-5": TabSchema,                    // 핵심 아이템 선정 (Commit Gate)
    "2-6": TabSchema,                    // 타겟 고객 정의
    "2-7": TabSchema,                    // 비즈니스 모델 정의
    "2-8": TabSchema,                    // 발굴 결과 패키징
    "2-9": TabSchema,                    // AI 멀티 페르소나 사전 평가
  }),
  summary: z.object({
    executiveSummary: z.string(),        // 5문장 요약
    trafficLight: z.enum(["green", "yellow", "red"]),
    goHoldDrop: z.enum(["Go", "Hold", "Drop"]),
    recommendation: z.string(),
  }),
});

export type DiscoveryReportData = z.infer<typeof DiscoveryReportDataSchema>;
```

### 1.3 API 응답 변경

`EvaluationReport` 인터페이스에 `reportData: DiscoveryReportData | null` 필드 추가.
- v2 존재 → 프론트가 리치 9탭 렌더
- null → 레거시 v1 렌더 (스킬 점수 카드)

## 2. Fixture 전략

### 2.1 파일 구조

```
packages/api/src/fixtures/discovery-reports/
├── bi-koami-001.json          # 산업 공급망 의사결정 AI (KOAMI)
├── bi-xr-studio-001.json      # XR Exhibition Studio (AI 도슨트 VR 전시)
└── bi-iris-001.json           # IRIS 내부 보안 위험 식별 AI
```

각 파일은 `DiscoveryReportDataSchema`를 만족하는 JSON.

### 2.2 콘텐츠 가이드라인 (Sonnet이 참고)

**필수 준수 사항:**
- 9탭 모두 최소 2개 카드 포함
- 2-2 (시장 검증)에는 반드시 TAM/SAM/SOM 3-metric 카드 + Chart.js bar
- 2-5 (아이템 선정)에 Commit Gate 4개 질문 + 답변 1문장씩
- 2-6 (타겟 고객)에 페르소나 카드 최소 1개
- 2-7 (BM 정의)에 수익 모델 카드 + Unit Economics 표
- 2-8 (패키징)에 Executive Summary 5문장 + Validation Experiment Plan 표
- 2-9 (페르소나 평가)에 내부 페르소나 최소 3명의 Go/Hold/Drop 코멘트
- `summary.executiveSummary`: 5문장 (문제/솔루션/시장/Why Us/BM)
- `summary.trafficLight`: green/yellow/red 1개
- `summary.goHoldDrop`: Go/Hold/Drop 1개

**콘텐츠 소스:**
- `biz_items.description` (prod D1 조회)
- 3개 아이템에 대한 일반 도메인 지식 (업종 공급망 AI, XR 전시, 내부 보안)
- 샘플 HTML(Fooding AI)은 **구조만 참고**, 내용 복사 금지

**분량 목표:**
- 각 fixture JSON 파일 500~900줄 (한국어 콘텐츠 기준)

## 3. API 변경

### 3.1 Service

```ts
// packages/api/src/modules/gate/services/evaluation-report-service.ts

export class EvaluationReportService {
  // 신규 v2 메서드
  async generateFromFixture(
    orgId: string,
    userId: string,
    bizItemId: string,
    fixtureData: DiscoveryReportData,  // 파일에서 읽어 주입
  ): Promise<EvaluationReport> {
    const id = `eval-${bizItemId}-v1`;
    const now = new Date().toISOString();
    const trafficLight = fixtureData.summary.trafficLight;
    
    // v1 호환: skill_scores에도 요약 넣어두기 (레거시 페이지 위해)
    const legacySkillScores = Object.fromEntries(
      Object.entries(fixtureData.tabs).map(([stageId, tab]) => [
        stageId,
        { score: 80, label: tab.title, summary: tab.subtitle ?? "" },
      ]),
    );
    
    await this.db.prepare(`
      INSERT OR REPLACE INTO evaluation_reports
        (id, org_id, biz_item_id, title, summary, skill_scores, report_data,
         traffic_light, traffic_light_history, recommendation, generated_by,
         created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixture', ?, ?, ?)
    `).bind(
      id, orgId, bizItemId, fixtureData.bizItemTitle,
      fixtureData.summary.executiveSummary,
      JSON.stringify(legacySkillScores),
      JSON.stringify(fixtureData),              // ← v2 blob
      trafficLight,
      JSON.stringify([{ date: now, value: trafficLight }]),
      fixtureData.summary.recommendation,
      userId, now, now,
    ).run();
    
    return this.getById(orgId, id) as Promise<EvaluationReport>;
  }
  
  // rowToReport 확장: report_data parsing
  // list/getById가 reportData를 파싱해 리턴
}
```

### 3.2 라우트

```ts
// POST /ax-bd/evaluation-reports/seed-fixtures (admin, 멱등)
evaluationReportRoute.post("/ax-bd/evaluation-reports/seed-fixtures", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  // 3개 biz_item의 fixture를 순차 로드 → generateFromFixture() 호출
  const fixtures = ["bi-koami-001", "bi-xr-studio-001", "bi-iris-001"];
  const results = [];
  for (const bizItemId of fixtures) {
    const data = await loadFixture(bizItemId);  // import from fixtures/discovery-reports/
    const r = await svc.generateFromFixture(orgId, userId, bizItemId, data);
    results.push(r);
  }
  return c.json({ seeded: results.length, ids: results.map(r => r.id) });
});
```

**주의:** Cloudflare Workers에서 `fs` 불가 → fixture JSON을 `import` 정적 번들 필요.

```ts
import koami from "../../fixtures/discovery-reports/bi-koami-001.json" with { type: "json" };
import xrStudio from "../../fixtures/discovery-reports/bi-xr-studio-001.json" with { type: "json" };
import iris from "../../fixtures/discovery-reports/bi-iris-001.json" with { type: "json" };

const FIXTURE_MAP = {
  "bi-koami-001": koami,
  "bi-xr-studio-001": xrStudio,
  "bi-iris-001": iris,
};
```

## 4. Frontend 변경

### 4.1 라우트

`packages/web/src/routes/ax-bd/evaluation-report.tsx` — **in-place 전면 재작성**

```
- 목록 뷰: `GET /ax-bd/evaluation-reports`로 3개 조회
  - title, biz_item_id, traffic_light, created_at 표시
  - "결과서 생성 (fixture)" 버튼 → POST /seed-fixtures
- 상세 뷰: 항목 클릭 시 인라인 (selected state)
  - report_data 존재 → <DiscoveryReportV2View data={reportData}/> 렌더
  - null → 레거시 v1 뷰 (기존 카드/막대)
```

### 4.2 컴포넌트 구조

```
packages/web/src/components/feature/discovery/report-v2/
├── DiscoveryReportV2View.tsx         # 헤더 + Tabs 컨테이너
├── TabRenderer.tsx                   # TabSchema → JSX 범용 렌더러
├── blocks/
│   ├── CardBlock.tsx                 # CardSchema
│   ├── MetricBlock.tsx               # MetricSchema 배열
│   ├── TableBlock.tsx                # TableSchema
│   ├── InsightBox.tsx                # InsightBoxSchema
│   ├── NextStepBox.tsx               # NextStepSchema
│   └── ChartBlock.tsx                # ChartDataSchema → react-chartjs-2
└── index.ts
```

**핵심 단순화:** 샘플 HTML의 모든 스타일을 재현하지 않고, `TabSchema`의 필드에 매핑되는 범용 블록 6종만 구현. 탭별 React 컴포넌트를 9개 만들 필요 없이 `TabRenderer`가 모든 탭을 처리.

### 4.3 CSS 변수

샘플 HTML의 컬러 변수(`--mint`, `--blue`, `--amber`, `--red`, `--purple`)는 이미 `packages/web/src/app/globals.css`의 `--discovery-*` 변수로 존재(router 확인됨). 이를 재사용.

### 4.4 Chart 의존성 (구현 시 변경)

**설계 시 명세**: `react-chartjs-2` + `chart.js`  
**실제 구현**: `recharts` (이미 `packages/web`에 설치됨)  
**변경 사유**: 신규 의존성 추가 없이 동일 기능 달성 가능 — 번들 크기 최소화

```tsx
const ChartBlock = lazy(() => import("./blocks/ChartBlock"));
// ChartBlock 내부에서만 recharts BarChart 로드
```

## 5. Fixture 작성 규칙 (Sonnet autopilot 지침)

각 fixture는 다음 순서로 작성:

1. `biz_items`에서 해당 ID의 실제 title/description 조회 (prod D1 read-only)
2. 해당 아이템 도메인 배경 조사 (Sonnet 내부 지식)
3. 9탭 골격 작성 — 최소 2장 카드 + 각 탭 고유 메트릭/표
4. 2-2에 TAM/SAM/SOM 3장 메트릭 + bar chart
5. 2-5에 Commit Gate 체크리스트 카드
6. 2-8에 Executive Summary 5문장
7. 2-9에 내부 페르소나 3명 평가
8. `summary` 블록 (trafficLight, goHoldDrop, recommendation)

**품질 기준:**
- 한국어 자연스러움 (HITL 검증 티 나게)
- 카드별 2~4문장 분량
- 표는 3열 이상, 4~8행
- 실제 아이템 이름 반영 (Fooding 용어 금지)

## 6. 테스트

### 6.1 API (vitest + better-sqlite3)

```ts
// evaluation-report-v2.test.ts
describe("EvaluationReportService v2", () => {
  it("generateFromFixture: KOAMI fixture를 D1에 insert", async () => {
    const fixture = koamiFixture;
    const report = await svc.generateFromFixture("org_test", "user_test", "bi-koami-001", fixture);
    expect(report.id).toBe("eval-bi-koami-001-v1");
    expect(report.reportData).toBeDefined();
    expect(report.reportData.tabs["2-1"].title).toBe("레퍼런스 분석");
  });
  
  it("list() 호출 시 reportData 파싱", async () => {
    const list = await svc.list("org_test", { limit: 10, offset: 0 });
    expect(list.items[0].reportData).not.toBeNull();
  });
});
```

### 6.2 Web (vitest + @testing-library/react)

```ts
describe("DiscoveryReportV2View", () => {
  it("9탭 렌더링 + 탭 전환", async () => {
    const { getByText, getAllByRole } = render(<DiscoveryReportV2View data={koamiFixture} />);
    expect(getByText("레퍼런스 분석")).toBeInTheDocument();
    const tabs = getAllByRole("tab");
    expect(tabs).toHaveLength(9);
  });
});
```

### 6.3 E2E (Playwright)

```ts
test("F493 smoke: /discovery/report 3개 아이템 렌더", async ({ page }) => {
  await loginAsSharedOrgUser(page);
  await page.goto("/discovery/report");
  await expect(page.getByText("KOAMI")).toBeVisible();
  await expect(page.getByText("XR")).toBeVisible();
  await expect(page.getByText("IRIS")).toBeVisible();
  
  await page.getByText("KOAMI").click();
  await expect(page.getByText("레퍼런스 분석")).toBeVisible();
  await page.getByRole("tab", { name: /수요 시장/ }).click();
  await expect(page.getByText(/TAM/)).toBeVisible();
});
```

## 7. 배포 & Seed

### 7.1 배포 순서

1. Plan/Design + SPEC 커밋 → master push
2. Sprint 242 WT 생성 → 코드 변경 → Sprint PR merge
3. master CI/CD가 자동으로 D1 migration + Workers deploy
4. 배포 완료 후 seed script 실행:

```bash
# scripts/seed-discovery-reports.sh
curl -X POST "https://foundry-x-api.ktds-axbd.workers.dev/api/ax-bd/evaluation-reports/seed-fixtures" \
  -H "Authorization: Bearer ${FOUNDRY_X_TOKEN}" \
  -H "Content-Type: application/json"
```

또는 `wrangler d1 execute`로 직접 INSERT (fallback).

### 7.2 Idempotency

- `id = 'eval-{biz_item_id}-v1'` 고정 → `INSERT OR REPLACE`로 재실행 안전
- seed 재실행 시 최신 fixture 내용으로 갱신됨

## 8. Deprecation

기존 F296 코드 정리:
- `evaluation-report-service.ts`의 `generate()` 메서드: JSDoc에 `@deprecated Use generateFromFixture() or future AI pipeline (Phase 31+)` 추가, 동작은 유지
- 프론트 레거시 v1 뷰: `reportData === null` 케이스로 폴백 유지
- 데이터 마이그레이션 없음 (기존 v1 레코드는 그대로 조회 가능)

## 9. 수용 기준 재확인

| # | 기준 | 검증 방법 |
|---|------|-----------|
| 1 | prod `/discovery/report` 목록 3건 | 수동 E2E + Playwright |
| 2 | 9탭 전환 동작 | Playwright test |
| 3 | 2-2에 Chart.js 표시 | render test + 수동 |
| 4 | Match rate ≥ 90% | gap-detector |
| 5 | Lint/typecheck/test 전부 통과 | turbo test + pre-commit |

## 10. 리스크 & 롤백

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| fixture JSON이 스키마 불일치 | M | H | Zod parse in service 생성 시, 실패 시 throw |
| D1 migration 실패 | L | M | ALTER ADD COLUMN은 안전, rollback: `ALTER TABLE DROP COLUMN` 미지원이라 `report_data`는 무시만 하면 OK |
| Chart.js 번들 큼 | M | L | lazy import로 initial bundle 영향 차단 |
| prod DB seed 시 권한 | L | H | F491 공유 org user가 admin 권한 없을 수 있음 → seed는 wrangler 직접 SQL fallback |

**롤백 절차:**
1. Revert Sprint 242 PR
2. 필요 시 `DELETE FROM evaluation_reports WHERE id LIKE 'eval-%-v1'`
3. `report_data` 컬럼은 무해, 삭제 불필요
