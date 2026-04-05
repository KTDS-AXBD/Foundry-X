# Sprint 155 — AI 멀티 페르소나 평가 UI + Claude SSE 엔진 Design

> **Plan**: `docs/01-plan/features/sprint-155.plan.md`
> **PRD**: `docs/specs/fx-discovery-ui-v2/prd-final.md` §8.2
> **Author**: Sinclair
> **Date**: 2026-04-05
> **Status**: Draft

---

## 1. Design Overview

Sprint 155는 AX BD 발굴 2-9 단계(멀티 페르소나 AI 평가)를 웹 UI로 구현한다.

**핵심 흐름:**
1. 사용자가 발굴 아이템 상세 페이지에서 "AI 평가 시작" 클릭
2. 8개 KT DS 역할 페르소나 카드 + 7축 가중치 설정 + 맥락 편집
3. "평가 실행" → SSE 스트리밍으로 8 페르소나 순차 평가 → 실시간 프로그레스
4. 결과: 종합 점수 + Go/Conditional/NoGo 판정 + Radar 차트 + 페르소나별 요약

---

## 2. Data Model

### 2.1 D1 마이그레이션

**0098_persona_configs.sql:**
```sql
CREATE TABLE IF NOT EXISTS ax_persona_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  weights TEXT NOT NULL DEFAULT '{}',
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);
CREATE INDEX idx_persona_configs_item ON ax_persona_configs(item_id);
```

**0099_persona_evals.sql:**
```sql
CREATE TABLE IF NOT EXISTS ax_persona_evals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  item_id TEXT NOT NULL REFERENCES ax_discovery_items(id),
  org_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  scores TEXT NOT NULL DEFAULT '{}',
  verdict TEXT NOT NULL DEFAULT 'pending',
  summary TEXT,
  concerns TEXT,
  condition TEXT,
  eval_metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(item_id, persona_id)
);
CREATE INDEX idx_persona_evals_item ON ax_persona_evals(item_id);
```

### 2.2 JSON 스키마

**weights (7축):**
```json
{
  "businessViability": 15,
  "strategicFit": 15,
  "customerValue": 15,
  "techMarket": 15,
  "execution": 15,
  "financialFeasibility": 15,
  "competitiveDiff": 10
}
```
합계 100. WeightSliderPanel이 자동보정.

**scores (7축 + scalability):**
```json
{
  "businessViability": 8.2,
  "strategicFit": 7.5,
  "customerValue": 9.0,
  "techMarket": 6.8,
  "execution": 7.0,
  "financialFeasibility": 6.5,
  "competitiveDiff": 8.0,
  "scalability": 7.2
}
```

**context_json:**
```json
{
  "situation": "KT DS AI 사업부에서 헬스케어 AI 진출 검토",
  "priorities": ["수익성", "기존 역량 활용"],
  "style": "보수적",
  "redLines": ["투자 5억 초과 불가"]
}
```

---

## 3. API Design

### 3.1 POST /api/ax-bd/persona-eval (SSE 스트리밍)

**Request Body:**
```json
{
  "itemId": "abc123",
  "configs": [
    {
      "personaId": "strategy",
      "weights": { "businessViability": 15, ... },
      "context": { "situation": "..." }
    }
  ],
  "briefing": "2-1~2-8 결과 요약 텍스트",
  "demoMode": false
}
```

**SSE Events:**
```
event: eval_start
data: {"personaId":"strategy","personaName":"전략기획팀장","index":0,"total":8}

event: eval_progress
data: {"personaId":"strategy","status":"evaluating","index":0}

event: eval_complete
data: {"personaId":"strategy","scores":{...},"verdict":"green","summary":"...","concerns":[...],"index":0}

event: eval_start
data: {"personaId":"sales","personaName":"영업총괄부장","index":1,"total":8}
...

event: final_result
data: {"verdict":"green","avgScore":7.8,"totalConcerns":3,"scores":[...],"warnings":[]}

event: done
data: {}
```

**데모 모드 (demoMode: true):**
- Claude API 호출 안 함
- 하드코딩된 `DEMO_EVAL_DATA` 반환
- 각 페르소나당 500ms 딜레이로 시뮬레이션

