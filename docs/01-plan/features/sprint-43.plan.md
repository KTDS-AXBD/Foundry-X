---
code: FX-PLAN-043
title: "Sprint 43 — 온보딩 데이터 수집 결과 + 모델 품질 대시보드 UI (F114+F143)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-43
sprint: 43
phase: "Phase 5a"
references:
  - "[[FX-PLAN-042]]"
  - "[[FX-SPEC-001]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F114: 온보딩 4주 데이터 수집 결과 정리 + Phase 4 최종 판정 / F143: 모델 품질 대시보드 UI |
| Sprint | 43 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A 완결 후 — UI 이관 + 판정 마무리) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 컴포넌트 | 4개 (ModelQualityTab, AgentModelHeatmap, QualityMetricCard, OnboardingReportPage) |
| 신규 테스트 | 20개+ (Web 패키지) |
| 신규 타입 | 2개 (ModelQualityMetric, AgentModelCell → shared 패키지) |
| API 변경 | 0개 (기존 2 endpoints 활용) |
| 판정 문서 | 1건 (Phase 4 최종 Go/No-Go 판정서) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | F143 API가 Sprint 35에서 완성됐지만 시각화 UI가 없어 모델 성능/비용을 한눈에 파악 불가. F114 온보딩 4주 데이터 수집이 진행됐지만 결과 정리 및 Phase 4 최종 판정이 보류 중 |
| **Solution** | F143: TokensPage에 "Model Quality" 탭 추가 — 모델별 성공률/비용/효율 테이블 + Agent×Model 히트맵. F114: 피드백 데이터 기반 온보딩 결과 보고서 + Phase 4 최종 Go 판정 |
| **Function UX Effect** | 관리자가 Tokens 페이지에서 모델 성능 비교, 에이전트별 모델 사용 패턴을 히트맵으로 즉시 확인. 온보딩 현황 데이터 기반 의사결정 |
| **Core Value** | Sprint 35 API 투자의 UI 이관 완료로 모델 비용/품질 관리 풀체인 달성. Phase 4 Conditional Go → 최종 Go 판정으로 프로젝트 마일스톤 확정 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F143 — 모델 품질 대시보드 UI (이관 완료):**
- TokensPage에 탭 네비게이션 추가: "Usage" (기존) / "Model Quality" (신규)
- **ModelQualityTab 컴포넌트**: `GET /tokens/model-quality` API 연동
  - 모델별 카드: 성공률(%), 평균 응답시간(ms), 실행당 비용($), 토큰 효율
  - 정렬/필터: 성공률순, 비용순, 실행횟수순
- **AgentModelHeatmap 컴포넌트**: `GET /tokens/agent-model-matrix` API 연동
  - Agent(행) × Model(열) 크로스 매트릭스
  - 셀 색상: 성공률 기반 (녹색 90%+ → 노랑 70%+ → 빨강 70% 미만)
  - 셀 내용: 실행횟수 + 비용
- **기간 필터**: `days` 파라미터 (7일/30일/90일 선택)
- shared 패키지에 `ModelQualityMetric`, `AgentModelCell` 타입 추가

**F114 — 온보딩 데이터 수집 결과 + Phase 4 최종 판정:**
- 온보딩 피드백 데이터(NPS 점수, 코멘트, 체크리스트 완료율) 정리
- Phase 4 최종 Go/No-Go 판정 문서 작성 (`docs/specs/phase4-final-verdict.md`)
  - 판정 기준: NPS 평균 ≥ 7, 체크리스트 완료율 ≥ 80%, 주요 블로커 0건
  - 기술 완성도 (Track A 18/18, 925 API tests, 157 endpoints)
  - 최종 판정 및 Phase 5 전환 근거

### 1.2 범위 제한
- F143 UI: 차트 라이브러리 미도입 — shadcn/ui Table + CSS 기반 히트맵으로 구현 (기존 패턴 유지)
- F143 UI: 실시간 업데이트 없음 — 페이지 로드 시 fetch 1회 (기존 TokensPage 패턴)
- F114: 실제 온보딩 데이터가 D1 remote에 있을 수 있음 — mock 데이터로 UI 검증 후 실데이터 연동
- 기존 API 엔드포인트 변경 없음 — 프론트엔드 only Sprint

## 2. 기술 설계 요약

### 2.1 파일 구조

