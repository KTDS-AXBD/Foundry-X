---
code: FX-PLAN-WM-001
title: 프로젝트 관리 체계 개선 계획서
version: 2.1
status: Draft
created: 2026-04-12
updated: 2026-04-12
author: Sinclair Seo + Claude
---

# 프로젝트 관리 체계 개선 계획서 v2.1

## 1. 진단 요약

### 1.1 현재 체계의 강점

Foundry-X는 이미 상당히 성숙한 프로젝트 관리 체계를 갖추고 있다.

SPEC.md를 SSOT로 삼아 F-item 509개를 추적하고, Plan→Design→Analysis→Report 4단계 문서 사이클을 33개 Phase에 걸쳐 일관되게 운영하고 있다. Gap Analysis로 Design↔Implementation 정합성을 90% 이상 유지하고, GitHub Projects 보드 동기화(F503), Velocity 추적(F505), Priority 변경 이력(F507) 등 자동화 스크립트도 16개가 작동 중이다. 22개 PRD, 112개 Plan, 49개 Design, 31개 Analysis, 45개 Report — 문서 산출물의 양과 일관성은 우수하다.

### 1.2 구조적 문제 3가지

그러나 큰 그림(Big Picture) 관점에서 세 가지 구조적 문제가 있다.

**문제 1 — Blueprint/Roadmap이 버전 관리되는 독립 산출물로 존재하지 않는다.**

현재 로드맵 정보는 SPEC.md §3 마일스톤에 묻혀 있고, Phase별 PRD는 22개 디렉토리에 흩어져 있다. "지금 어디에 있고, 어디로 가는가"를 한 문서에서 볼 수 없다. SPEC.md가 1,377줄짜리 만능 문서가 되면서 상태 추적, 기능 등록, 마일스톤, KPI가 한 파일에 뒤섞였다.

**문제 2 — F-item 라이프사이클 상태가 너무 거칠다.**

현재 ✅(완료) / 🔧(진행) / 📋(대기) 세 가지뿐이다. "설계 중", "코드리뷰 중", "테스트 실패로 블록됨", "배포 대기" 같은 중간 상태가 없어서 실시간 흐름 파악이 안 된다. shared/task-state.ts에 10-상태 머신이 정의돼 있지만 SPEC.md나 웹 UI와 연결되지 않았다.

**문제 3 — 관찰(Observe)은 있으나 관리(Manage)가 없다.**

F509 Walking Skeleton으로 스냅샷/분류/컨텍스트 조회는 가능하지만, 웹에서 작업을 생성하거나 상태를 전이시키거나 스프린트에 배정하는 행위가 불가능하다. 모든 관리 행위가 SPEC.md 수동 편집 + Git commit에 의존한다.

**문제 4 — 문서 비대화와 아카이브 부재.**

SPEC.md §6 Execution Plan이 841줄(전체의 61%)을 차지하는데, Sprint 1~35까지 완료된 체크리스트가 그대로 남아 있다. docs/01-plan/features에 168개, docs/02-design/features에 163개 파일이 쌓여 있지만, 완료된 Phase의 산출물을 아카이브하는 정책이 없다. 문서가 누적될수록 탐색 비용이 증가하고, 에이전트가 컨텍스트에 로딩할 때 불필요한 토큰을 소비한다.

**문제 5 — Phase B 코드 변경에 TDD가 명시되지 않았다.**

프로젝트에 `.claude/skills/tdd/SKILL.md`와 `.claude/rules/testing.md`가 있고, 514개 테스트 파일이 존재하지만, F509 Work Management API(work.service.ts)에는 **단위 테스트가 없다**. E2E 5개만 있을 뿐이다. 기존 프로젝트 표준(Hono app.request() + D1 mock)이 적용되지 않은 상태에서 API를 확장하면 회귀 리스크가 커진다.

---

## 2. 개선 방향: Jira를 만들지 않는다

이전 계획서(v1)는 Task CRUD, Sprint Board, CI/CD 연동 등 Jira를 재발명하는 방향이었다. 이는 1인 개발 현실에 맞지 않고, "Git이 진실" 철학과도 충돌한다.

