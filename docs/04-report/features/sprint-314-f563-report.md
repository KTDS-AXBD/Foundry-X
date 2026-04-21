---
sprint: 314
feature: F563
status: completed
date: 2026-04-21
match_rate: 97
---

# Sprint 314 Report — F563: fx-shaping E2E + KOAMI P2 완결

## §1 요약

F540 (Sprint 297)에서 fx-shaping Worker로 이전된 13개 route가 `packages/api/src/core/shaping/routes/`에 dead code로 잔존했으며, KOAMI bi-koami-001 Shaping 단계의 D1 INSERT Smoke Reality가 미검증 상태였다. F563은 이 두 가지를 완결했다.

## §2 완료 항목

### (a) Dead code 제거 — api/core/shaping/routes ×13

| 삭제 파일 | 용도 |
|-----------|------|
| `shaping.ts` | Shaping runs CRUD (13 EP — fx-shaping로 이전됨) |
| `ax-bd-bmc.ts` | BMC CRUD |
| `ax-bd-agent.ts` | BMC Agent |
| `ax-bd-comments.ts` | 댓글 |
| `ax-bd-history.ts` | 버전 이력 |
| `ax-bd-links.ts` | 링크 |
| `ax-bd-viability.ts` | 사업성 체크포인트 |
| `ax-bd-prototypes.ts` | 프로토타입 |
| `ax-bd-skills.ts` | BD 스킬 실행 |
| `ax-bd-persona-eval.ts` | 페르소나 평가 |
| `ax-bd-progress.ts` | BD 프로세스 진행 |
| `persona-configs.ts` | 페르소나 설정 |
| `persona-evals.ts` | 페르소나 평가 결과 |

- `packages/api/src/core/shaping/index.ts` — route export 13개 제거, services/schemas 유지
- `grep -rn "core/shaping/routes" packages/api/src/` = **0건 확인**

### (b) 테스트 파일 정리

**삭제 (5개)**: `shaping.test.ts`, `ax-bd-skills.test.ts`, `ax-bd-prototypes.test.ts`, `bd-progress-route.test.ts`, `bmc-history.test.ts`

**수정 (4개)**:
- `bmc-agent.test.ts` — axBdAgentRoute import + route describe 섹션 제거, BmcAgentService 서비스 테스트 유지
- `ax-bd-comments.test.ts` — axBdCommentsRoute 섹션 제거, BmcCommentService 서비스 테스트 유지
- `sprint-222-prototype-build.test.ts` — axBdPrototypesRoute 제거, PrototypeService 서비스 테스트 유지
- `prototype-review.test.ts` — 전체 route 의존으로 삭제 처리 (보존 가능한 서비스 섹션 없음)

### (c) KOAMI P2 — bi-koami-001 D1 INSERT 확인

**신규 파일:**
- `packages/fx-shaping/src/__tests__/helpers/mock-d1.ts` — better-sqlite3 기반 D1 shim, shaping 5개 테이블 초기화
- `packages/fx-shaping/src/__tests__/shaping-d1-insert.test.ts` — bi-koami-001 D1 INSERT 실측 확인 (6 tests)
- `packages/fx-shaping/src/__tests__/shaping-routes-functional.test.ts` — 13 EP 기능 테스트 (17 tests)

**핵심 검증 결과:**
```
POST /api/shaping/runs → shaping_runs에 행 INSERT됨 (D1 확인) ✅
bi-koami-001 Phase log INSERT — proposals ≥ 1건 ✅
bi-koami-001 expert review INSERT 확인 ✅
bi-koami-001 Six Hats INSERT 확인 ✅
PATCH /api/shaping/runs/:id → status 갱신 ✅
GET /api/shaping/runs → 목록 반환 ✅
```

## §3 테스트 결과

| 패키지 | 결과 |
|--------|------|
| fx-shaping | **34/34 PASS** (신규 23 + 기존 11) |
| api | 3141/3143 PASS (2건은 pre-existing harness-kit 모듈 오류, F563 무관) |

## §4 Gap Analysis

| # | 항목 | 상태 |
|---|------|------|
| 4-1 | Dead code 13파일 삭제 | ✅ |
| 4-1 | index.ts route export 제거 | ✅ |
| 4-1 | Dead test 5파일 삭제 | ✅ |
| 4-1 | Test 4파일 수정 | ✅ (prototype-review는 전체 삭제) |
| 4-2 | mock-d1.ts 신규 | ✅ |
| 4-2 | shaping-d1-insert.test.ts (TDD Red→Green) | ✅ |
| 4-2 | shaping-routes-functional.test.ts | ✅ |
| 의존성 | better-sqlite3 devDep 추가 | ✅ |

**Match Rate: 97%** (prototype-review.test.ts를 MODIFY→DELETE로 처리한 점이 유일한 deviation)

## §5 Phase Exit Reality (P1~P4)

| # | 항목 | 결과 |
|---|------|------|
| P1 | bi-koami-001 D1 INSERT in-memory SQLite 실측 | ✅ mock-d1 기반 34 tests 전체 PASS |
| P2 | shaping_runs 행 실제 존재 확인 (rawDb.prepare() 직접 조회) | ✅ |
| P3 | 13 EP 전체 기능 실측 (201/200/400/404 status 코드) | ✅ |
| P4 | 실전 프로덕션 D1 검증 | ⚠️ 프로덕션 직접 smoke는 CI 배포 후 확인 필요 |

> **P4 참고**: 프로덕션 Cloudflare D1에 대한 직접 HTTP smoke는 PR merge 후 deploy.yml CI에서 자동 검증됨. 로컬 mock-d1 기반 검증이 P2 실측을 대체함.

## §6 리스크 해소

| ID | 내용 | 해소 여부 |
|----|------|----------|
| R1 | bmc-agent.test.ts axBdAgentRoute 외 다른 imports | ✅ 서비스 테스트 섹션만 보존하여 해소 |
| R2 | fx-shaping better-sqlite3 Workers 빌드 충돌 | ✅ devDependencies에만 추가 확인 |
| R3 | api typecheck 실패 | ✅ shaping route import 0건 확인 (pre-existing proxy.ts 오류는 별도) |

## §7 설계 편차 (Design Deviation)

**prototype-review.test.ts**: 설계에서 "MODIFY (axBdPrototypesRoute import 제거)"로 분류됐으나, 파일 전체가 route 의존적(서비스 테스트 섹션 없음)이어서 삭제로 처리.

- 삭제 근거: `createApp()` 함수와 모든 describe 블록이 `axBdPrototypesRoute`에 직접 의존
- 보존 가능한 service-level 테스트 없음
- 해당 섹션의 기능(Prototype Section Review)은 fx-shaping Worker에서 활성 서비스 중

## §8 커밋

- `c3c79d2c feat(shaping): F563 — fx-shaping E2E + dead code 정리 (KOAMI P2 완결)`
  - 30 files changed, 905 insertions(+), 3100 deletions(-)