```
packages/web/src/
├── app/(app)/tokens/
│   └── page.tsx                          # 탭 네비게이션 추가 (Usage / Model Quality)
├── components/feature/
│   ├── ModelQualityTab.tsx                # [신규] 모델 품질 탭 컨테이너
│   ├── QualityMetricCard.tsx              # [신규] 개별 모델 품질 카드
│   ├── AgentModelHeatmap.tsx              # [신규] Agent×Model 히트맵
│   └── TokenUsageChart.tsx                # [기존] 유지
├── __tests__/
│   ├── ModelQualityTab.test.tsx           # [신규]
│   ├── QualityMetricCard.test.tsx         # [신규]
│   └── AgentModelHeatmap.test.tsx         # [신규]
└── lib/
    └── api-client.ts                     # [기존] fetchApi 활용

packages/shared/src/
└── web.ts                                # ModelQualityMetric, AgentModelCell 타입 추가

docs/specs/
└── phase4-final-verdict.md               # [신규] Phase 4 최종 판정서
```

### 2.2 의존 관계
- **API**: `GET /tokens/model-quality` + `GET /tokens/agent-model-matrix` (Sprint 35 완성, 변경 없음)
- **스키마**: `ModelQualityMetricSchema`, `AgentModelMatrixResponseSchema` (token.ts, 변경 없음)
- **UI**: shadcn/ui `Card`, `Table`, `Tabs` 컴포넌트 활용
- **타입**: shared 패키지에 프론트엔드용 타입 export 추가

### 2.3 구현 순서

```
Step 1: shared 타입 추가 (ModelQualityMetric, AgentModelCell)
  ↓
Step 2: TokensPage 탭 네비게이션 리팩토링 (Usage / Model Quality)
  ↓
Step 3: QualityMetricCard 컴포넌트 구현
  ↓
Step 4: ModelQualityTab 컴포넌트 (API fetch + 카드 목록 + 기간 필터)
  ↓
Step 5: AgentModelHeatmap 컴포넌트 (매트릭스 시각화)
  ↓
Step 6: 테스트 작성 (3개 컴포넌트 × vitest)
  ↓
Step 7: F114 Phase 4 최종 판정 문서 작성
```

## 3. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|:----:|:----:|------|
| D1 remote에 model_execution_metrics 데이터 없음 | 높음 | 중간 | 빈 데이터 시 안내 메시지 표시 + mock 데이터로 UI 검증 |
| shadcn/ui Tabs 미설치 | 낮음 | 낮음 | 기존 버튼 그룹으로 탭 구현 (shadcn Tabs 없어도 가능) |
| shared 패키지 타입 추가 시 빌드 실패 | 낮음 | 중간 | web.ts에 interface 추가만 — 기존 export 구조 유지 |

## 4. 완료 기준 (Definition of Done)

### F143 UI
- [ ] TokensPage에 Usage / Model Quality 탭 전환 동작
- [ ] Model Quality 탭에서 모델별 품질 카드 렌더링 (성공률, 비용, 효율)
- [ ] Agent×Model 히트맵 렌더링 (색상 코딩 + 셀 데이터)
- [ ] 기간 필터 (7일/30일/90일) 동작
- [ ] 빈 데이터 시 안내 메시지 표시
- [ ] 테스트 3개 컴포넌트 × 각 3+ 케이스 = 9+ 테스트
- [ ] typecheck 통과, lint 통과

### F114 판정
- [ ] Phase 4 최종 판정 문서 작성 (Go/No-Go + 근거)
- [ ] SPEC.md 갱신 (Phase 4 상태 업데이트)
- [ ] MEMORY.md 갱신 (Phase 4 판정 결과 반영)

## 5. 참고

- F143 API 설계: `packages/api/src/services/model-metrics.ts` (Sprint 35)
- F143 라우트: `packages/api/src/routes/token.ts` (GET /tokens/model-quality, GET /tokens/agent-model-matrix)
- F143 스키마: `packages/api/src/schemas/token.ts` (ModelQualityMetricSchema, AgentModelMatrixResponseSchema)
- 기존 TokensPage: `packages/web/src/app/(app)/tokens/page.tsx`
- 기존 TokenUsageChart: `packages/web/src/components/feature/TokenUsageChart.tsx`
- 온보딩 피드백 API: `packages/api/src/services/feedback.ts` + `packages/api/src/routes/feedback.ts`
