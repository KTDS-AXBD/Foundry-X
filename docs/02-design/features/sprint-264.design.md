# Sprint 264 Design

> **Summary**: F512 A-3~A-8 문서 정비 + F513 B-0~B-3 TDD 상세 설계
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: Approved
> **Plan**: `docs/01-plan/features/sprint-264.plan.md`

---

## §1 F512 — 문서 체계 정비 (A-3~A-8)

### A-3: SPEC.md 경량화

**대상 섹션별 처리**

| 섹션 | 현재 줄수 | 처리 방법 |
|------|----------|---------|
| §1 프로젝트 개요 | 13줄 | 요약 2줄 + "상세: BLUEPRINT.md 참조" |
| §3 마일스톤 | 63줄 | 현재 Phase만 유지, "로드맵: ROADMAP.md 참조" |
| §4 성공 지표 | 30줄 | 핵심 KPI 5줄 + "상세: BLUEPRINT.md 참조" |
| §7 기술 스택 | 15줄 | adr/coding-style.md로 이관 또는 삭제 |
| §8 Tech Debt | 8줄 | 유지 (짧고 실용적) |
| §9 변경 이력 | 127줄 | docs/archive/spec-changelog-v1.md로 이관, 최근 10건만 유지 |
| §10 버전 정책 | 28줄 | adr/versioning-policy.md로 이관 |

**목표**: §2(경량화) + §5(F-items) + §6→링크 = ≤ 350줄

### A-4: SPEC.md §6 아카이브

- §6 전체(1265줄) → `docs/archive/spec-execution-plan-2026-04.md`로 이동
- SPEC.md §6 위치에 대체 텍스트:
  ```
  ## §6 Execution Plan (아카이브)
  
  > 상세 실행 계획은 아카이브에서 확인: [docs/archive/spec-execution-plan-2026-04.md](archive/spec-execution-plan-2026-04.md)
  > 현행 Sprint 계획: ROADMAP.md + docs/01-plan/features/sprint-{N}.plan.md
  ```

### A-5: SPEC.md §2 아카이브

- §2 현재 상태(197줄) → 최근 5 Sprint 항목만 유지
- 나머지 → `docs/archive/spec-current-state-2026-04.md`
- 섹션 헤더 + 테이블 구조 유지, 행만 정리

### A-6: docs/ 산출물 아카이브

**이동 대상**: `docs/01-plan/features/sprint-{1~90}.plan.md`, `docs/02-design/features/sprint-{1~90}.*`
**이동 위치**: `docs/archive/2026-04/` (일괄)
**유지 기준**: Sprint 240 이후 파일 + 현재 활성 feature 파일

### A-7: F-item 세부 상태 괄호 표기

**10단계 정의**:
```
idea | groomed | plan | design | impl | review | test | blocked | deployed | dropped
```

**기존 이모지 → 세부 상태 매핑**:
- `🔧` = in_progress → `🔧(impl)` 또는 `🔧(review)` 등
- `📋` = planned → `📋(groomed)` 또는 `📋(plan)` 등

**적용 대상**: SPEC.md §5 F-items 중 🔧(진행 중) 항목 전체, 📋 중 Sprint 배정 항목

### A-8: Entry/Exit Criteria

**파일**: `.claude/rules/process-lifecycle.md`

**6단계 Lifecycle**:
```
Idea → Planning → Design → Impl → Verify → Done
```

각 단계별 Entry Criteria + Exit Criteria + 산출물 정의

---

## §2 F513 — Work Management API TDD (B-0~B-3)

### B-0: work.service.ts 단위 테스트

**파일**: `packages/api/src/__tests__/work.service.test.ts` (신규)

**테스트 대상 함수**:
- `parseFItems()` — SPEC.md 텍스트에서 F-item 파싱
- `inferStatus()` — 이모지 기반 상태 추론
- `classifyWithRegex()` — 정규식 기반 분류
- `getSnapshot()` — 전체 스냅샷 (fetch mock)
- `getContext()` — 컨텍스트 (fetch mock)
- `classify()` — LLM fallback 경로