**라우트 구현 패턴:**
기존 `packages/api/src/routes/agent.ts` SSE 패턴 참조:
```typescript
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### 3.2 GET /api/ax-bd/persona-configs/:itemId

기존 설정 조회. 없으면 default 반환.

### 3.3 PUT /api/ax-bd/persona-configs/:itemId

가중치 + 맥락 일괄 저장 (upsert).

### 3.4 GET /api/ax-bd/persona-evals/:itemId

이전 평가 결과 조회.

---

## 4. Component Design

### 4.1 PersonaCardGrid (F344)

**파일**: `packages/web/src/components/feature/PersonaCardGrid.tsx`

```typescript
interface PersonaCardGridProps {
  personas: PersonaConfig[];
  onSelectPersona: (id: string) => void;
  selectedPersonaId?: string;
}
```

- 8개 카드 2×4 그리드 (`grid grid-cols-4 gap-4`)
- 각 카드: 이름, 역할, 관심 분야(focus), 현재 가중치 합
- 선택 시 ContextEditor와 연동
- `--discovery-purple` (#8b5cf6) 시맨틱 토큰

### 4.2 WeightSliderPanel (F344)

**파일**: `packages/web/src/components/feature/WeightSliderPanel.tsx`

```typescript
interface WeightSliderPanelProps {
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
}
```

- 7축 슬라이더 (range input, 0~100)
- 합계 100% 자동보정: 한 축을 올리면 나머지를 비례 감소
- 합계 표시 + 경고 (100이 아닐 때)

### 4.3 ContextEditor (F344)

**파���**: `packages/web/src/components/feature/ContextEditor.tsx`

```typescript
interface ContextEditorProps {
  personas: PersonaConfig[];
  selectedPersonaId: string;
  onUpdateContext: (personaId: string, context: PersonaContext) => void;
}
```

- 좌측: 페르소나 리스트 (선택 하이라이트)
- 우측: 4개 필드 폼 (situation, priorities, style, redLines)
- 각 페르소나별 독립 context

### 4.4 BriefingInput (F344)

**파일**: `packages/web/src/components/feature/BriefingInput.tsx`

```typescript
interface BriefingInputProps {
  itemId: string;
  briefing: string;
  onChange: (text: string) => void;
  onAutoGenerate: () => void;
}
```

- textarea with auto-resize
- "자동 생성" 버튼: 기존 2-1~2-8 output_json 기반 요약
- 수동 편집 가능

### 4.5 EvalProgress (F345)

**파일**: `packages/web/src/components/feature/EvalProgress.tsx`

```typescript
interface EvalProgressProps {
  evaluations: EvalStepStatus[];
  currentIndex: number;
  isRunning: boolean;
}
```

- 8단계 수평 프로그레스 바
- 각 단계: idle → evaluating (spinner) → complete (✓/✗)
- 실시간 SSE 이벤트와 연동
- 예상 소요 시간 표시

### 4.6 EvalResults (F345)

**파일**: `packages/web/src/components/feature/EvalResults.tsx`

```typescript
interface EvalResultsProps {
  result: EvaluationResult;
  personas: PersonaConfig[];
}
```

- **종합 점수 카드**: avgScore + verdict 배너 (green/keep/red → Go/Conditional/NoGo)
- **Radar 차트**: recharts `<RadarChart>` — 7축 + 8 페르소나 오버레이
- **페르소나별 요약**: 아코디언 — 이름, 점수, summary, concerns
- **전체 요약**: AI 생성 종합 인사이트

### 4.7 PersonaEvalPage (라우트)

**파일**: `packages/web/src/routes/ax-bd/persona-eval.tsx`

- URL: `/ax-bd/persona-eval/:itemId`
- 4단계 탭: 설정 → 브리핑 → 평가 → 결과
- Zustand store: `persona-eval-store.ts`

### 4.8 Zustand Store

**파일**: `packages/web/src/lib/stores/persona-eval-store.ts`

```typescript
interface PersonaEvalState {
  configs: PersonaConfig[];
  briefing: string;
  evaluations: EvalStepStatus[];
  result: EvaluationResult | null;
  isRunning: boolean;
  demoMode: boolean;
  // actions
  setConfigs: (configs: PersonaConfig[]) => void;
  updateWeight: (personaId: string, weights: Record<string, number>) => void;
  updateContext: (personaId: string, context: PersonaContext) => void;
  setBriefing: (text: string) => void;
  startEval: (itemId: string) => Promise<void>;
  setDemoMode: (demo: boolean) => void;
}
```

---

## 5. Implementation Details

### 5.1 파일 목록

| # | 파일 경로 | 유형 | 설명 |
|---|----------|------|------|
| 1 | `packages/api/src/db/migrations/0098_persona_configs.sql` | Migration | ax_persona_configs 테이블 |
| 2 | `packages/api/src/db/migrations/0099_persona_evals.sql` | Migration | ax_persona_evals 테이블 |
| 3 | `packages/api/src/schemas/persona-config.ts` | Schema | Zod 스키마 |
| 4 | `packages/api/src/schemas/persona-eval.ts` | Schema | Zod 스키마 + SSE 타입 |
| 5 | `packages/api/src/services/persona-config-service.ts` | Service | CRUD + upsert |
| 6 | `packages/api/src/services/persona-eval-service.ts` | Service | 평가 실행 + SSE 스트림 생성 |
| 7 | `packages/api/src/services/persona-eval-demo.ts` | Service | 데모 모드 하드코딩 데이터 |
| 8 | `packages/api/src/routes/ax-bd-persona-eval.ts` | Route | POST SSE + GET/PUT configs + GET evals |
| 9 | `packages/api/src/app.ts` | Modify | 라우트 등록 |
| 10 | `packages/web/src/components/feature/PersonaCardGrid.tsx` | Component | 8카드 그리드 |
| 11 | `packages/web/src/components/feature/WeightSliderPanel.tsx` | Component | 7축 슬라이더 |
| 12 | `packages/web/src/components/feature/ContextEditor.tsx` | Component | 맥락 편집 |
| 13 | `packages/web/src/components/feature/BriefingInput.tsx` | Component | 브리핑 입력 |
| 14 | `packages/web/src/components/feature/EvalProgress.tsx` | Component | SSE 프로그레스 |
| 15 | `packages/web/src/components/feature/EvalResults.tsx` | Component | 결과 + Radar |
| 16 | `packages/web/src/routes/ax-bd/persona-eval.tsx` | Route | 평가 페이지 |
| 17 | `packages/web/src/lib/stores/persona-eval-store.ts` | Store | Zustand 상태관리 |
| 18 | `packages/api/src/tests/persona-eval.test.ts` | Test | API 테스트 |

### 5.2 구현 순서

1. **D1 마이그레이션** (#1, #2)
2. **Zod 스키마** (#3, #4)
3. **API 서비스** (#5, #6, #7)
4. **API 라우트 + app.ts 등록** (#8, #9)
5. **recharts 설치** (`pnpm add recharts --filter web`)
6. **Zustand store** (#17)
7. **UI 컴포넌트 4종** (#10, #11, #12, #13) — 설정 단계
8. **UI 컴포넌트 2종** (#14, #15) — 평가+결과 단계
9. **라우트 페이지** (#16)
10. **API 테스트** (#18)
11. **typecheck + lint**

### 5.3 SSE 스트리밍 패턴

```typescript
// API 서비스 — ReadableStream 생성
function createEvalStream(
  itemId: string,
  configs: PersonaEvalConfig[],
  briefing: string,
  demoMode: boolean,
  db: D1Database,
  apiKey?: string,
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        send("eval_start", { personaId: config.personaId, personaName: config.personaName, index: i, total: configs.length });

        if (demoMode) {
          await new Promise(r => setTimeout(r, 500));
          send("eval_complete", { ...DEMO_EVAL_DATA[config.personaId], index: i });
        } else {
          // Claude API 호출 → 스코어 파싱 → DB 저장
          const result = await evaluatePersona(config, briefing, apiKey!, db, itemId);
          send("eval_complete", { ...result, index: i });
        }
      }

      // 종합 판정
      send("final_result", computeFinalVerdict(configs, itemId));
      send("done", {});
      controller.close();
    }
  });
}
```

### 5.4 Weight 자동보정 로직

```typescript
function rebalanceWeights(
  weights: Record<string, number>,
  changedKey: string,
  newValue: number,
): Record<string, number> {
  const keys = Object.keys(weights);
  const others = keys.filter(k => k !== changedKey);
  const oldOtherSum = others.reduce((s, k) => s + weights[k], 0);
  const targetOtherSum = 100 - newValue;

  if (oldOtherSum === 0) {
    // 균등 분배
    const each = Math.floor(targetOtherSum / others.length);
    const remainder = targetOtherSum - each * others.length;
    return Object.fromEntries([
      [changedKey, newValue],
      ...others.map((k, i) => [k, each + (i < remainder ? 1 : 0)]),
    ]);
  }

  // 비례 조정
  const result: Record<string, number> = { [changedKey]: newValue };
  let sum = newValue;
  for (const k of others) {
    const ratio = weights[k] / oldOtherSum;
    const val = Math.round(ratio * targetOtherSum);
    result[k] = val;
    sum += val;
  }
  // 반올림 오차 보정
  const diff = 100 - sum;
  if (diff !== 0 && others.length > 0) {
    result[others[0]] += diff;
  }
  return result;
}
```

### 5.5 데모 모드 데이터

```typescript
// persona-eval-demo.ts
export const DEMO_EVAL_DATA: Record<string, DemoEvalResult> = {
  strategy: {
    personaId: "strategy",
    scores: { businessViability: 8.5, strategicFit: 9.0, customerValue: 7.5, techMarket: 8.0, execution: 7.0, financialFeasibility: 7.5, competitiveDiff: 8.5, scalability: 8.0 },
    verdict: "green",
    summary: "KT DS 중장기 전략 방향과 높은 정합성. AI 헬스케어는 성장 시장이며 기존 SI 역량 활용 가능.",
    concerns: ["시장 진입 타이밍이 경쟁사 대비 다소 늦을 수 있음"],
  },
  // ... (나머지 7개 페르소나)
};

