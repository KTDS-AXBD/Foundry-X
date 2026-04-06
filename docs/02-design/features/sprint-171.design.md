# Sprint 171 Design — Integration: 콘텐츠 어댑터 + discover→shape 파이프라인

> **문서코드:** FX-DSGN-S171
> **버전:** 1.0
> **작성일:** 2026-04-07
> **Plan 참조:** [[FX-PLAN-S171]]
> **F-items:** F378, F379

---

## 1. Overview

Sprint 171은 Offering Pipeline Phase 18의 Integration 단계로, 두 가지 핵심 기능을 구현한다:
1. **F378 콘텐츠 어댑터** — DiscoveryPackage의 발굴 산출물을 3가지 톤(executive/technical/critical)으로 변환하여 Offering 섹션 콘텐츠를 자동 생성
2. **F379 discover→shape 파이프라인** — 발굴 완료 시 EventBus 이벤트를 통해 Offering을 자동 생성하고 섹션을 프리필하는 파이프라인

---

## 2. F378 — 콘텐츠 어댑터 설계

### 2-1. 톤 정의

| 톤 | 목적 | 문체 | 강조 요소 |
|----|------|------|----------|
| `executive` | 경영진 보고 | 간결, 수치 중심 | ROI, 시장 규모, 전략적 판단 |
| `technical` | 기술 제안 | 상세, 구현 중심 | 아키텍처, 기술 스택, 데이터 흐름 |
| `critical` | 심사/검토 | 객관적, 비판적 | 리스크, 한계, 대안, 근거 |

### 2-2. API 설계

**POST /offerings/:id/adapt**
- 요청: `{ tone: 'executive' | 'technical' | 'critical', sectionKeys?: string[] }`
- 응답: `{ adaptedSections: { sectionKey: string; content: string }[], tone: string }`
- 동작: Offering의 bizItemId로 DiscoveryReport 조회 → report_json + 발굴 산출물 추출 → 톤 기반 변환 → 섹션 content 업데이트
- 인증: tenant guard (orgId 검증)

**GET /offerings/:id/adapt/preview**
- 요청: query `tone=executive`
- 응답: 변환 프리뷰 (DB 저장 없이 변환 결과만 반환)
- 용도: UI에서 톤 변경 전 프리뷰

### 2-3. 서비스 설계

```typescript
// packages/api/src/services/content-adapter-service.ts

export type AdaptTone = 'executive' | 'technical' | 'critical';

export interface AdaptResult {
  sectionKey: string;
  title: string;
  content: string;
}

export class ContentAdapterService {
  constructor(private db: D1Database) {}

  /** DiscoveryReport에서 발굴 데이터 추출 → 톤 변환 → 섹션 콘텐츠 생성 */
  async adaptSections(
    orgId: string,
    offeringId: string,
    tone: AdaptTone,
    sectionKeys?: string[],
  ): Promise<AdaptResult[]>;

  /** 프리뷰 전용 — DB 저장 없이 변환 결과만 반환 */
  async previewAdapt(
    orgId: string,
    offeringId: string,
    tone: AdaptTone,
  ): Promise<AdaptResult[]>;
}
```

**톤 변환 로직 (섹션별 매핑)**:
- `exec_summary`: executive=핵심 수치+ROI 1문단, technical=기술 개요 2문단, critical=리스크 요약
- `s02` (사업기회): executive=시장규모+TAM, technical=기술 동향, critical=진입 장벽
- `s03` (제안 방향): executive=수익 모델, technical=아키텍처 상세, critical=대안 비교
- `s04` (추진 계획): executive=투자 대비 효과, technical=구현 로드맵, critical=이행 리스크
- 기타 섹션: 톤에 따라 강조 키워드 및 문체 조정

**데이터 소스 매핑 (DiscoveryReport → 섹션)**:
- `reportJson.stages` → 각 단계별 산출물 텍스트
- `ax_discovery_stages.output_text` → 발굴 단계별 분석 결과
- `persona_evaluations` → 전문가 평가 데이터
- `overall_verdict` / `team_decision` → 종합 판정

### 2-4. Zod 스키마

```typescript
// packages/api/src/schemas/content-adapter.schema.ts

export const AdaptToneEnum = z.enum(['executive', 'technical', 'critical']);

export const AdaptRequestSchema = z.object({
  tone: AdaptToneEnum,
  sectionKeys: z.array(z.string()).optional(),
});

export const AdaptPreviewQuerySchema = z.object({
  tone: AdaptToneEnum,
});

export interface AdaptResponse {
  adaptedSections: { sectionKey: string; title: string; content: string }[];
  tone: string;
  offeringId: string;
  sourceItemId: string;
}
```

