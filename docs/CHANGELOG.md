# Changelog

All notable changes to the Foundry-X project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

### 세션 #175 (2026-04-03)
**SPEC.md drift 보정 + session-end 3-way 수치 동기화 추가**:
- ✅ SPEC.md §1 Phase 9→10, §2 수치 보정 (tests 2250→2351, routes 73→76, services 169→176, schemas 87→90, D1 0080→0082)
- ✅ Sprint 104/105 완료 행 SPEC.md §2에 추가
- ✅ ax:session-end Phase 2에 SPEC.md §2 수치 자동 갱신 로직 추가
- ✅ ax:session-end Phase 5c에 SPEC↔MEMORY↔CLAUDE 3-way 교차 검증 추가
- ✅ feedback_claude_md_drift.md 보정 범위 확대 (CLAUDE.md only → 3-way)

**검증 결과**: SPEC↔MEMORY↔CLAUDE 수치 일치 확인 (76/176/90/2351)

### 세션 #174 (2026-04-03)
**gh CLI 설치 + session-end Phase 3c/6 활성화**:
- ✅ gh CLI v2.45.0 설치 + PAT 인증 연동 (AXBD-Team)
- ✅ Phase 3c (GitHub Issues 동기화), Phase 3c-5 (Project Status), Phase 6 (CI/CD Run) 활성화 검증
- ✅ 매 session-end에서 건너뛰던 3개 Phase 해소

**검증 결과**: gh repo/issues/runs API 모두 정상 동작

### 세션 #173 (2026-04-03)
**ax plugin 자율점검 + 인프라 정비**:
- ✅ selfcheck 8항목 실행 → C2(CLAUDE.md 스킬 누락) + C8(report 위치) 수정
- ✅ infra-selfcheck C1을 plugin skills 기반으로 전환
- ✅ sprint merge에 CLAUDE.md 스킬 동기화 단계 추가

### 세션 #172 (2026-04-03)
**리포 정리 — gitignore + 미추적 문서 일괄 등록**:
- ✅ .gitignore: 바이너리 참고자료(PDF/DOCX/HTML) + 임시 디렉토리(.firecrawl/, _workspace-prev/) 추가
- ✅ 프로젝트 문서 39파일 커밋 (FX-PLAN-012 PRD, axbd 참고자료+ai-biz 플러그인, openspec PRD+리뷰, demo-scenario)
- ✅ Dirty files 17 → 0 정리 완료

**검증 결과**: typecheck ✅ (5 tasks, 3 cached)

