---
code: FX-DSGN-S238
title: "Sprint 238 Design — F485 발굴 분석 결과 표시 + HITL 피드백 루프 / F486 9기준 체크리스트 UX 정리"
version: 1.0
status: Active
category: design
created: 2026-04-09
updated: 2026-04-09
author: Claude
sprint: 238
f-items: [F485, F486]
plan-ref: "[[FX-PLAN-DISCOVERY-DETAIL-UX-V2]]"
---

# Sprint 238 Design — F485 + F486

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F485 발굴 분석 결과 표시 + HITL 피드백 루프, F486 9기준 체크리스트 UX 정리 |
| Sprint | 238 |
| 소요 예상 | API 2 엔드포인트 + Web 2 컴포넌트 개선 + 서비스 1 수정 |
| 핵심 목표 | 완료된 단계의 AI 분석 결과를 다시 볼 수 있고, 피드백 기반 재실행 가능하게. 9기준은 역할/가이드 명확화 + AI 결과 자동 연동 |

## 2. 현재 상태 분석

### F485 문제점
1. **DiscoveryStageStepper**가 AI 분석 결과를 `stageResult` state에만 저장 — 페이지 이동이나 다른 단계 실행 시 소실
2. **stage-runner-service.ts**가 AI 결과를 실행만 하고 bd_artifacts에 저장하지 않음
3. 완료된 단계 클릭 시 결과를 볼 수 없음 — expand/collapse가 `showResult` 조건으로 현재 실행한 단계만 표시
4. 피드백 기반 "재실행" 기능이 UI에 노출되지 않음 (완료 단계에는 실행 버튼이 숨겨짐)

### F486 문제점
1. 각 기준의 역할(AI가 하는 건지, 사용자가 하는 건지) 불명확
2. 설명/가이드 없이 기준 이름 + 조건만 표시
3. AI 분석 단계 완료 시 관련 기준을 자동 완료 처리하는 연동 없음
4. "진행 중" 표시가 있지만, 무엇이 진행 중인지 맥락 없음

## 3. 설계

### 3.1 F485: 결과 표시 + HITL 피드백 루프

#### 3.1.1 API: 단계별 결과 조회 엔드포인트

**GET** `/biz-items/:id/discovery-stage/:stage/result`

```typescript
// Response: StageResultResponse
{
  stage: string;
  stageName: string;
  intensity: "core" | "normal" | "light";
  result: { summary: string; details: string; confidence: number };
  viabilityDecision: "go" | "pivot" | "drop" | null;
  feedback: string | null;
  completedAt: string | null;
  artifactId: string | null;
}
```

- bd_artifacts에서 해당 stage + biz_item의 최신 결과 조회
- ax_viability_checkpoints에서 decision 조회
- 없으면 404

#### 3.1.2 API: 결과 저장 (stage-runner-service 수정)

**기존 `runStage()` 수정**: AI 결과를 bd_artifacts에 저장

```typescript
// stage-runner-service.ts runStage() 마지막에 추가
const artifactId = crypto.randomUUID().replace(/-/g, "");
await this.db.prepare(
  `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, model, status, created_by, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'system', datetime('now'))`
).bind(artifactId, orgId, bizItemId, `discovery-${stage}`, stage, 1, prompt, JSON.stringify(analysisResult), "claude-haiku-4-5-20250714").run();
```

version 관리: 같은 stage 재실행 시 version 증가 (MAX(version) + 1 조회)

#### 3.1.3 Web: DiscoveryStageStepper 개선

| 항목 | 변경 내용 |
|------|-----------|
| D-01 | 완료된 단계 클릭 시 결과 펼쳐보기 — API에서 결과 조회하여 표시 |
| D-02 | 완료 단계에 ChevronDown 아이콘 추가 (클릭 가능 표시) |
| D-03 | 완료 단계 expanded 시 결과 + viability decision 배지 표시 |
| D-04 | 완료 단계에 "피드백 재실행" 버튼 — 피드백 입력 후 재실행 가능 |
| D-05 | 재실행 결과가 기존 결과를 대체 (version 증가) |
| D-06 | 피드백 히스토리 — ax_viability_checkpoints의 reason 필드 표시 |
| D-07 | 결과 로딩 상태 (Loader2 스피너) |