### 2-5. Web UI

**ToneSelector 컴포넌트** (`packages/web/src/components/offerings/ToneSelector.tsx`):
- 3가지 톤 라디오 버튼 (아이콘 + 설명)
- 선택 시 preview API 호출 → TonePreview에 표시
- "적용" 버튼으로 adapt API 호출 → 실제 섹션 업데이트

**TonePreview 컴포넌트** (`packages/web/src/components/offerings/TonePreview.tsx`):
- 변환 결과 마크다운 렌더링
- 원본 vs 변환 diff 비교 (선택적)

---

## 3. F379 — discover → shape 파이프라인 설계

### 3-1. EventBus 이벤트 확장

기존 `TaskEventSource` 타입에 `'pipeline'` 소스를 추가하고, 파이프라인 전용 payload를 정의한다.

```typescript
// packages/shared/src/task-event.ts 확장

export type TaskEventSource = 'hook' | 'ci' | 'review' | 'discriminator' | 'sync' | 'manual' | 'pipeline';

export interface PipelineEventPayload {
  type: 'pipeline';
  action: 'discovery.completed' | 'offering.created' | 'offering.prefilled';
  itemId: string;
  offeringId?: string;
  details?: string;
}

// TaskEventPayload union에 PipelineEventPayload 추가
```

### 3-2. 파이프라인 서비스

```typescript
// packages/api/src/services/discovery-shape-pipeline-service.ts

export interface PipelineResult {
  offeringId: string;
  prefilledSections: number;
  totalSections: number;
  tone: AdaptTone;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

export class DiscoveryShapePipelineService {
  constructor(
    private db: D1Database,
    private eventBus: EventBus,
  ) {}

  /** 발굴 완료 이벤트 핸들러 등록 */
  registerHandlers(): void;

  /** 수동 트리거 — 특정 아이템의 Offering 생성 */
  async triggerPipeline(
    orgId: string,
    itemId: string,
    createdBy: string,
    tone?: AdaptTone,
  ): Promise<PipelineResult>;

  /** 파이프라인 상태 조회 */
  async getStatus(orgId: string, itemId: string): Promise<PipelineStatus>;
}
```

**파이프라인 흐름**:
```
1. EventBus: pipeline/discovery.completed 수신
   └─ payload: { itemId, orgId }
2. DiscoveryReport 조회 — teamDecision 확인
   └─ teamDecision !== 'Go' → skip (로그 기록)
3. 기존 Offering 존재 여부 확인
   └─ 이미 존재 → skip (중복 생성 방지)
4. OfferingService.create() → Offering + 21개 표준 섹션
5. DiscoveryReport reportJson → 섹션 매핑
   └─ stages 산출물 → 해당 섹션 content 프리필
6. ContentAdapterService.adaptSections(tone='executive') → 톤 적용
7. EventBus emit: pipeline/offering.prefilled
```

### 3-3. API 설계

**POST /pipeline/trigger**
- 요청: `{ itemId: string, tone?: AdaptTone }`
- 응답: `PipelineResult`
- 동작: 수동 파이프라인 트리거 (발굴 아이템 → Offering 생성)

**GET /pipeline/status**
- 요청: query `itemId=xxx`
- 응답: `{ status: 'idle' | 'processing' | 'completed' | 'failed', offering?: { id, title, prefilledCount } }`
- 동작: 특정 아이템의 파이프라인 상태 조회

**GET /pipeline/history**
- 요청: query `page=1&limit=10`
- 응답: `{ items: PipelineHistoryEntry[], total: number }`
- 동작: 파이프라인 실행 이력 (EventBus 이벤트 로그 기반)

### 3-4. Web UI

**PipelineStatus 컴포넌트** (`packages/web/src/components/pipeline/PipelineStatus.tsx`):
- 발굴→형상화 파이프라인 상태 표시 (idle/processing/completed/failed)
- Offering 생성 완료 시 링크 표시

---

## 4. 데이터 흐름도

