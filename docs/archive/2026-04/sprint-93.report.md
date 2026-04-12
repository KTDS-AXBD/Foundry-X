---
code: FX-RPRT-S93
title: "Sprint 93 완료 보고서 — GIVC PoC 2차 (이벤트 연쇄 시나리오 MVP) + 추가 BD 아이템 탐색"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S93]], [[FX-DSGN-S93]], [[FX-SPEC-001]]"
---

# Sprint 93 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F256 GIVC PoC 2차 + F257 추가 BD 아이템 탐색 |
| Sprint | 93 |
| 기간 | 2026-03-31 |
| 결과 | ✅ 완료 |

### Results

| 지표 | 값 |
|------|------|
| Match Rate | 100% (Design 대비 구현 완전 일치) |
| 신규 파일 | 4개 (service + test + component + web-test) |
| 수정 파일 | 4개 (route + schema + api-client + ontology page) |
| API 테스트 | +15개 (2205 total) |
| Web 테스트 | +8개 (257 total) |
| typecheck | ✅ 전체 통과 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Sprint 92의 KG 인프라는 단일 노드 기점 영향 전파만 지원. 실제 공급망 리스크 분석에는 복수 이벤트 동시 시뮬레이션이 필요 |
| Solution | 복수 글로벌 이벤트 동시 영향 전파 + 핫스팟 식별 엔진 구현. 3개 프리셋 시나리오 (석유화학 위기, 반도체 공급난, 복합 위기) |
| Function UX Effect | Ontology 탐색기에 "시나리오 시뮬레이션" 탭 추가 — 프리셋 클릭 한 번으로 연쇄 영향 분석 + 핫스팟 강조 |
| Core Value | GIVC 고도화 피치덱 핵심 시나리오 데모 확보 — "만약 ~하면?" 시뮬레이션 역량 증명 |

## 구현 내역

### F256 — GIVC PoC 2차: 이벤트 연쇄 시나리오 MVP

#### API (packages/api)

| 파일 | 작업 | 설명 |
|------|------|------|
| `services/kg-scenario.ts` | 신규 | 시나리오 시뮬레이션 엔진 — 복수 이벤트 병합 전파 + 핫스팟 감지 |
| `schemas/kg-ontology.schema.ts` | 수정 | `scenarioSimulateSchema` Zod 스키마 추가 |
| `routes/ax-bd-kg.ts` | 수정 | 3개 시나리오 엔드포인트 추가 (presets, preset/:id, simulate) |
| `__tests__/kg-scenario.test.ts` | 신규 | 15개 테스트 (프리셋/시뮬레이션/핫스팟/옵션/엣지케이스) |

#### Web (packages/web)

| 파일 | 작업 | 설명 |
|------|------|------|
| `components/feature/kg/KgScenarioPanel.tsx` | 신규 | 시나리오 시뮬레이션 UI — 프리셋 카드 + 결과 리스트 + 핫스팟 강조 |
| `routes/ax-bd/ontology.tsx` | 수정 | 2탭 구조 전환 (노드 탐색기 / 시나리오 시뮬레이션) |
| `lib/api-client.ts` | 수정 | 시나리오 API 타입 + 호출 함수 추가 |
| `__tests__/kg-scenario.test.tsx` | 신규 | 8개 테스트 (프리셋 렌더/클릭/결과/핫스팟/기여도) |

#### 시나리오 프리셋 3개

| ID | 이름 | 이벤트 | 카테고리 |
|----|------|--------|---------|
| preset-petrochem-crisis | 석유화학 위기 | 중동분쟁 + EU CBAM | petrochemical |
| preset-semi-shortage | 반도체 공급난 | 일본수출규제 + 대만지진 | semiconductor |
| preset-compound-crisis | 복합 위기 | 중동분쟁 + 일본수출규제 + 미중반도체규제 | compound |

### F257 — 추가 BD 아이템 탐색

코드 변경 없음. Sprint 93 범위에서는 GIVC PoC 시나리오 MVP 구현에 집중하고, BD 아이템 탐색은 실제 팀 사용 시 Discovery 파이프라인을 통해 진행 예정.

## 검증 결과

| 검증 항목 | 결과 |
|----------|------|
| typecheck (5 packages) | ✅ 전체 통과 |
| API tests | ✅ 2205/2205 (15 기존 unhandled errors — mock-d1 duplicate column, 무관) |
| Web tests | ✅ 257/257 |
| 시나리오 시뮬레이션 정상 동작 | ✅ 프리셋 3개 + 커스텀 이벤트 조합 |
| 핫스팟 식별 | ✅ 복수 이벤트 교차 노드 정상 검출 |

## 기술 결정 기록

1. **병합 전파 (Merged Propagation)**: 각 이벤트별 독립 BFS → 노드 ID 기준 합산 방식. O(events × nodes) 복잡도. PoC에서는 충분, 본사업 2,443개 시 배치 최적화 필요
2. **프리셋 하드코딩**: PoC에서는 3개 시나리오를 서비스 코드에 정의. 본사업에서 DB 기반 시나리오 관리로 전환
3. **AFFECTED_BY → SUPPLIES 체인 전파**: 이벤트 노드의 AFFECTED_BY 엣지 대상 품목에서 SUPPLIES 관계만 따라 전파. 이벤트→BELONGS_TO 등 비공급 관계는 제외
