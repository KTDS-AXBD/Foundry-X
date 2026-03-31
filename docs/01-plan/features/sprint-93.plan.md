---
code: FX-PLAN-S93
title: "Sprint 93 — GIVC PoC 2차 (이벤트 연쇄 시나리오 MVP) + 추가 BD 아이템 탐색"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S92]], [[FX-DSGN-S92]]"
---

# Sprint 93: GIVC PoC 2차 (이벤트 연쇄 시나리오 MVP) + 추가 BD 아이템 탐색

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F256 GIVC PoC 2차 + F257 추가 BD 아이템 탐색 |
| Sprint | 93 |
| 기간 | 2026-03-31 |
| 우선순위 | P2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Sprint 92의 KG 인프라는 단일 노드 기점 영향 전파만 지원. 실제 공급망 리스크 분석에는 "복수 이벤트 동시 발생 시 연쇄 효과"와 "대체 공급처 탐색" 시나리오가 필요 |
| Solution | 4대 시나리오 중 **이벤트 연쇄 시나리오 MVP** 구현 — 복수 글로벌 이벤트 선택 → 동시 영향 전파 → 중첩 피해 노드 식별 + 리스크 히트맵 |
| Function UX Effect | 사용자가 이벤트(중동분쟁 + 일본수출규제 등)를 선택하면 각 이벤트의 영향이 공급 체인을 따라 전파되고, 복수 이벤트가 교차하는 "핫스팟" 품목이 시각적으로 강조됨 |
| Core Value | GIVC 고도화 제안의 핵심 시나리오 데모 확보 — "만약 ~하면?" 시뮬레이션 역량 증명 |

## 배경

Sprint 92(F255)에서 D1 위 Property Graph 패턴으로 KG 스키마 + 샘플 데이터 + 기본 질의 API를 구현했어요.
이번 Sprint에서는 피치덱 v0.9의 4대 시나리오 중 **이벤트 연쇄 시나리오**를 MVP로 구현해요.

### 4대 시나리오 (피치덱 기준)
1. **이벤트 연쇄 (Event Cascade)** ← 이번 Sprint MVP
2. 대체 공급처 (Alternative Supply Source) — Sprint 93+ 또는 본사업
3. EWS 영향 (Early Warning System Impact) — 본사업
4. 리스크맵 (Risk Map) — 본사업

### 이벤트 연쇄 시나리오 선정 이유
- 기존 `propagateImpact` 인프라 위에 **복수 이벤트 동시 시뮬레이션** 확장이 자연스러움
- 시드 데이터에 EVENT 노드 5개 + AFFECTED_BY 엣지가 이미 존재
- 피치덱 핵심 데모 — "중동분쟁 + 일본수출규제 동시 발생 시 한국 산업 영향" 시나리오

## 목표

### F256 — GIVC PoC 2차: 이벤트 연쇄 시나리오 MVP
1. **시나리오 시뮬레이션 API**: 복수 이벤트 동시 영향 전파 + 중첩 핫스팟 식별
2. **시나리오 프리셋**: 3개 사전 정의 시나리오 (석유화학 위기, 반도체 공급난, 복합 위기)
3. **시나리오 결과 시각화**: 영향 히트맵 + 핫스팟 강조 + 이벤트별 기여도 분해

### F257 — 추가 BD 아이템 탐색
1. **Discovery 파이프라인 활용**: 기존 BD 프로세스(F232~F240)로 신규 아이템 1~2건 발굴
2. **사업성 체크포인트**: 2-1~2-7 단계 문서화
3. **결과 문서화**: BD 탐색 결과를 PDCA Report에 포함

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F256 | GIVC PoC 2차 — 이벤트 연쇄 시나리오 MVP | P2 | F255 선행 |
| F257 | 추가 BD 아이템 탐색 — Discovery 파이프라인 실사용 | P2 | BD Pipeline(F232~F240) 실사용 |

## 기술 결정

### 1. 복수 이벤트 동시 시뮬레이션: 병합 전파 (Merged Propagation)

기존 `propagateImpact`는 단일 소스 노드에서 시작. 복수 이벤트는:
- 각 이벤트별 독립 전파 실행
- 동일 노드에 복수 이벤트 영향이 도달하면 **영향도 합산** (cap 1.0)
- 2개 이상 이벤트가 교차하는 노드 = **핫스팟 (hotspot)**

