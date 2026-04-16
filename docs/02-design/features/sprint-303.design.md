# Sprint 303 Design — F552 Dual AI Review D1 + Dashboard

**Plan:** `docs/01-plan/features/sprint-303.plan.md`
**PRD:** `docs/specs/fx-codex-integration/prd-final.md` FR-06, FR-07

---

## §1 변경 요약

| 구분 | 내용 |
|------|------|
| D1 Migration | `0138_dual_ai_reviews.sql` — 테이블 1개 + 인덱스 1개 |
| API | `core/verification/` 도메인 신규 — 3 라우트, 1 서비스, Zod 스키마 |
| Web | `work-management.tsx` — "AI 검증" 탭 추가 |
| Scripts | `scripts/autopilot/save-dual-review.sh` — D1 POST 배선 |

## §2 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS dual_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL,
  claude_verdict TEXT,
  codex_verdict TEXT,
  codex_json TEXT NOT NULL,
  divergence_score REAL DEFAULT 0.0,
  decision TEXT,
  degraded INTEGER DEFAULT 0,
  degraded_reason TEXT,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dual_ai_reviews_sprint ON dual_ai_reviews(sprint_id);
```

### 컬럼 설명

| 컬럼 | 타입 | 설명 |
|------|------|------|
| sprint_id | INTEGER NOT NULL | Sprint 번호 (예: 303) |
| claude_verdict | TEXT | Claude code-verify 결과: PASS/BLOCK/WARN |
| codex_verdict | TEXT | Codex 리뷰 결과: PASS/BLOCK/WARN/PASS-degraded |
| codex_json | TEXT NOT NULL | codex-review.json 전문 |
| divergence_score | REAL | 0.0~1.0, 두 모델 의견 차이 |
| decision | TEXT | 최종 composite: PASS/WARN/BLOCK/PASS-degraded |
| degraded | INTEGER | 1 = Codex 미사용 |
| degraded_reason | TEXT | codex_unavailable/codex_empty_response/... |
| model | TEXT | codex-cli/mock/none |
| created_at | TEXT | ISO 8601 timestamp |

## §3 API 설계

### 3.1 라우트 (Hono sub-app)

`packages/api/src/core/verification/routes/index.ts`

```typescript
const app = new Hono<AppEnv>();

// POST /api/verification/dual-review
app.post("/verification/dual-review", ...);

// GET /api/verification/dual-reviews
app.get("/verification/dual-reviews", ...);

// GET /api/verification/dual-reviews/stats
app.get("/verification/dual-reviews/stats", ...);
```

### 3.2 Zod 스키마

`packages/api/src/core/verification/schemas.ts`

```typescript
export const DualReviewInsertSchema = z.object({
  sprint_id: z.number().int().positive(),
  claude_verdict: z.enum(["PASS", "BLOCK", "WARN"]).nullable().optional(),
  codex_verdict: z.enum(["PASS", "BLOCK", "WARN", "PASS-degraded"]),
  codex_json: z.string(),
  divergence_score: z.number().min(0).max(1).default(0),
  decision: z.enum(["PASS", "BLOCK", "WARN", "PASS-degraded"]),
  degraded: z.boolean().default(false),
  degraded_reason: z.string().nullable().optional(),
  model: z.string().default("codex-cli"),
});

export const DualReviewStatsSchema = z.object({
  total: z.number(),
  concordance_rate: z.number(),  // 일치율 %
  block_rate: z.number(),
  degraded_rate: z.number(),
  block_reasons: z.array(z.object({
    reason: z.string(),
    count: z.number(),
  })),
  recent_reviews: z.array(z.object({
    sprint_id: z.number(),
    claude_verdict: z.string().nullable(),
    codex_verdict: z.string(),
    decision: z.string(),
    divergence_score: z.number(),
    degraded: z.boolean(),
    created_at: z.string(),
  })),
});
```

### 3.3 서비스

`packages/api/src/core/verification/services/dual-review.service.ts`

```typescript
export class DualReviewService {
  constructor(private db: D1Database) {}

  async insert(data: DualReviewInsert): Promise<{ id: number }>;
  async list(limit?: number): Promise<DualReview[]>;
  async stats(): Promise<DualReviewStats>;
}
```

## §4 Web UI 설계

### 4.1 work-management.tsx 변경

탭 배열에 추가:
```typescript
{ key: "ai-review", label: "AI 검증" },
```

### 4.2 DualAiReviewTab 컴포넌트

- **요약 카드 행** (4개): 총 리뷰 / 일치율 / BLOCK율 / Degraded율
- **리뷰 테이블**: 최근 20건, Sprint별 verdict 비교
- **BLOCK 사유 Top 5**: 바 차트 또는 목록

API 호출: `GET /api/verification/dual-reviews/stats`

## §5 파일 매핑

| # | 파일 | 변경 유형 | 설명 |
|---|------|----------|------|
| 1 | `packages/api/src/db/migrations/0138_dual_ai_reviews.sql` | 신규 | D1 테이블 |
| 2 | `packages/api/src/core/verification/types.ts` | 신규 | 타입 정의 |
| 3 | `packages/api/src/core/verification/schemas.ts` | 신규 | Zod 스키마 |
| 4 | `packages/api/src/core/verification/services/dual-review.service.ts` | 신규 | D1 CRUD |
| 5 | `packages/api/src/core/verification/routes/index.ts` | 신규 | Hono sub-app |
| 6 | `packages/api/src/app.ts` | 수정 | sub-app mount 1줄 |
| 7 | `packages/web/src/routes/work-management.tsx` | 수정 | AI 검증 탭 추가 |
| 8 | `scripts/autopilot/save-dual-review.sh` | 신규 | autopilot→D1 POST |

### 테스트 파일

| # | 파일 | 대상 |
|---|------|------|
| T1 | `packages/api/src/core/verification/services/dual-review.service.test.ts` | 서비스 CRUD |
| T2 | `packages/api/src/core/verification/routes/index.test.ts` | 라우트 통합 |

## §6 Stage 3 Exit 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| D1 | 주입 사이트 전수 — codex-review.sh → save-dual-review.sh → POST /api/verification/dual-review → DualReviewService.insert() → D1 | PASS — 4단계 체인 완전 |
| D2 | 식별자 계약 — sprint_id (INTEGER, e.g. 303), codex_json (full JSON string) | PASS — sprint 번호는 정수, JSON은 문자열로 저장 |
| D3 | Breaking change — 신규 테이블/라우트/UI, 기존 영향 없음 | PASS — additive only |
| D4 | TDD Red 파일 — T1, T2 테스트 파일 FAIL 확인 후 커밋 | 대기 |
