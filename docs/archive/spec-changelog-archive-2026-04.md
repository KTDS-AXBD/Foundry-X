# SPEC.md §9 변경 이력 — 아카이브 (v1.0 ~ v5.65)

> **원본**: SPEC.md §9 (전체 127줄 → 오래된 항목 아카이브)
> **아카이브 일자**: 2026-04-12
> **사유**: SPEC.md 경량화 (Phase 36 F512 A-5). 최근 10건만 SPEC.md에 유지.

---

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
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