**테스트 케이스 목록 (~15건)**:
```
parseFItems:
  ✓ F-item 표준 행 파싱 (id/title/sprint/status)
  ✓ ✅ 이모지 → done 상태
  ✓ 🔧 이모지 → in_progress 상태
  ✓ 📋 이모지 → backlog 상태
  ✓ Sprint 배정 행 → planned 상태
  ✓ 빈 SPEC 텍스트 → 빈 배열
  ✓ priority 추출 (P0/P1/P2)
  ✓ req_code 추출 (FX-REQ-NNN)

classifyWithRegex:
  ✓ "bug" 포함 → track=B
  ✓ "feature" 포함 → track=F
  ✓ "refactor" 포함 → track=C
  ✓ "긴급" 포함 → priority=P0

classify:
  ✓ ANTHROPIC_API_KEY 없으면 regex fallback
  ✓ API 오류 시 regex fallback

getSnapshot:
  ✓ fetch 실패 시 빈 items 반환 (graceful)
```

### B-1: GET /api/work/velocity

**서비스 메서드**: `WorkService.getVelocity()`

```typescript
interface VelocityData {
  sprints: Array<{
    sprint: number;
    f_items_done: number;
    week: string; // YYYY-WNN
  }>;
  avg_per_sprint: number;
  trend: "up" | "down" | "stable";
  generated_at: string;
}
```

**데이터 소스**: SPEC.md §5에서 ✅ F-item의 Sprint 번호 집계

**라우트**: `GET /api/work/velocity`

**Zod 스키마**: `VelocitySchema`

### B-2: GET /api/work/phase-progress

**서비스 메서드**: `WorkService.getPhaseProgress()`

```typescript
interface PhaseProgressData {
  phases: Array<{
    id: number;
    name: string;
    total: number;
    done: number;
    in_progress: number;
    pct: number;
  }>;
  current_phase: number;
  generated_at: string;
}
```

**데이터 소스**: SPEC.md §5 F-item의 Phase별 그룹핑

**라우트**: `GET /api/work/phase-progress`

### B-3: GET /api/work/backlog-health

**서비스 메서드**: `WorkService.getBacklogHealth()`

```typescript
interface BacklogHealthData {
  total_backlog: number;
  stale_items: Array<{  // 📋 + Sprint 미배정 + 장기 대기
    id: string;
    title: string;
    age_sprints: number;
  }>;
  health_score: number; // 0-100
  warnings: string[];
  generated_at: string;
}
```

**데이터 소스**: SPEC.md §5 F-items 중 📋 + Sprint 미배정

**라우트**: `GET /api/work/backlog-health`

---

## §3 테스트 계약 (TDD Red Target)

### B-0 Red Target
```
work.service.test.ts:
  parseFItems — 8 tests
  classifyWithRegex — 4 tests
  classify (fallback) — 2 tests
  getSnapshot (fetch mock) — 1 test
  총 15건 FAIL → Green 후 PASS
```

### B-1~B-3 Red Target
```
work.routes.test.ts (추가):
  GET /api/work/velocity → 200 + VelocitySchema 검증
  GET /api/work/phase-progress → 200 + PhaseProgressSchema 검증
  GET /api/work/backlog-health → 200 + BacklogHealthSchema 검증
  각 엔드포인트 fetch mock + 빈 SPEC → graceful 응답
  총 9건
```

---

## §4 파일 매핑

### F512 (meta-only)

| 작업 | 파일 |
|------|------|
| A-3~A-5 | `SPEC.md` 수정 |
| A-4 아카이브 | `docs/archive/spec-execution-plan-2026-04.md` 생성 |
| A-5 아카이브 | `docs/archive/spec-current-state-2026-04.md` 생성 |
| A-6 아카이브 | `docs/archive/2026-04/` 디렉토리 + 이동 |
| A-8 | `.claude/rules/process-lifecycle.md` 생성 |

### F513 (code — PR 경로)

| 작업 | 파일 |
|------|------|
| B-0 Red | `packages/api/src/__tests__/work.service.test.ts` 신규 |
| B-1~B-3 Red | `packages/api/src/__tests__/work.routes.test.ts` 추가 |
| B-1~B-3 Green | `packages/api/src/services/work.service.ts` 메서드 추가 |
| B-1~B-3 Green | `packages/api/src/routes/work.ts` 라우트 추가 |
| Schema | `packages/api/src/schemas/work.ts` Zod 스키마 추가 |

---

## §5 Gap 판단 기준

| 항목 | 완료 기준 |
|------|----------|
| SPEC.md 줄수 | `wc -l SPEC.md` ≤ 350 |
| docs/ 활성 파일 | `find docs -name "*.md" \| grep -v archive \| wc -l` ≤ 100 |
| 테스트 건수 | `vitest run --reporter=verbose` 출력 기준 24건+ PASS |
| process-lifecycle.md | 파일 존재 + 6단계 구조 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-12 | Sprint 264 Design — F512 A-3~A-8 + F513 B-0~B-3 |