**상태 추가**:
```typescript
const [completedResults, setCompletedResults] = useState<Record<string, StageResultResponse>>({});
const [loadingResult, setLoadingResult] = useState<string | null>(null);
const [rerunMode, setRerunMode] = useState<string | null>(null);
```

#### 3.1.4 API Client 추가

```typescript
// api-client.ts
export interface StageResultResponse {
  stage: string;
  stageName: string;
  intensity: string;
  result: StageAnalysisResult;
  viabilityDecision: string | null;
  feedback: string | null;
  completedAt: string | null;
  artifactId: string | null;
}

export async function getStageResult(bizItemId: string, stage: string): Promise<StageResultResponse> {
  return fetchApi(`/biz-items/${bizItemId}/discovery-stage/${stage}/result`);
}
```

### 3.2 F486: 9기준 체크리스트 UX 정리

#### 3.2.1 단계-기준 매핑 (Stage → Criteria)

AI 분석 단계가 완료되면 관련 기준을 자동으로 "completed" 처리:

```typescript
const STAGE_CRITERIA_MAP: Record<string, number[]> = {
  "2-1": [1],     // 레퍼런스 분석 → 문제/고객 정의
  "2-2": [2],     // 수요/시장 검증 → 시장 기회
  "2-3": [3, 8],  // 경쟁 환경 → 경쟁 환경 + 차별화 근거
  "2-4": [4],     // 아이템 도출 → 가치 제안 가설
  "2-5": [5],     // 핵심 선정 → 수익 구조 가설
  "2-6": [6],     // 타겟 고객 → 핵심 리스크 가정
  "2-7": [7],     // 비즈니스 모델 → 규제/기술 제약
  "2-8": [9],     // 패키징 → 검증 실험 계획
};
```

#### 3.2.2 서비스: confirmStage에 criteria 자동 갱신 추가

```typescript
// stage-runner-service.ts confirmStage() 수정
// viability checkpoint 저장 후:
const criteriaIds = STAGE_CRITERIA_MAP[stage] ?? [];
if (criteriaIds.length > 0 && viabilityAnswer !== "stop") {
  const criteriaSvc = new DiscoveryCriteriaService(this.db);
  for (const criterionId of criteriaIds) {
    await criteriaSvc.update(bizItemId, criterionId, {
      status: "completed",
      evidence: `${stage} 단계 분석 완료 (${viabilityAnswer})`,
    });
  }
}
```

#### 3.2.3 Web: DiscoveryCriteriaPanel 개선

| 항목 | 변경 내용 |
|------|-----------|
| D-08 | 각 기준에 설명 툴팁 — 조건(condition) 아래 "역할: AI가 단계 2-N에서 자동 평가" 안내 |
| D-09 | 역할 배지: "AI 자동" (linked stage 있는 기준) / "수동 확인" (없는 기준) |
| D-10 | linked stage가 완료되면 자동으로 체크 표시 (갱신은 서버에서) |
| D-11 | 미완료 기준에 "연결된 단계: 2-N" 표시 — 어떤 분석이 필요한지 안내 |
| D-12 | 기준 카드 클릭 시 evidence 전체 표시 (현재 1줄 line-clamp) |
| D-13 | refreshCriteria prop 추가 — stage complete 시 부모에서 트리거 |

