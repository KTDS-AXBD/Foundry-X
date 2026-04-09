# Design: 아이템 상세 페이지 점검 (F478~F480)

## 1. F478: STATUS_CONFIG 매핑 보완

### 1-1. 변경 대상

| 파일 | 현재 매핑 |
|------|-----------|
| `packages/web/src/routes/business-plan-list.tsx:15` | `STATUS_CONFIG` — draft/analyzing/analyzed/shaping/completed |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx:51` | `STATUS_LABELS` — draft/analyzing/analyzed/shaping/done |

### 1-2. 추가할 상태

```typescript
// business-plan-list.tsx STATUS_CONFIG 에 추가
classifying: { label: "분류 중", color: "bg-blue-100 text-blue-700" },
classified: { label: "분류 완료", color: "bg-indigo-100 text-indigo-700" },
evaluating: { label: "평가 중", color: "bg-blue-100 text-blue-700" },
evaluated: { label: "평가 완료", color: "bg-purple-100 text-purple-700" },

// discovery-detail.tsx STATUS_LABELS 에 추가
classifying: "분류 중",
classified: "분류 완료",
evaluating: "평가 중",
evaluated: "평가 완료",
```

### 1-3. 상태 흐름 정리

```
draft → classifying → classified → evaluating → evaluated → shaping → completed/done
(대기)   (분류 중)     (분류 완료)   (평가 중)     (평가 완료)   (형상화 중)  (완료)
```

---

## 2. F479: 분석 완료 → pipeline/discovery_stages 자동 전환

### 2-1. 현재 문제

AnalysisStepper가 3단계(starting-point → classify → evaluate)를 실행하지만:
1. `biz_item_discovery_stages` 테이블의 2-0/2-1/2-2 status가 업데이트 안 됨
2. `pipeline_stages`가 REGISTERED에서 DISCOVERY로 안 넘어감

### 2-2. 수정 위치: API 라우트

**파일**: `packages/api/src/core/discovery/routes/biz-items.ts`

각 분석 API 핸들러에서 discovery_stages도 함께 업데이트한다.

#### POST /biz-items/:id/starting-point 완료 시
```typescript
// 기존 로직 이후 추가:
const stageSvc = new DiscoveryStageService(c.env.DB);
await stageSvc.updateStage(bizItemId, orgId, "2-0", "completed");
```

#### POST /biz-items/:id/classify 완료 시
```typescript
// 기존 classify 로직 이후 추가:
// 주의: 현재 classify API는 "2-1 자동 분류"로 구현됨.
// v82 기준에서 2-1은 "레퍼런스 분석"이지만, F480 리뉴얼 전까지는 현행 매핑 유지.
const stageSvc = new DiscoveryStageService(c.env.DB);
await stageSvc.updateStage(bizItemId, orgId, "2-1", "completed");
```

#### POST /biz-items/:id/evaluate 완료 시
```typescript
// 기존 evaluate 로직 이후 추가:
const stageSvc = new DiscoveryStageService(c.env.DB);
await stageSvc.updateStage(bizItemId, orgId, "2-2", "completed");