개선 방향을 다음과 같이 재설정한다:

1. **Blueprint + Roadmap을 버전 관리되는 1급 문서로 독립시킨다** — 큰 그림이 항상 현행화된 상태로 존재
2. **SPEC.md의 역할을 명확히 분리한다** — 과부하를 줄이고 각 문서의 책임을 단일화
3. **완료된 Phase 산출물을 아카이브한다** — 현행 문서는 가볍게, 이력은 보존
4. **기존 자동화를 연결한다** — 새로 만들기보다 있는 것을 웹/대시보드로 표면화
5. **F-item 상태를 정밀화하되 SPEC.md 호환성을 유지한다** — 기존 ✅/🔧/📋는 유지, 세부 상태는 메타데이터로
6. **코드 변경은 TDD로 진행한다** — 테스트 먼저, 구현은 그 다음

---

## 3. 개선 항목

### 3.1 Blueprint 문서 도입 (신규)

**목적**: "이 프로젝트가 무엇이고, 어디로 가는가"를 한 곳에서 볼 수 있게

**산출물**: `docs/BLUEPRINT.md` (버전 관리)

```
BLUEPRINT.md (v1.0, v2.0, ...)
├── Vision & 핵심 철학
├── 아키텍처 개요도 (모노리포 4패키지 + 외부 연동)
├── 서비스 구성도 (AX BD MSA: AI Foundry + 6개 *-X + AXIS DS)
├── Phase 전체 맵 (Phase 1~33 완료 + 34~ 계획)
├── 핵심 의사결정 요약 (ADR 참조 링크)
└── 버전 이력
```

**현행화 규칙**:
- Phase 완료 시 버전 범프 (Phase 33 완료 → Blueprint v1.33)
- 아키텍처 변경 시 메이저 버전 범프
- Meta-only 변경이므로 master 직접 commit

**이것이 해결하는 문제**: 새 세션/새 에이전트/새 팀원이 프로젝트를 파악할 때 SPEC.md 1,377줄을 읽을 필요 없이 Blueprint 한 문서로 큰 그림을 잡을 수 있다.

### 3.2 Roadmap 문서 도입 (신규)

**목적**: "지금 어디에 있고, 다음에 뭘 하는가"를 시간축으로 보여줌

**산출물**: `docs/ROADMAP.md` (버전 관리)

```
ROADMAP.md (v1.0, v2.0, ...)
├── 현재 위치 (Active Phase + Sprint)
├── 단기 계획 (이번/다음 Phase, F-item 목록, 예상 Sprint 수)
├── 중기 계획 (2~3 Phase 앞, 방향성 + 주요 의존관계)
├── 장기 백로그 (F112, F117 등 수요 대기 항목 + 폐기 검토 대상)
├── 의존관계 다이어그램 (Phase 간)
└── 버전 이력 + 변경 사유
```

**현행화 규칙**:
- Sprint 완료 시: "현재 위치" 갱신
- Phase 완료 시: 단기→중기 시프트 + 버전 범프
- 분기 1회: 장기 백로그 정리 (폐기/승격 판단)

**SPEC.md §3 마일스톤과의 관계**: SPEC.md §3은 완료된 이력의 레코드, ROADMAP.md는 미래 방향의 계획. 역할 분리.

### 3.3 SPEC.md 역할 재정의

현재 SPEC.md가 맡고 있는 역할과 분리 대상:

| 현재 역할 | 유지/분리 | 이관 대상 |
|----------|----------|----------|
| §1 프로젝트 개요 | 분리 → | BLUEPRINT.md |
| §2 현재 상태 (Sprint 체크리스트) | **유지** | — (SPEC 핵심 역할) |
| §3 마일스톤 | 유지 (완료 이력) + 분리 (미래 계획) | 미래 부분 → ROADMAP.md |
| §4 성공 지표 | 분리 → | BLUEPRINT.md 또는 별도 KPI 문서 |
| §5 기능 항목 (F-items) | **유지** | — (SPEC 핵심 역할) |
| §6 Execution Plan | 이미 ARCHIVED | — |
| §7~§9 기술 결정/위험 | 분리 → | docs/adr/ (이미 존재) |

