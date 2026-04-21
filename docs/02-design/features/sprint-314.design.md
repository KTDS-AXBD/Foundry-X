---
sprint: 314
feature: F563
req: FX-REQ-606
status: design
date: 2026-04-21
---

# Sprint 314 Design — F563: fx-shaping E2E + KOAMI P2 완결

## §1 배경

F540 (Sprint 297, PR #598)에서 fx-shaping Worker를 생성하고 fx-gateway Service Binding을 연결했으나 두 가지 gap이 남음:
1. `packages/api/src/core/shaping/routes/` 13개 파일이 dead code로 잔존
2. Smoke Reality(bi-koami-001 shaping_runs D1 INSERT 확인)가 미완료

F563은 이 두 가지를 해소한다.

## §2 Stage 3 Exit 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | **주입 사이트 전수 검증** — 신규 test helper의 모든 호출 위치가 §5 파일 매핑에 명시됨 | ✅ mock-d1.ts는 __tests__/ 내부에서만 사용 |
| D2 | **식별자 계약 검증** — shaping_runs.id = `hex(randomblob(16))`, discoveryPrdId = biz_item_id 문자열 | ✅ 스키마 일치 확인 |
| D3 | **Breaking change 영향도** — routes 삭제는 api/app.ts에서 이미 제거됨, 영향 없음 | ✅ api/app.ts에 shaping route 등록 없음 확인 |
| D4 | **TDD Red 파일 존재** | 🔧 구현 시 커밋 |

## §3 아키텍처 현황

```
Browser → fx-gateway → [SHAPING binding] → fx-shaping Worker
                                                ↓
                                         foundry-x-db (D1)
                                         [shaping_runs, shaping_phase_logs, ...]
```

fx-shaping은 자체 D1 binding으로 foundry-x-db에 직접 접근한다.
(F561 이후 discovery-db가 별도로 분리됐으나 shaping은 원 DB 유지)

## §4 변경 상세

### 4-1. Dead code 제거 (api/core/shaping/routes)

**삭제 대상 파일:**
```
packages/api/src/core/shaping/routes/
├── shaping.ts              (13 EP — shaping runs CRUD)
├── ax-bd-bmc.ts           (BMC CRUD)
├── ax-bd-agent.ts         (BMC Agent)
├── ax-bd-comments.ts      (댓글)
├── ax-bd-history.ts       (버전 이력)
├── ax-bd-links.ts         (링크)
├── ax-bd-viability.ts     (사업성 체크포인트)
├── ax-bd-prototypes.ts    (프로토타입)
├── ax-bd-skills.ts        (BD 스킬 실행)
├── ax-bd-persona-eval.ts  (페르소나 평가)
├── ax-bd-progress.ts      (BD 프로세스 진행)
├── persona-configs.ts     (페르소나 설정)
└── persona-evals.ts       (페르소나 평가 결과)
```

**수정 대상:**
- `packages/api/src/core/shaping/index.ts` — route export 13개 제거

**삭제 테스트 파일:**
```
packages/api/src/__tests__/
├── shaping.test.ts              (DELETE — shapingRoute import)
├── ax-bd-skills.test.ts         (DELETE — axBdSkillsRoute import)
├── ax-bd-prototypes.test.ts     (DELETE — axBdPrototypesRoute import)
├── bd-progress-route.test.ts    (DELETE — axBdProgressRoute import)
└── bmc-history.test.ts          (DELETE — axBdHistoryRoute import)
```

**수정 테스트 파일 (route import 라인만 삭제):**
```
packages/api/src/__tests__/
├── bmc-agent.test.ts            (axBdAgentRoute import 제거 → service 직접 테스트로 변환)
├── ax-bd-comments.test.ts       (axBdCommentsRoute import 제거 → service 테스트로)
├── prototype-review.test.ts     (axBdPrototypesRoute import 제거)
└── sprint-222-prototype-build.test.ts (axBdPrototypesRoute import 제거)
```

**유지:**
- `packages/api/src/core/shaping/services/` (타 도메인 활성 import: discovery/offering/agent/harness/collection)
- `packages/api/src/core/shaping/schemas/` (타 도메인 활성 import: offering/harness/collection)

### 4-2. fx-shaping D1 통합 테스트 (TDD)

**신규 파일:**

```
packages/fx-shaping/src/__tests__/
├── helpers/
│   └── mock-d1.ts              (shaping tables SQLite mock)
├── shaping-d1-insert.test.ts   (F563 핵심 — D1 INSERT 확인)
└── shaping-routes-functional.test.ts (CRUD 13 EP 기능 테스트)
```

**mock-d1.ts 스키마 포함 테이블:**
- `shaping_runs` — shaping 실행 이력
- `shaping_phase_logs` — Phase별 실행 로그
- `shaping_expert_reviews` — 전문가 리뷰
- `shaping_six_hats` — Six Hats 의견

**shaping-d1-insert.test.ts 핵심 assertions:**
```typescript
// F563: KOAMI P2 — bi-koami-001 shaping_run D1 INSERT 확인
it("POST /api/shaping/runs → shaping_runs에 행 INSERT됨 (D1 확인)", async () => {
  const res = await post(app, "/api/shaping/runs", {
    discoveryPrdId: "bi-koami-001",
    mode: "hitl",
  });
  expect(res.status).toBe(201);

  // D1 직접 확인 (fixture/하드코딩 금지, 실제 INSERT 검증)
  const row = db.prepare("SELECT * FROM shaping_runs WHERE discovery_prd_id = ?")
    .get("bi-koami-001") as any;
  expect(row).not.toBeNull();
  expect(row.status).toBe("running");
  expect(row.current_phase).toBe("A");
});

it("bi-koami-001 Phase log INSERT — proposals ≥ 1건", async () => {
  // shaping run 생성 후 phase log 추가
  const run = await createShapingRun("bi-koami-001");
  await post(app, `/api/shaping/runs/${run.id}/phase-logs`, {
    phase: "A", round: 1, verdict: "PASS", qualityScore: 0.85,
  });
  const logs = db.prepare("SELECT COUNT(*) as cnt FROM shaping_phase_logs WHERE run_id = ?")
    .get(run.id) as any;
  expect(logs.cnt).toBeGreaterThanOrEqual(1);
});
```

## §5 파일 매핑 (D1 체크리스트용)

| 작업 | 파일 | 변경 |
|------|------|------|
| Dead code 삭제 | `packages/api/src/core/shaping/routes/` (×13) | DELETE |
| Index 정리 | `packages/api/src/core/shaping/index.ts` | MODIFY (route export 제거) |
| Dead test 삭제 | `packages/api/src/__tests__/shaping.test.ts` | DELETE |
| Dead test 삭제 | `packages/api/src/__tests__/ax-bd-skills.test.ts` | DELETE |
| Dead test 삭제 | `packages/api/src/__tests__/ax-bd-prototypes.test.ts` | DELETE |
| Dead test 삭제 | `packages/api/src/__tests__/bd-progress-route.test.ts` | DELETE |
| Dead test 삭제 | `packages/api/src/__tests__/bmc-history.test.ts` | DELETE |
| 수정 | `packages/api/src/__tests__/bmc-agent.test.ts` | MODIFY |
| 수정 | `packages/api/src/__tests__/ax-bd-comments.test.ts` | MODIFY |
| 수정 | `packages/api/src/__tests__/prototype-review.test.ts` | MODIFY |
| 수정 | `packages/api/src/__tests__/sprint-222-prototype-build.test.ts` | MODIFY |
| 신규 | `packages/fx-shaping/src/__tests__/helpers/mock-d1.ts` | CREATE |
| 신규 | `packages/fx-shaping/src/__tests__/shaping-d1-insert.test.ts` | CREATE (TDD Red) |
| 신규 | `packages/fx-shaping/src/__tests__/shaping-routes-functional.test.ts` | CREATE |
| 의존성 | `packages/fx-shaping/package.json` | MODIFY (better-sqlite3 추가) |
| 보고서 | `docs/04-report/features/sprint-314-f563-report.md` | CREATE |

## §6 D2 식별자 계약

| 식별자 | 포맷 | 생산자 | 소비자 |
|--------|------|-------|-------|
| `shaping_runs.id` | `hex(randomblob(16))` lowercase 32자 | ShapingService.createRun() | phase-logs, expert-reviews, six-hats route |
| `shaping_runs.discovery_prd_id` | biz_item_id 자유 문자열 | 호출자 (bi-koami-001 등) | ShapingService.listRuns() query |
| `shaping_runs.tenant_id` | orgId 문자열 | tenantGuard middleware | 모든 조회 |

## §7 리스크

| ID | 내용 | 대응 |
|----|------|------|
| R1 | bmc-agent.test.ts 수정 시 axBdAgentRoute 외 다른 imports도 있을 수 있음 | 파일 전체 분석 후 service-level test로 전환 |
| R2 | fx-shaping에 better-sqlite3 추가 시 Cloudflare Workers 빌드 충돌 | devDependencies에만 추가, wrangler build에서 제외됨 |
| R3 | api typecheck 실패 — 삭제된 route export를 참조하는 타입 | grep으로 사전 확인 |

## §8 TDD Red 계획

```
1. packages/fx-shaping/src/__tests__/shaping-d1-insert.test.ts 작성
2. better-sqlite3 없어서 FAIL → RED 확인
3. package.json devDeps + mock-d1.ts 추가 → GREEN
4. shaping-routes-functional.test.ts 추가 → 더 많은 coverage
```