```
Event A (중동분쟁) → 원유 → 나프타 → 에틸렌 → PE
Event B (일본규제) → 불화수소 → 에칭 → 다이 → DRAM
                                              ↘ 핫스팟: 전자부품 ← PE 도 영향
```

### 2. 시나리오 프리셋: 하드코딩 vs DB

PoC 단계에서는 3개 시나리오를 서비스 코드에 하드코딩:
- **석유화학 위기**: 중동분쟁 + EU CBAM
- **반도체 공급난**: 일본수출규제 + 대만지진
- **복합 위기**: 중동분쟁 + 일본수출규제 + 미중반도체규제

본사업에서 DB 기반 시나리오 관리로 전환.

### 3. Web UI: 기존 ontology 페이지에 시나리오 탭 추가

새 페이지가 아닌 `/ax-bd/ontology` 페이지에 "시나리오 시뮬레이션" 탭을 추가:
- 탭 1: 노드 탐색기 (기존)
- 탭 2: 시나리오 시뮬레이션 (신규)

## 구현 범위

### API (packages/api)

1. **신규 서비스**: `kg-scenario.ts` — 시나리오 시뮬레이션 엔진
   - `simulateScenario(eventNodeIds[], orgId, options)` — 복수 이벤트 동시 전파
   - `getPresetScenarios()` — 프리셋 시나리오 목록
   - `getScenarioDetail(presetId)` — 프리셋 상세 (이벤트 노드 목록)
2. **라우트 확장**: `ax-bd-kg.ts`에 시나리오 엔드포인트 추가
   - `POST /ax-bd/kg/scenario/simulate` — 시나리오 실행
   - `GET /ax-bd/kg/scenario/presets` — 프리셋 목록
   - `GET /ax-bd/kg/scenario/presets/:id` — 프리셋 상세
3. **스키마 추가**: `kg-ontology.schema.ts`에 시나리오 관련 Zod 스키마
4. **테스트**: `kg-scenario.test.ts` (~15개)

### Web (packages/web)

1. **신규 컴포넌트**: `KgScenarioPanel.tsx` — 시나리오 시뮬레이션 UI
   - 프리셋 시나리오 카드 선택
   - 커스텀 이벤트 선택 (체크박스)
   - 결과: 영향 노드 리스트 + 핫스팟 강조 + 이벤트별 기여도
2. **ontology.tsx 수정**: 탭 UI 추가 (탐색기 / 시나리오)
3. **API 클라이언트 확장**: 시나리오 API 호출 함수
4. **테스트**: `KgScenarioPanel.test.tsx` (~8개)

### F257 산출물

코드 변경 없음 — BD 탐색 결과를 Report 문서에 기록.

## 예상 변경 파일

| 영역 | 파일 | 작업 |
|------|------|------|
| API service | `src/services/kg-scenario.ts` | 신규 |
| API route | `src/routes/ax-bd-kg.ts` | 수정 (시나리오 엔드포인트 추가) |
| API schema | `src/schemas/kg-ontology.schema.ts` | 수정 (시나리오 스키마 추가) |
| API test | `src/services/__tests__/kg-scenario.test.ts` | 신규 |
| API route test | `src/routes/__tests__/ax-bd-kg.route.test.ts` | 수정 (시나리오 테스트 추가) |
| Web component | `src/components/feature/kg/KgScenarioPanel.tsx` | 신규 |
| Web page | `src/routes/ax-bd/ontology.tsx` | 수정 (탭 UI) |
| Web api-client | `src/lib/api-client.ts` | 수정 (시나리오 API) |
| Web test | `src/components/feature/kg/__tests__/KgScenarioPanel.test.tsx` | 신규 |

## 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 복수 이벤트 전파 성능 | 3개 이벤트 × ~50 노드 탐색 | 각 전파는 독립적이므로 순차 실행해도 PoC 규모에서 1초 이내 |
| 핫스팟 식별 정확도 | 합산 방식의 한계 | PoC에서는 단순 합산, 본사업에서 베이지안 네트워크 등 고도화 |

## 성공 기준

| 기준 | 목표 |
|------|------|
| 시나리오 시뮬레이션 API | 3개 프리셋 정상 동작, 커스텀 이벤트 조합 지원 |
| 핫스팟 식별 | 2개 이상 이벤트 교차 노드 정상 표시 |
| 시나리오 UI | 프리셋 선택 → 결과 표시 → 핫스팟 강조 |
| API 테스트 | 15+ 테스트 PASS |
| Web 테스트 | 8+ 테스트 PASS |
| typecheck | 전체 패키지 통과 |