**결과**: SPEC.md는 **§2 상태 + §5 F-items**에 집중하는 린(lean) 문서가 된다. 현재 1,377줄 → 예상 800줄 이하.

### 3.4 F-item 상태 정밀화

현재 3단계(✅/🔧/📋)를 유지하면서 세부 상태를 추가한다. SPEC.md 호환성을 깨지 않기 위해 기존 이모지는 그대로 쓰고, 괄호 안에 세부 상태를 명시한다.

```
기존:  | F510 | Work Item CRUD | v34 | 🔧 | Sprint 262 |
개선:  | F510 | Work Item CRUD | v34 | 🔧(design) | Sprint 262, PR 준비 중 |
```

**상태 체계**:

```
📋 Backlog
  📋(idea)     — 아이디어 단계, 검토 전
  📋(groomed)  — 검토 완료, 착수 대기

🔧 In Progress
  🔧(plan)     — Plan 문서 작성 중
  🔧(design)   — Design 문서 작성 중
  🔧(impl)     — 구현 중
  🔧(review)   — PR 생성, 코드리뷰/CI 대기
  🔧(test)     — Gap Analysis 수행 중
  🔧(blocked)  — 외부 의존/이슈로 중단

✅ Done
  ✅           — 완료 (Match Rate ≥ 90%)
  ✅(deployed) — 프로덕션 배포 확인

🗑️ Dropped
  🗑️(dropped)  — 폐기 (사유 비고에 기록)
```

**이점**: 기존 파서(board-sync-spec.sh 등)는 앞 이모지만 보면 되고, 세부 상태가 필요한 곳은 괄호까지 파싱.

### 3.5 프로세스 흐름 명확화

현재 Plan→Design→Analysis→Report 사이클은 잘 작동하지만 **진입/퇴장 기준(Entry/Exit Criteria)**이 암묵적이다. 이를 명문화한다.

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Idea   │───→│ Planning │───→│  Design  │───→│   Impl   │───→│ Verify   │
│ 📋(idea)│    │ 🔧(plan) │    │🔧(design)│    │ 🔧(impl) │    │ 🔧(test) │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                                     │
                                              ┌──────────┐     ┌────┴─────┐
                                              │  Report  │←────│  PDCA    │
                                              │    ✅    │     │ Gap<90%→ │
                                              └──────────┘     │ 재작업   │
                                                               └──────────┘
