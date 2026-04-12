---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 5.80
status: Active
category: SPEC
system-version: Sprint 264
created: 2026-03-16
updated: 2026-04-12
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
| Sprint 264 | 🔧(impl) 진행 중 — F512 Phase A 정비 (A-3~A-8) + F513 TDD (B-0~B-3) |

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
> **마지막 실측** (Sprint 264, 2026-04-12): ~10 routes, ~28 services, ~14 schemas, D1 0126, tests ~3452 (E2E 273) — Phase 36 F512 SPEC 경량화(1377→226줄) + F513 Work Analytics API 3건 + F514 대시보드 확장

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
| **Phase 37 Dashboard Overhaul** (F516) | 📋 Sprint 267 |
| **Phase 38 MSA Walking Skeleton** (F517~F520) | 📋 Sprint 268~269 |

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
| F512 | 문서 체계 정비 + 아카이브 — A-0 파서 테스트 보강 + BLUEPRINT.md/ROADMAP.md 도입 + SPEC.md 경량화(1377→350줄) + docs/ 아카이브(400→100파일) + F-item 세부 상태 10단계 + Entry/Exit Criteria (FX-REQ-535, P0) | Sprint 264 | 🔧(impl) | A-0 ✅ PR#517, A-1 ✅ BLUEPRINT, A-2 ✅ ROADMAP. A-3~A-8 잔여 |
| **Phase 36-B: 기존 데이터 표면화 — TDD (코드 변경)** | | | | B-0 테스트 보강 선행 → B-1~B-5 Red→Green→Refactor |
| F513 | Work Management API 테스트 보강 + 확장 — B-0 기존 snapshot/context/classify 테스트 ~15건 + B-1 GET /api/work/velocity + B-2 GET /api/work/phase-progress + B-3 GET /api/work/backlog-health (FX-REQ-536, P0) | Sprint 264 | ✅ | PR #518. TDD Red(24건)→Green. velocity/phase-progress/backlog-health API + Zod 스키마 |
| F514 | Work Management 대시보드 확장 — B-4 Pipeline Flow 뷰(Idea→Done 단계별 F-item 수) + B-5 Velocity/Phase Progress 차트 + E2E 테스트 (FX-REQ-537, P1) | Sprint 265 | ✅ | PR #524. Pipeline Flow + Velocity + Backlog Health 대시보드 |
| **Phase 36-C: 자동화 연결** | | | | Phase A/B 자동화 스크립트 연결 |
| F515 | 자동화 연결 — C-1 board-sync-spec 세부 상태 파싱 + C-2 Roadmap 자동 갱신 + C-3 Blueprint 버전 범프 + C-4 아카이브 자동화 + C-5 CHANGELOG 자동 생성 (FX-REQ-538, P1) | Sprint 266 | ✅ | PR #529. Gap 95.1%. 5종 스크립트 |

| **Phase 37: Dashboard Overhaul (대시보드 현행화)** | | | | 서비스 범위(발굴~형상화)에 맞춰 대시보드 전면 정리 |
| F516 | 대시보드 현행화 — (1) 파이프라인 6단계→2단계(발굴~형상화) 축소 (2) 퀵 액션 dead link 제거 + 현행 기능 반영 (3) 개발 내부 위젯 4개 삭제(Sprint Status/SDD Triangle/Harness Health/Freshness) (4) ToDo List UI/UX 개선 (5) 업무 가이드 삭제 + Wiki 링크 대체 (FX-REQ-544, P1) | Sprint 267 | 📋(plan) | |

