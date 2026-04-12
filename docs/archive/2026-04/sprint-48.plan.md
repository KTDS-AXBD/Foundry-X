---
code: FX-PLAN-048
title: "Sprint 48 — ML 하이브리드 SR 분류기 + SR 대시보드 UI (F167+F168)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
feature: sprint-48
sprint: 48
phase: "Phase 5"
references:
  - "[[FX-PLAN-047]]"
  - "[[FX-SPEC-001]]"
  - "FX-SPEC-PRD-V8_foundry-x.md"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F167: ML 하이브리드 SR 분류기 / F168: SR 관리 전용 대시보드 UI |
| Sprint | 48 |
| 기간 | 2026-03-23 ~ (1 Sprint) |
| Phase | Phase 5 — 고객 파일럿용 SR 자동화 고도화 |

### Results (예상)

| 항목 | 목표 |
|------|------|
| ML 분류기 | HybridSrClassifier(규칙+ML 2-pass) + 학습 데이터 수집 파이프라인 + D1 마이그레이션 1건 |
| SR 대시보드 | SR 목록/필터/상태 뷰 + 워크플로우 시각화 + 분류 정확도 통계 |
| API | SR 통계 엔드포인트 2~3건 + 분류 피드백 엔드포인트 1건 |
| 테스트 | API 테스트 ~30건 + Web 테스트 ~10건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 규칙 기반 SR 분류기(F116)는 키워드 매칭에 의존하여 복합 SR(예: 보안 패치+코드 변경)이나 한국어 줄임말, 신조어에 대한 오분류 발생 가능. SR 처리 현황을 한눈에 볼 수 있는 대시보드도 부재 |
| **Solution** | F167: 규칙 기반 판단 후 confidence < 0.7일 때 LLM 폴백하는 HybridSrClassifier + 오분류 피드백 수집 테이블. F168: SR 목록/필터/워크플로우 DAG 시각화 대시보드 |
| **Function UX Effect** | 운영자가 SR 대시보드에서 분류 현황을 실시간 모니터링하고, 오분류 시 한 클릭으로 피드백 제출 가능. 피드백 데이터가 축적되면 ML 모델 학습에 활용 |
| **Core Value** | KT DS 고객 파일럿에서 "SR 분류 정확도 90%+" 시연 가능. 대시보드로 SR 처리 투명성 확보 → 고객사 신뢰 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

Sprint 48은 **SR 자동화 고도화** Sprint — ML 기반 분류 정확도 향상과 운영 가시성 확보를 병행.

| 유형 | F# | 작업 | 완료 기준 |
|:----:|:--:|------|-----------|
| 백엔드 | F167 | ML 하이브리드 SR 분류기 | HybridSrClassifier + 피드백 테이블 + 통계 API + 테스트 |
| 프론트엔드 | F168 | SR 관리 전용 대시보드 | SR 목록 페이지 + 분류 통계 카드 + 워크플로우 DAG 시각화 |

### 1.2 PRD 연계

- **PRD v8 Phase 5b**: F167은 F116(규칙 기반) 확장으로, ML 하이브리드 분류기를 통해 고객 파일럿 시 분류 정확도 90%+ 시연 목표
- **F168**: 고객 데모 시 SR 처리 현황을 시각적으로 보여주는 대시보드 — 수주 시연 필수 자료

## 2. 범위 (Scope)

### 2.1 F167 — ML 하이브리드 SR 분류기

#### 포함

| # | 항목 | 설명 |
|---|------|------|
| 1 | HybridSrClassifier | 기존 SrClassifier 래핑 — 규칙 판단 confidence < 0.7이면 LLM 폴백 |
| 2 | 분류 피드백 수집 | `sr_classification_feedback` D1 테이블 — 운영자가 오분류 보정 시 기록 |
| 3 | 분류 통계 API | `GET /api/sr/stats` — 유형별 건수, 평균 confidence, 오분류율 |
| 4 | 피드백 API | `POST /api/sr/:id/feedback` — 오분류 보정 피드백 등록 |
| 5 | PromptGateway 연동 | LLM 폴백 시 PromptGatewayService를 통해 분류 요청 (모델 라우팅 자동 적용) |