```

**진입/퇴장 기준**:

| 단계 | 진입 조건 | 퇴장 조건 | 산출물 |
|------|----------|----------|--------|
| Idea → Planning | SPEC.md에 F# 등록 | Plan.md 작성 완료 + REQ 코드 매핑 | sprint-N.plan.md |
| Planning → Design | Plan 승인 | Design.md 작성 완료 + 기술 결정 확정 | sprint-N.design.md |
| Design → Impl | Design 승인 | PR 생성 + CI 통과 | Feature branch + PR |
| Impl → Verify | PR merge | Gap Analysis 완료 (Match Rate 산출) | sprint-N.analysis.md |
| Verify → Done | Match Rate ≥ 90% | Report 작성 + SPEC 상태 ✅ 갱신 | FX-RPRT-N.md |
| Verify → PDCA | Match Rate < 90% | 개선 사항 식별 + 재작업 계획 | 재진입 (Design 또는 Impl) |

### 3.6 웹 대시보드: 있는 것을 보여주기

Jira를 만드는 대신, **이미 Git/스크립트/SPEC에 있는 데이터를 웹에서 읽을 수 있게** 한다.

**현재 F509 (3탭: Kanban + Context + Classify)에 추가할 뷰**:

| 뷰 | 데이터 소스 | 목적 |
|---|---|---|
| **Pipeline Flow** | SPEC.md F-items + 세부 상태 | Idea→Plan→Design→Impl→Verify→Done 단계별 아이템 수 |
| **Velocity Chart** | docs/metrics/velocity/*.json | Sprint별 완료 F-item 수 트렌드 |
| **Phase Progress** | scripts/epic/phase-progress.sh 결과 | 현재 Phase 진행률 바 |
| **Backlog Health** | SPEC.md 📋 항목 | 장기 대기 항목 경고, 나이(age) 표시 |
| **Recent Decisions** | docs/adr/ | 최근 아키텍처 결정 요약 |

**핵심 원칙**: 새 데이터 수집 체계를 만들지 않는다. 이미 있는 SPEC.md, velocity JSON, phase-progress.sh 결과를 API로 노출하고 웹에서 시각화만 한다.

### 3.7 장기 백로그 거버넌스

현재 F112, F117 등이 "수요 대기"로 좀비화되어 있다. 정기 정리 프로세스를 도입한다.

**분기 1회 Backlog Grooming**:
1. 📋 상태 F-item 중 3개 Phase 이상 미착수 항목 식별
2. 각 항목에 대해 판단: **승격**(다음 Phase 편입) / **보류**(사유 기록, 1분기 더 유지) / **폐기**(🗑️ 전환)
3. ROADMAP.md 장기 백로그 섹션 갱신
4. SPEC.md 비고에 결정 사유 기록

### 3.8 문서 아카이브 전략

SPEC.md, docs/ 산출물, CLAUDE.md 계열 문서가 Phase를 거듭하면서 비대해지는 문제를 해결한다.

**원칙**: 현행 문서는 최근 3~5 Phase 분량만 유지. 나머지는 archive/ 하위로 이동. Git 이력은 보존되므로 정보 손실은 없다.

**아카이브 대상과 방법**:

| 대상 | 현재 상태 | 아카이브 방법 |
|------|----------|-------------|
| **SPEC.md §6** (Execution Plan) | 841줄, Sprint 1~35 체크리스트 | `docs/archive/spec-execution-plan-v5.md`로 이동. SPEC.md에는 §6 제목 + "Archived → 링크" 한 줄만 남김 |
| **SPEC.md §2** (현재 상태) | 197줄, Sprint 1~261 체크리스트 | 최근 5개 Sprint만 유지. 나머지는 `docs/archive/spec-status-history.md`로 이동 |
| **SPEC.md §7~§9** | 기술 결정/위험 | BLUEPRINT.md 또는 docs/adr/로 이관 후 §7~§9 삭제 |
| **docs/01-plan/features/** | 168개 plan 파일 | Phase 30 이전(Sprint ~238) → `docs/archive/plans/` |
| **docs/02-design/features/** | 163개 design 파일 | Phase 30 이전 → `docs/archive/designs/` |
| **docs/03-analysis/** | 31개 analysis 파일 | Phase 30 이전 → `docs/archive/analyses/` |
| **docs/04-report/** | 45개 report 파일 | Phase 30 이전 → `docs/archive/reports/` |

**아카이브 후 SPEC.md 예상 줄 수**:
- §2 현재 상태: 197 → ~30줄 (최근 5 Sprint)
- §5 F-items: 223줄 (유지)
- §6 Execution Plan: 841 → 1줄 (링크만)
- §7~§9: 삭제
- 기타(§1, §3, §4): §1·§4 BLUEPRINT로 이관, §3 유지
- **예상 총: ~350줄** (현재 1,377줄의 25%)

**현행화 규칙**:
- Phase 완료 시: 해당 Phase 이전 산출물을 archive/로 일괄 이동
- 아카이브 스크립트: `scripts/archive-phase.sh {phase_number}` (Phase C에서 자동화)
- docs/INDEX.md는 archive 포함 전체 인덱싱 유지

**CLAUDE.md 관리**: 현재 54줄로 비대하지 않으나, Phase가 진행되면서 Gotchas나 참조 경로가 늘어날 수 있다. CLAUDE.md는 "이번 세션에 필요한 것"만 담고, 장기 참조는 `.claude/rules/`나 BLUEPRINT.md로 분리하는 원칙을 유지한다.

### 3.9 TDD 적용 전략

Phase B(코드 변경)의 모든 작업에 TDD를 적용한다. 프로젝트에 이미 `.claude/skills/tdd/SKILL.md`와 `.claude/rules/testing.md`가 정의되어 있으므로 이를 따른다.

**현재 Work Management 테스트 현황**:

| 계층 | 파일 | 테스트 수 | 상태 |
|------|------|----------|------|
| API 단위 (work.service.ts) | 없음 | 0 | ❌ 미작성 |
| API 라우트 (work.ts) | 없음 | 0 | ❌ 미작성 |
| Web E2E (work-management.spec.ts) | 있음 | 5 | ✅ 통과 |

**TDD 적용 계획**:

**B-0 (선행): 기존 F509 테스트 보강**

Phase B 코드 변경 전에, 현재 work.service.ts/work.ts에 대한 단위 테스트를 먼저 작성한다. 이것이 기존 기능의 회귀 방지 안전망이 된다.

```
packages/api/src/__tests__/work.service.test.ts  (신규)
  - getSnapshot(): SPEC 파싱 + GitHub API mock → 올바른 응답 구조
  - getContext(): 최근 커밋/다음 액션 반환 검증
  - classify(): LLM mock + regex fallback 양쪽 경로
  - parseSpecItems(): 정규식 파싱 edge cases

