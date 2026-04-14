# F-item Process Lifecycle — Entry/Exit Criteria

> **F-item 개발 라이프사이클**: Idea → Planning → Design → Impl → Verify → Done 6단계
> **버전**: 1.1 | **날짜**: 2026-04-14 | **사유**: F512 A-8 (FX-REQ-535) + Phase 42+43 회고 교훈 반영 (S287)

---

## 개요

모든 F-track 작업은 아래 6단계를 거친다. 각 단계는 명확한 진입(Entry) 조건과 완료(Exit) 조건을 가진다. 이 규칙의 목적은 "어디에 있는지"를 명확히 하여 병목을 가시화하는 것이다.

---

## 단계 정의

### Stage 1: Idea (`📋(idea)`)

**목적**: 아이디어 캡처. 평가 전 상태.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | 아이디어 1줄 기술 가능 |
| **Exit Criteria** | 다음 Sprint 또는 Backlog에 배정 결정 |
| **산출물** | SPEC.md §5에 F-item 1줄 등록 |
| **담당** | 개발자 or AI Agent |
| **SPEC 이모지** | `📋(idea)` |

---

### Stage 2: Planning (`📋(groomed)` or `📋(plan)`)

**목적**: 요구사항 명확화, 범위 확정, Sprint 배정.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | F-item SPEC 등록, REQ 코드 배정 |
| **Exit Criteria** | PRD 또는 Plan 문서 존재, Sprint N 확정 |
| **산출물** | `docs/01-plan/features/sprint-{N}.plan.md` |
| **담당** | 개발자 |
| **SPEC 이모지** | `📋(groomed)` → `📋(plan)` |
| **TDD** | 이 단계에서 Red Phase 설계 가능 |

---

### Stage 3: Design (`🔧(design)`)

**목적**: 구현 상세 설계. API 스키마, DB 스키마, 컴포넌트 구조 확정.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | Plan 문서 존재, Sprint 브랜치 생성 |
| **Exit Criteria** | Design 문서 §5 "파일 매핑" 완성 + **아래 체크리스트 전부 PASS** |
| **산출물** | `docs/02-design/features/sprint-{N}.design.md` |
| **담당** | 개발자 |
| **SPEC 이모지** | `🔧(design)` |
| **TDD** | Red Phase 완료 (테스트 파일 FAIL 확인) |
| **자동 검증** | `bkit:design-validator` agent 호출 권장 (Phase 8 Review linked) |

#### Stage 3 Exit 체크리스트 (F534/F536 교훈, S287 추가)

| # | 항목 | 검증 방법 |
|---|------|----------|
| D1 | **주입 사이트 전수 검증** — 신규 훅·콜백·이벤트 발행 지점의 모든 호출 위치가 Design 문서 §5 파일 매핑에 명시됨 | 신규 인터페이스 심볼을 `grep -rn` 으로 전수 스캔 → Design의 "수정 파일" 리스트와 일치 확인. 누락 1건도 FAIL |
| D2 | **식별자 계약(contract) 검증** — cross-module ID(sessionId, bizItemId, traceId 등)의 포맷/생산자/소비자 규칙이 Design에 명시됨 | 생산자 코드의 ID 포맷 regex와 소비자 쿼리 패턴이 **동일 regex** 로 매칭 가능함을 예시로 명시. 포맷 분기(예: `graph-*` vs `stage-*`) 있으면 매핑 규칙 표로 기술 |
| D3 | **Breaking change 영향도** — DB schema/API 시그니처/shared type 변경 시 소비자 전수 목록 + 마이그레이션 계획 | `Grep`으로 import/사용처 전수 확인 후 §5에 "영향 파일" 표 |
| D4 | **TDD Red 파일 존재** | 테스트 파일 FAIL 로그 커밋 해시 기록 |

> **근거 교훈**
> - **F534 (Phase 43)**: `DiagnosticCollector.record()` 호출을 `StageRunnerService.runStage()`에만 주입 → `OrchestrationLoop`에 누락 → Dogfood 시 metrics 0건. PR #565 hotfix. ⇒ D1 체크리스트 생성.
> - **F536 (Phase 43)**: `autoTriggerMetaAgent`가 `graph-*` sessionId로 collect했으나 stage-runner는 `stage-{stage}-{bizItemId}` 패턴으로 기록 → 매칭 실패. PR #573 F537 hotfix (`collectByBizItem`). ⇒ D2 체크리스트 생성.

---

### Stage 4: Implementation (`🔧(impl)`)

**목적**: 코드 작성. TDD Green Phase.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | Design 문서 완성, Red Phase 커밋 존재 |
| **Exit Criteria** | 모든 Red 테스트 GREEN, typecheck PASS |
| **산출물** | 구현 코드 + Green 커밋 |
| **담당** | 개발자 or AI Agent |
| **SPEC 이모지** | `🔧(impl)` |
| **TDD** | `feat(scope): FN green — ...` 커밋 |

---

### Stage 5: Verification (`🔧(review)` → `🔧(test)`)

