---
code: FX-SPEC-001
title: Foundry-X Project Specification
version: 5.80
status: Active
category: SPEC
system-version: Sprint 262
created: 2026-03-16
updated: 2026-04-12
author: Sinclair Seo
---

# Foundry-X Project Specification

## §1 프로젝트 개요

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- **PRD**: [[FX-SPEC-PRD-V8]] (`docs/specs/FX-SPEC-PRD-V8_foundry-x.md`) + [[FX-BD-V1]] (`docs/specs/fx-bd-v1/prd-final.md`) + [[FX-DISCOVERY-UI-V2]] (`docs/specs/fx-discovery-ui-v2/prd-final.md`)
- **Phase**: **Phase 28** ✅ 완료 — Discovery 동기화 파이프라인 F478~F487 (Sprint 233~238, 10/10 ✅, 평균 Match ~98%) | **Phase 29** ✅ 완료 — 요구사항 거버넌스 자동화 F488+F489 (Sprint 240, PR #405 Match 100%, F489는 F488 dogfood로 Issue #407 생성)
- **Sprint**: 148~238 (✅)
- **Phase 14 근거**: `docs/specs/FX-Unified-Integration-Plan.md` (GAN R2 CONDITIONAL_PASS)
- **Phase 15 근거**: `docs/specs/fx-discovery-ui-v2/prd-final.md` (3종 AI 검토 85점, Conditional→반영 완료)
- **Phase 16 근거**: `docs/specs/prototype-auto-gen/prd-final.md` (3종 AI 3R 검토 + Six Hats + 오픈이슈 5/6 해소)
- **Package Versions**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0

## §2 현재 상태

| 항목 | 상태 |
|------|------|
| Sprint 1 | ✅ 완료 (모노리포 + 핵심 모듈) |
| Sprint 2 | ✅ 완료 (커맨드 3개 + 템플릿 + CI + npm publish v0.1.1) |
| Sprint 3 | ✅ 완료 (Ink TUI + eslint + F21 프로젝트 관리 체계) |
| Sprint 4 | ✅ 완료 (UI 테스트 프레임워크 + status --watch) |
| Sprint 5 Part B | ✅ 완료 (하네스 산출물 동적 생성 F32~F36) |
| Sprint 5 Part A | ✅ 완료 (Frontend Design F26~F31, Match Rate ~90%) |
| PDCA Sprint 3 | ✅ 완료 (Match Rate 94%) |
| PDCA Sprint 4 | ✅ 완료 (Match Rate 97%) |
| PDCA Sprint 5B | ✅ 완료 (Match Rate 93%) |
| PDCA Sprint 5A | ✅ 완료 (Match Rate ~90%, 2 iterations) |
| Sprint 6 | ✅ 완료 (인프라: F37 92%, F39 97%, F40 100%, Overall 84%) |
| PDCA Sprint 6 | ✅ 완료 (Match Rate 84%, 2 iterations, F38 Sprint 7 이관) |
| Sprint 7 | ✅ 완료 (F38 98%, F41 72%, F42 95%, F43 90%, Overall 89%) |
| PDCA Sprint 7 | ✅ 완료 (Match Rate 89%, 1 iteration, Agent Teams 병렬) |
| Sprint 8 | ✅ 완료 (F44 92%, F45 96%, F46 94%, F47 90%, Overall 93%) |
| PDCA Sprint 8 | ✅ 완료 (Match Rate 93%) |
| Sprint 9 | ✅ 완료 (F48 97%, F49 92%, F50 91%, F51 95%, Overall 94%) |
| PDCA Sprint 9 | ✅ 완료 (Match Rate 94%, FX-RPRT-011) |
| Sprint 10 | ✅ 완료 (F52 97%, F53 92%, F54 94%, Overall 93%) |
| PDCA Sprint 10 | ✅ 완료 (Match Rate 93%, FX-RPRT-012) |
| Sprint 11 | ✅ 완료 (F55 95%, F56 88%, F57 100%, F58 91%, Overall 93%) |
| PDCA Sprint 11 | ✅ 완료 (Match Rate 93%, FX-RPRT-013) |
| Sprint 12 | ✅ 완료 (F59 100%, F60 95%, F61 95%, F63 85%, Overall ~93%) |
| PDCA Sprint 12 | ✅ 완료 (FX-RPRT-014 × 2: F59/F60 + F61/F63 분리 Report) |
| Sprint 13 | ✅ 완료 (F64 91%, F65 93%, F66 릴리스, Overall 93%) |
| Sprint 14 | ✅ 완료 (F67 92%, F68 92.5%, Overall 92%) |
| PDCA Sprint 14 | ✅ 완료 (FX-RPRT-016, Match Rate 92%) |
| Sprint 15 | ✅ 완료 (F70 92%, F71 90%, F72 92%, F73 100%, Overall 92%) |
| PDCA Sprint 15 | ✅ 완료 (FX-RPRT-017, Match Rate 92%) |
| Sprint 16 | ✅ 완료 (F75 92%, F76 91%, F77 미착수, Overall 91%) |
| PDCA Sprint 16 | ✅ 완료 (FX-RPRT-018, Match Rate 91%) |
| Sprint 17 | ✅ 완료 (F80 100%, F81 100%, F82 97%, Overall 98%) |
| PDCA Sprint 17 | ✅ 완료 (FX-RPRT-019, Match Rate 98%) |
| Sprint 18 | ✅ 완료 (F83 93%, F84 95%, F85 90%, F86 배포대기, Overall 93%) |
| PDCA Sprint 18 | ✅ 완료 (FX-RPRT-020, Match Rate 93%) |
| Sprint 20 | ✅ 완료 (F92 90%, 1 iteration) |
| PDCA Sprint 20 | ✅ 완료 (FX-RPRT-022, Match Rate 90%) |
| Sprint 22 | ✅ 완료 (F94 99%) |
| PDCA Sprint 22 | ✅ 완료 (FX-RPRT-023, Match Rate 99%) |
| Sprint 21 | ✅ 완료 (F93 93%, Overall 93%) |
| PDCA Sprint 21 | ✅ 완료 (FX-RPRT-021, Match Rate 93%) |
| Sprint 23 | ✅ 완료 (F95 91%, F97 92%) |
| PDCA Sprint 23 | ✅ 완료 (Match Rate 92%) |
| Sprint 24 | ✅ 완료 (F107 100%, F110 95%, F113 90%, F115 90%, Overall 95%) |
| PDCA Sprint 24 | ✅ 완료 (FX-RPRT-025, Match Rate 95%) |
| Sprint 25 | ✅ 완료 (F98 100%, F104 95%, Overall 97%) |
| PDCA Sprint 25 | ✅ 완료 (FX-RPRT-026, Match Rate 97%) |
| Sprint 26 | ✅ 완료 (F106 85%, F108 100%, F109 94%, F111 95%, Overall 94%) |
| PDCA Sprint 26 | ✅ 완료 (FX-RPRT-027, Match Rate 94%) |
| Sprint 27 | ✅ 완료 (F100 94%, F99 94%, F101 94%, Overall 94%) |
| PDCA Sprint 27 | ✅ 완료 (FX-RPRT-028, Match Rate 94%) |
| Sprint 28 | ✅ 완료 (F102 93%, F103 95%, F105 82%, Overall 93%) |
| PDCA Sprint 28 | ✅ 완료 (FX-RPRT-029, Match Rate 93%) |
| Sprint 29 | ✅ 완료 (F120 88%, F121 100%, F122 97%, Overall 93%) |
| PDCA Sprint 29 | ✅ 완료 (FX-RPRT-030, Match Rate 93%) |
| Sprint 30 | ✅ 완료 (F123 100%, F124 86%, F125 100%, F126 88%, F127 100%, F128 72%→, Overall 93%) |
| PDCA Sprint 30 | ✅ 완료 (FX-RPRT-031, Match Rate 93%) |
| Sprint 31 | ✅ 완료 (F129 100%, F130 95%, F131 90%, F132 95%, Overall 95%) |
| PDCA Sprint 31 | ✅ 완료 (FX-ANLS-031, Match Rate 95%) |
| Sprint 32 | ✅ 완료 (F156 ✅, F157 ✅) — PRD v5 완전성 점검 + Phase 5 로드맵 |
| Sprint 33 | ✅ 완료 (F153 ✅, F154 ✅, F155 ✅, Overall 94%) — Agent Evolution Track B |
| PDCA Sprint 33 | ✅ 완료 (track-b-dev-tools, Match Rate 94%) |
| Sprint 35 | ✅ 완료 (F143 85%, F142 96%, Overall 92%) — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 |
| PDCA Sprint 35 | ✅ 완료 (FX-RPRT-035, Match Rate 92%, 1 iteration) |
| Sprint 36 | ✅ 완료 (F136 96%, F137 96%, Overall 96%) — 태스크별 모델 라우팅 + Evaluator-Optimizer 패턴 |
| PDCA Sprint 36 | ✅ 완료 (FX-RPRT-036, Match Rate 96%) |
| Sprint 37 | ✅ 완료 (F138 95%, F139 95%, Overall 95%) — ArchitectAgent + TestAgent |
| PDCA Sprint 37 | ✅ 완료 (FX-RPRT-037, Match Rate 95%) |
| Sprint 38 | ✅ 완료 (F140 97%, F141 97%, Overall 97%) — SecurityAgent + QAAgent, 6종 역할 에이전트 완성 |
| PDCA Sprint 38 | ✅ 완료 (FX-RPRT-038, Match Rate 97%) |
| Sprint 39 | ✅ 완료 (F144 93%, F149 93%, F150 93%, Overall 93%) — Fallback 체인 + 프롬프트 게이트웨이 + 피드백 루프 |
| PDCA Sprint 39 | ✅ 완료 (FX-RPRT-039, Match Rate 93%) |
| Sprint 40 | ✅ 완료 (F145 91%, F148 91%, Overall 91%) — InfraAgent + 에이전트 자기 평가 |
| PDCA Sprint 40 | ✅ 완료 (FX-RPRT-040, Match Rate 91%) |
| Sprint 41 | ✅ 완료 (F146 94%, F147 94%, Overall 94%) — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 |
| PDCA Sprint 41 | ✅ 완료 (FX-RPRT-041, Match Rate 94%) |
| Sprint 42 | ✅ 완료 (F151 97%, F152 97%, Overall 97%) — 자동화 품질 리포터 + 에이전트 마켓플레이스 (**Track A 완결**) |
| PDCA Sprint 42 | ✅ 완료 (FX-RPRT-042, Match Rate 97%) |
| Sprint 43 | ✅ 완료 (F143 UI 95%, Overall 95%) — 모델 품질 대시보드 UI (TokensPage Model Quality 탭 + Agent×Model 히트맵) |
| PDCA Sprint 43 | ✅ 완료 (FX-RPRT-043, Match Rate 95%) |
| Sprint 44 | ✅ 완료 (F116 95%) — KT DS SR 시나리오 구체화 (SrClassifier + SrWorkflowMapper + 5 endpoints, Phase 5 고객 파일럿 준비) |
| PDCA Sprint 44 | ✅ 완료 (FX-RPRT-044, Match Rate 95%) |
| Sprint 45 | ✅ 완료 (F158~F161, Match 97%) — KPI 자동 수집 인프라 (페이지뷰 추적 + CLI 로깅 + Cron 집계 + 대시보드 연결) |
| PDCA Sprint 45 | ✅ 완료 (FX-RPRT-045, Match Rate 97%) |
| Sprint 46 | ✅ 완료 (F162+F163+F169, Match 91%) — PRD v8 재정의 + Azure PoC + SI R&R + 데모 환경 |
| Sprint 47 | ✅ 완료 (F164+F165+F166+F170, Match 93%) — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 + Adoption KPI 대시보드 |
| Sprint 48 | ✅ 완료 (F167+F168, Match 95%) — ML 하이브리드 SR 분류기 + SR 대시보드 UI |
| Sprint 49 | ✅ 완료 (F171+F172, Match 95%) — 대시보드 IA 재설계 + 인터랙티브 온보딩 투어 |
| Sprint 50 | ✅ 완료 (F173+F174, Match 100%) — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯 |
| Sprint 51 | ✅ 완료 (F175+F178, Match 95%) — 사업 아이템 분류 Agent + 멀티 페르소나 평가 |
| Sprint 52 | ✅ 완료 (F182, Match 97%) — 5시작점 분류 + 경로 안내 |
| Sprint 53 | ✅ 완료 (F183+F184+F185, Match 98%) — Discovery 9기준 체크리스트 + pm-skills 가이드 + PRD 자동생성 |
| Sprint 55 | ✅ 완료 (F186+F187, Match 95%) — 다중 AI 검토 + 멀티 페르소나 평가 |
| Sprint 56 | ✅ 완료 (F188+F189) — Six Hats 토론 + 진행률 대시보드 |
| Sprint 57 | ✅ 완료 (F179+F190) — 수집 채널 통합 + 시장/트렌드 데이터 |
| Sprint 58 | ✅ 완료 (F180+F181) — 사업계획서 초안 + Prototype 자동 생성 |
| Sprint 59 | ✅ 완료 (F191+F192, Match 94%) — 방법론 레지스트리+라우터 + BDP 모듈화 래핑 |
| Sprint 60 | ✅ 완료 (F193+F194+F195, Match 97%) — pm-skills 방법론 모듈 + 검증 기준 + 관리 UI |
| Sprint 61 | ✅ 완료 (F197+F198, Match 93%) — BMC 캔버스 CRUD + 아이디어 등록 |
| Sprint 62 | ✅ 완료 (F199+F200) — BMCAgent 초안 자동 생성 + BMC 버전 히스토리 |
| Sprint 64 | ✅ 완료 (F203+F204) — 아이디어-BMC 연결 + BMC 댓글 및 협업 |
| Sprint 65 | ✅ 완료 (F201+F202+F207) — 인사이트+InsightAgent+평가관리 MVP |
| Sprint 66 | ✅ 완료 (F205+F208) — Homepage 재구성 + Discovery-X API 스펙 |
| Sprint 67 | ✅ 완료 (F209+F210) — AI Foundry 흡수 + 비밀번호 재설정 |
| Sprint 68 | ✅ 완료 (F212) — AX BD Discovery 스킬 체계 통합 (ai-biz 11스킬 CC + 오케스트레이터) |
| Sprint 69 | ✅ 완료 (F213, Match 97%) — Foundry-X API v8.2 확장 (5유형+체크포인트+Commit Gate) |
| Sprint 70 | ✅ 완료 (F214) — Web Discovery 대시보드 |
| Sprint 71 | ✅ 완료 (F215) — AX BD 스킬 팀 가이드 (**Phase 5f 완료**) |
| Sprint 72 | ✅ 완료 (F217) — TestAgent 활성화 (Web UI 연동 + 워크플로우 통합) |
| Sprint 73 | ✅ 완료 (F218) — Agent SDK Test Agent PoC |
| Sprint 74 | ✅ 완료 (F219) — TDD 자동화 CC Skill (**Phase 5g 완료**) |
| Sprint 75 | ✅ 완료 (F220+F222) — Brownfield Init 강화 + Changes Directory (PR #213) |
| Sprint 76 | ✅ 완료 (F221+F223) — Agent-as-Code 선언적 정의 + Doc Sharding (PR #214) |
| Sprint 77 | ✅ 완료 (F224~F228) — Ecosystem Reference 5건 (PR #216) |
| Sprint 78 | ✅ 완료 (F229~F231) — Watch 벤치마킹 3건 (Agent Spec 표준/Scale-Adaptive/Multi-repo) |
| Sprint 79 | ✅ 완료 (F232+F233+F239) — 파이프라인 대시보드 + 산출물 공유 + 의사결정 워크플로 (PR #217) |
| Sprint 80 | ✅ 완료 (F234+F235+F237) — BDP 편집 + ORB/PRB 게이트 + 사업제안서 자동 생성 (PR #218) |
| Sprint 81 | ✅ 완료 (F236+F238+F240) — Offering Pack + MVP 추적 + IR Bottom-up 채널 (PR #219) |
| Sprint 86 | ✅ 완료 (F248+F249+F250) — ProtectedRoute 인증 가드 + E2E fixture 키 통일 + 로그인 E2E 보강 |
| Sprint 87 | ✅ 완료 (F251+F252) — 팀 계정 일괄 생성 + 온보딩 가이드 고도화 (PR #224, Match 97%) |
| Sprint 88 | ✅ 완료 (F253+F254) — 팀 데이터 공유(Org-scope) + NPS 피드백 수집 (PR #226) |
| Sprint 89 | ✅ 완료 (F258+F259) — BD 프로세스 가이드 UI + 스킬 카탈로그 UI (PR #225) |
| Sprint 90 | ✅ 완료 (F260+F261) — BD 스킬 실행 엔진 + 산출물 저장·버전 관리 (PR #227) |
| Sprint 91 | ✅ 완료 (F262) — BD 프로세스 진행 추적 + 사업성 신호등 (PR #228) |
| Sprint 92 | ✅ 완료 (F255) — GIVC Ontology PoC 1차 Property Graph + 16 API + KG 탐색기 (PR #229) |
| Sprint 93 | ✅ 완료 (F256+F257) — GIVC PoC 2차 이벤트 연쇄 시나리오 MVP + BD 아이템 탐색 UI (PR #230) |
| Sprint 101 | ✅ 완료 (F270+F271+F272, Match 95%) — O-G-D Agent Loop: 에이전트 3종 + Rubric 7항목 + chatGIVC 데모 (0.82→0.89 CONVERGED) |
| Sprint 102 | ✅ 완료 (F273, Match 100%) — ax-bd-discovery v8.2 O-G-D 통합 (PR #231) |
| Sprint 103 | ✅ 완료 (F274, Match 100%) — 스킬 실행 메트릭 수집 D1 0080 + API 5 endpoints (PR #232) |
| Sprint 104 | ✅ 완료 (F275, Match 100%) — 스킬 레지스트리 D1 0081 + API 8 endpoints + 40 tests (PR #233) |
| Sprint 105 | ✅ 완료 (F276, Match 100%) — DERIVED 엔진 (PR #236) |
| Sprint 106 | ✅ 완료 (F277, Match 100%) — CAPTURED 엔진: D1 0083 3테이블 + API 8 endpoints + 35 tests (PR #237) |
| Sprint 107 | ✅ 완료 (F278, Match 99%) — BD ROI 벤치마크: D1 0084 2테이블 + API 8 endpoints + 39 tests (PR #241) |
| Sprint 108 | ✅ 완료 (F279+F280, Match 100%) — BD 데모 시딩: D1 0082 104 rows 18테이블 + bd_artifacts 16건 한글 콘텐츠 (PR #234) |
| Sprint 109 | ✅ 완료 (F281, Match 100%) — 데모 E2E 검증: react-markdown 렌더링 + API 7 tests + E2E 6 specs (PR #238) | F279+F280 선행 |
| Sprint 110 | ✅ 완료 (F282+F283, Match 100%) — BD 형상화 Phase A+B+C: ax-bd-shaping 스킬 + shaping-{orchestrator,generator,discriminator} 에이전트 3종 + Rubric 5차원 + 참조 3종 (PR #235) |
| Sprint 111 | ✅ 완료 (F284+F285, Match 100%) — BD 형상화 Phase D+E: Six Hats 토론 + 전문가 5종 리뷰 (PR #239, 9분 autopilot) | F283 선행 |
| Sprint 112 | ✅ 완료 (F286+F287) — BD 형상화 Phase F: HITL Web 에디터 + 자동 모드 + D1 + E2E | PR #240, 18분 autopilot |
| Sprint 113 | ✅ 완료 (F288+F289, Match 92%) — Role-based Sidebar + 리브랜딩: visibility 필터링 + 명칭 3건 변경 + 14 tests (PR #242, ~26분 autopilot) |
| Sprint 114 | ✅ 완료 (F290, Match 100%) — Route namespace 마이그레이션: 22경로 전환 + 16 redirect + 30파일 갱신 + 287 tests (PR #243, ~11분 autopilot) |
| Sprint 115 | ✅ 완료 (F291, Match 100%) — Discovery-X Agent 자동 수집: D1 0085 + API 3ep + Web 1p (PR #244, 배치 1 병렬) |
| Sprint 116 | ✅ 완료 (F294+F295) — 2-tier 검증 + 미팅 관리: D1 0086 + API + Web 3p (PR #245, 배치 1 병렬, rebase 충돌 해소) |
| Sprint 117 | ✅ 완료 (F296, Match 100%) — 통합 평가 결과서: D1 0087 + API 3ep + Web 1p (PR #246, 배치 1 병렬) |
| Sprint 118 | ✅ 완료 (F292+F297) — HITL dual (BDP+Prototype): D1 0088 + HITL 공유 컴포넌트 + Web 2p (PR #249, 배치 2, rebase) |
| Sprint 119 | ✅ 완료 (F293) — Offering Brief: D1 0089 + API 3ep + Web 1p (PR #247, 배치 2 병렬) |
| Sprint 120 | ✅ 완료 (F298) — PoC 관리: D1 0090 + API 5ep + Web 1p (PR #248, 배치 2 병렬) |
| Sprint 121 | ✅ 완료 (F299) — GTM 선제안: D1 0088 + API 11ep + Web 2p + 52 tests (PR #252, Match 98%, 17분) |
| **Phase 11** | ✅ 완료 — IA 대개편 F288~F299 (12/12) | 11-A ✅ (113~114), 11-B ✅ (115~119), 11-C ✅ (118~121). Sprint 9개, PR 8건 |
| Sprint 122 | ✅ 완료 (F300, 0 fail) — E2E 정비: redirect 검증 16건 + 미커버 8p 확대 + waitForTimeout 제거 + fixture 정리. 161 tests (153 pass / 6 skip) | 인프라/품질. 세션 #185 |
| Sprint 123 | ✅ 완료 (F301, PR #251) — BD 산출물 UX 연결성: discovery-detail 산출물 섹션 + Pipeline 드릴다운 + MVP 역링크 | 8 files, +391/-14 |
| Sprint 124 | ✅ 완료 (F302, PR #259) — E2E 상세 페이지(:id) 10건 + mock factory 11종. 179 tests (172 pass / 1 기존fail / 6 skip). Match 95% | 인프라/품질. ~19분 autopilot |
| Sprint 129 | ✅ 완료 (F309, PR #257) — Marker.io 위젯 통합: MarkerWidget.tsx + AppLayout 삽입 + deploy.yml env 주입. Match 100%, ~4분 autopilot | 인프라/DX. fx.minu.best 위젯 동작 확인 ✅ |
| Sprint 130 | ✅ 완료 (F310, PR #258) — TinaCMS PoC: tina/config.ts + content/ + .gitignore. G4+G5 PASS (build+E2E 163p). Match 100%, ~6분 autopilot | 인프라/DX. G1~G3 수동 검증 대기 |
| Sprint 131 | ✅ 완료 (F311, PR #264) — TinaCMS 본구현: landing+wiki 2 collection + content-loader fallback + _redirects /admin 방어 + deploy.yml env. Match 100%, ~12분 autopilot | 인프라/DX. TinaCloud 수동 설정 대기 |
| Sprint 132 | ✅ 완료 (F312+F313, PR #266) — 파이프라인 상태 머신 + 형상화 자동 전환: D1 0090 + state-machine + discovery-pipeline-service + shaping-orchestrator + error-handler + Web 4컴포넌트. 44 tests. ~24분 autopilot | fx-discovery-v2 M1 |
| Sprint 133 | ✅ 완료 (F314, PR #267) — SkillPipelineRunner + PipelineCheckpointService + D1 0091 + Web 2컴포넌트(CheckpointReviewPanel, AutoAdvanceToggle). 26 tests. ~7분 | fx-discovery-v2 M2 |
| Sprint 134 | ✅ 완료 (F315, PR #269) — 모니터링 대시보드 + 알림 서비스 + 권한 제어. D1 0092 + 3서비스 + Web 3컴포넌트. 20 tests. ~23분 autopilot | fx-discovery-v2 M2 |
| Sprint 135 | ✅ 완료 (F316, PR #268) — Discovery E2E 3spec 신규 + mock-factory 확장. 10 E2E (wizard+detail+pipeline). Match 100%. ~15분 autopilot | fx-discovery-v2 M3 |
| Sprint 136 | ✅ 완료 (F317, PR #270) — backup-restore-service + D1 0093 + cron 자동 백업 + Web 백업 UI + ops-guide. 10 tests. ~16분 autopilot | fx-discovery-v2 M3. **fx-discovery-v2 전체 완료** |
| Sprint 137 | ✅ 완료 (F319+F320, PR #271) — Marker.io 피드백 자동화: D1 0094 feedback_queue + webhook visual-feedback 감지 + consumer script + agent prompt. 12 tests. ~8분 autopilot | FX-PLAN-014 P1 |
| Sprint 138 | ✅ 완료 (F321, PR #272) — TinaCMS navigation collection + sidebar.json 동적 로딩 + 랜딩 Section Registry sort_order. 11파일 681 lines. ~9분 autopilot | FX-PLAN-014 P2. **FX-PLAN-014 전체 완료** |
| Sprint 139 | 🔧 (F322) — 사이드바 구조 재설계 | Phase 13 IA 재설계 |
| Sprint 145 | ✅ 완료 (F329, PR #274) — Blueprint 랜딩 전면 전환: landing.tsx 7섹션 설계도 스타일 리디자인, bp-* CSS, 다크 모드. Match 97%. ~14분 autopilot | 독립 트랙. FX-PLAN-015 + FX-DSGN-015 |
| Sprint 147 | ✅ 완료 (F332, PR #279) — 랜딩 콘텐츠 리뉴얼: 히어로 직설형, BDP 6+1, 에이전트 3그룹(발굴/형상화/실행), 시스템 구성도, 오픈소스 연계 5종, 로드맵 4마일스톤, Stats 사용자 중심. Match 100%. ~8분 autopilot | 독립 트랙. FX-PLAN-016 + FX-DSGN-016 |
| Sprint 148 | ✅ 완료 (F333, PR #284) — TaskState Machine: enum(10상태) + D1 0095 task_states + API 2건 + TransitionGuard + shared task-state.ts. 15파일 2189줄. Match 100%. ~16분 autopilot | Phase 14 Foundation v1 |
| Sprint 149 | ✅ 완료 (F334, PR #286) — Hook Layer + Event Bus: EventBus + HookResultProcessor + TransitionTrigger + ExecutionEventService + D1 0096 + shared task-event.ts. 20파일 2265줄. 47 tests. Match 100%. ~20분 autopilot | Phase 14 Foundation v2. F333 선행 |
| Sprint 150 | ✅ 완료 (F335, PR #287) — Orchestration Loop: 3모드(retry/adversarial/fix) + ConvergenceCriteria + TelemetryCollector + AgentAdapter + shared orchestration.ts. 16파일 2518줄. 31 tests. Match 100%. ~16분 autopilot | Phase 14 Foundation v3. **전체 사이클 최초 동작** |
| Sprint 151 | ✅ 완료 (F336, PR #290) — Agent Adapter 통합: 5 Adapter + Registry + Factory + YAML role 태깅 16파일. 36파일 1760줄. 27 tests. Match 100%. ~28분 autopilot | Phase 14 Feature |
| Sprint 152 | ✅ 완료 (F337, PR #289) — Orchestration Dashboard: Kanban + LoopHistory + Telemetry 3뷰 + E2E. Match 98% | Phase 14 Feature. **Phase 14 전체 완료** |
| Sprint 154 | ✅ 완료 (F342+F343, PR #288) — DB 스키마 4테이블(0098~0101) + IntensityIndicator/Matrix + output_json POC | Phase 15 Foundation |
| Sprint 155 | ✅ 완료 (F344+F345, PR #291) — 멀티 페르소나 평가 UI 6컴포넌트 + Claude SSE + 데모 모드 + Rate Limiting | Phase 15. 8 페르소나 × 8축 |
| Sprint 156 | ✅ 완료 (F346+F347, PR #292) — 리포트 공통 5컴포넌트 + 9탭 프레임 + 4탭(2-1~2-4). Gap 96% | Phase 15 |
| Sprint 157 | ✅ 완료 (F348+F349+F350, PR #293) — 5탭(2-5~2-9) + TeamReview + decide API + ShareReport + PDF. Match 94% | Phase 15 완료 |
| Sprint 158 | ✅ (F351+F352) — React SPA 템플릿 + Builder Server 스캐폴딩 + Docker 격리 + CLI --bare PoC | Phase 16 Foundation. Phase 15 독립 |
| Sprint 159 | ✅ (F353+F354) — D1 마이그레이션 + Prototype API 3 라우트 + Fallback 아키텍처 + 비용 모니터링 | Phase 16 Core. F351 선행 |
| Sprint 160 | ✅ (F355+F356) — O-G-D 품질 루프 + Prototype 대시보드 + 실사용자 피드백 Loop + Slack 알림 | Phase 16 Integration. F353 선행 |
| npm | foundry-x@0.5.0 published ✅ |
| typecheck | ✅ |
| build | ✅ |
| lint | ✅ (0 error) |
| Workers | foundry-x-api.ktds-axbd.workers.dev ✅ |
| Pages | fx.minu.best ✅ |

> **📏 실시간 수치** — 아래 수치는 문서에 하드코딩하지 않아요. `/ax:daily-check`가 자동 수집하거나 아래 명령으로 직접 확인:
> ```
> find packages/api/src -name "*.ts" -path "*/routes/*" ! -name "*.test.*" | wc -l   # API routes (flat+core+modules)
> find packages/api/src -name "*.ts" -path "*/services/*" ! -name "*.test.*" | wc -l # API services
> find packages/api/src -name "*.ts" -path "*/schemas/*" ! -name "*.test.*" | wc -l  # API schemas
> ls packages/api/src/db/migrations/*.sql | sort | tail -1  # D1 latest
> turbo test --output-logs=errors-only    # 테스트 수 (전체 실행)
> ```
> **마지막 실측** (Sprint 262, 2026-04-12): ~10 routes, ~28 services, ~14 schemas, D1 0126, tests ~3452 (E2E 268) — Phase 34 F510 fx-multi-agent-session: D1 0126 agent_sessions + GET/POST sessions + Sessions 탭 + session-collector.sh + work-sessions.test.ts 7건 + E2E sessions 탭 테스트

## §3 마일스톤

| 버전 | 마일스톤 | 상태 |
|:----:|----------|:----:|
| v0.1.0 | Sprint 1: 모노리포 + 핵심 모듈 | ✅ |
| v0.2.0 | Sprint 2: CLI 커맨드 + 템플릿 + 배포 | ✅ |
| v0.3.0 | Sprint 3: Ink TUI + eslint + 안정화 | ✅ |
| v0.3.1 | Sprint 3 마무리: npm 배포 + F21 프로젝트 관리 체계 구축 | ✅ |
| v0.4.0 | Sprint 4: UI 테스트 프레임워크 + Ink 실시간 업데이트 | ✅ |
| v0.5.0 | Sprint 5: Frontend Design (F26~F31) + 하네스 확장 (F32~F36) | ✅ |
| — | **Phase 1 Go 판정** | ✅ Go (2026-03-17) |
| v0.6.0 | Sprint 6: Cloudflare 인프라 + D1 + JWT 인증 + RBAC | ✅ |
| v0.7.0 | Sprint 7: OpenAPI 전환 + D1 실데이터 + shadcn/ui + 테스트 176건 | ✅ |
| v0.8.0 | Sprint 8: 서비스 레이어 + SSE + NL→Spec + Production Site (Match Rate 93%) | ✅ |
| v0.9.0 | Sprint 9: 프로덕션 배포 + E2E + 에이전트 오케스트레이션 (Match Rate 94%) | ✅ |
| v0.10.0 | Sprint 10: 에이전트 실연동 + NL→Spec 충돌 감지 (Match Rate 93%) | ✅ |
| v0.11.0 | Sprint 11: SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 (Match Rate 93%) | ✅ |
| v0.12.0 | Sprint 12: ouroboros 패턴 + Generative UI + MCP 실 구현 + 테스트 352건 (Match Rate ~93%) | ✅ |
| **v1.0.0** | **Phase 2 릴리스: 33 endpoints + 14 services + 352 tests + MCP + Generative UI** | ✅ |
| v1.1.0 | Sprint 13: MCP Sampling/Prompts + 에이전트 자동 PR 파이프라인 (41 endpoints, 388 tests) | ✅ |
| v1.2.0 | Sprint 14: MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 (50 endpoints, 429 tests) | ✅ |
| v1.3.0 | Sprint 15: PlannerAgent + 에이전트 inbox + git worktree 격리 (57 endpoints, 307 API tests) | ✅ |
| v1.4.0 | Sprint 16: PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 (57 endpoints, 313 API tests) | ✅ |
| v1.5.0 | Sprint 17: AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 | ✅ |
| v1.6.0 | Sprint 18: 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 (342 tests, Match Rate 93%) | ✅ |
| v1.7.0 | Sprint 19: AgentInbox 스레드 답장 — ThreadReplyForm + API 보강 + 통합 테스트 | ✅ |
| v1.8.0 | Sprint 20: 멀티테넌시 고도화 — Org CRUD 12 endpoints + roleGuard + Web UI (Match Rate 90%) | ✅ |
| v1.8.1 | Sprint 21: GitHub 양방향 동기화 고도화 — Issue→Task + 외부 PR 리뷰 + @foundry-x 코멘트 (Match Rate 93%) | ✅ |
| — | Sprint 22: Slack 고도화 — Interactive D1 실연동 + 채널별 알림 (Match Rate 99%) | ✅ |
| — | Sprint 23: PlannerAgent 고도화 + 테스트 커버리지 확장 (Match Rate 92%) | ✅ |
| **v2.0.0** | **Sprint 24: Phase 3 마무리 — 멀티 프로젝트 + Jira + 모니터링 + 워크플로우 (97 ep, 535 tests, Match Rate 95%)** | ✅ |
| v2.1.0 | Sprint 25~26: 기술 스택 점검(F98) + AXIS DS 전환(F104) + Phase 4 통합(F106/F108/F109/F111) | ✅ |
| v2.2.0 | Sprint 27~28: Phase 3 완결(F99~F103/F105) — KPI+Reconciliation+AutoFix+AutoRebase+Linting+Plumb | ✅ |
| v2.3.0 | Sprint 29: 실사용자 온보딩 기반(F120~F122) — 가이드 UI + 피드백 API + 체크리스트 (Match Rate 93%) | ✅ |
| v2.4.0 | Sprint 30: 프로덕션 배포 동기화 + Phase 4 Conditional Go + 품질 강화 (F123~F128, Match Rate 93%) | ✅ |
| v2.5 | Sprint 31: 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 + 로그인 UI (F129~F133, Match Rate 95%) | ✅ |
| — | **⚡ 버전 정책 전환 (F134)** — 이후 프로젝트는 Sprint N, 패키지는 Independent SemVer | — |
| Sprint 32 | PRD v5 완전성 점검 + Phase 4→5 전환 로드맵 (F156/F157, 거버넌스 Sprint) | ✅ |
| Sprint 33 | Agent Evolution Track B — gstack 스킬 설치 + claude-code-router + OpenRouter (F153~F155, Match Rate 94%) | ✅ |
| Sprint 35 | 모델 비용/품질 대시보드(F143) + Sprint 워크플로우 템플릿(F142) — 630 tests, Match Rate 92% | ✅ |
| Sprint 36 | 태스크별 모델 라우팅(F136) + Evaluator-Optimizer 패턴(F137) — 666 tests, Match Rate 96% | ✅ |
| Sprint 37 | ArchitectAgent(F138) + TestAgent(F139) — 714 tests, Match Rate 95% | ✅ |
| Sprint 38 | SecurityAgent(F140) + QAAgent(F141) — 745 tests, Match Rate 97% | ✅ |
| Sprint 39 | Fallback 체인(F144) + 프롬프트 게이트웨이(F149) + 피드백 루프(F150) — 792 tests, Match Rate 93% | ✅ |
| Sprint 40 | InfraAgent(F145) + 에이전트 자기 평가(F148) — 835 tests, Match Rate 91% | ✅ |
| Sprint 41 | 에이전트 역할 커스터마이징(F146) + 멀티모델 앙상블 투표(F147) — 877 tests, Match Rate 94% | ✅ |
| Sprint 42 | 자동화 품질 리포터(F151) + 에이전트 마켓플레이스(F152) — 925 tests, Match Rate 97%, **Agent Evolution Track A 완결** | ✅ |
| Sprint 44 | KT DS SR 시나리오 구체화(F116) — 953 tests, Match Rate 95%, **Phase 5 고객 파일럿 준비** | ✅ |
| **v1.7.0** | **Phase 7~8 마일스톤: BD Pipeline E2E(Sprint 79~81) + IA 개선 + Vite 전환(Sprint 82~85) — 2475 tests, 153 services** | ✅ |
| Sprint 87 | Phase 9: 팀 계정 일괄 생성(F251) + 온보딩 가이드 고도화(F252) | 📋 |
| Sprint 88 | Phase 9: 팀 데이터 공유(F253) + NPS 피드백(F254) | 📋 |
| Sprint 92 | Phase 9: GIVC Ontology PoC 1차(F255) — Property Graph + 16 API + KG 탐색기 | ✅ |
| Sprint 93 | Phase 9: GIVC PoC 2차(F256) + 추가 BD 아이템(F257) — 이벤트 연쇄 시나리오 MVP | ✅ |
| Sprint 94 | Phase 9: 발굴 UX — 위저드 UI(F263) + 온보딩 투어(F265) — 18 files, +1892 lines | ✅ |
| Sprint 95 | Phase 9: 발굴 UX — Help Agent 챗봇(F264) — Match 99%, OpenRouter SSE + Hybrid | ✅ |
| Sprint 96 | Phase 9: 발굴 UX — HITL 인터랙션 패널(F266) — Match 100%, 4-action 드로어 | ✅ |
| Sprint 97 | Phase 9: 발굴 UX — 통합 QA (E2E 4 spec + Feature Flag) | ✅ |
| Sprint 98 | Phase 9: BD 팀 공용 스킬 GitHub 배포 준비(F267) — CLAUDE_AXBD 정리 + 설치 가이드 UI 갱신 | ✅ |

## §4 성공 지표

| 지표 | 목표 | 현재 |
|------|------|------|
| CLI 주간 호출/사용자 | 10회+ | — (내부 사용 시작 전) |
| `--no-verify` 우회 비율 | < 20% | 0% (hook 미우회) |
| sync 후 수동 수정 파일 | 감소 추세 | — |
| 결정 승인율 | > 70% | — |
| 하네스 무결성 통과율 (K6) | > 95% | — |

### Phase 1 Go 판정 (2026-03-17)

**판정: Go** — Phase 2 진행

**PRD Go 조건 대비:**

| 조건 | 충족 여부 | 근거 |
|------|:---------:|------|
| NPS 6+ (5명 대상) | N/A | 내부 팀 온보딩 전 (1인 개발 단계) |
| CLI 주간 사용률 60%+ | N/A | 동일 사유 |
| "없으면 불편" 피드백 2명+ | N/A | 동일 사유 |

**정성 판정 근거 (Product Owner 판단):**
1. **Phase 1 기술 산출물 완성**: CLI v0.5.0 — 3개 커맨드 + Ink TUI + 4개 Builder + 106 테스트, PDCA 93~97%
2. **Phase 2 프로토타입 검증**: API 서버(15 endpoints) + 웹 대시보드(6 pages) 프레임워크 구축 완료
3. **전체 F-item 36건 DONE**: Sprint 1~5 모든 기능 항목 완료, Tech Debt 0건
4. **Kill 조건 미해당**: CLI 완성 ✅, 온보딩 대상자 확보는 Phase 2에서 팀원 합류 시 병행

**비고:** KPI K1~K4는 실사용자 온보딩 후 Phase 2에서 측정. Phase 1은 기술 기반 구축 목적 달성으로 Go 판정.

## §5 기능 항목 (F-items)

### Sprint 1 — 완료 (v0.1.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F1 | 모노리포 scaffolding (FX-REQ-001, P1) | v0.1 | ✅ | pnpm workspace + Turborepo |
| F2 | 공유 타입 모듈 (FX-REQ-002, P1) | v0.1 | ✅ | packages/shared (types.ts) |
| F3 | Harness 모듈 (FX-REQ-003, P1) | v0.1 | ✅ | detect, discover, analyze, generate, verify, merge-utils |
| F4 | PlumbBridge subprocess 래퍼 (FX-REQ-004, P1) | v0.1 | ✅ | bridge, errors, types |
| F5 | Services 모듈 (FX-REQ-005, P1) | v0.1 | ✅ | config-manager, health-score, logger |

### Sprint 2 — 완료 (v0.2.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F6 | init 커맨드 구현 (FX-REQ-006, P1) | v0.2 | ✅ | harness pipeline 통합 |
| F7 | sync 커맨드 구현 (FX-REQ-007, P1) | v0.2 | ✅ | PlumbBridge 연동 |
| F8 | status 커맨드 구현 (FX-REQ-008, P1) | v0.2 | ✅ | Triangle Health Score 포함 |
| F9 | 하네스 템플릿 생성 (FX-REQ-009, P1) | v0.2 | ✅ | default + kt-ds-sr + lint |
| F10 | 검증 스크립트 (FX-REQ-010, P2) | v0.2 | ✅ | verify-harness.sh, check-sync.sh |
| F11 | npm publish + 온보딩 (FX-REQ-011, P1) | v0.2 | ✅ | foundry-x@0.1.1, npx init ✅ |

### 완료 (v0.2.0 이후)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F12 | ADR-000 작성 (FX-REQ-012, P2) | v0.2 | ✅ | docs/adr/ADR-000.md |
| F13 | .plumb 출력 + decisions.jsonl 내부 계약 (FX-REQ-013, P2) | v0.2 | ✅ | FX-SPEC-002 |
| F14 | subprocess 오류 처리 계약 (FX-REQ-014, P2) | v0.2 | ✅ | FX-SPEC-003 |

### Sprint 3 — 완료 (v0.3.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F15 | Ink TUI 공통 컴포넌트 (FX-REQ-015, P1) | v0.3 | ✅ | ui/components/ 5개 + ui/render.tsx |
| F16 | status 커맨드 Ink TUI 전환 (FX-REQ-016, P1) | v0.3 | ✅ | StatusView.tsx + runStatus() |
| F17 | init 커맨드 Ink TUI 전환 (FX-REQ-017, P1) | v0.3 | ✅ | InitView.tsx + runInit() |
| F18 | sync 커맨드 Ink TUI 전환 (FX-REQ-018, P1) | v0.3 | ✅ | SyncView.tsx + runSync() |
| F19 | eslint flat config 설정 (FX-REQ-019, P1) | v0.3 | ✅ | TD-02 해소 완료 |
| F20 | non-TTY 폴백 (FX-REQ-020, P2) | v0.3 | ✅ | render.tsx 4-branch dispatch |
| F21 | 프로젝트 관리 점검 및 개선 (FX-REQ-021, P0) | v0.3 | ✅ | GitHub Projects 보드 + Branch Protection + PR/Issue 템플릿 + 온보딩 가이드 (PDCA 90%) |

### Sprint 4 — 완료 (v0.4.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F22 | ink-testing-library 도입 + vitest TSX 설정 (FX-REQ-022, P1) | v0.4 | ✅ | vitest .test.tsx + test-data factory |
| F23 | 공통 컴포넌트 단위 테스트 (FX-REQ-023, P1) | v0.4 | ✅ | 5개 컴포넌트 24 tests |
| F24 | View + render.tsx 통합 테스트 (FX-REQ-024, P1) | v0.4 | ✅ | 3 View + render 12 tests |
| F25 | status --watch 실시간 모니터링 (FX-REQ-025, P1) | v0.4 | ✅ | StatusWatchView + fs.watch + debounce |

### Sprint 5 — Frontend Design + 하네스 확장 (v0.5.0)

**Part A: Frontend Design**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F26 | 팀 정보 공유 대시보드 (FX-REQ-026, P1) | v0.5 | ✅ | Next.js 대시보드 — SDD Triangle + Sprint + Harness Health (PDCA ~90%) |
| F27 | Human Readable Document + Wiki (FX-REQ-027, P1) | v0.5 | ✅ | Wiki CRUD + D3 소유권 마커 보호 (PDCA ~90%) |
| F28 | 아키텍처 뷰 (FX-REQ-028, P1) | v0.5 | ✅ | 4탭: ModuleMap, Diagram, Roadmap, Requirements (PDCA ~90%) |
| F29 | 개인 워크스페이스 (FX-REQ-029, P1) | v0.5 | ✅ | ToDo + Messages + Settings, shared 타입 사용 (PDCA ~90%) |
| F30 | Agent 투명성 뷰 (FX-REQ-030, P1) | v0.5 | ✅ | AgentCard 3소스 통합 + SSE EventSource (PDCA ~90%) |
| F31 | Token/비용 관리 (FX-REQ-031, P1) | v0.5 | ✅ | Summary + 모델/Agent별 비용 테이블 (PDCA ~90%) |

**Part B: 하네스 산출물 확장**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F32 | 동적 ARCHITECTURE.md 생성 (FX-REQ-032, P1) | v0.5 | ✅ | RepoProfile 기반 모듈 맵·레이어·진입점 (PDCA 93%) |
| F33 | 동적 CONSTITUTION.md 생성 (FX-REQ-033, P1) | v0.5 | ✅ | 스택별 Always/Ask/Never 경계 규칙 (Node/Python/Go/Java) |
| F34 | 동적 CLAUDE.md + AGENTS.md 생성 (FX-REQ-034, P1) | v0.5 | ✅ | 빌드/테스트/린트 커맨드 자동 감지 + scripts 필드 |
| F35 | verify.ts 강화 (FX-REQ-035, P1) | v0.5 | ✅ | 플레이스홀더 잔존 감지 + 모듈 맵 일관성 검증 |
| F36 | 하네스 신선도 검사 (FX-REQ-036, P2) | v0.5 | ✅ | status에서 하네스 문서 갱신 시점 비교 |

### Phase 2 — API Server + Web Dashboard + 인프라

**Sprint 6 — 인프라 + 인증 (v0.6.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F37 | Cloudflare 배포 파이프라인 (FX-REQ-037, P0) | v0.6 | ✅ | Workers + Pages + D1 + deploy.yml, Match 92% |
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 (FX-REQ-038, P1) | v0.7 | ✅ | createRoute 17 endpoints + Zod 21스키마, Match 98% |
| F39 | D1 스키마 + Drizzle ORM (FX-REQ-039, P1) | v0.6 | ✅ | 6테이블 + 마이그레이션 + seed, Match 97% |
| F40 | JWT 인증 + RBAC 미들웨어 (FX-REQ-040, P1) | v0.6 | ✅ | signup/login/refresh + RBAC 적용, Match 100% |

**Sprint 7 — API 실데이터 + OpenAPI (v0.7.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F38 | OpenAPI 3.1 계약서 + API 리팩토링 (FX-REQ-038, P1) | v0.7 | ✅ | createRoute 17 endpoints + Zod 21스키마, Match 98% |
| F41 | API 엔드포인트 실데이터 연결 (FX-REQ-041, P1) | v0.7 | ✅ | D1 실데이터 전환, Match 72% |
| F42 | shadcn/ui + 웹 컴포넌트 고도화 (FX-REQ-042, P1) | v0.7 | ✅ | shadcn/ui + 다크모드 + 반응형, Match 95% |
| F43 | API + Web 테스트 스위트 (FX-REQ-043, P1) | v0.7 | ✅ | D1 mock + auth/middleware 테스트 176건, Match 90% |

**Sprint 8 — API 완성 + 핵심 기능 (v0.8.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F44 | SSE 실시간 통신 (FX-REQ-044, P1) | v0.8 | ✅ | SSEManager D1 폴링, 3 이벤트 타입, Match 92% |
| F45 | NL→Spec 변환 (FX-REQ-045, P0) | v0.8 | ✅ | LLMService(Workers AI+Claude), Zod 검증, Match 96% |
| F46 | Wiki Git 동기화 (FX-REQ-046, P2) | v0.8 | ✅ | WikiSyncService 양방향, webhook HMAC, Match 94% |
| F47 | Production Site Design — fx.minu.best 랜딩+대시보드 통합 (FX-REQ-047, P1) | v0.8 | ✅ | Route Groups + Digital Forge 디자인, Match 90% |

**Sprint 9 — 프로덕션 배포 + E2E + 에이전트 오케스트레이션 (v0.9.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F48 | 프로덕션 배포 파이프라인 완성 (FX-REQ-048, P0) | v0.9 | ✅ | deploy.yml Pages job + smoke-test.sh + deployment-runbook.md, Match 97% |
| F49 | E2E 테스트 인프라 + 크리티컬 패스 (FX-REQ-049, P1) | v0.9 | ✅ | Playwright config + 5 E2E specs + auth fixture + e2e.yml CI, Match 92% |
| F50 | 에이전트 오케스트레이션 기초 (FX-REQ-050, P1) | v0.9 | ✅ | 0004 migration + agent-orchestrator + constraint-guard + 13 tests, Match 91% |
| F51 | 옵저버빌리티 + 배포 후 검증 (FX-REQ-051, P2) | v0.9 | ✅ | health.ts 상세 + logger.ts + health schema 확장, Match 95% |

**Sprint 10 — 에이전트 실연동 + NL→Spec 충돌 감지 (v0.10.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F52 | 프로덕션 실배포 실행 (FX-REQ-052, P0) | v0.10 | ✅ | Workers secrets + D1 migration remote + deploy + smoke test 검증, Match 97% |
| F53 | 에이전트 실연동 — Claude API + MCP 어댑터 인터페이스 (FX-REQ-053, P0) | v0.10 | ✅ | AgentRunner + ClaudeApiRunner + MCP 어댑터 + 21 tests, Match 92% |
| F54 | NL→Spec 충돌 감지 + 사용자 선택 (FX-REQ-054, P1) | v0.10 | ✅ | ConflictDetector 2-phase + 충돌 UI + 14 tests, Match 94% |

**Sprint 11 — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 (v0.11.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F55 | SSE 이벤트 완성 — 에이전트 작업 실시간 전파 (FX-REQ-055, P1) | v0.11 | ✅ | SSEManager pushEvent + 대시보드 실시간 UI, Match 95% |
| F56 | E2E 테스트 고도화 — 에이전트+충돌 흐름 (FX-REQ-056, P1) | v0.11 | ✅ | Playwright 8 E2E + API 통합 9건, Match 88% |
| F57 | 프로덕션 배포 자동화 — CI/CD 파이프라인 (FX-REQ-057, P2) | v0.11 | ✅ | staging 환경 분리 + PR 트리거 + smoke-test 강화, Match 100% |
| F58 | MCP 실 구현 설계 — McpAgentRunner 계획 (FX-REQ-058, P2) | v0.11 | ✅ | MCP 프로토콜 타입 + 설계 문서 + 매핑 상수, Match 91% |

**Sprint 12 — ouroboros 패턴 + Generative UI + MCP 구현 + v1.0 준비 (v0.12.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F59 | ouroboros 패턴 차용 — Ambiguity Score + Socratic 질문법 + 3-stage Evaluation (FX-REQ-059, P1) | v0.12 | ✅ | ax-14 Ambiguity Score + plan-plus Ontological Q + gap-detector Semantic, Match 100% |
| F60 | Generative UI 패턴 도입 — 에이전트 결과 인터랙티브 렌더링 (FX-REQ-060, P1) | v0.12 | ✅ | UIHint + DynamicRenderer + SectionRenderer + WidgetRenderer, Match 95% |
| F61 | MCP 실 구현 — McpAgentRunner + SseTransport (FX-REQ-061, P1) | v0.12 | ✅ | SseTransport + HttpTransport + McpRunner + Registry + 5 endpoints + UI, Match 95% |
| F62 | v1.0.0 릴리스 준비 — 안정화 + 문서 + 배포 (FX-REQ-062, P1) | v1.0 | ✅ | D1 migration remote + version bump + git tag + 릴리스 |
| F63 | 테스트 커버리지 강화 — E2E + API 통합 보강 (FX-REQ-063, P2) | v0.12 | ✅ | MCP 통합 8건 + E2E 2건 + SSE 헬퍼, Match 85% |

**Sprint 13 — MCP Sampling/Prompts + 에이전트 자동 PR (v1.1.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F64 | MCP Sampling + Prompts 확장 — 양방향 MCP 통합 완성 (FX-REQ-064, P1) | v1.1 | ✅ | SamplingHandler + PromptsClient + 4 endpoints + UI 브라우저, Match 91% |
| F65 | 에이전트 자동 PR 파이프라인 — branch→PR→review→merge 전체 자동화 (FX-REQ-065, P0) | v1.1 | ✅ | PrPipelineService + ReviewerAgent + 7-gate auto-merge + 4 endpoints, Match 93% |
| F66 | v1.1.0 릴리스 + 안정화 (FX-REQ-066, P2) | v1.1 | ✅ | version bump + CHANGELOG + SPEC v3.1 + git tag (D1 remote: 별도 적용) |

**Sprint 14 — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 (v1.2.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F67 | MCP Resources + Notifications — 파일/데이터 리소스 발견·읽기·구독 (FX-REQ-067, P1) | v1.2 | ✅ | McpResourcesClient + 4 endpoints + Resources 브라우저 UI, Match 92% |
| F68 | 멀티 에이전트 동시 PR + 충돌 해결 — Merge Queue + 파일 충돌 감지 (FX-REQ-068, P0) | v1.2 | ✅ | MergeQueueService + 병렬 실행 + 순차 merge + 5 endpoints, Match 92.5% |
| F69 | v1.2.0 릴리스 + Phase 3 기반 구축 — 멀티테넌시 설계 + 로드맵 (FX-REQ-069, P2) | v1.2 | ✅ | v1.3.0 릴리스에서 배포 완료, 멀티테넌시 설계는 Sprint 16+ |

**Sprint 15 — PlannerAgent + 에이전트 inbox 통신 + git worktree 격리 (v1.3.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F70 | PlannerAgent 도입 — 태스크 실행 전 코드베이스 리서치 + 계획 수립 + 인간 승인 (FX-REQ-070, P1) | v1.3 | ✅ | PlannerAgent 6 메서드 + API 3 endpoints + Orchestrator 통합, Match 92% |
| F71 | 에이전트 간 inbox 통신 — Leader/Worker 비동기 메시지 큐 + SSE 이벤트 (FX-REQ-071, P1) | v1.3 | ✅ | AgentInbox 4 메서드 + inbox 라우트 3 endpoints + SSE, Match 90% |
| F72 | git worktree 격리 — 에이전트별 독립 worktree 자동 할당 + WorktreeManager (FX-REQ-072, P2) | v1.3 | ✅ | WorktreeManager gitExecutor DI + D1 + executeTaskIsolated, Match 92% |
| F73 | 제품 포지셔닝 재점검 — 기존 서비스(Discovery-X·AXIS DS·AI Foundry) 연동 계획 + 정체성 재정립 (FX-REQ-073, P0) | v1.3 | ✅ | Plan §5에 반영, C1/C2/C3 연동 경로 확정 |

**Sprint 16 — PlannerAgent LLM 실 연동 + AgentInboxPanel UI + 프로덕션 배포 (v1.4.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F75 | PlannerAgent LLM 실 연동 — Mock→Claude API 전환 + JSON 파싱 + 폴백 (FX-REQ-075, P1) | v1.4 | ✅ | analyzeCodebase() + 3단계 폴백 + 313 tests, Match 92% |
| F76 | AgentInboxPanel UI + AgentPlanCard shared import 정리 (FX-REQ-076, P1) | v1.4 | ✅ | AgentInboxPanel 161 LOC + Plans 탭 실 렌더링 + api-client 6함수, Match 91% |
| F77 | v1.4.0 프로덕션 배포 + D1 migration 0009 remote (FX-REQ-077, P2) | v1.4 | ✅ | D1 22테이블 확인 + CI/CD deploy 성공 + v1.4.0 bump |

### 단독 작업 — 프로젝트 소개 페이지 개편

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F74 | 프로젝트 소개 페이지 전면 개편 — 정체성 재정립 + 아키텍처/로드맵/블루프린트 (FX-REQ-074, P1) | v1.4 | ✅ | 7섹션 전면 재작성, AXIS DS 토큰 연동, smoke-test 수정 포함 |

**Sprint 17 — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 (v1.5.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F80 | AI Foundry MCP 연동 — 설계 문서 + 서비스 등록 흐름 + 외부 MCP 호출 경로 (FX-REQ-080, P1) | v1.5 | ✅ | McpServerRegistry.createServerPreset("ai-foundry") + PRESET_CONFIGS + externalTool type, Match 100% |
| F81 | AgentInboxPanel 스레드 뷰 — parentMessageId 기반 대화 맥락 UI + 스레드 라우트 (FX-REQ-081, P1) | v1.5 | ✅ | GET /agents/inbox/:parentMessageId/thread + viewMode(flat/threaded) + groupByThread(), Match 100% |
| F82 | PlannerAgent → Orchestrator 실 연동 — createPlanAndWait 승인 대기 + executePlan 라이프사이클 (FX-REQ-082, P1) | v1.5 | ✅ | createPlanAndWait() 폴링 + executePlan() lifecycle + D1 migration 0010 + Plan API 2 endpoints, Match 97% |

**Sprint 18 — 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 (v1.6.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F83 | 멀티테넌시 기초 — Organizations + tenant_id + RLS 미들웨어 (FX-REQ-083, P0) | v1.6 | ✅ | organizations + org_members + tenantGuard + JWT orgId + D1 migration 0011~0012, Match 93% |
| F84 | GitHub 양방향 동기화 — Issues/PR 실시간 연동 (FX-REQ-084, P1) | v1.6 | ✅ | GitHubSyncService + webhook 확장 + Octokit 인증 + 17 tests, Match 95% |
| F85 | Slack 통합 — 에이전트 알림 + 슬래시 커맨드 (FX-REQ-085, P1) | v1.6 | ✅ | SlackService + Block Kit + /foundry-x 커맨드 + SSE→Slack 브릿지 + 12 tests, Match 90% |
| F86 | Sprint 18 통합 + v1.6.0 릴리스 (FX-REQ-086, P2) | v1.6 | ✅ | D1 0011~0012 remote 적용 완료 + Workers 배포 완료 |

**Sprint 19 — AgentInbox 스레드 답장 (v1.7.0)**

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F87 | ThreadReplyForm UI — 스레드 상세 뷰 + 답장 폼 + getInboxThread 연동 (FX-REQ-087, P1) | v1.7 | ✅ | MessageItem 분리 + ThreadReplyForm + ThreadDetailView, Match 100% |
| F88 | 스레드 답장 API 보강 — 답장 알림 + 읽음 처리 확장 + mock-d1 보완 (FX-REQ-088, P1) | v1.7 | ✅ | ackThread() + SSE thread_reply + 라우트 1개, Match 100% |
| F89 | 스레드 통합 테스트 + E2E — API 라우트 테스트 + Playwright 스레드 흐름 (FX-REQ-089, P2) | v1.7 | ✅ | mock-d1 보완 + inbox-routes 10건 + E2E 4건, Match 100% |

### 단독 작업 — Production E2E + AXIS Design System 리디자인

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F78 | Production 사이트 E2E 테스트 — fx.minu.best smoke + 크리티컬 패스 검증 (FX-REQ-078, P1) | v1.4 | ✅ | playwright.prod.config + 2 E2E specs, Match Rate 94% |
| F79 | UI/UX 전면 리디자인 — AXIS Design System 연동 (FX-REQ-079, P1) | v1.4 | ✅ | forge→axis 전환 완료, 잔존 0건, Match Rate 96% |

### 단독 작업 — PlannerAgent 외부 도구 프롬프트 연동

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F90 | PlannerAgent gatherExternalToolInfo() 프롬프트 연동 — MCP 도구 정보 수집 + LLM 프롬프트 주입 (FX-REQ-090, P2) | v1.5+ | ✅ | Match Rate 96%, 363 tests, PDCA FX-RPRT-021 |

### 단독 작업 — executePlan() repoUrl 연동

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F91 | executePlan() repoUrl 실제 리포 URL 연동 — options 파라미터 + 라우트 조회 (FX-REQ-091, P2) | v1.5+ | ✅ | FX-PLAN-022, 366 tests |

## §6 Execution Plan

### Sprint 1 (v0.1.0) ✅
- [x] 모노리포 구조 생성 (FX-REQ-001 DONE)
- [x] packages/shared 타입 정의 (FX-REQ-002 DONE)
- [x] harness 모듈 6개 구현 (FX-REQ-003 DONE)
- [x] PlumbBridge 래퍼 구현 (FX-REQ-004 DONE)
- [x] services 모듈 3개 구현 (FX-REQ-005 DONE)
- [x] typecheck + build 통과

### Sprint 2 (v0.2.0) ✅
- [x] init 커맨드 — harness detect→generate 파이프라인 (FX-REQ-006 DONE)
- [x] sync 커맨드 — PlumbBridge review 연동 (FX-REQ-007 DONE)
- [x] status 커맨드 — Triangle Health Score 표시 (FX-REQ-008 DONE)
- [x] 하네스 템플릿 3종 생성 (FX-REQ-009 DONE)
- [x] 검증 스크립트 2개 작성 (FX-REQ-010 DONE)
- [x] typecheck ✅ tests 35/35 ✅
- [x] npm publish + npx 검증 (FX-REQ-011 DONE)
- [x] ADR-000 작성 (FX-REQ-012 DONE)
- [x] 내부 계약 문서 2건 (FX-REQ-013 DONE, FX-REQ-014 DONE)

### Sprint 3 (v0.3.0) ✅
- [x] eslint flat config 설정 + 기존 코드 lint fix (FX-REQ-019 DONE)
- [x] Ink TUI 공통 컴포넌트 — StatusBadge, HealthBar, ProgressStep, Header, ErrorBox (FX-REQ-015 DONE)
- [x] non-TTY 감지 + Ink/plain 분기 유틸 (FX-REQ-020 DONE)
- [x] status 커맨드 Ink TUI 전환 (FX-REQ-016 DONE)
- [x] init 커맨드 Ink TUI 전환 (FX-REQ-017 DONE)
- [x] sync 커맨드 Ink TUI 전환 (FX-REQ-018 DONE)
- [x] 프로젝트 관리 점검 및 개선 — GitHub Projects + Branch Protection + 온보딩 가이드 (FX-REQ-021 DONE)
- [x] 기존 35개 테스트 통과 + typecheck + build + lint 검증

### Sprint 4 (v0.4.0) ✅
- [x] ink-testing-library 설치 + vitest.config.ts TSX 패턴 추가 (FX-REQ-022 DONE)
- [x] test-data.ts 중앙 팩토리 생성 (FX-REQ-022 DONE)
- [x] 공통 컴포넌트 테스트 5개 — Header(3), StatusBadge(5), HealthBar(7), ProgressStep(6), ErrorBox(3) (FX-REQ-023 DONE)
- [x] View 테스트 3개 — StatusView(3), InitView(2), SyncView(2) (FX-REQ-024 DONE)
- [x] render.tsx 4-branch 분기 테스트 5개 (FX-REQ-024 DONE)
- [x] StatusWatchView.tsx — fs.watch + debounce + useInput('q') (FX-REQ-025 DONE)
- [x] status.ts --watch, --interval 옵션 추가 (FX-REQ-025 DONE)
- [x] 71개 테스트 전부 통과 + typecheck + build + lint 검증

### Sprint 5 (v0.5.0) — Frontend Design + 하네스 확장
**Part A: Frontend Design** ✅
- [x] 팀 정보 공유 대시보드 (FX-REQ-026 DONE)
- [x] Human Readable Document + Wiki (FX-REQ-027 DONE)
- [x] 아키텍처 뷰 — 4탭 (FX-REQ-028 DONE)
- [x] 개인 워크스페이스 — ToDo, Message, Setting (FX-REQ-029 DONE)
- [x] Agent 투명성 뷰 — AgentCard + SSE (FX-REQ-030 DONE)
- [x] Token/비용 관리 — Summary + 비용 테이블 (FX-REQ-031 DONE)

**Part B: 하네스 산출물 확장** ✅
- [x] 동적 ARCHITECTURE.md 생성 — RepoProfile 기반 모듈 맵 (FX-REQ-032 DONE)
- [x] 동적 CONSTITUTION.md 생성 — 스택별 경계 규칙 (FX-REQ-033 DONE)
- [x] 동적 CLAUDE.md + AGENTS.md 생성 — 커맨드 자동 감지 (FX-REQ-034 DONE)
- [x] verify.ts 강화 — 플레이스홀더 잔존·일관성 (FX-REQ-035 DONE)
- [x] 하네스 신선도 검사 — status에서 갱신 시점 비교 (FX-REQ-036 DONE)
- [x] 22파일 106테스트 전부 통과 + typecheck + build + lint 검증

### Sprint 6 (v0.6.0) — 인프라 + 인증 ✅
- [x] Cloudflare Workers 배포 파이프라인 — wrangler.toml + deploy.yml (FX-REQ-037 DONE)
- [x] D1 스키마 6테이블 + Drizzle ORM + 마이그레이션 + seed (FX-REQ-039 DONE)
- [x] JWT 인증 (signup/login/refresh) + RBAC (admin/member/viewer) 미들웨어 적용 (FX-REQ-040 DONE)
- [x] OpenAPI 3.1 계약서 — Sprint 7 완료 (FX-REQ-038 DONE, Match 98%)
- [x] 38파일 145테스트 전부 통과 + typecheck + build + lint 검증
- [x] PDCA 2회 iteration — 61% → 84% (F37+F39+F40 = 96%)

### Sprint 7 (v0.7.0) — OpenAPI + 실데이터 + Web 고도화 ✅
- [x] OpenAPI 3.1 전환 — createRoute 17 endpoints + Zod 21스키마 (FX-REQ-038 DONE, Match 98%)
- [x] API 실데이터 연결 — D1 전환, data-reader 제거 (FX-REQ-041 DONE, Match 72%)
- [x] shadcn/ui + 다크모드 + 반응형 — 웹 컴포넌트 고도화 (FX-REQ-042 DONE, Match 95%)
- [x] 테스트 스위트 — D1 mock + auth/middleware 테스트 (FX-REQ-043 DONE, Match 90%)
- [x] 31파일 176테스트 전부 통과 + typecheck + build 검증
- [x] PDCA 1회 iteration — Agent Teams 병렬, Overall 89%

### Sprint 8 (v0.8.0) — API 완성 + 핵심 기능 ✅
- [x] requirements GitHub API + KV 캐시 (FX-REQ-041 DONE)
- [x] health/integrity/freshness 실데이터 전환 (FX-REQ-041 DONE)
- [x] SSE 실시간 통신 — Agent/Sync 상태 스트리밍 (FX-REQ-044 DONE)
- [x] NL→Spec 변환 — LLM 통합 파이프라인 (FX-REQ-045 DONE)
- [x] Wiki Git 동기화 — D1 ↔ Git 양방향 (FX-REQ-046 DONE)
- [x] Production Site Design — fx.minu.best 랜딩+대시보드 통합 (FX-REQ-047 DONE)
- [x] ~~Workers 프로덕션 재배포~~ (Sprint 9 F48에서 대체)
- [x] ~~npm publish foundry-x@0.8.0~~ (v0.5.0→v1.0.0 직행, 건너뜀)
- [x] 42파일 216테스트 전부 통과 + typecheck + build + lint 검증 (PDCA 93%)

### Sprint 9 (v0.9.0) — 프로덕션 배포 + E2E + 에이전트 오케스트레이션 ✅
- [x] Workers secrets 설정 + D1 migration remote 적용 (FX-REQ-048 DONE)
- [x] Pages deploy job 복원 + 배포 Runbook 작성 (FX-REQ-048 DONE)
- [x] Playwright E2E 인프라 설정 + CI 통합 (FX-REQ-049 DONE)
- [x] 크리티컬 패스 E2E: login→dashboard→agents→spec-generator (FX-REQ-049 DONE)
- [x] API 통합 테스트 — 서비스 간 호출 검증 (FX-REQ-049 DONE)
- [x] 에이전트 Capability 실 정의 + Constraint 강제 로직 (FX-REQ-050 DONE)
- [x] 에이전트 브랜치 기반 격리 — PR 기반 작업 흐름 (FX-REQ-050 DONE)
- [x] Smoke test + health check 강화 (FX-REQ-051 DONE)
- [x] Workers + Pages 프로덕션 배포 검증 (FX-REQ-048 DONE)
- [x] typecheck + build + tests 통과 — 48파일 241테스트 ✅ (PDCA 94%)

### Sprint 10 (v0.10.0) — 에이전트 실연동 + NL→Spec 충돌 감지 ✅
- [x] Workers secrets 설정 + D1 migration remote 적용 (FX-REQ-052 DONE)
- [x] Workers + Pages 프로덕션 배포 + smoke test 검증 (FX-REQ-052 DONE)
- [x] AgentRunner 추상화 계층 + ClaudeApiRunner 구현 (FX-REQ-053 DONE)
- [x] MCP 어댑터 인터페이스 설계 (FX-REQ-053 DONE)
- [x] 에이전트 실행 → agent_tasks 실데이터 기록 (FX-REQ-053 DONE)
- [x] NL→Spec 기존 명세 충돌 감지 엔진 (FX-REQ-054 DONE)
- [x] 충돌 표시 + 사용자 선택 UI (수락/거절/수정) (FX-REQ-054 DONE)
- [x] typecheck + build + tests 276건 통과 (PDCA 93%)

### Sprint 11 (v0.11.0) — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 ✅
- [x] SSE agent.task.started/completed 이벤트 전파 (FX-REQ-055 DONE)
- [x] agents/page.tsx SSE task 이벤트 핸들링 + 실시간 UI (FX-REQ-055 DONE)
- [x] Playwright agent execute E2E — 실행→결과 확인 흐름 (FX-REQ-056 DONE)
- [x] Playwright conflict resolution E2E — 충돌 감지→해결 흐름 (FX-REQ-056 DONE)
- [x] API 통합 테스트 추가 — agent-runner + conflict-detector (FX-REQ-056 DONE)
- [x] wrangler.toml ENVIRONMENT vars 설정 + deploy.yml 환경 분리 (FX-REQ-057 DONE)
- [x] GitHub Actions 자동 배포 트리거 (PR merge → deploy) (FX-REQ-057 DONE)
- [x] MCP 1.0 스펙 리뷰 + 프로토콜 설계 문서 (FX-REQ-058 DONE)
- [x] McpAgentRunner 구현 계획 + 인터페이스 확정 (FX-REQ-058 DONE)
- [x] typecheck + build + tests 290건 통과 + 18 E2E specs (PDCA 93%)

### Sprint 12 (v0.12.0) — ouroboros 패턴 + Generative UI + MCP + 테스트 ✅
- [x] ouroboros Ambiguity Score 정량화 모듈 도입 — ax-14-req-interview 강화 (FX-REQ-059 DONE)
- [x] Socratic 질문법 + 온톨로지 분석 — plan-plus 스킬 강화 (FX-REQ-059 DONE)
- [x] 3-stage Evaluation 패턴 — bkit PDCA Check 단계 고도화 (FX-REQ-059 DONE)
- [x] Generative UI Widget Renderer — sandboxed iframe + CSS 변수 주입 (FX-REQ-060 DONE)
- [x] 에이전트 결과 인터랙티브 렌더링 — Decision Matrix 기반 시각화 (FX-REQ-060 DONE)
- [x] CopilotKit useComponent 패턴 — 대시보드 동적 시각화 (FX-REQ-060 DONE)
- [x] MCP SseTransport 구현 — fetch+ReadableStream SSE 파싱 (FX-REQ-061 DONE)
- [x] McpAgentRunner 구현 — taskType → MCP tool.call() 변환 + 결과 파싱 (FX-REQ-061 DONE)
- [x] MCP 서버 연결 설정 UI — workspace 페이지 MCP Servers 탭 (FX-REQ-061 DONE)
- [x] CHANGELOG v0.12.0 + SPEC/CLAUDE.md 갱신 (FX-REQ-062 DONE)
- [x] 프로덕션 최종 배포 + D1 migration remote + v1.0.0 태그 (FX-REQ-062 DONE)
- [x] MCP E2E + SSE 헬퍼 + 통합 테스트 (FX-REQ-063 DONE)
- [x] API 통합 테스트 확대 — MCP runner + 서비스 간 호출 검증 (FX-REQ-063 DONE)
- [x] typecheck + build + tests 352건 통과 + 20 E2E specs (PDCA ~93%)

### Sprint 13 (v1.1.0) — MCP Sampling/Prompts + 에이전트 자동 PR ✅
- [x] MCP SamplingHandler — 서버→클라이언트 LLM 호출 위임 (FX-REQ-064 DONE)
- [x] MCP PromptsClient — prompts/list + prompts/get (FX-REQ-064 DONE)
- [x] MCP API 4 endpoints + Prompts 브라우저 UI (FX-REQ-064 DONE)
- [x] PrPipelineService — branch→commit→PR→merge 전체 자동화 (FX-REQ-065 DONE)
- [x] ReviewerAgent — cross-agent PR 리뷰 (FX-REQ-065 DONE)
- [x] GitHubService 확장 — createBranch, createPR, mergePR + 5 메서드 (FX-REQ-065 DONE)
- [x] Auto-merge 7-gate 판정 — SDD + Quality + CI + Security (FX-REQ-065 DONE)
- [x] SSE agent.pr.* 이벤트 4종 + 대시보드 PR 상태 UI (FX-REQ-065 DONE)
- [x] D1 migration 0007 — agent_prs + mcp_sampling_log (FX-REQ-064, FX-REQ-065 DONE)
- [x] CHANGELOG v1.1.0 + version bump (FX-REQ-066 DONE)
- [x] ~~D1 migration remote 적용 + 프로덕션 배포~~ (Sprint 14 F69에서 일괄 적용)
- [x] typecheck + build + tests 388건 통과 (PDCA 93%)

### Sprint 14 (v1.2.0) — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 ✅
- [x] McpResourcesClient — listResources, readResource, subscribeResource (FX-REQ-067 DONE)
- [x] McpRunner 확장 — onNotification, resources/updated 핸들링 (FX-REQ-067 DONE)
- [x] MCP API 4 endpoints (resources/list, templates, read, subscribe) (FX-REQ-067 DONE)
- [x] McpResourcesPanel + ResourceViewer UI (FX-REQ-067 DONE)
- [x] MergeQueueService — enqueue, detectConflicts, calculateMergeOrder, processNext (FX-REQ-068 DONE)
- [x] AgentOrchestrator 확장 — executeParallel, executeParallelWithPr (FX-REQ-068 DONE)
- [x] GitHubService 확장 — getModifiedFiles, updateBranch, getPrStatuses (FX-REQ-068 DONE)
- [x] Agent API 5 endpoints (parallel, queue) (FX-REQ-068 DONE)
- [x] D1 migration 0008 — merge_queue + parallel_executions (FX-REQ-068 DONE)
- [x] MergeQueuePanel + ConflictDiagram + ParallelExecutionForm UI (FX-REQ-068 DONE)
- [x] D1 migration 0007+0008 remote 적용 + 프로덕션 배포 (FX-REQ-069 DONE)
- [x] v1.2.0 릴리스 — CHANGELOG + version bump + git tag (FX-REQ-069 DONE)
- [x] ~~multitenancy.design.md~~ (Sprint 18 F83에서 구현으로 대체) + ~~phase-3-roadmap.md~~ (Sprint 15 F73에서 대체)
- [x] ~~E2E 테스트 — Merge Queue + MCP Resources~~ (Sprint 19+ 이관)
- [x] typecheck + build + tests 429건 통과 (PDCA 92%)

### Sprint 15 (v1.3.0) — PlannerAgent + 에이전트 inbox 통신 + git worktree 격리 ✅
- [x] PlannerAgent 서비스 — 코드베이스 분석 + 계획 수립 6 메서드 (FX-REQ-070 DONE)
- [x] AgentPlanCard.tsx — 계획 표시 + 수락/수정/거절 UI (FX-REQ-070 DONE, WIP 활용)
- [x] POST /agents/plan 엔드포인트 3개 + D1 agent_plans 테이블 (FX-REQ-070 DONE)
- [x] AgentOrchestrator.createPlanAndWait + executePlan (FX-REQ-070 DONE)
- [x] D1 agent_messages 테이블 — 에이전트 간 비동기 메시지 큐 (FX-REQ-071 DONE)
- [x] POST/GET /agents/inbox/* API 엔드포인트 3개 (FX-REQ-071 DONE)
- [x] SSE agent.message.received 이벤트 추가 (FX-REQ-071 DONE)
- [x] WorktreeManager 서비스 — gitExecutor DI + D1 영속 (FX-REQ-072 DONE)
- [x] AgentOrchestrator worktree 격리 모드 통합 — executeTaskIsolated (FX-REQ-072 DONE)
- [x] 제품 포지셔닝 리서치 — Foundry-X 정체성 재정립 + 기존 서비스 연동 범위 확정 (FX-REQ-073 DONE)
- [x] Discovery-X / AXIS Design System / AI Foundry 자산 분석 + 재활용 계획 (FX-REQ-073 DONE)
- [x] Sprint 15 최종 스코프 재정의 (FX-REQ-073 결과 반영) (FX-REQ-073 DONE)
- [x] typecheck + build + tests 307건 통과 (PDCA 92%)

### Sprint 16 (v1.4.0) — PlannerAgent LLM + AgentInboxPanel UI + 배포 ✅
- [x] PlannerAgent createPlan() Mock→Claude API 실 호출 전환 (FX-REQ-075 DONE)
- [x] PlannerAgent 전용 시스템 프롬프트 + JSON schema 응답 파싱 (FX-REQ-075 DONE)
- [x] API 에러 시 Mock 폴백 로직 (FX-REQ-075 DONE)
- [x] planner-agent.test.ts 확장 — LLM mock + 파싱 성공/실패 (FX-REQ-075 DONE)
- [x] AgentPlanCard.tsx shared import 전환 (inline 타입 삭제) (FX-REQ-076 DONE)
- [x] AgentInboxPanel.tsx 신규 — 메시지 목록 + 타입별 렌더링 + ack + SSE (FX-REQ-076 DONE)
- [x] agents/page.tsx inbox 탭 추가 + AgentPlanCard 통합 (FX-REQ-076 DONE)
- [x] api-client.ts 확장 — plan/inbox API 함수 6개 (FX-REQ-076 DONE)
- [x] D1 migration 0009 remote 적용 — 22테이블 확인 (FX-REQ-077 DONE)
- [x] Workers + Pages 프로덕션 재배포 + smoke test — CI/CD 성공 (FX-REQ-077 DONE)
- [x] version bump v1.4.0 + SPEC + git tag (FX-REQ-077 DONE)
- [x] typecheck + build + tests 통과 (313건)

### 단독: F74 프로젝트 소개 페이지 전면 개편
- [x] 랜딩 페이지 Hero 섹션 — "사람과 AI가 함께 만드는 곳" (FX-REQ-074 DONE)
- [x] Features 섹션 — 3 Pillars (에이전트 통제/조직 지식/실험-코드) (FX-REQ-074 DONE)
- [x] Pricing 섹션 삭제 (FX-REQ-074 DONE)
- [x] Architecture 섹션 신규 — 4-Layer 블루프린트 (FX-REQ-074 DONE)
- [x] Roadmap 섹션 신규 — Phase 1~4 타임라인 (FX-REQ-074 DONE)
- [x] BluePrint 섹션 신규 — AX BD팀 생태계 다이어그램 (FX-REQ-074 DONE)
- [x] Navbar/Footer 업데이트 — v1.3.0 + Ecosystem 링크 (FX-REQ-074 DONE)

### Sprint 17 (v1.5.0) — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합 ✅
- [x] AI Foundry MCP 연동 설계 문서 작성 — 서비스 등록 흐름 + 인증 전략 (FX-REQ-080 DONE)
- [x] MCP 서버 등록 API 확장 — AI Foundry 전용 프리셋 + 연결 검증 (FX-REQ-080 DONE)
- [x] PlannerAgent 외부 MCP 호출 경로 — AI Foundry tool.call() 통합 (FX-REQ-080 DONE)
- [x] AgentInbox 스레드 라우트 — GET /agents/inbox/:parentMessageId/thread (FX-REQ-081 DONE)
- [x] AgentInboxPanel 스레드 UI — 대화 맥락 그룹핑 + 토글 뷰 (FX-REQ-081 DONE)
- [x] api-client getInboxThread() 함수 추가 (FX-REQ-081 DONE)
- [x] createPlanAndWait() 승인 대기 메커니즘 — 폴링 (FX-REQ-082 DONE)
- [x] executePlan() 라이프사이클 — executing/completed/failed 상태 추적 (FX-REQ-082 DONE)
- [x] agent_plans 테이블 확장 — execution_* 컬럼 추가 (D1 migration 0010) (FX-REQ-082 DONE)
- [x] Plan 관리 API 2 endpoints — get/execute (FX-REQ-082 DONE)
- [x] typecheck + build + tests 313건 통과 (PDCA 98%)

### Sprint 18 (v1.6.0) — 멀티테넌시 기초 + GitHub/Slack 외부 도구 연동 ✅
- [x] D1 migration 0011: organizations + org_members 테이블 (FX-REQ-083 DONE)
- [x] D1 migration 0012: org_id 컬럼 (projects, agents, mcp_servers) + GitHub 컬럼 (FX-REQ-083 DONE)
- [x] tenantGuard 미들웨어 — JWT orgId + DB 멤버십 검증 (FX-REQ-083 DONE)
- [x] Login/Signup org 자동 할당 + Refresh org 재조회 (FX-REQ-083 DONE)
- [x] routes/agent + mcp에 org_id 필터 적용 (FX-REQ-083 DONE)
- [x] GitHubSyncService — syncTaskToIssue + syncIssueToTask + syncPrStatus (FX-REQ-084 DONE)
- [x] webhook.ts issues + pull_request 이벤트 핸들러 확장 (FX-REQ-084 DONE)
- [x] GitHub 양방향 동기화 테스트 17건 (FX-REQ-084 DONE)
- [x] SlackService — sendNotification + handleSlashCommand + handleInteraction (FX-REQ-085 DONE)
- [x] Slack routes 2개 — /slack/commands + /slack/interactions (FX-REQ-085 DONE)
- [x] SSE→Slack 브릿지 — 에이전트 이벤트 실시간 전파 (FX-REQ-085 DONE)
- [x] Slack 테스트 12건 (FX-REQ-085 DONE)
- [x] typecheck + build + tests 342건 통과 (PDCA 93%)
- [x] D1 migrations 0011~0012 remote 적용 완료 (FX-REQ-086 DONE, 2026-03-19 00:14:02)
- [x] Workers 프로덕션 배포 완료 (FX-REQ-086 DONE, Version ae45aab5)

### Sprint 19 (v1.7.0) — AgentInbox 스레드 답장 ✅
- [x] ThreadReplyForm 컴포넌트 — 답장 입력 폼 + type/subject/payload 필드 (FX-REQ-087 DONE)
- [x] ThreadDetailView — getInboxThread() 연동 + 스레드 전체 대화 표시 (FX-REQ-087 DONE)
- [x] AgentInboxPanel 스레드 클릭 → ThreadDetailView 전환 UX (FX-REQ-087 DONE)
- [x] 답장 알림 SSE 이벤트 — agent.message.thread_reply 전파 (FX-REQ-088 DONE)
- [x] 스레드 읽음 처리 — ackThread() 일괄 확인 메서드 (FX-REQ-088 DONE)
- [x] mock-d1 agent_messages 테이블 추가 + 인덱스 (FX-REQ-089 DONE)
- [x] inbox 라우트 통합 테스트 — 5 endpoints 전체 커버리지 (FX-REQ-089 DONE)
- [x] Playwright E2E — 스레드 답장 흐름 시나리오 4건 (FX-REQ-089 DONE)
- [x] typecheck + build + tests 356건 통과 (PDCA 100%)

### 단독: F78 Production 사이트 E2E 테스트 ✅
- [x] Playwright 프로덕션 config — baseURL: fx.minu.best (FX-REQ-078 DONE)
- [x] smoke test E2E — health check + 랜딩 페이지 로딩 검증 (FX-REQ-078 DONE)
- [x] 크리티컬 패스 E2E — 랜딩→대시보드→에이전트→spec-generator 흐름 (FX-REQ-078 DONE)
- [x] CI 연동 — deploy.yml prod-e2e job 추가, smoke-test 후 Playwright 실행 (FX-REQ-078 DONE)

### 단독: F79 UI/UX 전면 리디자인 — AXIS Design System 연동 ✅
- [x] AXIS DS 토큰 체계 분석 + Foundry-X tailwind 매핑 (FX-REQ-079 DONE)
- [x] 랜딩 페이지 AXIS DS 기반 리디자인 (FX-REQ-079 DONE)
- [x] 대시보드 레이아웃 + 컴포넌트 AXIS DS 전환 (FX-REQ-079 DONE)
- [x] shadcn/ui → AXIS DS CSS 변수 자동 전환 (FX-REQ-079 DONE — 코드 변경 없이 토큰 매핑)

### 단독: F90 PlannerAgent gatherExternalToolInfo() 프롬프트 연동 ✅
- [x] gatherExternalToolInfo() 메서드 구현 — mcpRegistry active 서버 도구 수집 (FX-REQ-090 DONE)
- [x] PLANNER_SYSTEM_PROMPT 확장 — external_tool type + externalTool 스키마 가이드 (FX-REQ-090 DONE)
- [x] analyzeCodebase() 수정 — 도구 목록 프롬프트 주입 (FX-REQ-090 DONE)
- [x] 테스트 7건 — mcpRegistry mock + external_tool 파싱 검증 (FX-REQ-090 DONE)
- [x] typecheck + lint + 기존 테스트 통과 — 363건 전부 pass (FX-REQ-090 DONE)

### 단독: F91 executePlan() repoUrl 실제 리포 URL 연동 ✅
- [x] executePlan() 시그니처 변경 — options?: { repoUrl?, branch? } (FX-REQ-091 DONE)
- [x] context.repoUrl에 options.repoUrl 반영 + 폴백 (FX-REQ-091 DONE)
- [x] POST /plan/:id/execute 라우트에서 repoUrl/projectId 조회 + 전달 (FX-REQ-091 DONE)
- [x] schemas/plan.ts — executePlanSchema 옵션 추가 (FX-REQ-091 DONE)
- [x] 테스트 3건 — repoUrl 전달/미전달/branch 검증 (FX-REQ-091 DONE)
- [x] mock-d1 agent_plans 스키마 실제 마이그레이션 정렬 (FX-REQ-091 DONE)
- [x] typecheck ✅ + 366 tests 전부 pass (FX-REQ-091 DONE)

### Sprint 22 (v1.8+) — Slack 고도화 (Interactive D1 실연동 + 채널별 알림) ✅
- [x] D1 migration 0014: slack_notification_configs 테이블 (FX-REQ-094 DONE)
- [x] SlackService 확장 — 이벤트 타입 8개 + Block Kit 빌더 5개 + eventToCategory() (FX-REQ-094 DONE)
- [x] SSEManager 카테고리 라우팅 — forwardToSlack 리팩토링 + fallback (FX-REQ-094 DONE)
- [x] Interactive D1 실 연동 — plan_approve/reject → agent_plans 갱신 + race condition 방어 (FX-REQ-094 DONE)
- [x] 알림 설정 CRUD 4 endpoints — GET/PUT/DELETE/POST /orgs/:orgId/slack/configs (FX-REQ-094 DONE)
- [x] Zod 스키마 4개 — Category, Config, Upsert, Test (FX-REQ-094 DONE)
- [x] 테스트 +32건 — 블록 빌더 5 + 매핑 5 + D1 연동 8 + 라우팅 7 + CRUD 7 (FX-REQ-094 DONE)
- [x] typecheck ✅ + 471 tests 전부 pass (PDCA 99%)

### Sprint 21 (v1.8.0) — GitHub 양방향 동기화 고도화 ✅
- [x] PR 자동 리뷰 실 연동 — GitHubSyncService 확장 (FX-REQ-093 DONE)
- [x] Issue→Task 자동 생성 — webhook issue 이벤트 → agent_tasks INSERT (FX-REQ-093 DONE)
- [x] typecheck + build + tests 통과 (PDCA 93%)

### Sprint 23 — PlannerAgent 고도화 + 테스트 커버리지 확장 ✅
- [x] FileContextCollector 서비스 — 파일 컨텍스트 수집 + 관련도 점수 (FX-REQ-095 DONE)
- [x] planner-prompts 서비스 — 분석 모드별 시스템 프롬프트 분리 (FX-REQ-095 DONE)
- [x] analyzeCodebase() 리팩토링 — 3단계 분석 파이프라인 (FX-REQ-095 DONE)
- [x] D1 migration 0015 — agent_plans 분석 메타데이터 컬럼 추가 (FX-REQ-095 DONE)
- [x] E2E 5개 spec — org-settings + org-members + workspace-nav + tokens + slack-config (FX-REQ-097 DONE)
- [x] API 보강 12건 — org-invitation-delete + webhook-extended + slack-config edge (FX-REQ-097 DONE)
- [x] typecheck ✅ + 502 tests 전부 pass (PDCA 92%)

### Sprint 24 (v2.0.0) — Phase 3 마무리: 멀티 프로젝트 + Jira + 모니터링 + 워크플로우 ✅
- [x] 멀티 프로젝트 대시보드 — ProjectOverviewService + 라우트 3ep + ProjectCard UI (FX-REQ-107 DONE)
- [x] Webhook 일반화 + Jira 연동 — WebhookRegistry + JiraAdapter + 라우트 5ep (FX-REQ-110 DONE)
- [x] 모니터링 + 옵저버빌리티 — MonitoringService + AlertRule + 라우트 5ep (FX-REQ-113 DONE)
- [x] 에이전트 워크플로우 빌더 — WorkflowEngine + 라우트 5ep + React Flow UI (FX-REQ-115 DONE)
- [x] D1 migration 0016 — 4 tables (projects, jira_configs, alert_rules, workflow_definitions)
- [x] typecheck ✅ + 535 tests 전부 pass + Workers v2.0.0 배포 (PDCA 95%)

### Sprint 25 — 기술 스택 점검 + AXIS DS UI 전환 ✅
- [x] 기술 스택 점검 — Discovery-X/AI Foundry/AXIS DS 호환성 매트릭스 작성, Kill→Go (FX-REQ-098 DONE)
- [x] AXIS DS UI 전환 — shadcn/ui → AXIS DS 11 컴포넌트 전환 + 디자인 토큰 통합 (FX-REQ-104 DONE)
- [x] typecheck ✅ + PDCA 97%

### Sprint 26 (v2.1.0) — Phase 4 통합: SSO + BFF + iframe + D1 엔티티 ✅
- [x] 프론트엔드 통합 — iframe + postMessage SSO (FX-REQ-106 DONE)
- [x] 인증 SSO 통합 — Hub Token + org_services (FX-REQ-108 DONE)
- [x] API BFF→통합 — Service Bindings + HTTP 폴백 (FX-REQ-109 DONE)
- [x] D1 스키마 통합 — entity_registry + links (FX-REQ-111 DONE)
- [x] D1 migration 0017 + typecheck ✅ + PDCA 94%

### Sprint 27 — Phase 3-B 기술 기반 완성 ✅
- [x] KPI 측정 인프라 — KpiLogger + /analytics 대시보드 + 4 endpoints (FX-REQ-100 DONE)
- [x] Git↔D1 Reconciliation — ReconciliationService + Cron 6h + 3 endpoints (FX-REQ-099 DONE)
- [x] 에이전트 hook 자동 수정 — AutoFixService LLM 2-retry + human escalation (FX-REQ-101 DONE)
- [x] D1 migration 0018 (kpi_events + reconciliation_runs) + typecheck ✅ + PDCA 94%

### Sprint 28 — Phase 3 완결: AutoRebase + Semantic Linting + Plumb 판정 ✅
- [x] 에이전트 자동 rebase — AutoRebaseService 3-retry + LLM 충돌 해결 (FX-REQ-102 DONE)
- [x] Semantic Linting — ESLint 커스텀 룰 3종 + hasSuggestions 수정 예시 (FX-REQ-103 DONE)
- [x] Plumb Track B 판정 — Stay Track A, ADR-001, 재판정 2026-09 (FX-REQ-105 DONE)
- [x] typecheck ✅ + PDCA 93%

### Sprint 30 (v2.4.0) — 프로덕션 배포 동기화 + Phase 4 Go 판정 + 품질 강화 ✅
- [x] D1 migration 0018 remote 적용 — Workers v2.2.0 배포 완료 (FX-REQ-123 DONE)
- [x] Workers v2.2.0 프로덕션 배포 + smoke test (FX-REQ-123 DONE)
- [x] F106 프론트엔드 통합 개선 — postMessage 6종 + Skeleton + ErrorBoundary (FX-REQ-124 DONE)
- [x] KPI 추적 대시보드 UI — K7/K8/K9 위젯 + Conditional Go (FX-REQ-125 DONE)
- [x] Phase 4 Go 판정 문서 작성 — Conditional Go (FX-REQ-125 DONE)
- [x] Harness Evolution Rules 자동 감지 — 4규칙 + 2ep + SSE (FX-REQ-126 DONE)
- [x] PRD v5 MVP 체크리스트 갱신 — 6/6 ✅ + codegen 보류 (FX-REQ-127 DONE)
- [x] Phase 4 통합 경로 E2E — 4시나리오 (FX-REQ-128 DONE)
- [x] API 에러 응답 표준화 — ErrorResponse 스키마 통일 (FX-REQ-128 DONE)
- [x] typecheck ✅ + PDCA 93%

### Sprint 29 (v2.3.0) — 실사용자 온보딩 기반: 가이드 UI + 피드백 API + 체크리스트 ✅
- [x] 온보딩 가이드 UI — /getting-started 페이지 + 기능카드 5종 + FAQ 5종 (FX-REQ-120 DONE)
- [x] 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + NpsSummaryWidget (FX-REQ-121 DONE)
- [x] 온보딩 체크리스트 — 사용자별 진행률 + KpiLogger 연동 (FX-REQ-122 DONE)
- [x] D1 migration 0019 + typecheck ✅ + PDCA 93%

### Sprint 31 (v2.5) — 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 ✅
- [x] D1 migration 0018~0019 remote 적용 — 전체 적용 확인 (FX-REQ-129 DONE)
- [x] Workers v2.4.0 프로덕션 배포 + smoke test — fe2f72a7 (FX-REQ-129 DONE)
- [x] SPEC.md §1/§2/§3 보정 — v5.9, system-version 2.4.0, 마일스톤 ✅ (FX-REQ-130 DONE)
- [x] Sprint 29/30 Execution Plan 체크박스 동기화 (FX-REQ-130 DONE)
- [x] MEMORY.md 보정 — Workers v2.4.0/D1/검증수치/다음작업 (FX-REQ-130 DONE)
- [x] ServiceContainer FX_NAVIGATE router.push 연결 + serviceName breadcrumb (FX-REQ-131 DONE)
- [x] E2E 보강 — ErrorResponse + Harness Rules + 온보딩 플로우 + KPI 대시보드 +6 tests (FX-REQ-131 DONE)
- [x] 온보딩 킥오프 체크리스트 문서 — S1~S5 + Go/Kill 기준 + 지원 체계 (FX-REQ-132 DONE)
- [x] 로그인/회원가입 UI — /login 페이지 + auth-store + 사이드바 인증 + fetchApi 401 수정 (FX-REQ-133 DONE)
- [x] typecheck ✅ + PDCA 95%

### Sprint 32 — PRD v5 완전성 점검 + Phase 4→5 전환 로드맵 ✅
- [x] PRD v5 G1~G12 갭 항목 상태 검증 — 9건 완료, 1건 진행(G10), 2건 수요 대기(G2/G5) (FX-REQ-156 DONE)
- [x] Phase 3 산출물 완료 검증 — 11/11 항목 ✅ (FX-REQ-156 DONE)
- [x] Phase 4 산출물 완료 검증 — 11/12 항목 ✅, G2 GitLab P3 수요 대기 (FX-REQ-156 DONE)
- [x] Phase 5 미착수 F-item Layer 1~4 분류 + 의존성 문서화 (FX-REQ-157 DONE)
- [x] 온보딩 4주 추적 계획 — K7/K8/K9/K12 측정 방법 + W1~W4 활동 정의 (FX-REQ-157 DONE)
- [x] Phase 4 최종 Go/Pivot/Kill 판정 기준 수치화 (FX-REQ-157 DONE)
- [x] SPEC.md §2/§5/§6 Sprint 32 반영

### Sprint 35 — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 ✅
- [x] D1 migration 0021 — model_execution_metrics 테이블 + 인덱스 4개 (FX-REQ-143 DONE)
- [x] ModelMetricsService — recordExecution + getModelQuality + getAgentModelMatrix (FX-REQ-143 DONE)
- [x] GET /tokens/model-quality + GET /tokens/agent-model-matrix endpoints (FX-REQ-143 DONE)
- [x] Sprint 워크플로우 템플릿 3종 — Standard(10노드) + Fast(6노드) + Review-Heavy(9노드) (FX-REQ-142 DONE)
- [x] 조건 평가기 3종 — match_rate_met + test_coverage_met + peer_review_approved (FX-REQ-142 DONE)
- [x] SprintContext 변수 체계 + GET /orgs/:orgId/workflows/sprint-templates (FX-REQ-142 DONE)
- [x] 테스트 +47 (630 total) + typecheck ✅ + PDCA 92% (1 iteration)

### Sprint 37 — ArchitectAgent + TestAgent ✅
- [x] architect-agent.ts — ArchitectAgent 서비스 (analyzeArchitecture + reviewDesignDoc + analyzeDependencies) (FX-REQ-138 DONE)
- [x] architect-prompts.ts — 아키텍처 분석 시스템 프롬프트 3종 (FX-REQ-138 DONE)
- [x] test-agent.ts — TestAgent 서비스 (generateTests + analyzeCoverage + suggestEdgeCases) (FX-REQ-139 DONE)
- [x] test-agent-prompts.ts — 테스트 생성 시스템 프롬프트 3종 (FX-REQ-139 DONE)
- [x] agent.ts routes — 4개 엔드포인트 추가 (architect 2 + test 2) (FX-REQ-138, FX-REQ-139 DONE)
- [x] agent.ts schemas — Architecture + Test 요청/응답 스키마 (FX-REQ-138, FX-REQ-139 DONE)
- [x] agent-orchestrator.ts — spec-analysis→ArchitectAgent, test-generation→TestAgent 위임 (FX-REQ-138, FX-REQ-139 DONE)
- [x] architect-agent.test.ts — 20개 테스트 (FX-REQ-138 DONE)
- [x] test-agent.test.ts — 28개 테스트 (FX-REQ-139 DONE)
- [x] typecheck ✅ + lint ✅ + 714 tests ✅ + 기존 회귀 0건 (PDCA 95%)

### Sprint 38 — SecurityAgent + QAAgent ✅
- [x] security-agent.ts — SecurityAgent 서비스 (scanVulnerabilities + analyzePRDiff + checkOWASPCompliance) (FX-REQ-140 DONE)
- [x] security-agent-prompts.ts — 보안 분석 시스템 프롬프트 3종 (FX-REQ-140 DONE)
- [x] qa-agent.ts — QAAgent 서비스 (runBrowserTest + validateAcceptanceCriteria + detectRegressions) (FX-REQ-141 DONE)
- [x] qa-agent-prompts.ts — QA 테스트 시스템 프롬프트 3종 (FX-REQ-141 DONE)
- [x] agent.ts routes — 4개 엔드포인트 추가 (security 2 + qa 2) (FX-REQ-140, FX-REQ-141 DONE)
- [x] agent.ts schemas — Security + QA 요청/응답 스키마 (FX-REQ-140, FX-REQ-141 DONE)
- [x] agent-orchestrator.ts — security-review→SecurityAgent, qa-testing→QAAgent 위임 (FX-REQ-140, FX-REQ-141 DONE)
- [x] security-agent.test.ts — 16개 테스트 (FX-REQ-140 DONE)
- [x] qa-agent.test.ts — 15개 테스트 (FX-REQ-141 DONE)
- [x] typecheck ✅ + lint ✅ + 745 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 39 — Fallback 체인 + 프롬프트 게이트웨이 + 피드백 루프 ✅
- [x] fallback-chain.ts — FallbackChainService (executeWithFallback + classifyError + recordFailover) (FX-REQ-144 DONE)
- [x] prompt-gateway.ts — PromptGatewayService (sanitize + abstractCode + 4종 기본규칙) (FX-REQ-149 DONE)
- [x] agent-feedback-loop.ts — AgentFeedbackLoopService (captureFailure + submitFeedback + applyLearning) (FX-REQ-150 DONE)
- [x] D1 migration 0023 — fallback_events + prompt_sanitization_rules + agent_feedback 3테이블 (FX-REQ-144, FX-REQ-149, FX-REQ-150 DONE)
- [x] agent.ts routes — 6개 엔드포인트 추가 (fallback 2 + gateway 2 + feedback 2) (FX-REQ-144, FX-REQ-149, FX-REQ-150 DONE)
- [x] typecheck ✅ + lint ✅ + 792 tests ✅ + 기존 회귀 0건 (PDCA 93%)

### Sprint 40 — InfraAgent + 에이전트 자기 평가 ✅
- [x] infra-agent.ts — InfraAgent 서비스 (analyzeInfra + simulateChange + validateMigration) (FX-REQ-145 DONE)
- [x] infra-agent-prompts.ts — 인프라 분석 시스템 프롬프트 3종 (FX-REQ-145 DONE)
- [x] agent-self-reflection.ts — AgentSelfReflection (reflect + shouldRetry + enhanceWithReflection 래퍼) (FX-REQ-148 DONE)
- [x] agent.ts routes — 5개 엔드포인트 추가 (infra 3 + reflection 2) (FX-REQ-145, FX-REQ-148 DONE)
- [x] agent-orchestrator.ts — infra-analysis→InfraAgent 위임, AgentTaskType 9→10종 (FX-REQ-145 DONE)
- [x] typecheck ✅ + lint ✅ + 835 tests ✅ + 기존 회귀 0건 (PDCA 91%)

### Sprint 41 — 에이전트 역할 커스터마이징 + 멀티모델 앙상블 투표 ✅
- [x] custom-role-manager.ts — CustomRoleManager (D1 CRUD + BUILTIN_ROLES 7종 + systemPromptOverride + custom:* 위임) (FX-REQ-146 DONE)
- [x] ensemble-voting.ts — EnsembleVoting (allSettled 병렬 + 3종 투표 majority/quality-score/weighted) (FX-REQ-147 DONE)
- [x] D1 migration 0024 — custom_agent_roles 테이블 (FX-REQ-146 DONE)
- [x] agent.ts routes — 7개 엔드포인트 추가 (custom-roles CRUD 5 + ensemble 2) (FX-REQ-146, FX-REQ-147 DONE)
- [x] typecheck ✅ + lint ✅ + 877 tests ✅ + 기존 회귀 0건 (PDCA 94%)

### Sprint 42 — 자동화 품질 리포터 + 에이전트 마켓플레이스 (Agent Evolution Track A 완결) ✅
- [x] automation-quality-reporter.ts — AutomationQualityReporter (5테이블 집계 + 6종 개선규칙 + 스냅샷 캐시) (FX-REQ-151 DONE)
- [x] agent-marketplace.ts — AgentMarketplace (publish + install + rate + 3 D1 테이블) (FX-REQ-152 DONE)
- [x] D1 migration 0025 — automation_quality_snapshots 테이블 (FX-REQ-151 DONE)
- [x] D1 migration 0026 — agent_marketplace_items + agent_marketplace_installs + agent_marketplace_ratings 테이블 (FX-REQ-152 DONE)
- [x] routes — 9개 엔드포인트 추가 (quality-report 3 + marketplace 6) (FX-REQ-151, FX-REQ-152 DONE)
- [x] typecheck ✅ + lint ✅ + 925 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 44 — KT DS SR 시나리오 구체화 (F116, Phase 5 고객 파일럿 준비) ✅
- [x] SrClassifier 서비스 — 규칙 기반 5종 SR 유형 자동 분류 (FX-REQ-116 DONE)
- [x] SrWorkflowMapper 서비스 — 유형별 에이전트 워크플로우 DAG 매핑 (FX-REQ-116 DONE)
- [x] sr.ts schemas — Zod 스키마 6종 + 응답 타입 2종 (FX-REQ-116 DONE)
- [x] sr.ts routes — 5개 엔드포인트 (CRUD + 워크플로우 실행) (FX-REQ-116 DONE)
- [x] D1 migration 0027 — sr_requests + sr_workflow_runs + 인덱스 4개 (FX-REQ-116 DONE)
- [x] SR 유형 분류 체계 문서 + 데모 시나리오 2종 (FX-REQ-116 DONE)
- [x] templates/kt-ds-sr/CLAUDE.md 업데이트 (FX-REQ-116 DONE)
- [x] typecheck ✅ + 953 tests ✅ + 기존 회귀 0건 (PDCA 95%)

### Sprint 45 — KPI 자동 수집 인프라 (Phase 5 온보딩 데이터 기반) ✅
- [x] useKpiTracker 훅 — Next.js usePathname() + useEffect로 page_view 자동 전송 (FX-REQ-158 DONE)
- [x] api-client.ts KPI 함수 — getKpiSnapshotTrend() + KpiSnapshot 타입 (FX-REQ-158 DONE)
- [x] CLI postRun hook — init/status/sync 완료 후 cli_invoke 이벤트 전송 (FX-REQ-159 DONE)
- [x] kpi_snapshots D1 테이블 — 일별 KPI 집계 스냅샷 (FX-REQ-160 DONE)
- [x] Cron 집계 로직 — K7(WAU) + K8(에이전트 완료율) + K11(SDD 정합률) 자동 산출 (FX-REQ-160 DONE)
- [x] KPI 대시보드 실데이터 바인딩 — Phase4Kpi API → UI 연결 (FX-REQ-161 DONE)
- [x] typecheck ✅ + lint ✅ + 961+131+68 tests ✅ + 기존 회귀 0건 (PDCA 97%)

### Sprint 50 — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯 ✅
- [x] 초대 링크 생성 UI + 복사 버튼 — 관리자 멤버 화면에서 1클릭 URL 생성 (FX-REQ-173 DONE)
- [x] 비밀번호 설정 페이지 — `/invite/[token]` public route, 토큰 검증 + 비밀번호 입력 (FX-REQ-173 DONE)
- [x] 초대 수락 자동 로그인 — 비밀번호 설정 완료 → JWT 발급 → /getting-started 리다이렉트 (FX-REQ-173 DONE)
- [x] 초대 상태 UI 개선 — 멤버 목록에 대기/수락/만료 뱃지 표시 (FX-REQ-173 DONE)
- [x] 플로팅 피드백 위젯 — `(app)/layout.tsx` 전역 삽입, NPS + 코멘트 (FX-REQ-174 DONE)
- [x] 피드백 컨텍스트 자동 첨부 — 현재 페이지 경로 + 세션 시간 (FX-REQ-174 DONE)
- [x] 주간 사용 요약 API — `GET /kpi/weekly-summary` (FX-REQ-174 DONE)
- [x] 프로덕션 배포 — Sprint 48~51 코드 Workers 반영 (Version 570efd7c, 세션 #104)
- [x] typecheck ✅ + lint ✅ + tests 통과 + PDCA 100%

### 미배정 — Phase 3 잔여

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F92 | 멀티테넌시 고도화 — org 전환 UI, org별 격리 강화, 초대/권한 관리 (FX-REQ-092, P1) | v1.8+ | ✅ | Match Rate 90% |
| F93 | GitHub 양방향 동기화 고도화 — PR 자동 리뷰 실 연동, Issue→Task 자동 생성 (FX-REQ-093, P1) | v1.8.0 | ✅ | Sprint 21, Match Rate 93% |
| F94 | Slack 고도화 — Interactive 메시지 (승인/거절 버튼), 채널별 알림 설정 (FX-REQ-094, P2) | v1.8+ | ✅ | Sprint 22, Match Rate 99% |
| F95 | PlannerAgent 고도화 — 실 LLM 기반 코드베이스 분석 정확도 개선 (FX-REQ-095, P2) | v1.8+ | ✅ | Sprint 22, Match Rate 91% |
| F96 | v1.7.0 프로덕션 배포 — Sprint 19 코드 + D1 migration remote 적용 (FX-REQ-096, P0) | v1.7 | ✅ | Workers 50e9c494 배포 완료 |
| F97 | 테스트 커버리지 확장 — E2E (멀티테넌시, GitHub/Slack 흐름) (FX-REQ-097, P2) | v1.8+ | ✅ | Sprint 23, Match Rate 92% |

### Phase 3 Sprint 0 — 기술 스택 점검 (통합 착수 전 필수, PRD v5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F98 | 기술 스택 점검 스프린트 — Discovery-X/AI Foundry/AXIS DS 호환성 분석 + 매트릭스 작성 (FX-REQ-098, P0) | v2.1 | ✅ | Sprint 25, Match 100%, Kill→Go |

### Phase 3-B — 기술 기반 완성 (PRD v5 G-items)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F99 | Git↔D1 Reconciliation Job — Cron Trigger 기반 자동 정합성 복구 (FX-REQ-099, P1) | v2.0 | ✅ | Sprint 27, Match 94%, Cron 6h + ReconciliationService |
| F100 | KPI 측정 인프라 — CLI 호출/대시보드 사용 로깅 + 분석 대시보드 (FX-REQ-100, P0) | v2.0 | ✅ | Sprint 27, Match 94%, KpiLogger + /analytics 대시보드 |
| F119 | Foundry-X 정체성 및 소개 페이지 업데이트 — PRD v5 기반 서비스 소개·로드맵·버전 관리 (FX-REQ-119, P0) | v2.0 | ✅ | F74 후속, Match Rate 98% |
| F101 | 에이전트 hook 실패 자동 수정 루프 — 최대 2회 시도 + human escalation (FX-REQ-101, P1) | v2.0 | ✅ | Sprint 27, Match 94%, AutoFixService LLM 2-retry |
| F102 | 에이전트 자동 rebase — 최대 3회 시도 + human escalation + 상태 복구 (FX-REQ-102, P1) | v2.2 | ✅ | Sprint 28, Match 93%, AutoRebaseService 3-retry |
| F103 | Semantic Linting 실효성 — 커스텀 ESLint 룰에 수정 코드 예시 포함 (FX-REQ-103, P2) | v2.2 | ✅ | Sprint 28, Match 95%, 3룰 hasSuggestions |

### Phase 3-C — AXIS DS UI 전환 (PRD v5 통합 Step 1)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F104 | AXIS DS UI 전환 — shadcn/ui → AXIS DS 컴포넌트 + 디자인 토큰 통합 (FX-REQ-104, P1) | v2.1 | ✅ | Sprint 25, Match 95%, 11 컴포넌트 전환 |

### Phase 3-D — Plumb Track B 판정

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F105 | Plumb Track B 판정 — Track A 실사용 데이터 기반 전환 판단 (FX-REQ-105, P2) | v2.2 | ✅ | Sprint 28, Stay Track A, ADR-001, 재판정 2026-09 |

### Phase 4-A — 프론트엔드 통합 (PRD v5 통합 Step 2)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F106 | 프론트엔드 통합 — Discovery-X/AI Foundry UI를 Foundry-X 서브 라우트로 통합 (FX-REQ-106, P1) | v2.1 | ✅ | Sprint 26, iframe+postMessage SSO, Match 85% |
| F107 | 멀티 프로젝트 대시보드 — 크로스 프로젝트 건강도 + 에이전트 활동 요약 (FX-REQ-107, P1) | v2.0 | ✅ | Sprint 24 (구 F98), Match 100% |

### Phase 4-B — 인증/테넌시 통합 (PRD v5 통합 Step 3)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F108 | 인증 SSO 통합 — 단일 로그인으로 3개 서비스 접근 + Org별 서비스 권한 (FX-REQ-108, P1) | v2.1 | ✅ | Sprint 26, Hub Token+org_services, Match 100% |

### Phase 4-C — API 통합 (PRD v5 통합 Step 4)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F109 | API BFF→통합 — Foundry-X Workers가 서비스 API 프록시 → 모듈 통합 (FX-REQ-109, P1) | v2.1 | ✅ | Sprint 26, Service Bindings+HTTP 폴백, Match 94% |
| F110 | Webhook 일반화 + Jira 연동 — WebhookRegistry + JiraAdapter 양방향 동기화 (FX-REQ-110, P2) | v2.0 | ✅ | Sprint 24 (구 F99), Match 95% |

### Phase 4-D — 데이터 통합 (PRD v5 통합 Step 5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F111 | D1 스키마 통합 — 크로스 서비스 쿼리 + Discovery-X→Foundry-X 메타데이터 연결 (FX-REQ-111, P1) | v2.1 | ✅ | Sprint 26, entity_registry+links, Match 95% |

### Phase 4-E — 외부 연동 + 온보딩

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F112 | GitLab API 지원 — octokit + GitLab API 두 플랫폼 추상화 (FX-REQ-112, P3) | v3.0+ | 📋 | **X5 재평가: DEFER**. F117 외부 파일럿 선행 필요, 타겟 고객사 GitLab 요구 발생 시 재평가. [[FX-PLAN-X5]] |
| F113 | 모니터링 + 옵저버빌리티 — Workers Analytics + 에러 트래킹 + 알림 (FX-REQ-113, P2) | v2.0 | ✅ | Sprint 24 (구 F100), Match 90% |
| F114 | 실사용자 온보딩 — 내부 5명 강제 온보딩 + 주간 피드백 + 교육 자료 (FX-REQ-114, P0) | v2.3 | ✅ | Sprint 29, F120~F122 기술 기반 완료, 프로세스 진행 중 |
| F120 | 온보딩 가이드 UI — /getting-started 페이지 + 인터랙티브 투어 + FAQ (FX-REQ-120, P0) | v2.3 | ✅ | Sprint 29, Match 88%, 기능카드5+FAQ5+NPS폼 |
| F121 | 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + 피드백 대시보드 위젯 (FX-REQ-121, P0) | v2.3 | ✅ | Sprint 29, Match 100%, POST+GET feedback+NpsSummaryWidget |
| F122 | 온보딩 체크리스트 — 사용자별 진행률 추적 + 완료 알림 + KPI 연동 (FX-REQ-122, P1) | v2.3 | ✅ | Sprint 29, Match 97%, GET+PATCH progress+KpiLogger 연동 |
| F115 | 에이전트 워크플로우 빌더 — 파이프라인 에디터 + 템플릿 (FX-REQ-115, P2) | v2.0 | ✅ | Sprint 24 (구 F101), Match 90% |

### Sprint 30 — 프로덕션 배포 동기화 + Phase 4 Go 판정 + 품질 강화 (v2.4.0)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F123 | 프로덕션 배포 동기화 — D1 0018 remote + Workers v2.2.0 배포 + smoke test (FX-REQ-123, P0) | v2.4 | ✅ | Sprint 30, Workers v2.2.0 배포 완료, Match 100% |
| F124 | 프론트엔드 통합 개선 — F106 잔여(85%→) 네비게이션 일관성 + 데이터 공유 강화 (FX-REQ-124, P1) | v2.4 | ✅ | Sprint 30, postMessage 6종+Skeleton+ErrorBoundary, Match 86% |
| F125 | Phase 4 Go 판정 준비 — KPI 대시보드(K7/K8/K9) 추적 UI + Go 판정 문서 (FX-REQ-125, P1) | v2.4 | ✅ | Sprint 30, Conditional Go, Match 100% |
| F126 | Harness Evolution Rules 자동 감지 — 위반 감지 + 경고 알림 (FX-REQ-126, P2) | v2.4 | ✅ | Sprint 30, 4규칙+2ep+SSE, Match 88% |
| F127 | PRD↔구현 정합성 갱신 — MVP 체크리스트 + codegen-core 재활용 판정 (FX-REQ-127, P2) | v2.4 | ✅ | Sprint 30, MVP 6/6 ✅+codegen 보류, Match 100% |
| F128 | E2E 테스트 보강 + 에러 핸들링 — Phase 4 통합 경로 E2E + API 에러 응답 표준화 (FX-REQ-128, P1) | v2.4 | ✅ | Sprint 30, ErrorResponse+E2E 4시나리오, Match 72%→ |

### Sprint 31 — 프로덕션 완전 동기화 + SPEC 정합성 + Match Rate 보강 + 온보딩 킥오프 (v2.5)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F129 | 프로덕션 완전 동기화 — D1 0018~0019 remote + Workers v2.4.0 배포 + smoke test (FX-REQ-129, P0) | v2.5 | ✅ | Sprint 31, Workers fe2f72a7, Match 100% |
| F130 | SPEC/문서 정합성 보정 — §1/§2/§3 갱신 + Execution Plan 체크박스 + MEMORY 동기화 (FX-REQ-130, P0) | v2.5 | ✅ | Sprint 31, drift 9건→0건, Match 95% |
| F131 | Phase 4 잔여 Match Rate 보강 — F128 E2E 72%→90%+ / F124 FX_NAVIGATE 연결 86%→90%+ (FX-REQ-131, P1) | v2.5 | ✅ | Sprint 31, E2E +6, router.push 연결, Match 90% |
| F132 | 온보딩 킥오프 체크리스트 — 시나리오 5종 + 프로세스 문서 + 킥오프 준비 (FX-REQ-132, P1) | v2.5 | ✅ | Sprint 31, S1~S5 + Go/Kill 기준, Match 95% |
| F133 | 로그인/회원가입 UI + 사이드바 인증 — /login 페이지 + auth-store + fetchApi 401 수정 (FX-REQ-133, P0) | v2.5 | ✅ | 소급 등록, 세션 #73 |

### Sprint 32 — PRD v5 완전성 점검 + Phase 4→5 전환 로드맵

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F156 | PRD v5 완전성 점검 — G1~G12 갭 + Phase 3~4 F-item 완료 검증 + Phase 5 미착수 분류 (FX-REQ-156, P0) | Sprint 32 | ✅ | 거버넌스, G 9/12완료+1진행+2수요대기 |
| F157 | Phase 4→5 전환 로드맵 — 온보딩 4주 추적 계획 + Phase 5 착수 기준 + Layer 1~4 실행 순서 (FX-REQ-157, P0) | Sprint 32 | ✅ | 거버넌스, Track A/B + KT DS SR 로드맵 |

### Sprint 33 — Agent Evolution Track B: 개발 도구 도입

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F153 | gstack 스킬 설치 — /review, /qa, /ship 등 개발 도구 도입 (FX-REQ-153, P0) | Sprint 33 | ✅ | 25개 스킬 인식, Match Rate 94% |
| F154 | claude-code-router 설정 — 로컬 프록시 멀티모델 라우팅 (FX-REQ-154, P1) | Sprint 33 | ✅ | ccr + config.json, OpenRouter+Anthropic |
| F155 | OpenRouter API 키 발급 — 개발/테스트용 계정 + API 키 확보 (FX-REQ-155, P0) | Sprint 33 | ✅ | .dev.vars 저장, 하드코딩 0건 |

### Phase 5 — 고객 파일럿

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F116 | KT DS SR 시나리오 구체화 — 첫 타겟 SR 유형 정의 + 워크플로우 설계 (FX-REQ-116, P1) | Sprint 44 | ✅ | PRD v5 Q4 해소, Match Rate 95%, [[FX-RPRT-044]] |
| F117 | 외부 고객사 파일럿 — SR 자동화 성공 사례 기반 제안 + 데모 (FX-REQ-117, P1) | Phase 5c | 🔧 | **X5 재평가: UPGRADE**. 내부 기술 준비 완료(F116 ✅ + F121~F122 ✅ + F166 ✅ + F170~F174 ✅). 비즈니스 선결: 타겟 외부 고객사 지명 대기. [[FX-PLAN-X5]] |
| F118 | 모노리포→멀티리포 분리 검토 — 고객 배포 요구에 따라 판단 (FX-REQ-118, P3) | — | 🗑️ | **X5 재평가: ARCHIVE**. AX-BD MSA Restructuring(FX-DSGN-MSA-001 v4, Phase 20 Sprint 179~188)에 rationale 흡수 — 중복 제거. [[FX-PLAN-X5]] |
| F134 | 프로젝트 버전 관리 점검 — SemVer 원칙 조사 + 현행 체계 개선 기획 (FX-REQ-134, P1) | Sprint 32 | ✅ | Governance, Pre-Production 버전 정책 정비, Match Rate 96% |

### Phase 5 — Agent Evolution (멀티모델 + 역할 에이전트 진화)

> PRD: `docs/specs/agent-evolution/prd-final.md` | 판정: Conditional (보안/인력/Phase4 조건부)

#### Track A: 플랫폼 기능

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F135 | OpenRouter 게이트웨이 통합 — OpenRouterRunner 구현, 단일 API 키로 300+ 모델 접근 (FX-REQ-135, P0) | Sprint 34 | ✅ | Agent Evolution A1, OpenRouterRunner+prompt-utils+3-way 팩토리, Match Rate 97% |
| F136 | 태스크별 모델 라우팅 — task_type별 최적 모델 자동 선택, D1 routing rules 테이블 (FX-REQ-136, P0) | Sprint 36 | ✅ | Agent Evolution A2, ModelRouter + createRoutedRunner, Match Rate 96% |
| F137 | Evaluator-Optimizer 패턴 — 생성→평가→개선 루프, 최대 반복+품질 임계값 (FX-REQ-137, P0) | Sprint 36 | ✅ | Agent Evolution A3, EvaluatorOptimizer + 3종 EvaluationCriteria, Match Rate 96% |
| F138 | ArchitectAgent — 설계 문서 검토 + 아키텍처 판단 + 의존성 분석 (FX-REQ-138, P0) | Sprint 37 | ✅ | Agent Evolution A4, 3메서드+20 tests, Match Rate 95% |
| F139 | TestAgent — 변경 코드 기반 테스트 자동 생성 + 커버리지 분석 (FX-REQ-139, P0) | Sprint 37 | ✅ | Agent Evolution A5, 3메서드+28 tests, Match Rate 95% |
| F140 | SecurityAgent — OWASP Top 10 보안 취약점 스캔 + PR diff 분석 (FX-REQ-140, P1) | Sprint 38 | ✅ | Agent Evolution A6, scan+prDiff+owasp 3메서드+16 tests, Match Rate 97% |
| F141 | QAAgent 브라우저 테스트 — Playwright/Chromium 실제 UI 테스트 실행 (FX-REQ-141, P1) | Sprint 38 | ✅ | Agent Evolution A7, browserTest+acceptance+regression 3메서드+15 tests, Match Rate 97% |
| F142 | Sprint 워크플로우 템플릿 — Think→Plan→Build→Review→Test→Ship→Reflect DAG (FX-REQ-142, P1) | Sprint 35 | ✅ | 3종 템플릿+3종 조건+SprintContext, Match 96% |
| F143 | 모델 비용/품질 대시보드 — 에이전트별 토큰 사용량, 비용, 품질 점수 시각화 (FX-REQ-143, P1) | Sprint 35+43 | ✅ | API: Sprint 35, UI: Sprint 43 (TokensPage Model Quality 탭+히트맵, 16 tests, 95%) |
| F144 | Fallback 체인 — 모델 응답 실패 시 자동 대체 모델 전환 (FX-REQ-144, P1) | Sprint 39 | ✅ | Agent Evolution A10, FallbackChainService+D1 0023+20 tests, Match Rate 93% |
| F145 | InfraAgent — 샌드박스 환경에서 인프라 변경 시뮬레이션 + IaC 출력 (FX-REQ-145, P2) | Sprint 40 | ✅ | Agent Evolution A11, InfraAgent 3메서드+InfraPrompts, Match Rate 91% |
| F146 | 에이전트 역할 커스터마이징 — 사용자 정의 역할(프롬프트/도구/모델) (FX-REQ-146, P2) | Sprint 41 | ✅ | Agent Evolution A12, CustomRoleManager+D1 0024+systemPromptOverride, Match Rate 94% |
| F147 | 멀티모델 앙상블 투표 — 3~5개 모델 병렬 처리 + 결과 종합 (FX-REQ-147, P2) | Sprint 41 | ✅ | Agent Evolution A13, EnsembleVoting+3종 전략+Promise.allSettled, Match Rate 94% |
| F148 | 에이전트 자기 평가 — 자기 반성 루프 (FX-REQ-148, P2) | Sprint 40 | ✅ | Agent Evolution A14, AgentSelfReflection+enhanceWithReflection, Match Rate 91% |
| F149 | 프라이빗 프롬프트 게이트웨이 — 코드 요약/추상화만 LLM 전송, 보안 근본 차단 (FX-REQ-149, P1) | Sprint 39 | ✅ | Agent Evolution A15, PromptGatewayService+4종 기본규칙+코드 추상화, Match Rate 93% |
| F150 | AI-휴먼 하이브리드 피드백 루프 — 자동화 실패 시 즉시 피드백 수집+학습 (FX-REQ-150, P1) | Sprint 39 | ✅ | Agent Evolution A16, AgentFeedbackLoopService+프롬프트 힌트 학습, Match Rate 93% |
| F151 | 자동화 품질 리포터 — 주간 자동화 품질 리포트 자율 생성 (FX-REQ-151, P2) | Sprint 42 | ✅ | Agent Evolution A17, AutomationQualityReporter+D1 0025+24 tests, Match Rate 97% |
| F152 | 에이전트 마켓플레이스 — 역할/프롬프트 공유 내부 마켓 (FX-REQ-152, P2) | Sprint 42 | ✅ | Agent Evolution A18, AgentMarketplace+D1 0026+24 tests, Match Rate 97% |

### Sprint 45 — KPI 자동 수집 인프라 (Phase 5 온보딩 데이터 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F158 | 웹 대시보드 페이지뷰 자동 추적 — Next.js 라우트 변경 시 page_view 이벤트 자동 전송 (FX-REQ-158, P0) | Sprint 45 | ✅ | useKpiTracker + 300ms throttle, Match 97% |
| F159 | CLI 호출 자동 KPI 로깅 — init/status/sync 실행 시 cli_invoke 이벤트 자동 전송 (FX-REQ-159, P1) | Sprint 45 | ✅ | KpiReporter + AbortController 3s, Match 97% |
| F160 | K7/K8/K11 자동 집계 Cron — 일별 KPI 스냅샷 + kpi_snapshots D1 테이블 (FX-REQ-160, P0) | Sprint 45 | ✅ | generateDailySnapshot + D1 0028, Match 97% |
| F161 | KPI 대시보드 실데이터 연결 — F125 KPI UI에 자동 수집 데이터 바인딩 (FX-REQ-161, P1) | Sprint 45 | ✅ | GET /kpi/snapshot-trend + api-client, Match 97% |

#### Track B: 개발 도구 도입

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F153 | gstack 스킬 설치 — /review, /qa, /ship 등 개발 도구 도입 (FX-REQ-153, P0) | Sprint 33 | ✅ | Agent Evolution B1, 세션 #78 완료 |
| F154 | claude-code-router 설정 — 로컬 프록시 멀티모델 라우팅 (FX-REQ-154, P1) | Sprint 33 | ✅ | Agent Evolution B2, 세션 #78 완료 |
| F155 | OpenRouter API 키 발급 — 개발/테스트용 계정 + API 키 확보 (FX-REQ-155, P0) | Sprint 33 | ✅ | Agent Evolution B3, 세션 #78 완료 |

### Phase 5 — 고객 파일럿 + 수주 (PRD v8 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F162 | Azure 마이그레이션 PoC — 핵심 모듈 3개(에이전트 오케스트레이션, 웹 대시보드, Git 연동) Azure 환경 구동 검증 (FX-REQ-162, P0) | Sprint 46 | ✅ | PRD v8 Conditional 조건 #2, Workers→Functions+D1→SQL 검증 |
| F163 | SI 파트너 R&R 확정 — 커스터마이징/운영/보안 역할 분담 정의 (FX-REQ-163, P0) | Sprint 46 | ✅ | PRD v8 Conditional 조건 #1, 외부 파트너 범위 확정 |
| F164 | 고객사 커스터마이징 범위 정의 — 배포/인증/스키마 커스텀 범위 확정 + 플러그인 시스템 설계 + 표준 템플릿 (FX-REQ-164, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #3, Q12 해소 |
| F165 | AI 생성 코드 법적/윤리적 정책 수립 — 저작권, 오픈소스 라이선스, 감사 로그 API (FX-REQ-165, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #5, Q13 해소 |
| F166 | 외부 AI API 데이터 거버넌스 정책 — 데이터 반출 제한, PII 마스킹 미들웨어, KT DS 보안 체크리스트 (FX-REQ-166, P1) | Sprint 47 | ✅ | PRD v8 Conditional 조건 #5, Q14 해소 |
| F167 | ML 하이브리드 SR 분류기 — 규칙 기반 오분류 데이터 수집 후 ML 모델 결합 (FX-REQ-167, P1) | Sprint 48 | ✅ | Phase 5b, F116 규칙 기반 확장, Match Rate 95% |
| F168 | SR 관리 전용 대시보드 UI — SR 분류/워크플로우 상태 시각화 (FX-REQ-168, P2) | Sprint 48 | ✅ | Phase 5 고객 파일럿, Match Rate 95% |
| F169 | 고객 데모 환경 구축 — 엔드투엔드 SR 자동 처리 시나리오 데모 배포 (Azure/Cloudflare) (FX-REQ-169, P0) | Sprint 46 | ✅ | Phase 5 수주 필수, 외부 접근 가능 데모 |
| F170 | Adoption KPI 대시보드 — 온보딩 팀 현황 API + Analytics UI + 시드 데이터 6명 (FX-REQ-170, P0) | Sprint 48 | ✅ | F114 Adoption 데이터 가시성 확보, Conditional #4 기술 준비 완료 |
| F171 | 대시보드 IA 재설계 — 업무 동선 중심 메뉴 구조 재편 + 중복 메뉴 통합 + 역할별 랜딩 (FX-REQ-171, P0) | Sprint 49 | ✅ | 10→6그룹 재편, 숨겨진 페이지 3개 노출, Match 95% |
| F172 | 인터랙티브 온보딩 투어 — 첫 로그인 가이드 + 스텝별 툴팁 + 업무별 퀵스타트 (FX-REQ-172, P1) | Sprint 49 | ✅ | 순수 React 자체 구현(SVG spotlight + axis-glass), 6스텝 투어 |
| F173 | 팀원 셀프 온보딩 플로우 — 초대 링크 복사 + 비밀번호 설정 페이지 + 자동 로그인 + 투어 자동 시작 (FX-REQ-173, P0) | Sprint 50 | ✅ | Phase 5 Conditional #4 실질 해소, Match Rate 100% |
| F174 | 인앱 피드백 위젯 — 전역 플로팅 피드백 + 컨텍스트 자동 첨부 + 주간 사용 요약 API (FX-REQ-174, P1) | Sprint 50 | ✅ | 전역 피드백 + weekly-summary API, Match Rate 100% |
| ~~F175~~ | ~~사업 아이템 분류 Agent~~ → F182로 대체 (FX-REQ-175) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F176~~ | ~~유형별 분석 파이프라인~~ → F182+F184로 대체 (FX-REQ-176) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F177~~ | ~~발굴 결과 패키징~~ → F185로 대체 (FX-REQ-177) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| ~~F178~~ | ~~AI 멀티 페르소나 사전 평가~~ → F187로 대체 (FX-REQ-178) | — | — | [[FX-SPEC-BDP-002-PRD]] 재정의 |
| F179 | 사업 아이템 수집 채널 통합 — Agent 자동 수집 + Field-driven + IDEA Portal 연계 (FX-REQ-179, P1) | Sprint 57 | ✅ | 1단계 수집 자동화 |
| F180 | 사업계획서 초안 자동 생성 — Discovery-X 발굴 결과 기반 B2B 사업계획서 초안 (FX-REQ-180, P2) | Sprint 58 | ✅ | 3단계 형상화 |
| F181 | Prototype 자동 생성 — 디자인시스템 기반 사업 아이템 데모 Prototype 자동 생성 (FX-REQ-181, P2) | Sprint 58 | ✅ | 3단계 형상화, 손해사정 Prototype 참고 |
| F182 | 5시작점 분류 + 경로 안내 — 아이디어/시장·타겟/고객문제/기술/기존서비스 시작점 식별 + 분석 경로 매핑 (FX-REQ-182, P0) | Sprint 52 | ✅ | Match Rate 97%, 28 tests, 3 endpoints, 3 Web 컴포넌트 |
| F183 | Discovery 9기준 체크리스트 + 예외처리 — 9개 완료기준 충족 관리 + 미달성 시 재분석/루프백 (FX-REQ-183, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #3+#6 |
| F184 | pm-skills 실행 가이드 + 컨텍스트 관리 — 18개 스킬 단계별 안내 + 분석 데이터 흐름 자동화 (FX-REQ-184, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #4+#7 |
| F185 | PRD 자동 생성 — Discovery 9기준 충족 시 분석 결과→PRD 템플릿 자동 매핑 (FX-REQ-185, P0) | Sprint 53 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.1 #5 |
| F186 | 다중 AI 검토 파이프라인 — PRD를 ChatGPT/Gemini/DeepSeek API로 자동 검토 + 스코어카드 (FX-REQ-186, P1) | Sprint 55 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #1, ax-req-interview 연동 |
| F187 | 멀티 페르소나 사전 평가 — KT DS 8개 역할 에이전트 AI 평가 + 레이더 차트 + G/K/R 판정 (FX-REQ-187, P1) | Sprint 55 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #2, BDP-001 2-9 |
| F188 | Six Hats 토론 — PRD에 대한 6모자 관점 20턴 토론 자동 수행 (FX-REQ-188, P2) | Sprint 56 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #3 |
| F189 | Discovery 진행률 대시보드 — 9개 기준 달성 현황 시각화 (FX-REQ-189, P2) | Sprint 56 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #4 |
| F190 | 시장/트렌드 데이터 자동 연동 — 외부 시장·경쟁사·트렌드 데이터 API 연동 + 자동 요약 (FX-REQ-190, P2) | Sprint 57 | ✅ | [[FX-SPEC-BDP-002-PRD]] §4.2 #5 |

### Phase 5c — 방법론 플러그인 아키텍처 (BDP 6단계 메가 프로세스 위 다중 방법론 지원)

> 배경: AX BD팀은 상황/목표별 최적 방법론을 커스텀한다. 초기 3개 방법론(BDP, pm-skills, 추가1)을 지원하고 이후 추가/수정에 대응.
> 원칙: 메가 프로세스(BDP 6단계: 수집→발굴→형상화→검증→제품화→GTM)는 불변. 방법론이 커스텀하는 구간은 **분석 파이프라인 + 검증 기준**.

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F191 | 방법론 레지스트리 + 라우터 — MethodologyModule 인터페이스 정의 + DB 등록 + 아이템 특성 기반 방법론 자동 추천 (FX-REQ-191, P0) | Sprint 59 | ✅ | 메가 프로세스 공통 레이어, matchScore() 기반 추천 |
| F192 | BDP 방법론 모듈화 — 기존 BDP 서비스(ItemClassifier/StartingPoint/DiscoveryCriteria/AnalysisContext/PrdGenerator)를 MethodologyModule 구현으로 리팩토링 (FX-REQ-192, P0) | Sprint 59 | ✅ | 기존 코드 래핑, 기능 변경 없음 |
| F193 | pm-skills 방법론 모듈 — pm-skills 전용 분석 파이프라인 + 스킬 실행 가이드 + 검증 기준 세트 구현 (FX-REQ-193, P1) | Sprint 60 | ✅ | 10개 내부 스킬 기반 파이프라인, HITL 방식 |
| F194 | pm-skills 검증 기준 설계 — 18개 스킬 구조에 맞는 완료 기준 세트 (BDP 9기준과 독립, 스킬별 산출물 기반 체크) (FX-REQ-194, P0) | Sprint 60 | ✅ | OST 완성도, BMC 충족도 등 스킬 특화 기준, F193과 동일 Worker |
| F195 | 방법론 관리 UI — 등록된 방법론 목록 + 아이템별 방법론 선택/변경 + 진행률 통합 뷰 (FX-REQ-195, P1) | Sprint 60 | ✅ | F191 레지스트리 API 기반 독립 UI 구현 |

### Phase 5d — AX BD Ideation MVP (PRD v1.4 Phase 1, BMC 에디터 + AI 에이전트)

> 배경: AX BD팀의 사업개발 라이프사이클을 AI 에이전트와 함께 수행할 수 있는 조직 협업 플랫폼을 Foundry-X 위에 구축.
> 핵심: BMC(비즈니스 모델 캔버스) 에디터 + BMCAgent/InsightAgent 2종 + 아이디어 관리. Git SSOT 원칙 유지.
> PRD: `docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md` (FX-PLAN-AX-BD-001)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F197 | BMC 캔버스 CRUD — 9개 블록 생성·수정·저장, Git 커밋 대기 상태 관리, 동시 편집 충돌 안내 (FX-REQ-AX-001, P0) | Sprint 61 | ✅ | BE: ax-bd routes+services+D1, FE: BMC 에디터 UI. D1 ax_bmcs+ax_bmc_blocks |
| F198 | 아이디어 등록 및 태그 — 제목·설명·태그 등록, Git+D1 하이브리드 저장, 태그 필터링 (FX-REQ-AX-007, P0) | Sprint 61 | ✅ | BE: ideas CRUD+webhook 동기화, FE: 아이디어 목록+등록 UI. D1 ax_ideas |
| F199 | BMC 초안 자동 생성 (BMCAgent) — 아이디어 한 줄 입력→9개 블록 초안 생성, PromptGateway 마스킹 필수 (FX-REQ-AX-004, P0) | Sprint 62 | ✅ | claude-sonnet-4-6, Rate Limit 분당 5회, F149 경유, X-Gateway-Processed 헤더 검증 |
| F200 | BMC 버전 히스토리 조회 — Git 커밋 단위 변경 이력 조회 + 특정 버전 복원 (FX-REQ-AX-002, P1) | Sprint 62 | ✅ | Git log 기반, 복원 시 새 커밋 생성. 재배치B: 63→62 (F197만 의존, F199와 병렬) |
| F201 | BMC 블록 인사이트 추천 — 블록 편집 중 BMCAgent가 개선 제안 3개 사이드패널 표시 (FX-REQ-AX-005, P1) | Sprint 65 | ✅ | 5초 디바운스, 20자 이상 트리거, F199 BMCAgent 재사용 |
| F202 | 시장 키워드 요약 (InsightAgent) — 키워드 기반 웹 검색 시장 동향 요약, 비동기 Job+SSE (FX-REQ-AX-006, P1) | Sprint 65 | ✅ | web_search MCP, Rate Limit 분당 3회, F149 경유, BMC 붙여넣기 연동 |
| F203 | 아이디어-BMC 연결 — 아이디어→BMC 생성/기존 BMC 연결, 양방향 링크 Git 커밋 (FX-REQ-AX-008, P1) | Sprint 64 | ✅ | F197+F198 선행 필수, meta.json 양방향 링크. 재배치B: 63→64 (62/63과 병렬 가능) |
| F204 | BMC 댓글 및 협업 — 블록별 댓글, @멘션 알림, D1 전용 저장 (FX-REQ-AX-003, P1) | Sprint 64 | ✅ | D1 ax_bmc_comments, Git 커밋 대상 아님, 통합 테스트 포함 |

### 인프라 개선

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F196 | Sprint Worktree UX 개선 — tmux 3pane→1pane 간소화 + ccw 커맨드로 초기 실행 자동화 (FX-REQ-196, P0) | — | ✅ | 세션 #117 완료: 1pane+ccw+ccw-auto+suppressTitle+sprint-done kill+post-session+merge-monitor |
| F211 | Sprint 자동화 파이프라인 — autopilot(WT PDCA 전사이클) + pipeline(Master 배치 오케스트레이션) + signal/checkpoint/merge-gate (FX-REQ-203, P0) | — | ✅ | 세션 #117: ax-sprint-autopilot+ax-sprint-pipeline 스킬, ccw-auto, sprint-post-session, sprint-merge-monitor, 36 tests GREEN |

### 소통 및 전략

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F205 | Foundry-X 소개 상시 최신화 — README.md + Homepage 재구성 (1차 독자: AX BD팀, 2차: 타부서/의사결정권자). "무엇을 하고, 왜 만들었고, 어떻게 활용하는가"에 명쾌히 답할 수 있어야 함 (FX-REQ-197, P1) | Sprint 66 | ✅ | Improvement, GitHub README + fx.minu.best Landing Section 재설계 |
| F206 | AX 사업개발 A-to-Z 기능 정의 — Discovery-X/AI Foundry 통합 또는 MSA 연동 설계 + 평가관리 프레임워크 등 AI 하네스 필요 구성요소 정리 (FX-REQ-198, P0) | — | ✅ | prd-final 확정 (docs/specs/ax-bd-atoz/prd-final.md), 하위 F207~F210 도출 |

### Phase 5e — AX BD A-to-Z 하위 기능 (F206 prd-final 기반)

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F207 | 평가관리 프레임워크 MVP — KPI 입력/현황판/Go-Kill 판단/이력 관리 + 포트폴리오 대시보드 (FX-REQ-199, P0) | Sprint 65 | ✅ | 7단계 평가 핵심, D1 ax_evaluations+ax_kpis, 독립 구현 가능 |
| F208 | Discovery-X API 인터페이스 계약 — 수집 데이터 스키마/인증/Rate Limit/Fallback 정의 + OpenAPI spec (FX-REQ-200, P1) | Sprint 66 | ✅ | F179(수집 채널)과 별개, 연동 계약 문서 + 타입 정의 |
| F209 | AI Foundry 기능 흡수 — 프로토타입/PoC 모듈을 Foundry-X 내부 서비스로 이관 설계 + 마이그레이션 (FX-REQ-201, P1) | Sprint 67 | ✅ | F181(Prototype)과 연계, 제품화 단계 통합 |
| F210 | 비밀번호 재설정 — Password Reset 이메일 플로우 + 토큰 관리 (FX-REQ-202, P2) | Sprint 67 | ✅ | 인증 기능 보완, D1 password_reset_tokens |

### Phase 5f — AX BD 사업개발 체계 수립 (프로세스 v8.2 풀 통합)

> 참고자료: `docs/specs/axbd/` (7개 파일 — HTML 대시보드 3, MD 3, ai-biz 플러그인 1)
> 반영 요청: 정원(5유형+하위분석+9Discovery), 민원(AX프레임워크), 경임(Agent출발Case), 팀장(사업성평가)
> 프레임워크 헷징: AI가 유형별 강도(핵심/보통/간소)에 따라 자동 선별, HITL 원칙으로 담당자 최종 판단

| F# | 제목 (REQ, Priority) | 버전 | 상태 | 비고 |
|----|----------------------|:----:|:----:|------|
| F212 | AX BD Discovery 스킬 체계 통합 — ai-biz 11스킬 CC전환 + ax-bd-discovery 오케스트레이터 skill(2-0~2-10 단계관리, 5유형 I/M/P/T/S 강도 라우팅) + AI/경영전략 16 프레임워크 프롬프트 내장. Cowork 플러그인 병행 유지 (FX-REQ-204, P0) | Sprint 68 | ✅ | ai-biz 11 CC skills + ax-bd-discovery 오케스트레이터(198줄+refs 365줄) + sf-lint/scan/deploy 완료. 81 active 스킬 카탈로그 |
| F213 | Foundry-X API v8.2 확장 — 5유형 분류(I/M/P/T/S) 엔드포인트 + 단계별 사업성 체크포인트 CRUD + 누적 트래픽 라이트 집계 + Commit Gate 플로우. D1 ax_discovery_items 확장 (FX-REQ-205, P1) | Sprint 69 | ✅ | Phase 5b BDP 자동화 기반 확장, discovery_type ENUM 추가, ax_viability_checkpoints 테이블 |
| F214 | Web Discovery 대시보드 — 2-0~2-10 프로세스 시각화 + 유형별 분기 경로 표시 + 사업성 신호등 이력 + 멀티페르소나 평가 결과 뷰 (FX-REQ-206, P1) | Sprint 70 | ✅ | 01_AX사업개발_프로세스설명.html 참고, 02_AI멀티페르소나평가.html 참고, 03_발굴단계완료(안).html 산출물 포맷 참고 |
| F215 | AX BD 스킬 팀 가이드 — Getting Started 페이지 확장: Cowork 설치(pm-skills+ai-biz)+CC 스킬 사용법(ax-bd-discovery+ai-biz 11종)+프로세스 v8.2 흐름 시각화+팀 FAQ/트러블슈팅. 1차 독자: AX BD팀 전원 (FX-REQ-207, P0) | Sprint 71 | ✅ | 4섹션+5컴포넌트(CoworkSetupGuide,SkillReferenceTable,ProcessLifecycleFlow,TeamFaqSection) + 테스트. PR #209 |
| F216 | Test Agent 리서치 — Foundry-X 6종 Agent(Architect/Test/Security/QA/Infra/Planner) 실활용 점검 + Anthropic Code Review Agent·Test Agent 벤치마크 + TDD/테스트자동화 전략 도출 (FX-REQ-208, P1) | — | ✅ | 리서치 REQ. 6종 중 PlannerAgent만 활용 중, 나머지 5종 Web UI/Orchestrator 미연동 확인. 보고서: FX-ANLS-015 |
| F217 | TestAgent 활성화 — F139 TestAgent Web UI 연동(Agent Dashboard 호출 UI) + Sprint 작업 후 TestAgent API 자동 트리거 워크플로우 + Orchestrator 통합 (FX-REQ-209, P1) | Sprint 72 | ✅ | PR #212. TestAgentPanel+CoverageGapView+TestGenerationResult 3컴포넌트, api-client TestAgent 메서드 |
| F218 | Agent SDK Test Agent PoC — Anthropic Agent SDK 기반 테스트 파일 자동 생성+실행 PoC. 내부 TestAgent(LLM 프롬프트) vs Agent SDK(도구 실행) 비교 평가 (FX-REQ-210, P2) | Sprint 73 | ✅ | PR #211. tools/test-agent-poc/ 독립 PoC (index.ts+types.ts+utils.ts+3 agent prompts) |
| F219 | TDD 자동화 CC Skill — Red→Green→Refactor 사이클 자동화 Skill 구현. Superpowers 패턴 참고(테스트 먼저→구현→검증) + Sprint 워크플로우 통합 (FX-REQ-211, P2) | Sprint 74 | ✅ | PR #210. .claude/skills/tdd/ (SKILL.md+examples+refs 3phase) + post-edit-test-warn.sh hook |
| **Phase 6 — Ecosystem Integration (BMAD/OpenSpec)** | | | | PRD: FX-PLAN-012 |
| F220 | Brownfield-first Init 강화 — `foundry-x init` 시 기존 코드베이스 자동 스캔(tech stack/파일 구조/기존 스펙) → `project-context.md` + `ARCHITECTURE.md` 초안 생성. OpenSpec 참고 (FX-REQ-212, P0) | Sprint 75 | ✅ | discover.ts 확장, RepoProfile 타입 확장. PR #213 |
| F221 | Agent-as-Code 선언적 정의 레이어 — BMAD `.agent.yaml` 패턴 참고, 에이전트를 YAML/JSON 선언적 정의. `custom_agent_roles` D1 스키마 확장(persona/dependencies/customization/menu) (FX-REQ-213, P1) | Sprint 76 | ✅ | D1 0061 + YAML→에이전트 로더. PR #214 |
| F222 | Structured Changes Directory — OpenSpec `changes/` 패턴 도입. 변경별 proposal/design/tasks/spec-delta 묶음 관리 + `foundry-x sync` Δspec 자동 감지 + Triangle Health Score 반영 (FX-REQ-214, P1) | Sprint 75 | ✅ | changes-parser/scanner + Δspec penalty. PR #213 |
| F223 | 문서 Sharding 자동화 — BMAD `shard-doc` 참고, 대형 PRD를 에이전트별 관련 섹션만 참조하도록 자동 분할. 에이전트 컨텍스트 윈도우 최적화 (FX-REQ-215, P2) | Sprint 76 | ✅ | D1 0062 + shard-doc 서비스. PR #214 |
| F224 | [Ref] SM→Dev 컨텍스트 전달 구조 — BMAD Story 파일 기반 컨텍스트 전달 방식 참고. Sprint 워크플로우(F142)에 적용 검토 (FX-REQ-216, P3) | Sprint 77 | ✅ | context-passthrough 서비스+라우트. PR #216 |
| F225 | [Ref] 슬래시 커맨드 UX — OpenSpec `/opsx:` 커맨드 패턴 참고. Phase 2 MCP/IDE 통합 시 커맨드 UX 설계 반영 (FX-REQ-217, P3) | Sprint 77 | ✅ | command-registry 서비스+라우트. PR #216 |
| F226 | [Ref] Party Mode (다중 에이전트 세션) — BMAD 자유형 토론 방식 참고. Ensemble Voting(F147) 보완적 적용 검토 (FX-REQ-218, P3) | Sprint 77 | ✅ | party-session 서비스+라우트+D1 0063. PR #216 |
| F227 | [Ref] Spec Library 구조 — OpenSpec 기능 단위 스펙 조직 방식 참고. Wiki 동기화(F46) 개선 시 적용 검토 (FX-REQ-219, P3) | Sprint 77 | ✅ | spec-library 서비스+라우트+D1 0064. PR #216 |
| F228 | [Ref] Expansion Packs 모델 — BMAD 도메인 확장 패키징/배포 방식 참고. Agent Marketplace(F152) 개선 시 적용 (FX-REQ-220, P3) | Sprint 77 | ✅ | expansion-pack 서비스+라우트+D1 0065. PR #216 |
| F229 | [Watch] Agent Spec 표준 — Oracle Open Agent Specification. Phase 3+ 에이전트 이식성 관점 장기 관찰. YAML/JSON 내보내기 포맷 검토 (FX-REQ-221, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 2026-09. F221 에이전트 정의 90% 호환, 워크플로우 레이어 GAP |
| F230 | [Watch] Scale-Adaptive Intelligence — BMAD 프로젝트 규모별 자동 조절 패턴. Phase 2+ 멀티스케일 지원 시 참고 (FX-REQ-222, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 Phase 2 시작 시. 적응 메커니즘 전무가 핵심 GAP |
| F231 | [Watch] Multi-repo Workspace — OpenSpec 조직 전체 복수 저장소 확장. 모노리포 넘어선 확장 시 필요 (FX-REQ-223, P4) | Sprint 78 | ✅ | 벤치마킹 완료. Watch 유지, 재판정 2026 하반기. 단일 리포 전제가 핵심 GAP |
| **Phase 7 — BD Pipeline End-to-End 통합 (FX-BD-V1)** | | | | PRD: docs/specs/fx-bd-v1/prd-final.md |
| F232 | 파이프라인 통합 대시보드 — 칸반/파이프라인 뷰 전환, 아이템별 단계·진행률·다음 액션 조회. D1 pipeline_stages 테이블 (FX-REQ-224, P0) | Sprint 79 | ✅ | PR #217 |
| F233 | 산출물 공유 시스템 — 인증 기반 공유 링크 생성 + 만료 설정 + 리뷰 요청 + 인앱/이메일 알림. D1 share_links + notifications (FX-REQ-225, P0) | Sprint 79 | ✅ | PR #217 |
| F234 | BDP 편집/버전관리 — 사업계획서 마크다운 에디터 + 버전 히스토리 + diff 뷰 + 최종본 잠금. D1 bdp_versions (FX-REQ-226, P0) | Sprint 80 | ✅ | PR #218 |
| F235 | ORB/PRB 게이트 준비 — 산출물 자동 수집 → 게이트 문서 패키지 구성 → ZIP 다운로드. D1 gate_packages (FX-REQ-227, P0) | Sprint 80 | ✅ | PR #218 |
| F236 | Offering Pack 생성 — 영업/제안용 번들(사업제안서+데모링크+기술검증+가격). D1 offering_packs (FX-REQ-228, P0) | Sprint 81 | ✅ | PR #219 |
| F237 | 사업제안서 자동 생성 — 사업계획서(BDP)에서 게이트 제출용 요약본 LLM 자동 추출 (FX-REQ-229, P1) | Sprint 80 | ✅ | PR #218 |
| F238 | MVP 추적 + 자동화 — MVP 상태(In Dev/Testing/Released) 추적 + PoC 배포 자동화 파이프라인. D1 mvp_tracking (FX-REQ-230, P1) | Sprint 81 | ✅ | PR #219 |
| F239 | 단계별 의사결정 워크플로 — Go/Hold/Drop 버튼 + 팀장 승인/반려 + 코멘트 + 이력 + 자동 단계 전환. D1 decisions (FX-REQ-231, P0) | Sprint 79 | ✅ | PR #217 |
| F240 | IR Bottom-up 채널 — 사내 현장(엔지니어/영업) 제안 전용 등록 폼 → biz-item 자동 변환 (FX-REQ-232, P2) | Sprint 81 | ✅ | PR #219 |
| **Phase 8 — IA 구조 개선 + 신규 사업 Prototyping** | | | | |
| F241 | 사이드바 프로세스 6단계 재구조화 — AX BD 프로세스(수집→발굴→형상화→검증→제품화→GTM) 기반 그룹 재배치 + 누락 4페이지 통합 (FX-REQ-233, P0) | Sprint 82 | ✅ | 커밋 1e1dabd |
| F242 | ProcessStageGuide 컴포넌트 — 경로 자동 감지 온보딩 가이드 + layout.tsx 전역 적용 (FX-REQ-234, P0) | Sprint 83 | ✅ | 커밋 1e1dabd |
| F243 | 대시보드 프로세스 파이프라인 진행률 뷰 + 퀵 액션 (FX-REQ-235, P1) | Sprint 84 | ✅ | 커밋 1e1dabd |
| F244 | AXIS DS 색상 뱃지 + 활성 단계 border 하이라이트 (FX-REQ-236, P1) | Sprint 84 | ✅ | 커밋 1e1dabd |
| F245 | GIVC Ontology 기반 산업 공급망 인과 예측 엔진 PoC — 한국기계산업진흥회 chatGIVC 고도화 제안. Ontology+KG로 데이터 사일로(무역/산업/R&D/EWS/GIVC) 연결, 4대 시나리오(이벤트 연쇄/대체 공급처/EWS 영향/리스크맵) Prototype. Palantir 방식 벤치마크 (FX-REQ-237, P2) | Sprint 92~108 | ✅ | **X5 재평가: CLOSE (drift 보정)**. F255(S92 PR #229)+F256(S93 PR #230)+F272(S101)+F279(S108 D1 0082) 분해 실행 완료. Round 0→1 CONVERGED 0.82→0.89. 잔여 3개 시나리오는 수주 성공 시 BD Pipeline에서 재정의. 피치덱: docs/specs/GIVC/koami_pitch_v0.1_260327.html. [[FX-PLAN-X5]] |
| F246 | Next.js → Vite + React Router 전환 — 빌드 인프라 교체. 빌드 메모리 750MB→369MB, 빌드 시간 22초→1초. SWC 바이너리 276MB 제거, 42곳 import 치환, 환경변수 9파일 (FX-REQ-238, P1) | Sprint 85 | ✅ | PR #223 |
| F247 | Vite 전환 검증 + 배포 — unit 207 pass, CI typecheck 통과, Cloudflare Pages dist/ 배포 (FX-REQ-239, P1) | Sprint 85 | ✅ | PR #223 |
| F248 | ProtectedRoute 인증 가드 — AppLayout 하위 36개 라우트에 미인증 접근 차단 + /login 리다이렉트. auth-store isHydrated 상태 추가, 비동기 hydration 완료 대기 (FX-REQ-240, P0) | Sprint 86 | ✅ | router.tsx + ProtectedRoute.tsx + auth-store.ts |
| F249 | E2E 인증 fixture 키 통일 — fx-token→token 4곳 수정 (auth.ts/org.ts/slack-config.spec.ts). 앱 코드와 테스트 localStorage 키 정합성 확보 (FX-REQ-241, P1) | Sprint 86 | ✅ | e2e/fixtures/ + e2e/slack-config.spec.ts |
| F250 | 로그인 E2E 테스트 보강 — 2→7개 시나리오 (미인증 리다이렉트 3, 폼 렌더링 1, 공개 페이지 접근 2, 만료 토큰 1) (FX-REQ-242, P1) | Sprint 86 | ✅ | e2e/auth-flow.spec.ts |
| **Phase 9 — 팀 온보딩 + 신규 사업 Prototyping** | | | | |
| F251 | 팀 계정 일괄 생성 + Org 초대 — AX BD팀 7명 + 공용계정 1개 = 8계정. Bulk Signup API + admin-service (FX-REQ-243, P0) | Sprint 87 | ✅ | PR #224, Match 97% |
| F252 | 온보딩 가이드 + 사용법 투어 고도화 — 역할별 투어 분기(admin 11/member 8스텝) + AdminQuickGuide + MemberQuickStart (FX-REQ-244, P1) | Sprint 87 | ✅ | PR #224, Match 97% |
| F253 | 팀 데이터 공유 — Org-scope 공유 뷰 (아이디어/BMC/인사이트/Discovery). org-shared route/service + team-shared 페이지 (FX-REQ-245, P0) | Sprint 88 | ✅ | PR #226 |
| F254 | NPS 피드백 수집 — 7일 주기 NPS 팝업 + 팀별 집계 대시보드. nps route/service + NpsSurveyTrigger + nps-dashboard (FX-REQ-246, P1) | Sprint 88 | ✅ | PR #226 |
| F255 | GIVC Ontology PoC 1차 — 산업 공급망 지식그래프 스키마 설계 + 샘플 데이터 로드 + 기본 질의 API (FX-REQ-247, P2) | Sprint 92 | ✅ | PR #229. Property Graph 3-테이블 + 16 API + KG 탐색기 |
| F256 | GIVC PoC 2차 — 4대 시나리오(이벤트 연쇄/대체 공급처/EWS 영향/리스크맵) 중 1개 MVP 구현 (FX-REQ-248, P2) | Sprint 93 | ✅ | PR #230. KgScenarioService + 핫스팟 감지 + 프리셋 3개 |
| F257 | 추가 BD 아이템 탐색 — Discovery 파이프라인으로 신규 사업 아이템 1~2건 발굴 + 사업성 체크포인트 통과 (FX-REQ-249, P2) | Sprint 93 | ✅ | PR #230. ontology 2탭 구조 (Explorer+Scenario) |
| **BD 스킬 통합 — AX BD 프로세스 v8.2 + 공용 스킬 체계를 Foundry-X 웹에 풀스택 반영** | | | | 참조: docs/specs/axbd-skill/ |
| F258 | BD 프로세스 가이드 UI — 2-0~2-10 단계별 프로세스 설명 + 유형별(I/M/P/T/S) 강도 매핑 테이블 + 사업성 체크포인트 가이드. /ax-bd/discovery 페이지 확장 (FX-REQ-250, P0) | Sprint 89 | ✅ | PR #225 |
| F259 | BD 스킬 카탈로그 UI — 76개 스킬 + 36개 커맨드 검색·필터·카테고리 뷰. 단계별 추천 스킬 하이라이트 + 스킬 상세(설명/입력/산출물) 팝업 (FX-REQ-251, P0) | Sprint 89 | ✅ | PR #225 |
| F260 | BD 스킬 실행 엔진 — 웹에서 스킬 선택 → API 호출 → Anthropic LLM 실행 → 산출물 반환. skill-execution.md 프레임워크 정의를 서버 측 프롬프트로 변환 (FX-REQ-252, P0) | Sprint 90 | ✅ | PR #227 |
| F261 | BD 산출물 저장 + 버전 관리 — 스킬 실행 결과를 biz-item별 산출물로 D1 저장 + 버전 히스토리. 2-0~2-10 단계별 산출물 연결 (FX-REQ-253, P0) | Sprint 90 | ✅ | PR #227. D1 0075 마이그레이션 |
| F262 | BD 프로세스 진행 추적 — biz-item별 현재 단계(2-0~2-10) + 사업성 신호등(Go/Pivot/Drop 누적) + Commit Gate 상태. 파이프라인 대시보드 연동 (FX-REQ-254, P0) | Sprint 91 | ✅ | PR #228 |
| **발굴 프로세스 UX 개선 — 위저드 UI + Help Agent + 온보딩 + HITL로 실사용 전환** | | | | 참조: docs/specs/fx-discovery-ux/prd-final.md |
| F263 | 발굴 프로세스 단계별 안내 UI — 위저드/스텝퍼 재구성 + biz-item별 진행 추적 (FX-REQ-255, P0) | Sprint 94 | ✅ | DiscoveryWizard + WizardStepper + StepDetail + D1 0077 |
| F264 | Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 안내 (FX-REQ-256, P0) | Sprint 95 | ✅ | Match 99%. openrouter-service + help-agent-service + D1 0078 |
| F265 | 발굴 온보딩 투어 개선 — 인터랙티브 3~5스텝 가이드 (FX-REQ-257, P0) | Sprint 94 | ✅ | DiscoveryTour 5스텝 |
| F266 | HITL 인터랙션 + 결과물 확인 — 인라인 패널 (승인/수정/재생성/거부) (FX-REQ-258, P0) | Sprint 96 | ✅ | Match 100%. hitl-review-service + HitlReviewPanel + D1 0078 |
| **BD 팀 공용 스킬 배포 — Claude Code 네이티브 스킬셋 GitHub 리포 공유** | | | | |
| F267 | BD 팀 공용 스킬 GitHub 배포 준비 — CLAUDE_AXBD 폴더 정리(76 skills + 36 commands + rules), 기존 axbd/ 리소스 통합, ax-bd-discovery 스킬 참조 갱신, README 배포 가이드 + 설치 가이드 UI 전면 재작성 (FX-REQ-259, P1) | Sprint 98 | ✅ | CLAUDE_AXBD + CoworkSetupGuide 3환경 |
| **Claude Code 개발 환경 Plugin 전환 — ax-config를 팀 공유 가능한 Plugin으로 변환** | | | | |
| F268 | ax-config Plugin 전환 — Command/Skill 중복 정리(20개), ax-config Git 정비, Plugin 형식 변환(plugin.json+marketplace), 팀 설치 가이드 (FX-REQ-260, P1) | Sprint 99 | ✅ | KTDS-AXBD/ax-plugin repo + 20 skills + `claude plugin install ax@ax-marketplace` |
| **발굴 UX 2차 정비 — IA 구조 + 페이지 중복 정리 + 플로팅 버튼 충돌 해소** | | | | |
| F269 | 발굴 IA & Page 정리 — (1) 데모 시나리오를 발굴 밖으로 이동 (2) 중복 메뉴 통합(프로세스 가이드↔Discovery 프로세스, 진행 추적↔진행률, Ontology·스킬카탈로그 위치 재조정) (3) FeedbackWidget↔HelpAgentChat 플로팅 버튼 겹침 해소 (FX-REQ-261, P0) | Sprint 100 | ✅ | Match 97%. 메뉴 10→3 + 탭 통합 3페이지 + HelpAgent Sheet 패널 |
| **Phase 10 — O-G-D Agent Loop (Harness × GAN)** | | | | |
| F270 | O-G-D 에이전트 정의 — ogd-orchestrator/generator/discriminator .md 3개 에이전트 파일 생성. Harness 규격 준수 (FX-REQ-262, P1) | Sprint 101 | ✅ | 3 agents (opus+sonnet×2) |
| F271 | BD 발굴 Rubric + References — ogd-rubric-bd.md(7항목) + ogd-convergence.md + ogd-mode-collapse.md 생성. 산업 템플릿 오버라이드 지원 (FX-REQ-263, P1) | Sprint 101 | ✅ | 7항목 Rubric + 3 references |
| F272 | O-G-D 독립 루프 검증 — _workspace/ 구조 + ogd-state.yaml 상태 관리 + 에러 핸들링 + 실제 BD 아이템 데모 실행 (FX-REQ-264, P0) | Sprint 101 | ✅ | GIVC chatGIVC 고도화 데모. Round 0→1 CONVERGED (0.82→0.89). 에러 0건. PRD v1.2 최적화 반영(R-25 search-cache + R-26 max_searches) |
| F273 | ax-bd-discovery v8.2 O-G-D 통합 — 2-5 Commit Gate 필수 적용 + 2-3/2-7 선택적. SKILL.md 수정 + references/ 추가 (FX-REQ-265, P1) | Sprint 102 | ✅ | Match 100%. SKILL.md O-G-D 섹션 + ogd-commit-gate.md + ogd-stage-rubrics.md (PR #231) |
| **Phase 10 — Skill Evolution (OpenSpace 내재화)** | | | | |
| F274 | Track A: 스킬 실행 메트릭 수집 — D1 skill_executions/skill_versions/skill_lineage/skill_audit_log 4테이블 + F143 대시보드 연동 + 감사 로그 (FX-REQ-266, P0) | Sprint 103 | ✅ | Match 100%. D1 0080 4테이블 + API 5 endpoints + 21 tests (PR #232) |
| F275 | Track D: 스킬 레지스트리 — ax-marketplace 확장(메타데이터: success_rate/token_cost/lineage) + 시맨틱 검색 + 버전 추적 + 안전성 검사 (FX-REQ-267, P0) | Sprint 104 | ✅ | Match 99%. D1 0081 2테이블 + API 8 endpoints + 40 tests (PR #233) |
| F276 | Track C: DERIVED 엔진 — BD 7단계 반복 성공 패턴 자동 추출 + 새 스킬 생성 + HITL 승인 (FX-REQ-268, P0) | Sprint 105 | ✅ | Match 100%. D1 0082 3테이블 + API 8 endpoints + 40 tests (PR #236) |
| F277 | Track C: CAPTURED 엔진 — 크로스 도메인 워크플로우 캡처 + 메타 스킬 생성 + F191 방법론 레지스트리 연동 (FX-REQ-269, P1) | Sprint 106 | ✅ | Match 100%. D1 0083 3테이블 + API 8 endpoints + 35 tests (PR #237) |
| F278 | Track E: BD ROI 벤치마크 — Cold Start vs Warm Run 비교 + BD_ROI 공식 + F262 사업성 신호등 달러 환산 (FX-REQ-270, P1) | Sprint 107 | ✅ | Match 99%. D1 0084 2테이블 + API 8 endpoints + 39 tests (PR #241) |
| **Phase 10 — BD 데모 데이터 (Production Showcase)** | | | | |
| F279 | BD 데모 시딩 마이그레이션 — D1 0082: 2개 아이디어(헬스케어AI+GIVC) × 18테이블 104 rows INSERT. pipeline_stages 7단계 이력 + discovery_stages 11단계 + viability_checkpoints + commit_gates (FX-REQ-271, P0) | Sprint 108 | ✅ | Match 100%. D1 0082 104 rows + API 2311 pass (PR #234) |
| F280 | BD 산출물 콘텐츠 생성 — bd_artifacts 16건 상세 output_text(시장조사/경쟁분석/BMC/PRD/MVP 등 한글 1~3p). O-G-D 데모 결과물 직접 활용 + BMC 9블록 + BDP v1~v2 + Offering Pack items (FX-REQ-272, P0) | Sprint 108 | ✅ | Match 100%. 16건 한글 콘텐츠 1383줄 SQL (PR #234) |
| F281 | 데모 데이터 E2E 검증 — Production 배포 + 6단계 워크쓰루(수집→GTM) + 산출물 상세 Markdown 렌더링 확인 + UI 빈화면/깨짐 수정 (FX-REQ-273, P1) | Sprint 109 | ✅ | Match 100%. react-markdown+remark-gfm, API 7 tests + E2E 6 specs (PR #238) |
| **Phase 10 — BD 형상화 파이프라인 (Stage 3→4 자동화)** | | | | |
| F282 | BD 형상화 Phase A — 입력 점검 & 갭 분석 (체크리스트 10항목 + 갭 처리 전략 + ax-bd-shaping 스킬 메인) (FX-REQ-274, P0) | Sprint 110 | ✅ | PR #235, Match 100% |
| F283 | BD 형상화 Phase B+C — req-interview 연동 + O-G-D 형상화 루프 (Rubric 5차원 + shaping-orchestrator/generator/discriminator 3 에이전트 + 수렴 0.85) (FX-REQ-275, P0) | Sprint 110 | ✅ | PR #235, Match 100% |
| F284 | BD 형상�� Phase D — 다중 AI 모델 교차 검토 + Six Hats 토�� (OpenRouter 3모델 + 6색 모자 + 합의 매트릭스 + six-hats-moderator 에이��트) (FX-REQ-276, P1) | Sprint 111 | ✅ | PR #239, Match 100% |
| F285 | BD 형상화 Phase E — 전���가 AI ���르소나 리뷰 (TA/AA/CA/DA/QA 5종 에��전트 + 교차 영향 분석 + 통합 리뷰 보고서 + Fan-out/Fan-in) (FX-REQ-277, P1) | Sprint 111 | ✅ | PR #239, Match 100% |
| F286 | BD 형상화 Phase F — HITL 게시 & 편집 + 자동 모드 (Web PRD 에디터 + 섹션별 승인/수정/반려 + AI 자가 리뷰 3 페르소나 + auto-reviewer 에이전트) (FX-REQ-278, P1) | Sprint 112 | ✅ | PR #240, auto-reviewer + Web 에디터 + E2E |
| F287 | BD 형상화 D1 스키마 + Git 병행 저장 + 통합 E2E (shaping_runs/phase_logs/expert_reviews/six_hats 4테이블 + docs/shaping/ 산출물 + E2E 테스트) (FX-REQ-279, P0) | Sprint 112 | ✅ | PR #240, D1 0084 + API 13ep + 28 tests |

### Phase 11 — IA 대개편 (Figma v0.92 정합 + Role-based UX)

> 기준 문서: `docs/specs/IA-renewal_v2/FX-IA-Change-Plan-v1.1.docx` (13개 Figma 갭 G1~G13 + 온보딩/관리자/불필요메뉴 3건)

#### Phase 11-A: IA 구조 기반

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F288 | Role-based sidebar visibility + Admin 전용 메뉴 분리 — NavItem.visibility 속성 추가, auth-store role 기반 필터링. Member: BD 6단계+설정(개인) / Admin: 전체. F252 역할 분기 패턴 재활용 (FX-REQ-280, P1) | Sprint 113 | ✅ | PR #242, Match 92%. sidebar.tsx + 14 tests |
| F289 | 사이드바 리브랜딩 + 메뉴 재배치 — ideas→Field 수집, F240→IDEA Portal, multi-persona를 4단계→2단계 발굴 이동, spec-generator를 형상화 PRD로 흡수. 온보딩 완료 시 시작하기 조건부 숨김 (FX-REQ-281, P1) | Sprint 113 | ✅ | PR #242, 리브랜딩 3건 + 조건부 노출 |
| F290 | Route namespace 마이그레이션 — flat 경로를 6단계 계층 구조로 전환 (/collection/*, /discovery/*, /shaping/*, /validation/*, /product/*, /gtm/*) + 16건 redirect + ProcessStageGuide 경로 매핑 갱신 (FX-REQ-282, P1) | Sprint 114 | ✅ | PR #243, Match 100%. 22경로 + 16 redirect + 30파일 + 287 tests |

#### Phase 11-B: 프로세스 기능 확장

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F291 | Discovery-X Agent 자동 수집 — 시장/뉴스/기술 트렌드 Agent 기반 자동 수집 + 1단계 수집에 배치 (FX-REQ-283, P2) | Sprint 115 | ✅ | PR #244, Match 100%. D1 0085 + API 3ep + Web 1p |
| F292 | 사업계획서 HITL 고도화 — F180 기존 BDP 초안에 HITL 패널 + 멀티 템플릿 지원 추가. 섹션별 승인/수정/반려 (FX-REQ-284, P2) | Sprint 118 | ✅ | PR #249, D1 0088 + HITL 공유 컴포넌트 + Web |
| F293 | 초도 미팅용 Offering — 3단계 형상화에 고객 미팅용 자료 자동 생성 페이지 신규 (FX-REQ-285, P2) | Sprint 119 | ✅ | PR #247, D1 0089 + API 3ep + Web 1p |
| F294 | 2-tier 검증 + Pre-PRB 분리 — 본부 검증→전사 검증 순차 워크플로 + F235 ORB/PRB 게이트에서 Pre-PRB 분리. F239 의사결정을 2-tier 확장 (FX-REQ-286, P2) | Sprint 116 | ✅ | PR #245, D1 0086 + API + Web 2p |
| F295 | 전문가 인터뷰/미팅 관리 — 4단계 검증 내 오프라인 활동(전문가 인터뷰, 유관부서 미팅) 기록 + 일정 관리 (FX-REQ-287, P2) | Sprint 116 | ✅ | PR #245, 미팅 CRUD + Web 1p |
| F296 | 통합 평가 결과서 생성 — 2단계 발굴 스킬 결과(2-1~2-8) 종합 보고서 자동 생성 + F261 산출물 연동 (FX-REQ-288, P2) | Sprint 117 | ✅ | PR #246, D1 0087 + API 3ep + Web 1p |

#### Phase 11-C: 고도화 + GTM

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F297 | Prototype HITL 고도화 — F181 기존 Prototype 생성에 HITL 패널 추가 + 다중 프레임워크 지원 (FX-REQ-289, P3) | Sprint 118 | ✅ | PR #249, HITL 공유 컴포넌트 + /shaping/prototype |
| F298 | PoC 관리 분리 — MVP 추적(F238)과 별도로 PoC 전용 진행 추적 + 성과 측정 (FX-REQ-290, P3) | Sprint 120 | ✅ | PR #248, D1 0090 + API 5ep + Web 1p |
| F299 | 대고객 선제안 GTM — 6단계 GTM에 고객 선제안 워크플로 + 제안서 자동 생성 (FX-REQ-291, P4) | Sprint 121 | ✅ | PR #252, D1 0088 + API 11ep + Web 2p + 52 tests. Match 98% |

### 인프라/품질 — E2E 테스트 관리

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F300 | E2E 테스트 종합 정비 — 실패 16건 수정 + API-only 5 spec 삭제 + redirect 검증 16건 + uncovered 8p 확대 + waitForTimeout 제거 + fixture 정리 (FX-REQ-292, P1) | Sprint 122 | ✅ | 세션 #185. 158→161 tests, 85.4%→100% pass. 31 specs, 153 pass / 0 fail / 6 skip |
| F302 | E2E 상세 페이지 커버리지 확장 — 파라미터(:id) 상세 페이지 8건 E2E 추가 + mock factory 패턴 도입 + skip 6건 재활성화 검토 (FX-REQ-294, P2) | Sprint 124 | ✅ | PR #259. mock-factory 11종 + detail-pages 10건. Match 95%. 169→179 tests. Skip 5건 유지(UI 미완/flaky) |

### BD 산출물 접근성 — UX 동선 연결

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F301 | BD 산출물 UX 연결성 개선 — discovery-detail 산출물 섹션 추가 + Pipeline 카드 드릴다운 + MVP 카드 biz_item 역링크 (FX-REQ-293, P2) | Sprint 123 | ✅ | 세션 #186 Prod 점검 결과. Phase 1: discovery-detail.tsx에 ArtifactList+ProcessProgress 삽입. Phase 2: pipeline.tsx 카드 클릭→상세. Phase 3: mvp-tracking 역링크. F300과 병렬 가능 |

### Phase 12 — Skill Unification (3개 스킬 시스템 통합)

> PRD: `docs/specs/fx-skill-unify/prd-final.md`
> 목표: skill-framework CLI + Foundry-X API skill_registry + ax-marketplace를 유기적으로 연결
> 배치: 3배치 안정형 — B1(S125 F303+F304 병렬) → B2(S126 F305 + S127 F306 병렬) → B3(S128 F307+F308 병렬)

| F# | 제목 (REQ, Priority) | Sprint | 상태 | 비고 |
|----|----------------------|:------:|:----:|------|
| F303 | SkillCatalog API 전환 — Web bd-skills.ts → skill_registry API 호출 + 실시간 검색/필터/메트릭 표시 (FX-REQ-295, P0) | Sprint 125 | ✅ | D1 해소. api-client 4메서드 + hooks 3개 + SkillCatalog/Card/DetailSheet/ProcessGuide 전환. PR #260 |
| F304 | 벌크 레지스트리 API + sf-scan 연동 — POST /api/skills/registry/bulk + sf-scan --api-register 옵션 (FX-REQ-296, P0) | Sprint 125 | ✅ | D2 해소. bulkUpsert 50건 배치 + sf-scan-register.sh. PR #260 |
| F305 | 스킬 실행 메트릭 수집 — usage-tracker.sh → POST /api/skills/metrics/record + CC 훅 연동 (FX-REQ-297, P0) | Sprint 126 | ✅ | D4 해소. POST 라우트 + usage-tracker-hook.sh + 26 tests. PR #261 |
| F306 | DERIVED/CAPTURED → SKILL.md 자동 생성 + Deploy API + marketplace 등록 플로우 (FX-REQ-298, P0) | Sprint 127 | ✅ | D3 해소. SkillMdGenerator + Deploy API + D1 0089 + Review 연동. PR #262 |
| F307 | SkillEnrichedView 대시보드 + 진화 계보 시각화 — registry+metrics+lineage 통합 뷰 (FX-REQ-299, P1) | Sprint 128 | ✅ | EnrichedViewPage + MetricsCards + LineageTree + VersionHistory. PR #263 |
| F308 | Skill Unification 통합 QA + 데모 데이터 + Production 배포 (FX-REQ-300, P1) | Sprint 128 | ✅ | E2E 2파일 + skill-demo-seed.sh. PR #263 |

### 비주얼 협업 도구 통합 (FX-PLAN-013, Phase A+B)

> PRD: `docs/specs/FX-PLAN-013-visual-collab-prd.docx` (v1.2, Dry-run 2차 완료)
> Phase A(Marker.io) 즉시 실행 + Phase B(TinaCMS) 조건부 실행. Marker.io 계정: ktds.axbd@gmail.com, 14일 Free Trial.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F309 | Marker.io 비주얼 피드백 통합 — MarkerWidget.tsx + VITE_MARKER_PROJECT_ID 환경변수 + GitHub Issues 연동(visual-feedback 라벨) + 팀 온보딩 가이드 (FX-REQ-301, P1) | Sprint 129 | ✅ | PR #257, Match 100%. deploy.yml VITE_MARKER_PROJECT_ID secret 주입 추가. fx.minu.best 위젯 동작 확인 |
| F310 | TinaCMS 호환성 PoC — feat/tinacms-poc 브랜치에서 Vite 8 + React Router 7 충돌 검증 + /admin 라우팅 + pnpm build/typecheck/e2e 전체 통과 확인 (FX-REQ-302, P2) | Sprint 130 | ✅ | PR #258, Match 100%. **Go 판정** — G1~G5 전체 PASS. F311 착수 가능 |
| F311 | TinaCMS 인라인 에디팅 본구현 — tina/config.ts + content/ 디렉터리 구조화 + useTina hook 컴포넌트 연결 + /admin 3중 방어(_redirects+RR7+Vite) + TinaCloud 권한 설정 + CF Pages 배포 (FX-REQ-303, P3) | Sprint 131 | ✅ | PR #264, Match 100%. TinaCloud 설정 완료. fx.minu.best/admin 프로덕션 동작 확인 ✅ |
| F312 | 형상화 자동 전환 + Phase A~F 자동 실행 — 2-10 최종보고서 완료 시 형상화 Phase A~F 자동 파이프라인 트리거 + 발굴 산출물 전달 (FX-REQ-304, P0) | Sprint 132 | ✅ | PR #266. discovery-pipeline-service + shaping-orchestrator |
| F313 | 파이프라인 상태 머신 + 실패/예외 관리 — 이벤트 기반 상태 머신 오케스트레이션 + 재시도/건너뛰기/중단 옵션 + 에러 표준화 (FX-REQ-305, P0) | Sprint 132 | ✅ | PR #266. pipeline-state-machine + error-handler. 44 tests |
| F314 | 발굴 연속 스킬 파이프라인 + HITL 체크포인트 — 2-0~2-10 자동 순차 실행 + 사업성 체크포인트(Commit Gate) 사용자 승인 UI (FX-REQ-306, P1) | Sprint 133 | ✅ | PR #267. runner+checkpoint+route 4EP+Web 2컴포넌트. 26 tests |
| F315 | 상태 모니터링 + 알림 + 권한 제어 — 파이프라인 진행 대시보드 + 실시간 알림 + HITL 승인 권한 관리 (FX-REQ-307, P1) | Sprint 134 | ✅ | PR #269. monitoring+notification+permission 3서비스. 20 tests |
| F316 | Discovery E2E 테스트 — 위저드 전체 흐름 + 아이템 상세 + 스킬 실행 + HITL 리뷰 E2E (FX-REQ-308, P2) | Sprint 135 | ✅ | PR #268. 3spec 10건 E2E + mock-factory 확장. Match 100% |
| F317 | 데이터 백업/복구 + 운영 계획 — 산출물 백업 + 복구 시나리오 + 운영 정책 + Hotfix 체계 (FX-REQ-309, P2) | Sprint 136 | ✅ | PR #270. backup-restore + cron + ops-guide. 10 tests |
| F318 | 팀 도구 가이드 페이지 + Help Agent 연동 — /tools-guide 정적 라우트(Marker.io+TinaCMS 사용법) + 사이드바 메뉴 + Help Agent LOCAL_PATTERNS 4건 + 시스템 프롬프트 도구 지식 추가 (FX-REQ-310, P2) | — | ✅ | 세션 #192. 코드 직접 구현 (Sprint 없이) |

### Marker.io 피드백 자동화 + TinaCMS 네비게이션 (FX-PLAN-014)

> Marker.io 피드백 → Agent 자동 처리 E2E 파이프라인 + TinaCMS 사이드바/랜딩 동적 메뉴 관리

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F319 | Marker.io 피드백 Webhook 수신 + D1 큐 — GitHub Issue webhook → Workers API endpoint + D1 feedback_queue 테이블(상태 머신: pending→processing→done/failed) + visual-feedback 라벨 필터링 (FX-REQ-311, P1) | Sprint 137 | ✅ | PR #271. D1 0094 + webhook extension + 4 API endpoints. 12 tests |
| F320 | 피드백 자동 처리 Agent + PR 생성 — WSL 큐 소비자 스크립트 + Claude Code CLI Agent 연동 + Issue 분석→코드수정→테스트→PR 자동 생성 + 관리자 GitHub Review 알림 (FX-REQ-312, P1) | Sprint 137 | ✅ | PR #271. feedback-consumer.sh + feedback-agent-prompt.md |
| F321 | TinaCMS 네비게이션 동적 관리 — navigation TinaCMS collection + 사이드바 메뉴 순서/표시 content 파일 기반 렌더링 + 랜딩 페이지 섹션 순서 CMS 관리 (FX-REQ-313, P2) | Sprint 138 | ✅ | PR #272. navigation collection + sidebar.json + navigation-loader.ts + Section Registry 패턴 |

### Phase 13: IA 재설계 v1.3 — 액션 중심 메뉴 재설계 + 탭 통합

> FX-IA-Change-Plan-v1.3.docx 기반. Member 메뉴 25→12개(52% 축소), 탭 통합 3건, 버전관리 패턴 전 산출물 적용. TBD 항목(수집/GTM) 제외.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| F322 | 사이드바 구조 재설계 — 25→12 메뉴 축소, processGroups 전면 재구성, 수집 TBD 접기, 하단 고정(위키+설정), Admin 역할 분리 7메뉴 (FX-REQ-314, P0) | Sprint 139 | ✅ | PR #273. Match 98%. 8 files +464/-175. sidebar.json+sidebar.tsx+router.tsx+tina/config.ts |
| F323 | 대시보드 ToDo List + 업무 가이드 — 파이프라인 현황 + 아이템별 단계 표시 + 체크리스트 + 의사결정 대기 알림 + 4단계 검증·제품화·개발 가이드 (FX-REQ-315, P1) | Sprint 141 | ✅ | PR #275. Match 100%. TodoSection(207L)+WorkGuideSection(112L) |
| F324 | 발굴 탭 통합 — 3탭(대시보드/프로세스/BMC) + 멀티 페르소나 프로세스 내 통합 + 평가 결과서 + 스킬카탈로그→위키 이동 (FX-REQ-316, P1) | Sprint 141 | ✅ | PR #275. Match 100%. discovery-unified.tsx(61L) 3탭 래퍼 |
| F325 | 형상화 재구성 + 버전관리 패턴 — 사업기획서/Offering/PRD/Prototype 4메뉴 + 전 산출물 초안→피드백→버전 업데이트→비교 (FX-REQ-317, P2) | Sprint 142 | ✅ | PR #276. VersionBadge(90L)+형상화 4라우트 수정+validation-unified(70L) |
| F326 | 검증 탭 통합 + 산출물 공유 — 4탭(인터뷰·미팅/본부/전사/임원) + Go/Hold/Drop 의사결정 + 공유 메뉴 (FX-REQ-318, P2) | Sprint 142 | ✅ | PR #276. validation-unified.tsx 4탭+임원 placeholder |
| F327 | 제품화 탭 통합 + Offering Pack — MVP/PoC 2탭 + Offering Pack 버전관리 (FX-REQ-319, P3) | Sprint 143 | ✅ | PR #278. product-unified.tsx(49L) 2탭 래퍼 |
| F328 | 시작하기 통합 + 공통 메뉴 정리 — 5영역(온보딩+스킬가이드+Cowork+데모+도구가이드) + 팀공유→산출물 흡수 (FX-REQ-320, P3) | Sprint 143 | ✅ | PR #278. getting-started.tsx 5영역 HubCard 확장 |
| **Blueprint 랜딩 페이지 비주얼 전환 — 설계도 메타포 디자인** | | | | |
| F329 | Blueprint 랜딩 페이지 전면 전환 — landing.tsx 7개 섹션 설계도 스타일 리디자인 (플로우차트 Process, 시스템 다이어그램 Architecture, Gantt Roadmap, 회로도 Agents), bp-* CSS 적용, 다크 모드, 반응형 유지 (FX-REQ-321, P2) | Sprint 145 | ✅ | PR #274. 독립 트랙. bp-* CSS + landing.tsx 7섹션 리디자인 |
| **ECC 반영 — Harness Rules & Git Guard** | | | | |
| F330 | rules/ 5종 신규 작성 — coding-style, git-workflow, testing, security, sdd-triangle (CLAUDE.md에서 추출, CC 자동 로딩) (FX-REQ-322, P1) | Sprint 146 | ✅ | PR #277. Match 100%. 5파일 97줄 (coding-style 22 + git-workflow 17 + testing 22 + security 16 + sdd-triangle 20) |
| F331 | PreToolUse git guard — --no-verify, git add ., force push, reset --hard 차단 (pre-bash-guard.sh + settings.json) (FX-REQ-323, P2) | Sprint 146 | ✅ | PR #277. Match 100%. pre-bash-guard.sh 31줄 + settings.json Bash 매처 추가 |
| **랜딩 페이지 콘텐츠 리뉴얼** | | | | |
| F332 | 랜딩 콘텐츠 리뉴얼 — BDP 6+1단계 수정, 3대 차별점(BDP+AI에이전트+오케스트레이션), 에이전트 3그룹(발굴/형상화/실행), 아키텍처→시스템 구성도 1장, 생태계→오픈소스 연계, 로드맵 축소, Stats 사용자 중심, 히어로 직설형 메시지. Blueprint 시각화 강화 (FX-REQ-324, P1) | Sprint 147 | ✅ | PR #279. Match 100%. ~8분 autopilot |

### Phase 14: Agent Orchestration Infrastructure — 2계층 루프 아키텍처 + 상태머신 + 텔레메트리

> ECC × Optio × GAN × OpenSpace 교차 분석 기반. 기존 O-G-D/Skill(Phase 10) 위에 TaskState + Event Bus + Orchestration Loop 인프라 레이어 추가. Additive 전략 (기존 API 변경 없음). 근거: `docs/specs/FX-Unified-Integration-Plan.md` (GAN R2 CONDITIONAL_PASS, Score 0.78)

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| **Foundation (점진적 전달 — 매 Sprint마다 동작하는 결과물)** | | | | |
| F333 | TaskState Machine — TaskState enum(10상태) + D1 task_states 마이그레이션 + API 2건(GET/POST /tasks/:id/state\|transition) + TransitionGuard 기본 구현 + ~50 단위 테스트. GAN 잔여이슈 N7(Agent→Task 연결) 해결 포함. ~620 LOC (FX-REQ-325, P0) | Sprint 148 | ✅ | PR #284. Match 100%. 15파일 2189줄. ~16분 autopilot |
| F334 | Hook Layer + Event Bus — hooks.json 4종 + shell scripts 4종 + HookResultProcessor(exit code→TaskEvent 변환) + TaskEvent 타입 + Event Bus(이벤트 정규화+라우팅) + FEEDBACK_LOOP_TRIGGERS 매핑 + D1 execution_events + ~45 테스트. GAN 잔여이슈 N2(Event소스), N6(Hook환경) 해결 포함. ~1090 LOC (FX-REQ-326, P0) | Sprint 149 | ✅ | PR #286. Match 100%. 20파일 2265줄. 47 tests. ~20분 autopilot |
| F335 | Orchestration Loop — 3모드(retry/adversarial/fix) OrchestrationLoop 구현 + FeedbackLoopContext(진입/탈출 관리) + AgentAdapter 인터페이스 + 텔레메트리 수집 미들웨어(Event Bus 구독→D1) + E2E 통합 테스트(Hook→Event→Transition→Loop→Telemetry) ~35건. GAN 잔여이슈 N1(FeedbackContext), N4(Guard서비스), N5(수렴기준) 해결 포함. ~1150 LOC (FX-REQ-327, P0) | Sprint 150 | ✅ | PR #287. Match 100%. 16파일 2518줄. 31 tests. ~16분 autopilot |
| **Feature (기존 에이전트 통합 + 관측성)** | | | | |
| F336 | Agent Adapter 통합 — 기존 에이전트(deploy-verifier, spec-checker, build-validator 등)를 AgentAdapter 인터페이스로 래핑 + Discriminator 역할 태깅(YAML frontmatter role 추가) + handleFeedback() 점진적 추가. 기존 동작 100% 보존, 인터페이스만 추가 (FX-REQ-328, P1) | Sprint 151 | ✅ | PR #290. Match 100%. 36파일 1760줄. 27 tests. ~28분 autopilot |
| F337 | Orchestration Dashboard — 태스크 상태 뷰(Kanban, 상태머신 시각화) + 루프 이력 뷰(라운드별 품질 점수 추이) + 텔레메트리 대시보드(태스크/스킬/라운드별 비용) (FX-REQ-329, P1) | Sprint 152 | ✅ | PR #289. Match 98%. Kanban+LoopHistory+Telemetry 3뷰 + E2E |
| F338 | SPA 라우팅 404 해결 — _redirects catch-all 미동작 근본 원인 분석 + wrangler.toml 연관 확인 + Cloudflare Pages 라우팅 설정 정비 (FX-REQ-330, P1) | Sprint 153 | ✅ | PR #285, deploy.yml 검증 강화로 해소 |
| F339 | Marker.io Capture Failed 해결 — 브라우저 확장 프로그램 충돌 원인 분석 + 시크릿 모드 테스트 + 대안 스크린샷 방식 검토 (FX-REQ-331, P1) | Sprint 153 | ✅ | PR #285, Marker.io 위젯 재설정 |
| F340 | JWT 토큰 갱신 — feedback-consumer 장기 토큰 또는 자동 갱신 메커니즘 구현 (FX-REQ-332, P1) | Sprint 153 | ✅ | PR #285, Webhook Secret 기반 갱신 |
| F341 | TinaCMS Navigation 컬렉션 표시 — admin에서 Navigation 미표시 원인 분석 + JSON collection 지원 확인 + 설정 보정 (FX-REQ-333, P1) | Sprint 153 | ✅ | PR #285, tina-lock 재빌드로 해소 |

### Phase 15: Discovery UI/UX 고도화 v2 — 멀티 페르소나 평가 + 9탭 리포트 + 팀 검토

> 발굴 Wizard 뼈대(Phase 9) 위에 결과물 시각화(멀티 페르소나 평가, 9탭 리포트)와 의사결정(팀 검토 Go/Hold/Drop) 레이어 추가. 발굴→형상화 End-to-End 완결. PRD: `docs/specs/fx-discovery-ui-v2/prd-final.md`. Phase 14(Agent Orchestration)와 독립 병렬 진행.

| F# | 설명 | Sprint | 상태 | 비고 |
|----|------|:------:|:----:|------|
| **Sprint 154 — DB 스키마 + 강도 라우팅 + output_json POC** | | | | |
| F342 | DB 스키마 확장 — D1 마이그레이션 4건(0098~0101): ax_persona_configs + ax_persona_evals + ax_discovery_reports + ax_team_reviews + API 3 서비스 + Zod 스키마 (FX-REQ-334, P0) | Sprint 154 | ✅ | PR #288. Foundation |
| F343 | 유형별 강도 라우팅 UI — IntensityIndicator + IntensityMatrix + 5유형×7단계 시각화 + output_json 렌더링 POC (FX-REQ-335, P0) | Sprint 154 | ✅ | PR #288. F342 선행 |
| **Sprint 155 — AI 멀티 페르소나 평가 (핵심)** | | | | |
| F344 | 멀티 페르소나 평가 UI — PersonaCardGrid + WeightSliderPanel(8축) + ContextEditor + BriefingInput + recharts (FX-REQ-336, P0) | Sprint 155 | ✅ | PR #291. 8 페르소나 × 8축 |
| F345 | 멀티 페르소나 평가 엔진 — POST /ax-bd/persona-eval(Claude SSE) + EvalProgress + EvalResults + 데모 모드 + Rate Limiting (FX-REQ-337, P0) | Sprint 155 | ✅ | PR #291. green/keep/red verdict |
| **Sprint 156 — 발굴 완료 리포트 (9탭 중 4탭 선 구현)** | | | | |
| F346 | 리포트 공통 컴포넌트 + 프레임 — StepHeader + InsightBox + MetricCard + NextStepBox + HITLBadge + 9탭 프레임 + GET /discovery-report/:itemId (FX-REQ-338, P0) | Sprint 156 | ✅ | PR #292. Gap 96% |
| F347 | 리포트 탭 4종 — ReferenceAnalysisTab + MarketValidationTab + CompetitiveLandscapeTab + OpportunityIdeationTab (FX-REQ-339, P0) | Sprint 156 | ✅ | PR #292. 차트 포함 |
| **Sprint 157 — 나머지 탭 + 팀 검토 + Export** | | | | |
| F348 | 리포트 탭 5종 완성 — 2-5~2-9 (FX-REQ-340, P1) | Sprint 157 | ✅ | PR #293. Match 94% |
| F349 | 팀 검토 & Handoff — TeamReviewPanel + ExecutiveSummary + decide API + HandoffChecklist (FX-REQ-341, P0) | Sprint 157 | ✅ | PR #293. Go/Hold/Drop 투표 |
| F350 | 리포트 공유 + PDF Export — ShareReportButton + ExportPdfButton + html2canvas (FX-REQ-342, P1) | Sprint 157 | ✅ | PR #293 |
| **Phase 16 — Prototype Auto-Gen (PRD→Prototype 자동 생성)** | | | | PRD: `docs/specs/prototype-auto-gen/prd-final.md` |
| **Sprint 158 — Foundation + Builder Server** | | | | |
| F351 | React SPA 템플릿 + Builder Server 스캐폴딩 (FX-REQ-343, P0) | Sprint 158 | ✅ | Phase 16 Foundation. PR #294 | Phase 16 Foundation. Phase 15 독립 |
| F352 | Claude Code CLI `--bare` 모드 서버 실행 검증 — E2E PoC: PRD입력→CLI실행→빌드→Pages배포→URL반환. Haiku 모델 비용 실측. --allowedTools 권한 설정 (FX-REQ-344, P0) | Sprint 158 | ✅ | F351 동시 |
| **Sprint 159 — Core Pipeline + API** | | | | |
| F353 | D1 마이그레이션 + Prototype API — prototypes 테이블(D1) + POST/GET/PATCH /api/prototypes 3 라우트 + PrototypeService + Zod 스키마 + State Machine(queued→building→live/failed→dead_letter) (FX-REQ-345, P0) | Sprint 159 | ✅ | F351 선행 |
| F354 | Fallback 아키텍처 + 비용 모니터링 — CLI→API직접호출 자동 전환 + API 사용량/비용 실시간 추적 + 월 예산 상한 알림 (FX-REQ-346, P0) | Sprint 159 | ✅ | F353 동시 |
| **Sprint 160 — O-G-D 품질 루프 + Web 통합** | | | | |
| F355 | O-G-D 품질 루프 — Orchestrator(체크리스트 전처리) + Generator(--bare -p, Haiku) + Discriminator(Pass/Fail 판정) + 수렴 판정(max 3 rounds, ≥0.85 탈출) (FX-REQ-347, P0) | Sprint 160 | ✅ | F353 선행 |
| F356 | Prototype 대시보드 + 실사용자 피드백 Loop — 목록/상세/빌드로그/iframe 프리뷰 + BD팀 피드백 입력→Generator 재생성 자동 반영 + Slack 알림 (FX-REQ-348, P1) | Sprint 160 | ✅ | F353 선행. F355 병렬 |
| **Phase 17 — Self-Evolving Harness v2 (하네스 자가 발전 루프 완성)** | | | | PRD: `docs/specs/fx-harness-evolution/prd-final.md`. 전략: `docs/specs/self-evolving-harness-strategy.md` (FX-STRT-015 v3.0) |
| **Sprint 161 — 데이터 진단 + 패턴 감지** | | | | |
| F357 | 데이터 상태 진단 + 기준선 수립 — execution_events/task_histories 데이터 양·기간·품질 진단. 반복 실패 패턴 추출 가능성 확인. 기준선 보고서 생성 (FX-REQ-349, P0) | Sprint 161 | ✅ | PR #298. Match 100%, 18 tests |
| F358 | 반복 실패 패턴 감지 + Rule 초안 생성 — PatternDetector(source × severity 클러스터링) + RuleGenerator(LLM Haiku 기반 자연어 Rule 초안, 패턴 근거 주석 포함) (FX-REQ-350, P0) | Sprint 161 | ✅ | PR #298 |
| **Sprint 162 — 승인 플로우 + Rule 배치** | | | | |
| F359 | 세션 내 Rule 승인 플로우 — GuardRailDeployService + POST deploy API + builder 미들웨어 버그 수정. YAML frontmatter Rule 파일 생성 (FX-REQ-351, P0) | Sprint 162 | ✅ | PR #299. Match 97%, 10 tests 추가 |
| **Sprint 163 — O-G-D Loop 범용화** | | | | |
| F360 | O-G-D Loop 범용 인터페이스 + 어댑터 레지스트리 (FX-REQ-352, P0) | Sprint 163 | ✅ | PR #301 |
| **Sprint 164 — 운영 지표 + 효과 측정** | | | | |
| F361 | 에이전트 자기 평가 연동 + Rule 효과 측정 (FX-REQ-353, P1) | Sprint 164 | ✅ | PR #300 |
| F362 | 운영 지표 대시보드 — Skill 재사용률 + 에이전트 활용률 + Dashboard 탭 (FX-REQ-354, P1) | Sprint 164 | ✅ | PR #300 |

| **Phase 18 — Offering Pipeline (AX BD 형상화 자동화)** | | | | PRD: `docs/specs/fx-offering-pipeline/prd-final.md`. 아키텍처: `docs/specs/FX-Skill-Agent-Architecture/FX-Skill-Agent-Architecture-v2.md` |
| **Sprint 165 — Foundation: Skill 등록 + 디자인 토큰** | | | | |
| F363 | offering-html SKILL.md 등록 + ax-bd/shape/ 디렉토리 + INDEX.md (FX-REQ-355, P0) | Sprint 165 | ✅ | PR #302. Match 100% |
| F364 | HTML 템플릿 분리 — base.html + 17종 컴포넌트 + examples/KOAMI (FX-REQ-356, P0) | Sprint 165 | ✅ | PR #302 |
| F365 | 디자인 토큰 Phase 1 — design-tokens.md 컬러/타이포/레이아웃 (FX-REQ-357, P1) | Sprint 165 | ✅ | PR #302 |
| F366 | F275 Skill Registry 연동 — evolution: DERIVED 선언 (FX-REQ-358, P1) | Sprint 165 | ✅ | PR #302 |
| **Sprint 166 — Foundation: Agent 확장 + PPTX 설계** | | | | |
| F367 | offering-pptx SKILL.md 등록 + Cowork 연동 설계 (FX-REQ-359, P1) | Sprint 166 | ✅ | PR #303. Match 97% |
| F368 | ax-bd-offering-agent — shaping-orchestrator 확장, 6 capability (FX-REQ-360, P0) | Sprint 166 | ✅ | PR #303 |
| **Sprint 167 — Data Layer: D1 + CRUD** | | | | |
| F369 | D1 마이그레이션 — offerings/offering_versions/offering_sections/offering_design_tokens (FX-REQ-361, P0) | Sprint 167 | ✅ | PR #305. Match 99% |
| F370 | Offerings CRUD API — POST/GET/PUT/DELETE + Zod 스키마 + 서비스 (FX-REQ-362, P0) | Sprint 167 | ✅ | PR #305 |
| F371 | Offering Sections API — 18섹션 CRUD + 필수/선택 토글 (FX-REQ-363, P0) | Sprint 167 | ✅ | PR #305 |
| **Sprint 168 — Data Layer: Export + Validate** | | | | |
| F372 | Offering Export API — HTML/PDF export, base.html + 컴포넌트 렌더링 (FX-REQ-364, P0) | Sprint 168 | ✅ | PR #307. Match 100% |
| F373 | Offering Validate API — O-G-D Loop(F335) + Six Hats + Expert 호출 (FX-REQ-365, P0) | Sprint 168 | ✅ | PR #307 |
| **Sprint 169 — Full UI: 목록 + 위자드** | | | | |
| F374 | Offerings 목록 페이지 — 리스트 뷰, 상태 필터, 버전 히스토리 (FX-REQ-366, P0) | Sprint 169 | ✅ | PR #310. Match 100% |
| F375 | Offering 생성 위자드 — 발굴 연결 + 목적/포맷/목차 선택 (FX-REQ-367, P0) | Sprint 169 | ✅ | PR #310 |
| **Sprint 170 — Full UI: 에디터 + 검증 대시보드** | | | | |
| F376 | 섹션 에디터 + HTML 프리뷰 — 실시간 프리뷰, 섹션별 편집 (FX-REQ-368, P0) | Sprint 170 | ✅ | PR #309. Match 100% |
| F377 | 교차검증 대시보드 — GAN 추진론/반대론 + Six Hats + Expert 시각화 (FX-REQ-369, P1) | Sprint 170 | ✅ | PR #309 |
| **Sprint 171 — Integration: 어댑터 + 파이프라인** | | | | |
| F378 | 콘텐츠 어댑터 — 3가지 톤 변환 (executive/technical/critical) + UI (FX-REQ-370, P0) | Sprint 171 | ✅ | PR #312. Match 95% |
| F379 | discover → shape 자동 전환 — EventBus(F334) 이벤트 발행/소비 (FX-REQ-371, P0) | Sprint 171 | ✅ | PR #312 |
| **Sprint 172 — Integration: PPTX 구현** | | | | |
| F380 | offering-pptx 구현 — PPTX 생성 엔진 + 표준 목차 슬라이드 변환 (FX-REQ-372, P1) | Sprint 172 | ✅ | PR #313. Match 97% |
| **Sprint 173 — Polish: 토큰 에디터 + Prototype** | | | | |
| F381 | 디자인 토큰 Phase 2+3 — JSON 정규 + API + Web 실시간 에디터 (FX-REQ-373, P1) | Sprint 173 | ✅ | PR #314. Match 97% |
| F382 | prototype-builder 연동 — Offering → Phase 16 Builder 자동 호출 (FX-REQ-374, P1) | Sprint 173 | ✅ | PR #314 |
| **Sprint 174 — Polish: E2E + 메트릭** | | | | |
| F383 | E2E 파이프라인 테스트 + BD ROI 메트릭 수집 F274+F278 연동 (FX-REQ-375, P1) | Sprint 174 | ✅ | PR #315. Match 100% |
| **Phase 19 — Builder Evolution (Prototype 품질 자동화)** | | | | PRD: `docs/specs/fx-builder-evolution/prd-final.md`. 착수: Conditional (PoC 조건부) |
| **Sprint 175 — M0: 검증 PoC** | | | | |
| F384 | CLI `--bare` rate limit/안정성 PoC — subprocess 통합 + 장시간 테스트 (FX-REQ-376, P0) | Sprint 175 | ✅ | PR #304 |
| F385 | 5차원 평가 재현성 검증 — 동일 코드 3회 평가 ±10점 이내 + 인간 평가 상관관계 (FX-REQ-377, P0) | Sprint 175 | ✅ | PR #304 |
| **Sprint 176 — M1: 5차원 스코어링 엔진** | | | | F384, F385 선행 |
| F386 | 5차원 품질 스코어러 구현 — 빌드/UI/기능/PRD반영/코드품질 (FX-REQ-378, P0) | Sprint 176 | ✅ | PR #306 |
| F387 | 베이스라인 측정 + D1 저장 — 5종 프로토타입 점수 측정 + API 조회 (FX-REQ-379, P0) | Sprint 176 | ✅ | PR #306 |
| **Sprint 177 — M2+M3: CLI 통합 + 자동 개선** | | | | F384 선행 |
| F388 | CLI 듀얼 모드 — Claude Max CLI primary + API fallback 자동 전환 (FX-REQ-380, P0) | Sprint 177 | ✅ | PR #308 |
| F389 | Enhanced O-G-D 루프 — 타겟 피드백 + 5라운드 80점 수렴 + 장애 복구 (FX-REQ-381, P0) | Sprint 177 | ✅ | PR #308 |
| **Sprint 178 — M4: 품질 대시보드** | | | | |
| F390 | Builder Quality 대시보드 — 점수 카드 + 레이더 차트 + 개선 추이 (FX-REQ-382, P1) | Sprint 178 | ✅ | PR #311 |
| F391 | 사용자 피드백 루프 — BD팀/고객 수동 평가 + 자동 점수 상관관계 캘리브레이션 (FX-REQ-383, P1) | Sprint 178 | ✅ | PR #311 |

| **Phase 20 — AX BD MSA 재조정 (모놀리스 모듈화 + harness-kit)** | | | | PRD: `docs/specs/ax-bd-msa/prd-final.md`. 착수: Conditional(67점) + Ambiguity 0.095 → 사용자 확정 |
| **Phase 20-A: 모듈화 (Sprint 179~184) — 단일 Workers 내 분리** | | | | |
| **Sprint 179 — M1: 분류 + 아키텍처 결정** | | | | |
| F392 | 전체 라우트/서비스/스키마 서비스별 태깅 + D1 테이블 소유권 태깅 + 크로스 서비스 FK 목록 (FX-REQ-384, P0) | Sprint 179 | ✅ | PR #316. service-mapping.md(594줄) + d1-ownership.md(293줄) + adr-001-d1-shared-db.md |
| F393 | F268~F391 증분 124건 서비스 배정 확정 + MSA 설계서 v4 갱신 (FX-REQ-385, P0) | Sprint 179 | ✅ | PR #316. MSA 설계서 v4 갱신(+117줄) |
| **Sprint 180 — M1: harness-kit 패키지 생성** | | | | |
| F394 | harness-kit 패키지 — Workers scaffold + D1 setup + JWT 미들웨어 + CORS + 이벤트 인터페이스 + CI/CD 템플릿 (FX-REQ-386, P0) | Sprint 180 | ✅ | PR #317. packages/harness-kit/ (42파일, +2278줄) |
| F395 | `harness create` CLI 명령 PoC + ESLint 크로스서비스 접근 금지 룰 (FX-REQ-387, P0) | Sprint 180 | ✅ | PR #317. CLI + no-cross-module-import ESLint 룰 |
| **Sprint 181~184 — M2: 코드 모듈화** | | | | |
| F396 | Auth/SSO 모듈 분리 → `modules/auth/` + Dashboard/KPI/Wiki → `modules/portal/` (FX-REQ-388, P0) | Sprint 181~182 | ✅ | PR #318(auth 29파일) + PR #319(portal 115파일). Match 100% |
| F397 | 검증 → `modules/gate/` + 제품화/GTM → `modules/launch/` + Foundry-X 코어 정리 (FX-REQ-389, P0) | Sprint 183~184 | ✅ | PR #320(gate+launch) + PR #321(core 5도메인). Match 100% |
| **Phase 20-B: 분리 준비 (Sprint 185~188) — 인프라 + 이벤트 + IA 개편** | | | | |
| **Sprint 185~186 — M3: 이벤트 + 프록시 + IA** | | | | |
| F398 | 이벤트 카탈로그 8종 스키마 확정 + EventBus PoC + **Web IA 개편** (`/ax-bd/*` redirect, 사이드바 서비스 경계 그룹, "이관 예정" 라벨, 코어 메뉴 정리) (FX-REQ-390, P1) | Sprint 185 | ✅ | PR #322. events/(catalog+d1-bus+index) + D1 0114 + sidebar.tsx IA 개편 + sidebar-ia.test |
| F399 | Strangler Fig 프록시 레이어 + harness-kit 이벤트 유틸리티 (FX-REQ-391, P1) | Sprint 186 | ✅ | PR #323. D1EventBus + createEvent + Strangler MW + proxy 리팩토링. Match 100% |
| **Sprint 187~188 — M4: 통합 검증 + Production** | | | | |
| F400 | E2E 서비스별 태깅 + IA 변경 E2E 검증 + 전체 회귀 테스트 + Gate-X scaffold PoC (FX-REQ-392, P1) | Sprint 187 | ✅ | PR #324. E2E 48파일 서비스 태그 + Gate-X PoC scaffold. Match 100% |
| F401 | Production 배포 + smoke test + harness-kit 문서화 + 개발자 가이드 (FX-REQ-393, P1) | Sprint 188 | ✅ | Smoke test 7/7 + harness-kit README + developer-guide + migration-guide. Match 100% |
| **Phase 21: Gate-X 독립 서비스 (Sprint 189~) — PRD: `docs/specs/gate-x/prd-final.md`** | | | | |
| **Phase 21-A: 코어 API + 독립 배포 (M1, P0)** | | | | |
| F402 | Gate-X 독립 Workers 프로젝트 scaffold + wrangler.toml + D1 전용 DB 생성 (FX-REQ-394, P0) | Sprint 189 | ✅ | PR #326. packages/gate-x/ scaffold + wrangler.toml + D1 migrations |
| F403 | Gate 모듈 추출 — 7 routes + 7 services + 6 schemas 독립 Workers 이전 (FX-REQ-395, P0) | Sprint 189 | ✅ | PR #326. 39 files, +2,171줄. Gate 모듈 독립 추출 완료 |
| F404 | O-G-D 루프 비동기 아키텍처 — Cloudflare Queues + Durable Objects PoC (FX-REQ-396, P0) | Sprint 190 | ✅ | PR #328. Queue worker + DO OgdCoordinator + 비동기 검증 파이프라인 |
| F405 | JWT 독립 인증 + API Key 발급 + RBAC + CI/CD 파이프라인 (FX-REQ-397, P0) | Sprint 190 | ✅ | PR #328. 21 files, +1,747줄. JWT/API Key/RBAC + gate-x-deploy.yml |
| **Phase 21-B: 이벤트 연동 + Web UI + 다중 모델 (M2, P1)** | | | | |
| F406 | Foundry-X ↔ Gate-X 이벤트 연동 — D1EventBus + 이벤트 유실 복구 메커니즘 (FX-REQ-398, P1) | Sprint 191 | ✅ | PR #329. 13 files, +1,143줄. gate-event-bridge + event-status 라우트 + 복구 메커니즘 |
| F407 | Gate-X Web UI 대시보드 �� 검증 파이프라인 운영 + 리포트 (FX-REQ-399, P1) | Sprint 192 | ✅ | PR #330. 38 files, +3,150줄. Gate-X Web UI 대시보드 + 다중 AI 모델 |
| F408 | 다중 AI 모델 지원 — LLM 추상화 레이어 + 모델별 폴백 전략 (FX-REQ-400, P1) | Sprint 192 | ✅ | PR #330. LLM 추상화 레이어 + 모델별 폴백 전략 |
| **Phase 21-C: 확장 기능 (M3, P1~P2)** | | | | |
| F409 | 커스텀 검증 룰 엔진 — 사용자 정의 루브릭 + 검증 기준 관리 (FX-REQ-401, P1) | Sprint 193 | ✅ | 커스텀 룰 CRUD 6엔드포인트 + JSON DSL 조건 평가 + D1 migration + 24 tests |
| F410 | 외부 웹훅 연동 + 멀티테넌시 격리 — 테넌트별 데이터/API 분리 (FX-REQ-402, P2) | Sprint 194 | ✅ | PR #336. WebhookService + TenantService + D1 migration + tenant 격리 미들웨어 + 342 tests |
| **Phase 21-D: SaaS 기반 (M4, P2)** | | | | |
| F411 | 과금 체계 — API 호출량 추적 + 요금제 (Free/Pro/Enterprise) (FX-REQ-403, P2) | Sprint 195 | ✅ | PR #339. plan-service + usage-tracking-service + billing routes + D1 migration |
| F412 | SDK/CLI 클라이언트 — TypeScript SDK + CLI 도구 + API 문서 (FX-REQ-404, P2) | Sprint 196 | ✅ | @foundry-x/gate-x-sdk. GateXClient 3리소스 15메서드 + CLI 4커맨드 + 30 tests. Match 97% |
| **Phase 21-E: Foundry-X 사전 정리 (M5, P2)** | | | | |
| F413 | Foundry-X 수집 코드 격리 — `core/collection/` 분리 (4 routes + 5 services + 5 schemas) Discovery-X 이관 사전 정리 (FX-REQ-405, P2) | Sprint 197 | ✅ | PR #327. 35 files, +254줄. core/collection/ 모듈 분리 완료. Strangler Fig 사전 작업 |
| **Phase 22: Offering Skill v2 (Sprint 198~) — PRD: `docs/specs/axbd-offering/prd-final.md`** | | | | |
| **Phase 22-A: 표준화 + MVP (M1, P0)** | | | | |
| F414 | 표준 목차 엔진 — 가이드 18섹션 내장 + 필수/선택 자동 판단 (FX-REQ-406, P0) | Sprint 198 | ✅ | 20섹션 목차 + 경영 언어/KT 연계 원칙 내장. Match 100% |
| F415 | 디자인 시스템 v2 — 컬러/타이포/레이아웃/컴포넌트 12종 CSS variable 구현 (FX-REQ-407, P0) | Sprint 198 | ✅ | 5개 신규 컴포넌트 + design-tokens v2. Match 100% |
| F416 | 발굴 산출물 자동 매핑 — 2-0~2-8 단계별 섹션 매핑 테이블 (FX-REQ-408, P0) | Sprint 199 | ✅ | section-mapping.md + 역매핑 + 탐색 키워드. Match 100% |
| F417 | 경영 언어 원칙 적용 — 톤/표현 규칙 스킬 로직 내장 (FX-REQ-409, P0) | Sprint 199 | ✅ | writing-rules.md + KT 3축 + 고객 톤 3종. Match 100% |
| **Phase 22-B: KT 연계 + 교차검증 (M2, P0)** | | | | |
| F418 | KT 연계 원칙 강제 — 추진배경 3축 필수 체크 + KT 미연계 경고 (FX-REQ-410, P0) | Sprint 200 | ✅ | 3축 HARD STOP + SOFT WARN. Match 100% |
| F419 | GAN 교차검증 자동화 — 표준 질문 풀 + 추진론/반대론/판정 자동 생성 (FX-REQ-411, P0) | Sprint 200 | ✅ | cross-validation.md + 종합 판정. Match 100% |
| **Phase 22-C: 확장 기능 (M3, P1)** | | | | |
| F420 | PPTX 변환 — HTML→PPTX 변환 + offering-pptx 스킬 체이닝 (FX-REQ-412, P1) | Sprint 201 | ✅ | Step 9 PPTX 체이닝. Match 100% |
| F421 | 버전 이력 추적 — v0.1→v1.0 변경 이력 + diff 보기 (FX-REQ-413, P1) | Sprint 201 | ✅ | 버전 이력 자동 기록. Match 100% |
| F422 | 피드백 반영 자동화 — 임원 피드백→섹션별 자동 수정 + 변경 마커 (FX-REQ-414, P1) | Sprint 202 | ✅ | Step 5 v2.3 — 6단계 피드백 흐름. Match 100% |
| **Phase 22-D: Prototype Builder v2 (M4, P0) — PRD: `docs/specs/fx-builder-v2/prd-final.md`** | | | | |
| F423 | impeccable 디자인 스킬 통합 — 7도메인 참조문서 + 안티패턴을 Generator 프롬프트에 주입 (FX-REQ-415, P0) | Sprint 203 | ✅ | PR #337. 7 files, +851줄. impeccable 7도메인 참조문서 + Generator/Discriminator 통합 |
| F424 | 디자인 안티패턴 차단 — impeccable 안티패턴 목록을 Discriminator에 추가, 재생성 트리거 (FX-REQ-416, P0) | Sprint 203 | ✅ | PR #337. 안티패턴 체크리스트 + 재생성 트리거. Match 100% |
| F425 | PRD 정합성 LLM 판별 — prd 차원 키워드→LLM 의미 비교 교체 (FX-REQ-417, P0) | Sprint 204 | ✅ | PR #342. +682줄, 6 files. LLM 의미 비교 판별기 |
| F426 | 5차원 LLM 통합 판별 — 체크리스트→LLM 평가 전환 (FX-REQ-418, P0) | Sprint 204 | ✅ | PR #342. 5차원 LLM 통합 판별 + temp=0 structured JSON |
| F427 | Vision API 시각 평가 — 스크린샷 기반 UI 품질 LLM 평가 (FX-REQ-419, P0) | Sprint 205 | ✅ | PR #346. vision-evaluator.ts 374줄 + 테스트 170줄 |
| F428 | max-cli 본격 통합 — WSL CLI→Builder 파이프라인 연결 + API fallback (FX-REQ-420, P0) | Sprint 205 | ✅ | PR #346. cli-runner + fallback 확장 + cost-tracker |
| F429 | max-cli 큐 관리 — 단일 머신 빌드 큐잉 + 순차 실행 + 타임아웃 (FX-REQ-421, P0) | Sprint 206 | ✅ | PR #349. BuildQueue + 순차 실행 + 타임아웃. Match 97% |
| F430 | 디자인 커맨드 파이프라인 — /audit→/normalize→/polish O-G-D 루프 매핑 (FX-REQ-422, P1) | Sprint 206 | ✅ | PR #349. DesignPipeline + impeccable 커맨드 매핑 |
| F431 | 판별 피드백 구체화 — LLM 판별→구체적 수정 지시 변환 + Generator 자동 주입 (FX-REQ-423, P1) | Sprint 207 | ✅ | PR #351. ogd-feedback-converter + Generator/Orchestrator 통합. Match 100% |
| **Phase 23: Sprint Automation v2 (Sprint 208~) — Sprint Pipeline 종단 자동화** | | | | |
| **Phase 23-A: Pipeline E2E 자동화 (M1, P0)** | | | | |
| F432 | Sprint Pipeline 종단 자동화 — Phase 6(Gap Analyze 집계) + Phase 7(Auto Iterator) + Phase 8(Session-End) 추가 (FX-REQ-424, P0) | Sprint 243 | ✅ | `scripts/sprint-pipeline-finalize.sh` + `.claude/skills/sprint-pipeline/` project override. Match 95% |
| F433 | Sprint Monitor 고도화 — Pipeline 전체 Phase(6~8) 진행률 Gist 표시 + Monitor 생존 감시 + 자동 재시작 (FX-REQ-425, P0) | Sprint 243 | ✅ | `scripts/sprint-watch-liveness.sh` + sprint-watch SKILL.md 편집 (실데이터 연동 + finalize 트리거). Match 95% |
| **Phase 24: Discovery Native (Sprint 209~) — PRD: `docs/specs/fx-discovery-native/prd-final.md`** | | | | |
| **Phase 24-A: IA 정리 + 온보딩 (M1, P0)** | | | | |
| F434 | 사이드바 정리 — 2.발굴 + 3.형상화만 남기고 1/4/5/6단계 제거 (FX-REQ-426, P0) | Sprint 209 | ✅ | sidebar.json + 라우트 정리. Admin 메뉴 유지 |
| F435 | 위저드형 온보딩 — 시작하기 페이지에서 사업 아이템 등록 위저드 (FX-REQ-427, P0) | Sprint 209 | ✅ | 프롬프트 입력 또는 자료 업로드. 병렬: F434 |
| **Phase 24-B: 발굴 네이티브 전환 (M2, P0)** | | | | |
| F436 | 아이템 등록 CRUD — 사업 아이템 생성/조회/수정/삭제 (FX-REQ-428, P0) | Sprint 210 | ✅ | 기존 biz_items 또는 새 스키마. Clean Slate |
| F437 | 발굴 분석 대시보드 — 아이템별 11단계 분석 진행 상태 표시 (FX-REQ-429, P0) | Sprint 210 | ✅ | 단계별 카드/타임라인 UI. 병렬: F436 |
| F438 | 발굴 분석 실행 — AI 자동 수행 + 사용자 검토/보완 (FX-REQ-430, P0) | Sprint 211 | ✅ | 11단계 중 MVP 최소 3단계. F436 선행 |
| **Phase 24-C: 아이템 허브 + 형상화 연결 (M3, P0)** | | | | |
| F439 | 아이템 상세 페이지 — 기본정보 + 발굴결과 + 형상화 산출물 통합 (FX-REQ-431, P0) | Sprint 212 | ✅ | 파이프라인 진행 상태 표시. F438 선행 |
| F440 | 사업기획서 생성 — 발굴 분석 완료 후 AI 기반 자동 생성 (FX-REQ-432, P0) | Sprint 212 | ✅ | 발굴 결과 기반. 병렬: F439 |
| **Phase 25: Discovery Pipeline v2 (Sprint 213~) — PRD: `docs/specs/fx-discovery-pipeline-v2/prd-final.md`** | | | | |
| **Phase 25-A: 파일 업로드 + 자료 기반 분석 (M1, P0)** | | | | |
| F44| 파일 업로드 인프라 — R2 Presigned URL + 멀티 파일 업로드 UI + 파일 메타 D1 테이블 (FX-REQ-433, P0) | Sprint 213 | ✅ | R2 버킷 + presigned URL 서명 + 업로드 UI 컴포넌트 |
| F44| 문서 파싱 엔진 — PDF/PPT/DOCX → 텍스트 추출 + 구조화 (FX-REQ-434, P0) | Sprint 213 | ✅ | Workers AI 또는 외부 파싱 API. 병렬: F441 |
| F44| 자료 기반 발굴 입력 — 업로드 문서 파싱→아이템 등록 + 분석 컨텍스트 자동 주입 (FX-REQ-435, P0) | Sprint 214 | ✅ | F441+F442 선행. 온보딩 위저드 확장 |
| **Phase 25-B: 생성 고도화 (M2, P0)** | | | | |
| F44| 사업기획서 편집기 — 섹션별 인라인 편집 + AI 재생성 + 버전 이력 (FX-REQ-436, P0) | Sprint 215 | ✅ | 기존 생성 결과에 편집 레이어 추가. F440 기반 |
| F44| 기획서 템플릿 다양화 — 용도별 3종(내부보고/제안서/IR피치) + 톤/분량 커스텀 (FX-REQ-437, P0) | Sprint 215 | ✅ | 템플릿 선택 UI + 생성 파라미터. 병렬: F444 |
| F44| 내보내기 강화 — 사업기획서 PDF/PPTX 내보내기 + 디자인 토큰 적용 (FX-REQ-438, P0) | Sprint 216 | ✅ | F444 선행. 기존 offering-export 패턴 활용 |
| **Phase 25-C: E2E 흐름 보완 (M3, P1)** | | | | |
| F44| 파이프라인 상태 추적 — 아이템별 온보딩→발굴→형상화→Offering 전체 진행률 시각화 (FX-REQ-439, P1) | Sprint 217 | ✅ | 스테퍼/타임라인 UI + 상태 집계 API |
| F44| 단계 간 자동 전환 — 발굴 완료→형상화/기획서 자동 제안 + 원클릭 진행 (FX-REQ-440, P1) | Sprint 217 | ✅ | 파이프라인 이벤트 + CTA 버튼. 병렬: F447 |
| **Phase 25-D: 운영 품질 (M4, P1)** | | | | |
| F44| 에러/로딩 UX — API 실패 재시도 UI + 스켈레톤 로딩 + 빈 상태 안내 (FX-REQ-441, P1) | Sprint 218 | ✅ | 공통 ErrorBoundary + LoadingSkeleton 컴포넌트 |
| F450 | 반응형 + 접근성 — 모바일 대응 + ARIA 라벨 + 키보드 내비게이션 (FX-REQ-442, P1) | Sprint 218 | ✅ | Discovery 관련 페이지 대상. 병렬: F449 |
| **Phase 26: BD Portfolio Management (Sprint 219~) — 사업 포트폴리오 일괄 관리** | | | | |
| **Phase 26-A: 사업 아이템 일괄 등록 + 문서 연결 (M1, P0)** | | | | |
| F451 | Clean Sheet + 사업 아이템 일괄 등록 — 기존 데이터 초기화 + 4건(KOAMI/XR/IRIS/Deny) biz_items 등록 (FX-REQ-443, P0) | Sprint 219 | ✅ | D1 전체 삭제 + INSERT 4건 + pipeline_stages REGISTERED |
| F452 | 사업기획서/Offering 연결 — HTML 원본 R2 업로드 + D1 메타데이터 등록 + offerings 4건 (FX-REQ-444, P0) | Sprint 219 | ✅ | business_plan_drafts 4건 + offerings 4건 + uploaded_files 9건 |
| F453 | Prototype 역등록 — Deny PoC HTML을 Prototype v1으로 등록 (FX-REQ-445, P0) | Sprint 219 | ✅ | 기존 산출물 역분해 패턴 |
| **Phase 26-B: PRD 생성 파이프라인 (M2, P0)** | | | | |
| F454 | 1차 PRD 자동 생성 — 사업기획서 HTML 파싱 → PRD 자동 생성 (FX-REQ-446, P0) | Sprint 219 | ✅ | 4건 PRD MD 생성 + D1 biz_generated_prds 등록 |
| F455 | 2차 PRD 보강 — AI 자동 보강 (갭분석+유저스토리+비기능요구사항) (FX-REQ-447, P0) | Sprint 219 | ✅ | 4건 v2 생성 + D1 등록 |
| F456 | 최종 PRD 확정 — v1+v2 통합 PDCA 정렬 PRD 생성 + 버전 관리 (FX-REQ-448, P0) | Sprint 219 | ✅ | 4건 final 생성 + D1 version 3 등록 |
| **Phase 26-C: Prototype 생성 + 연결 (M3, P1)** | | | | |
| F457 | Prototype Builder 실행 — KOAMI 신규 + Deny v2 Prototype 자동 생성 (FX-REQ-449, P1) | Sprint 219 | ✅ | KOAMI 6화면 + Deny 3-Panel SOC |
| F458 | Prototype 등록 — R2 업로드 + D1 prototypes 등록 (FX-REQ-450, P1) | Sprint 219 | ✅ | R2 + D1 등록 완료. Deny v1+v2 2건 |
| **Phase 26-D: E2E 검색/편집 인프라 (M4, P1)** | | | | |
| F459 | 포트폴리오 연결 구조 검색 — Portfolio Graph API + 역조회 + 커버리지 (FX-REQ-451, P1) | Sprint 223 | ✅ | Graph API + PortfolioService + 8테이블 병렬조회 (Match 96%) |
| F460 | 포트폴리오 대시보드 — 카드목록 + 연결그래프 + 산출물미리보기 (FX-REQ-452, P1) | Sprint 223 | ✅ | PortfolioView + PipelineProgressBar + PortfolioGraph + 대시보드 카운트 연동 |
| **Phase 27: BD Quality System F461~F470** | | | | PRD: `docs/specs/fx-bd-quality-system/prd-final.md` |
| **Phase 27-A: QSA 에이전트 3종 (M1, P0)** | | | | |
| F461 | Prototype QSA 구현 — 5차원 품질/보안 Discriminator + First Principles Gate + CSS 정적 분석 (FX-REQ-453, P0) | Sprint 226 | ✅ | PrototypeQsaAdapter + 테스트 (PR #380, Match 98%) |
| F462 | Offering QSA 구현 — HTML/PPTX 품질/보안/디자인 판별 + 18섹션 구조 검증 (FX-REQ-454, P0) | Sprint 226 | ✅ | OfferingQsaAdapter + 테스트 (PR #380, Match 98%) |
| F463 | PRD QSA 구현 — PRD 완결성/논리성/실행가능성 판별 + 착수 판단 기준 (FX-REQ-455, P0) | Sprint 225 | ✅ | PrdQsaAdapter + 테스트 (PR #379, Match 100%) |
| **Phase 27-B: 파이프라인 GAP 복구 (M2, P0)** | | | | |
| F464 | Generation–Evaluation 정합성 — impeccable 7도메인 ↔ Discriminator 체���리스트 자동 정렬 (FX-REQ-456, P0) | Sprint 227 | ✅ | prototype-ogd-adapter.ts 수정 |
| F465 | Design Token → Generation 연결 — DesignTokenService 토큰을 prototype-styles.ts에 주입 (FX-REQ-457, P0) | Sprint 227 | ✅ | prototype-styles.ts 확장 |
| F466 | Feedback → Regeneration 루프 — feedback_pending Job의 피드백을 Generator에 전달하여 재생성 (FX-REQ-458, P0) | Sprint 228 | ✅ | triggerRegeneration + 피드백→OGD 루프 (PR #381, Match 96%) |
| F467 | Quality 데이터 통합 — ogd_rounds → prototype_quality 자동 적재 + 5차원 분해 (FX-REQ-459, P0) | Sprint 228 | ✅ | fromOgdResult + 자동 INSERT (PR #381, Match 96%) |
| **Phase 27-C: BD Sentinel 통합 (M3, P0)** | | | | |
| F468 | BD Sentinel 구현 — 7+ Sector 자율 감시 메타 오케스트레이터 + DDPEV 사이클 (FX-REQ-460, P0) | Sprint 229 | ✅ | bd-sentinel.md + SentinelAuditService (PR #382, Match 100%) |
| **Phase 27-D: 디자인 고도화 (P1)** | | | | |
| F469 | CSS Anti-Pattern Guard — 생성 시점 AI 기본 폰트/순수 흑백/비배수 spacing 사전 차단 (FX-REQ-461, P1) | Sprint 230 | ✅ | styleseed+impeccable 원칙 적용 |
| F470 | HITL Review → Action 연결 — revision_requested 리뷰가 피드백→재생성 자동 트리거 (FX-REQ-462, P1) | Sprint 230 | ✅ | review-service → feedback-service 연결 |
| **Phase 27.5: QSA PoC F471~F474** | | | | PRD: `docs/specs/fx-qsa-poc/prd-final.md` |
| F471 | QSA 실행 — KOAMI/Deny 2건 5차원 품질 측정 (FX-REQ-463, P0) | Sprint 232 | ✅ | KOAMI 96.3%→100%, Deny 85.0%→96.3% PASS |
| F472 | CSS Guard 적용 — 2건 guardCss() + CSS 변수 폰트 교체 (FX-REQ-464, P0) | Sprint 232 | ✅ | 안티패턴 3건→0건 |
| F473 | QSA 재평가 — 대시보드 Rubric 분기 + 전후 비교 (FX-REQ-465, P0) | Sprint 232 | ✅ | detectPrototypeType() + 8/8 테스트 |
| F474 | DesignToken→Generator 연결 + 산업별 프리셋 5종 (FX-REQ-466, P0) | Sprint 232 | ✅ | flattenTokens + findPreset (5산업) + 11/11 테스트 |
| **독립 트랙: 운영 개선** | | | | |
| F475 | Marker.io 피드백 파이프라인 점검 — [Marker.io] 제목 패턴 자동 감지 + Issue 코멘트 자동 알림 (FX-REQ-467, P1) | — | ✅ | webhook 패턴 감지 + PATCH 코멘트 자동화 + GitHub Project 등록 |
| F476 | 피드백 관리 대시보드 — Admin 메뉴에 feedback_queue 현황 + 상태 관리 UI (FX-REQ-468, P2) | — | ✅ | feedback-dashboard.tsx + E2E 8건 |
| F477 | 피드백 Agent 자동 PR 생성 — feedback-consumer Agent PR 실패 원인 해소 (FX-REQ-469, P2) | — | ✅ | consumer.sh 전면 재작성 + 3단계 fallback + retry |
| **Phase 28: Discovery 동기화 파이프라인 F478~F483** | | | | Plan: `docs/01-plan/features/discovery-item-detail-review.plan.md` |
| F478 | STATUS_CONFIG 매핑 보완 — biz_items.status 전체 상태(classifying/classified/evaluating/evaluated) UI 매핑 (FX-REQ-470, P0) | Sprint 233 | ✅ | PR #388, Match 100% |
| F479 | 분석 완료 → pipeline/discovery_stages 자동 전환 — evaluate 완료 시 REGISTERED→DISCOVERY + discovery_stages 동기화 (FX-REQ-471, P0) | Sprint 233 | ✅ | PR #388, Match 100% |
| F480 | AnalysisStepper → Discovery Stage 전체 스텝퍼 리뉴얼 — 3단계 자동→11단계 HITL 스텝퍼, v82 유형별 강도 반영 (FX-REQ-472, P1) | Sprint 234 | ✅ | PR #389, Match 91% |
| F481 | 평가결과서 HTML 자동 생성 스킬 — PRD-final 파싱→발굴단계완료 HTML 9탭 포맷 자동 변환, CLAUDE_AXBD 스킬로 통합 (FX-REQ-473, P0) | Sprint 235 | ✅ | PR #391, Match 100%, generate-evaluation-report 커맨드 + 템플릿 |
| F482 | bd_artifacts 자동 등록 파이프라인 — Claude Code 스킬 분석 완료 시 API 호출로 bd_artifacts + discovery_stages 자동 동기화 (FX-REQ-474, P0) | Sprint 235 | ✅ | PR #391, Match 100%, sync-artifacts API + 8 tests |
| F483 | 웹 평가결과서 뷰어 — Discovery 상세 페이지에 발굴단계완료 HTML 평가결과서 조회/공유 기능 (FX-REQ-475, P1) | Sprint 236 | ✅ | PR #393, Match 100%, EvaluationReportViewer + HTML API + 18 tests |
| **Phase 28-B: Discovery Detail UX v2 F484~F487** | | | | Plan: `docs/01-plan/features/discovery-detail-ux-v2.plan.md` |
| F484 | 파이프라인 진행률 UI 개선 — 현재 단계 강조 + 상태 라벨 + pulse 애니메이션 (FX-REQ-476, P1) | Sprint 237 | ✅ | PR #390, Match 100%, PipelineProgressStepper 리디자인 |
| F485 | 발굴 분석 결과 표시 + HITL 피드백 루프 — 완료 단계 결과 펼쳐보기 + 피드백 반영 재실행 (FX-REQ-477, P1) | Sprint 238 | ✅ | PR #392, Match 100%, DiscoveryStageStepper 결과뷰 + 재실행 |
| F486 | 9기준 체크리스트 UX 정리 — 역할/가이드 명확화, AI 자동 평가 연동 (FX-REQ-478, P2) | Sprint 238 | ✅ | PR #392, Match 100%, DiscoveryCriteriaPanel UX 개선 |
| F487 | 발굴 리포트 500 에러 수정 — ax_discovery_reports item_id/biz_item_id 컬럼 불일치 해소 (FX-REQ-479, P0) | Sprint 237 | ✅ | PR #390, Match 100%, team-reviews.ts SQL 컬럼 정정 |
| **Phase 29: 요구사항 거버넌스 자동화 F488~F489** | | | | drift 근본 원인 치료 — `--create-issue` 기본화(β) + 구조적 공백/실시간 drift 분리 리포트 + 회고 통합 소급 등록 루틴 |
| F488 | `/ax:req-manage new` `--create-issue` 기본화 (β: 스마트) + req-integrity 2카테고리 리포트 — gh/token 존재 시 자동 Issue 생성, 부재 시 `/tmp/req-issue-skip.log` 경고 기록. req-integrity는 *구조적 공백*(F100+ 미등록)과 *실시간 drift*(상태 불일치) 분리 집계 (FX-REQ-480, P0) | Sprint 240 | ✅ | PR #405, Match 100%, ax-marketplace 2개 스킬 수정, `--no-issue` opt-out |
| F489 | `/ax:gov-retro` 회고 통합 소급 등록 루틴 — Phase 완료 시 해당 Phase의 미등록 F-items 일괄 GitHub Issue 등록. Phase 27→26 역순 선별 전략, Issues 인플레이션 통제 (FX-REQ-481, P2) | — | ✅ | Issue #407 (F488 dogfood로 첫 생성), gov-retro Step 7 추가, ax-marketplace `72165f8` |
| F490 | E2E workflow shard 병렬화 — `.github/workflows/e2e.yml` Playwright shard matrix(3~4) + `timeout-minutes` 상향(15→30). PR #394에서 동일 runner 2회 연속 15m17s timeout 관측, 테스트 suite 증가로 단일 job 한계 초과 (FX-REQ-482, P2) | — | ✅ | TD-03 승격. F498/Task로 구현, PR #432 merged (2026-04-10) |
| F491 | 테스트 공유 Org 모드 — `DEFAULT_SHARED_ORG_ID` env var 도입으로 signup/google/setup-password 3 flow에서 개인 Org 자동 생성 대신 지정된 공유 Org(`org_452b33c1` = AX 컨설팅팀)에 멤버십 부여. env 미설정 시 기존 개인 Org 동작 유지(폴백), null-return 헬퍼 패턴. 기존 Google 유저도 첫 재로그인 시 공유 Org에 멱등 backfill. **2026-04-09 End-to-end 검증 완료** — sinclair.seo@ideaonaction.ai Google OAuth 가입 → 공유 Org member 합류 + biz_items 3개 노출 확인. 팀원 @gmail 5명 프로액티브 backfill + Org 이름 "AX BD's Org"→"AX 컨설팅팀" rename + D1 유저명 3건 정정(김기록→김기욱/김경민→김경림/천대영→현대영) 병행. Org 생성/전환 기능(`OrgSwitcher`, `POST /orgs`, `POST /auth/switch-org`)은 그대로 작동 — F491은 기본 착륙점만 고정 (FX-REQ-483, P3) | — | ✅ | 독립 트랙. PR #410 merged. `packages/api/src/modules/auth/services/shared-org.ts` 헬퍼, `wrangler.toml [vars]+[env.staging.vars]`, 테스트 4건(auth-shared-org.test.ts), 기존 auth 30 tests 회귀 없음. 롤백 절차: `project_f491_shared_org.md` |
| F492 | FileUploadZone API 경로 drift 수정 — BASE_URL 통일 (Pages 오리진 405 해소). `packages/web/src/components/feature/FileUploadZone.tsx`가 `apiBaseUrl=""` 기본값으로 `${apiBaseUrl}/api/files/presign` 상대경로 호출 → Pages(`fx.minu.best`) 오리진에서 405 Method Not Allowed 반환, 파일 업로드 파이프라인(F441~F443) 전체 무력화. 실제 실패 케이스: `AI 시대 생산성 향상 가이드.pdf` (2026-04-09 세션 #244 사용자 DEBUG 제보). 수정: `BASE_URL`을 `api-client.ts`에서 직접 import, 경로에서 `/api` 제거, `apiBaseUrl` prop 완전 제거(FileUploadZone + AttachedFilesPanel). E2E 시나리오 4종(PDF/PPTX/DOCX 성공 + PNG 거부) 추가로 회귀 방지 (FX-REQ-484, P1) | Sprint 241 | ✅ | PR #415 merged, Match 100%, 3436 tests pass. FileUploadZone+AttachedFilesPanel apiBaseUrl prop 제거, BASE_URL import, E2E 4종 추가. 배포 완료 |
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
| C35 | C | task-start.sh worker git author 분리 — HOME별 .gitconfig 독립으로 worker commit이 `sinclairseo@gmail.com`(개인)으로 기록되는 함정 해소 (FX-REQ-530) | — | PLANNED | S260 C28 HOME 전파 후속, MEDIUM. `-c user.email=ktds.axbd@gmail.com` override 또는 HOME별 gitconfig symlink. PR #506(C32) author 사례로 노출 |
| C36 | C | sidebar에 `/work-management` 링크 추가 — admin-core 그룹, Kanban 아이콘 (FX-REQ-531) | — | DONE | PR #513. sidebar.json + navigation-loader.ts Kanban 아이콘 등록 |
| C37 | C | autopilot Gap% 측정 범위 확장 — Step 5b E2E audit 자동 호출 추가 (FX-REQ-532) | — | DONE | sprint-autopilot SKILL.md Step 5b 신설. Playwright 있을 때 `/ax:e2e-audit coverage` 자동 실행, 갭 시 WARN (중단 안 함) |
<!-- /fx-task-orchestrator-backlog -->

## §7 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Node.js 20, Commander + Ink |
| API Server | TypeScript, Hono on Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), Drizzle ORM |
| Auth | JWT (hono/jwt) + PBKDF2 (Web Crypto) + RBAC |
| Web Dashboard | Vite 8, React 18, React Router 7, Zustand |
| SDD Engine | Python, Plumb (subprocess) |
| 빌드 | pnpm workspace, Turborepo, tsc |
| 테스트 | vitest, ink-testing-library |
| CI/CD | GitHub Actions, wrangler-action, pages-action |
| Git 연동 | simple-git |

## §8 Tech Debt

| TD# | 등록일 | 항목 | 영향 |
|-----|:------:|------|------|
| ~~TD-01~~ | 2026-03-16 | ~~index.ts에 Commander 설정 미구현 (placeholder)~~ | ~~해소 (Sprint 2 — F6/F7/F8 커맨드 구현)~~ |
| ~~TD-02~~ | 2026-03-16 | ~~eslint 미설정 (package.json에 lint script 있으나 미설치)~~ | ~~해소 (세션 #10 — F19 eslint flat config)~~ |
| TD-03 | 2026-04-09 | E2E workflow `timeout-minutes: 15` 상시 초과 — PR #394에서 2회 연속 15m17s timeout 관측. 테스트 suite 증가로 runner 한계 초과 추정 | **F490으로 승격 (FX-REQ-482, P2)** — Playwright shard matrix + timeout 상향. TD는 승격 후에도 해소 시점까지 유지 |

## §9 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-03-16 | 초안 — Sprint 1 완료 소급 등록, Sprint 2 계획 |
| 1.1 | 2026-03-17 | Sprint 4 완료 — F22~F25 추가, 테스트 71건, Match Rate 97% |
| 1.2 | 2026-03-17 | Sprint 5 계획 — F26~F36 Frontend Design 6건 + 하네스 확장 5건 등록 (P1) |
| 1.3 | 2026-03-17 | Sprint 5 완료 — Part A F26~F31 DONE + Part B F32~F36 DONE, API+Web 패키지 추가 |
| 1.4 | 2026-03-17 | Phase 1 Go 판정 — v0.5.0 마일스톤 + Go 판정 근거 + Phase 2 전환 기록 |
| 1.5 | 2026-03-17 | Sub-Sprint D — API 36테스트 + Web 18테스트 추가, v0.5.0 버전 범프, 총 160테스트 |
| 1.6 | 2026-03-17 | Phase 2 F-items 섹션 추가 — F37~F40 소급 등록 (phase-2.plan 기준 통일), sprint-6-infra Plan 작성 |
| 1.7 | 2026-03-17 | Sprint 6 완료 — F37/F39/F40 DONE, F38 Sprint 7 이관, v0.6.0, 145테스트, PDCA 84% |
| 1.8 | 2026-03-17 | Sprint 7 완료 — F38/F41/F42/F43 DONE, v0.7.0, 176테스트, PDCA 89% |
| 1.9 | 2026-03-17 | Sprint 8 계획 — F44~F46 등록, F41 잔여 + SSE + NL→Spec + Wiki Git |
| 2.0 | 2026-03-17 | F47 Production Site Design 등록 — fx.minu.best 랜딩+대시보드 통합 (P1) |
| 2.1 | 2026-03-18 | Sprint 8 완료 — 서비스 레이어 9개 + 216 tests + Match Rate 93% |
| 2.2 | 2026-03-18 | Sprint 8 F44~F47 ✅ 보정 + Sprint 9 계획 — F48~F51 등록 (배포+E2E+오케스트레이션) |
| 2.3 | 2026-03-18 | Sprint 9 완료 보정 — F48~F51 ✅, §6 체크박스 갱신, system-version 0.9.0, §2 Sprint 8/9 현황 추가 |
| 2.4 | 2026-03-18 | Sprint 10 계획 — F52~F54 등록 (프로덕션 실배포+에이전트 실연동+NL→Spec 충돌 감지) |
| 2.5 | 2026-03-18 | Sprint 10 완료 보정 — F52~F54 ✅, 276 tests, v0.10.0 + Sprint 11 계획 F55~F58 등록 |
| 2.6 | 2026-03-18 | Sprint 11 완료 — F55~F58 ✅, 290 tests + 18 E2E, v0.11.0, PDCA 93% |
| 2.7 | 2026-03-18 | Sprint 12 계획 — F59(ouroboros 패턴 차용) + F60(Generative UI 도입) 등록, P1 |
| 2.8 | 2026-03-18 | Sprint 12 확장 — F61(MCP 실 구현) + F62(v1.0.0 릴리스) + F63(테스트 보강) 등록 |
| 2.9 | 2026-03-18 | Sprint 12 완료 — F59~F61/F63 ✅, 352 tests + 20 E2E, system-version 0.12.0, §2/§3/§6 갱신 |
| 3.0 | 2026-03-18 | Sprint 13 계획 — F64(MCP Sampling/Prompts) + F65(에이전트 자동 PR) + F66(v1.1.0) 등록 |
| 3.1 | 2026-03-18 | Sprint 13 완료 — F64(91%) + F65(93%) ✅, 388 tests, system-version 1.1.0, F66 릴리스 진행 |
| 3.2 | 2026-03-18 | Sprint 14 계획 — F67(MCP Resources) + F68(멀티 에이전트 동시 PR) + F69(v1.2.0+Phase 3) 등록 |
| 3.3 | 2026-03-18 | Sprint 15 계획 — F70(PlannerAgent, P1) + F71(Agent inbox, P1) + F72(git worktree, P2) 등록. 출처: FX-RESEARCH-014 |
| 3.4 | 2026-03-18 | SPEC 보정 — §6 Sprint 14 체크박스 갱신, v1.2.0 마일스톤 ✅, frontmatter 3.0→3.4 + system-version 1.2.0 |
| 3.5 | 2026-03-18 | F73 추가 — 제품 포지셔닝 재점검(P0, Improvement), Sprint 15 스코프 확장, Issue #63 |
| 3.6 | 2026-03-18 | Sprint 15 완료 — F70~F72 ✅, F73 ✅, 307 API tests, system-version 1.3.0, PDCA 92% |
| 3.7 | 2026-03-18 | F74 등록 — 프로젝트 소개 페이지 전면 개편 (P1, 단독 작업, FX-REQ-074) |
| 3.8 | 2026-03-18 | Sprint 16 계획 — F75(PlannerAgent LLM, P1) + F76(AgentInboxPanel UI, P1) + F77(프로덕션 배포, P2) 등록 |
| 3.9 | 2026-03-18 | Sprint 16 완료 — F75(92%) + F76(91%) ✅, F77 미착수, 313 API tests, Match Rate 91%, PDCA 전주기 완료 |
| 4.0 | 2026-03-18 | F78+F79 단독 작업 등록 — Production E2E(P1, FX-REQ-078) + AXIS DS 전면 리디자인(P1, FX-REQ-079) |
| 4.1 | 2026-03-18 | Sprint 17 계획 — F80(AI Foundry MCP, P1) + F81(AgentInbox 스레드, P1) + F82(PlannerAgent Orchestrator, P1) 등록 |
| 4.2 | 2026-03-19 | F78+F79 완료 — F78 Production E2E(94%) + F79 AXIS DS 리디자인(96%) ✅, PDCA 전주기 Agent Teams ×5 |
| 4.3 | 2026-03-19 | Sprint 17 완료 보정 — F80(100%)+F81(100%)+F82(97%) ✅, §1/§2/§3/§5/§6 갱신, REQ sync 82건, GitHub Issues+Project 일괄 동기화 |
| 4.4 | 2026-03-19 | Sprint 19 계획 — F87(ThreadReplyForm UI, P1) + F88(스레드 API 보강, P1) + F89(통합 테스트+E2E, P2) 등록, v1.7.0 마일스톤 |
| 4.5 | 2026-03-19 | Sprint 19 완료 — F87(100%)+F88(100%)+F89(100%) ✅, 356 tests, PDCA 100%, archived |
| 4.6 | 2026-03-19 | F90 등록 — PlannerAgent gatherExternalToolInfo() 프롬프트 연동 (P2, 단독 작업, FX-REQ-090) |
| 4.7 | 2026-03-19 | Sprint 18 소급 등록 — F83(멀티테넌시,93%)+F84(GitHub,95%)+F85(Slack,90%)+F86(릴리스) §5/§6 추가, v1.6.0 마일스톤 ✅, system-version 1.6.0 |
| 4.8 | 2026-03-19 | F91 등록 + 요구사항 정합성 — F91 executePlan() repoUrl(P2) §5/§6 추가, GitHub Issues F83~F89 등록(#91~#97), Execution Plan 미완료 5건 정리 |
| 4.9 | 2026-03-19 | Phase 3 잔여 F92~F97 등록 — 멀티테넌시 고도화(P1) + GitHub 고도화(P1) + Slack 고도화(P2) + PlannerAgent 고도화(P2) + v1.7.0 배포(P0) + 테스트 커버리지(P2) |
| 5.0 | 2026-03-19 | F96 v1.7.0 프로덕션 배포 완료 — Workers 50e9c494 배포 ✅, system-version 1.7.0, D1 12/12 적용 완료 |
| 5.1 | 2026-03-19 | Sprint 20 F92 완료 — 멀티테넌시 고도화(90%), Org CRUD 12 endpoints, roleGuard, OrgSwitcher UI, 399+48 tests, D1 0013 적용, 73 endpoints |
| 5.2 | 2026-03-19 | Sprint 22 F94 완료 — Slack 고도화(99%), Interactive D1 실연동 + 채널별 알림 4 endpoints, 471 tests, D1 0014 적용 |
| 5.3 | 2026-03-20 | 정합성 보정 — Sprint 21/23 완료 반영, F95 PlannerAgent 고도화(91%) + F97 테스트 확장(92%), system-version 1.8.1, D1 tables 26→23 수정(실제 CREATE TABLE 기준), Workers v1.8.1, 502 tests, D1 0015 적용 |
| 5.4 | 2026-03-20 | PRD v5 F98~F118 등록 — 통합 플랫폼 비전, Phase 3-B~D + Phase 4 A~E + Phase 5 재구조화, 구 F98~F101→F107/F110/F113/F115 번호 재배정 |
| 5.5 | 2026-03-20 | Sprint 24 결과 반영 — F107(멀티프로젝트,100%)+F110(Jira,95%)+F113(모니터링,90%)+F115(워크플로우,90%) ✅, system-version 2.0.0, 97 ep, 39 svc, 535 tests, D1 0016(27 tables), Workers v2.0.0 |
| 5.6 | 2026-03-20 | Sprint 25 완료 — F98(기술 스택 점검,100% Kill→Go)+F104(AXIS DS 전환,95% 11컴포넌트) ✅, @axis-ds/* 3패키지 도입, @base-ui/react+next-themes 제거, Match Rate 97% |
| 5.7 | 2026-03-21 | Sprint 26~28 소급 반영 — F99/F100/F101 ✅(Sprint 27), F102/F103/F105 ✅(Sprint 28), Execution Plan Sprint 25~28 추가, 마일스톤 v2.1.0/v2.2.0 완료, Phase→4 갱신, system-version 2.2.0 |
| 5.8 | 2026-03-21 | Sprint 30 계획 — F123~F128 등록 (배포 동기화 P0 + Phase 4 Go 판정 P1 + 품질 강화 P1 + 기술부채 P2), Execution Plan 추가, 마일스톤 v2.4.0 추가 |
| 5.9 | 2026-03-22 | Sprint 31 계획 — F129~F132 등록 (프로덕션 동기화 P0 + SPEC 정합성 P0 + Match Rate 보강 P1 + 온보딩 킥오프 P1), Execution Plan 추가, 마일스톤 v2.5 추가 |
| 5.10 | 2026-03-22 | Sprint 31 완료 — F129(100%)+F130(95%)+F131(90%)+F132(95%) ✅, Workers v2.4.0 재배포, SPEC drift 0건, E2E +6, 온보딩 킥오프 문서, Match Rate 95% |
| 5.11 | 2026-03-22 | SPEC drift 보정 — system-version 2.4.0→2.5, D1 32→33테이블(0020 Google OAuth), §1 Sprint 31 반영, .gitignore 빌드 아티팩트 추가 |
| 5.12 | 2026-03-22 | F134 버전 정책 전환 — system-version→Sprint 31, §1 Package Versions 추가, §3 전환선+Sprint 32행, §5 F134 등록, §10 버전 정책 섹션 신설, package.json 4개 Independent SemVer 리셋 (cli 0.5.0, api/web/shared 0.1.0) |
| 5.13 | 2026-03-22 | Agent Evolution PRD + Track B 완료 — F135~F155 등록 (21건, Phase 5 Agent Evolution), Six Hats 20턴 토론, GitHub Issues #131~#151 + Org Project 동기화, Sprint 33 등록 (F153+F154+F155 Track B 개발 도구, Match Rate 94%), system-version Sprint 33 |
| 5.14 | 2026-03-22 | Sprint 32 완료 — F156(PRD v5 완전성 점검)+F157(Phase 5 로드맵) ✅, §2/§3/§5/§6 갱신, G1~G12 매핑 완료(9완료+1진행+2수요), Phase 5 Layer 1~4 분류, 온보딩 4주 추적 계획 |
| 5.15 | 2026-03-22 | Sprint 35 완료 — F143(모델 비용/품질 대시보드,85%)+F142(Sprint 워크플로우 템플릿,96%) ✅, ModelMetricsService+D1 0021+3 endpoints, Sprint 워크플로우 3종+조건 3종+SprintContext, 630 tests (+47), Match Rate 92%, Agent Team 2-Worker 병렬(11m 45s), system-version Sprint 35 |
| 5.16 | 2026-03-22 | Sprint 36 완료 — F136(태스크별 모델 라우팅)+F137(Evaluator-Optimizer 패턴) ✅, ModelRouter+createRoutedRunner+D1 0022, EvaluatorOptimizer+3종 EvaluationCriteria+3 endpoints, 666 tests (+36), Match Rate 96%, Agent Team 2-Worker 병렬(3m 15s), system-version Sprint 36 |
| 5.17 | 2026-03-22 | Sprint 37 완료 — F138(ArchitectAgent)+F139(TestAgent) ✅, architect-agent+architect-prompts+test-agent+test-agent-prompts 4서비스, AgentOrchestrator 역할 위임 통합, 4 endpoints, 714 tests (+48), Match Rate 95%, Agent Team 2-Worker 병렬(4m 45s), Track A P0 5/5 완료, system-version Sprint 37 |
| 5.18 | 2026-03-22 | Sprint 38~42 일괄 drift 보정 — §1 Sprint 31→42 + Phase 5a 완결, §2 수치 갱신(925 tests, 152 ep, 74 svc, 44 tables, 0001~0026), §2 Sprint 40~42 4행 추가, §3 Sprint 40~42 마일스톤 3행, §5 F151/F152 📋→✅, §6 Sprint 38 체크박스 보정 + Sprint 39~42 Execution Plan 5개 섹션 추가, system-version Sprint 42 |
| 5.19 | 2026-03-22 | Sprint 45 계획 — F158~F161 등록 (KPI 자동 수집 인프라: 페이지뷰 추적 P0 + CLI 로깅 P1 + Cron 집계 P0 + 대시보드 연결 P1), §2/§5/§6 갱신, system-version Sprint 45 |
| 5.24 | 2026-03-23 | SPEC drift 보정 — §1 PRD v5→v8 참조 갱신, §5 F162/F163/F169 📋→✅ (Sprint 46 완료 반영 누락 수정) |
| 5.25 | 2026-03-23 | Sprint 48 계획 — F167(ML 하이브리드 SR 분류기, P1)+F168(SR 대시보드 UI, P2) 📋→🔧, Plan 문서 작성 |
| 5.26 | 2026-03-23 | Sprint 48 완료 — F167(95%)+F168(95%) ✅, HybridSrClassifier+SR대시보드, 1029 API(+30)+74 Web(+6), D1 0031, 172 ep, 79 svc, system-version Sprint 48 |
| 5.23 | 2026-03-23 | 정합성 보정 — §2 수치 갱신(999 API/131 CLI/68 Web tests, 169 ep, 78 svc, 49 tables, 0001~0030), Sprint 46~47 상태 2행 추가, GitHub Issue F164~F166 닫힘+F170 생성+닫힘, system-version Sprint 47 |
| 5.27 | 2026-03-23 | Sprint 50 계획 — F173(팀원 셀프 온보딩 플로우, P0)+F174(인앱 피드백 위젯, P1) 📋 등록, §2/§5/§6 갱신, Plan 문서 작성 |
| 5.28 | 2026-03-23 | Sprint 50 완료 — F173(100%)+F174(100%) ✅, 2-Worker Agent Team(7m, 0 revert), 3 NEW endpoints + 2 MODIFY, 4 NEW components, 1051 API(+22)+73 Web, D1 0032, Match Rate 100% |
| 5.29 | 2026-03-23 | Phase 5b 사업개발 프로세스 — AX-Discovery-Process v0.8 분석, F175~F181 📋 등록 (사업 아이템 분류/분석파이프라인/패키징/멀티페르소나/수집채널/사업계획서/Prototype), [[FX-SPEC-BDP-001]] 생성 |
| 5.30 | 2026-03-24 | 정합성 보정 — §2 Sprint 50→51 + 수치 9건 갱신(1104 API/125 CLI/73 Web tests, 181 ep, 84 svc, 54 tables, 0001~0034), Sprint 51 상태 1행 추가, CLI tests 131→125(실제 측정), system-version Sprint 51 |
| 5.31 | 2026-03-25 | Phase 5c 방법론 플러그인 아키텍처 — F191~F195 📋 등록, Sprint 59(F191 레지스트리+F192 BDP모듈화) → Sprint 60(F193 pm-skills모듈+F194 검증기준+F195 관리UI) 순차 배번. 재배치A: 59=기반(2W병렬), 60=pm-skills+UI(2W병렬). 메가 프로세스(BDP 6단계) 불변 + 분석+검증 커스텀 |
| 5.32 | 2026-03-25 | Phase 5d AX BD Ideation MVP — F197~F204 📋 등록 (PRD v1.4 Phase 1, 8개 Feature). Sprint 61(F197 BMC CRUD+F198 아이디어 등록) → Sprint 62(F199 BMCAgent 초안) → Sprint 63(F200 버전히스토리+F201 인사이트+F202 시장요약+F203 아이디어-BMC연결) → Sprint 64(F204 댓글+통합테스트). D1 5테이블(ax_ideas/ax_bmcs/ax_bmc_blocks/ax_bmc_comments/sync_failures), AI에이전트 2종(BMCAgent/InsightAgent) |
| 5.33 | 2026-03-25 | Sprint 61 완료 — F197(BMC 캔버스 CRUD)+F198(아이디어 등록) ✅, Match 93%, PR #183 squash merge. D1 0046~0047(ax_ideas+ax_bmcs+ax_bmc_blocks), Workers d513f493. 수치: 1504 API/214 ep/118 svc/49 schemas |
| 5.34 | 2026-03-26 | Sprint 62 완료 — F199(BMCAgent 초안 자동생성)+F200(BMC 버전히스토리) ✅, PR #186 squash merge. D1 0048(ax_bmc_versions). PromptGateway+ModelRouter+claude-sonnet-4-6 파이프라인 |
| 5.35 | 2026-03-26 | Sprint 64 완료 — F203(아이디어-BMC 연결)+F204(BMC 댓글) ✅, PR #187 squash merge. D1 0049(ax_idea_bmc_links)+0050(ax_bmc_comments). Sprint 62와 병렬 실행, rebase 충돌 해결(app.ts+migration renumber). Workers 391742fe. 수치: ~239 ep/122 svc/53 schemas |
| 5.36 | 2026-03-26 | Sprint 65 완료 — F201(인사이트)+F202(InsightAgent)+F207(평가관리 MVP) ✅, PR #196 squash merge (rebase). D1 0051~0054(insight_jobs+evaluations+kpis+evaluation_history). Sprint Pipeline 첫 실전: 65+66+67 병렬 Batch 1 |
| 5.37 | 2026-03-26 | Sprint 66 완료 — F205(Homepage)+F208(DX API 스펙) ✅, PR #195 squash merge. Sprint 67 완료 — F209(AI Foundry 흡수)+F210(비번 재설정) ✅, PR #197 squash merge (rebase). D1 0055~0057(poc+tech_reviews+password_reset) |
| 5.38 | 2026-03-26 | Phase 5d+5e 완료 — F197~F211 전체 ✅ (Sprint 61~67). 수치: ~292 ep/132 svc/59 schemas/D1 0057. Sprint 자동화 인프라(F196+F211), Pipeline 3-Sprint 병렬 실전 성공, Workers f15a185a |
| 5.39 | 2026-03-26 | Phase 5f 등록 — AX BD 사업개발 체계 수립. F212(스킬체계통합, P0, Sprint 68)+F213(API v8.2확장, P1, Sprint 69)+F214(Web Discovery 대시보드, P1, Sprint 70). 참고자료 `docs/specs/axbd/` 7개 파일 분석 완료. 프로세스 v8.2: 5유형(I/M/P/T/S) 강도 라우팅 + 사업성 체크포인트 7단계 + Commit Gate + 누적 신호등. 듀얼 환경(Cowork+CC) 타겟 |
| 5.40 | 2026-03-26 | Sprint 68+69 완료 — F212(스킬체계통합) ✅ Sprint 68 merge + F213(API v8.2확장) ✅ Sprint 69 merge. sf-scan 81 active/sf-lint 0err/sf-deploy 21스킬 local. F215(팀 가이드, P0, Sprint 71) 등록 (#203). Getting Started 확장: Cowork 설치+CC 사용법+프로세스 v8.2+FAQ 4섹션 |
| 5.41 | 2026-03-30 | Phase 8 등록 — F241~F244 소급(IA 구조 개선, Sprint 82~84 ✅) + F245 GIVC Ontology PoC 신규(FX-REQ-237, P2, 📋). 한국기계산업진흥회 chatGIVC 고도화 제안 |
| 5.42 | 2026-03-30 | F246~F247 등록 — Next.js→Vite 전환(FX-REQ-238/239, P1, Sprint 85 📋). CI path filter + prod-e2e non-blocking 적용 완료 |
| 5.43 | 2026-03-31 | §2 수치 보정 5건 — Web 172→207, 총 2440→2475, schemas 69→78, D1 0065→0074, E2E 27→25 specs. Sprint 82~85 이후 누락분 소급 갱신 |
| 5.44 | 2026-03-31 | F248~F250 등록 — Sprint 86 인증 가드(FX-REQ-240~242). ProtectedRoute 래퍼 + E2E fixture fx-token→token 키 통일 + auth-flow E2E 2→7개 보강 |
| 5.45 | 2026-03-31 | F258~F262 등록 + Sprint 구조화 — BD 스킬 통합 5건(FX-REQ-250~254, P0). Sprint 89(F258+F259 읽기UI) → 90(F260+F261 실행+저장) → 91(F262 추적). §2 Sprint 87~91 행 추가. 의존성 명시 |
| 5.46 | 2026-03-31 | F263~F266 등록 — 발굴 프로세스 UX 개선 4건(FX-REQ-255~258, P0). Sprint 94(F263+F265 위저드+온보딩) → 95(F264 Help Agent) → 96(F266 HITL) → 97(통합QA+데모). PRD: fx-discovery-ux/prd-final.md v2 |
| 5.47 | 2026-04-01 | F263~F266 전체 완료 — Sprint 94~97 ✅. 위저드 UI+Help Agent(OpenRouter SSE+Hybrid)+온보딩 투어+HITL 패널+E2E 4 spec+Feature Flag. 54 files, +5601 lines. 수치: 73 routes/169 svc/87 schemas/D1 0079/API 2250+CLI 149+Web 265+E2E 35 |
| 5.47 | 2026-03-31 | F267 등록 — BD 팀 공용 스킬 GitHub 배포 준비(FX-REQ-259, P1, Sprint 98 🔧). CLAUDE_AXBD 정리 + 기존 axbd/ 통합 + ax-bd-discovery 참조 갱신 |
| 5.48 | 2026-04-01 | F268 등록 — ax-config Plugin 전환(FX-REQ-260, P1, Sprint 99 📋). Command/Skill 20개 중복 정리 + Plugin 형식 변환 + 팀 공유 체계 |
| 5.49 | 2026-04-01 | §2 수치 보정 6건 — tests(2250+149+265+35E2E), endpoints(~420/73), services(169), schemas(87), D1(0079), Workers 상태. help-agent.ts 타입에러 2건 + feedback-context.test.ts duplicate column 1건 수정 |
| 5.50 | 2026-04-01 | F269 등록 — 발굴 IA & Page 정리(FX-REQ-261, P0, Sprint 100 📋). 데모 시나리오 이동 + 중복 메뉴 통합 + 플로팅 버튼 겹침 해소 |
| 5.51 | 2026-04-02 | Phase 10 O-G-D Agent Loop 등록 — F270~F273(FX-REQ-262~265). Harness×GAN 설계서 기반 PRD v1.1 작성 + 외부 AI 3사 교차 검토(GPT-4o/DeepSeek R1/Gemini). Sprint 101(F270~F272) → 102(F273) |
| 5.52 | 2026-04-03 | **Phase 11 IA 대개편 등록** — F288~F299(FX-REQ-280~291, 12건). FX-IA-Change-Plan-v1.1.docx 갭 분석 기반: 13개 Figma 갭(G1~G13) + 구조적 변경 5건(Role-based visibility/Route namespace/리브랜딩/menu 재배치). Phase 11-A(구조 기반 P1 3건) + 11-B(기능 확장 P2 6건) + 11-C(고도화+GTM P3~P4 3건). Sprint TBD |
| 5.53 | 2026-04-04 | F302 + FX-REQ-294 등록 — E2E 상세 페이지 커버리지 확장(Sprint 124 📋). 파라미터(:id) 8건 E2E + mock factory + skip 재활성화. F300 후속 |
| 5.54 | 2026-04-04 | **Phase 12 Skill Unification 등록** — F303~F308(FX-REQ-295~300, 6건). 3개 스킬 시스템(skill-framework CLI + Foundry-X API + ax-marketplace) 통합. D1~D4 4대 단절 해소: Web→API(D1), sf-scan→벌크등록(D2), 생성→실사용(D3), 실행→메트릭(D4). Sprint 125~128. PRD: docs/specs/fx-skill-unify/prd-v1.md |
| 5.55 | 2026-04-04 | **비주얼 협업 도구 등록** — F309~F311(FX-REQ-301~303, 3건). FX-PLAN-013 v1.2 기반. Phase A: Marker.io 피드백(F309, Sprint 129 P1 ~4h). Phase B: TinaCMS PoC(F310, Sprint 130 P2 ~4h) + 본구현(F311, Sprint 131 P3 ~16h, F310 선행). 독립 트랙(인프라/DX) |
| 5.56 | 2026-04-04 | **배치 1 Plan 작성** — FX-PLAN-S129(Marker.io, F309) + FX-PLAN-S130(TinaCMS PoC, F310). 병렬 실행 가능 판정 완료. Sprint 129: Web-only 3파일. Sprint 130: feat/tinacms-poc 브랜치 Go/No-Go 게이트 5항목 |
| 5.57 | 2026-04-04 | **배치 1 완료** — Sprint 129 F309 ✅ (PR #257, Match 100%) + Sprint 130 F310 ✅ (PR #258, Match 100%). Marker.io 위젯 fx.minu.best 동작 확인. deploy.yml VITE_MARKER_PROJECT_ID secret 주입 추가 (Vite 빌드타임 환경변수 이슈 해소) |
| 5.58 | 2026-04-04 | **fx-discovery-v2 등록** — F312~F317(FX-REQ-304~309, 6건). 발굴→형상화 파이프라인 자동화. M1: 형상화 전환+상태머신(F312+F313, Sprint 132 P0). M2: 스킬파이프라인+모니터링(F314+F315, Sprint 133~134 P1). M3: E2E+운영(F316+F317, Sprint 135~136 P2). PRD: docs/specs/fx-discovery-v2/prd-final.md |
| 5.59 | 2026-04-05 | **Marker.io 자동화 + TinaCMS 네비게이션 등록** — F319~F321(FX-REQ-311~313, 3건). FX-PLAN-014. Marker.io 피드백 E2E 자동화: Webhook→D1큐→Claude Code Agent→PR→Review→배포(F319+F320, Sprint 137 P1). TinaCMS 사이드바+랜딩 동적 메뉴(F321, Sprint 138 P2). Sprint 129 Gap Analysis 보충(FX-ANLS-S129, 100%) |
| 5.60 | 2026-04-05 | **Phase 13 IA 재설계 v1.3 등록** — F322~F328(FX-REQ-314~320, 7건). FX-IA-Change-Plan-v1.3.docx 기반. 액션 중심 메뉴 재설계: Member 25→12(52% 축소) + 탭 통합 3건(발굴/검증/제품화) + 버전관리 패턴 + 대시보드 ToDo. P0: F322(사이드바 구조). P1: F323(대시보드)+F324(발굴). P2: F325(형상화)+F326(검증). P3: F327(제품화)+F328(시작하기). Sprint TBD |
| 5.61 | 2026-04-05 | **Phase 14 Agent Orchestration Infrastructure 등록** — F333~F337(FX-REQ-325~329, 5건). FX-Unified-Integration-Plan.md 기반(GAN R2 CONDITIONAL_PASS, Score 0.78). 2계층 루프 아키텍처: Foundation 3건(TaskState+HookLayer+EventBus+OrchestrationLoop, Sprint 148~150 P0) + Feature 2건(AgentAdapter통합+Dashboard, Sprint 151~152 P1). 기존 O-G-D/Skill 확장, Additive 전략. §1 Phase/Sprint 갱신 |
| 5.62 | 2026-04-05 | **운영이슈 4건 등록** — F338~F341(FX-REQ-330~333, P1). SPA 404(_redirects)+Marker.io Capture Failed+JWT 토큰 갱신+TinaCMS Navigation 미표시. Sprint 153 독립 트랙 |
| 5.63 | 2026-04-05 | **Phase 15 Discovery UI/UX v2 등록** — F342~F350(FX-REQ-334~342, 9건). Sprint 154~157. 멀티 페르소나 평가 + 9탭 리포트 + 팀 검토 + PDF Export. PRD: docs/specs/fx-discovery-ui-v2/prd-final.md |
| 5.64 | 2026-04-06 | **Phase 16 Prototype Auto-Gen 등록** — F351~F356(FX-REQ-343~348, 6건). Sprint 158~160. PRD→Prototype 자동 생성 파이프라인: Builder Server+Docker격리+CLI --bare+O-G-D Loop+대시보드+피드백Loop. API 키 기반 비용 모델(Haiku ~$0.5/건). req-interview 3R+Six Hats+오픈이슈 5/6 해소. PRD: docs/specs/prototype-auto-gen/prd-final.md |
| 5.71 | 2026-04-09 | **F491 등록 + 구현 완결 ✅** — 테스트 공유 Org 모드(FX-REQ-483, P3, 독립 트랙). `DEFAULT_SHARED_ORG_ID` env var 도입으로 signup/google/setup-password 3 flow에서 개인 Org 자동 생성 대신 `org_axbd` 공유 멤버십 부여. 헬퍼 `ensureSharedOrgMembership()` 신설(멱등 `INSERT OR IGNORE`), null-return 폴백 패턴으로 env 미설정 시 기존 동작 유지. Google OAuth는 existing user도 재로그인 시 공유 Org backfill. 신규 테스트 4건(auth-shared-org.test.ts) 전부 통과, 기존 auth 30 tests 리그레션 없음(총 34/34). `wrangler.toml [vars]` + `[env.staging.vars]` 양쪽 설정. 배경: 팀 테스트 편의 — 모든 신규 계정이 동일 org에서 데이터 공유 |
| 5.70 | 2026-04-09 | **F490 등록 + TD-03 승격** — E2E workflow shard 병렬화(FX-REQ-482, P2, 독립 트랙). PR #394에서 `.github/workflows/e2e.yml` `timeout-minutes: 15` 상시 초과 관측(동일 runner 2회 연속 15m17s `The operation was canceled`). 대응: Playwright shard matrix(3~4) + timeout 상향(15→30) + 느린 spec 식별 + smoke/full 2-tier 분리 검토. TD-03 → F490 승격 처리 (§8 갱신, TD row는 해소 시점까지 유지) |
| 5.75 | 2026-04-10 | **세션 #241 — Task Orchestrator S-α 대규모 dogfood**. 14 task(C1~C9, X1~X4, F498) 생성·실행·merge 완료 (13 merged, 1 cancelled). CI/CD 최적화: 불필요 staging/preview 제거 + 조건부 test, 비코드 push 5m30s→22초. tmux pane 균등 배분: 고정 pane 제외 + `@fx-task-id` 기반 task pane만 리사이즈. heredoc unbound variable fix + CI typecheck fix(AgentTaskType 3타입 + analysisResult 초기화). C7 거버넌스 매핑: F-track Sprint/Phase 전용 제한 + REQ 자동할당 + Type 컬럼 |
| 5.74 | 2026-04-10 | **F497 등록 — Phase 31 Task Orchestrator MVP (S-α, P1)**. Master pane 기반 Task Orchestrator 표준화 — F/B/C/X 4트랙 + SSOT 분리(SPEC=등록 SoR, GitHub Issue label=실시간 상태 SoR) + flock 동시성(id-allocator/master-push) + push SHA 고정 worktree + commit body `fx-task-meta` JSON 권위 소스 + `/ax:task doctor` 9개 검사. 외부 AI 3종 검토(Gemini 3.1 Pro / GPT-5.4 Pro / Claude Opus 4.6) 17개 결함(EX-1~EX-17) 반영. 비수용 4항목: state.json 신설(SSOT 철학 위반), LLM 완전 배제, `.task-context` git commit, high risk 무조건 차단. PRD v0.4: `docs/specs/fx-task-orchestrator/prd-draft.md` 868줄. GitHub Issue label 12종(fx:track/status/risk/wip) 동시 생성. S-α는 MVP 범위, S-β~δ에서 merge gate 정확성 체인 + deploy hard gate + conflict-resolver subagent + Master IPC 확장 (FX-REQ-489, P1) |
| 5.73 | 2026-04-09 | **F494 ✅ — 발굴 파이프라인 전진 구조 버그 (P1, 세션 #247)**. bi-koami-001 DEBUG 제보에서 시작: `biz_items.status='evaluated'` + 2-1~2-9 모두 completed 인데도 `pipeline_stages`가 REGISTERED 고정 + 체크리스트 9건 pending + `bd_artifacts` 0건. 근본 원인 2건: (1) `stage-runner-service::confirmStage`에 DISCOVERY→FORMALIZATION 전진 코드 부재 (2) 기존 `biz-items.ts:327` REGISTERED→DISCOVERY INSERT도 `entered_by` NOT NULL로 silent fail (try/catch 스왈로우). 수정: gateStatus==='ready' 시 pipeline 자동 advance(멱등) + `entered_by='system'` 추가 + DiscoveryReport UI 빈 artifacts fallback + bi-koami-001 복구 SQL. 테스트 4건 추가, 3447 api tests pass. 커밋 `4931c6c1` 직접 master push (Test 모드) |
| 5.74 | 2026-04-11 | **X5 task — 장기 백로그 재평가 (F112/F117/F118/F245)**. [[FX-PLAN-X5]] 3축 판정(외부 트리거·내부 선결·전략 정합성) 기반 처분: F112 **DEFER** (v2.2+→v3.0+, F117 선행), F117 **UPGRADE** (📋→🔧, 내부 기술 준비 F116~F174 ✅ 완료, 비즈니스 선결만 잔존), F118 **ARCHIVE** (📋→🗑️, FX-DSGN-MSA-001 MSA 계획에 rationale 흡수), F245 **CLOSE drift 보정** (📋→✅, F255/F256/F272/F279 분해 실행 완료 반영). 효과: 장기 📋 4건→1건 축소 + F245 drift 해소 + F118/MSA 중복 rationale 제거. GitHub Issue #125/#126 라벨 조정, #127 close 예정 |
| 5.79 | 2026-04-12 | **S261 ax-plugin source↔cache drift 재발 방지 + C33 eslint cleanup**. (1) Landing/README Sprint 240→261 + Phase 29→33 drift 동기화(#508). (2) C33~C37 5건 PLANNED 등록(lint cleanup/Node 24/git author/sidebar/Gap E2E). (3) **C33 eslint no-explicit-any cleanup(#510)** DONE. (4) S261 세션: ax-plugin infra-selfcheck C9 Plugin Cache Drift 점검 추가([ax-plugin PR #1](https://github.com/KTDS-AXBD/ax-plugin/pull/1) merged `89abf2d`) + SessionStart hook에 `ax-cache-drift-auto.sh` L3 확장 + feedback_ax_plugin_dual_clone.md "Same-HOME source↔cache drift" 섹션 추가. (4b) rsync dogfood 부산물: cache hooks/ 디렉토리가 최초 설치부터 누락돼 있었음을 발견(6일간 미탐지) — C9 체크가 skills+hooks 양쪽을 보도록 설계한 결정이 첫 날부터 작동. `/plugin` 메뉴에서 ax-marketplace 검색 불가 이슈도 발견 — 후속 진단 필요 |
| 5.78 | 2026-04-12 | **S260 WT worker 계정/모델 정합성 (Part 2)**. **C28 (PR #496, FX-REQ-522)** — `task-start.sh` 2지점 수정. (1) Step 5 `tmux split-window`에 `-e HOME="$HOME"` 추가 — tmux default shell이 login shell로 떠서 HOME을 pwent(`/home/sinclair`)로 리셋하던 현상을 명시 override. Master multi-account HOME(`.claude-work`)이 worker pane으로 상속되어 `$HOME/.claude.json` oauth email = `ktds.axbd@gmail.com`로 정합. (2) Step 5b `CCS_WT_CMD="${CCS_BIN} --model claude-sonnet-4-6"` 신규 변수 + inject `tmux send-keys` 치환 — `feedback_sprint_model.md` "Master=Opus, WT=Sonnet" 원칙 첫 구현. `/model` 명령으로 worker 세션에서 수동 전환도 허용. **statusline-command.sh 정리** (HOME 직접편집, git 비추적): `/home/sinclair/.claude/statusline-account` 삭제(2026-04-03 생성 유물, `sinclairseo` 고정 override) + override 로직(line 71-78) 제거 + 변수명 `github_user` → `claude_account` + 레이아웃 주석 `<claude account>`. 이제 HOME-aware SSOT = `$HOME/.claude.json` oauth.emailAddress. Master pane smoke test: `ktds.axbd  Foundry-X(master)  learning  Opus 4.6 (1M context)` 정상. **Dogfood 부산물 (C27 실전 첫 발동)**: C28 register → pane %28 → worker 실행 → PR 생성 → `--auto --squash` → master merge → daemon cleanup 과정에서 daemon log에 `🧹 C28: pre-evict pane %28 (cwd=.../C28-...)` 기록 — S260 Part 1의 pre-eviction L2 방어선이 의도대로 작동함을 end-to-end 확인. **발견/교훈**: (a) task-daemon 수동 재시작 시 `nohup bash ... & disown`만 쓰면 `/tmp/task-signals/.daemon.pid` 누락 → `task-start.sh` `ensure_daemon`이 "daemon 없음" 판정 → 중복 spawn(PID 944100 + 957770 동시 구동 확인, 즉시 944100 kill 해소). 정식 재시작은 `bash scripts/task/task-daemon.sh --bg`(CLI dispatch에 정의된 유일한 spawn 경로), (b) L2 pre-evict 로그 semantics 미정교 — primary `$PANE_ID`도 매 task cleanup마다 스윕에 걸려 `daemon_pre_evict` 이벤트가 항상 1건씩 찍힘, 회귀 감시 메트릭 "0건 유지" 가정이 부정확. primary 제외 정교화 후속 C-track 후보, (c) tmux `split-window -e HOME=` 플래그는 3.0+ 지원 + `-c`와 병행 가능, (d) `statusline-account` 같은 override 파일은 multi-account 구분을 가리는 유물 — SSOT 원칙 위배. **연계**: S260 Part 1(defense-in-depth 3층)의 후속 완결, Part 2는 예방이 아닌 "정합성 보장" 층 |
| 5.77 | 2026-04-12 | **S260 tmux pane ↔ WT lifecycle defense-in-depth (Part 1)**. C27 (PR #494, FX-REQ-521) — `task-daemon.sh` `phase_signals` cleanup 블록에 pre-eviction 스윕 추가: `git worktree remove --force` 직전에 `tmux list-panes -a -F '#{pane_id}\t#{pane_current_path}'` 로 `$WT_PATH` 또는 `$WT_PATH/*` 하위 cwd를 가진 모든 pane을 `kill-pane`으로 선행 제거, `log_event daemon_pre_evict` JSONL 기록. 기존 `$PANE_ID` kill(line 127)은 변경 없음, `PRESERVED=true` 분기도 무손상. 매칭은 bash `case "$_pcwd" in "$WT_PATH"\|"$WT_PATH"/*)` — `/` 경계가 리터럴이라 오탐 불가. **HOME scan Phase 4 (git 비추적, 직접 편집)** — `/home/sinclair/scripts/git-orphan-scan.sh`에 `tmux pane zombies` 탐지 phase 추가(+60줄). 3종 조건: ①`pane_current_path` 물리 부재 ②`$CLAUDE_WT_BASE/$PROJECT/*` 하위인데 `git worktree list` 이탈 ③`pane_dead=1` 플래그. quiet 모드 suffix `(tmux zombies: N)`, exit code는 git orphan만 반응(좀비는 환경 상태라 SessionStart hook 놀라게 하지 않음). JSON 출력에 `zombie_panes` 배열 추가. **End-to-end 검증**: C27 자기참조 dogfood 1회 — register → worker 자동 구현 → PR 생성 → `--auto --squash` → master merge(PR #494 +22/-0) → daemon SPEC DONE 원자 갱신 → pane %27 cleanup, 총 ~90초 lifecycle. daemon 재시작(PID 944100)으로 새 로직 실전 발효. **Defense-in-depth 3층 완성**: ①tmux 3.5a 소스 빌드(근본, S257~258) + ②daemon pre-evict(실행 중 방어, S260 Part 2) + ③orphan-scan Phase 4(post-hoc 관찰, S260 Part 1) — 각각 segfault 원인 / 자동화 경로 누수 / 수동 operate 우회 경로를 덮음. 회귀 감시: `grep daemon_pre_evict /tmp/task-signals/event.jsonl`. **발견/교훈**: (a) bash `case` 패턴의 경계문자 리터럴이 `[[ == pat* ]]`보다 안전 — `/foo/bar`가 `/foo/barbados`로 오탐되지 않음, (b) daemon_pre_evict JSONL 이벤트 없이는 회귀 관찰 불가 — 관찰 가능성이 예방의 전제, (c) 34초 lifecycle chore task 패턴 재현 성공 — worker pane 내 전 과정(prompt 실행·edit·commit·task-complete)이 45s heartbeat 간격보다 빠름, (d) scan/daemon scope 분리의 본질은 "변경의 블라스트 반경"(HOME 개인 tool vs repo 운영 인프라). **연계**: S257 tmux 3.4 incident + S258 fx35a 소스 빌드 + S259 task orchestrator 관통 정비의 defense-in-depth 완결 |
| 5.76 | 2026-04-12 | **S259 Task Orchestrator 관통 정비**. C24 `task-start.sh --reuse-id <ID>` flag (PR #487) — ID forward 함정(allocate_id max+1 무조건) 우회 경로 + `lib.sh lookup_backlog_row()` 정규식 파서 + `warn_reuse_risk()` 정책 함수(PLANNED silent / CLOSED_EMPTY warn+pass / IN_PROGRESS·DONE family FX_REUSE_FORCE 게이트) + 유닛 테스트 6/6. C25 dogfood (PR #489) — `scripts/board/_common.sh board::require_projects()` gh project scope 부족 시 actionable 에러(+172/-6, 34초 lifecycle). PR #490 `fix(task-orchestrator)` — (a) `task-start.sh` Issue 생성 후 `.task-context`에 `ISSUE_URL=` append, (b) `task-complete.sh` PR body에 `Closes #N` 자동 포함(`/pull/` URL 거부 regex로 C25 edge case 방어), (c) `sprint-merge-monitor.sh` step 5b `git branch -D "$branch"` local cleanup 추가(remote `--delete-branch`만으로는 fix/*/task/*/sprint/* local ref 남음). C26 (PR #492) — sprint-merge-monitor line 151 dead `git -C "$wt_path/../.."` 분기 제거(-2/+1). **End-to-end 검증**: C26 실전 dogfood로 `task-start(ISSUE_URL 기록) → task-complete(Closes #491) → daemon merge → GitHub Issue #491 auto-close at 20:18:23Z (merge 1초 뒤)` 완전 확인. **Orphan cleanup 11+2**: S256/S257/S258/S259 OPEN Issue 11건(#461/462/463/464/470/471/475/476/481/483/485/488/491) 전부 close, MERGED 로컬 브랜치 2건(`fix/spec-c16-c17-closed-empty` PR #479, `fix/task-orchestrator-silent-drops-s257b` PR #474) 삭제. orphan-scan 최종 0건. **발견/교훈**: (a) sprint-merge-monitor line 151 `git -C "$wt_path/../.."` 가 항상 fallback에 의존하던 dead code였음, (b) cache `issue_url` 필드가 post-merge에 `pull/N`으로 업데이트되는 edge case 실존 → regex에서 `/issues/` 필터 필수, (c) Learning mode `warn_reuse_risk()` 정책을 사용자 승인으로 결정(안전-우선+force escape), (d) 34초 lifecycle task는 직접 master 커밋보다 task orchestrator 경로가 비용 거의 없음. **연계**: S258 defense-in-depth(context-aware merge 정책 + tmux 3.5a 근본 해소 + C19/C22/C23 PR #482/#484/#486)의 후속 완결 |
| 5.73 | 2026-04-10 | **F497 S-α MVP ✅ (Phase 31 Task Orchestrator)**. 📋→🔧 (S-α DONE, S-β 잔여). 산출물: `scripts/task/{lib.sh,task-start.sh,task-list.sh}` + `.claude/skills/ax-task/SKILL.md` + `~/.foundry-x/` 인프라 (locks/, task-log.ndjson, tasks-cache.json, wip-overrides.log). PRD §4.1.1 Step 0~9 전체 (flock id-allocator + master-push + push SHA pinning + fx-task-meta commit + tmux split + GitHub Issue 4 label). dogfood C1 task로 end-to-end 검증 (#419 자동 생성/cleanup). 검증 중 발견 2 버그 fix: (a) `slugify` sed 한글 collation 실패 → `LC_ALL=C tr -c 'a-z0-9 \n' '-'` ASCII-safe + Step 0 fail-early(cb2a1e0a) (b) bash `${3:-{}}` 파싱 함정(default `{` + literal `}` → stray `}`) → 명시 if문(6bae6ecb). 마지막 실측 Sprint 240→241, D1 0122→0125, tests 3262→3447 동기화 |
| 5.72 | 2026-04-09 | **F492 ✅ — Sprint 241 완료 (PR #415 merged, Match 100%, 3436 tests)**. FileUploadZone+AttachedFilesPanel `apiBaseUrl` prop 제거, `BASE_URL` import 통일, fetch 경로 `/api/files/*` → `/files/*` (BASE_URL에 `/api` 포함). E2E 4종 신규 추가(PDF/PPTX/DOCX 성공 + PNG 거부 회귀 방지). 자동 merge pipeline 정상 동작 — review→merge→D1→deploy→cleanup 전체 1회 실행 |
| 5.71 | 2026-04-09 | **F492 등록 — FileUploadZone API 경로 drift (P1 Bug)**. 세션 #244 사용자 DEBUG 제보(`AI 시대 생산성 향상 가이드.pdf` 업로드 → `POST /api/files/presign` 405). 근본 원인: FileUploadZone이 `apiBaseUrl=""` 기본값 + `${apiBaseUrl}/api/files/presign` 상대경로 → Pages(`fx.minu.best`) 오리진에 붙어 POST 미지원 → 405. api-client 표준(`BASE_URL = VITE_API_URL \|\| "/api"`) 우회. 영향: F441~F443 파일 업로드 파이프라인 전체 무력화. drift 패턴 #243(offering legacy fetcher)와 동일 축. Sprint 241 WT 진행 (FX-REQ-484, P1) |
| 5.70 | 2026-04-09 | **Phase 29 완결 — F488+F489 ✅**. F488(Sprint 240, PR #405, Match 100%): req-manage `--create-issue` 스마트 기본화 + req-integrity 2카테고리. F489(dogfood, Issue #407): gov-retro Step 7 소급 Issue 등록 루틴(Phase 역순, 배치 10건, ✅ 자동 close). ax-marketplace `72165f8` 3스킬 수정 push 완료. Dogfood 경로 검증: F488 로직으로 F489 Issue 자동 생성 성공 |
| 5.69 | 2026-04-09 | **F488+F489 등록 — Phase 29 요구사항 거버넌스 자동화** 신설. F488(Sprint 240, P0): `/ax:req-manage new` `--create-issue` 스마트 기본화(β) + req-integrity 구조적공백/실시간drift 2카테고리 분리 리포트. F489(독립, P2): `/ax:gov-retro` 회고 통합 소급 등록 루틴(Phase 역순). 배경: req-integrity drift 근본 원인 치료 — opt-in 구조로는 실시간 drift 재발 불가피, 합산 수치가 실질 개선을 가림 |
| 5.68 | 2026-04-09 | **req-integrity fix** — F338~F341 📋→✅ 일괄 갱신 (Sprint 153 PR #285, 운영이슈 4건 해소). F112/F117/F118 GitHub Issue #125/#126/#127 reopen (bulk close 오류 복원 — 장기 항목 📋 유지). 보류: F100+ 미등록 Issues 274건(ROI 낮음), Execution Plan REQ 주석 45건(하위 검증 항목 무해), services 카운트(MSA 이후 skill 측정 범위 개선 영역) |
| 5.67 | 2026-04-09 | **Phase 28 완료 소급 보정** — F484~F487 📋→✅ 일괄 갱신. F484(Sprint 237, PR #390, Match 100%) + F485(Sprint 238, PR #392, Match 100%) + F486(Sprint 238, PR #392, Match 100%) + F487(Sprint 237, PR #390, Match 100%). §1 Phase 문구 Phase 27→28로 갱신, Sprint 범위 148~238로 확장. 마지막 실측 Sprint 230→236, D1 0121→0122 동기화. frontmatter system-version Sprint 148→236, updated 04-07→04-09. 트리거: `/ax:daily-check` + `/ax:req-integrity` 연속 실행으로 drift 감지 |
| 5.66 | 2026-04-06 | **Phase 18 Offering Pipeline 등록** — F363~F383(FX-REQ-355~375, 21건). Sprint 165~174 (10개). AX BD 형상화 자동화: offering-html/pptx Skill(F363~F367)+Offering Agent(F368)+D1 4테이블+CRUD/Export/Validate API(F369~F373)+Full UI 위자드/에디터/대시보드(F374~F377)+콘텐츠 어댑터+파이프라인(F378~F379)+PPTX(F380)+디자인 토큰 Phase 3(F381)+Prototype 연동(F382)+E2E(F383). 아키텍처: FX-Skill-Agent-Architecture v2.1. PRD: docs/specs/fx-offering-pipeline/prd-final.md |
| 5.65 | 2026-04-06 | **Phase 17 Self-Evolving Harness v2 등록** — F357~F362(FX-REQ-349~354, 6건). Sprint 161~164. 하네스 자가 발전 루프 완성: 데이터 진단+기준선(F357)+패턴 감지+Rule 생성(F358)+승인 플로우(F359)+O-G-D 범용화(F360)+효과 측정(F361)+운영 지표(F362). Guard Rail 자동 제안(P1)+O-G-D Loop 범용 인터페이스(P1)+활용률 대시보드(P2). req-interview 2/3 AI Pass(82점, Ambiguity 0.155). PRD: docs/specs/fx-harness-evolution/prd-final.md. 전략: docs/specs/self-evolving-harness-strategy.md |

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