packages/api/src/__tests__/work.routes.test.ts  (신규)
  - GET /api/work/snapshot → 200 + Zod 스키마 준수
  - GET /api/work/context → 200 + 구조 검증
  - POST /api/work/classify → 200 + 분류 결과 검증
  - 인증 실패 → 401
```

**B-1~B-5: Red → Green → Refactor 사이클**

각 API 엔드포인트 추가 시:
1. **Red**: 새 엔드포인트의 Zod 스키마 + 테스트 먼저 작성 → 실패 확인
2. **Green**: 최소한의 구현으로 테스트 통과
3. **Refactor**: 코드 정리 + 기존 테스트 전체 통과 확인

```
예시: B-1 GET /api/work/velocity
  Red:   work.routes.test.ts에 "GET /api/work/velocity → 200 + velocity 배열" 추가 → FAIL
  Green: work.service.ts에 getVelocity() 구현 + routes에 핸들러 추가 → PASS
  Refactor: 공통 에러 처리 정리, 타입 추출
```

**E2E 확장**: Phase B 완료 시 work-management.spec.ts에 새 뷰(Pipeline Flow, Velocity Chart) E2E 추가.

**테스트 도구 규칙** (기존 testing.md 준수):
- API: Hono `app.request()` 직접 호출
- D1 mock: in-memory SQLite (`better-sqlite3`)
- GitHub API mock: `vi.mock()` + fixture 응답
- fixture factory: `makeWorkSnapshot()`, `makeVelocityEntry()` 등 make* 패턴

---

## 4. 실행 계획

### Phase A: 문서 체계 정비 + 아카이브 (즉시, 코드 변경 없음)

| 항목 | 작업 | 예상 공수 | 산출물 |
|------|------|----------|--------|
| A-1 | BLUEPRINT.md v1.0 초안 작성 | 1 세션 | docs/BLUEPRINT.md |
| A-2 | ROADMAP.md v1.0 초안 작성 | 1 세션 | docs/ROADMAP.md |
| A-3 | SPEC.md 경량화: §1·§4 → Blueprint, §3(미래) → Roadmap, §7~§9 → adr/ | 1 세션 | SPEC.md |
| A-4 | **SPEC.md §6 아카이브**: 841줄 → docs/archive/spec-execution-plan-v5.md로 이동 | 0.5 세션 | SPEC.md §6 = 링크 1줄 |
| A-5 | **SPEC.md §2 아카이브**: 최근 5 Sprint만 유지, 나머지 → docs/archive/spec-status-history.md | 0.5 세션 | SPEC.md §2 ~30줄 |
| A-6 | **docs/ 산출물 아카이브**: Phase 30 이전 plan/design/analysis/report → docs/archive/{plans,designs,analyses,reports}/ | 1 세션 | docs/ 경량화 |
| A-7 | F-item 세부 상태 표기 적용 (🔧/📋 항목에 괄호 추가) | 0.5 세션 | SPEC.md §5 |
| A-8 | 프로세스 흐름 + Entry/Exit Criteria를 .claude/rules/에 추가 | 0.5 세션 | process-lifecycle.md |

**총 5 세션, 코드 변경 0건, master 직접 commit**

**예상 효과**:
- SPEC.md: 1,377줄 → ~350줄 (75% 감소)
- docs/ 활성 파일: ~400개 → ~100개 (최근 Phase만)
- 에이전트 컨텍스트 로딩 효율 대폭 향상

### Phase B: 기존 데이터 표면화 — TDD 적용 (코드 변경, 2~3 Sprint)

| 항목 | 작업 | 예상 공수 | 산출물 |
|------|------|----------|--------|
| **B-0** | **기존 F509 테스트 보강** — work.service.test.ts + work.routes.test.ts 신규 작성 (회귀 방지 안전망) | 0.5 Sprint | 2개 테스트 파일, ~15 test cases |
| B-1 | API: GET /api/work/velocity (TDD: Red→Green→Refactor) | 0.5 Sprint | routes/work.ts + test |
| B-2 | API: GET /api/work/phase-progress (TDD) | 0.5 Sprint | routes/work.ts + test |
| B-3 | API: GET /api/work/backlog-health (TDD) | 0.5 Sprint | routes/work.ts + test |
| B-4 | Web: Pipeline Flow 뷰 + E2E 테스트 | 1 Sprint | work-management.tsx + spec |
| B-5 | Web: Velocity + Phase Progress 차트 + E2E | 0.5 Sprint | work-management.tsx + spec |

**TDD 규칙 (모든 B 항목 적용)**:
1. 테스트 먼저 작성 → 실패 확인 (Red)
2. 최소 구현으로 통과 (Green)
3. 리팩터링 + 전체 테스트 통과 확인 (Refactor)
4. Hono `app.request()` + D1 mock (`better-sqlite3`) 사용
5. fixture factory: `make*()` 패턴 (testing.md 준수)

**총 2~3 Sprint, PR 경유, 예상 추가 테스트: ~30 cases**

### Phase C: 자동화 연결 (코드 변경, 1 Sprint)

| 항목 | 작업 | 예상 공수 | 산출물 |
|------|------|----------|--------|
| C-1 | board-sync-spec.sh 확장: 세부 상태 파싱 지원 | 0.5 Sprint | scripts/board/ 갱신 |
| C-2 | Sprint 완료 시 ROADMAP.md 자동 갱신 스크립트 | 0.3 Sprint | scripts/roadmap-update.sh |
| C-3 | Phase 완료 시 BLUEPRINT.md 버전 범프 자동화 | 0.2 Sprint | scripts/blueprint-bump.sh |
| C-4 | **Phase 완료 시 아카이브 자동화** 스크립트 | 0.5 Sprint | scripts/archive-phase.sh |
| C-5 | CHANGELOG.md 자동 생성 (git log + F-item 매핑) | 0.5 Sprint | scripts/changelog-gen.sh |

**총 1 Sprint, PR 경유**

### 우선순위 및 의존관계

```
Phase A (문서 정비 + 아카이브)
   즉시 착수, 코드 변경 없음
   │
   ├──→ Phase B (데이터 표면화, TDD)
   │       B-0(기존 테스트 보강) → B-1~B-3(API, TDD) → B-4~B-5(Web + E2E)
   │       │
   │       └──→ Phase C (자동화 연결)
   │               C-1(보드 파서) + C-2~C-3(문서 자동화) + C-4(아카이브 자동화) + C-5(CHANGELOG)
   │
   └──→ Phase C-4 (아카이브 자동화는 A 직후에도 착수 가능)