**목적**: Gap Analysis + E2E + PR Review.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | 구현 완료, 로컬 vitest PASS |
| **Exit Criteria** | Gap Match Rate ≥ 90%, PR CI 통과 |
| **산출물** | Gap Analysis 보고서, PR |
| **담당** | 개발자 |
| **SPEC 이모지** | `🔧(review)` (리뷰 대기) → `🔧(test)` (테스트 진행) |
| **실패 시** | pdca-iterator 최대 3회 자동 개선 → 90% 미달 시 이슈 등록 |

---

### Stage 6: Done (`✅` or `✅(deployed)`)

**목적**: 프로덕션 배포 완료. 회고 기록.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | PR merge + CI/CD 배포 성공 |
| **Exit Criteria** | SPEC.md §5 상태 `✅` 갱신, 변경 이력 §9 추가 |
| **산출물** | 배포된 코드, Sprint Report (`docs/04-report/`) |
| **담당** | 개발자 |
| **SPEC 이모지** | `✅` → `✅(deployed)` (배포 후 모니터링 완료 시) |

---

## Phase Exit Criteria — Smoke Reality 필수 (S287 추가)

Phase 단위(여러 F-item 묶음) 완료 선언 전에는 **최소 1회 실전 Dogfood**를 수행하여 "예상 산출물 = 실측 산출물" 이 일치하는지 확인한다. 테스트 PASS + CI 통과만으로는 Phase 완료가 아니다.

### Phase Exit 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| P1 | **실전 Dogfood 1회 이상 실행** — 실제 프로덕션 경로로 Phase 목적 기능을 end-to-end 가동 | 실행 로그 또는 session_id 증거 기록 |
| P2 | **실측 산출물 검증** — Phase 목적이 "X를 생성/수집/개선"이면, X의 **실측 값** 이 기대 범위 내 | 0건 수집/빈 배열 응답/NaN 점수 = **FAIL**, hotfix 필요 |
| P3 | **6축 메트릭 or 도메인 KPI 실측** — 하드코딩/fixture 말고 실제 DB 행이나 외부 API 응답 기준 | 스크린샷 또는 SQL 결과 저장 |
| P4 | **회고 작성** — `docs/retrospective/phase-{N}.md` 또는 `docs/04-report/` 에 실패/숨은 버그 포함 기록 | Dogfood에서 발견된 갭을 반드시 명시 (있으면 후속 Phase 등록) |

### 근거 교훈

- **Phase 43 (F534~F536)**: 모든 TDD/E2E PASS + PR merge 후에도 KOAMI Dogfood 5회 반복에서야 2개 숨은 버그 발견 (F534 주입 사이트 누락 / F536 session_id 불일치). Unit test로는 감지 불가능한 통합 갭이었음. PR #565, #573로 hotfix.
- **Phase 42 (F533 MetaAgent)**: 실측 없이 "TDD+E2E 완료"로 Phase 선언 → Dogfood에서 agent_run_metrics 0건 발견 → Phase 43 재개.
- **결론**: 가상 데이터로 PASS하는 모든 테스트는 "이 기능이 프로덕션에서 실제로 동작한다"를 증명하지 못함. Phase Exit은 **Reality** (실측) 가 요건.

### 특례

- **내부 인프라 Phase** (예: CI/CD 개선, lint 룰 추가) — Dogfood 불가 시, 대신 **자기 자신을 통과시키는 1회 실행** 으로 대체 (C55 lint-new-files.sh 가 자기 PR에서 작동한 사례)
- **Rules/문서만 수정한 Phase** — Phase Exit 체크리스트 자체가 적용되지 않음 (라이프사이클 밖)

---

## 특수 상태

| 상태 | 이모지 | 의미 |
|------|--------|------|
| Blocked | `🔧(blocked)` | 외부 의존 또는 결정 대기 |
| Dropped | `🗑️` | 폐기 결정 (사유 비고 필수) |
| Deferred | `📋(idea)` with DEFER note | 추후 재평가 예정 |

---

## 이모지 전환 규칙

```
📋(idea) → 📋(groomed) → 📋(plan)
           ↓
        🔧(design) → 🔧(impl) → 🔧(review) → 🔧(test)
                                              ↓
                                           ✅ → ✅(deployed)

언제든: 🔧(blocked) 가능 → 블록 해소 시 이전 상태로 복귀
```

---

## SPEC.md 적용 가이드

```markdown
# 형식
| FN | 제목 (FX-REQ-NNN, PN) | Sprint M | 🔧(impl) | 비고 |

# 예시
| F512 | 문서 체계 정비 (FX-REQ-535, P0) | Sprint 264 | 🔧(impl) | A-3~A-8 진행 |
| F513 | Work Management API TDD (FX-REQ-536, P0) | Sprint 264 | 📋(plan) | TDD Red 설계 중 |
```

---

## 관련 문서

- `ROADMAP.md` — Phase 전체 계획
- `BLUEPRINT.md` — 프로젝트 아키텍처
- `.claude/rules/tdd-workflow.md` — TDD Red→Green 상세
- `.claude/rules/task-promotion.md` — Backlog → F-item 승격 + ID forward 패턴
- `SPEC.md §5` — F-item SSOT
- `bkit:design-validator` agent — Stage 3 Exit 자동 검증 (Phase 8 Review linked)