// pipeline_stages: REGISTERED → DISCOVERY 자동 전환
const pipelineSvc = new PipelineService(c.env.DB);
await pipelineSvc.advanceStage(bizItemId, orgId, "REGISTERED", "DISCOVERY");
```

### 2-3. PipelineService.advanceStage 구현

**파일**: `packages/api/src/core/discovery/services/pipeline-service.ts` (기존 파일에 메서드 추가)

```typescript
async advanceStage(bizItemId: string, orgId: string, fromStage: string, toStage: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  // 현재 단계 종료
  const updated = await this.db.prepare(
    `UPDATE pipeline_stages SET exited_at = ? WHERE biz_item_id = ? AND stage = ? AND exited_at IS NULL`
  ).bind(now, bizItemId, fromStage).run();
  
  if (!updated.meta.changes) return false;
  
  // 다음 단계 진입
  const id = generateId();
  await this.db.prepare(
    `INSERT INTO pipeline_stages (id, biz_item_id, org_id, stage, entered_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, bizItemId, orgId, toStage, now).run();
  
  return true;
}
```

### 2-4. 프론트엔드 — 분석 완료 후 리로드

**파일**: `packages/web/src/components/feature/discovery/AnalysisStepper.tsx`

`onAnalysisComplete` 콜백이 이미 `discovery-detail.tsx`의 `loadData()`를 호출하므로, API가 정확히 상태를 업데이트하면 UI에 자동 반영됨. 추가 프론트엔드 수정 불필요.

---

## 3. F480: AnalysisStepper → Discovery Stage 전체 스텝퍼 리뉴얼

### 3-1. 설계 원칙

- **HITL(Human-in-the-Loop)**: 각 스테이지에서 AI 분석 실행 → 결과 표시 → 사용자 확인/피드백 → 다음 단계
- **analysis-path-v82 기반**: 5유형(I/M/P/T/S)별 강도(core/normal/light) 반영
- **Viability Question**: 각 스테이지 완료 시 사업성 체크 질문 제시
- **순차 진행**: 이전 단계 completed 상태여야 다음 단계 실행 가능

### 3-2. 스테이지 매핑 (Figma v0.95 ↔ v82 ↔ 구현)

| Stage | v82 이름 | Figma v0.95 | 구현 방식 | API |
|-------|----------|-------------|-----------|-----|
| 2-0 | 사업 아이템 분류 | 사업 아이템 구체화/분석 | 자동 (기존 starting-point + classify) | POST /starting-point + /classify |
| 2-1 | 레퍼런스 분석 | 레퍼런스 분석 | AI 분석 + HITL | POST /discovery-stage/2-1/run (신규) |
| 2-2 | 수요 시장 검증 | 수요 시장 검증 | AI 분석 + HITL | POST /discovery-stage/2-2/run (신규) |
| 2-3 | 경쟁·자사 분석 | 경쟁 우위 확인 | AI 분석 + HITL | POST /discovery-stage/2-3/run (신규) |
| 2-4 | 사업 아이템 도출 | 사업 아이템 도출 | AI 분석 + HITL | POST /discovery-stage/2-4/run (신규) |
| 2-5 | 핵심 아이템 선정 | 핵심 아이디어 선별 | Commit Gate + HITL | POST /discovery-stage/2-5/run (신규) |
| 2-6 | 타겟 고객 정의 | — | AI 분석 + HITL | POST /discovery-stage/2-6/run (신규) |
| 2-7 | 비즈니스 모델 정의 | — | AI 분석 + HITL | POST /discovery-stage/2-7/run (신규) |
| 2-8 | 패키징 | 발굴 결과 패키징 | AI 분석 + HITL | POST /discovery-stage/2-8/run (신규) |
| 2-9 | AI 멀티페르소나 평가 | 외부 페르소나 사업 평가 | 자동 (기존 evaluate 이동) | POST /evaluate (기존) |
| 2-10 | 최종 보고서 | — | 자동 생성 | POST /discovery-stage/2-10/run (신규) |

### 3-3. 기존 API 재매핑

**문제**: 현재 AnalysisStepper는 2-0=starting-point, 2-1=classify, 2-2=evaluate로 매핑하지만, v82 스테이지 정의와 충돌.

**해결**: 
- 2-0 단계를 **starting-point + classify 통합**으로 변경 (아이템 분류 = 시작점 유형 + 산업 분류)
- 기존 evaluate는 **2-9 AI 멀티페르소나 평가**로 이동
- 2-1~2-8은 새 API로 구현

### 3-4. 신규 API 엔드포인트

**라우트**: `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` (신규)

```
POST /biz-items/:id/discovery-stage/:stage/run
  - Request: { feedback?: string }  // 이전 단계 HITL 피드백 (선택)
  - Response: {
      stage: string,
      stageName: string,
      intensity: "core" | "normal" | "light",
      result: StageAnalysisResult,      // AI 분석 결과
      viabilityQuestion: string | null,  // 사업성 체크 질문
    }
```

```
POST /biz-items/:id/discovery-stage/:stage/confirm
  - Request: {
      viabilityAnswer: "go" | "pivot" | "stop",
      feedback?: string,  // 수정/보완 피드백
    }
  - Response: { ok: true, nextStage: string | null }
  - 동작:
    1. discovery_stages 상태를 completed로 업데이트
    2. viability_checkpoints에 답변 기록
    3. nextStage 반환 (stop이면 null)
```

### 3-5. StageAnalysisResult 타입

```typescript
interface StageAnalysisResult {
  // 공통
  summary: string;           // 분석 요약 (1~2문장)
  details: string;           // 상세 분석 (마크다운)
  confidence: number;        // 0~100 신뢰도
  
  // 스테이지별 추가 데이터
  references?: ReferenceItem[];       // 2-1 레퍼런스
  marketData?: MarketAnalysis;        // 2-2 시장 데이터
  competitors?: CompetitorInfo[];     // 2-3 경쟁사
  itemCandidates?: ItemCandidate[];   // 2-4 아이템 후보
  selectedItems?: SelectedItem[];     // 2-5 선정 결과
  targetPersonas?: PersonaProfile[];  // 2-6 타겟 고객
  businessModel?: BusinessModelCanvas; // 2-7 BM
  packageSummary?: PackageSummary;    // 2-8 패키징
}
```

### 3-6. 프론트엔드 컴포넌트 설계

#### DiscoveryStageStepper (AnalysisStepper 대체)

**파일**: `packages/web/src/components/feature/discovery/DiscoveryStageStepper.tsx`

```
┌─────────────────────────────────────────────────────┐
│ 발굴 분석 (3/11 완료)                    [다음 단계] │
├─────────────────────────────────────────────────────┤
│ ✅ 2-0 사업 아이템 분류          core    완료         │
│ ✅ 2-1 레퍼런스 분석              light   완료         │
│ 🔵 2-2 수요 시장 검증            core    ← 현재      │
│    ┌──────────────────────────────────────────┐     │
│    │ [AI 분석 결과]                            │     │
│    │ 시장 규모: 2,340억 (CAGR 12.3%)          │     │
│    │ 주요 수요처: 제조업 공급망 관리 ...       │     │
│    │                                          │     │
│    │ 💬 사업성 체크                            │     │
│    │ "시장 규모나 타이밍을 보니,              │     │
│    │  우리 팀이 이걸 지금 추진할 만한         │     │
│    │  이유가 있나요?"                          │     │
│    │                                          │     │
│    │ [피드백 입력...]                          │     │
│    │                                          │     │
│    │ [Go ✅]  [Pivot 🔄]  [Stop ⛔]           │     │
│    └──────────────────────────────────────────┘     │
│ ○ 2-3 경쟁·자사 분석              core               │
│ ○ 2-4 사업 아이템 도출            core               │
│ ○ 2-5 핵심 아이템 선정 (Commit)   core               │
│ ○ 2-6 타겟 고객 정의              normal             │
│ ○ 2-7 비즈니스 모델 정의          normal             │
│ ○ 2-8 패키징                      —                  │
│ ○ 2-9 AI 멀티페르소나 평가        —                  │
│ ○ 2-10 최종 보고서                —                  │
└─────────────────────────────────────────────────────┘
```

**핵심 동작**:
1. 페이지 로드 시 `GET /biz-items/:id/discovery-progress` 호출 → 각 스테이지 상태 표시
2. 현재 스테이지의 "실행" 버튼 클릭 → `POST /discovery-stage/:stage/run` 호출
3. AI 결과 + Viability Question 표시
4. 사용자가 Go/Pivot/Stop 선택 + 피드백 입력
5. `POST /discovery-stage/:stage/confirm` 호출 → 다음 스테이지 활성화
6. 2-5(Commit Gate)에서는 추가 질문 4개 제시 (`COMMIT_GATE_QUESTIONS`)

**Props**:
```typescript
interface DiscoveryStageStepperProps {
  bizItemId: string;
  discoveryType: string;  // I/M/P/T/S — intensity 결정용
  onStageComplete?: (stage: string) => void;
  onAllComplete?: () => void;
}
```

### 3-7. api-client.ts 추가 함수

```typescript
// Discovery Progress 조회
export async function getDiscoveryProgress(bizItemId: string): Promise<DiscoveryProgress>
  → GET /biz-items/${bizItemId}/discovery-progress

// Stage 실행
export async function runDiscoveryStage(bizItemId: string, stage: string, feedback?: string): Promise<StageRunResult>
  → POST /biz-items/${bizItemId}/discovery-stage/${stage}/run

// Stage 확인 (HITL)
export async function confirmDiscoveryStage(bizItemId: string, stage: string, answer: "go"|"pivot"|"stop", feedback?: string): Promise<StageConfirmResult>
  → POST /biz-items/${bizItemId}/discovery-stage/${stage}/confirm
```

### 3-8. discovery-detail.tsx 변경

- `AnalysisStepper` import → `DiscoveryStageStepper`로 교체
- "발굴분석" 탭 내용을 `DiscoveryStageStepper`로 대체
- `item.discoveryType`을 props로 전달 (classify 이전이면 null → 2-0 완료 후 타입 결정)

## 4. 수정 파일 요약

| 파일 | F478 | F479 | F480 |
|------|:----:|:----:|:----:|
| `packages/web/src/routes/business-plan-list.tsx` | ✅ | | |
| `packages/web/src/routes/ax-bd/discovery-detail.tsx` | ✅ | | ✅ |
| `packages/api/src/core/discovery/routes/biz-items.ts` | | ✅ | |
| `packages/api/src/core/discovery/services/pipeline-service.ts` | | ✅ | |
| `packages/web/src/components/feature/discovery/AnalysisStepper.tsx` | | | ✅ (삭제/교체) |
| `packages/web/src/components/feature/discovery/DiscoveryStageStepper.tsx` | | | ✅ (신규) |
| `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | | | ✅ (신규) |
| `packages/api/src/core/discovery/services/stage-runner-service.ts` | | | ✅ (신규) |
| `packages/web/src/lib/api-client.ts` | | | ✅ |
| `packages/shared/src/discovery-x.ts` | | | ✅ (타입 추가) |

## 5. 구현 순서

1. **F478** — STATUS_CONFIG 매핑 추가 (5분)
2. **F479** — API 라우트에 discovery_stages + pipeline 동기화 추가 (30분)
3. **F480-a** — 신규 API 엔드포인트 + stage-runner 서비스 (1~2시간)
4. **F480-b** — DiscoveryStageStepper 컴포넌트 + api-client 연동 (1~2시간)
5. **F480-c** — discovery-detail.tsx 통합 + 테스트 (30분)