#### 제외

- ML 모델 직접 학습/파인튜닝 (Phase 5b 이후)
- ITSM 실 연동 (파일럿 진행 시)

### 2.2 F168 — SR 관리 대시보드 UI

#### 포함

| # | 항목 | 설명 |
|---|------|------|
| 1 | SR 목록 페이지 | `/app/(app)/sr/page.tsx` — 필터(유형/상태/우선순위) + 페이지네이션 |
| 2 | SR 상세 뷰 | 분류 결과(confidence + 키워드) + 워크플로우 DAG 시각화 |
| 3 | 분류 통계 카드 | 유형별 파이 차트 + 평균 confidence + 오분류율 게이지 |
| 4 | 피드백 인라인 UI | SR 카드에서 "분류 수정" 버튼 → 올바른 유형 선택 → 피드백 API 호출 |
| 5 | Sidebar 메뉴 추가 | SR Management 항목 추가 |

#### 제외

- SR 생성 폼 (API 직접 호출 또는 외부 ITSM 연동)
- 워크플로우 실 실행 트리거 UI (Phase 5b 이후)

## 3. 기술 설계 (High-Level Design)

### 3.1 F167 아키텍처

```
SR 텍스트 입력
    ↓
┌─────────────────────┐
│  SrClassifier       │  ← 기존 규칙 기반 (키워드 + 정규식)
│  (규칙 판단)         │
└────────┬────────────┘
         │ confidence >= 0.7
         ├──────────────────→ 결과 반환 (srType + confidence)
         │ confidence < 0.7
         ↓
┌─────────────────────┐
│  PromptGateway      │  ← LLM 기반 분류 (ModelRouter 자동 적용)
│  (LLM 폴백)         │
└────────┬────────────┘
         ↓
┌─────────────────────┐
│  결과 병합           │  규칙 confidence × 0.3 + LLM confidence × 0.7
│  (앙상블 가중 평균)   │  → 최종 srType 결정
└─────────────────────┘
```

**핵심 클래스:**

```typescript
// packages/api/src/services/hybrid-sr-classifier.ts
export class HybridSrClassifier {
  constructor(
    private ruleClassifier: SrClassifier,
    private promptGateway: PromptGatewayService,
    private confidenceThreshold: number = 0.7,
  ) {}

  async classify(title: string, description: string): Promise<HybridClassificationResult> {
    // 1단계: 규칙 기반 판단
    const ruleResult = this.ruleClassifier.classify(title, description);
    if (ruleResult.confidence >= this.confidenceThreshold) {
      return { ...ruleResult, method: "rule" };
    }
    // 2단계: LLM 폴백
    const llmResult = await this.classifyWithLlm(title, description);
    // 3단계: 앙상블 가중 평균
    return this.mergeResults(ruleResult, llmResult);
  }
}
```

**D1 마이그레이션 (0031):**

```sql
CREATE TABLE sr_classification_feedback (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL REFERENCES sr_requests(id),
  original_type TEXT NOT NULL,
  corrected_type TEXT NOT NULL,
  corrected_by TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sr_feedback_sr_id ON sr_classification_feedback(sr_id);
```

### 3.2 F168 컴포넌트 구조

```
packages/web/src/
├── app/(app)/sr/
│   ├── page.tsx              # SR 목록 + 필터 + 통계 카드
│   └── [id]/page.tsx         # SR 상세 + 워크플로우 DAG
├── components/feature/
│   ├── SrListTable.tsx       # SR 목록 테이블 (필터/페이지네이션)
│   ├── SrStatsCards.tsx      # 분류 통계 카드 (유형 파이 + confidence)
│   ├── SrWorkflowDag.tsx     # 워크플로우 DAG 시각화 (노드 그래프)
│   └── SrFeedbackDialog.tsx  # 분류 수정 다이얼로그
```

### 3.3 API 엔드포인트 신규/변경