```
┌─────────────────┐
│ DiscoveryReport │
│ (ax_discovery_   │
│  reports)        │
│ - report_json    │
│ - team_decision  │
└────────┬────────┘
         │ teamDecision='Go'
         ▼
┌──────────────────────┐    EventBus
│ Pipeline Service     │◄── pipeline/discovery.completed
│ (F379)               │
└────────┬─────────────┘
         │ create
         ▼
┌──────────────────────┐
│ Offering             │
│ - purpose='report'   │
│ - status='draft'     │
│ + 21 standard        │
│   sections           │
└────────┬─────────────┘
         │ prefill + adapt
         ▼
┌──────────────────────┐
│ Content Adapter      │
│ (F378)               │
│ - executive tone     │
│ - technical tone     │
│ - critical tone      │
└──────────────────────┘
```

---

## 5. 파일 매핑

### 5-1. 신규 파일

| # | 파일 | 유형 | F-item | LOC(예상) |
|---|------|------|--------|----------|
| 1 | `packages/api/src/services/content-adapter-service.ts` | 서비스 | F378 | ~150 |
| 2 | `packages/api/src/schemas/content-adapter.schema.ts` | 스키마 | F378 | ~40 |
| 3 | `packages/api/src/routes/content-adapter.ts` | 라우트 | F378 | ~80 |
| 4 | `packages/api/src/services/discovery-shape-pipeline-service.ts` | 서비스 | F379 | ~180 |
| 5 | `packages/api/src/schemas/pipeline.schema.ts` | 스키마 | F379 | ~35 |
| 6 | `packages/api/src/routes/discovery-shape-pipeline.ts` | 라우트 | F379 | ~70 |
| 7 | `packages/web/src/components/offerings/ToneSelector.tsx` | UI | F378 | ~80 |
| 8 | `packages/web/src/components/offerings/TonePreview.tsx` | UI | F378 | ~60 |
| 9 | `packages/web/src/components/pipeline/PipelineStatus.tsx` | UI | F379 | ~70 |

### 5-2. 수정 파일

| # | 파일 | 변경 내용 | F-item |
|---|------|----------|--------|
| 1 | `packages/shared/src/task-event.ts` | `'pipeline'` 소스 + PipelineEventPayload 추가 | F379 |
| 2 | `packages/api/src/app.ts` | contentAdapterRoute + discoveryShapePipelineRoute 등록 | F378, F379 |

### 5-3. 테스트 파일

| # | 파일 | 유형 | 범위 |
|---|------|------|------|
| 1 | `packages/api/src/__tests__/content-adapter-service.test.ts` | 단위 | 톤 변환 3종 + 섹션 매핑 |
| 2 | `packages/api/src/__tests__/content-adapter-route.test.ts` | 통합 | POST /adapt + GET /preview |
| 3 | `packages/api/src/__tests__/discovery-shape-pipeline-service.test.ts` | 단위 | 파이프라인 트리거 + 프리필 + 이벤트 |
| 4 | `packages/api/src/__tests__/discovery-shape-pipeline-route.test.ts` | 통합 | POST /trigger + GET /status |

---

## 6. 검증 기준

| # | 항목 | 기준 | F-item |
|---|------|------|--------|
| 1 | executive 톤 변환 | 섹션 content에 ROI/시장 수치 강조 문체 | F378 |
| 2 | technical 톤 변환 | 섹션 content에 아키텍처/기술 상세 문체 | F378 |
| 3 | critical 톤 변환 | 섹션 content에 리스크/한계/대안 문체 | F378 |
| 4 | adapt API 동작 | POST /offerings/:id/adapt → 200, 섹션 업데이트 | F378 |
| 5 | preview API 동작 | GET /offerings/:id/adapt/preview?tone=executive → 200 | F378 |
| 6 | ToneSelector UI | 3가지 톤 선택 + 프리뷰 표시 | F378 |
| 7 | discovery.completed 이벤트 발행 | EventBus에 pipeline/discovery.completed 발행 | F379 |
| 8 | 자동 Offering 생성 | teamDecision='Go' → Offering draft 자동 생성 | F379 |
| 9 | 섹션 프리필 | DiscoveryReport 데이터로 21개 섹션 중 해당 섹션 프리필 | F379 |
| 10 | 중복 방지 | 이미 Offering 존재 시 재생성 방지 | F379 |
| 11 | 수동 트리거 | POST /pipeline/trigger → Offering 생성 | F379 |
| 12 | 파이프라인 상태 | GET /pipeline/status?itemId=xxx → 상태 반환 | F379 |
| 13 | typecheck 통과 | turbo typecheck 에러 없음 | F378, F379 |
| 14 | 테스트 통과 | 전체 테스트 PASS | F378, F379 |
