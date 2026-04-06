---
code: FX-PLAN-S178
title: "Sprint 178 — M4: Builder Quality 대시보드 + 사용자 피드백 루프"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Claude Autopilot
sprint: 178
features: [F390, F391]
---

# Sprint 178 Plan — M4: Builder Quality 대시보드 + 사용자 피드백 루프

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F390 Builder Quality 대시보드 + F391 사용자 피드백 루프 |
| Sprint | 178 |
| Phase | Phase 19 — Builder Evolution |
| 선행 Sprint | Sprint 176 (F386+F387 5차원 스코어링), Sprint 177 (F388+F389 CLI 듀얼 모드 + Enhanced O-G-D) |
| 예상 산출물 | API 3 routes + 3 services + 3 schemas + Web 2 pages + D1 2 migrations + 15+ tests |

| 관점 | 내용 |
|------|------|
| Problem | 5차원 품질 점수가 DB에 저장되지만 시각적 대시보드가 없어 BD팀이 품질 현황을 파악할 수 없음. 자동 점수와 실제 고객 피드백 간 상관관계가 불명확함 |
| Solution | Builder Quality 전용 페이지에 스코어 카드 + 레이더 차트 + 개선 추이 그래프를 제공하고, 수동 평가 데이터 수집 + 자동-수동 상관관계 분석 시스템 구축 |
| Function UX Effect | BD팀이 프로토타입 품질을 한눈에 파악하고, 고객 피드백이 자동 점수 개선에 반영됨 |
| Core Value | 프로토타입 품질의 정량적 관리와 지속적 캘리브레이션으로 "고객 데모 가능" 수준 자동 보장 |

## §1 목표

### F390: Builder Quality 대시보드
- **점수 카드**: 전체 프로토타입 평균 점수, 80점+ 비율, 비용 절감 효과
- **레이더 차트**: 5차원(Build/UI/Functional/PRD/Code) 차원별 평균 분포
- **개선 추이**: 라운드별 점수 변화 타임라인 (전체 + 개별 Job)
- **비용 비교**: CLI vs API 모드 사용 비율 + 절감액

### F391: 사용자 피드백 루프
- **수동 평가 수집**: BD팀/고객이 프로토타입에 대해 5차원 수동 점수(1~5) 부여
- **상관관계 분석**: 자동 5차원 점수 vs 수동 평가 간 Pearson/Spearman 상관계수 산출
- **캘리브레이션 히스토리**: 시간에 따른 자동-수동 갭 추이 시각화
- **임계값 자동 조정 제안**: 상관관계가 낮은 차원에 대해 가중치 조정 권고

## §2 기술 접근

### API (packages/api)
1. **quality-dashboard route** — 대시보드 전용 집계 API
   - `GET /quality-dashboard/summary` — 전체 통계 (기존 `getStats()` 확장)
   - `GET /quality-dashboard/dimensions` — 5차원 평균 분포
   - `GET /quality-dashboard/trend` — 시간별 추이 (최근 30일)
2. **user-evaluation route** — 사용자 수동 평가 CRUD
   - `POST /user-evaluations` — 수동 평가 등록
   - `GET /user-evaluations/:jobId` — Job별 평가 목록
   - `GET /user-evaluations/correlation` — 자동-수동 상관관계
3. **D1 migration** — `user_evaluations` 테이블 신규
4. **calibration-service** — 상관관계 계산 + 캘리브레이션 로직

### Web (packages/web)
1. **builder-quality 페이지** — `/builder-quality` 라우트
   - ScoreCardGrid: 4개 KPI 카드 (평균점수, 80점+%, 비용절감, 총 프로토타입)
   - DimensionRadar: 5축 레이더 차트 (SVG)
   - TrendChart: 시간별 점수 추이 라인 차트 (SVG)
   - CostComparison: CLI/API 모드 비율 파이 차트
2. **evaluation 모달** — prototype-detail 페이지에 수동 평가 폼 추가
   - 5차원 슬라이더 (1~5점)
   - 코멘트 텍스트 필드
   - 평가자 역할 선택 (BD팀/고객/경영진)
3. **correlation 뷰** — 자동-수동 상관관계 시각화
   - 차원별 산점도 (자동 vs 수동)
   - 상관계수 배지

## §3 선행 코드 활용

| 기존 코드 | 활용 방식 |
|-----------|-----------|
| `PrototypeQualityService.getStats()` | 대시보드 summary API의 기반 |
| `QualityScoreChart` 컴포넌트 | TrendChart 구현 시 참조 |
| `prototype_quality` D1 테이블 | 자동 점수 소스 |
| `submitPrototypeFeedback` API | 기존 피드백과 수동 평가 구분 |
| `InsertQualitySchema` | 검증 패턴 참조 |

## §4 구현 순서

| 단계 | 작업 | 산출물 |
|------|------|--------|
| 1 | D1 마이그레이션 (user_evaluations 테이블) | 1 migration |
| 2 | API schemas + services (quality-dashboard, user-evaluation, calibration) | 3 schemas, 3 services |
| 3 | API routes (quality-dashboard, user-evaluation) | 2 routes |
| 4 | Web builder-quality 페이지 (스코어 카드 + 레이더 + 추이) | 1 page + 4 components |
| 5 | Web 수동 평가 모달 + 상관관계 뷰 | 1 modal + 1 component |
| 6 | 테스트 (API + Web) | 15+ tests |
| 7 | 라우터 등록 + 사이드바 네비게이션 추가 | router.tsx + sidebar |

## §5 리스크

| 리스크 | 대응 |
|--------|------|
| 수동 평가 데이터 부족 (초기) | 최소 3개 이상 평가 시에만 상관계수 산출 |
| 상관관계 낮을 시 의미 | 차원별 가중치 조정 권고 UI 제공 |
| 레이더 차트 라이브러리 의존 | 라이브러리 없이 순수 SVG 구현 (기존 패턴) |

## §6 완료 기준

- [ ] Builder Quality 대시보드 4개 섹션 (스코어카드, 레이더, 추이, 비용) 동작
- [ ] 수동 평가 CRUD (등록/조회)
- [ ] 자동-수동 상관관계 계산 + 시각화
- [ ] API 테스트 15개 이상 pass
- [ ] typecheck + lint 통과