| Method | Path | 설명 | 신규 |
|--------|------|------|:----:|
| GET | `/api/sr/stats` | 유형별 건수 + 평균 confidence + 오분류율 | ✅ |
| POST | `/api/sr/:id/feedback` | 분류 오분류 피드백 등록 | ✅ |
| GET | `/api/sr/:id/feedback` | 해당 SR의 피드백 이력 조회 | ✅ |
| POST | `/api/sr` | 기존 → HybridSrClassifier로 전환 | 변경 |

## 4. 구현 순서 (Implementation Order)

### Worker 1: F167 백엔드 (API)

| 순서 | 작업 | 산출물 |
|:----:|------|--------|
| 1 | D1 마이그레이션 0031 | `sr_classification_feedback` 테이블 |
| 2 | HybridSrClassifier 서비스 | `services/hybrid-sr-classifier.ts` |
| 3 | SR routes 확장 | stats + feedback 3 endpoints |
| 4 | 기존 POST /sr 전환 | SrClassifier → HybridSrClassifier |
| 5 | 테스트 작성 | ~30건 (분류 정확도 + 폴백 + 피드백 CRUD + 통계) |

### Worker 2: F168 프론트엔드 (Web)

| 순서 | 작업 | 산출물 |
|:----:|------|--------|
| 1 | SR 목록 페이지 | `app/(app)/sr/page.tsx` + SrListTable |
| 2 | 통계 카드 | SrStatsCards (유형 분포 + confidence 게이지) |
| 3 | SR 상세 + DAG | `app/(app)/sr/[id]/page.tsx` + SrWorkflowDag |
| 4 | 피드백 다이얼로그 | SrFeedbackDialog (인라인 수정 UI) |
| 5 | Sidebar 메뉴 추가 | SR Management 항목 |
| 6 | 테스트 작성 | ~10건 (컴포넌트 렌더링 + API 연동) |

## 5. 리스크 & 의존성

| # | 리스크 | 영향 | 완화 |
|---|--------|------|------|
| R1 | LLM 폴백 시 지연 (1~3초) | SR 생성 응답 지연 | confidence < 0.7인 경우만 폴백, 비동기 옵션 검토 |
| R2 | PromptGateway가 SR 분류 프롬프트 미지원 | LLM 폴백 불가 | 분류 전용 프롬프트 템플릿 사전 등록 |
| R3 | 워크플로우 DAG 시각화 복잡도 | 구현 지연 | 최소: 텍스트 기반 DAG → 고도화: SVG 노드 그래프 |

| # | 의존성 | 해결 |
|---|--------|------|
| D1 | PromptGatewayService (F149) | ✅ Sprint 39 완료 |
| D2 | SrClassifier + SrWorkflowMapper (F116) | ✅ Sprint 44 완료 |
| D3 | ModelRouter (F136) | ✅ Sprint 36 완료 |

## 6. 성공 기준

| 기준 | 목표 |
|------|------|
| Match Rate | >= 90% |
| API 테스트 | 기존 999 + ~30 = 1029+ |
| Web 테스트 | 기존 68 + ~10 = 78+ |
| 분류 정확도 | 시드 데이터 기준 90%+ (규칙 기반 80% → 하이브리드 90%) |
| 대시보드 렌더링 | SR 목록 + 상세 + 통계 + 피드백 전체 동작 |

## 7. Agent Team 구성

2-Worker Agent Team (기존 Sprint 패턴 유지):

| Worker | 역할 | 수정 허용 파일 |
|:------:|------|--------------|
| Worker 1 | F167 백엔드 | `packages/api/src/services/hybrid-sr-classifier.ts`, `packages/api/src/routes/sr.ts`, `packages/api/src/schemas/sr.ts`, `packages/api/src/db/migrations/0031_*.sql`, `packages/api/src/__tests__/sr*.test.ts` |
| Worker 2 | F168 프론트엔드 | `packages/web/src/app/(app)/sr/**`, `packages/web/src/components/feature/Sr*.tsx`, `packages/web/src/__tests__/sr*.test.tsx` |