**상수 추가 (Web):**
```typescript
const CRITERIA_STAGE_LINK: Record<number, { stage: string; role: string }> = {
  1: { stage: "2-1", role: "AI가 레퍼런스 분석 시 자동 평가" },
  2: { stage: "2-2", role: "AI가 수요/시장 검증 시 자동 평가" },
  3: { stage: "2-3", role: "AI가 경쟁 환경 분석 시 자동 평가" },
  4: { stage: "2-4", role: "AI가 아이템 도출 시 자동 평가" },
  5: { stage: "2-5", role: "AI가 핵심 선정 시 자동 평가" },
  6: { stage: "2-6", role: "AI가 타겟 고객 정의 시 자동 평가" },
  7: { stage: "2-7", role: "AI가 비즈니스 모델 정의 시 자동 평가" },
  8: { stage: "2-3", role: "AI가 경쟁 환경 분석 시 자동 평가" },
  9: { stage: "2-8", role: "AI가 패키징 시 자동 평가" },
};
```

### 3.3 라우트 등록

`discovery-stage-runner.ts`에 GET 엔드포인트 추가:

```typescript
// GET /biz-items/:id/discovery-stage/:stage/result
discoveryStageRunnerRoute.get("/biz-items/:id/discovery-stage/:stage/result", async (c) => { ... });
```

## 4. 파일 변경 목록

### API
| # | 파일 | 변경 |
|---|------|------|
| A-01 | `packages/api/src/core/discovery/services/stage-runner-service.ts` | runStage에 bd_artifacts 저장 + confirmStage에 criteria 자동 갱신 |
| A-02 | `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | GET /result 엔드포인트 추가 |

### Web
| # | 파일 | 변경 |
|---|------|------|
| W-01 | `packages/web/src/lib/api-client.ts` | getStageResult() 함수 + StageResultResponse 타입 추가 |
| W-02 | `packages/web/src/components/feature/discovery/DiscoveryStageStepper.tsx` | 완료 단계 결과 조회/표시 + 재실행 UI |
| W-03 | `packages/web/src/components/feature/discovery/DiscoveryCriteriaPanel.tsx` | 역할 배지 + 설명 + linked stage + refreshCriteria |
| W-04 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | onStageComplete에서 criteria refresh 연동 |

### 테스트
| # | 파일 | 변경 |
|---|------|------|
| T-01 | `packages/api/src/__tests__/stage-runner-service.test.ts` | 결과 저장 + criteria 갱신 테스트 |
| T-02 | `packages/api/src/__tests__/discovery-stage-runner-route.test.ts` | GET /result 엔드포인트 테스트 |

## 5. 검증 항목 (Gap Analysis 기준)

| # | 항목 | 검증 방법 |
|---|------|-----------|
| V-01 | runStage 실행 시 bd_artifacts에 결과 저장 | 테스트: INSERT 확인 |
| V-02 | 재실행 시 version 증가 | 테스트: version 1 → 2 확인 |
| V-03 | GET /result 엔드포인트 200 응답 | 테스트: mock artifact 조회 |
| V-04 | GET /result 결과 없을 때 404 | 테스트: 빈 DB 조회 |
| V-05 | confirmStage 시 criteria 자동 갱신 | 테스트: criteria status → completed |
| V-06 | stop 결정 시 criteria 미갱신 | 테스트: criteria status 유지 |
| V-07 | STAGE_CRITERIA_MAP 매핑 정확성 | 테스트: 각 stage의 criteria ID 확인 |
| V-08 | DiscoveryStageStepper 완료 단계 클릭 시 결과 표시 | 코드 검사: expanded + API 호출 |
| V-09 | DiscoveryStageStepper 재실행 버튼 존재 | 코드 검사: rerunMode 상태 |
| V-10 | DiscoveryCriteriaPanel 역할 배지 표시 | 코드 검사: CRITERIA_STAGE_LINK |
| V-11 | DiscoveryCriteriaPanel 설명 텍스트 | 코드 검사: role 텍스트 렌더링 |
| V-12 | DiscoveryCriteriaPanel refreshCriteria 연동 | 코드 검사: prop + 부모 연결 |
| V-13 | discovery-detail.tsx criteria refresh 연동 | 코드 검사: onStageComplete 핸들러 |
| V-14 | api-client getStageResult 함수 존재 | 코드 검사 |
| V-15 | StageResultResponse 타입 정의 | 코드 검사 |
