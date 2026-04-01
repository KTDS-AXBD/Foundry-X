# Foundry-X PDCA Completion Changelog

> Automatic changelog of PDCA cycle completions. Updated when `/pdca report` is executed.

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