export const DEMO_FINAL_RESULT: EvaluationResult = {
  verdict: "green",
  avgScore: 7.8,
  totalConcerns: 5,
  scores: Object.values(DEMO_EVAL_DATA),
  warnings: [],
};
```

---

## 6. Verification Criteria

### 6.1 Gap Analysis 체크리스트

| # | 항목 | 검증 방법 | 상태 |
|---|------|----------|------|
| G-01 | ax_persona_configs 테이블 생성 | migration 파일 존재 | ⬜ |
| G-02 | ax_persona_evals 테이블 생성 | migration 파일 존재 | ⬜ |
| G-03 | PersonaConfigService CRUD | 서비스 파일 + 메서드 존재 | ⬜ |
| G-04 | PersonaEvalService 평가 실행 | 서비스 파일 + createEvalStream 메서드 | ⬜ |
| G-05 | POST /ax-bd/persona-eval SSE 라우트 | 라우트 파일 + text/event-stream 헤더 | ⬜ |
| G-06 | GET /ax-bd/persona-configs/:itemId | 라우트 파일 | ⬜ |
| G-07 | PUT /ax-bd/persona-configs/:itemId | 라우트 파일 | ⬜ |
| G-08 | GET /ax-bd/persona-evals/:itemId | ���우트 파일 | ⬜ |
| G-09 | app.ts에 라우트 등록 | import + app.route 존재 | ⬜ |
| G-10 | Zod 스키마 2종 | schemas/persona-config.ts + persona-eval.ts | ⬜ |
| G-11 | PersonaCardGrid 컴포넌트 | 파일 존재 + 8카드 렌더링 | ⬜ |
| G-12 | WeightSliderPanel 컴포넌트 | 파일 존재 + 7축 슬라이더 | ⬜ |
| G-13 | ContextEditor 컴포넌트 | 파일 존재 + 4필드 폼 | ⬜ |
| G-14 | BriefingInput 컴포넌트 | 파일 존재 + textarea | ⬜ |
| G-15 | EvalProgress 컴포넌트 | 파일 존재 + 8단계 프로그레스 | ⬜ |
| G-16 | EvalResults 컴포넌트 | 파일 존재 + RadarChart 사용 | ⬜ |
| G-17 | persona-eval.tsx 라우트 페이지 | 파일 존재 + 4단계 탭 | ⬜ |
| G-18 | persona-eval-store.ts Zustand | 파일 존재 + startEval 메서드 | ⬜ |
| G-19 | 데모 모드 데이터 | persona-eval-demo.ts 파일 존재 | ⬜ |
| G-20 | recharts 의존성 | web/package.json에 recharts 존재 | ⬜ |
| G-21 | API 테스트 | persona-eval.test.ts 존재 | ⬜ |
| G-22 | typecheck 통과 | turbo typecheck 에러 0 | ⬜ |
| G-23 | lint 통과 | turbo lint 에러 0 | ⬜ |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-05 | Initial design | Sinclair |
