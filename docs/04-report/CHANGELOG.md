# Foundry-X PDCA Completion Changelog

> Automatic changelog of PDCA cycle completions. Updated when `/pdca report` is executed.

## [2026-04-08] - Sprint 220: 1차/2차 PRD 자동 생성 (F454/F455)

### Added
- **BpHtmlParser** (`api/src/core/offering/services/bp-html-parser.ts`) — 사업기획서 HTML 구조화 파싱
  - 7개 표준 섹션 정규화 (목적/타깃/시장/기술/범위/일정/리스크)
  - 3단계 폴백: 헤더 → 단락 → rawText 전체 LLM
  
- **BpPrdGenerator** (`api/src/core/offering/services/bp-prd-generator.ts`) — PRD 생성 및 LLM 보강
  - 8개 섹션 템플릿 (표준 7 + 성공 지표)
  - DB INSERT: biz_generated_prds (source_type='business_plan')
  
- **PrdInterviewService** (`api/src/core/offering/services/prd-interview-service.ts`) — HITL 인터뷰 기반 2차 PRD 보강
  - startInterview(): 5~8개 질문 자동 생성
  - submitAnswer(): 응답 저장 + 마지막 응답 시 2차 PRD version=2 자동 생성
  
- **API 엔드포인트 (4개)**
  - POST `/biz-items/:id/generate-prd-from-bp` (F454)
  - POST `/biz-items/:id/prd-interview/start` (F455)
  - POST `/biz-items/:id/prd-interview/answer` (F455)
  - GET `/biz-items/:id/prd-interview/status` (F455)
  
- **Web 컴포넌트 (2개)**
  - PrdFromBpPanel (1차 PRD 생성 진행 상태 표시)
  - PrdInterviewPanel (질문→응답 루프 UI)
  
- **DB 마이그레이션 (2개)**
  - 0119_prd_source_type.sql: biz_generated_prds에 source_type, bp_draft_id 추가
  - 0120_prd_interviews.sql: prd_interviews 세션 관리 + prd_interview_qas 질문-응답 쌍
  
- **테스트 (23건)**
  - unit: 11건 (bp-html-parser 4 + bp-prd-generator 2 + prd-interview-service 5)
  - integration: 4건 (API 엔드포인트 검증)
  - E2E: 8건 (UI 흐름 검증)

### Changed
- **biz-items.ts**: 4개 엔드포인트 추가 (API 라우트)
- **discovery-detail.tsx**: PrdFromBpPanel + PrdInterviewPanel 통합 (형상화 탭)
- **api-client.ts**: 7개 API 클라이언트 함수 추가

### Technical Details
- **Features**: F454 (1차 PRD 자동 생성), F455 (2차 PRD 보강)
- **Sprint**: 220
- **Duration**: 1일
- **Match Rate**: 96% ✅
- **Tests**: 23/23 passed (unit 11 + integration 4 + E2E 8)
- **Coverage**: 96%
- **New LOC**: 727 (API 439 + Web 203 + migrations 85)
- **Phase**: 26 — BD Portfolio Management (B: PRD 생성 파이프라인)

### Next Phase
- Sprint 221 F456: 최종 PRD 확정 (3단계 PRD 통합 관리)
- Sprint 222 F457: Prototype Builder 실행

---

## [2026-04-03] - 세션 #173: ax plugin 자율점검 + 인프라 정비

### Changed
- **CLAUDE.md**: ax-bd-shaping 스킬 + shaping 에이전트 3종 목록 추가 (Phase 0c drift 해소)
- **infra-selfcheck/SKILL.md**: C1 검증 대상을 legacy commands → plugin skills로 전환, C4 참조 검증도 skills 기반으로 업데이트, Gotchas 추가
- **sprint/SKILL.md**: merge 단계 7b에 CLAUDE.md 스킬 테이블 자동 동기화 추가 (Sprint merge 시 drift 방지)

### Fixed
- **docs/04-report/**: sprint-*.report.md 5건을 features/ 서브디렉토리로 이동 (문서 위치 규칙 준수)

### 검증 결과
- ✅ selfcheck 8항목: 5 PASS, 1 SKIP, 2 WARN → 수정 후 전항목 정상

## [2026-04-01] - Sprint 100: F269 발굴 IA & Page 정리

### Added
- **아이디어 & BMC 통합 페이지** (`packages/web/src/routes/ax-bd/ideas-bmc.tsx`) — 아이디어 탭 + BMC 캔버스 탭 조합
- **진행 현황 대시보드** (`packages/web/src/routes/ax-bd/discover-dashboard.tsx`) — 진행추적 + 기준달성률 + 산출물 3탭
- **HelpAgent 패널** (`packages/web/src/components/feature/HelpAgentPanel.tsx`) — Sheet 기반 사이드 패널 래퍼

### Changed
- **발굴 메뉴 구조**: 10개 → 3개로 축소
  - Discovery (위저드 + 프로세스 가이드 탭)
  - 아이디어 & BMC (통합)
  - 진행 현황 (진행추적 + 기준달성률 + 산출물)
- **sidebar.tsx**: 데모 시나리오를 topItems(시작하기)로 이동, Ontology/스킬카탈로그를 지식 그룹으로 이동
- **discovery.tsx**: Tabs 추가 (위저드 | 프로세스 가이드)
- **HelpAgentChat**: 플로팅 UI 제거, 순수 채팅 패널로 전환
- **AppLayout**: HelpAgentPanel 통합

### Fixed
- FeedbackWidget ↔ HelpAgentChat 플로팅 버튼 겹침 완전 해소

### Technical Details
- **Feature**: F269 (FX-REQ-261, P0)
- **Sprint**: 100
- **Match Rate**: 97%
- **typecheck**: 0 errors
- **Web Test**: 265/265 passed
- **Backward Compatibility**: 11개 기존 라우트 전부 유지

---

## Summary Stats

| Metric | Value |
|--------|-------|
| **Total Features Completed** | 269 |
| **Total Reports Generated** | 42 (Sprint 100까지) |
| **Average Match Rate** | ~93% |
| **Phase** | 9 (팀 온보딩 + GIVC PoC + 발굴 UX) |

