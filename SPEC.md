---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 5.83
status: Active
category: SPEC
system-version: Sprint 294
created: 2026-03-16
updated: 2026-04-15
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X — AX 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼.
핵심 철학: **"Git이 진실, Foundry-X는 렌즈"** — 명세/코드/테스트/결정 이력은 Git에, Foundry-X는 읽기/분석/동기화 레이어.

- **상세 개요 + 아키텍처**: [BLUEPRINT.md](BLUEPRINT.md)
- **Phase 로드맵 + 계획**: [ROADMAP.md](ROADMAP.md)
- **현행 PRD**: `docs/specs/FX-SPEC-PRD-V8_foundry-x.md` (v8)

## §2 현재 상태

> Sprint 1~160 이력: [docs/archive/spec-current-state-2026-04.md](archive/spec-current-state-2026-04.md)

| Sprint | 상태 |
|--------|------|
| Sprint 261 | ✅ 완료 — ax-plugin source↔cache drift 방지 + C33 eslint cleanup (PR #508/#510) |
| Sprint 262 | ✅ 완료 — Phase 35 F511 Work Management 품질 보강 (D1 0126, ~3452 tests, E2E 273) |
| Sprint 263 | ✅ 완료 — Phase 36-A 착수: SPEC 파서 테스트 A-0 (48건 PR #517) |
| Sprint 264 | ✅ 완료 — F512 Phase A 정비 (A-0~A-8) + F513 TDD (B-0~B-3) (PR #518) |
| Sprint 273 | ✅ 완료 — F516 Backlog 인입 파이프라인 + 실시간 동기화 (PR #538, +1166/-5, D1 0128) |
| Sprint 274 | ✅ 완료 — F517 메타데이터 트레이서빌리티 (PR #539, +1317/-1, D1 0129+0130, Gap 100%) |
| Sprint 275 | ✅ 완료 — F518 Work Ontology KG (PR #541, D1 0131, TDD 18 tests, Gap 91%) |
| Sprint 276 | ✅ 완료 — F519 대시보드 현행화 (PR #543, +327/-5, Match 100%) |
| Sprint 277 | ✅ 완료 — F522+F523 shared 슬리밍 + D1 격리 (PR #544, +858/-38, 17 files) |
| Sprint 278 | ✅ 완료 — F524+F525 E2E 자동 추출 + Gap-E2E 통합 점수 (PR #548, +1093/-0, TDD 18/18, Composite 97%) |
| Sprint 279 | ✅ 완료 — F526 autopilot Verify E2E 통합 (PR #550, +532/-0, 6 files) |
| Sprint 280 | ✅ 완료 — F527 Agent Runtime L2 (PR #549, +1858/-0, 18 files, Match 97%) |
| Sprint 284 | ✅ 완료 — F531 발굴 Graph 실행 연동 (PR #558, TDD 41, Gap 95%) |
| Sprint 285 | ✅ 완료 — F532 에이전트 스트리밍 E2E (PR #559, +718, TDD+E2E) |
| Sprint 286 | ✅ 완료 — F533 MetaAgent 실전 검증 (PR #560, +868, D1 0134, TDD+E2E) |
| Sprint 287 | ✅ 완료 — F534 DiagnosticCollector 훅 삽입 (PR #564+#565 hotfix, 실증: agent_run_metrics 0→9건) |
| Sprint 288 | ✅ 완료 — F535 Graph 실행 정식 API + UI (PR #569, +705, D1 0135) |
| Sprint 289 | ✅ 완료 — F536 MetaAgent 자동 진단 훅 (PR #571, +496, TDD 189줄) |

| 항목 | 상태 |
|------|------|
| Workers | foundry-x-api.ktds-axbd.workers.dev ✅ |
| Pages | fx.minu.best ✅ |
| typecheck | ✅ |
| lint | ✅ (0 error) |

> **📏 실시간 수치** — 하드코딩 금지. `/ax:daily-check` 자동 수집 또는:
> ```
> wc -l SPEC.md && find packages/api/src/db/migrations/*.sql | sort | tail -1
> ```
> **마지막 실측** (Sprint 293, 2026-04-15): ~11 routes, ~30 services, ~14 schemas, D1 0137, 10 packages — Phase 43 완료 + Phase 44 진행 (F542/F543/F544 ✅ S290~S292, F538 ✅ 부분 S293 — 3/10 Discovery routes fx-discovery 이전 + 배포 파이프라인 5건 해소)

## §3 Phase 진행 현황

> **Milestone = Phase 완료.** v2.5 이후 프로젝트-레벨 SemVer 중단, Phase 완료가 Milestone 역할 수행.  
> 전체 Phase 계획: [ROADMAP.md](ROADMAP.md) | 용어 정의: [taxonomy.md](docs/specs/fx-work-unit-taxonomy/taxonomy.md)

| Phase | 상태 |
|-------|:----:|
| Phase 33 Work Observability (F509) | ✅ Sprint 261 |
| Phase 34 Multi-Agent Sessions (F510) | ✅ Sprint 262 |
| Phase 35 Quality Hardening (F511) | ✅ Sprint 263 |
| **Phase 36 Work Management Enhancement** (F512~F515) | ✅ Sprint 264~266 |
| ↳ Sprint 264 — Phase 36-A(F512) + Phase 36-B 착수(F513) | ✅ |
| ↳ Sprint 265 — Phase 36-B 완성 (F514) | ✅ |
| ↳ Sprint 266 — Phase 36-C (F515) | ✅ |
| **Phase 37 Work Lifecycle Platform** (F516~F518) | ✅ Sprint 273~275 |
| **Phase 38 Dashboard Overhaul** (F519) | ✅ Sprint 276 |
| **Phase 39 MSA Walking Skeleton** (F520~F523) | ✅ Sprint 268(F520~F521), 277(F522~F523) |
| **Phase 40 Agent Autonomy** (F524~F526) | ✅ Sprint 278~279 |
| **Phase 41 HyperFX Agent Stack** (F527~F530) | ✅ Sprint 280~283 |
| **Phase 42 HyperFX Deep Integration** (F531~F533) | ✅ Sprint 284~286 |
| **Phase 43 HyperFX Activation** (F534~F537) | ✅ Sprint 287~289 + F537 hotfix |
| **Phase 44 MSA 2차 분리 + Agent 품질 튜닝** (F538~F544, F539 3분할) | 🔧 진행 — F542/F543/F544 ✅ (S290~S292), F538 ✅ 부분(S293, 3/10 routes). **F539 3분할 확정** (PRD `docs/specs/fx-gateway-cutover/prd-final.md` 95/100 Ready): F539a(k6 재측정 S294 📋plan) / F539b(fx-gateway 프로덕션 전환 S295 📋) / F539c(7 라우트 Service Binding S296 📋). F540~F541은 Sprint 297~298로 1 스프린트씩 이동 |

## §4 성공 지표

> 상세 KPI + 측정 방법: [BLUEPRINT.md](BLUEPRINT.md)

| 지표 | 목표 | 현재 |
|------|------|------|
| docs/ 활성 파일 | ≤ 100개 | 아카이브 진행 중 |
| Work Mgmt API 테스트 | 30건+ | TDD 예정 |
| Gap Analysis Match Rate | ≥ 90% | 전 Sprint 달성 |
| `--no-verify` 우회 비율 | < 20% | 0% |

## §5 기능 항목 (F-items)

> F-item SSOT. 파서(work.service.ts)가 이 섹션에서 Sprint/status를 추출함.
> Phase 36 F-items에 세부 상태 표기: `🔧(impl)`, `🔧(review)`, `📋(plan)` 등

### Phase 1~29 F-items (Archived)

> 510건 완료. 상세: `docs/archive/spec-fitems-phase1-29.md`

### Phase 30+ (Active)
| **Phase 30: 발굴 단계 평가결과서 v2 F493** | | | | F296 전면 개편 — AX BD 2단계 발굴 9-스테이지 리치 리포트. `docs/specs/axbd-skill/CLAUDE_AXBD/references/03_AX사업개발_발굴단계완료(안).html` 샘플 구조를 JSON 스키마로 정규화 |
| F493 | 발굴 단계 평가결과서 v2 — `/discovery/report` 전면 개편: AX BD 9단계(2-1~2-9) 리치 리포트 (레퍼런스/시장/경쟁/도출/선정/고객/BM/패키징/페르소나 평가). 기존 F296 `evaluation_reports` 스키마 확장(`report_data` JSON blob 추가 + migration) + 구조화 JSON ↔ React 9탭 렌더러 (카드/메트릭/표/BMC/SWOT/insight/next-step/Chart.js). 3개 아이템 수동 fixture seed (KOAMI, XR Studio, IRIS) 동봉 + prod D1 insert 스크립트. 샘플 HTML = `references/03_AX사업개발_발굴단계완료(안).html` (1522줄, Fooding AI 예시) (FX-REQ-485, P1) | Sprint 242 | ✅ | Sprint 242 완료 (Match Rate 97%). 구현 커밋 `08a94b98` + `b11528a4` + `54d2f646` + `8e05890c`. Migration 0124 + DiscoveryReportDataSchema(9탭 Zod) + `generateFromFixture()` + 3 fixture JSON(1,442줄) + `report-v2/` 블록 6종(797줄, recharts 재사용) + API/Web test. E2E는 smoke 수준(functional 보강은 후속). 상세: `docs/04-report/features/sprint-242.report.md` |
| F496 | 발굴 9기준 체크리스트 정보형 재설계 — `DiscoveryCriteriaPanel`이 사용자 액션 없이 AI 자동 평가만 일어나는 컴포넌트인데도 9개 행 펼침/접힘 리스트로 노출되어 시각적 부담이 큼. 정보형으로 압축: (1) 상단 큰 요약 카드 — 진행률(N/9) + gate badge + "AI가 자동 평가해요" 안내 (2) 3×3 컴팩트 그리드 — 9개 미니카드(번호 + 상태 아이콘 + 짧은 이름) (3) 단일 카드 클릭 시에만 상세(조건/근거/연결단계) 인라인 펼침 — 다른 카드 자동 닫힘. 사용자 DEBUG 제보(세션 #249): "AI 자동이라면 사용자 액션 필요 없으니 굳이 목록 나열할 필요 없음" (FX-REQ-488, P2) | — | ✅ | 세션 #249, Test 모드 직접 master push (d3b82787). DiscoveryCriteriaPanel 재작성 — 요약 카드 + 3×3 그리드 + 인라인 상세 (typecheck + 10/10 tests pass) |
| F495 | 파이프라인 재구조화 — 발굴/형상화 2-stage + 세부 진행률 + 발굴 파이프라인 카드. (1) `PipelineProgressStepper`에서 OFFERING/MVP 제거(Foundry-X 관리 범위 밖) → 발굴/형상화 2단계로 축소 (2) 각 stage에 sub-progress 표시(발굴: 9기준 진척, 형상화: 4 artifacts 진척) — 형상화 단계에서 4/4 완료 시 "완료" 라벨 노출(진행률 드리프트 해소) (3) 신규 `DiscoveryPipeline.tsx` 컴포넌트 — `ShapingPipeline` 미러, 9 스테이지(2-1~2-9) 읽기전용 시각화 (4) `discovery-detail.tsx` 발굴분석 탭에 DiscoveryPipeline 추가, 기존 DiscoveryStageStepper는 실행 엔진으로 유지. 사용자 DEBUG 제보(세션 #248): "파이프라인은 형상화 진행중인데 Prototype까지 완료된 상태", "OFFERING/MVP는 Foundry-X 관리 대상 아님", "발굴 파이프라인도 시각적으로 추가" (FX-REQ-487, P1) | — | ✅ | 세션 #249, Test 모드 직접 master push (d6d3ee28). PipelineProgressStepper 재작성, DiscoveryPipeline 신규, 단위 테스트 6건 갱신 (391/391 web tests pass) |
| F494 | 발굴 파이프라인 단계 전진 구조 버그 — `confirmStage`가 9/9 완료돼도 `pipeline_stages`를 DISCOVERY→FORMALIZATION으로 전진시키지 않음. `REGISTERED→DISCOVERY` 전환은 `biz-items.ts:327` 한 곳만 존재, 후속 전환 코드 부재. **추가 발견**: 기존 REGISTERED→DISCOVERY INSERT도 `entered_by` NOT NULL 제약으로 silent fail (try/catch 스왈로우) → REGISTERED 영구 고정의 숨은 원인. 영향: `PipelineProgressStepper`가 영원히 REGISTERED(0%)에 고정, `biz_items.status='evaluated'`와 `pipeline_stages='REGISTERED'` 영구 불일치. 실제 사례: bi-koami-001 세션 #247 DEBUG 제보. 수정: (1) `stage-runner-service.ts::confirmStage`에서 `gateStatus==='ready'` 시 `pipeline_stages` DISCOVERY → FORMALIZATION 자동 advance (멱등성 체크) (2) `biz-items.ts:327` INSERT에 `entered_by='system'` 추가 (silent fail 수정) (3) `DiscoveryReportView` 빈 `bd_artifacts` fallback — "발굴 단계 다시 실행하기" CTA (4) bi-koami-001 데이터 복구 SQL (pipeline advance + 9 criteria completed) (FX-REQ-486, P1) | — | ✅ | 세션 #247 debug 트랙, Test 모드 직접 master push (4931c6c1). 테스트 4건 추가 (9/9 전진 + 부분 미전진 + 멱등성 + stop 미전진), 3447 api tests pass. bi-koami-001 prod 데이터 복구 완료 |
| **Phase 31: Task Orchestrator F497 (S-α MFS)** | | | | PRD v0.4: `docs/specs/fx-task-orchestrator/prd-draft.md` — Master pane 내 WT split + F/B/C/X 4트랙 + SSOT 분리(SPEC=등록 / Issue label=실시간 상태) + flock 동시성 + merge/deploy hard gate |
| F497 | Task Orchestrator MVP (S-α) — `/ax:task start|list|adopt|doctor` 기본 경로. 범위: (1) `~/.foundry-x/` 인프라 (task-log.ndjson + locks/ 디렉토리 + pid/heartbeat) (2) flock 기반 ID allocator + master-push lock (3) push SHA 고정 + `git worktree add <SHA>` race 방지 (4) GitHub Issue label 12종 (fx:track/status/risk/wip) 자동 부여 (5) commit body `fx-task-meta` JSON 블록 — `.task-context` 유실 대비 권위 소스 (6) F/B/C/X 4트랙 등록 + REJECTED/ABORTED/CANCELLED/FAILED_SETUP/CLOSED_LEARNED 5종 종료 상태 (7) `/ax:task doctor` 9개 검사 — SPEC↔Issue↔WT split-brain reconcile. 비수용: state.json 신설(SSOT 철학 위반), LLM 완전 배제, `.task-context` git commit, high risk 무조건 차단. 외부 AI 3종(Gemini 3.1 Pro / GPT-5.4 Pro / Claude Opus 4.6) 검토 17개 결함 반영 (EX-1~EX-17). S-β 이후: merge gate 정확성 체인(typecheck/test/build/D1 dry-run), deploy hard gate, conflict-resolver subagent (FX-REQ-489, P1) | — | ✅ | S-α MVP ✅ (start + list 9 step end-to-end 검증). 산출물: `scripts/task/{lib.sh,task-start.sh,task-list.sh}` + `.claude/skills/ax-task/SKILL.md` + `~/.foundry-x/` 인프라. 검증 중 발견 2 버그 fix: (a) slugify sed collation 실패 → `LC_ALL=C tr -c` ASCII-safe (cb2a1e0a) (b) `${3:-{}}` bash 파싱 함정 → 명시 if문 (6bae6ecb). dogfood C1 task로 GitHub Issue #419 자동 생성 + WT + tmux pane + fx-task-meta commit 모두 검증. S-β: doctor/adopt/park/quick + heartbeat + Master IPC + merge gate |
| F499 | Task Orchestrator S-β — doctor/adopt/park 서브커맨드 + Master IPC. S-α(start+list) 확장: (1) `/ax:task doctor` 9개 검사 실행 경로 구현 — SPEC↔Issue↔WT split-brain reconcile (2) `/ax:task adopt` 고아 WT 인수 (3) `/ax:task park` 작업 일시정지 + 재개 (4) Master↔Worker IPC 채널 — heartbeat 기반 생존 감시(X1) + doctor 자동 트리거(X2 패턴 적용) (FX-REQ-495, P1) | Sprint 244 | ✅ | F497 S-β 후속. X1(heartbeat), X2(self-healing) 기반 확장 |
| F500 | Sprint auto Monitor+Merge 파이프라인 — Sprint WT 완료 Signal 감시→PR review→squash merge→cleanup 자동 실행 체인. 현재: merge-monitor.sh/sprint-watch 존재하나 자동 트리거 부재. C11 승격. 해결: `/loop` Signal 폴링 + sprint-pipeline Phase 4c~8 연결 (FX-REQ-494, P1) | Sprint 244 | ✅ | C11→F500 승격. scripts/sprint-* 영역 |
| **Phase 32: Work Management System (작업 관리 체계 고도화)** | | | | Jira 수준 구조화 — 4-Layer(Intake→Planning→Execution→Tracking) 체계 구축 |
| **Phase 32-A: 기초 인프라 (M1, P0)** | | | | |
| F501 | GitHub Projects Board 구성 — Repo 레벨 Kanban 6컬럼(Inbox→Backlog→Triaged→Sprint Ready→In Progress→Done) + 기존 Issues 마이그레이션 + 자동 라벨링 Actions (FX-REQ-496, P0) | Sprint 245 | ✅ | G1,G3,G6 해소. `gh project` CLI 기반 |
| F502 | CHANGELOG.md 도입 — Keep a Changelog 형식 + `/ax:session-end` 자동 갱신 + Phase 단위 Release Notes 생성 (FX-REQ-497, P0) | Sprint 245 | ✅ | G4 해소. Phase 완료 시 자동 생성 |
| **Phase 32-B: 파이프라인 연동 (M2, P0)** | | | | |
| F503 | `/ax:todo` Board 연동 — GitHub Projects API로 Backlog 자동 수집 + Sprint Ready 항목 자동 배정 + Board↔SPEC 양방향 동기화 (FX-REQ-498, P1) | Sprint 246 | ✅ | G3 해소. `scripts/board/{board-list,board-move,board-sync-spec}.sh`. ax 스킬은 별도 관리 |
| F504 | `/ax:session-end` Board 동기화 — merge 시 Board 컬럼 자동 이동(In Progress→Done) + PR 본문에 Sprint/F-item/Match Rate 삽입 (FX-REQ-499, P1) | Sprint 246 | ✅ | G6 해소. `scripts/board/{board-on-merge,pr-body-enrich}.sh` + sprint-merge-monitor Step 6 |
| **Phase 32-C: 메트릭/구조화 (M3, P1)** | | | | |
| F505 | Velocity 추적 — Sprint 완료 시 자동 메트릭 기록(F-item 수/Match Rate/소요시간) + `/ax:gov-retro` 연동 + Phase 단위 velocity 트렌드 (FX-REQ-500, P1) | Sprint 247 | ✅ | G5 해소 |
| F506 | Epic(Phase) 메타데이터 구조화 — GitHub Milestones로 Phase 매핑 + Phase 라벨 체계 + Phase 진행률 자동 계산 (FX-REQ-501, P1) | Sprint 247 | ✅ | G2 해소 |
| **Phase 32-D: 거버넌스 완성 (M4, P2)** | | | | |
| F507 | Priority 변경 이력 자동 기록 — P0~P3 변경 시 Issue comment + SPEC 이력 자동 기록 + `/ax:req-manage` 연동 (FX-REQ-502, P2) | Sprint 248 | ✅ | G7 해소 |
| **Phase 32-E: 통합 정합성 (M5, P1)** | | | | Phase 32 post-audit (S255) — dogfood 실패 + 연결 끊김 해소 |
| F508 | Phase 32 Integration Gap 해소 — ax 스킬(`/ax:todo`,`/ax:session-end`,`/ax:gov-retro`,`/ax:req-manage`)에 Phase 32 스크립트(`scripts/{board,priority,velocity,epic}/*`) 연결 + sprint-merge-monitor 훅 통합 + CHANGELOG 자동 롤업 + priority-history backfill + velocity phase 감지 버그 수정 (FX-REQ-503, P1) | Sprint 255 | ✅ | S255 완료 — **Foundry-X 측 10건** (sprint-merge-monitor 3훅 통합, CHANGELOG [Phase 32] 롤업, priority-history F507 backfill, velocity phase 4건 수정 + Sprint 245~248 backfill, board-sync-spec --fix 구현, record-change flock race guard, record-sprint clobber guard, _common.sh gh scope check) + **ax-marketplace 측 4 스킬** (gov-retro/req-manage/session-end/todo SKILL.md 통합). Match Rate 100% (dogfood F505 phase-trend.sh → Phase 32 4 sprints/7 F-items/98.5% 검증 성공) |
| **Phase 33: Work Management Observability (P0)** | | | | Hotfix 작업 관찰성 복원 — S260 `/ax:req-interview` dogfood 산출 |
| F509 | fx-work-observability Walking Skeleton — Backlog/REQ/Task/Sprint/Epic 4-channel 통합 뷰(Web UI + JSON API + CLI + Live feed) + 자연어→REQ 자동 분류 파이프라인 (FX-REQ-526, P0) | Sprint 261 | ✅ | [PRD: docs/specs/fx-work-observability/prd-v1.md]. Walking Skeleton M1~M4 완료(PR #503, Gap 98%): M1=GET `/api/work/snapshot`(SPEC.md GitHub raw + commits + PRs), M2=`/work-management` 4컬럼 Kanban + 5s polling, M3=GET `/api/work/context`(recent commits + next_actions), M4=POST `/api/work/classify`(Claude Sonnet LLM + regex fallback). Out-of-scope: 편집UI(read-only), RBAC(혼자 모드). Phase 2 Round 1 73/100 Conditional + ChatGPT flaw high 수동 보강 (review/round-1/, review-history.md v1 revised). Sprint 261 PR #503 merged `e942b87d` (8 files +1089) |
| **Phase 34: 멀티 에이전트 세션 표준화 (P0)** | | | | Claude Squad 도입 + Foundry-X 인프라 연동 — C-track 14건 패치 누적의 근본 해소 |
| F510 | 멀티 에이전트 세션 표준화 — Claude Squad 도입 + 프로파일 3종(coder/reviewer/tester) + sprint N 훅 연동 + git-workflow 정합성 + 웹 Kanban 세션 상태 노출 (FX-REQ-533, P0) | Sprint 262 | ✅ | [PRD: docs/specs/fx-multi-agent-session/prd-final.md]. M1=cs alias 3종(bashrc), M2=wt-claude-worktree.sh cs 자동실행, M3=git-workflow.md cs 규칙, M4=PR #511 `06e8f6d3` (8 files +800, D1 0126 agent_sessions + GET/POST sessions + Sessions 탭 + collector). Gap 98%. C28 재발 방지 3중 방어선(하드코딩+보정+테스트 11 PASS) |
| **Phase 35: Work Management 품질 보강 (P1)** | | | | F509+F510 Walking Skeleton 인증·에러·테스트 품질 보강 |
| F511 | Work Management 품질 보강 — API 에러 핸들링 UI + syncSessions SQL injection 방어 + E2E edge case 보강 (FX-REQ-534, P1) | Sprint 263 | ✅ | PR #516 `a756780a`. Gap 97%. T3=prepared stmt bind, T4=CASE WHEN ORDER BY, G1=에러 UI(useRef stale guard), T1+T2=E2E 6→11건(+5). 선행 핫픽스: PR #514(401 auth), PR #515(sidebar topItems), D1 DROP+재생성(스키마 불일치) |
| **Phase 36: Work Management Enhancement (프로젝트 관리 체계 개선)** | | | | PRD: `docs/specs/fx-work-mgmt-enhancement/prd-final.md`. 3-AI 검토 R2 76/100, Ambiguity 0.087. "Jira를 만들지 않는다" — Blueprint/Roadmap 독립 + SPEC 경량화 + 기존 데이터 시각화 + TDD |
| **Phase 36-A: 문서 체계 정비 + 아카이브 (meta-only)** | | | | 코드 변경 0건, master 직접 commit |
| F512 | 문서 체계 정비 + 아카이브 — A-0 파서 테스트 보강 + BLUEPRINT.md/ROADMAP.md 도입 + SPEC.md 경량화(1377→350줄) + docs/ 아카이브(400→100파일) + F-item 세부 상태 10단계 + Entry/Exit Criteria (FX-REQ-535, P0) | Sprint 264 | ✅ | A-0 ✅ PR#517, A-1 ✅ BLUEPRINT, A-2 ✅ ROADMAP, A-3~A-8 ✅ (경량화+아카이브+괄호표기+process-lifecycle) |
| **Phase 36-B: 기존 데이터 표면화 — TDD (코드 변경)** | | | | B-0 테스트 보강 선행 → B-1~B-5 Red→Green→Refactor |
| F513 | Work Management API 테스트 보강 + 확장 — B-0 기존 snapshot/context/classify 테스트 ~15건 + B-1 GET /api/work/velocity + B-2 GET /api/work/phase-progress + B-3 GET /api/work/backlog-health (FX-REQ-536, P0) | Sprint 264 | ✅ | PR #518. TDD Red(24건)→Green. velocity/phase-progress/backlog-health API + Zod 스키마 |
| F514 | Work Management 대시보드 확장 — B-4 Pipeline Flow 뷰(Idea→Done 단계별 F-item 수) + B-5 Velocity/Phase Progress 차트 + E2E 테스트 (FX-REQ-537, P1) | Sprint 265 | ✅ | PR #524. Pipeline Flow + Velocity + Backlog Health 대시보드 |
| **Phase 36-C: 자동화 연결** | | | | Phase A/B 자동화 스크립트 연결 |
| F515 | 자동화 연결 — C-1 board-sync-spec 세부 상태 파싱 + C-2 Roadmap 자동 갱신 + C-3 Blueprint 버전 범프 + C-4 아카이브 자동화 + C-5 CHANGELOG 자동 생성 (FX-REQ-538, P1) | Sprint 266 | ✅ | PR #529. Gap 95.1%. 5종 스크립트 |

| **Phase 37: Work Lifecycle Platform (작업 라이프사이클 플랫폼)** | | | | PRD: `docs/specs/fx-work-lifecycle-platform/prd-final.md`. Backlog 인입→AI 자동분류→트레이서빌리티→Ontology |
| F516 | Backlog 인입 파이프라인 + 실시간 동기화 — (1) 웹 제출 폼 + AI 자동 분류/등록/알림 (2) GitHub Webhook→D1 캐시→SSE 실시간 파이프라인 (3) CLI task-start/session-end→API 직접 POST (4) 웹 SSE 수신으로 5초 polling 대체 (5) Marker.io webhook 연동. 지연 7~8초→1~2초 (FX-REQ-544, P0) | Sprint 273 | ✅ | PR #538. +1166/-5, 12 files. D1 0128, TDD 32 tests, SSE 실시간 |
| F517 | 메타데이터 트레이서빌리티 — REQ↔F-item↔Sprint 연결 D1 테이블 + Sprint↔PR↔Commit GitHub API 파싱 + Changelog 구조화(REQ/PR 메타태깅) + 추적 뷰 (FX-REQ-545, P0) | Sprint 274 | ✅ | PR #539. +1317/-1, 11 files. D1 0129+0130, TDD 19 tests, Gap 100% |
| F518 | Work Ontology 기반 연결 — KG 스키마(10노드타입/5엣지타입) + kg_nodes/kg_edges D1 테이블 + SPEC/GitHub→노드 자동생성 + KG 쿼리 API + 공개 Roadmap/Changelog 뷰 (FX-REQ-546, P0) | Sprint 275 | ✅ | PR #541. D1 0131, TDD 18 tests, Gap 91%. 공개 /roadmap + /changelog |

| **Phase 38: Dashboard Overhaul (대시보드 현행화)** | | | | 서비스 범위(발굴~형상화)에 맞춰 대시보드 전면 정리 |
| F519 | 대시보드 현행화 — (1) 파이프라인 6단계→2단계 축소 (2) 퀵 액션 dead link 제거 (3) 내부 위젯 4개 삭제 (4) ToDo List UI/UX (5) 업무 가이드 Wiki 대체 (FX-REQ-547, P1) | Sprint 276 | ✅ | PR #543. TodoSection dead link 수정, Match 100% |

| **Phase 39: MSA Walking Skeleton** | | | | PRD: `docs/specs/fx-msa-roadmap/prd-final.md`. 도메인별 서비스 분리 + API 게이트웨이 + D1 격리 |
| F520 | API 게이트웨이 Worker — fx-gateway Worker 신규, Service Binding 라우팅, 하위 호환 (FX-REQ-548, P0) | Sprint 268 | ✅ | PR #535. packages/fx-gateway/ 생성 |
| F521 | Discovery 도메인 분리 — core/discovery 12 routes + 18 services를 독립 Worker로 추출 (FX-REQ-549, P0) | Sprint 268 | ✅ | PR #535. packages/fx-discovery/ 생성 |
| F522 | shared 타입 슬리밍 — 도메인 전용 타입을 각 Worker 내부로 이동, 크로스도메인 계약만 shared 유지 (FX-REQ-550, P0) | Sprint 277 | ✅ | PR #544. fx-discovery 타입 이동, shared re-export 유지 |
| F523 | D1 스키마 격리 — Discovery 전용 D1 바인딩 분리, 크로스도메인 JOIN 대체 방안 확정 (FX-REQ-551, P0) | Sprint 277 | ✅ | PR #544. F522와 통합, Option B(re-export) 유지 |

| **Phase 40: Agent Autonomy — E2E 자동화 + Gap 통합** | | | | PRD: `docs/specs/fx-agent-autonomy/prd-final.md`. E2E 자동 생성 + Gap-E2E 통합 품질 점수 |
| F524 | E2E 시나리오 자동 추출 — Design 문서 §4+§5에서 Playwright spec 자동 생성, 템플릿+NLP 파싱 (FX-REQ-552, P0) | Sprint 278 | ✅ | PR #548. e2e-extractor.ts, TDD 9/9, Gap 95% |
| F525 | Gap-E2E 통합 점수 — Gap Analysis에 E2E PASS/FAIL 포함, Gap×0.6+E2E×0.4 가중 평균 (FX-REQ-553, P0) | Sprint 278 | ✅ | PR #548. gap-scorer.ts, TDD 9/9, Composite 97% |
| F526 | autopilot Verify E2E 통합 — sprint-autopilot Step 5~6에 E2E 생성+실행 자동 삽입 (FX-REQ-554, P0) | Sprint 279 | ✅ | PR #550. +532, 6 files |
| **Phase 41: HyperFX Agent Stack — 4-Layer 에이전트 재구조화** | | | | PRD: `docs/specs/fx-hyperfx-agent-stack/prd-final.md`. Walking Skeleton 접근 — 선언적 에이전트 + Graph 오케스트레이션 + 실시간 스트리밍 + 자기개선 |
| F527 | Agent Runtime (L2) — defineTool() 유틸리티 + AgentSpec YAML 스키마 + AgentRuntime 실행 엔진 + Hooks + TokenTracker + ToolRegistry + 기존 7 에이전트 YAML 마이그레이션 (FX-REQ-555, P0) | Sprint 280 | ✅ | PR #549, +1858, TDD, Match 97% |
| F528 | Graph Orchestration (L3) — GraphEngine(GraphBuilder API + 조건부 라우팅 + 병렬 실행) + Agents-as-Tools + SteeringHandler + ConversationManager + OrchestrationLoop 래핑 + AX BD 발굴 9단계 Graph 정의 (FX-REQ-556, P0) | Sprint 281 | ✅ | PR #552, +1919, TDD 5, Match 97% |
| F529 | Agent Streaming (L1) — WebSocket 에이전트 이벤트 스트리밍 + SSE 폴백 + D1 메트릭 저장 + Web 실시간 대시보드 (FX-REQ-557, P0) | Sprint 282 | ✅ | PR #553, +2112, TDD 2, D1 0132 |
| F530 | Meta Layer (L4) — DiagnosticCollector 6축 메트릭 수집 + MetaAgent 진단→개선 제안 + Human Approval UI (FX-REQ-558, P1) | Sprint 283 | ✅ | PR #555, +1755, TDD 3, D1 0133 |

| **Phase 42: HyperFX Deep Integration — Walking Skeleton → 실 데이터 연동** | | | | Phase 41 골격에 실 비즈니스 로직 연결 — 발굴 Graph 실행, 스트리밍 E2E, MetaAgent 실전 검증 |
| F531 | 발굴 Graph 실행 연동 — createDiscoveryGraph()를 stage-runner-service와 연결하여 9단계 발굴 파이프라인이 GraphEngine으로 실행되도록 통합. 기존 OrchestrationLoop 실행 경로에 Graph 분기 추가 + confirmStage→GraphEngine 노드 실행 위임 + 실제 LLM 호출 연결 + 단계별 결과 D1 저장 (FX-REQ-561, P0) | Sprint 284 | ✅ | PR #558, TDD 41 tests, Gap 95% |
| F532 | 에이전트 스트리밍 E2E — WebSocket/SSE 스트리밍 레이어의 end-to-end 검증. Agent 실행→이벤트 발행→WebSocket 전달→Web 대시보드 렌더링 전 구간 통합 테스트 + Playwright E2E + 연결 끊김/재접속 복원력 테스트 (FX-REQ-562, P0) | Sprint 285 | ✅ | PR #559, +718, TDD+E2E |
| F533 | MetaAgent 실전 검증 — DiagnosticCollector로 실제 에이전트 실행 메트릭 수집 + MetaAgent가 진단→개선안 생성→Human Approval→반영까지 full loop 검증. 테스트 시나리오: 발굴 Graph 1회 실행 후 MetaAgent 자동 진단 (FX-REQ-563, P1) | Sprint 286 | ✅ | PR #560, +868, D1 0134, TDD+E2E |

| **Phase 43: HyperFX Activation — Plumbing → Real Data Flow** | | | | Dogfood(S276, KOAMI)에서 확증된 3개 갭 해소 — 메트릭/Graph 트리거/자가개선 루프를 실제 데이터 흐름에 연결 |
| F534 | DiagnosticCollector 실행 경로 훅 삽입 — StageRunnerService.runStage() 및 OrchestrationLoop 실행 경로에 `DiagnosticCollector.record()` 호출 추가. 각 LLM 호출마다 tokens/duration/success/tool_use 등 메트릭을 agent_run_metrics에 기록. Dogfood 확증: 9-stage Graph 실행 성공에도 0건 기록 (session graph-dogfood-bi-koami-001-1776125192189) (FX-REQ-564, P0) | Sprint 287 | ✅ | PR #564, +678, TDD 2 files |
| F535 | Graph 실행 정식 API + UI — `POST /biz-items/:id/discovery-graph/run-all` 정식 API(PR #563 임시 버전 대체) + 웹 UI 'Graph 모드 실행' 버튼 + stage별 진행률 표시 + sessionId 저장/조회. 현재 `confirmStage(graphMode=true)` 옵션이 API 미노출 (FX-REQ-565, P1) | Sprint 288 | ✅ | PR #569, +705, D1 0135 graph_sessions |
| F536 | MetaAgent 자동 진단 훅 — Graph/Agent 실행 완료 시점에 MetaAgent.diagnose() 자동 트리거 (hook 기반) → 경계 점수 미달 시 proposal 생성. Dogfood 확증: 현재 모든 6축 score=50, rawValue=0 (입력 데이터 부재) (FX-REQ-566, P1) | Sprint 289 | ✅ | PR #571, +496, TDD 189줄 |
| F537 | **hotfix** MetaAgent auto-trigger session_id 불일치 해소 — F536 autoTriggerMetaAgent가 graph sessionId(`graph-*`)로 collect했으나 stage-runner는 `stage-{stage}-{bizItemId}` 패턴으로 기록해 매칭 실패. Dogfood 3차(graph-bi-koami-001-1776130774847)에서 agent_run_metrics 9→18 정상 수집 확인했으나 agent_improvement_proposals 0건 발견. 수정: `DiagnosticCollector.collectByBizItem()` 추가(LIKE `stage-%-{bizItemId}`) + autoTriggerMetaAgent에 bizItemId 인자 (FX-REQ 미배정, post-merge hotfix) | — | ✅ | PR #573 MERGED (`3ca8285e`). pane %3 Sprint 288 세션에서 작업 완료 |
| **Phase 44: MSA 2차 분리 — Discovery 완전 분리 + 도메인 Worker 확장** | | | | 근거: `docs/specs/fx-msa-roadmap/msa-transition-diagnosis.md` §3.2~§3.3. W+8+ 범위 (fx-msa-roadmap-v2 PRD §4.3에서 out-of-scope 선언). W+5 GTM 종료 후 재평가, W+6+에 REQ/Sprint/상세 범위 확정. 현재는 Idea 단계만 등록 |
| F538 | Discovery 완전 분리 — fx-discovery Worker에 12 routes / 18 services 전체 이전 + `packages/api`에서 제거. Walking Skeleton(Phase 39) 구조를 프로덕션 수준으로 완성. F543 CONDITIONAL GO 기반 착수 (Service Binding 오버헤드 +10~14ms 허용). 범위: (a) discovery 도메인 core/discovery/* 코드 + D1 schema + 테스트 일괄 이전, (b) `packages/api`에서 discovery 라우트 mount 제거 + msa-lint 룰 통과, (c) fx-gateway의 service binding 라우팅 검증, (d) E2E discovery 경로 통과 확인, (e) Stage 3 Exit D1~D3 필수 — 소비자 전수 grep(web/cli/타 도메인 import 지점), D1 cross-domain JOIN 영향도, API 계약 호환성, (f) 롤백 플랜(binding 오프 시 origin 라우트 잔존). Phase Exit P1~P4 Smoke Reality: fx-gateway 경유 Dogfood 1회 필수 (FX-REQ-575, P0) | Sprint 293 | ✅ **(부분)** | PR #588 (`49d97259`, +1662/-116, 31 files), Match 95%. **실현 범위 3/10 routes** — discovery/discovery-report/discovery-reports만 이전(clean routes). 7개 라우트(bizItems/axBdDiscovery/axBdArtifacts/discoveryPipeline/discoveryStages/discoveryShapePipeline/discoveryStageRunner)는 18개+ cross-domain 의존성으로 F539에서 Service Binding 방식 검토로 이월. Gap 해소: shaping 4파일 cross-domain → @foundry-x/shared, graphDiscovery dead code 제거. fx-discovery에 JWT auth + tenantGuard 미들웨어 추가. `discovery-contract.ts` 신설(BdArtifact/ExecuteSkillInput 등). TDD 12/12 PASS. **Phase Exit P1~P4 Smoke Reality 완결** (2026-04-15 via fx-gateway URL 직접): `/api/discovery/health` → fx-discovery JSON 응답 ✅, `/api/discovery/progress` → 401 (auth protected route 존재 확증) ✅. **배포 연쇄 문제 5건** 발견+해소: (1) F538 merge test FAIL(obsolete test 파편) → PR#589, (2) path filter로 deploy-msa skip, (3) wrangler-action workspace:* 미지원 → PR#590, (4) workflow dispatch 필요, (5) wrangler 경로 해결 실패 → PR#591 (`../api/node_modules/.bin/wrangler`). 각 원인 feedback에 기록 |
| F539a | **k6 Cloud 재측정 + Go/No-Go 판정** (F539 분할 #1, PRD `docs/specs/fx-gateway-cutover/prd-final.md` §4.1). F543 CONDITIONAL GO 조건 A2 해소. k6 Cloud Seoul 리전 4 엔드포인트(E1~E4) 측정 → Service Binding 증분 p99 판정(<50ms Go / 50~150ms 조건부 / >150ms No-Go) → `docs/04-report/phase-44-f539a-k6-cloud.md` 리포트 + F543 비고 역동기화. 전제: F538 1차 완료(✅) (FX-REQ-576, P0) | Sprint 294 | 📋(plan) | PRD Final Round 1 95/100 + Amb 0.11 Ready. No-Go 시 F539b/c 중단 + 개선 Sprint 별도 |
| F539b | **fx-gateway 프로덕션 배포 + URL 전환 + 롤백** (F539 분할 #2, PRD §4.2). fx-gateway Worker 프로덕션 routes 설정 + VITE_API_URL 전환(Web+CLI) + 롤백 리허설 1회 + KOAMI Smoke Reality(bi-koami-001 Graph proposals ≥ 1건). 선제 체크리스트 5항목(feedback_msa_deploy_pipeline_gaps.md)을 Design 단계에서 검증. 전제: F539a Go 또는 조건부 Go 판정 (FX-REQ-577, P0) | Sprint 295 | 📋(idea) | F539a 완료 후 착수. Open Issue #1 (fx-gateway 프로덕션 URL 후보) Plan 단계 해소 |
| F539c | **F538 이월 7 라우트 Service Binding 이전** (F539 분할 #3, PRD §4.3). 2 PR 분할 — PR1 Group A(bizItems 3개), PR2 Group B(discoveryPipeline/stages 4개). 각 PR KOAMI Smoke Reality + packages/api 관련 test 파편 삭제 + ESLint no-cross-domain-import 확장 + Phase 44 f539 회고(`docs/04-report/phase-44-f539-retrospective.md`) 작성. 전제: F539b 프로덕션 배포 완료 (FX-REQ-578, P0) | Sprint 296 | 📋(idea) | Phase 44 F539 전체 Phase Exit P1~P4 담당 |
| F540 | Shaping 도메인 분리 — fx-shaping Worker 신규 생성, 14 routes / 23 services → 독립 Worker. Discovery 다음 파이프라인 단계. 전제: F539a/b/c 완료 | — | 📋(idea) | Sprint 297 예정(F539c 완료 후). REQ 미배정 |
| F541 | Offering 도메인 분리 — fx-offering Worker 신규 생성, 12 routes / 23 services → 독립 Worker. Shaping 다음 단계. 전제: F540 완료 | — | 📋(idea) | Sprint 298 예정. REQ 미배정 |
| F543 | Phase 44 gating — Service Binding latency 벤치마크 (C58 승격). fx-gateway → fx-discovery 호출 경로를 k6로 p99 측정 + Go/No-Go 판정 리포트. 기준: p99 < 100ms (가칭, 벤치마크 결과로 확정). Go 판정 시 F538 착수, No-Go 시 PRD 재설계 필요. 산출: `benchmarks/phase-44-latency/` 스크립트 + `docs/04-report/phase-44-latency-decision.md` 판정 리포트. 전제: Phase 39 Walking Skeleton (fx-gateway F520 + fx-discovery F521) (FX-REQ-573, P0) | Sprint 291 | ✅ | PR #583 (`6902ec1f`). curl 벤치마크 30샘플×2: Service Binding 오버헤드 p50 +10ms (health) / +14ms (items). WSL Korea 환경 절대값은 지리적 레이턴시 지배. 판정: **CONDITIONAL GO** — F538 착수 승인. Match 100%. 재검증: F539 전 k6 Cloud 권장 (A2). task-daemon 오판: e2e (4,4) 단일 shard FAILURE로 STATUS=FAILED 기록했으나 실제 MERGED (C64 패턴 재발) |
| F542 | **MetaAgent 프롬프트 품질 개선 + 모델 전환 실험** — Phase 43 Dogfood에서 agent_improvement_proposals=0건 원인 해소. (a) `meta-agent.agent.yaml` systemPrompt 강화 — rawValue=0/low-signal 입력 명시적 지침 + few-shot 2~3건 + 출력 형식 재검증, (b) Haiku 4.5 → Sonnet 4.6 A/B 실험 — config flag `META_AGENT_MODEL` 런타임 전환(기본값 **Sonnet 4.6**) + 동일 DiagnosticReport에 대한 두 모델 결과 비교 기록, (c) proposals 품질 rubric 점수화(재현성/실행가능성/근거명시), (d) Apply 경로 E2E 검증, (e) 2차 Dogfood 6축 score 방향성 이동 실측. Dogfood P2(실측 산출물 ≠ 0건) 체크리스트 PASS 필수. MVP: K1≥1건+K3=100%. 5회 반복 후 중단 룰. R6(rawValue=0 근본원인) 발견 시 F543 분리. 전제: Phase 43 F537 hotfix 완료(✅) (FX-REQ-571, P1) | Sprint 290 | ✅ | PR #579 (`a4d2734e`, +669/-32), TDD 21 tests, D1 0136+0137. **Dogfood P2 PASS** (S290, bi-koami-001/graph-…1776147547955): proposals 6건 실측 + rubric_score=100 6/6, types 5×graph+1×prompt. MVP K1≥1✅. Observed: auto-trigger(F536) 호출 경로는 proposals 저장 안 됐으나 manual `/api/meta/diagnose`는 정상 저장 → C65 분리 |
| F544 | **F536 auto-trigger 저장 경로 복구** (C65 승격). Graph 완료 시 `autoTriggerMetaAgent` hook이 호출되지만 `agent_improvement_proposals` 미저장. Dogfood 실측(S290, graph-bi-koami-001-1776147547955)에서 auto-trigger 후 0건, 동일 세션 manual `/api/meta/diagnose`는 6건 정상 저장 — 저장 경로 분기 또는 hook 입력 누락 확인됨. 작업: (a) agent-graph-run-service + autoTriggerMetaAgent에 구조 로깅(session_id, bizItemId, proposals.length) 추가, (b) hook 호출 trace — 이벤트 발화 여부 + 반환값 + DB write attempt 확인, (c) manual 경로와 auto 경로의 save 함수 단일화(중복 분기 제거), (d) 회귀 방지 integration test — Graph 완료 후 proposals > 0 보장, (e) Dogfood P3(3차 KOAMI 반복)에서 auto-trigger만으로 proposals ≥ 1건 실측 검증. Phase 43 Exit P1~P4 재검증 목적. MVP: K1(auto-trigger proposals ≥ 1건)+K2(manual==auto 경로 동일) PASS. 전제: F542 ✅ (Sonnet 4.6 + rubric 인프라 활용) (FX-REQ-574, P1) | Sprint 292 | ✅ | PR #582 (`8d3eac94`, +438/-18, 5 files). Sprint WT autopilot 10분 완료 Match 93%. 변경: `discovery-stage-runner.ts` stage 완료 hook 분기 통합(+50/-18) + integration test `meta-agent-full-loop.test.ts`(+49) + unit test `meta-agent-auto-trigger.test.ts`(+123). Plan+Design 문서 생성. **P3 Dogfood PASS** (2026-04-15, session `graph-bi-koami-001-1776206794085`, Graph 210s 완료 후 auto-trigger hook이 3 proposals 저장: discovery-stage-runner × prompt/prompt/tool, rubric_score=100×3). MVP K1(≥1) ✅ + K2(manual==auto 동일 save 경로) ✅. Phase 43 Exit P1~P4 Smoke Reality 완결. **관찰**: task-daemon STATUS=FAILED 오판(PR merged + post-merge deploy.yml 초회 실패) → C64 패턴 재발 확인. deploy.yml 실패 원인은 F544 무관 `prototype-builder/build-queue.test.ts` flaky timing test. F543 merge 트리거 재배포(24385703119)에서 flaky 통과로 prod 반영 완료 |

<!-- fx-task-orchestrator-backlog -->
### Task Orchestrator Backlog (B/C/X)

> F-track은 Sprint/Phase 전용. Task Orchestrator는 B(Bug)/C(Chore)/X(Experiment)만 발급.
> 상태: PLANNED → IN_PROGRESS(GitHub Issue) → DONE / CANCELLED / CLOSED_LEARNED

| ID | Type | 제목 | REQ | Sprint | 상태 | 비고 |
|----|------|------|-----|--------|------|------|
| C1 | C | discovery analysis process audit | — | — | CANCELLED | C2와 중복 |
| C2 | C | discovery analysis process audit | — | — | DONE | completed |
| X1 | X | task-orchestrator s-beta heartbeat signal | — | — | DONE | lib.sh write_signal/check_liveness/update_heartbeat |
| C3 | C | claude-code 200k context token optimization | — | — | DONE | CLAUDE.md 82% 압축 (#427) |
| C4 | C | discovery e2e workflow test biz-ai | — | — | DONE | PR #430 merged |
| F498 | F | E2E workflow shard parallelization F490 TD-03 | FX-REQ-482 | — | DONE | PR #432 merged |
| C5 | C | task orchestrator spec sync and skill docs update | — | — | DONE | PR #431 merged |
| X2 | X | self-healing watch agent diagnostic and pattern fix | — | — | DONE | PR #434 merged |
| C6 | C | E2E workflow walkthrough item-discovery-report-offering-PRD-prototype | — | — | DONE | PR merged |
| C7 | C | Task-REQ-Sprint-Phase 거버넌스 매핑 자동화 | — | — | DONE | 본 task |
| C8 | C | Marker.io 피드백 자동처리 점검 및 보강 | — | — | DONE | PR merged |
| C9 | C | Offering PPTX 생성 품질 보강 (FX-REQ-490) | — | DONE | PR #445 merged |
| X3 | X | puppeteer-mcp 설치 및 워크플로우 통합 (FX-REQ-491) | — | DONE | PR #444 merged |
| X4 | X | RFP 기반 제안서 Agent PRD 작성 (FX-REQ-492) | — | DONE | PR #443 merged |
| C10 | C | CC 다중 구독 계정 환경 통합 — HOME 경로 정규화 + 스킬/플러그인/standards/rules 공유 체계 구축 (FX-REQ-493, P1) | 세션 252 | ✅ | scripts/cc-{setup-shared,verify,status}.sh, 개인 .claude/ canonical, 회사 symlink (standards/rules/CLAUDE.md/settings.json), bashrc CLAUDE_WT_BASE 절대경로 고정 |
| C11 | C | Sprint 자동 Monitor+Merge 파이프라인 — Sprint WT 생성 후 Master에서 signal 감시→권한승인→review→merge→cleanup 자동 실행 체인 구축. 현재: merge-monitor.sh/sprint-watch 존재하나 자동 트리거 부재. 해결: (A) /loop Signal 폴링 (B) sprint-pipeline Phase 4c 강제 수행 (C) Hook 기반 자동 트리거 (FX-REQ-494, P1) | — | 📋 → **F500 승격** | Sprint 244 배정. C10과 독립 |
| C12 | C | prd-v8 governance compliance rename and frontmatter (FX-REQ-504) | — | DONE | task orchestrator |
| C13 | C | sprint-pipeline-monitor and post-session docs ax-plugin (FX-REQ-505) | — | DONE | cross-repo: ax-plugin `99446f7 docs(sprint-pipeline): 런타임 지원 스크립트 섹션 추가`. Foundry-X PR #467 metadata-only. |
| X5 | X | long term backlog reevaluation F112 F117 F118 F245 (FX-REQ-506) | 2026-04-11 | DONE | [[FX-PLAN-X5]] — 4건 처분 (DEFER/UPGRADE/ARCHIVE/CLOSE) |
| X6 | X | multi account ax plugin sync symlink hub extension (FX-REQ-507) | — | ✅ | work HOME `plugins/{marketplaces,cache}/ax-marketplace` → main HOME symlink. 사전 drift 3건 보정(버전 경로, 구버전 잔존, skill 내용차). Backup: `/tmp/backup-axmarket-S256.tar.gz`, 이전본: `/tmp/old-ax-{market,cache}-work-S256`. Smoke test: task skill 노출·SKILL.md byte-identical 확인 |
| C14 | C | E2E smoke A — lib.sh + task-start.sh static checks (FX-REQ-508) | — | CLOSED_EMPTY | S257 dogfood: tmux 3.4 pane segfault로 워커 파일 미작성 빈 PR 머지. S258에서 tmux 3.5a 후 재시도 |
| C15 | C | E2E smoke B — task-complete + daemon guard checks (FX-REQ-509) | — | CLOSED_EMPTY | S257 dogfood: 동일 tmux 3.4 pane 소멸. S258에서 재시도 |
| C16 | C | E2E smoke A retry — lib.sh + task-start checks (FX-REQ-510) | — | CLOSED_EMPTY | S257b: prompt 상향 fix로 재시도했으나 실제 원인은 tmux 3.4 → 또 pane 소멸 빈 PR. S258 tmux 3.5a 후 재시도 |
| C17 | C | E2E smoke B retry — task-complete + daemon guards (FX-REQ-511) | — | CLOSED_EMPTY | S257b 동일 원인: tmux 3.4 pane 소멸. S258에서 재시도 |
| C18 | C | E2E smoke 통합 단건 — lib.sh/task-start/task-complete/daemon guard full pipeline dogfood (tmux 3.5a 회귀 검증) (FX-REQ-512) | — | DONE | S258 dogfood ✅ — tmux 3.5a fx35a socket에서 **C19(FX-REQ-513, PR #482)로 실행 완료**. task-start.sh가 C18 IN_PROGRESS 감지 후 C19 자동 발급(ID forward). Assertion 4/4 PASS: ①additions=127 (`docs/dogfood/C18-tmux35a-smoke.md`) ②pane 2개 dead=0 (%0 master, %1 worker) ③daemon auto-merge 성공 ④S257 fix 4종 회귀(FX_SIGNAL_DIR SSOT / AUTONOMY_RULE / task-complete fail-fast / daemon PRESERVED guard) 전부 정상. dmesg tmux segfault 0건. **결론**: tmux 3.4 → 3.5a 업그레이드로 근본 원인 해소 확정. 후속 defense-in-depth: C20/C21 |
| C19 | C | C18 smoke 통합 단건 dogfood (FX-REQ-513) | — | DONE | task orchestrator (PR #482, additions=127, daemon auto-merge, 21:43 lifecycle 완료) |
| C20 | C | task-complete.sh meta-only empty commit 감지 + signal 거부 (FX-REQ-514) | — | DONE | **C22(FX-REQ-516, PR #484)로 실행 완료** — task-start.sh가 C20 PLANNED 감지 후 다음 가용 번호(C22) 자동 발급(ID forward). C20 row는 "등록 의도" 기록, 실제 구현은 C22 커밋에서 확인 |
| C21 | C | phase_recover worker inactivity → retry queue (FX-REQ-515) | — | DONE | **C23(FX-REQ-517, PR #486)로 실행 완료** — task-start.sh ID forward(C21→C23). C21 row는 "등록 의도" 기록, 실제 구현은 C23 커밋에서 확인 |
| C22 | C | task-complete.sh empty commit 감지 + signal 거부 (FX-REQ-516) | — | DONE | task orchestrator (PR #484, 21:54 lifecycle 완료) — C20 row의 실제 구현체. `git diff --numstat HEAD~1 HEAD` 판정 + exit 22 (EMPTY_COMMIT_REJECTED) + signal 미작성 + task rollback 로직 추가 |
| C23 | C | phase_recover worker inactivity → retry queue (FX-REQ-517) | — | DONE | task orchestrator (PR #486, 22:06 lifecycle 완료) — C21 row의 실제 구현체. `scripts/task/task-daemon.sh` phase_recover 개선 +93/-17 + 신규 `scripts/task/task-retry.sh` +107(retry queue 관리) + 단위 테스트 `scripts/task/test-daemon-retry.sh` +151. 총 additions=351. `/tmp/task-retry/{TASK}.json` 재시도 큐 + daemon log `❗ retry` 이벤트 + non-empty diff 기존 경로 유지 |
| C24 | C | task-start.sh `--reuse-id` flag — ID forward 함정 우회 (FX-REQ-518) | — | DONE | S259 dogfood. `scripts/task/lib.sh` `lookup_backlog_row()` 추가(SPEC row에서 REQ+상태 정규식 추출), `task-start.sh` `--reuse-id <ID>` flag + 재사용 경로 분기 + `warn_reuse_risk()` 정책 함수(PLANNED silent / CLOSED_EMPTY warn+pass / IN_PROGRESS·DONE family는 `FX_REUSE_FORCE=1` 없으면 abort) + SPEC row/REQ 재사용(기존 row 유지) + 재사용 경로에서 push 단계 skip. 유닛 테스트 6/6 PASS. Learning mode에서 사용자가 `warn_reuse_risk()` 정책 직접 승인 |
| C25 | C | board-sync-spec.sh gh project scope preflight 체크 강화 (FX-REQ-519) | — | DONE | S259 C24 dogfood 대상. `scripts/board/_common.sh` `board::require_projects()`가 `gh auth status` scope 감지 부족 시 actionable 에러(`gh auth refresh -s read:project,project` 안내) 출력하도록 강화. `--reuse-id C25` 경로로 실행 |
| C26 | C | sprint-merge-monitor dead git -C cleanup (FX-REQ-520) | — | DONE | task orchestrator |
| C27 | C | task-daemon phase_cleanup pre-evict tmux panes rooted in WT (FX-REQ-521) | — | DONE | task orchestrator |
| C28 | C | task-start.sh HOME propagation + inject --model sonnet for WT workers (FX-REQ-522) | — | DONE | task orchestrator |
| C29 | C | task-daemon pre-evict primary exclusion + extras metric (FX-REQ-523) | — | DONE | task orchestrator |
| C30 | C | task-complete daemon auto-restart hook on daemon/lib.sh merge (FX-REQ-524) | — | DONE | task orchestrator |
| C31 | C | inject bracket paste workaround — split text and Enter send-keys (FX-REQ-525) | — | DONE | task orchestrator |
| C32 | C | deploy.yml concurrency + paths filter meta-aware 개선 (FX-REQ-527) | — | DONE | task orchestrator |
| C33 | C | eslint no-explicit-any cleanup — packages/cli/src/ui/render.tsx:52 + packages/cli/src/harness/lint-rules/require-zod-schema.ts:32 (FX-REQ-528) | — | DONE | 1분 수정, deploy.yml run에서 경고로 노출 중, S260 /ax:daily-check 후속 |
| C34 | C | GitHub Actions Node 24 migration — dorny/paths-filter@v3→v4 업그레이드 (FX-REQ-529) | — | DONE | PR #512. 나머지 actions(checkout/setup-node/pnpm-setup/wrangler-action)는 현재 major 내 node24 호환 확인 |
| C35 | C | ~~task-start.sh worker git author 분리~~ (FX-REQ-530) | — | CLOSED | 재평가(S263): repo local config + C28 HOME 전파로 로컬 커밋은 해소 완료. squash merge author는 gh auth 계정 의존이며 개인계정 유지 결정 |
| C36 | C | sidebar에 `/work-management` 링크 추가 — admin-core 그룹, Kanban 아이콘 (FX-REQ-531) | — | DONE | PR #513. sidebar.json + navigation-loader.ts Kanban 아이콘 등록 |
| C37 | C | autopilot Gap% 측정 범위 확장 — Step 5b E2E audit 자동 호출 추가 (FX-REQ-532) | — | DONE | sprint-autopilot SKILL.md Step 5b 신설. Playwright 있을 때 `/ax:e2e-audit coverage` 자동 실행, 갭 시 WARN (중단 안 함) |
| C38 | C | work-unit-taxonomy 용어사전 + 승격기준 + Milestone정리 (FX-REQ-539) | — | DONE | task orchestrator |
| C39 | C | task-daemon 자동 감지 근본 개선 — 세션 간 지속성 + 완료 감지 다중화 (FX-REQ-540) | — | DONE | task orchestrator |
| C40 | C | daemon 3중 감지 dogfood 검증 (FX-REQ-541) | — | DONE | task orchestrator |
| C41 | C | daemon path2-path3 실전 검증 (FX-REQ-542) | — | DONE | S265 실전 검증 완료. Issue #527 close |
| C42 | C | sprint-monitor + task-daemon 통합 — unified-daemon (FX-REQ-543) | — | DONE | task orchestrator |
| C43 | C | sprint monitor 2중 실행 해소 — bashrc _sprint_ensure_monitor→daemon 교체 + post-merge health check | — | DONE | S267. bashrc 직접편집 + daemon 코드 |
| C44 | C | Changelog 마크다운 렌더링 + Roadmap 미래 계획 — react-markdown 적용, GET /api/work/roadmap 추가, SPEC §3 직접 파싱으로 Phase 데이터 개선 | — | DONE | S268 PR #534. 구 C43(중복 ID) + C44 통합 |
| C45 | C | Backlog C/B/X-track 파싱 + 작업 분류 UX — parseBacklogItems() 추가, ClassifyTab "사용 방법" 안내 | — | DONE | S268 PR #534 |
| C46 | F | ~~Backlog 인입 파이프라인~~ → F516 승격 | — | → F516 | S268. Phase 37 Sprint 267 |
| C47 | F | ~~Changelog 트레이서빌리티~~ → F517 승격 | — | → F517 | S268. Phase 37 Sprint 268 |
| C48 | C | ~~Work Management Ontology~~ → F518 승격 | — | → F518 | S268. Phase 37 Sprint 269 |
| C49 | C | 작업 현황 Kanban 데이터 보강 — parseSpecItems F+Backlog 통합 반환, fetchSpecText 캐시 | — | DONE | S268 PR #534 |
| C50 | C | req-interview 스코어카드 채점 메커니즘 개선 — severity 가중치(flaw×3+gap+risk) + 라운드 간 품질 비교 + breakdown 표시 | — | DONE | S273. ax-plugin `4005237` |
| C51 | C | Monitor lifecycle 관리 — sprint skill done/merge에 Monitor stop 추가 + signal에 MONITOR_TASK_ID 기록 + session-start stale 감지 (FX-REQ-559) | — | DONE | ax-plugin eab6d00 |
| C52 | C | 콘텐츠 drift 해소 — landing/footer/README Sprint-Phase 수치 갱신 (FX-REQ-560) | — | DONE | task orchestrator |
| C53 | C | MSA 원칙 하드닝 (W+1~W+7) — PRD: `docs/specs/fx-msa-roadmap-v2/prd-final.md` (FX-REQ-567) | — | → **C54+C55 실행** | id-allocator가 C54 발급 (C20→C22 선례 동일 ID forward). req-interview R1=82/R2=70 Conditional, v2→final |
| C54 | C | MSA 원칙 ESLint 룰 구현 (FX-REQ-568) | — | DONE | PR #567. no-cross-domain-import + no-direct-route-register 룰 2종 + CLAUDE.md 원칙 섹션 + SKU 경계 테이블 + eslint.config.js 연입. 기존 230건 위반은 C55로 분리 |
| C55 | C | git-aware ESLint 신규파일 검증 (FX-REQ-569) | — | DONE | PR #570. scripts/lint-new-files.sh + .github/workflows/msa-lint.yml — `git diff --diff-filter=AM origin/master...HEAD`로 PR 신규/수정 파일만 lint. 통합 검증 3종 통과 (skip/detect/block). PRD Open Issue #1 해결 |
| C56 | C | Phase 44: D1 격리 실행 (옵션 B) — 도메인별 테이블 접근 ESLint 룰 + migration 분리 태깅 (C54 확장). 근거: msa-transition-diagnosis §3.2 | — | 📋(idea) | Idea. W+6+ 구체화. F538과 병행 가능. id-allocator가 실제 번호 재배정 가능 |
| C57 | C | Phase 44: shared 슬리밍 — Discovery 전용 타입을 fx-discovery 내부로 이동, shared 27→15 파일. F538 의존 | — | 📋(idea) | Idea. W+6+ 구체화 |
| C58 | C | Phase 44: Service Binding latency 벤치마크 — k6로 p99 측정 + 결과에 따른 Go/No-Go 판정. F538/F539 전 선행 필수 | — | → **F543 실행** | 승격 (Sprint 291, 2026-04-14). WT 필요 + 3파일+ 예상으로 task-promotion 기준 4 충족. id-allocator가 F번호 재배정 가능 (C20→C22 선례 동일 ID forward) |
| C59 | C | Phase 44: CI/CD 분리 — deploy.yml paths-filter 적용, 도메인별 선택적 배포. F540/F541과 병행 | — | 📋(idea) | Idea. Phase 44 중반 예상 |
| C60 | C | Phase 44: 서비스 간 통신 계약 표준 — Worker 간 Service Binding 인터페이스 + 에러 핸들링 표준 문서화 | — | 📋(idea) | Idea. Phase 44 후반 문서 작업 |
| C61 | C | task-daemon post-merge 강화 (FX-REQ-570) | — | DONE | task orchestrator |
| C62 | C | task-list stale display 조사 (FX-REQ-572) | — | DONE | task orchestrator |
| C63 | C | msa-lint workflow shared 선빌드 — `pnpm --filter @foundry-x/api build` 실행 시 `@foundry-x/shared` 모듈 미빌드로 tsc 실패. F536/F537/F542/F543/F544 5연속 동일 실패 관찰. `.github/workflows/msa-lint.yml`에 `pnpm --filter @foundry-x/shared build` 선행 단계 추가 | — | DONE | PR #586 (`022a2aa4`). 3 lines. 이 PR 자체는 core/**.ts 미변경으로 msa-lint 미트리거(셀프 검증 불가) → 후속 MSA PR(F538 등)에서 해소 확인 |
| C64 | C | task-daemon signal FAILED 오판 수정 — PR-only non-required 체크(msa-lint)의 FAILURE를 `STATUS=FAILED`로 예단하여 Sprint MERGED 상태임에도 Master에 FAILED 신호. PR `state=MERGED` 또는 deploy.yml conclusion을 우선 판정하도록 `scripts/task/task-daemon.sh` 시그널 판정 로직 보정. Sprint 290에서 첫 관찰 | — | DONE | PR #587 (`17212ca1`). 3회 재발(S290/S291/S292) 후 hotfix: (a) `sprint_sig_get`에 `\|\| true` — pipefail grep no-match 시 set -e abort 방지(F_ITEMS 등 선택 key 누락 signal이 phase_sprint_signals 전체 silent 중단 시키던 숨은 버그 동시 해소), (b) `sprint_pr_state()` 신설 + CI wait 전 PR state 선체크(auto-merge 감지), (c) CI wait 실패 후 PR state 재확인(post-merge deploy 초회 실패 방어), (d) `__debug-phase-sprint-signals` 테스트 진입점. TDD Red→Green + 기존 daemon 테스트 3종 회귀 PASS |
| C65 | C | F536 autoTriggerMetaAgent 저장 누락 — Graph 완료 시 hook이 발동되지만 `agent_improvement_proposals`에 저장되지 않음. Sprint 290 Dogfood 실측(graph-bi-koami-001-1776147547955): auto-trigger 후 0건, 이후 manual `/api/meta/diagnose`는 6건 정상 저장. 원인 후보: ① hook이 호출 자체 안 됨(이벤트 구독 실패), ② 호출되나 proposals[] 반환 없이 조용히 리턴, ③ 저장 경로가 manual과 분기. agent-graph-run-service 로깅 + hook trace 검증 필요 | — | → **F544 실행** | 승격 (Sprint 292, 2026-04-14). task-promotion 기준 2+4 충족. id-allocator가 F번호 재배정 가능 (C58→F543 선례 동일 ID forward) |
| C66 | C | E2E 4-shard 결정론적 실패 근본 조사 — PR #575/#578/#579 3회 연속 동일 shard(4/4)가 전면 실패. 결정론적 실패 = 인프라 regression 확정. 조사 범위: (a) `.github/workflows/*.yml` e2e shard 분할 로직 + shard index=4 특이성, (b) `playwright.config.ts` shardIndex 조건부 설정, (c) Sprint 287~290에 도입된 새 E2E 시나리오 중 shard 4 할당 테스트 식별, (d) deploy.yml paths-filter 영향 여부, (e) Local 4-shard 재현 테스트. 결론에 따라 F 승격 또는 hotfix 진행 | — | DONE | PR #584 (`92fc2a25`). 조사 리포트 `docs/dogfood/C66-e2e-shard4-investigation.md`. 근본 원인: shard 4에 할당된 시나리오 3종에서 strict mode locator violation(같은 text 매치 복수). hotfix 3건 적용 후 Local 4-shard 재현 PASS |
| C67 | C | velocity 메트릭 누락 — `scripts/velocity/record-sprint.sh`가 Master에 존재하지 않는 `.sprint-context`만 참조하여 F_ITEMS/MATCH_RATE/TEST_RESULT/CREATED 전부 빈 값으로 `docs/metrics/velocity/sprint-NNN.json` 기록. Sprint 293 실측: `{"f_items":"","match_rate":null,"duration_minutes":0,"test_result":"unknown"}`. 원인: `.sprint-context`는 WT 생성 시 WT 내부에만 생성됨, Master에서 sprint-merge-monitor가 호출하는 시점엔 부재. 수정: signal 파일 fallback 추가 (glob `${SIGNAL_DIR}/*-${SPRINT_NUM}.signal`). task-promotion 기준 미충족(1파일, 내부 메트릭) → Backlog C-track | — | DONE | PR #593 (`3b82844b`). task-daemon auto-complete로 ba662682 commit → 자동 push → PR open → merge 일련 자동화. sprint-293.json 소급 재기록: `f_items=F538`, `match_rate=95`, `test_result=pass` 반영. 테스트 `scripts/test-velocity-signal-fallback.sh` 3 case 9/9 PASS. PR #594(duplicate, timestamp-only diff)은 close. **관찰**: task-start.sh의 auto-complete hook이 완료 직후 두 번째 auto-commit(`chore(C67): auto-commit on task complete`)을 만들어 PR 중복 생성 — 다음 세션 개선 후보 |
<!-- /fx-task-orchestrator-backlog -->

## §6 Sprint 실행 계획 (아카이브)

> Sprint 1~263 실행 계획 (체크리스트) 전체:
> **[docs/archive/spec-execution-plan-2026-04.md](archive/spec-execution-plan-2026-04.md)**
>
> 현행 Sprint 계획: [ROADMAP.md](ROADMAP.md) + `docs/01-plan/features/sprint-{N}.plan.md`

## §7 기술 스택

> 상세: [BLUEPRINT.md](docs/BLUEPRINT.md) §2 + `.claude/rules/coding-style.md`

## §8 Tech Debt

> 해소 완료 (TD-01~TD-03). TD-03은 F490으로 승격 후 해소.

## §9 변경 이력

> 전체 이력: [docs/archive/spec-changelog-archive-2026-04.md](archive/spec-changelog-archive-2026-04.md)

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 5.81 | 2026-04-12 | **SPEC.md 추가 경량화** — Phase 1~29 F-items 935줄 → `docs/archive/spec-fitems-phase1-29.md`. §7~§9 압축. 1174→목표 200줄대 |
| 5.83 | 2026-04-15 | **F539 3분할 등록** — Sprint 294 착수 준비 완료. 기존 F539(idea) → F539a(k6 재측정, FX-REQ-576, Sprint 294 📋plan) / F539b(fx-gateway 프로덕션 전환, FX-REQ-577, Sprint 295) / F539c(7 라우트 Service Binding, FX-REQ-578, Sprint 296). PRD Final `docs/specs/fx-gateway-cutover/prd-final.md` Round 1 95/100 + Ambiguity 0.11 Ready. F540/F541은 Sprint 297/298로 1 스프린트씩 이동. 선제 체크리스트 5항목(feedback_msa_deploy_pipeline_gaps.md) 반영 |

## §10 버전 정책

### 프로젝트 마일스톤
- **Sprint N**: 프로젝트 진행 상태 추적 (Sprint 32부터 적용)
- 이전(Sprint 1~31): v0.1~v2.5 형식 사용 (이력 보존, 소급 수정 안 함)

### 패키지 버전 (Independent SemVer 2.0)

| 패키지 | 현재 버전 | 배포 대상 | 버전 증가 기준 |
|--------|----------|----------|--------------|
| packages/cli | 0.5.0 | npm registry | CLI 기능 변경 |
| packages/api | 0.1.0 | Cloudflare Workers | API endpoint 변경 |
| packages/web | 0.1.0 | Cloudflare Pages | UI 기능 변경 |
| packages/shared | 0.1.0 | 내부 전용 | 타입/인터페이스 변경 |

### 0.x 기간 버전 증가 규칙

| 변경 유형 | 버전 증가 | 예시 |
|----------|----------|------|
| 하위 비호환 변경 | 0.MINOR.0 | 0.1.0 → 0.2.0 |
| 새 기능 추가 | 0.minor.PATCH | 0.1.0 → 0.1.1 |
| 버그 수정 | 0.minor.PATCH | 0.1.1 → 0.1.2 |

### 1.0.0 전환 기준

패키지별 독립 판단. 아래 두 조건 **모두** 충족 시 승격:
1. 외부 사용자가 프로덕션에서 실제 사용 중
2. 공개 API 하위 호환성 정책 수립 + API 문서화 완료