### 세션 #171 (2026-04-03)
**Sprint 105+110 병렬 완료 — DERIVED 엔진 + BD 형상화 Phase A+B+C**:
- ✅ Sprint 110 F282+F283: ax-bd-shaping 스킬 + shaping-{orchestrator,generator,discriminator} 에이전트 3종 + Rubric 5차원 + 참조 3종 (PR #235, Match 100%, 12분 autopilot)
- ✅ Sprint 105 F276: DERIVED 엔진 — 패턴 추출 + 스킬 후보 생성 + HITL 승인 (PR #236, Match 100%, 병렬 세션 완료)
- ✅ Sprint 108∥110 병렬 실행 성공 — 파일 충돌 0% 예측 적중
- ✅ Plan+Design 사전 작성 → Autopilot 즉시 Implement 진입 (Plan/Design 건너뜀)

**검증 결과**: typecheck ✅, API 2351/2351 ✅
**배포**: D1 0082 remote 적용 ✅ (116 commands) + Workers 재배포 (Version 05e93d4e) ✅

### 세션 #170 (2026-04-02)
**Sprint 108 F279+F280 완료 — BD 데모 시딩 (Production Showcase)**:
- ✅ F279+F280 BD 데모 시딩: D1 0082 마이그레이션, 18테이블 104 rows, 1383줄 SQL (PR #234, Match 100%)
- ✅ 헬스케어AI(7단계 완주, offering) + GIVC chatGIVC(5단계, decision) 2개 아이디어
- ✅ bd_artifacts 16건 한글 콘텐츠 (시장조사/경쟁분석/BMC/PRD/MVP 등 500~2000자)
- ✅ Plan+Design 사전 준비 → Autopilot 7분 완료 (마이그레이션 0081→0082 자동 보정)
- ✅ WT 정리 완료 (worktree + branch + tmux + signal)

**검증 결과**: typecheck ✅, API 2311/2311 ✅, D1 0082 local 적용 ✅ (remote는 Sprint 109)

### 세션 #169 (2026-04-02)
**Sprint 104 F275 완료 — 스킬 레지스트리 (Skill Evolution Phase 2)**:
- ✅ F275 스킬 레지스트리: D1 0081(2테이블) + API 8 endpoints + 40 tests (PR #233, Match 99%)
- ✅ SkillRegistryService + SkillSearchService(TF-IDF Lite) + SafetyChecker(A~F 등급)
- ✅ Shared 타입 65줄: SkillRegistryEntry, SkillSearchResult, SafetyCheckResult, SkillEnrichedView
- ✅ D1 0081 remote 적용 + Workers 재배포 (Version 5a2ed549)

**검증 결과**: typecheck ✅, API 2311/2311 ✅, Sprint Autopilot 25분 완료

### 세션 #168 (2026-04-02)
**BD 형상화 PRD 리뷰 + 구현 계획 (F282~F287 SPEC 등록)**:
- ✅ prd-shaping-v1.md 전체 리뷰: AI 초안 → 6건 의사결정 인터뷰 + 4건 피드백
- ✅ F282~F287 SPEC 등록 (FX-REQ-274~279): Sprint 110~112 배치, 3 Sprint 압축
- ✅ Sprint 108∥110 병렬 가능성 분석: 파일 충돌 0%, 병행 확정
- ✅ PRD §11 리뷰 결정사항 추가: 범위/저장/환경/모델/Sprint/우선순위 6개 결정

**결정 사항**: 6 Phase 전체 구현 / D1+Git 병행 저장 / OpenRouter 3모델 / 스킬+API 이중 실행

### 세션 #167 (2026-04-02)
**O-G-D v1.2 최적화 + Phase 10 통합 Report + BD 데모 계획 (F279~F281)**:
- ✅ O-G-D 에이전트 3종 최적화: search-cache.md(R-25) + max_searches(R-26) — 실행 시간 45분→12분 (-74%)
- ✅ PRD v1.2 업데이트: 초과 구현 정규화(R-17~R-19) + 데모 기준 현실화 + WebSearch 최적화(R-25/R-26)
- ✅ Phase 10 통합 Report(FX-RPRT-P10-001): Sprint 101+102 Combined Match 97%
- ✅ O-G-D 데모 재실행: 헬스케어 AI SaaS, 0.765→0.875(+0.11), 12분, WebSearch 10회
- ✅ SPEC F279~F281 등록: BD 데모 시딩(Sprint 108) + E2E 검증(Sprint 109)

**검증 결과**: Agent Team 2분 완료, File Guard 0건, O-G-D 데모 12분 CONVERGED

### 세션 #166 (2026-04-02)
**Sprint 103 F274 완료 — 스킬 실행 메트릭 수집 (Skill Evolution Phase 1)**:
- ✅ D1 마이그레이션 0080: skill_executions/skill_versions/skill_lineage/skill_audit_log 4테이블
- ✅ SkillMetricsService 8 메서드 + skill-metrics 라우트 5 endpoints
- ✅ BdSkillExecutor 래퍼 (recordMetrics + estimateCost 자동 연동)
- ✅ 21 tests (서비스 12 + 라우트 9), 전체 2271 pass
- ✅ Sprint 103 autopilot 19분 완료 → PR #232 merge → D1 0080 remote 적용 → Workers 재배포(f034836d)

**검증 결과**: Match 100% (9/9 항목), typecheck ✅, API 2271/2271 ✅

### 세션 #165 (2026-04-02)
**Sprint 102 F273 완료 + Sprint 스킬 Full Auto 개선**:
- ✅ Sprint 102 autopilot 실행 → F273 ax-bd-discovery v8.2 O-G-D 통합 (Match 100%, PR #231)
- ✅ Sprint 스킬 Full Auto 개선 — `start` 한 번으로 WT→autopilot→monitor→merge 자동화
- ✅ sprint-autopilot Step 7 signal 직접 생성 추가 (ccw/ccs 무관)
- ✅ ax-plugin 배포 (`460ac7f` → KTDS-AXBD/ax-plugin)

**검증 결과**: Sprint 102 Match 100%, 코드 변경 0줄 (스킬 문서만 +724줄)

### 세션 #164 (2026-04-02)
**Sprint 101 O-G-D Agent Loop — Harness×GAN 적대적 루프 PoC 완성**:
- ✅ PRD v1.1 작성 + 외부 AI 3사(GPT-4o/DeepSeek R1/Gemini) 교차 검토 반영
- ✅ 에이전트 3종: ogd-orchestrator(opus), ogd-generator(sonnet), ogd-discriminator(sonnet)
- ✅ BD Rubric 7항목 + references 3개 (convergence, mode-collapse, rubric-bd)
- ✅ O-G-D 독립 루프 검증: GIVC chatGIVC 고도화 데모 — Round 0(0.82)→Round 1(0.89) CONVERGED
- ✅ Gap Analysis Match Rate **95%** (Must-Have 100%, Should-Have 80%)
- ✅ SPEC.md F270~F273 등록, F270~F272 ✅ 완료

**검증 결과**: 에러 0건, SAM 예산 오류 자동 탐지, 2라운드 수렴

### 세션 #163 (2026-04-02)
**GOV-001 문서 정비 — INDEX.md 재생성 + frontmatter 22건 추가**:
- ✅ Daily Check 8항목 전체 OK (수치 drift 0건)
- ✅ INDEX.md 전체 재생성: 74줄→335줄, 241개 GOV 문서 등재
- ✅ PRD v8-final 현행 권위 문서로 INDEX 등록 + SPEC frontmatter 추가
- ✅ 레거시 핵심 문서 22개 GOV-001 frontmatter 소급 추가 (ADR 2 + PRD 5 + SPEC 3 + PLAN 5 + DSGN 4 + ANLS 1 + RPRT 3)
- ✅ bizdevprocess-2/interview-log.md PARTIAL 보정 (category, updated)
- ✅ specs/ 디렉토리 구조 가이드 + PRD 프로젝트 테이블 INDEX.md에 추가

**검증 결과**:
- ✅ typecheck 0 errors (turbo cached)
- ✅ GOV 준수: 241/568 (42.4%), PARTIAL 0건

### 세션 #161 (2026-04-02)
**ax-daily-check 스킬 재생성 + CLAUDE.md 수치 보정**:
- ✅ `ax-daily-check` 글로벌 스킬 신규 작성 (F268 commands 삭제 시 유실 복구)
- ✅ 8항목 점검: Runtime, Git Sync, Dependencies, TypeScript, Hooks, D1 Migration, CLAUDE.md 정합성, Disk/Cache
- ✅ Step 6b 추가: CLAUDE.md 수치 정합성 자동 감지 + 보정 (claude-md-improver 경량 내장)
- ✅ CLAUDE.md D1 마이그레이션 수치 보정 (0078→0079)
- ✅ Playwright 잔여물 18MB 삭제

**검증 결과**:
- ✅ typecheck 0 errors (turbo cached)

### 세션 #160 (2026-04-01)
**F269 발굴 IA & Page 정리 (Sprint 100, Match 97%)**:
- ✅ 사이드바 발굴 메뉴 10→3개 축소 (Discovery, 아이디어·BMC, 대시보드)
- ✅ 데모 시나리오→시작하기, 스킬카탈로그·Ontology→지식 그룹 이동
- ✅ Discovery 페이지: 위저드+프로세스가이드 탭 통합
- ✅ 아이디어·BMC 탭 통합 페이지 신규
- ✅ 발굴 대시보드 3탭 통합 (진행추적+기준달성률+산출물)
- ✅ HelpAgent: 플로팅 FAB→Sheet 사이드 패널 전환 (FeedbackWidget 겹침 해소)
- ✅ 기존 11개 라우트 전부 유지 (URL 호환성)

**검증 결과**:
- ✅ typecheck 0 errors / tests 265/265 PASS

### 세션 #158 (2026-04-01)
**정합성 전체 점검 + 코드 버그 3건 수정 + SPEC §2 수치 보정**:
- ✅ help-agent.ts: `tenantId`→`orgId` 타입에러 수정 (TenantVariables 정합)
- ✅ help-agent-service.ts: `role` 타입 `string`→`"system"|"user"|"assistant"` 좁히기
- ✅ feedback-context.test.ts: 중복 ALTER TABLE 제거 (mock-d1 base schema 반영)
- ✅ 테스트 파일 optional chaining 보정 (help-agent-route, openrouter-service)
- ✅ SPEC.md §2 수치 보정 6건: API 2250, Web 265, E2E 35, routes 73, services 169, D1 0079

**검증 결과**:
- ✅ typecheck 0 errors / lint 0 errors / tests 2250+149+265 = 2664 / build PASS

### 세션 #152b (2026-03-31)
**KG Ontology E2E + Sprint 94 merge + CLAUDE.md 수치 갱신**:
- ✅ KG Ontology E2E 7개 추가 (28 specs, ~100 tests)
- ✅ Sprint 94 (F263+F265): 발굴 UX 위저드 UI + 온보딩 투어 merge 완료
- ✅ CLAUDE.md: routes 71, services 166, schemas 85, E2E 100 갱신

### 세션 #152 (2026-03-31)
**Sprint 92~93 GIVC PoC 완료 + D1 0076 배포**:
- ✅ Sprint 92 (F255): GIVC Ontology PoC 1차 — Property Graph 3-테이블 + 16 API + KG 탐색기 (PR #229)
- ✅ Sprint 93 (F256+F257): GIVC PoC 2차 — 이벤트 연쇄 시나리오 MVP + BD 아이템 탐색 UI (PR #230)
- ✅ D1 0076 remote 적용 + Workers 재배포 (Version 28a527e3)
- ✅ 테스트: API 2190→2205(+15), Web 249→257(+8), 총 +23개

**검증 결과**:
- ✅ typecheck / lint / tests / D1 migration / Workers deploy

---

## 마일스톤 회고: Phase 9a (v1.8.0) — Sprint 86~91

### 지표 변화
| 지표 | v1.7.0 | v1.8.0 | 변화 |
|------|:------:|:------:|:----:|
| 총 테스트 | 2475 | **2588** | **+113** |
| API tests | 2119 | 2190 | +71 |
| Web tests | 207 | 249 | +42 |
| E2E tests | ~59 | ~93 | +34 |
| API routes | 63 | 69 | +6 |
| API services | 153 | 160 | +7 |
| D1 migrations | 0074 | 0077 | +3 |
| F-items | F247 | F262 | +15 |

### 완료 Sprint (6개)
- **Sprint 86** (F248~F250): ProtectedRoute 인증 가드 + E2E fixture 키 통일 + 로그인 E2E 7개
- **Sprint 87** (F251+F252): 팀 계정 일괄 생성 + 온보딩 가이드 고도화 (PR #224)
- **Sprint 88** (F253+F254): 팀 데이터 공유 + NPS 피드백 수집
- **Sprint 89** (F258+F259): BD 프로세스 가이드 UI + 스킬 카탈로그 UI (PR #225)
- **Sprint 90** (F260+F261): BD 스킬 실행 엔진 + 산출물 저장·버전 관리 (PR #227)
- **Sprint 91** (F262): BD 프로세스 진행 추적 + 사업성 신호등 (PR #228)

### 잘된 점
- **BD 스킬 풀스택 통합**: CLAUDE_AXBD 76스킬+36커맨드를 웹 풀스택으로 5개 F-item(F258~F262)에 체계적 분해 → 3 Sprint 순차 완성. 프로세스 가이드 → 스킬 실행 → 진행 추적까지 E2E 파이프라인 구축

### 개선점
- **SPEC 미커밋 drift**: F-item 등록 후 커밋 없이 WT 생성 → WT가 미등록 SPEC을 가짐 (S149 교훈). `development-workflow.md`에 "SPEC 등록 후 즉시 커밋+push 필수" 룰 추가로 대응 완료

### 결정 검증
- **Sprint 병렬화 (87+89)**: 의존성 분석 후 안전하게 병렬 실행 → 충돌 없이 성공
- **autopilot 워크플로우**: tmux send-keys 방식이 안정적. Sprint 89(1h45m), 90(20m), 91(2h12m)

### 다음 마일스톤 방향
- D1 0075~0077 remote 배포 + Workers 재배포
- GIVC Ontology PoC (F255~F256)
- 추가 BD 아이템 탐색 (F257)

---

### 세션 #149 (2026-03-31)
**Sprint 86: 인증 가드 + E2E 보강 + Workers 재배포**:
- ✅ ProtectedRoute 래퍼: AppLayout 하위 36개 라우트 미인증 접근 차단 → /login 리다이렉트
- ✅ auth-store isHydrated 상태 추가: 비동기 refresh 완료 대기 후 리다이렉트
- ✅ E2E fixture fx-token→token 키 통일 4곳
- ✅ auth-flow E2E 2→7개 시나리오 보강
- ✅ Workers 재배포 (Version 42e92ca9, wrangler 4.78) + D1 0066~0074 remote 적용
- ✅ CLAUDE.md drift 보정: Deployment WSL 제약 명시 + E2E 17→25 specs

**검증 결과**:
- ✅ typecheck / 207 unit tests / lint 0 error

---

### 세션 #149 (2026-03-31)
**프로젝트 점검 + Phase 9 Sprint 87~88 완료 + Workers 재배포**:
- ✅ Workers 재배포: wrangler 3→4 업그레이드 + Version 089a646a
- ✅ D1 migration 0075 (nps_surveys) remote 적용
- ✅ Phase 7~8 마일스톤 회고 (v1.7.0 태그)
- ✅ Phase 9 로드맵 수립 (F251~F257, Sprint 87~90)
- ✅ Sprint 87 (F251+F252): 팀 계정 일괄 생성 + 온보딩 가이드 고도화 (PR #224, Match 97%)
- ✅ Sprint 88 (F253+F254): 팀 데이터 공유 + NPS 피드백 수집 (PR #226)
- ✅ Sprint 85/87/88 worktree 정리
- ✅ Sprint WT 실행 규칙 정립 (bash sprint() 함수 + tmux send-keys autopilot)
- 현재 수치: API 2142 + CLI 149 + Web 230 = 2521 tests, 66 routes, 156 services, 81 schemas, D1 0001~0075

## 마일스톤 회고: Phase 7~8 (v1.7.0) — Sprint 79~85

### 지표 변화
| 지표 | Phase 6 종료 (v1.6.0) | 현재 | 변화 |
|------|----------------------|------|------|
| API 테스트 | 1,965 | 2,119 | +154 |
| CLI 테스트 | 149 | 149 | - |
| Web 테스트 | 121+ | 207 | +86 |
| E2E specs | ~55 | 25 | -30 (Vite 전환 정리) |
| 총 테스트 | 2,235+ | 2,475 | +240 |
| API routes | 54 | 63 | +9 |
| API services | 143 | 153 | +10 |
| API schemas | 69 | 78 | +9 |
| D1 migrations | 0001~0065 | 0001~0074 | +9 |
| TS 코드 | - | 142,644 lines | - |

### 주요 성과
- **Phase 7 (Sprint 79~81)**: BD Pipeline E2E 9개 기능(F232~F240) 완료 — 파이프라인 대시보드, 산출물 공유, ORB/PRB 게이트, 사업제안서 자동생성, Offering Pack, MVP 추적, IR Bottom-up
- **Phase 8 (Sprint 82~85)**: IA 구조 개선 + Next.js → Vite + React Router 전환 + GIVC 피치덱 PoC
- **인프라 정비**: wrangler 3→4 업그레이드, CI deploy 파이프라인 최적화, Workers 재배포

### 잘된 점
- Sprint Pipeline 병렬화로 Sprint 79~81을 배치로 빠르게 완료
- wrangler/인프라 정비를 Phase 경계에 배치하여 기술부채 누적 방지

### 개선점
- **WSL 메모리 이슈**: wrangler + Claude Code 동시 실행 시 메모리 소진 반복 → `.wslconfig` autoMemoryReclaim + swap 설정으로 완화
- **Worktree 정리 지연**: Sprint 완료 후 worktree/branch 정리가 밀리는 패턴 → 세션 종료 시 자동 정리 검토
- **SPEC drift 반복**: 수치/상태가 실제와 불일치하여 여러 세션에서 보정 작업 → 소급 갱신 자동화 검토

### 결정 검증
- 기존 결정 유지 (WSL wrangler 금지 → 메모리 여유 시 조건부 허용으로 운영)
- Plumb Stay Track A (ADR-001) 유지, 재판정 2026-09-21

### 다음 마일스톤 방향
- **[P0]** F114: 내부 6명 실제 온보딩
- Phase 7 회고 태그 (v1.7.0) 생성
- Phase 9 로드맵 수립

---

### 세션 #149 (2026-03-31)
**프로젝트 점검 + Workers 재배포 + Sprint 85 정리**:
- ✅ 전체 빌드 검증: typecheck 5/5, API 2119/2119, CLI 149/149, Web 207/207, lint 0 errors
- ✅ Workers 재배포: wrangler 3.114→4.78 업그레이드 + deploy 성공 (Version 42e92ca9)
- ✅ D1 migrations 0001~0074 remote 전체 적용 확인
- ✅ Sprint 85 worktree 제거 + sprint/85 branch 삭제
- ✅ Phase 7~8 마일스톤 회고 작성

### 세션 #146 (2026-03-31)
**GIVC 피치덱 버전 셀렉터 + SPEC.md §2 수치 보정**:
- ✅ GIVC 피치덱 v0.9 반영 — 고객선제안 최신 HTML 배치 (77KB)
- ✅ 버전 셀렉터 UI — v0.1(초안)/v0.2(내부검토)/v0.9(고객선제안) 드롭다운 선택
- ✅ Offering Packs Featured Showcase v0.2→v0.9 갱신
- ✅ SPEC.md §2 수치 5건 보정: Web 172→207, 총 2440→2475, schemas 69→78, D1 0065→0074, E2E 27→25 specs

### 세션 #145 (2026-03-30)
**CLAUDE.md drift 8건 수정 + 플러그인 인프라 점검**:
- ✅ ax-infra-selfcheck 8/8 PASS — commands, standards, hooks, skills 전체 정합성 확인
- ✅ CLAUDE.md Next.js→Vite 표기 2곳 수정 (dev server, Pages 배포)
- ✅ CLAUDE.md 수치 갱신: Web tests 172→207, CLI tests 125→149, E2E ~58→~59
- ✅ CLAUDE.md 환경변수: NEXT_PUBLIC_API_URL → VITE_API_URL (실제 코드 반영)
- ✅ CLAUDE.md D1: 0065→0074 범위, 새 마이그레이션 0075부터
- ✅ CLAUDE.md PreToolUse hook 설명 추가

### 세션 #144 (2026-03-30)
**ccw Master fallback 버그 수정**:
- ✅ .sprint-context를 .gitignore에 추가 + git 트래킹 제거
- ✅ Master에 잔류하던 Sprint 85 .sprint-context 삭제 → ccw가 Master에서 정상 동작
- ✅ CLAUDE.md Phase 8 + Web 207 tests 반영

### 세션 #143 (2026-03-30)
**로그인 캐시 문제 5건 수정 — 인증 안정성 강화**:
- ✅ hydrate() JWT 만료 검증: 만료된 토큰으로 로그인됨 표시되던 문제 수정
- ✅ 401 자동 refresh 인터셉터: API 호출 실패 시 refreshToken으로 갱신 후 재시도
- ✅ 선제적 토큰 갱신 타이머: 만료 5분 전 자동 refresh 스케줄링
- ✅ Org 컨텍스트 stale 방지: JWT orgId가 멤버십에 없으면 자동 전환
- ✅ refreshToken DB 정리: POST /auth/cleanup-tokens 관리자 엔드포인트

**검증 결과**:
- ✅ typecheck (API + Web) / API 2119 tests / Web 207 tests

### 세션 #136 (2026-03-30)
**Phase 7 완료 — Sprint 81 구현 + 인프라 정비 + 마일스톤 회고**:
- ✅ Sprint 81: F236 Offering Pack + F238 MVP 추적 + F240 IR Bottom-up 채널
- ✅ D1 마이그레이션 0072~0074, 서비스 3, 라우트 3, 스키마 3, 테스트 +49건
- ✅ Sprint 80 SPEC ✅ 완료 처리 (F234/F235/F237)
- ✅ Phase 7 전체 완료: F232~F240 9건 전부 ✅
- ✅ Workers 재배포: Version bb0e8197, D1 0074 remote 전체 적용
- ✅ Sprint 79/80/81 remote 브랜치 삭제
- ✅ Phase 7 마일스톤 회고 (FX-RPRT-007): +154 tests, +9 routes, +10 services, +8199 LoC

### 세션 #135 (2026-03-30)
**Phase 7 FX-BD-V1 — BD 파이프라인 E2E 통합 기획**:
- ✅ AX BD 프로세스 v0.9 다이어그램 × 코드베이스 갭 분석 (6단계, 10개 항목)
- ✅ 요구사항 인터뷰(8회 AskUserQuestion): Prep PRB=ORB/PRB 게이트, Offering Pack=영업 패키지
- ✅ PRD v1→v3: 3 AI(ChatGPT+Gemini+DeepSeek) 3라운드 검토 + Six Hats 20턴 토론 → final 확정
- ✅ Plan: F232~F240 (9 F-items), Sprint 79~81 분할, D1 0066~0073 설계
- ✅ Design: Sprint 79 상세(17ep) + Sprint 80~81 요약(18ep), 총 ~35 신규 endpoints
- ✅ SPEC.md Phase 7 헤더 + F232~F240 + Sprint 79~81 등록
- ✅ CLAUDE.md Phase 7 진입 + Key Documents 갱신

## 마일스톤 회고: Phase 6 — Ecosystem Integration (Sprint 75~78)

> 기간: 2026-03-30 (단일 세션 #134b) | 4 Sprint 병렬 Pipeline

### 지표 변화

| 지표 | Phase 5 완료 | Phase 6 완료 | 변화 |
|------|:----------:|:----------:|:----:|
| 전체 tests | 2,083 | 2,286 | **+203** |
| API tests | 1,786 | 1,965 | +179 |
| CLI tests | 125 | 149 | +24 |
| Routes | 47 | 54 | +7 |
| Services | 136 | 143 | +7 |
| Schemas | 62 | 69 | +7 |
| D1 migrations | 0060 | 0065 | +5 |
| F-items | F219 | F231 | +12 |

### 잘된 점
- **Sprint Pipeline 병렬화 성공**: 4개 Sprint를 2배치(75+76, 77+78)로 나누어 ccw-auto 병렬 실행. 총 ~110분에 12개 F-item 완료. 순차 실행 대비 약 50% 시간 단축
- **Plan/Design 사전 작성 효과**: Sprint 75+76은 Master에서 Plan/Design을 먼저 작성한 후 Pipeline 실행. autopilot이 문서 읽기→구현으로 바로 진입하여 효율적
- **충돌 최소화**: shared/types.ts 교차 수정에도 .sprint-context만 충돌 — rebase 1회로 해결. 배치 분석(CLI vs API 영역 분리)이 효과적
- **BMAD/OpenSpec 벤치마킹 체계적 반영**: PRD(FX-PLAN-012) 기반으로 Adopt 4건, Reference 5건, Watch 3건을 구조적으로 분류하여 적용

### 개선점
- **[Ref] 항목의 과도한 구현**: Sprint 77의 F224~F228은 "설계 참고/문서화" 범위였으나, autopilot이 5개 서비스+라우트+D1 3건까지 구현. 문서 Sprint에는 구현 범위 제한 프롬프트 필요
- **Monitor 조기 종료**: sprint-merge-monitor.sh의 1800초 timeout이 부족하여 수동 모니터링으로 전환. timeout을 3600초로 조정하거나 ccw-auto 완료 후 자동 재시작 필요
- **Master Plan/Design 중복 생성**: Master에서 작성한 Plan/Design이 WT에서 다시 생성됨 — WT의 autopilot이 기존 문서를 감지하지 못하고 새로 작성. 문서 복사 또는 감지 로직 개선 필요
- **Signal 파일 미갱신**: Sprint 75의 signal이 CREATED 상태에서 변경되지 않음. ccw-auto의 post-session 스크립트와 signal 연동 점검 필요

### 결정 검증
- **배치 2개 분리 (75+76 → 77+78) — 적절**: 코드 vs 문서 분리가 명확하여 충돌 없이 병렬 완료
- **Plan/Design 사전 작성 — 부분 효과**: autopilot 시간 단축에 기여했으나 중복 생성 문제. 향후 WT에 기존 문서 복사 또는 "Plan 존재 시 건너뛰기" 로직 필요
- **Plumb Stay Track A — 유지**: Phase 6에서 Plumb 관련 이슈 없음, 재판정 시점(2026-09) 유지 적절

### 다음 마일스톤 방향
- Phase 6 완료로 BMAD/OpenSpec 핵심 패턴 흡수 완료
- Phase 7 후보: BD Pipeline End-to-End 통합, 내부 온보딩(F114), MCP 프로토콜 구현
- Sprint 77 [Ref] 구현물의 품질 검증 필요 (코드 리뷰/테스트 보강)
- Monitor/Signal 자동화 개선 (timeout 조정, signal 상태 연동)

---

### 세션 #134b (2026-03-30)
**Phase 6 Ecosystem Integration — Sprint 75~78 Pipeline 완료**:
- ✅ Sprint 75 (F220+F222): Brownfield Init 강화 + Changes Directory — PR #213
- ✅ Sprint 76 (F221+F223): Agent-as-Code 선언적 정의 + Doc Sharding — PR #214
- ✅ Sprint 77 (F224~F228): Ecosystem Reference 5건 (context-passthrough, command-registry, party-session, spec-library, expansion-pack) — PR #216
- ✅ Sprint 78 (F229~F231): Watch 벤치마킹 3건 — PR #215
- ✅ D1: 0060→0065 (+5 migrations, remote 적용)
- ✅ Workers: 05d22d2e 배포
- ✅ 테스트: API 1786→1965(+179), CLI 125→149(+24) = 총 2286(+186)
- ✅ API: routes 47→54(+7), services 136→143(+7), schemas 62→69(+7)

**검증 결과**: typecheck ✅, API 1965/1965 ✅, CLI 149/149 ✅

### 세션 #134 (2026-03-30)
**CLAUDE.md 감사 + better-sqlite3 리빌드**:
- ✅ CLAUDE.md 수치 현행화: endpoints ~304→~315, D1 61파일(0040 중복) 명시
- ✅ CLAUDE.md 중복 제거: Deployment↔Gotchas CORS/API URL 이중 기재 해소 (208→207줄)
- ✅ CLAUDE.md 보강: ESLint 커스텀 룰 3종 + D1 0040 중복 Gotcha 추가
- ✅ better-sqlite3 Node v24 리빌드: MODULE_VERSION 127→137 — API 1050 fail→1803/1803 pass
- ✅ pnpm virtual store 정상화: worktree 잔재(`.claude/worktrees/a/`) → 로컬 `node_modules/.pnpm/`

### 세션 #133 (2026-03-26)
**스킬 프레임워크 점검 + 관리 체계 수립**:
- ✅ selfcheck 보정: PDCA 위치이탈 4건 → features/ 이동, Zone.Identifier 2건 삭제, CLAUDE.md 스킬 등재
- ✅ sf-scan: 82개 active 스킬, 10 카테고리, uncategorized 0건
- ✅ sf-lint: 0 errors, 22 WARN (20건 false positive — commands에 이미 Use when 존재)
- ✅ FX-GUID-001: CC 스킬 관리 가이드 (비개발자용 — 찾기/사용/수정/만들기/공유/품질관리)
- ✅ FX-GUID-002: 82개 스킬 카탈로그 (10 카테고리, sf-scan 기반)
- ✅ Workers 재배포: Version 3dfc71b0, HTTP 401 정상

### 세션 #132 (2026-03-26)
**Phase 6 Ecosystem Integration — REQ 12건 등록**:
- ✅ FX-PLAN-012(BMAD/OpenSpec 벤치마킹) 기반 F220~F231 SPEC.md 등록
- ✅ Adopt 4건(P0~P2): Brownfield Init, Agent-as-Code, Changes Dir, Doc Sharding
- ✅ Reference 5건(P3): 컨텍스트 전달, 커맨드 UX, Party Mode, Spec Library, Expansion Pack
- ✅ Watch 3건(P4): Agent Spec 표준, Scale-Adaptive, Multi-repo
- ✅ Sprint 75~78 재배정, CLAUDE.md Phase 6 섹션 추가

### 세션 #131 (2026-03-26)
**팀 가이드 사이트 점검 + Suspense 버그 수정**:
- ✅ Getting Started: useSearchParams() Suspense boundary 추가 — 프로덕션에서 탭(설치 가이드/스킬/프로세스/FAQ) 미표시 버그 수정
- ✅ 라이브 사이트 Playwright 점검: 탭 5개 정상, Discovery v8.2 전체, Landing Sprint 71/Phase 5g 확인

### 세션 #130 (2026-03-26)
**Sprint Pipeline 72+73+74 — Phase 5g Test Agent 완료**:
- ✅ **Sprint 72** (F217): TestAgent 활성화 — TestAgentPanel+CoverageGapView+TestGenerationResult 3컴포넌트, api-client 확장. PR #212
- ✅ **Sprint 73** (F218): Agent SDK Test Agent PoC — tools/test-agent-poc/ 독립 PoC (3 agent prompts + SDK 래퍼). PR #211
- ✅ **Sprint 74** (F219): TDD 자동화 CC Skill — .claude/skills/tdd/ (SKILL.md + Red/Green/Refactor refs) + post-edit-test-warn hook. PR #210
- ✅ **Landing E2E fix**: `"Features"` → `"핵심 기능"` 셀렉터 수정 (2/2 passed)
- ✅ SPEC.md F217-F219 📋→✅, GitHub Issues #205-207 closed

**검증 결과**: E2E landing 2/2 ✅

### 세션 #129 (2026-03-26)
**팀 가이드 사이트 점검 — Landing+GettingStarted 현행화**:
- ✅ Landing: Sprint 70→71, Phase 5f done, Phase 5g 로드맵 추가, "71 Sprint" 텍스트
- ✅ Getting Started: "3가지→4가지 업무 동선" 수정, 퀵스타트 그리드 4칸 레이아웃
- ✅ E2E: landing.spec 한국어 전환 반영 (Features→핵심 기능)
- ✅ CLAUDE.md: services 135→136, schemas 61→62 (Phase 0c 실측 동기화)

**검증 결과**: typecheck ✅

### 세션 #126 (2026-03-26)
**Sprint 병렬 작업 최적화 원칙 수립**:
- ✅ `development-workflow.md`: "Sprint 병렬 작업 원칙" 섹션 신규 — 배치 구성/충돌 감지/의존성 형식/Merge 순서/리소스 제약
- ✅ `ax-sprint-pipeline.md`: Phase 2 충돌 영역 사전 점검 필수화 + Gotchas 8항목 확장
- ✅ `agent-team-patterns.md`: "Sprint Pipeline 배치 운영" 섹션 신규 — 배치 크기/상태 추적/Merge 순서
- ✅ CLAUDE.md: Phase 5f ✅ 완료 + Phase 5g 등록

### 세션 #125 (2026-03-26)
**Sprint 71 (F215) + Landing 현행화 + CI 수정 — Phase 5f 전체 완료**:
- ✅ **Sprint 71** (F215): AX BD 팀 가이드 — Getting Started 4섹션 확장 (Cowork 설치+CC 사용법+프로세스+FAQ), 5 컴포넌트 + 테스트, PR #209
- ✅ **Landing page 현행화**: SITE_META/stats/pillars/architecture/roadmap/processSteps/footer — Sprint 64→70, v0.8→v8.2
- ✅ **CI 수정**: typecheck 0 errors (test type assertions + agent.ts Hono union) + [id] 동적 라우트 제거 (output:export 호환)
- ✅ **인프라**: sprint-status-monitor.sh, ccw-auto bypass-permissions 버그 수정, merge-monitor local 버그 수정

**수치**: 47 routes, 135 services, 61 schemas, D1 0060, API 1786 tests (총 2032+)

### 세션 #124 (2026-03-26)
**F216 Test Agent 리서치 + PRD 작성 + Sprint Pipeline 설계**:
- ✅ **F216** (FX-REQ-208): 6종 Agent 활용 현황 점검 — PlannerAgent만 활용, 5종 미사용 확인
- ✅ **리서치**: Anthropic Agent SDK / Code Review Agent / 외부 벤치마크 (Cursor, Codex, SWE-bench)
- ✅ **PRD**: FX-SPEC-PRD-TA-V1 작성 (F217~F219 통합 PRD — 기술 설계, Kill 조건, 로드맵)
- ✅ **Sprint Pipeline 설계**: Batch1(F215+F217+F218 병렬) → Batch2(F219 순차)
- ✅ **CI 점검**: test/deploy ✅, prod-e2e ❌(Landing nav 3건 — 기존 이슈)
- 📋 **F217** (FX-REQ-209, Sprint 72): TestAgent 활성화 — Web UI + 워크플로우 통합
- 📋 **F218** (FX-REQ-210, Sprint 73): Agent SDK Test Agent PoC
- 📋 **F219** (FX-REQ-211, Sprint 74): TDD 자동화 CC Skill
- ✅ **보고서**: docs/03-analysis/FX-ANLS-015_ai-test-review-agent-research.md
- ✅ **GitHub Issues**: #205~#208 생성, #208(F216) close

### 세션 #123 (2026-03-26)
**Sprint Pipeline 68+69+70 — Phase 5f AX BD 사업개발 체계 3/4 완료**:
- ✅ **Sprint 68** (F212): ai-biz 11스킬 CC전환 + ax-bd-discovery 오케스트레이터 — PR #202
- ✅ **Sprint 69** (F213, Match 97%): API v8.2 확장 — 5유형+체크포인트+Commit Gate, D1 0058~0060 — PR #201
- ✅ **Sprint 70** (F214): Web Discovery 대시보드 — 프로세스 시각화+신호등+평가 뷰 — PR #204
- ✅ **sf-scan/lint/deploy**: 81 active 스킬 카탈로그, 21 스킬 배포
- ✅ **인프라 개선**: ccw-auto 버그 수정 (bypass-permissions 감지 → 시간 기반), sprint-status-monitor.sh 신규, merge-monitor `local` 버그 수정
- ✅ **테스트 수정**: mcp-adapter/model-router task type 10→13 (1788/1788 pass)

**수치**: 47 routes, 135 services, 61 schemas, D1 0001~0060, API 1786 tests (총 2032+)

### Sprint 62 완료 (2026-03-25)
**F199 BMCAgent 초안 자동 생성 + F200 BMC 버전 히스토리**:
- ✅ **F199**: BMCAgent 서비스 (PromptGateway 마스킹, 15초 타임아웃, Rate Limit 분당 5회)
- ✅ **F200**: BMC 버전 히스토리 (Git 기반 SSOT, 복원 기능)
- ✅ **신규 파일**: 10개 (services/bmc-agent.ts, bmc-history.ts, routes 2개, Web UI 1개, migration 1개, tests 4개, schemas 2개)
- ✅ **신규 API 엔드포인트**: 4개 (POST generate, GET history, GET snapshot, POST restore)
- ✅ **D1 마이그레이션**: 0048_bmc_versions (ax_bmc_versions 테이블 + 인덱스)
- ✅ **신규 테스트**: 43개 (F199: 22개, F200: 21개, 모두 통과)
- ✅ **구현 방식**: 2-Worker Agent Team (4분, File Guard 0건)
- ✅ **Design Match Rate**: 92% (Plan 목표 F199 ≥92%, F200 ≥93% 달성)

**주요 기능**:
- AI 초안 생성: 아이디어 한 줄 → 9개 블록 자동 생성 (5배+ 속도 개선)
- 보안: PromptGateway 마스킹으로 KT DS 정책 준수
- 버전 관리: Git 커밋 단위 이력 추적, 특정 버전 복원
- Web UI: BmcEditorPage에 AI 초안 생성 버튼 + editor/history 탭

**코드 통계**:
- 신규 코드: +1252 lines (17개 파일)
- shared 확장: execution-types, model-router, prompt-utils, mcp-adapter, agent.ts
- API 호환성: 기존 1481 테스트 변화 없음 (신규 43개 추가)

**Gap 분석 (5건)**:
1. 블록 키 컨벤션: camelCase(설계) vs snake_case(구현, Sprint 61 준수)
2. LLM 호출: ModelRouter.route() vs getModelForTask() + fetch (임시)
3. Web 테스트: 4개 미작성 → Sprint 63으로 연기
4. 보안 테스트: 4개 미작성 → Sprint 63으로 연기
5. shared/bmc.ts: BmcDraft 타입 미추가

**다음 단계** (Sprint 63):
- Design 문서 업데이트 (Option 2: Implementation 기준)
- Web 히스토리 테스트 + 보안 테스트 추가 (총 8개)
- ModelRouter LLM 호출 기능 리팩토링

**검증 결과**: typecheck ✅, lint ✅, API 1481+43/1481+43 ✅

---

### 세션 #104 (2026-03-24)
**Boris 워크플로우 환경 설정 + 수치 정합성 보정 + Workers 재배포**:
- ✅ Boris Cherny 워크플로우 반영: worktree alias, 글로벌 권한 19개, PostToolUse 외부 스크립트(eslint --fix + typecheck)
- ✅ 커스텀 에이전트 3종: deploy-verifier, spec-checker, build-validator (worktree 격리)
- ✅ tmux bell 알림 + Notification hook (글로벌)
- ✅ SPEC v5.30 수치 정합성 보정 9건 (Sprint 50→51, CLI 131→125 실측, API 1104, 181 ep, 84 svc, 54 tables)
- ✅ Workers 재배포 — Sprint 31~51 코드 프로덕션 반영 (Version 570efd7c)
- ✅ BDP-002 PRD Conditional→Go (3조건 해결: 보안/베이스라인/팀합의)

**추가 (세션 후반)**:
- ✅ Sprint 52 PR #174 merge + D1 0035 적용 + Workers 재배포 (923948ab)
- ✅ Worktree alias 프로젝트 공용화 — `~/work/worktrees/{project}/{slot}` 구조로 전환
- ✅ `wt-claude-worktree.sh` 인터랙티브 프로젝트 선택 UI 추가
- ✅ GitHub Issues 5건 close (F162, F163, F167, F168, F169)

**검증 결과**: typecheck ✅, lint ✅, API 1132/1132 ✅, CLI 125/125 ✅, Web 73/73 ✅

---

### 세션 #103 (2026-03-24)
**인프라 점검 + CLAUDE.md 품질 개선**:
- ✅ ax-infra-selfcheck 7/7 PASS (Commands, Standards, Hooks, Skills, Memory, Hygiene)
- ✅ CLAUDE.md 수치 drift 8건 수정 (Sprint 51 반영: routes 33, services 84, schemas 33, tests 1104, D1 34)
- ✅ CLAUDE.md Current Phase 간결화 (-24줄, 서비스/스키마 인라인 목록 → ls 참조)

**검증 결과**: 코드 변경 없음, 문서만 갱신

---

### 세션 #100 (2026-03-23)
**프로덕션 QA 디버깅 — gstack /qa (4 issues fixed, health 62→88)**:
- ✅ ISSUE-001: 전체 API 클라이언트(fetchApi/postApi/deleteApi/patchApi)에서 401 응답 시 "로그인이 필요해요" 메시지로 변환 — SR 페이지 등 raw "API 401:" 텍스트 UI 노출 수정
- ✅ ISSUE-002: Footer Discovery-X 링크 `#` → `https://dx.minu.best` + Sprint 46→50 갱신
- ✅ ISSUE-003: `/invite/[token]` 동적 라우트를 `/invite?token=xxx` query param으로 전환 — `output: export` 빌드 실패 해결
- ✅ ISSUE-004: 모바일 사이드바 로그인 버튼 항상 표시 — AuthSection을 스크롤 영역 밖으로 이동
- ✅ gstack v0.9.9.0 → v0.11.1.0 업그레이드 (/cso, /autoplan, /retro global 등 신규 스킬)

**검증 결과**: Web 73/73 ✅, `next build` ✅, CI/CD 전체 성공

---

### 세션 #99b (2026-03-23)
**Sprint 50: 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯 (F173+F174, Match Rate 100%)**:
- ✅ F173: 초대 링크 복사 UI + `/invite/[token]` 비밀번호 설정 페이지 + Google OAuth 듀얼 경로 + 자동 로그인 → Getting Started 리다이렉트
- ✅ F174: 전역 플로팅 피드백 위젯(FeedbackWidget) + pagePath/sessionSeconds 컨텍스트 자동 첨부 + `GET /kpi/weekly-summary` 주간 사용 요약 API
- ✅ API: `GET /auth/invitations/:token/info` + `POST /auth/setup-password` + Google auth invitationToken 확장 + feedback 컨텍스트 + weekly-summary
- ✅ Web: InvitePage + InviteForm + FeedbackWidget + InviteLinkCopy + Members 상태 뱃지 + layout FeedbackWidget 삽입
- ✅ D1 0032 migration (feedback_context 3컬럼) remote 적용 완료

**검증 결과**: typecheck ✅, API 1051/1051 ✅ (+22), Web 73/73 ✅, D1 0032 remote ✅
**Agent Team**: 2-Worker (7m 0s), 범위 이탈 0건, Match Rate 100%

---

### 세션 #99 (2026-03-23)
**Sprint 49: 대시보드 IA 재설계 + 인터랙티브 온보딩 투어 (F171+F172, Match Rate 95%)**:
- ✅ F171: 사이드바 10개 플랫 메뉴 → 6개 업무 동선 그룹 재편 (SR관리/개발/현황), 숨겨진 페이지 3개 노출 (spec-generator, projects, getting-started), collapsible + localStorage 영속
- ✅ F172: 순수 React 온보딩 투어 (SVG spotlight + axis-glass 6스텝), 첫 로그인 자동 시작, 투어 재시작 훅
- ✅ Getting Started 페이지: 3대 동선 퀵스타트 카드 + "투어 다시 보기" 버튼 + AXIS DS 시맨틱 컬러
- ✅ E2E dashboard.spec.ts: 사이드바 한국어 레이블 동기화
- ✅ SPEC.md: F171/F172 📋→✅, Sprint 49 행 추가

**검증 결과**: typecheck ✅, Web 74/74 ✅, 브라우저 확인 ✅ (사이드바 + 투어 + Getting Started)

---

### 세션 #98 (2026-03-23)
**Sprint 48: ML 하이브리드 SR 분류기 + SR 대시보드 UI (F167+F168, Match Rate 95%)**:
- ✅ F167: HybridSrClassifier — 규칙 기반 confidence < 0.7이면 LLM 폴백, 앙상블 가중 평균, sr_classification_feedback D1 0031, stats/feedback 3 API endpoints
- ✅ F168: SR Management 대시보드 — 목록/필터/통계카드/워크플로우 DAG/피드백 다이얼로그, Sidebar 메뉴 추가
- ✅ CLAUDE.md 수치 현행화 (42줄 Sprint 이력 압축, 수치 6건 갱신)
- ✅ SPEC drift 보정 3건 (F162/F163/F169 📋→✅, PRD v5→v8 참조)

**검증 결과**: typecheck ✅, API 1029/1029 ✅ (+30), Web 74/74 ✅ (+6), D1 0031 remote 적용 ✅
**Agent Team**: 2-Worker (4m 45s), 범위 이탈 0건

---

### 세션 #97 (2026-03-23)

**인프라 자율점검 + 정합성 보정**:
- ✅ `/ax-infra-selfcheck`: 8항목 점검 — 6 PASS + 2 SKIP, ax-req-integrity.md frontmatter 포맷 통일
- ✅ `/ax-req-integrity check`: SPEC↔GitHub↔MEMORY 5단계 검증 — 10건 불일치 감지
- ✅ `/ax-req-integrity fix`: GitHub Issues 4건 보정 (F164~F166 close + F170 #160 생성+close)
- ✅ SPEC.md v5.22→v5.23: §2 수치 갱신 (999/131/68 tests, 169 ep, 78 svc, 49 tables), Sprint 46~47 상태 2행 추가, system-version Sprint 47

---

### 세션 #96 (2026-03-22~23)

**Sprint 47 — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 (F164+F165+F166, Match Rate 93%) + F170 Adoption KPI 대시보드**:
- ✅ F164: 5-레이어 커스터마이징 범위 정의서 + 3-Tier 옵션 매트릭스 + 플러그인 시스템 아키텍처 (12 타입)
- ✅ F165: AI 코드 가이드라인 + AuditLogService (3 API endpoints) + D1 0029
- ✅ F166: 데이터 거버넌스 정책 + PiiMaskerService (6종 PII 패턴, 4종 전략) + Hono 미들웨어 + D1 0030
- ✅ F166: KT DS 보안 체크리스트 (SC-01~SC-32)
- ✅ prompt-gateway 감사 로그 연동 (마스킹 시 자동 기록)
- ✅ PRD v8 Conditional 선결 조건 4/5 해소 (#3 커스터마이징 + #5 법적/윤리)
- ✅ F170: Adoption KPI 대시보드 — 팀 온보딩 현황 API + Analytics 페이지 UI + AX BD팀 6명 시드 데이터
- ✅ D1 마이그레이션 0029~0030 프로덕션 적용 완료

**검증 결과**:
- ✅ typecheck 0 error / API 999/999 / Web 64/64 / CI green / 프로덕션 200 OK

---

### 세션 #95 (2026-03-22)

**랜딩 페이지 전면 리디자인 + 가독성 점검 — PRD v8 정체성 반영**:
- ✅ Hero: "AI 에이전트가 일하는 방식을 설계하다" (PRD v8 태그라인)
- ✅ 새 섹션: Process (사업기회→데모 4단계), Agents (6종 전문 에이전트 그리드)
- ✅ 수치 최신화: 163 endpoints, 76 services, 1,160+ tests, 6 AI Agents, 46 sprints
- ✅ Navbar/Footer: 네비 링크 재구성, Sprint 46 · Phase 5 표기
- ✅ E2E + 사이트 전체 브랜딩 동기화 (layout, login, getting-started)
- ✅ API tsconfig azure.ts exclude — CI typecheck 실패 해소
- ✅ AXIS 시맨틱 컬러 7색 정의 (globals.css) — Tailwind v4 마이그레이션 누락 해소
- ✅ shadcn HSL 컬러 hsl() 래핑 — text-muted-foreground 텍스트 계층 복구
- ✅ WCAG 대비율 검증: H1 18.3:1 AAA, muted-fg 8.5:1 AAA, axis-primary 6.5:1 AA

**검증 결과**:
- ✅ typecheck 0 error / Web 64 tests / CI 전체 green / 프로덕션 배포 완료

---

### 세션 #93 (2026-03-22)

**Sprint 45 — KPI 자동 수집 인프라 (F158~F161, Match Rate 97%)**:
- ✅ F158 웹 페이지뷰 자동 추적: useKpiTracker 훅 (usePathname + 300ms throttle + fire-and-forget)
- ✅ F159 CLI 호출 자동 KPI 로깅: KpiReporter (AbortController 3s + --no-telemetry 옵트아웃)
- ✅ F160 KPI Cron 집계: kpi_snapshots D1 0028 + generateDailySnapshot() K7/K8/K11/K1
- ✅ F161 대시보드 실데이터 연결: GET /kpi/snapshot-trend + api-client getKpiSnapshotTrend()
- ✅ 2-Worker Agent Team (5m 0s), File Guard 0건, 테스트 +18 (API 961, CLI 131, Web 68)

**검증 결과**:
- ✅ typecheck 0 error / API 961 tests / CLI 131 tests / Web 68 tests / PDCA 전 주기 완료

---

### 세션 #92 (2026-03-22)

**전체 프로젝트 Gap 분석 — PRD v5 + Agent Evolution PRD ↔ SPEC ↔ 코드 3-way 점검 (Match Rate 92%)**:
- ✅ CLAUDE.md stale 수치 drift 수정: API 583→953, Web 48→64, Phase 4 진행중→완료, D1 20→27
- ✅ 3-way Gap 분석: F-item 171/173 (99%), G-item 9/12 (75%), Agent Evo 21/21 (100%)
- ✅ 문서 drift 8건 식별 및 즉시 수정: SPEC Sprint 43→44, PRD Phase 3/4 상태, Q1/Q4/Q10, Agent Evo PRD
- ✅ D1 remote 검증: 0024~0027 전체 적용 확인 → SPEC §2 보정
- ✅ 분석 문서: docs/03-analysis/features/full-project-gap.analysis.md
- ✅ 완료 보고서: docs/04-report/features/full-project-gap.report.md

**검증 결과**:
- ✅ 문서/거버넌스 Sprint — 코드 변경 없음, drift 수정 + 분석/보고 전용

### 세션 #78 (2026-03-22)

**Sprint 32 — PRD v5 완전성 점검 + Phase 4→5 전환 로드맵 (F156/F157)**:
- ✅ PRD v5 G1~G12 갭 항목 매핑: 9건 완료, 1건 진행(G10 온보딩), 2건 수요 대기(G2/G5)
- ✅ Phase 3 산출물 11/11 완료 검증, Phase 4 산출물 11/12 완료 검증
- ✅ Phase 5 미착수 F-item Layer 1~4 분류: 즉시(Track B) → Go 후(Track A P0) → 보조(SR+P1) → 장기(P2+수요)
- ✅ 온보딩 4주 추적 계획: W1~W4 활동 + K7/K8/K9/K12 측정 방법 구체화
- ✅ Phase 4 최종 Go/Pivot/Kill 판정 기준 수치화
- ✅ SPEC.md v5.14: §2/§3/§5(F156/F157) + §6 Execution Plan + §9 변경이력

**검증 결과**:
- ✅ 거버넌스 Sprint — 코드 변경 없음, 문서/로드맵 전용

### 세션 #76 (2026-03-22)

> **버전 정책 전환 (F134)**: 이후 패키지별 Independent SemVer 적용

**F134 프로젝트 버전 관리 점검 — SemVer 원칙 조사 + 현행 체계 개선 (Match Rate 96%)**:
- ✅ 온라인 SemVer 2.0 / ZeroVer / 모노리포 버전 전략 조사
- ✅ package.json 4개 Independent SemVer 리셋: cli 0.5.0, api/web/shared 0.1.0
- ✅ SPEC.md: system-version→Sprint 31, §10 버전 정책 섹션 신설
- ✅ CLAUDE.md: Sprint 형식 전환, v2.5 제거
- ✅ 1.0.0 전환 기준 명문화: 외부 사용자 + API 안정성 선언
- ✅ PDCA 전주기 완료: Plan→Design→Do→Check(96%)→Report→Archive

**검증 결과**:
- ✅ typecheck 5/5 / build 4/4 / pnpm install --frozen-lockfile ✅
- ✅ 코드 로직 변경 0건 (메타데이터만)

### 세션 #75 (2026-03-22)
**프로젝트 정합성 점검 + PDCA 문서 배치 아카이브**:
- ✅ SPEC drift 보정: system-version 2.4.0→2.5, D1 32→33테이블(0020), Sprint 31 반영
- ✅ .gitignore: .wrangler/, .vercel/ 빌드 아티팩트 제외 추가
- ✅ sprint-26 문서 삭제 정리 (archive 이동 완료 확인)
- ✅ PDCA 배치 아카이브: 18 Sprint + 5 standalone → docs/archive/ (98파일 이동)
- ✅ bkit memory currentFeature 보정: sprint-30 → sprint-31
- ✅ CLAUDE.md D1 33테이블 + archive 설명 갱신

**검증 결과**:
- ✅ typecheck 4/4 (0 에러) / API 583/583 / Web 48/48

### 세션 #71 (2026-03-21)
**Sprint 29: 실사용자 온보딩 기반 — 가이드 UI + 피드백 시스템 + 체크리스트 (Match Rate 93%)**:
- ✅ F120 온보딩 가이드 UI: /getting-started 페이지 (기능카드 5개 + 3단계 체크리스트 + FAQ 5항목 + NPS 폼)
- ✅ F121 피드백 수집: POST/GET /feedback API + D1 onboarding_feedback + /analytics NPS 위젯
- ✅ F122 온보딩 체크리스트: GET/PATCH /onboarding/progress + D1 onboarding_progress + KpiLogger 연동
- ✅ D1 migration 0019 (2 tables), +4 endpoints, +2 services, +16 API tests
- ✅ SPEC drift 보정: Sprint 27 F99/F100/F101 📋→✅, Sprint 25~28 Execution Plan 추가
- ✅ 사이드바 "시작하기" nav item 추가, shadcn Accordion 컴포넌트

**검증 결과**:
- ✅ typecheck 5/5 (0 에러) / API 566/566 / Web 48/48

### 세션 #69 (2026-03-21)
**Sprint 27: Phase 3-B 기술 기반 완성 — KPI 인프라 + Reconciliation + Hook 자동수정 (Match Rate 94%)**:
- ✅ F100 KPI 측정 인프라: KpiLogger 서비스 5 메서드 + 4 endpoints (track/summary/trends/events) + Analytics 대시보드 페이지
- ✅ F99 Git↔D1 Reconciliation: ReconciliationService + Cron Trigger 6h + 3 endpoints (run/status/history) + scheduled handler
- ✅ F101 Hook 자동수정: AutoFixService (max 2회 재시도 + 50줄 diff 제한) + AgentInbox escalation + AgentOrchestrator 통합
- ✅ D1 migration 0018: kpi_events + reconciliation_runs 테이블 + agent_tasks 컬럼 3개
- ✅ Agent Teams 2-Worker 병렬: W1(F100 KPI) 2m + W2(F99+F101) 2m30s, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan(FX-PLAN-028) → Design(FX-DSGN-028) → Do → Check(94%) → Report(FX-RPRT-028)
- ✅ PRD v5 MVP 기준 5/6 해소 (KPI K7/K8 + G1 Reconciliation + G7 AutoFix)

**신규 산출물**:
- 신규 파일: 11개 (kpi-logger.ts, kpi schema/route, reconciliation service/schema/route, auto-fix.ts, scheduled.ts, migration 0018, analytics/page.tsx)
- 수정 파일: 6개 (agent-orchestrator.ts, sse-manager.ts, index.ts, app.ts, sidebar.tsx, api-client.ts)
- 신규 API endpoints: 7개 (KPI 4 + Reconciliation 3), 총 104개

**검증 결과**:
- ✅ API 535/535 pass
- ✅ typecheck API + Web 0 errors
- ✅ Workers Cron Trigger 설정 완료

---

### 세션 #68 (2026-03-21)
**Sprint 26: Phase 4 통합 — 프론트엔드 + SSO + API BFF + D1 스키마 (Match Rate 94%)**:
- ✅ F108 SSO 인증 통합: JWT Hub Token (services[] 클레임) + org_services 테이블 + 4 endpoints (token, verify, services GET/PUT)
- ✅ F109 API BFF 프록시: Service Bindings 설정 + /api/dx/*, /api/aif/* 프록시 라우트 + Hub Token 검증 미들웨어
- ✅ F106 프론트엔드 통합: ServiceContainer iframe + postMessage SSO 토큰 전달 + discovery/, foundry/ 서브 라우트 + Sidebar 서비스 네비게이션
- ✅ F111 D1 스키마 통합: service_entities + entity_links 메타데이터 테이블 + EntityRegistry + EntitySyncService + 5 entities API endpoints
- ✅ D1 migration 0017: 3 테이블 (org_services, service_entities, entity_links) + 인덱스 4개
- ✅ Agent Teams 2-Worker 병렬 실행: W1(SSO+BFF) 2m45s + W2(Frontend+Data) 2m15s, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan(FX-PLAN-027) → Design(FX-DSGN-027) → Do → Check(94%) → Report(FX-RPRT-027)
- ✅ 무 반복 첫 통과: 5개 partial item (all Low-Medium priority, scope 관리 성공)

**신규 산출물**:
- 신규 파일: 14개 (sso.ts, sso-routes.ts, service-proxy.ts, proxy-routes.ts, ServiceContainer.tsx, discovery/page, foundry/page, entity-registry.ts, entity-sync.ts, entities-routes.ts + 3 schemas)
- 수정 파일: 9개 (auth.ts, env.ts, app.ts, wrangler.toml, sidebar.tsx, api-client.ts + 테스트 헬퍼)
- 신규 API endpoints: 11개 (SSO 4 + BFF 2 + Entities 5)

**검증 결과**:
- ✅ API 535/535 pass (신규 +11 endpoints)
- ✅ Web 48/48 pass (신규 +3 E2E: service-integration.spec.ts)
- ✅ typecheck 5/5 clean / Lint 0 warnings
- ✅ D1 migration 0017 remote 적용 완료 (총 30 테이블)

---

### 세션 #67 (2026-03-20)
**Sprint 25: 기술 스택 점검 + AXIS DS UI 전환 (Match Rate 97%)**:
- ✅ F98 기술 스택 감사: 3개 서비스 호환성 매트릭스 + Kill 조건 Go 판정 (Cloudflare 완전 호환)
- ✅ F104 AXIS DS 전환: @axis-ds/ui-react 11 컴포넌트 + 테마 시스템 + 토큰 표준화 + @base-ui/react 제거
- ✅ 의존성 최적화: @base-ui/react, next-themes 제거 (-2) + @axis-ds/* 추가 (+3)
- ✅ PDCA: Plan(FX-PLAN-026) → Design → Do(1m30s) → Check(97%) → Report(FX-RPRT-026)
- ✅ Agent Teams 2-Worker: CSS/테마 + 컴포넌트 병렬, File Guard 0 이탈

**검증 결과**:
- ✅ API 535/535, Web 48/48, typecheck 5/5 clean
- ✅ v2.0.0 workers 배포 완료

---

### 세션 #57 (2026-03-19)
**F93 GitHub 양방향 동기화 고도화 — Sprint 21 PDCA 전주기 완료 (Match Rate 93%)**:
- ✅ Issue→Task 자동 생성: `foundry-x` 라벨 옵트인 + 라벨→taskType/agent 자동 매핑
- ✅ 외부 PR AI 리뷰 API: POST/GET /github/pr/:prNumber/review (5분 쿨다운)
- ✅ PR 코멘트 인터랙션: @foundry-x review/status/approve/help
- ✅ 리뷰 결과 자동 포스팅: GitHub Review + score 기반 라벨링 (sdd/quality/security)
- ✅ Webhook org 라우팅: org별 webhook secret 매핑 + 글로벌 폴백
- ✅ Agent Teams 병렬 구현: Worker 2명, File Guard 이탈 0건
- ✅ PDCA 전주기: Plan → Design → Do → Check(93%) → Report

**검증 결과**:
- ✅ 435/435 테스트 (신규 +69건), typecheck 5/5, 신규 5파일 + 수정 6파일

### 세션 #56 (2026-03-19)
**Sprint 20: F92 멀티테넌시 고도화 — PDCA 전주기 완료 (Match Rate 90%)**:
- ✅ Org CRUD API 12 endpoints (POST/GET/PATCH /orgs, members CRUD, invitations, switch-org, accept)
- ✅ roleGuard 미들웨어 + OrgService (CRUD + 멤버 + 초대/수락 플로우)
- ✅ D1 migration 0013: org_invitations 테이블 + 인덱스 3개
- ✅ Web UI: OrgSwitcher 드롭다운 + Org 설정 + 멤버 관리 페이지 + api-client 12 함수
- ✅ Shared types: Organization, OrgMember, OrgInvitation, OrgRole, ORG_ROLE_HIERARCHY
- ✅ 테스트: API 399 (기존 366 + 신규 33) + Web 48 (기존 45 + 신규 3) = 447 tests
- ✅ Typecheck: 5/5 패키지 clean
- ✅ D1 0013 remote 적용 완료
- ✅ PDCA: Plan(FX-PLAN-023) → Design(FX-DSGN-021) → Do → Check(68%→90%) → Report(FX-RPRT-022)

**검증 결과**:
- ✅ typecheck 5/5 / API 399 pass / Web 48 pass

---

### 세션 #53 (2026-03-19)
**ax 스킬 카테고리 리네임 + ax-req-integrity 신규 스킬**:
- ✅ ax 스킬 16개 번호체계→카테고리체계 리네임 (ax-session-*, ax-req-*, ax-code-*, ax-git-*, ax-gov-*, ax-infra-*)
- ✅ ax-req-integrity 신규 — SPEC↔GitHub↔ExPlan 3-way 정합성 검증 (check/fix/report)
- ✅ F91 GitHub Issue #98 생성 + Org Project 등록
- ✅ SPEC §2 인프라 수치 추가 (endpoints 61, services 29, D1 24, Workers/Pages)
- ✅ MEMORY.md Workers v1.5.0→v1.6.0 + API tests 313→366 보정
- ✅ ax-config push: 30 files → Sinclair-Seo/ax-config.git

---

## v1.6.0 릴리스 (2026-03-19)
**Sprint 18: 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동**
- ✅ F83: organizations + org_members 테이블 + tenantGuard 미들웨어 + JWT orgId 확장 (D1 migration 0011~0012)
- ✅ F84: GitHubSyncService — Issues/PR 양방향 동기화 + webhook 확장 + 17 tests
- ✅ F85: SlackService — Block Kit 알림 + /foundry-x 슬래시 커맨드 + SSE→Slack 브릿지 + 12 tests
- ✅ F86: D1 0001~0012 remote 전부 적용 + Workers v1.6.0 배포 완료
- ✅ PDCA 전주기 완료 (Match Rate 93%, FX-RPRT-020)
- ✅ 342 API tests 통과, typecheck 5/5
- ✅ SPEC 소급 등록 — squash merge(#89) 유실 복구, SPEC v4.7

---

## v1.5.0 릴리스 (2026-03-19)
**Sprint 17: AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합**
- ✅ F80: McpRegistry.createServerPreset() AI Foundry 프리셋 + ProposedStep.externalTool 타입
- ✅ F81: inbox 스레드 라우트 GET /:parentMessageId/thread + AgentInboxPanel 스레드 UI (groupByThread + flat/threaded 토글)
- ✅ F82: createPlanAndWait() 폴링 승인 대기 + executePlan() executing→completed/failed 라이프사이클
- ✅ F82: PlanTimeoutError/PlanRejectedError/PlanCancelledError 에러 클래스
- ✅ F82: SSEEvent 4종 (waiting/executing/completed/failed) + Plan API 2 endpoints (get/execute)
- ✅ F82: D1 migration 0010 (agent_plans execution_* 5컬럼)
- ✅ PDCA 전주기 완료 (Match Rate 98%, FX-RPRT-019)
- ✅ 313 API tests 통과, typecheck 5/5

---

## v1.4.0 릴리스 (2026-03-18)
**Sprint 16: PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포**
- ✅ F75: PlannerAgent Mock→Claude API 전환 — analyzeCodebase() + 3단계 폴백 + 6 신규 테스트
- ✅ F76: AgentInboxPanel.tsx 신규 161 LOC + AgentPlanCard shared import + api-client 6함수 + Plans/Inbox 탭
- ✅ F77: D1 migration 0009 remote 확인 (22 테이블) + CI/CD deploy 성공 + v1.4.0 bump
- ✅ Agent Teams 병렬 실행 (W1: F75 backend, W2: F76 frontend)
- ✅ PDCA 전주기 완료 (Match Rate 91%, FX-RPRT-018)
- ✅ 313 API tests 통과, typecheck 5/5

---

## v1.3.0 릴리스 (2026-03-18)
**Sprint 15: PlannerAgent + AgentInbox + WorktreeManager**
- ✅ D1 migration 0009 remote 적용 (agent_plans + agent_messages + agent_worktrees)
- ✅ Workers 재배포 (v1.3.0 코드, 57 endpoints)
- ✅ Pages 재배포 (fx.minu.best)
- ✅ version bump 1.2.0 → 1.3.0 (5 packages)
- ✅ SPEC system-version 1.3.0 + F69 DONE
- ✅ git tag v1.3.0

---

## 세션 42 (2026-03-18)
**Sprint 15 PDCA 전주기 — F70 PlannerAgent + F71 Agent Inbox + F72 git worktree (v1.3.0, Match Rate 92%)**:
- ✅ SPEC 보정: Sprint 14 §6 체크박스 + v1.2.0 마일스톤 + frontmatter 동기화
- ✅ FX-PLAN-016: Sprint 15 Plan 작성 (F70~F73 4개 F-item)
- ✅ FX-DSGN-016: Sprint 15 Design 작성 (서비스 설계 + API + 테스트 계획)
- ✅ shared/agent.ts: +6 타입 (AgentPlan, AgentMessage, WorktreeInfo + SSE 데이터)
- ✅ D1 migration 0009: agent_plans + agent_messages + agent_worktrees 3 테이블
- ✅ planner-agent.ts: PlannerAgent 서비스 6 메서드 + 상태 머신 7 상태
- ✅ agent-inbox.ts: AgentInbox 4 메서드 + inbox route 3 endpoints
- ✅ worktree-manager.ts: gitExecutor DI + D1 영속 + async 확장
- ✅ agent-orchestrator.ts: +5 메서드 (setPlannerAgent, createPlanAndWait, executePlan, setWorktreeManager, executeTaskIsolated)
- ✅ sse-manager.ts: +4 SSE 이벤트 (plan.created/approved/rejected, message.received)
- ✅ Agent Teams 시도 (W1+W2) → API overloaded → Leader 직접 구현
- ✅ Gap Analysis: 82% → Act 1회 → 92%
- ✅ FX-RPRT-017: Sprint 15 완료 보고서

**검증 결과**:
- ✅ typecheck 0 errors / API 307 tests pass / +29 신규 테스트

---

## 세션 41 (2026-03-18)
**F73 제품 포지셔닝 재점검 — 기존 서비스 연동 계획 + 정체성 재정립 (P0, DONE)**:
- ✅ F73 등록: /ax-10-req new → SPEC.md + GitHub Issue #63 + Project 동기화
- ✅ Discovery-X / AXIS Design System / AI Foundry 3개 리포 GitHub API 분석
- ✅ FX-RESEARCH-014 검토 반영 (open-swe + ClawTeam 패턴)
- ✅ Sprint 15 Plan (FX-PLAN-016) §5 F73 전용 섹션 추가 — 서비스 프로파일, 관계 모델, 연동 경로 3건(C1/C2/C3), 정체성 재정립
- ✅ 제품 정체성 재정립: "소프트웨어 팀의 AI 에이전트 통제 레이어"
- ✅ F73 DONE 전환: SPEC.md ✅ + Issue #63 closed + Project Done
- ✅ SPEC v3.5: F73 등록 + Execution Plan 체크박스 3건 완료

**검증 결과**: CLAUDE.md currency ✅, Migration drift ⏭️ (D1 미사용)

---

## 세션 39 (2026-03-18)
**F69 v1.2.0 릴리스 + Phase 3 기반 문서**:
- ✅ CHANGELOG [1.2.0] 릴리스 섹션 작성 (F67 MCP Resources + F68 Merge Queue + F69 릴리스)
- ✅ Version bump: cli 1.0.0→1.2.0, api/web/shared 1.1.0→1.2.0
- ✅ multitenancy.design.md (FX-DSGN-016) — Phase 3 멀티테넌시 설계 (W1 Agent)
- ✅ phase-3-roadmap.md (FX-PLAN-016) — Phase 3 로드맵 Sprint 15~20 (W2 Agent)
- ✅ SPEC v3.3: §3 v1.2.0✅ + §5 F69✅ + §6 Sprint 14 체크박스 전체 보정
- ✅ git tag v1.2.0 (annotated)
- ✅ Agent Teams: W1(멀티테넌시설계) + W2(Phase3로드맵) 병렬 (파일 충돌 0, 범위 이탈 2건 정리)

**검증 결과**: CLAUDE.md currency ✅, Migration drift ✅

---

## [1.2.0] - 2026-03-18

### Summary
**Sprint 14 완료** — MCP Resources 리소스 발견·읽기·구독(F67, 92%) + 멀티 에이전트 동시 PR Merge Queue(F68, 92.5%) + v1.2.0 릴리스(F69). Overall Match Rate 92%. Agent Teams 병렬 구현 (W1 MCP Resources, W2 Merge Queue, 파일 충돌 0). 전체 429 tests (API 278 + CLI 106 + Web 45) + 20 E2E. 50 endpoints + 15 D1 tables + 19 services.

### Added
- **F67 MCP Resources + Notifications** (Match Rate 92%)
  - McpResourcesClient — listResources, readResource, subscribeResource, unsubscribeResource, listResourceTemplates
  - McpRunner 확장 — listResources 실제 구현 + readResource + listResourceTemplates + onNotification
  - McpTransport — SseTransport notification 분기 처리
  - MCP API 4 endpoints: GET /mcp/servers/:id/resources, GET /mcp/servers/:id/resources/templates, POST /mcp/servers/:id/resources/read, POST /mcp/servers/:id/resources/subscribe
  - McpResourcesPanel.tsx + ResourceViewer.tsx — Resources 브라우저 UI
  - SSE mcp.resource.updated 이벤트 추가
  - shared/agent.ts: McpResource, McpResourceTemplate, McpResourceContent, McpResourceSubscription 타입
  - 테스트 15건: mcp-resources 8 + mcp-runner 4 + mcp-routes-resources 3

- **F68 멀티 에이전트 동시 PR + 충돌 해결** (Match Rate 92.5%)
  - MergeQueueService — enqueue, detectConflicts, calculateMergeOrder, processNext, getQueueStatus, updatePriority
  - AgentOrchestrator 확장 — executeParallel + executeParallelWithPr (Promise.allSettled 병렬 실행)
  - GitHubService 확장 — getModifiedFiles, updateBranch (rebase), getPrStatuses 3 메서드
  - Agent API 5 endpoints: POST /agents/parallel, GET /agents/parallel/:id, GET /agents/queue, PATCH /agents/queue/:id/priority, POST /agents/queue/process
  - D1 migration 0008: merge_queue + parallel_executions 테이블
  - MergeQueuePanel.tsx + ConflictDiagram.tsx + ParallelExecutionForm.tsx — Merge Queue UI
  - SSE agent.queue.* 4 이벤트 (updated, conflict, merged, rebase)
  - shared/agent.ts: MergeQueueEntry, ConflictReport, ConflictPair, ParallelExecution, ParallelExecutionResult, ParallelPrResult, SSE 이벤트 타입
  - 테스트 25건: merge-queue 10 + orchestrator-parallel 6 + github-extended 4 + routes-queue 5

- **F69 v1.2.0 릴리스 + Phase 3 기반**
  - multitenancy.design.md — Phase 3 멀티테넌시 설계 (FX-DSGN-016)
  - phase-3-roadmap.md — Phase 3 로드맵 Sprint 15~20 (FX-PLAN-016)
  - CHANGELOG v1.2.0 + version bump (1.1.0 → 1.2.0)
  - SPEC v3.3 갱신 (Sprint 14 Execution Plan 보정 + F69 완료)

### Changed
- McpRunner: listResources() 스텁 → 실제 구현 + readResource + subscribeResource + onNotification
- McpTransport (SseTransport): notification 메시지 분기 처리
- AgentOrchestrator: setMergeQueue() + executeParallel() + executeParallelWithPr()
- GitHubService: 3 메서드 추가 (기존 읽기/쓰기 → merge queue 지원)
- SSEManager: 5 신규 이벤트 (mcp.resource.updated + agent.queue.* 4종)

### Technical Details
- MCP Resources: notification 기반 자동 갱신, mimeType 기반 렌더링 (JSON/text/image/binary)
- Merge Queue: greedy merge order 알고리즘 (충돌 없는 PR 우선 → priority → 생성 시간)
- Parallel Execution: Promise.allSettled 기반 (일부 실패 시 나머지 유지)
- Rebase 전략: GitHub updateBranch API (server-side rebase) 시도 → 실패 시 conflict 상태

### PDCA Documents
- FX-PLAN-015: Sprint 14 F67/F68/F69 Plan
- FX-DSGN-015: Sprint 14 상세 설계 (MCP Resources + Merge Queue + Phase 3)
- FX-ANLS-014: Sprint 14 Gap Analysis (F67 92%, F68 92.5%, Overall 92%)
- FX-RPRT-016: Sprint 14 Completion Report
- FX-DSGN-016: Phase 3 멀티테넌시 설계 (Draft)
- FX-PLAN-016: Phase 3 로드맵 (Draft)

---

## 세션 38 (2026-03-18)
**Sprint 14 PDCA 완료 — MCP Resources + 멀티 에이전트 동시 PR (v1.2.0)**:
- ✅ F67 MCP Resources (92%): McpResourcesClient + McpRunner resources 실 구현 + notification 수신 + 4 API endpoints + Resources 브라우저 + 15 tests
- ✅ F68 멀티 에이전트 동시 PR (92.5%): MergeQueueService + executeParallel + 파일 충돌 감지 + rebase 자동 시도 + 5 API endpoints + Queue/Conflict/Parallel UI + SSE 실시간 + 25 tests
- ✅ Agent Teams: Do(W1 MCP + W2 Queue) + Check(W1 F67 Gap + W2 F68 Gap) 4회 병렬 (충돌 0)
- ✅ 429 total tests (API 278 + CLI 106 + Web 45), +41 from Sprint 13
- ✅ 50 API endpoints (+9), 15 D1 tables (+2), 13 SSE events (+5), 23 Web components (+5)
- ✅ PDCA Match Rate 92%, Iteration 1회 (Must Fix 3건: agents/page 탭 + SSE 연동 + autoResolvable)

**검증 결과**: typecheck ✅ 5/5, tests 429/429 ✅

---

## 세션 37 (2026-03-18)
**Sprint 13 PDCA 완료 — MCP Sampling/Prompts + 에이전트 자동 PR**:
- ✅ F64 MCP Sampling/Prompts (91%): McpSamplingHandler + McpPromptsClient + 4 API endpoints + McpPromptsPanel + 15 tests
- ✅ F65 에이전트 자동 PR (93%): PrPipelineService + ReviewerAgent + GitHubService 확장 + 7-gate auto-merge + 4 API endpoints + 37 tests
- ✅ Agent Teams W1/W2 병렬 구현 (파일 충돌 0)
- ✅ 388 total tests (API 237 + CLI 106 + Web 45), +34 from Sprint 12
- ✅ 41 API endpoints (v0.12.0 33 + Sprint 13 8)
- ✅ 13 D1 테이블 (v0.12.0 11 + 0007 migration: mcp_sampling_log + agent_prs)
- ✅ PDCA Report FX-RPRT-015 (Match Rate 93%)

---

## 세션 36 (2026-03-18)
**CLAUDE.md 품질 개선 + Sprint 13 계획 커밋**:
- ✅ CLAUDE.md improver: 파일 카운트 수정, Sprint 이력 압축(35줄→8줄), API/Web/E2E 명령 추가, PostgreSQL→D1 수정
- ✅ Sprint 13 미커밋 반영: SPEC v3.0, F64~F66 타입 정의, Plan/Design 문서
- ✅ ax-13-selfcheck 8/8 PASS

---

## [1.1.0] - 2026-03-18

### Summary
**Sprint 13 완료** — MCP Sampling/Prompts 양방향 통합(F64, 91%) + 에이전트 자동 PR 파이프라인(F65, 93%) + v1.1.0 릴리스. Overall Match Rate 93%. Agent Teams 병렬 구현 (W1 MCP, W2 PR, 파일 충돌 0). 전체 388 tests (API 237 + CLI 106 + Web 45) + 22 E2E. 41 endpoints + 13 D1 tables.

### Added
- **F64 MCP Sampling + Prompts** (Match Rate 91%)
  - McpSamplingHandler — sampling/createMessage 처리 + 보안 게이트(모델 화이트리스트, 토큰 한도, rate limit)
  - McpPromptsClient — prompts/list + prompts/get (McpRunner 확장)
  - MCP API 4 endpoints: GET/POST /mcp/servers/:id/prompts, POST /mcp/servers/:id/sampling, GET /mcp/sampling/log
  - McpPromptsPanel.tsx — 프롬프트 브라우저 UI
  - D1 mcp_sampling_log 테이블 (서버별 Sampling 이력)
  - shared/agent.ts: McpPrompt, McpPromptArgument, McpSamplingMessage, McpSamplingLog 타입
  - 테스트 15건: mcp-sampling 6 + mcp-prompts 5 + mcp-routes-prompts 4

- **F65 에이전트 자동 PR 파이프라인** (Match Rate 93%)
  - PrPipelineService — 8-step 오케스트레이션 (record → branch → commit → PR → check → review → merge 판정)
  - ReviewerAgent — LLM 기반 PR diff 분석 + SDD/Quality/Security 점수 계산
  - GitHubService 확장 — 8 메서드 (createBranch, createCommitWithFiles, createPR, getPrDiff, mergePR, createPrReview, getCheckRuns, deleteBranch)
  - Auto-merge 7-gate: CI + SDD≥80 + Quality≥70 + Security=0(critical/high) + Daily Limit + Human Approval(선택) + autoMerge flag
  - Agent PR API 4 endpoints: POST /agents/pr, GET /agents/pr/:id, POST /agents/pr/:id/review, POST /agents/pr/:id/merge
  - AgentPrCard.tsx + PrReviewPanel.tsx + AutoMergeSettings.tsx
  - SSE 4 이벤트: agent.pr.created, reviewed, merged, review_needed
  - D1 agent_prs 테이블 (에이전트 PR 추적)
  - shared/agent.ts: AgentPr, PrReviewResult, PrReviewComment, PrPipelineConfig, SSE event types
  - 테스트 37건: pr-pipeline 8 + reviewer-agent 6 + github-pr 4 + routes 6 (추가)

- **F66 v1.1.0 릴리스 준비**
  - D1 migration 0007 (mcp_sampling_log + agent_prs)
  - SPEC v3.1 갱신 (Sprint 13 F64/F65 등록)
  - CLAUDE.md 현재 상태 갱신 (v1.1.0)
  - E2E 4건 예정 (agent-pr-pipeline + mcp-prompts + workspace tabs + agents page integration)

### Changed
- McpRunner: listPrompts() + getPrompt() 메서드 추가
- GitHubService: PR 작성 기능 추가 (기존 읽기 → 읽기/쓰기)
- SSEManager: agent.pr.* 4 이벤트 타입 확장
- AgentOrchestrator: executeTaskWithPr() 선택 메서드 추가

### Technical Details
- MCP Sampling: in-memory sliding window rate limit (분당 10회), 허용 모델 화이트리스트, maxTokens 상한
- PR Pipeline: octokit 재활용, GitHub Tree API 5-step commit, Squash merge 전략
- ReviewerAgent: JSON 기반 structured output + clamp(0, 100) 점수 정규화
- Branch naming: agent/{agentId}/{taskType}-{timestamp}

### PDCA Documents
- FX-PLAN-014: Sprint 13 F64/F65/F66 Plan
- FX-DSGN-014: Sprint 13 상세 설계 (MCP + PR Pipeline)
- FX-ANLS-013: Sprint 13 Gap Analysis (F64 91%, F65 93%, Overall 93%)
- FX-RPRT-015: Sprint 13 Completion Report

---

## [0.12.0] - 2026-03-18

### Summary
**Sprint 12 완료** — ouroboros 패턴(F59, 100%) + Generative UI(F60, 95%) + MCP 실 구현(F61, 95%) + 테스트 보강(F63, 85%). Overall Match Rate ~93%. Agent Teams 병렬 구현 (2 Pane × 2 Workers). 전체 352 tests + 20 E2E.

### Added
- **F59 ouroboros 패턴 차용** (Match Rate 100%)
  - AmbiguityScore 타입 + calculateAmbiguity 유틸 (shared/agent.ts)
  - ambiguity-score.md 기준서 (ax-14-req-interview references)
  - ax-14 Phase 4에 Ambiguity Score 게이트 삽입 (≤0.2 = Green)
  - plan-plus Ontological Question 단계 추가
  - gap-detector Semantic 검증 가이드
- **F60 Generative UI 도입** (Match Rate 95%)
  - UIHint 타입 (layout, sections[], html?, actions[])
  - DynamicRenderer — UIHint 기반 레이아웃 분기
  - SectionRenderer — type별 렌더러 (text/code/diff/chart/diagram/table)
  - WidgetRenderer — sandboxed iframe + ResizeObserver
  - AgentTaskResult 리팩토링 — uiHint 분기 + LegacyRenderer 하위 호환
  - ClaudeApiRunner UIHint 생성 프롬프트 확장
  - generative-ui.test.tsx 11건
- **F61 MCP 실 구현** (Match Rate 95%)
  - SseTransport — fetch+ReadableStream SSE 파싱 (Workers 호환)
  - HttpTransport — 범용 fetch 기반 (fallback)
  - McpRunner — McpAgentRunner 구현 (tools/call + 결과 변환)
  - McpServerRegistry — D1 CRUD + findServerForTool + 도구 캐시
  - 0006_mcp_servers.sql D1 migration
  - routes/mcp.ts 5 endpoints (CRUD + test + tools)
  - schemas/mcp.ts Zod 스키마
  - McpServerCard.tsx 대시보드 UI
  - workspace/page.tsx MCP Servers 탭
  - api-client.ts MCP API 함수 5개
  - mcp-transport.test.ts 12건 + mcp-runner.test.ts 11건 + mcp-registry.test.ts 4건 + mcp-routes.test.ts 5건
- **F63 테스트 커버리지 강화** (Match Rate 85%)
  - mcp-integration.test.ts 5건 (selectRunner + executeTask MCP 통합)
  - service-integration.test.ts 3건 (CRUD lifecycle + findServerForTool)
  - e2e/helpers/sse-helpers.ts (waitForSSEEvent + injectSSECollector)
  - e2e/mcp-server.spec.ts 2건 (등록 폼 + 연결 테스트)

### Changed
- AgentOrchestrator: mcpRegistry 옵셔널 주입 + selectRunner() MCP 자동 선택
- app.ts: MCP 라우트 등록 + OpenAPI "MCP" 태그
- shared/agent.ts: McpServerInfo + McpTestResult + UIHint + SectionType 타입

### PDCA Documents
- FX-PLAN-012: Sprint 12 F59/F60 Plan
- FX-PLAN-013: Sprint 12 Stabilization F61/F62/F63 Plan
- FX-DSGN-013: Sprint 12 Stabilization Design
- FX-ANLS-012: Sprint 12 Stabilization Gap Analysis (F61 95%, F63 85%)
- FX-RPRT-014: Sprint 12 Completion Report (× 2: F59/F60 + F61/F63)

---

### 세션 33~34 (2026-03-18)
**Sprint 12 F59+F60 구현 — ouroboros 패턴 + Generative UI PDCA 전주기**:
- ✅ F59: AmbiguityScore 타입 + calculateAmbiguity + ambiguity-score.md 기준서 + ax-14 Phase 4-B/C
- ✅ F60: UIHint 타입 + ClaudeApiRunner 확장 + WidgetRenderer + SectionRenderer + DynamicRenderer + AgentTaskResult 리팩토링
- ✅ Agent Teams 2회 (sprint12: W1+W2 코드, s12fix: W1+W2 갭 해소) — 파일 충돌 0건
- ✅ 테스트 290→352건 (+62, API 201 + Web 45 + CLI 106), typecheck 5/5
- ✅ PDCA Plan(FX-PLAN-012) + Design(FX-DSGN-013) + Analysis(FX-ANLS-012) + Report(FX-RPRT-014)
- ✅ Match Rate: 초기 68% → Iteration 후 ~90%

**이전: Sprint 12 REQ 등록 — ouroboros 패턴 + Generative UI 리서치**:
- ✅ F59 등록 (FX-REQ-059, P1): ouroboros 패턴 차용 — Ambiguity Score + Socratic 질문법 + 3-stage Evaluation
- ✅ F60 등록 (FX-REQ-060, P1): Generative UI 도입 — CopilotKit useComponent 패턴, sandboxed iframe
- ✅ GitHub Issue #58, #59 생성 + Org Project 동기화
- ✅ SPEC.md v2.7 — Sprint 12 섹션 + Execution Plan 추가

---

## [0.11.0] - 2026-03-18

### Summary
**Sprint 11 완료** — SSE 실시간 이벤트(F55, 95%) + E2E 테스트 고도화(F56, 88%) + 배포 자동화(F57, 100%) + MCP 설계(F58, 91%). Overall Match Rate 93%, 14 신규 API 테스트 + 8 E2E specs (총 290 + 18 E2E).

### Added
- **F55 SSE 이벤트 완성** (Match Rate 95%)
  - SSEManager.pushEvent() — subscribers Pub/Sub + taskId 기반 dedup (60초 TTL)
  - agent.task.started/completed 이벤트 → `event: status` 래핑으로 SSEClient 호환
  - AgentOrchestrator SSEManager 옵셔널 주입 + executeTask() step 3.5/6.5 이벤트 발행
  - agents/page.tsx onStatus/onError 핸들러 + taskStates Map + SSE 연결 인디케이터
  - AgentCard taskStatus prop + running 상태 스피너
  - routes/agent.ts SSEManager 공유 인스턴스 (Workers isolate 싱글턴)
  - shared/agent.ts TaskStartedData/TaskCompletedData/AgentTaskStatus 타입
- **F56 E2E 테스트 고도화** (Match Rate 88%)
  - agent-execute.spec.ts: 에이전트 실행→결과, 비활성화, 에러 E2E 3건
  - conflict-resolution.spec.ts: 충돌 없음, 감지, 해결 E2E 3건
  - sse-lifecycle.spec.ts: SSE 연결 UI, 카드 상태 배지 E2E 2건
  - agent-execute-integration.test.ts: SSE 이벤트 발행 검증 API 통합 5건
  - conflict-resolution-integration.test.ts: generate→detect→resolve 흐름 4건
- **F57 프로덕션 배포 자동화** (Match Rate 100%)
  - wrangler.toml ENVIRONMENT=production var + staging 환경 분리
  - deploy.yml PR→staging 자동 배포 + master→production 자동 배포
  - smoke-test.sh 에이전트 runners + SSE 연결 검증 추가
- **F58 MCP 설계** (Match Rate 91%)
  - mcp-adapter.ts McpMessage/McpResponse 프로토콜 타입 + TASK_TYPE_TO_MCP_TOOL 매핑 상수
  - mcp-protocol.design.md MCP 1.0 프로토콜 연동 설계 문서 (FX-DSGN-012)
  - mcp-adapter.test.ts 매핑+타입 검증 2건

### Changed
- SSEManager: D1 폴링 + pushEvent() 하이브리드 모드 (기존 폴링은 fallback 유지)
- AgentOrchestrator: constructor에 SSEManager 옵셔널 주입 (하위 호환)
- agents/page.tsx: SSE 이벤트 기반 실시간 task 상태 UI (모달 콜백 → SSE 전환)

### PDCA
- Plan: FX-PLAN-011 | Design: FX-DSGN-011 | Analysis: FX-ANLS-011 | Report: FX-RPRT-013
- Agent Teams: W1(SSE Backend) + W2(E2E Tests) + Leader — 파일 충돌 0건
- Gap Analysis: 초기 88% → Iteration 1 → 93%

---

## [0.10.0] - 2026-03-18

### Summary
**Sprint 10 완료** — 프로덕션 실배포(F52, 97%) + 에이전트 실행 엔진(F53, 92%) + NL→Spec 충돌 감지(F54, 94%). Overall Match Rate 93%, 35 신규 테스트 추가 (총 276).

### Added
- **F52 프로덕션 실배포** (Match Rate 97%)
  - Cloudflare Workers secrets 4개 설정 (JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY)
  - D1 migration 0001~0004 remote 적용
  - Workers 배포 완료: https://foundry-x-api.ktds-axbd.workers.dev
  - Pages 배포 완료: https://fx.minu.best (커스텀 도메인)
  - smoke test 전체 통과 (health, auth, spec-generate, SSE)
- **F53 에이전트 실연동** (Match Rate 92%)
  - AgentRunner interface + ClaudeApiRunner 구현 (taskType: code-review, code-generation, spec-analysis, test-generation)
  - createAgentRunner() factory: ANTHROPIC_API_KEY 유무 기반 runner 선택
  - MCP 어댑터 인터페이스 설계 (Sprint 11+ 구현 대비)
  - AgentOrchestrator.executeTask() 메서드 추가
  - 3 API endpoints: POST /agents/{id}/execute, GET /agents/runners, GET /agents/tasks/{taskId}/result
  - D1 migration 0005: agent_tasks 확장 + spec_conflicts 테이블
  - AgentExecuteModal + AgentTaskResult 대시보드 컴포넌트
  - 12 테스트 (ClaudeApiRunner 9 + MockRunner 3)
- **F54 NL→Spec 충돌 감지** (Match Rate 94%)
  - ConflictDetector 2-phase: Phase 1 규칙 기반(제목 유사도, 의존성, 우선순위, 범위) + Phase 2 LLM 보강
  - 4가지 충돌 유형: direct, dependency, priority, scope (severity: critical/warning/info)
  - Jaccard similarity + 불용어 제거 (영어/한국어)
  - 2 API endpoints: POST /spec/conflicts/resolve, GET /spec/existing
  - spec.ts 라우트 확장: POST /spec/generate에 conflicts 필드 추가
  - ConflictCard + ConflictResolver 대시보드 컴포넌트
  - type 한국어화 (직접 충돌, 의존성 충돌, 우선순위 충돌, 범위 충돌)
  - 10 테스트 (detect 5 + overlap 4 + existing 1)
- API 테스트 +35 (241→276), 합계 276 (CLI 106 + API 136 + Web 34)
- D1 테이블 +1 (9→10), API 엔드포인트 +5 (23→28)

### Changed
- OpenAPI info version: 0.9.0 → 0.10.0
- agent_sessions: project_id 컬럼 추가 (multi-project 대비)
- agent_tasks: task_type, result, tokens_used, duration_ms, runner_type 컬럼 추가
- wrangler.toml: 배포 환경 변수 확인 (ENVIRONMENT 추가 예정)

### Deferred to Sprint 11
- SSE agent.task.started/completed 이벤트 전파
- agents/page.tsx SSE task 이벤트 핸들링 (task.started → running 상태 업데이트)
- wrangler.toml ENVIRONMENT var 추가 (Low priority)
- resolve 핸들러 resolved_by userId 기록 (감사 추적용)

---

## [0.9.0] - 2026-03-18

### Summary
**Sprint 9 완료** — 프로덕션 배포 파이프라인(F48, 97%) + Playwright E2E(F49, 92%) + 에이전트 오케스트레이션 기초(F50, 91%) + 옵저버빌리티(F51, 95%). Overall Match Rate 94%.

### Added
- **F48 프로덕션 배포 파이프라인** (Match Rate 97%)
  - deploy.yml: Pages deploy job + smoke-test job 추가 (4-job CI/CD)
  - `scripts/smoke-test.sh`: 배포 후 자동 검증 5 checks (API health, requirements, agents, web landing, dashboard)
  - `docs/guides/deployment-runbook.md`: 8섹션 배포 가이드 (secrets, migration, rollback, troubleshooting)
- **F49 E2E 테스트 인프라** (Match Rate 92%)
  - Playwright config + 5 E2E specs (landing, auth-flow, dashboard, agents, spec-generator)
  - Auth fixture: JWT 기반 인증 테스트 헬퍼
  - API 통합 테스트 4개 (auth-profile, wiki-git, spec-generate, agent-sse)
  - `.github/workflows/e2e.yml`: PR 트리거 E2E CI
- **F50 에이전트 오케스트레이션 기초** (Match Rate 91%)
  - D1 migration 0004: agents, agent_capabilities, agent_constraints, agent_tasks 4테이블
  - 11 seed constraint rules (PRD §7.2-C Always/Ask/Never 기반)
  - AgentOrchestrator service: checkConstraint, listAgents, getCapabilities, createTask, listTasks
  - ConstraintGuard middleware: X-Agent-Id/X-Agent-Action 헤더 기반 제약 검증
  - 4 API endpoints: capabilities, tasks GET/POST, constraints/check
  - 6 orchestration 타입 (shared/agent.ts)
- **F51 옵저버빌리티** (Match Rate 95%)
  - `/health/detailed`: D1/KV/GitHub 인프라 상태 상세 체크
  - Logger service: 구조화 JSON 로깅 (level, message, context, timestamp, requestId)
  - DetailedHealth Zod schema
  - GitHubService.getRateLimit() 추가
- API 테스트 +25 (76→101), 합계 241 (CLI 106 + API 101 + Web 34)
- D1 테이블 +3 (6→9), API 엔드포인트 +4 (19→23)

### Changed
- OpenAPI info version: 0.8.0 → 0.9.0
- CLAUDE.md: Sprint 9 완료 상태 반영

---

## [0.8.0] - 2026-03-18

### Summary
**Sprint 8 완료** — 서비스 레이어 9개 도입(F41, 95%) + SSE D1 폴링(F44, 92%) + NL→Spec LLM 통합(F45, 96%) + Wiki Git 동기화(F46, 94%) + fx.minu.best 프로덕션 사이트(F47, 90%). Overall Match Rate 93%.

### Added
- **F41 API 실데이터 완성** (Match Rate 95%)
  - `services/` 디렉토리 신설: 9개 서비스 클래스 (github, kv-cache, spec-parser, health-calc, integrity-checker, freshness-checker, sse-manager, llm, wiki-sync)
  - requirements/health/integrity/freshness 라우트 → 서비스 호출 + mock fallback 패턴
  - env.ts: CACHE(KV), AI(Workers AI), ANTHROPIC_API_KEY, WEBHOOK_SECRET 바인딩
- **F44 SSE 실시간 통신** (Match Rate 92%)
  - SSEManager: D1 agent_sessions 폴링, 3 이벤트 타입 (activity/status/error)
  - Web SSEClient: auto-reconnect, disposed guard
- **F45 NL→Spec 변환** (Match Rate 96%)
  - LLMService: Workers AI (Llama 3.1) + Claude fallback
  - `POST /api/spec/generate` + schemas/spec.ts
  - Web spec-generator 페이지: 입력 폼 + 결과 미리보기 + 클립보드 복사
- **F46 Wiki Git 동기화** (Match Rate 94%)
  - WikiSyncService: pushToGit + pullFromGit
  - Webhook 라우트: HMAC-SHA256 검증 + master branch 필터
  - wiki.ts waitUntil Git push 통합
- **F47 Production Site Design** (Match Rate 90%)
  - Next.js Route Groups: `(landing)/` + `(app)/` 레이아웃 분리
  - 랜딩 페이지 6섹션: Hero, Features, How It Works, Testimonials, Pricing, CTA
  - Digital Forge 디자인: Syne + Plus Jakarta Sans + JetBrains Mono, amber 액센트
  - Navbar (스크롤 반응형 + 모바일 드로어) + Footer (3컬럼)
  - Cloudflare Pages wrangler.toml + _redirects 프록시
- D1 마이그레이션: wiki_pages slug UNIQUE index, agent_sessions progress 컬럼
- API 테스트 +33 (43→76), Web 테스트 +7 (27→34), 합계 216

### Changed
- Dashboard 경로: `/` → `/dashboard` (Route Groups 분리)
- Sidebar 로고: `span` → `Link href="/dashboard"`
- API 서비스 패턴: 라우트 인라인 로직 → 서비스 계층 DI

### Fixed (세션 #25 코드 리뷰)
- Webhook: 더블 바디 소비 수정 (ReadableStream 한 번만 읽기)
- SSEManager: safeEnqueue 가드로 타이머 누수 및 enqueue-after-close 방지
- requirements: GET에서 statusOverrides 적용 (PUT no-op 문제)
- LLMService: Claude model ID 수정 (claude-haiku-4-5-20250714)
- WikiSyncService: slug 경로 순회 방지 ([\w-]+ 검증)
- KVCacheService: JSON.parse 실패 시 null 반환 (cache miss fallback)
- spec route: 생성자 dead try/catch 제거

---

## [0.7.0] - 2026-03-17

### Summary
**Sprint 7 완료** — OpenAPI 3.1 전환(F38, 98%) + D1 실데이터 연동(F41, 72%) + shadcn/ui(F42, 95%) + 테스트 강화(F43, 90%). Agent Teams 병렬 실행. Overall Match Rate 89%.

### Added
- **F38 OpenAPI 전환** (Match Rate 98%)
  - OpenAPIHono + createRoute: 9개 라우트 17 endpoints 전환
  - Zod 스키마 10파일 21개 (`packages/api/src/schemas/`)
  - `app.doc("/api/openapi.json")` 자동 스펙 생성
  - validationHook: Zod 에러 → `{ error: "message" }` 정규화

- **F41 D1 실데이터 연동** (Match Rate 72%)
  - auth/wiki/token/agent 라우트 D1 전환
  - data-reader.ts 제거, env.ts 추가
  - requirements는 mock 유지 (Sprint 8 잔여)

- **F42 shadcn/ui 디자인 시스템** (Match Rate 95%)
  - shadcn/ui 9개 컴포넌트, 다크모드, 반응형 사이드바
  - globals.css + theme-provider + theme-toggle

- **F43 테스트 스위트 강화** (Match Rate 90%)
  - D1 mock 인프라 (better-sqlite3 MockD1Database shim)
  - auth.test.ts (8), middleware.test.ts (7) 신규
  - Web 컴포넌트 테스트 21개로 확장

- **D1 프로덕션 배포 검증** (Session 19)
  - D1 `foundry-x-db` 생성 (APAC/ICN)
  - Workers 배포: `https://foundry-x-api.ktds-axbd.workers.dev`

### Changed
- deploy.yml: deploy-web 잡 제거 (Pages 토큰 권한 미확보, 나중에 재추가)
- 176/176 테스트 pass (CLI 106 + API 43 + Web 27)
- CHANGELOG.md 통합: 세션 기반 + 릴리스 기반 → 릴리스 단위 통합본

### Notes
- PDCA: Agent Teams(W1:API + W2:Web) 병렬, 1회 iteration (76%→89%)
- SPEC.md v1.8→v1.9: Sprint 7 완료 + Sprint 8 계획

---

## [0.6.0] - 2026-03-17

### Summary
**Phase 2 Sprint 6 완료** — Cloudflare 인프라 기반 구축 (F37 배포 + F39 D1 스키마 + F40 JWT 인증 + RBAC). F38 OpenAPI는 복잡도 증가로 Sprint 7 이관. 전체 Match Rate 84% (F37+F39+F40 범위 96%).

### Added
- **Cloudflare Workers 배포 파이프라인** (F37, 92%)
  - `wrangler.toml` — D1 바인딩 + env 설정
  - `.github/workflows/deploy.yml` — CI/CD (typecheck/lint/test/deploy)
  - `src/index.ts` — Workers entry point (`export default app`)
  - Hono + Workers 네이티브 지원

- **D1 데이터베이스** (F39, 97%)
  - `src/db/schema.ts` — Drizzle ORM 스키마 (6 테이블)
    - `users` (인증 + RBAC), `projects` (Git 리포 연결)
    - `wiki_pages` (Wiki CRUD), `token_usage` (AI 비용 추적)
    - `agent_sessions` (에이전트 작업), `refresh_tokens` (JWT 회전)
  - `src/db/migrations/0001_initial.sql` — 초기 DDL (6 테이블 + 6 인덱스)
  - `src/db/seed.sql` — 샘플 데이터 (admin + Foundry-X 프로젝트)

- **JWT 인증 + RBAC** (F40, 100%)
  - `src/routes/auth.ts` — auth 라우트 (signup/login/refresh)
  - `src/middleware/auth.ts` — JWT 검증 + Access Token 1h / Refresh Token 7d
  - `src/middleware/rbac.ts` — admin / member / viewer 3등급
  - `src/utils/crypto.ts` — PBKDF2 비밀번호 해싱 (Web Crypto API)

- **API 인증 적용**
  - GET 엔드포인트: `viewer` 역할
  - POST/PUT/DELETE: `member` 역할
  - Public: /api/health, /api/auth/*, /api/docs, /api/openapi.json

- **Swagger UI**
  - `/api/docs` — Swagger UI, `/api/openapi.json` — OpenAPI 3.1 spec

- **DB 관리 스크립트**: db:migrate:local, db:migrate:remote, db:seed:local

### Changed
- 개발 워크플로우: `turbo dev` → `wrangler dev` (D1 로컬 포함)
- `app.use("/api/*", authMiddleware)` — 전역 JWT 검증
- `@hono/node-server` → devDependencies 이동
- .gitignore: .js 빌드 아티팩트 + .next/ 추가

### Fixed
- wiki/requirements 라우트에 RBAC 미들웨어 누락 수정
- authMiddleware 전역 미적용 해소

### Removed
- 프로토타입 mock auth routes (auth.ts로 통합)

### Notes
- PDCA: Plan→Design→Do(Agent Teams ×2)→Check(61%)→Iterate ×2(84%)→Report
- 145/145 테스트 pass (CLI 106 + API 39)

---

## [0.5.0] - 2026-03-17

### Summary
**Phase 1 MVP 완료** — Sprint 5 Part A (F26~F31) + Go 판정. CLI v0.5.0, 36/36 F-items DONE, PDCA 93~97%.

### Added
- **API 서버** — packages/api: Hono, 8 routes, 15 endpoints, data-reader 서비스
- **웹 대시보드** — packages/web: Next.js 14, 6 pages, 7 Feature 컴포넌트
  - F26 대시보드: SDD Triangle + Sprint + Harness Health 위젯
  - F27 Wiki: CRUD + D3 소유권 마커 보호
  - F28 아키텍처 뷰: ModuleMap + Diagram + Roadmap + Requirements 4탭
  - F29 워크스페이스: ToDo + Messages + Settings (localStorage)
  - F30 Agent 투명성: AgentCard 3소스 통합 + SSE EventSource
  - F31 Token 관리: Summary + 모델/Agent별 비용 테이블
- **공유 타입** — packages/shared: web.ts(6) + agent.ts(9) = 15 신규 타입
- **테스트 강화** — API 38테스트 + Web 18테스트 (vitest + @testing-library/react)

### Changed
- app.ts 분리: index.ts에서 Hono app 생성을 분리 (테스트 가능)
- CLI 버전 범프: 0.4.0 → 0.5.0
- requirements 파서: 5컬럼 SPEC 형식 + 이모지 상태 파싱
- Workers types 호환: @cloudflare/workers-types Response.json() 오버라이드

### Notes
- Phase 1 Go 판정 완료 (2026-03-17) — Tech Debt 0건
- 모노리포 4 패키지: cli + shared + api + web
- 162테스트 pass, typecheck ✅, build ✅
- 참고: [Sprint 5 Part B 보고서](04-report/features/sprint-5-part-b.report.md)

---

## [0.4.0] - 2026-03-17

### Summary
**Sprint 5 Part B** — 하네스 산출물 동적 생성 (F32~F36), Builder 패턴. PDCA 93%.

### Added
- Builder 패턴: architecture / constitution / claude / agents 4개 builder
- RepoProfile.scripts 필드 + discover.ts scripts 감지
- generate.ts builder 통합 (builder 있으면 동적, 없으면 템플릿)
- verify.ts 강화: 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증
- harness-freshness.ts: 하네스 문서 신선도 검사 (status 통합)
- CLAUDE.md 품질 감사 (78→91점, Grade B→A)
- Claude Code settings.json: permissions 17 allow + 4 deny
- PreToolUse hook: .env/credentials/lock 파일 보호
- PostToolUse hook: .ts/.tsx 편집 시 auto-typecheck

### Notes
- 22파일 106테스트, typecheck/lint/build 전부 통과

---

## [0.3.1] - 2026-03-16

### Added
- Ink TUI components: Header, StatusBadge, HealthBar, ProgressStep, ErrorBox (F15)
- View components: StatusView, InitView, SyncView (F16-F18)
- render.tsx — TTY/non-TTY 4-branch dispatcher (F20)
- eslint flat config + typescript-eslint (F19, TD-02 resolved)
- GitHub templates: issue + PR templates (F21)
- Sprint 3 PDCA documents (plan, design, analysis, report)

### Changed
- Commands refactored: runStatus/runInit/runSync logic extraction
- npm published: foundry-x@0.3.1

### Fixed
- CLI --version 하드코딩 → 0.3.1 반영

---

## [0.2.0] - 2026-03-16

### Added
- `foundry-x init` — harness detect → generate pipeline (F6)
- `foundry-x sync` — PlumbBridge review integration (F7)
- `foundry-x status` — Triangle Health Score display (F8)
- Harness templates: default (8), kt-ds-sr (4), lint (3) (F9)
- Verification scripts: verify-harness.sh, check-sync.sh (F10)
- npm publish: foundry-x@0.1.1, `npx foundry-x init` support (F11)
- ADR-000: v3 monorepo supersedes legacy multi-repo (F12)
- Internal contracts: Plumb output format (FX-SPEC-002), error handling (FX-SPEC-003) (F13, F14)
- Governance standards compliance (GOV-004/005/007/010)

---

## [0.1.0] - 2026-03-16

### Added
- Monorepo scaffolding: pnpm workspace + Turborepo (F1)
- Shared types module: packages/shared (F2)
- Harness modules: detect, discover, analyze, generate, verify, merge-utils (F3)
- PlumbBridge subprocess wrapper: bridge, errors, types (F4)
- Services: config-manager, health-score, logger (F5)
- Test suite: 8 files, 35 tests (vitest)