```

Phase A는 오늘이라도 시작할 수 있다. B-0(테스트 보강)은 A와 병행 가능. C-4(아카이브 자동화)는 A 완료 직후 착수해도 된다.

---

## 5. 버전 관리 체계 요약

개선 후 Foundry-X의 핵심 문서와 현행화 주기:

| 문서 | 역할 | 현행화 트리거 | 버전 체계 |
|------|------|-------------|----------|
| **BLUEPRINT.md** | 큰 그림 (비전, 아키텍처, Phase 맵) | Phase 완료 / 아키텍처 변경 | v1.{Phase번호} |
| **ROADMAP.md** | 방향 (현재 위치, 단기·중기·장기) | Sprint 완료 / Phase 완료 / 분기 정리 | v1.{Sprint번호} |
| **SPEC.md** | 실행 기록 (상태 + F-items) | F-item 상태 변경 시 즉시 | v{major}.{minor} (현행 5.78) |
| **CHANGELOG.md** | 변경 이력 | Phase/Sprint 완료 시 | Keep a Changelog 형식 |
| **docs/INDEX.md** | 문서 인덱스 | 문서 추가/삭제 시 | 자동 생성 |

**관계 다이어그램**:

```
BLUEPRINT.md (왜, 무엇을)
     │
     ├── ROADMAP.md (언제, 어떤 순서로)
     │       │
     │       └── SPEC.md (지금 상태, F-item 기록)
     │               │
     │               ├── docs/01-plan/ (각 F-item 계획)
     │               ├── docs/02-design/ (각 F-item 설계)
     │               ├── docs/03-analysis/ (Gap 분석)
     │               └── docs/04-report/ (완료 보고)
     │
     └── CHANGELOG.md (변경 이력 요약)