| **Phase 38: MSA Walking Skeleton** | | | | PRD: `docs/specs/fx-msa-roadmap/prd-final.md`. 도메인별 서비스 분리 + API 게이트웨이 + D1 격리 |
| F517 | API 게이트웨이 Worker — fx-gateway Worker 신규, Service Binding 라우팅, 하위 호환 (FX-REQ-545, P0) | Sprint 268 | 🔧(design) | |
| F518 | Discovery 도메인 분리 — core/discovery 12 routes + 18 services를 독립 Worker로 추출 (FX-REQ-546, P0) | Sprint 268 | 🔧(design) | |
| F519 | shared 타입 슬리밍 — 도메인 전용 타입을 각 Worker 내부로 이동, 크로스도메인 계약만 shared 유지 (FX-REQ-547, P0) | Sprint 269 | 📋(idea) | |
| F520 | D1 스키마 격리 — Discovery 전용 D1 바인딩 분리, 크로스도메인 JOIN 대체 방안 확정 (FX-REQ-548, P0) | Sprint 268 | 🔧(design) | |

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
| C41 | C | daemon path2-path3 실전 검증 (FX-REQ-542) | — | PLANNED | task orchestrator |
| C42 | C | sprint-monitor + task-daemon 통합 — unified-daemon (FX-REQ-543) | — | DONE | task orchestrator |
| C43 | C | Changelog 마크다운 렌더링 — 현재 `**볼드**`, `[링크]()` 등이 raw text로 노출됨. react-markdown(이미 설치됨) 적용하여 Added/Fixed 섹션 내 bullet을 구조화 렌더링. 누가: AI. 어떻게: ChangelogTab에 react-markdown 적용 + 섹션별 스타일링 | — | PLANNED | S268 사용자 피드백 |
| C44 | C | Roadmap Phase 상세 + 미래 계획 표시 — (1) SPEC §3 Phase 테이블을 직접 파싱하는 새 API `GET /api/work/roadmap` 추가 (Phase 이름/상태/Sprint 범위/F-item 목록 포함). (2) ROADMAP.md Short/Mid/Long-term 섹션을 파싱하여 미래 계획 표시. 현재는 phase-progress API의 F-item 번호 추론 방식이라 Phase 2건만 표시됨. 누가: AI. 어떻게: work.service.ts parseRoadmap() + RoadmapTab 개편 | — | PLANNED | S268 사용자 피드백 |
| C45 | C | Backlog C/B/X-track 파싱 + 작업 분류 UX — (1) parseFItems()가 F-item만 파싱 → C/B/X Backlog 테이블도 파싱하여 backlog-health에 반영. (2) 작업 분류 탭에 "분류 후 어떻게 등록하는지" 안내 + CLI 명령어 복사 버튼. 누가: AI. 어떻게: parseFItems 확장 + ClassifyTab UX 보강 | — | PLANNED | S268 사용자 피드백 |
| C46 | F | Backlog 인입 파이프라인 설계 — 사용자가 "이런 게 있으면 좋겠다"를 웹에서 직접 제출 → AI가 자동 분석(Track/Priority/중복 검사/유사 REQ 매칭) → Backlog 등록 → AI 피드백("이 요청은 F509와 유사해요, 병합할까요?") → 승인 시 요구사항(REQ)으로 전환. 현재: CLI `task-start.sh`로만 등록 가능, 웹 인입 경로 없음. 누가: 사용자+AI. 어떻게: (1) 웹 제출 폼 (2) AI 분석 API (3) Backlog→REQ 전환 워크플로우 설계 필요 | — | PLANNED | S268 사용자 피드백. F-item 승격 후보 (3+파일, 사용자 관찰 가능) |
| C47 | F | Changelog 트레이서빌리티 — 단순 나열이 아닌 "요구사항(REQ) → Task(C/F) → 구현(PR/커밋) → 배포" 연결 체인을 시각화. 각 Changelog 항목에서 원본 REQ, 관련 Sprint, PR 링크를 역추적 가능해야 함. 맥락 축적을 위해 Knowledge Graph(Ontology) 도입 검토 — REQ↔F-item↔Sprint↔Phase↔PR 관계를 그래프로 관리하면 "이 변경이 왜 일어났는지" 추적 가능. 누가: AI+사용자. 어떻게: (1) Changelog 항목에 REQ/PR 메타데이터 구조화 (2) KG 스키마 설계 (3) 트레이서빌리티 뷰 구현 | — | PLANNED | S268 사용자 피드백. F-item 승격 후보. Ontology 기반 |
| C48 | C | Work Management Ontology 기반 맥락 연결 — C46(인입)·C47(트레이서빌리티)의 공통 기반. 작업 라이프사이클 전체를 Ontology로 모델링: Idea→Backlog→REQ→Task(F/C/B/X)→Sprint→Phase→Deploy→Changelog. 기존 KG 인프라(packages/web/src/components/feature/kg/) 재활용. 누가: AI. 어떻게: (1) Work Management 도메인 온톨로지 스키마 정의 (2) SPEC.md 파싱→KG 노드/엣지 자동 생성 (3) 탐색 뷰 | — | PLANNED | S268 사용자 피드백. C46·C47 선행 후 착수 |
| C49 | C | 작업 현황 탭 데이터 보강 — Kanban에 F-item 5건(DONE)만 표시됨. Phase 30+ Active 섹션의 모든 항목(F493~F515 + C/B/X Backlog)이 올바른 컬럼에 분류되어야 함. 현재: parseFItems의 regex가 Phase 30+ 섹션만 파싱하고 대부분 DONE으로 분류됨. IN_PROGRESS/PLANNED가 0건인 원인 진단 + 수정. 누가: AI. 어떻게: parseFItems 디버깅 + Backlog 섹션 파싱 추가 | — | PLANNED | S268 사용자 피드백 |
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
