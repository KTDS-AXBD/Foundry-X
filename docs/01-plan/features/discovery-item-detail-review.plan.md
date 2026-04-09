# Plan: 아이템 상세 페이지 점검

## 1. 개요

Discovery 아이템 상세 페이지(`/discovery/items/:id`)의 3가지 핵심 문제를 점검하고 수정한다.

**대상 URL**: `https://fx.minu.best/discovery/items/bi-koami-001`

## 2. 현황 분석

### 2-1. 파이프라인 진행률 (Status 추적/매핑)

**문제**: 
- `pipeline_stages` 테이블에 KOAMI가 `REGISTERED`로만 존재 — 분석 완료해도 `DISCOVERY`로 자동 전환 안 됨
- `biz_items.status`가 분석 완료 시 `evaluated`로 변하지만, 웹 UI `STATUS_CONFIG`에 `evaluated` 매핑 없음 → "대기"로 보임

**STATUS_CONFIG 현재 매핑** (`business-plan-list.tsx:15`):
```
draft → 대기, analyzing → 분석 중, analyzed → 분석 완료, shaping → 형상화 중, completed → 완료
```

**빠진 상태**: `classifying`, `classified`, `evaluating`, `evaluated`

### 2-2. 발굴 분석 실행 후 상태 변화 없음

**문제**:
- AnalysisStepper가 3단계(2-0 시작점, 2-1 분류, 2-2 평가)를 실행하지만:
  1. `biz_item_discovery_stages` 테이블을 업데이트하지 않음 — API가 discovery-stage 서비스를 호출 안 함
  2. `pipeline_stages`를 REGISTERED→DISCOVERY로 전환하지 않음
  3. biz_items.status가 `evaluated`로 끝나는데 UI에 반영 안 됨

### 2-3. 발굴 분석 스텝 (Figma v0.95 vs 현재 구현)

**Figma 프로세스 (v0.95)**:
1. 사업 아이템 구체화/분석
2. 레퍼런스 분석
3. 수요 시장 검증
4. 경쟁 우위 확인
5. 사업 아이템 도출
6. 핵심 아이디어 선별
7. 발굴 결과 패키징
8. 외부 페르소나 사업 평가

**API 코드의 Stage 정의** (`analysis-path-v82.ts` + `discovery-stage-service.ts`):
| Stage | 이름 | 현재 구현 |
|-------|------|-----------|
| 2-0 | 사업 아이템 분류 | AnalysisStepper에서 실행 (starting-point API) |
| 2-1 | 레퍼런스 분석 | ❌ API만 존재, UI 없음 (Stepper에서 "자동 분류"로 오매핑) |
| 2-2 | 수요 시장 검증 | ❌ API만 존재, UI 없음 (Stepper에서 "다관점 평가"로 오매핑) |
| 2-3 | 경쟁·자사 분석 | ❌ 미구현 |
| 2-4 | 사업 아이템 도출 | ❌ 미구현 |
| 2-5 | 핵심 아이템 선정 | ❌ 미구현 |
| 2-6 | 타겟 고객 정의 | ❌ 미구현 |
| 2-7 | 비즈니스 모델 정의 | ❌ 미구현 |
| 2-8 | 패키징 | ❌ 미구현 |
| 2-9 | AI 멀티페르소나 평가 | ❌ 미구현 |
| 2-10 | 최종 보고서 | ❌ 미구현 |

**핵심 문제**: AnalysisStepper가 3단계 자동 실행만 하고 끝남. Figma/v82 설계는 2-0~2-9까지 HITL 피드백을 받으며 진행하는 구조.

## 3. 수정 항목

### F478: STATUS_CONFIG 매핑 보완
- `business-plan-list.tsx`와 `discovery-detail.tsx`의 STATUS_CONFIG에 누락 상태 추가
- `classifying` → "분류 중", `classified` → "분류 완료", `evaluating` → "평가 중", `evaluated` → "평가 완료"

### F479: 분석 완료 → pipeline_stages 자동 전환
- AnalysisStepper 완료 시 (또는 API 단에서) `pipeline_stages`를 REGISTERED→DISCOVERY로 전환
- `biz_item_discovery_stages` 2-0/2-1/2-2도 `completed`로 업데이트

### F480: AnalysisStepper → Discovery Stage 전체 스텝퍼 리뉴얼
- 현재 3단계 자동 실행을 11단계(2-0~2-10) HITL 스텝퍼로 확장
- 각 스테이지별: AI 분석 실행 → 결과 표시 → 사용자 피드백/수정 → 확인 후 다음 단계
- `analysis-path-v82.ts`의 유형별 강도(core/normal/light) 반영
- Viability Question을 각 스테이지 완료 시 HITL로 제시

## 4. 우선순위

| 항목 | 복잡도 | 우선순위 | 이유 |
|------|--------|----------|------|
| F478 STATUS_CONFIG | 낮음 | P0 즉시 | 매핑만 추가, 5분 작업 |
| F479 pipeline 전환 | 중간 | P0 즉시 | 분석 완료 후 상태 반영 필수 |
| F480 전체 스텝퍼 | 높음 | P1 이번 | Figma 설계 대비 핵심 기능 누락 |

## 5. 영향 범위

### 수정 파일
- `packages/web/src/routes/business-plan-list.tsx` — STATUS_CONFIG 보완
- `packages/web/src/routes/ax-bd/discovery-detail.tsx` — 상태 매핑 + 스텝퍼 연동
- `packages/web/src/components/feature/discovery/AnalysisStepper.tsx` — 전체 리뉴얼
- `packages/api/src/core/discovery/routes/biz-items.ts` — 분석 완료 시 discovery_stages + pipeline 동기화
- `packages/api/src/core/discovery/services/discovery-stage-service.ts` — (기존 로직 활용)
- `packages/web/src/lib/api-client.ts` — 새 API 호출 추가 (discovery-stage 업데이트)

### 의존성
- F478은 각 스테이지별 AI 분석 API가 필요 (2-3~2-10) — 현재 미구현이므로 stub 또는 단계적 구현 필요
