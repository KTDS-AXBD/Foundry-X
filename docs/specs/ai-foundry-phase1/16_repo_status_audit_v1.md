# 14. AI Foundry OS 5개 Repo 현황 점검 보고서 v1

**버전:** v1
**날짜:** 2026-05-04
**작성자:** Sinclair Seo (KTDS-AXBD AX컨설팅팀, PM 겸 프로그래머)
**기반 문서:** prd-final.md (2026-05-02) + 02_ai_foundry_phase1_v0.3.md + 07_ai_foundry_os_target_architecture.md + 08_build_plan_v1.md (마스터 빌드 플랜) + 09~12 dev plan (Guard-X·Launch-X·Diagnostic·Cross-Org)
**조사 방식:** GitHub 라이브 정밀 분석 (5 repo × README/SPEC/CHANGELOG/MEMORY/package.json/디렉토리 트리/최근 커밋·PR·이슈 + npm registry)
**분류:** 기업비밀 II급 — 사내 코어팀 한정 (5 repo 명칭·도메인 명시)
**다음 문서:** 15_msa_implementation_plan_v1.md (MSA 적용 구현 계획)
**문서 위치:** 본 14는 5월 2일 작성된 08·09~12 문서들의 가설을 5월 4일 시점 GitHub 라이브 상태로 검증하는 보정 문서. 메모리 9건·기존 문서 가정과 실제 repo 사이의 드리프트를 명시.

---

## 0. 한 줄 결론

**5개 repo는 모두 살아 있지만 PRD-final MVP의 8개 P0 기능 중 어느 것도 50% 이상 구현되어 있지 않다.** 가장 진척된 P0-8(AI 투명성)도 50%, 평균은 ~25%. Foundry-X는 자체 BD 파이프라인으로는 v1.9.0까지 성숙(15 packages, Phase 46/Sprint 331)했으나 PRD가 요구하는 5-Layer Control Plane 정체성과 5개 신규 sub-app은 0%. Discovery-X·AXIS-DS는 각각 47일·93일 commit 정체. 7월 MVP까지 12주 남짓에서 critical path는 **Foundry-X core sub-app 5개 신설 + PostgreSQL/SSO 도입 + Decode-X 도메인 실측 + AXIS-DS v1.2 KPI/HITL 위젯 라인업**으로 좁혀진다.

---

## 1. Executive Summary (1쪽)

| 지표 | 값 | 비고 |
|---|---|---|
| 5 repo 평균 PRD P0 충족률 | **~25%** | 가장 진척 50% (P0-8) / 가장 부진 0% (P0-4 Cross-Org default-deny) |
| 활성 작업 repo (최근 30일 내 commit) | **2 / 5** | Foundry-X(05-03), ax-plugin(05-02) |
| 정체 repo (60일 이상 무활동) | **2 / 5** | Discovery-X(47일), AXIS-DS(93일) |
| 메모리 stale 항목 | **9건** | Foundry-X Phase·Sprint·packages 수, AXIS-DS org·버전, Decode-X 버전·REQ, Discovery-X branch 등 |
| 신규 필요 핵심 산출물 | **8건** | Foundry-X 5 sub-app + PG/SSO 어댑터 + AXIS-DS v1.2 위젯 + ax-plugin 5 신규 스킬 |
| 7월 MVP critical path 길이 | **12주** | W18(현재) ~ W29(Phase 3 진입 정비 종료) |
| Conditional 4건 미충족 시 fallback | **R-X2 강화 + Phase 2 Yellow/Red** | PRD §5.3·§6.3.2 |

---

## 2. Repo별 현황 (5 카드)

### 2.1 Foundry-X — Control Plane 후보 (`KTDS-AXBD/Foundry-X`)

