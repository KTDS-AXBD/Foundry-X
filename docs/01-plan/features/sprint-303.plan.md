# Sprint 303 Plan — F552 Dual AI Review D1 + Dashboard

**F-item:** F552 (FX-REQ-589, P1)
**Phase:** 46 Dual-AI Verification
**PRD:** `docs/specs/fx-codex-integration/prd-final.md` FR-06, FR-07
**선행:** F550/F551/F554 ✅ (Codex 인프라 + Phase 5c 배선)

---

## 목표

Sprint autopilot Phase 5c에서 생성되는 `codex-review.json`을 D1에 영속화하고,
`/work-management` 대시보드에 "Dual AI Review" 탭을 추가하여 Sprint별 리뷰 결과를 시각화한다.

## 범위

### M1. D1 Migration (`0138_dual_ai_reviews.sql`)

```sql
CREATE TABLE IF NOT EXISTS dual_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id INTEGER NOT NULL,
  claude_verdict TEXT,          -- PASS/BLOCK/WARN
  codex_verdict TEXT,           -- PASS/BLOCK/WARN/PASS-degraded
  codex_json TEXT NOT NULL,     -- codex-review.json 전문 (JSON string)
  divergence_score REAL DEFAULT 0.0,
  decision TEXT,                -- composite verdict: PASS/WARN/BLOCK/PASS-degraded
  degraded INTEGER DEFAULT 0,  -- 1 = Codex unavailable
  degraded_reason TEXT,
  model TEXT,                   -- codex-cli/mock/none
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dual_ai_reviews_sprint ON dual_ai_reviews(sprint_id);
```

### M2. API 엔드포인트 (core/verification/)

MSA 원칙에 따라 `packages/api/src/core/verification/` 신규 도메인:

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/verification/dual-review` | Sprint 리뷰 결과 저장 |
| GET | `/api/verification/dual-reviews` | 전체 목록 (최근 20건) |
| GET | `/api/verification/dual-reviews/stats` | 집계: 일치율, BLOCK 사유 Top 5, degraded 비율 |

Zod 스키마로 입력 검증, 서비스 레이어 경유.

### M3. Dashboard 위젯 (work-management.tsx)

기존 7탭에 "AI 검증" 탭 추가 (8번째):

- **요약 카드**: 총 리뷰 수, 일치율(%), BLOCK 비율(%), degraded 비율(%)
- **리뷰 테이블**: Sprint별 claude_verdict vs codex_verdict + decision + divergence_score
- **BLOCK 사유 Top 5**: code_issues에서 severity=high 집계

### M4. autopilot 배선

`codex-review.sh` 완료 후 D1 POST 호출 추가:
- `scripts/autopilot/composite-verify.sh` 또는 autopilot SKILL.md Phase 5c에서 API 호출
- 기존 JSON 파일 저장은 유지 (로컬 백업)

## 변경 파일 예상

| 패키지 | 파일 | 변경 |
|--------|------|------|
| api | `src/db/migrations/0138_dual_ai_reviews.sql` | 신규 |
| api | `src/core/verification/routes/index.ts` | 신규 |
| api | `src/core/verification/services/dual-review.service.ts` | 신규 |
| api | `src/core/verification/schemas.ts` | 신규 |
| api | `src/core/verification/types.ts` | 신규 |
| api | `src/app.ts` | sub-app mount 1줄 |
| web | `src/routes/work-management.tsx` | 탭 추가 |
| scripts | `scripts/autopilot/composite-verify.sh` | D1 POST 배선 |

## TDD 계획

- **Red**: dual-review.service.test.ts (insert/list/stats), routes.test.ts (POST/GET)
- **Green**: 서비스 + 라우트 구현
- **E2E**: work-management Dual AI Review 탭 렌더링 확인

## 리스크

- R1: work-management.tsx가 1265줄로 이미 큰 파일 — 탭 컴포넌트를 별도 파일로 분리 검토
- R2: autopilot 배선은 WT 내에서 테스트 불가 (Master pane에서 검증)
