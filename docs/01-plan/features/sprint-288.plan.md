---
id: FX-PLAN-288
type: plan
title: Sprint 288 — F535 Graph 실행 정식 API + UI
sprint: 288
f_items: [F535]
req: [FX-REQ-565]
status: PLANNED
created: 2026-04-14
---

# Sprint 288 Plan — F535 Graph 실행 정식 API + UI

## 목표

PR #563 임시 구현을 대체하는 **정식 Graph 실행 API** 완성 + 웹 UI 'Graph 모드 실행' 버튼 연결.

현재 `POST /biz-items/:id/discovery-graph/run-all` 엔드포인트는 존재하지만:
1. sessionId가 저장/조회되지 않음 (매번 동적 생성)
2. 웹 UI에 Graph 모드 실행 버튼이 없음
3. 단계별 진행률이 UI에 표시되지 않음

## 범위 (In Scope)

### API (packages/api)
- **D1 migration**: `graph_sessions` 테이블 신규 (sessionId 영속화)
- `POST /biz-items/:id/discovery-graph/run-all` 정식화:
  - sessionId를 `graph_sessions` 테이블에 저장
  - `confirmStage(graphMode=true)` 옵션 파라미터 노출
- `GET /biz-items/:id/discovery-graph/sessions` 신규:
  - 해당 biz_item의 graph session 목록 + 최신 세션 조회

### Web (packages/web)
- **api-client.ts**: `runDiscoveryGraph()` + `getGraphSessions()` 함수 추가
- **DiscoveryGraphPanel** 신규 컴포넌트:
  - 'Graph 모드 실행' 버튼
  - 실행 중 로딩 상태 + sessionId 표시
  - 최근 session 목록 조회
- **discovery-detail.tsx** 탭 통합: 발굴 분석 탭에 GraphPanel 추가

## 범위 제외 (Out of Scope)
- stage별 실시간 진행률 스트리밍 (SSE/WebSocket — F536 이후)
- MetaAgent 자동 진단 (F536)
- confirmStage 자체 UI 변경 (기존 유지)

## 의존성
- F534 ✅ (DiagnosticCollector 훅) — 이미 완료
- F531 ✅ (DiscoveryGraphService.runAll()) — 이미 완료

## TDD 계획
| 대상 | 등급 | Red 테스트 |
|------|------|-----------|
| graph-session-service.ts | 필수 | createSession / getLatestSession / listSessions |
| POST run-all (정식화) | 필수 | sessionId 저장 확인 |
| GET sessions | 필수 | 빈 목록 + 데이터 있음 |
| DiscoveryGraphPanel.tsx | 권장 | 버튼 렌더링 + 클릭 핸들러 |

## 성공 기준
- [ ] `graph_sessions` D1 테이블 생성
- [ ] POST run-all → sessionId DB 저장
- [ ] GET sessions → 목록 반환
- [ ] 웹 UI에 'Graph 모드 실행' 버튼 표시
- [ ] 버튼 클릭 → API 호출 + sessionId 화면 표시
- [ ] vitest PASS + typecheck PASS
