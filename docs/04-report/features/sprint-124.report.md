---
code: FX-RPRT-S124
title: "E2E 상세 페이지(:id) 커버리지 확장 — 완료 보고서"
version: "1.0"
status: Active
category: RPRT
feature: F302
sprint: 124
created: 2026-04-04
updated: 2026-04-04
author: Claude (Autopilot)
ref: "[[FX-ANLS-S124]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F302 — E2E 상세 페이지(:id) 커버리지 확장 |
| Sprint | 124 |
| 기간 | 2026-04-04 (단일 세션) |
| Match Rate | **95%** |

### Results Summary

| 지표 | 값 |
|------|---|
| 신규 E2E 테스트 | +10건 |
| Mock Factory | 11종 신규 |
| E2E 전체 | 179 tests (172 pass / 1 fail 기존 / 6 skip) |
| 신규 파일 | 2개 (mock-factory.ts, detail-pages.spec.ts) |
| 변경 파일 | 0개 |

### 1.3 Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | `:id` 파라미터 상세 페이지 10개가 E2E 미커버 — 라우팅/API 회귀 감지 불가 |
| **Solution** | Mock factory 패턴 도입 + 상세 페이지 전용 E2E spec 10건. 11종 factory로 테스트 데이터 일관성 확보 |
| **Function UX Effect** | 모든 상세 페이지 렌더링 + 데이터 표시 + 네비게이션 검증 → 회귀 방지 |
| **Core Value** | E2E 커버리지 169→179 tests (+6%), 파라미터 라우팅 안정성 보장 |

## 2. PDCA Cycle Summary

| Phase | 상태 | 산출물 |
|-------|------|--------|
| Plan | ✅ | `docs/01-plan/features/sprint-124.plan.md` |
| Design | ✅ | `docs/02-design/features/sprint-124.design.md` |
| Do | ✅ | `e2e/fixtures/mock-factory.ts` + `e2e/detail-pages.spec.ts` |
| Check | ✅ 95% | `docs/03-analysis/features/sprint-124.analysis.md` |
| Report | ✅ | 본 문서 |

## 3. 구현 상세

### 3.1 Mock Factory (`e2e/fixtures/mock-factory.ts`)

11종 factory 함수 — `make*()` + spread override 패턴:

| Factory | 용도 | 필드 수 |
|---------|------|---------|
| `makeBizItem` | discovery/items/:id | 8 |
| `makeIdea` | ax-bd/ideas/:id | 6 |
| `makeBmc` | ax-bd/bmc/:id | blocks[] 배열 (9블록) |
| `makeBdpVersion` | ax-bd/bdp/:bizItemId | 8 |
| `makeSrDetail` | collection/sr/:id | 10 |
| `makeOfferingPack` | shaping/offering/:id | 6 |
| `makeOutreach` | gtm/outreach/:id | 8 |
| `makeCustomer` | outreach 보조 | 5 |
| `makeShapingRun` | shaping/review/:runId | 13 |
| `makeArtifact` | ax-bd/artifacts/:id | 13 |
| `makeDiscoveryProgress` | discovery 보조 | 3 |

### 3.2 E2E Spec (`e2e/detail-pages.spec.ts`)

| # | 테스트 | 라우트 | 핵심 검증 |
|---|--------|--------|-----------|
| 1 | 사업 아이템 상세 | discovery/items/:id | 제목 + ArtifactList |
| 2 | 아이디어 상세 | ax-bd/ideas/:id | 제목 + tags |
| 3 | BMC 상세 | ax-bd/bmc/:id | 제목 + 9블록 그리드 |
| 4 | BDP 상세 | ax-bd/bdp/:bizItemId | 사업제안서 heading + 리뷰 |
| 5 | SR 상세 | collection/sr/:id | 제목 + badges |
| 6 | 오퍼링 팩 상세 | shaping/offering/:id | 제목 + status |
| 7 | 오퍼링 브리프 | shaping/offering/:id/brief | 팩 제목 + briefs |
| 8 | 아웃리치 상세 | gtm/outreach/:id | 제목 + 고객정보 |
| 9 | 형상화 리뷰 상세 | shaping/review/:runId | status badge |
| 10 | 산출물 상세 | ax-bd/artifacts/:id | skillId + 버전 |

## 4. Design 변경 사항

구현 중 발견한 실제 API 스키마와 Design 간의 차이:

1. **BMC**: `blocks[]` 배열 구조 (Design은 flat field로 설계)
2. **BDP**: `versionNum`, `isFinal` 추가 필드
3. **Outreach**: `title` 필드 필수
4. **Customer**: `companyName` (Design `name` → 실제 `companyName`)
5. **Artifact**: 13개 필드 (BdArtifact 인터페이스 — `stageId`, `model`, `tokensUsed`, `durationMs` 등)

## 5. hitl-review Skip 결론

Design에서 4건 재활성화를 계획했으나, 조사 결과:
- `WizardStepDetail` 컴포넌트가 산출물/리뷰 링크를 렌더링하지 않음
- `onArtifactReview` props는 미연결 상태
- → **의도적 스킵 유지**, 향후 HITL 패널 UI 완성 시 재활성화

## 6. 교훈

1. **Mock 정밀도**: API 클라이언트 타입 정의 → 컴포넌트 → mock 역순 추적이 정확한 mock의 핵심
2. **getByText vs getByRole**: 사이드바와 main 영역에 동일 텍스트가 있을 때 `main.getByRole('heading')` 스코핑 필수
3. **Skip 재활성화 사전 조사**: UI 컴포넌트의 실제 렌더링 동작을 코드 수준에서 확인해야 mock만으로 해결 가능한지 판단 가능