```

---

## 6. 이전 계획서(v1) 대비 변경 사항

| v1 (Jira 접근) | v2 (실용 접근) | 변경 사유 |
|----------------|---------------|----------|
| Work Item CRUD + D1 테이블 (F510~F515) | Blueprint/Roadmap 문서 도입 | 1인 개발에 DB CRUD는 과잉 |
| Sprint Board UI (F516~F520) | 기존 데이터 시각화 (Velocity, Pipeline) | 이미 스크립트로 데이터 있음 |
| CI/CD webhook 연동 (F521~F524) | 기존 deploy.yml 결과 표면화 | 새 인프라보다 있는 것 노출 |
| 흐름 대시보드 신규 (F525~F528) | SPEC.md 세부 상태 + Pipeline Flow 뷰 | 데이터 소스를 새로 만들지 않음 |
| 예상 4 Phase, 19개 F-item | 3 Phase (A/B/C), 14개 작업 항목 | 범위 축소, 현실성 확보 |
| D1을 운영 DB로 확장 | Git/SPEC.md를 SSOT로 유지 | "Git이 진실" 철학 존중 |

---

## 7. 성공 기준

| 기준 | 측정 방법 | 목표 |
|------|----------|------|
| Blueprint/Roadmap 현행화율 | 최신 Phase 반영 여부 | Phase 완료 1주 내 갱신 |
| SPEC.md 줄 수 | `wc -l SPEC.md` | 현재 1,377 → **350 이하** |
| docs/ 활성 파일 수 | `find docs -not -path "*/archive/*" -name "*.md" | wc -l` | 현재 ~400 → **100 이하** |
| F-item 세부 상태 활용도 | 괄호 상태가 있는 🔧/📋 비율 | 진행 중 항목 100% |
| Work Management API 테스트 커버리지 | work.service + work.routes 테스트 수 | **0 → 30 이상** |
| 웹 대시보드 데이터 범위 | 표시 가능한 뷰 수 | 현재 3 → 6 이상 |
| 좀비 백로그 해소 | 3 Phase 이상 미착수 📋 항목 수 | 0건 (승격 또는 폐기) |
| 아카이브 자동화 | Phase 완료 시 자동 아카이브 실행 여부 | scripts/archive-phase.sh 운영 |

---

## 8. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-04-12 | 초안 (Jira-like CRUD 접근) |
| v2.0 | 2026-04-12 | 전면 재작성 (실용 접근: Blueprint/Roadmap + 기존 데이터 표면화) |
| v2.1 | 2026-04-12 | 문서 아카이브 전략 추가 (§3.8), TDD 적용 전략 추가 (§3.9), Phase A에 아카이브 작업 추가, Phase B에 B-0(테스트 보강) 선행 작업 추가, Phase C에 C-4(아카이브 자동화) 추가, 성공 기준에 테스트 커버리지/아카이브 지표 추가 |