| 항목 | 값 | 메모리 비교 |
|---|---|---|
| 자기 정체성 (README) | "AX BD팀 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼" | **메모리 'Control Plane' 정체성 미반영** — repo 자체는 BD 플랫폼으로 자칭 |
| Phase / Sprint / 버전 | **Phase 46 / Sprint 331 / v1.9.0** (2026-05-04 release) | 메모리 (Phase 45/Sprint 319) 대비 +1 phase, +12 sprint |
| 모노리포 packages | **15개** (api, cli, web, shared, shared-contracts, harness-kit, fx-gateway, fx-discovery, fx-shaping, fx-agent, fx-offering, fx-modules, gate-x, gate-x-sdk, gate-x-web) | 메모리 4개에서 **+11 (Strangler MSA 진행)** |
| `packages/api/src/core/` sub-app | **10개** (agent, collection, decode-bridge, discovery, events, files, harness, offering, shaping, verification) | PRD 요구 5개 (guard/launch/diagnostic/cross-org/multi-tenant) **0개** |
| 스택 | Hono ^4.0.0 / Workers / D1 (drizzle-orm ^0.33) / zod-openapi / React 18 + Vite 8 + RR7 + Zustand / Anthropic+OpenRouter | PostgreSQL·SSO 의존성 **부재** |
| 테스트 | ~3,174 tests + E2E 273 | 메모리 일치 |
| 최근 활동 | 2026-05-03 23:49 push, open PR 0건, open issue 1건(#125) | 매우 활발 |
| 외부 도메인 | foundry-x-api.ktds-axbd.workers.dev / fx.minu.best | — |

**PRD P0 매핑 (대표 책임):**

| P0 | 흔적 | 추정 |
|---|---|---|
| P0-1 5-Layer 통합 운영 | core/ 10 sub-app + fx-* worker로 BD 7단계 구현; 다른 4 repo 통합 컨트롤 부재 | **15%** |
| P0-2 Multi-Tenant PG schema + RBAC 5역할 + KT DS SSO | middleware/{tenant, rbac, role-guard, auth} 흔적, D1 일변도 | **20%** |
| P0-3 4대 진단 자동 실행 | DiagnosticCollector 6축(F530/F537/F582), autoTrigger 배선 | **45%** |
| P0-4 Cross-Org 4그룹 + core_diff default-deny | 키워드 검색 0건 | **0%** |
| P0-5 KPI 대시보드 | routes/work.ts (12.9KB) `/work-management` Kanban + Phase 33 Work Observability | **40%** |
| P0-6 HITL Console | MetaAgent Human Approval UI(F530) + proposal-apply loop(F533) | **35%** |
| P0-7 Audit Log Bus | dual_ai_reviews + agent_run_metrics 모듈별 로깅, 통합 trace 부재 | **25%** |
| P0-8 AI 투명성 | dual_ai_reviews 누적 16건 + autopilot OBSERVED 8/8 PASS + 6축 점수 prod 노출 | **50%** |

**Top Gap:**
1. PostgreSQL 백엔드 부재 (D1/SQLite 일변도) — PRD P0-2 정면 충돌
2. KT DS SSO 어댑터 부재
3. `core/{guard, launch, diagnostic, cross-org, multi-tenant}` 5개 sub-app 미생성
4. Cross-Org 4그룹 + core_differentiator default-deny 키워드 0
5. Audit Log Bus 통합 trace_id chain 부재
6. Open issue 1건뿐 — P0 8개가 issue/F-item으로 분해 등록 안 됨

---

### 2.2 Decode-X — Input Plane (`KTDS-AXBD/Decode-X`)

| 항목 | 값 | 메모리 비교 |
|---|---|---|
| 자기 정체성 (description) | "AI Foundry — SI 프로젝트 역공학 엔진" | 일치 |
| 버전 | **v0.7.0** (Pilot Core 종료, 2026-04-07 태깅) | 메모리 v1.3 Phase 1 **반박 — 표기 부재** |
| Workers | 7개 (svc-ingestion·extraction·policy·ontology·skill·queue-router·mcp-server) | 메모리 일치 |
| D1 DBs | 5개 (db-ingestion·structure·policy·ontology·skill) | 메모리 일치 |
| Pilot 도메인 | 퇴직연금(Miraeasset) + 온누리상품권(LPON) | 메모리 일치 |
| Phase 2-E 3-Layer 분석 | PRD.md (Ralph 태스크 소스) §P1-1~P3-3 모두 `[x]` 체크. ScoredProcessSchema/CoreJudgmentSchema/ProcessTreeNodeSchema/CrossOrgComparisonSchema 9개 Zod 스키마 정의 + 0003_analysis.sql 4 테이블 마이그레이션 머지 | 메모리 "진행 중" → 코드는 머지, 도메인 실측 부재 |
| 활성 REQ | AIF-REQ-034 (Decode-X Deep Dive), 026, 018, 002 | 메모리 035 IN_PROGRESS **반박** |
| 최근 활동 | 2026-05-03 세션 261 (F417~F422, TD-54/56/57/58/59/60), Open PR 0 / Open Issue 0 | 단일 main 직접 push 모델 활발 |
| README | 104 bytes scaffold만 | **외부 인지·온보딩 불가** |

**PRD P0 매핑 (대표 책임):**

| P0 | 흔적 | 추정 |
|---|---|---|
| P0-3 4대 진단 자동 실행 | DiagnosisTypeSchema 4 enum + diagnosis_findings 테이블 + prompts/diagnosis.ts 빌더 | **60%** (코드는 머지, 도메인 실측 미반영) |
| P0-4 Cross-Org 4그룹 + core_diff default-deny | comparison.ts 4 enum + comparison_items.service_group 컬럼/인덱스, default-deny 컬럼·RBAC 코드 부재 | **40%** |
| P0-7 Audit Log Bus 발행자 | analysis.completed / diagnosis.completed 이벤트 스키마 + extraction.completed → runAnalysis() 자동 발행 | **50%** |

**Top Gap:**
1. README/CHANGELOG 부재 (104 bytes scaffold)
2. PRD-final.md 미반영 — repo PRD.md는 별개 Ralph 작업 소스
3. AIF-REQ-035 트래킹 부재 (메모리 가설 반박)
4. Phase 2-E **도메인 실측 결과 데이터 없음** — 0003 마이그레이션은 머지, 퇴직연금 분석 결과 SPEC §2 미등장
5. core_differentiator default-deny 미구현 (schema 컬럼 자체 부재)
6. Cross-repo Audit Log Bus 수신부(Foundry-X 측) 미확인

---

### 2.3 Discovery-X — Discovery Plane (`KTDS-AXBD/Discovery-X`)

| 항목 | 값 | 메모리 비교 |
|---|---|---|
| 자기 정체성 | "AX 신사업을 위한 내부 실험 중심 사고 시스템" | 일치 |
| 버전 / branch | **v0.6.0 / master** (메모리 main 반박) | 신규 |
| 11단계 상태 머신 | DISCOVERY → IDEA_CARD → HYPOTHESIS → EXPERIMENT → EVIDENCE_REVIEW → GATE1 → SPRINT → GATE2 → HANDOFF + HOLD/DROP | 검증 |
| 도메인 카테고리 | 라우트 12+ (Core/Ideas/Proposals/Lab/Agent/Profile/Requests/Topics/Matrix/Signals/PRD Studio/Radar) + Drizzle 스키마 카테고리 22 + 116 테이블 | 메모리 "15 BC" **부분 반박** |
| 스택 | Remix ^2.17 / React ^19 / Drizzle ^0.36 / Tailwind ^4.1 / Wrangler ^4.8 / TS ^5.7, @axis-ds 1.1.1 | 일치 (axis-ds 버전은 minor stale) |
| 운영 실험 | 2026-01-31 시작 + 60일 윈도 종료(현재 93일 경과). Discovery 5-10건 진행 건수 비공개 | — |
| 최근 활동 | **2026-03-18 마지막 push (47일 무활동)** | **stagnation 신호** |
| Open Issue | 9건 (F44/F47/F48/F49/F50/F51 등 모두 03-17 일괄 생성) | — |
| 외부 도메인 | dx.minu.best | — |

**PRD 매핑:**

| 항목 | 흔적 | 추정 |
|---|---|---|
| P1 (Should Have) Discovery-X HANDOFF BC 카드 export | api.export.brief.$id.ts 등 export 라우트 + HANDOFF 상태 정의 | **40%** (export 단방향, Foundry-X 수신 인터페이스 합의 흔적 없음) |
| P0-7 Audit Log Bus 참여 | event_logs / acl_audit_logs / EVENT_TYPE_MAP 30종 | **60%** (내부 audit 구현, 외부 Bus 발행 어댑터 미공개) |

**Top Gap:**
1. **47일 무활동** — 7월 MVP 시계열에서 critical risk
2. F51 (Foundry-X 연동) Issue P1 미착수 — 인프라 이전(KTDS-AXBD)만 완료
3. F44 PRD Studio / F47 Change Log 공유 / F48~F50 (Generative UI/PAL Router/Ambiguity Score) PDCA 문서만
4. **Issue #21에 Foundry-X 링크 공개 노출** — 메모리 "5 repo 외부 노출 금지" 정책 위반 가능, 검토 필요
5. SPEC.md(2026-03-18)와 PRD-final.md(2026-05-02) 사이 **47일 드리프트**

---

### 2.4 AXIS-Design-System — UI Layer (`IDEA-on-Action/AXIS-Design-System`)

| 항목 | 값 | 메모리 비교 |
|---|---|---|
| Org | **IDEA-on-Action** (KTDS-AXBD 아님) | 메모리 **반박** |
| npm 버전 | **v1.1.2** (6 패키지 동기 배포 2026-02-01) | 메모리 v1.1.1 **stale** |
| packages | 6개 publish (axis-tokens, axis-ui-react, axis-agentic-ui, axis-theme, axis-cli, axis-mcp) | 메모리 5+1 일치 (axis-mcp도 npm publish 확인) |
| agentic-ui v1.1.2 components | RunProgress, ApprovalCard, StreamingText, ToolCallCard, MessageBubble, FeedbackButtons, CodeBlock, DiffViewer, PlanCard, ContextPanel, TokenUsageIndicator, AttachmentCard (12개) | HITL 빌딩블록 다수 가용, KPI Dashboard 위젯 없음 |
| 스택 | React 19 / Next.js 15 / TS 5.7+ / pnpm 9.15 / Turborepo 2.3 | Tailwind 4 / Zustand 5 / TanStack Query 5는 이 repo dependencies에 부재 (소비처 앱 스택) |
| 최근 활동 | **2026-02-01 14:02 마지막 commit (93일 무활동)** | 심각한 정체 |
| Open PR | #55 (2026-04-22, 13일째 미머지) Decode-X Kit 3종 federation registry 추가, AIF-REQ-036 M-UX-4 Tier 3 | — |
| Open Issue | 11건 (#51 Phase4 Template, #52 Phase5 CLI Template, #53 Phase6 MCP Tools, #54 Phase7 Federation 등 미착수) | — |
| License / Releases | MIT / GitHub Releases 0건 (Changesets로만 npm publish) | — |

**PRD P0 매핑:**

| P0 | 흔적 | 추정 |
|---|---|---|
| P0-5 KPI 대시보드 (AXIS-DS v1.2 + KPI 위젯) | ui-react 기본 블록은 v1.1.2 가용 (Card/Table/Tabs/Progress/Skeleton). KPI 전용 위젯 부재 | **20%** |
| P0-6 HITL Console (AXIS-DS v1.2 agentic-ui) | ApprovalCard·ToolCallCard·FeedbackButtons·PlanCard·RunProgress·ContextPanel·MessageBubble v1.1.2 publish됨. HITL 워크플로우 컴포지션 미구현 | **55%** |

**Top Gap:**
1. **93일 활동 정지** — 7월 MVP 시계열에서 가장 큰 단일 리스크
2. KPI Dashboard 위젯 라인업(KPI Tile, Sparkline, MetricGrid, TrendArrow) **부재** — P0-5 직접 차단
3. HITL Console 워크플로우 컴포지션 (Queue, Decision Log, Audit Trail 레이아웃) **부재** — 위젯은 있고 콘솔은 없음
4. CHANGELOG.md 부재 (404)
5. README/root package.json 버전 stale (0.7.0 / 1.0.0 vs npm 1.1.2)
6. PR #55 13일째 미머지 — federation 채널 미작동 신호
7. **v1.2 게이트 정의가 repo에 없음** — PRD §6.2가 "AXIS-DS v1.2"를 요구하지만 v1.2 로드맵/조건이 issue·README·CHANGELOG에 어디에도 명시 안 됨. 정의 자체가 PRD-final 측 단독.

---

### 2.5 ax-plugin — Skill Layer (`KTDS-AXBD/ax-plugin`)

| 항목 | 값 | 메모리 비교 |
|---|---|---|
| 자기 정체성 | "AX BD Team unified workflow plugin for Claude Code — session, governance, deploy, team" | 일치 |
| 버전 | plugin.json **v1.0.0**, README "24개 스킬", plugin.json description "21개 스킬", **실측 25개**, Issue 본문 ax-marketplace v1.1.0 언급 | **3중 메타 드리프트** |
| 스킬 목록 (실측 25개) | code-deploy, code-verify, daily-check, e2e-audit, git-sync, git-team, gov-doc, gov-retro, gov-risk, gov-standards, gov-version, help, infra-selfcheck, infra-statusline, req-integrity, req-interview, req-manage, session-end, session-start, sprint, sprint-autopilot, sprint-pipeline, sprint-watch, task, todo | 메모리·README **`todo` 누락** (실측 +1) |
| 표준 (.md) | 15개 (INDEX·adr·cicd·coding·data-schema·dependency·doc-gov·observability·onboarding·performance·project-gov·req-gov·risk-gov·security·test·version-gov) + 셸 5개 | 메모리 일치 |
| 규칙 | 2개 (agent-team-patterns, development-workflow) | 일치 |
| 어투·인터뷰 표준 | 반존대(해요체), AskUserQuestion 사용 — README/CLAUDE.md 명시 | 일치 |
| 최근 활동 | 2026-05-02 13:07 (F553 GAP-1 + S314 dist Orphan 자동정리 + C101 PDCA 명명 + C81 Step 4e + 6f Sonnet alias) | 매우 활발 |
| Open PR | 0건 / Open Issue | 3건 (#2 TD-13 Six Hats OpenRouter, #3 TD-14 apply max_tokens, #4 TD-15 부록 파서) — 모두 req-interview 버그 |
| Branch | master (default) | — |

**PRD 매핑:**

ax-plugin은 PRD MVP 직접 P0 책임 없음 — **Sinclair + AI 100% 모델의 도구 자체**. 단 Foundry-X 5 신규 sub-app용 스킬·표준이 **현재 0개** → 평가: **갭 존재**.

**Top Gap:**
1. plugin.json 1.0.0 / README 24개 / 실측 25개 / marketplace 1.1.0 — **3중 메타 드리프트** → /ax:gov-version + /ax:infra-selfcheck 즉시
2. CHANGELOG.md 부재 (GOV-001 본인 위반)
3. 3 Open Issue (TD-13/14/15) 미해결 — req-interview 워크플로우 실사용 차단 가능
4. 신규 sub-app 스킬 0개: `/ax:guard-runtime`, `/ax:launch-rollout`, `/ax:diagnostic-trace`, `/ax:cross-org-sync`, `/ax:multi-tenant-provision` (가칭) 등 5개 신설 후보
5. 표준 신설 후보: `multi-tenant-isolation.md`, `cross-org-data-contract.md` 부재

---

## 3. PRD MVP × 5 Repo Gap 매트릭스

기능 가로축(P0 8개 + 핵심 P1 1개) × repo 세로축. 셀 = 추정 충족률 + 일차 책임 표시(★).

| | Foundry-X | Decode-X | Discovery-X | AXIS-DS | ax-plugin |
|---|---|---|---|---|---|
| P0-1 5-Layer 통합 운영 | ★ 15% | 0% (피호출) | 0% (피호출) | 0% (피호출) | 0% (운영 표준만) |
| P0-2 Multi-Tenant PG schema + RBAC 5역 + KT DS SSO | ★ 20% | 0% | 0% | — | 0% (표준만) |
| P0-3 4대 진단 자동 실행 | 45% (메트릭) | ★ 60% (코드 머지·실측 미반영) | — | — | — |
| P0-4 Cross-Org 4그룹 + core_diff default-deny | 0% | ★ 40% (4그룹 enum, default-deny 부재) | — | — | — |
| P0-5 KPI 대시보드 (한 화면) | 40% (Work Obs) | — | — | ★ 20% (KPI 위젯 부재) | — |
| P0-6 HITL Console | 35% (Approval UI) | — | — | ★ 55% (위젯 가용, 콘솔 부재) | — |
| P0-7 Audit Log Bus (전 모듈 trace_id chain) | ★ 25% (모듈별 로깅) | 50% (이벤트 발행자) | 60% (내부 audit) | — | — |
| P0-8 AI 에이전트 투명성 | ★ 50% (dual_ai_reviews + 6축) | — | — | 부분(ToolCallCard 등) | 표준 (security/observability) |
| P1 Discovery-X handoff BC 카드 export | 0% (수신부 부재) | — | ★ 40% (송신만) | — | — |

**관찰:**
- P0-4 (Cross-Org default-deny)가 **5 repo 통틀어 가장 미진척** — Foundry-X 0% / Decode-X 40%(컬럼만)
- P0-1 (5-Layer 통합)도 평균 15% — 통합 컨트롤러 부재
- 평균 **~30%** (8 P0 × 책임 repo 충족률 가중평균)
- 가장 진척된 P0-8(50%)도 외부 대시보드/투명성 UI는 부재

---

## 4. 메모리 검증 종합 (9건 Stale)

| # | 메모리 항목 | 실제 | 영향 |
|---|---|---|---|
| 1 | Foundry-X Phase 45 / Sprint 319 | **Phase 46 / Sprint 331 / v1.9.0** | 진척 +12 sprint, 7월 MVP까지 작업량 재산정 |
| 2 | Foundry-X 4 packages (cli/api/web/shared) | **15 packages** (fx-* 6 + gate-x 3 추가) | MSA Strangler 이미 진행 중 — 신규 sub-app 설계는 기존 패턴 위 |
| 3 | Decode-X v1.3 Phase 1, AIF-REQ-035 IN_PROGRESS | **v0.7.0 Pilot Core 종료 / 활성 REQ는 034·026·018·002** | 트래킹 ID 보정 필요 |
| 4 | Decode-X Phase 2-E 진행 중 | **PRD.md 8 Phase 모두 [x]**, 도메인 실측은 미반영 | 코드 머지/도메인 검증 분리 인지 |
| 5 | Discovery-X main 브랜치 | **master** | 자동화 스크립트 영향 |
| 6 | AXIS-DS org KTDS-AXBD | **IDEA-on-Action** (fork만 KTDS-AXBD) | URL 인용 보정 |
| 7 | AXIS-DS v1.1.1 | **v1.1.2** (6 패키지 동기) | 의존성 버전 갱신 |
| 8 | ax-plugin 24 스킬 | **25 스킬** (todo 누락) | README/plugin.json 동기 필요 |
| 9 | ax-plugin GOV-001~015 15개 표준 | 일치 (15 .md) — GOV 번호는 README 일부만 명시 | 명시 보완 권장 |

---

## 5. 우선순위 액션 (현재 W18 → W21 G1 게이트까지 4주)

PRD §11 "다음 단계" + Conditional 4건과 정합되게 정렬:

### 5.1 즉시 (W18, ~2026-05-08)
1. **C-1 PoC 실행** — Foundry-X agentic 자동화 PoC (Missing 진단 + Cross-Org + KPI 1건). Sinclair 개입 < 10% 측정 ⇒ 게이트
2. **PRD-final.md를 Foundry-X /docs 또는 별도 repo에 commit** — 현재 워크스페이스에만 존재, 5 repo 어디에도 없음
3. **ax-plugin 메타 드리프트 해소** — `/ax:gov-version` + `/ax:infra-selfcheck` 실행 → plugin.json 25 스킬·v1.1.0 동기, CHANGELOG.md 신규
4. **Discovery-X Issue #21 Foundry-X 링크 마스킹** — "5 repo 외부 노출 금지" 정책 위반 검토

### 5.2 단기 (W19, ~2026-05-15) — Conditional 게이트 마감
5. **C-2 본부 4 안건 서면 확약** — 도메인 본부 2개 / core_diff 워크샵 / Approver RBAC / KPI 베이스라인
6. **C-4 KPI 베이스라인 측정 시작** (5월 W19~W20 1주)
7. **Foundry-X에 P0 8개 issue/F-item 분해 등록** — 현재 open issue 1건뿐
8. **Decode-X Phase 2-E 도메인 실측 1건** — 퇴직연금에 0003_analysis.sql 평가 결과 SPEC §2 반영

### 5.3 중기 (W20~W21, G1+G2 게이트까지)
9. **Foundry-X core/{guard, launch, diagnostic, cross-org, multi-tenant} 5 sub-app 스캐폴드** — 09 문서 §2.1 패턴
10. **Foundry-X PostgreSQL 어댑터 + KT DS SSO 어댑터 PoC** — 09 문서 §2.2
11. **AXIS-DS v1.2 게이트 정의 + KPI 위젯·HITL Console 컴포지션 등록** — 93일 정체 깨기
12. **Discovery-X HANDOFF Brief 카드 → Foundry-X 수신 어댑터 합의** — 양측 인터페이스 contract

### 5.4 Sprint 1 시작 전 (W21~W22)
13. **Audit Log Bus event 스키마 v1 합의** — Decode-X·Discovery-X 발행 + Foundry-X 수신 정합 — 09 문서 §2.3
14. **Cross-Org core_differentiator default-deny 코드 강제 설계** — 09 문서 §2.1
15. **ax-plugin 신규 5 스킬 스캐폴드** — sub-app 5개에 대응

---

## 6. 핵심 리스크 (PRD §7과 정합)

| ID | 리스크 | 본 문서 근거 | PRD 연계 |
|---|---|---|---|
| R-X3 | 7월 deadline + Multi-Tenant 동시 압박 | P0 평균 25%, critical path 12주 | High/Med |
| R-X6 | AI 에이전트 자동화 한계 | Discovery-X 47일·AXIS-DS 93일 정체 — Sinclair+AI 100%로 deadline 회복 가능성 검증 필요 (= C-1) | High/Med |
| R-X1 | 본부 간 core_diff 공유 거부 | Cross-Org default-deny 0% — 코드 강제 미구현으로 본부 신뢰 확보 어려움 | High/Med |
| (신규) R-X8 | 5 repo 외부 노출 금지 정책 위반 | Discovery-X Issue #21 Foundry-X 링크 노출 | Med/Med |
| (신규) R-X9 | 메모리 9건 stale로 인한 의사결정 오류 | 본 §4 검증표 | Low/High |

---

## 7. 다음 문서로의 연결

본 보고서가 확인한 **5 repo 현황 + 8 P0 gap + critical path 12주**는 15_msa_implementation_plan_v1.md에서 다음 3개 영역의 MSA 구현 계획으로 이어진다 (기존 09~12 dev plan은 sub-app 4개 단위 상세, 15는 5개 sub-app + 횡단 2개 + 12주 sprint 통합 매핑):

1. **Foundry-X core/{guard, launch, diagnostic, cross-org, multi-tenant} sub-app 설계** (P0-1·3·4·6 직결)
2. **Multi-Tenant PostgreSQL schema 격리 + RBAC 5역할** (P0-2 직결, D1→PG 마이그레이션 경로)
