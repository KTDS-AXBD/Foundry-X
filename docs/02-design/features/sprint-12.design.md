---
code: FX-DSGN-013
title: Sprint 12 (v0.12.0) — ouroboros 패턴 차용 + Generative UI 도입 Design
version: 0.1
status: Draft
category: DSGN
system-version: 0.12.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 12 Design Document

> **Plan Reference**: [[FX-PLAN-012]]
> **Scope**: F59 (ouroboros 패턴 차용) + F60 (Generative UI 도입)

---

## 1. F59: ouroboros 패턴 차용 — 상세 설계

### 1.1 Ambiguity Score 계산 모듈

#### 1.1.1 참조 문서 구조 (신규 파일)

**파일**: `~/.claude/skills/ax-14-req-interview/references/ambiguity-score.md`

```markdown
# Ambiguity Score 계산 기준 (ouroboros 차용)

## 공식
Ambiguity = 1 − Σ(clarityᵢ × weightᵢ)

## 차원별 채점 기준 (0.0 ~ 1.0)

### Goal Clarity (목표 명확도)
- 1.0: 구체적, 측정 가능, 기한 있음
- 0.7: 방향은 명확하나 측정 기준 부재
- 0.4: 모호한 표현 ("좋은", "빠른")
- 0.1: 목표 자체가 불명확

### Constraint Clarity (제약 명확도)
- 1.0: 기술적/비즈니스 제약이 명시적
- 0.7: 일부 제약만 파악
- 0.4: 암묵적 제약 존재
- 0.1: 제약 파악 안 됨

### Success Criteria (성공 기준 명확도)
- 1.0: AC가 테스트 가능 수준으로 구체적
- 0.7: AC 존재하나 일부 모호
- 0.4: "잘 동작하면" 수준
- 0.1: AC 없음

### Context Clarity (기존 프로젝트만, 맥락 명확도)
- 1.0: 코드베이스 분석 완료, 영향 범위 파악
- 0.7: 주요 모듈 파악, 세부 영향 미확인
- 0.4: 전체 구조만 파악
- 0.1: 코드베이스 미탐색

## 가중치

| Dimension | 신규 프로젝트 | 기존 프로젝트 |
|-----------|:-----------:|:-----------:|
| Goal      |    40%      |    35%      |
| Constraint|    30%      |    25%      |
| Success   |    30%      |    25%      |
| Context   |     —       |    15%      |

## 판정 기준
- Ambiguity ≤ 0.2 → Ready (Clarity ≥ 80%)
- 0.2 < Ambiguity ≤ 0.4 → 주의 (심화 질문 권장)
- Ambiguity > 0.4 → 미달 (인터뷰 재개 필수)
```

#### 1.1.2 ax-14-req-interview SKILL.md Phase 4 변경

**변경 범위**: Phase 4 "충분도 평가" 섹션 끝에 아래 블록 추가

```markdown
### Phase 4-B: Ambiguity Score 산출 (ouroboros 패턴)

기존 스코어카드와 별도로, PRD의 모호함 수준을 정량화한다.

1. `references/ambiguity-score.md`의 채점 기준을 참고한다
2. PRD 내용을 기반으로 각 차원의 clarity를 0.0~1.0으로 채점한다
3. 프로젝트 유형(신규/기존)에 맞는 가중치를 적용한다
4. Ambiguity = 1 − Σ(clarityᵢ × weightᵢ) 계산

출력 형식:
| Dimension | Clarity | Weight | Score |
|-----------|:-------:|:------:|:-----:|
| Goal      | 0.9     | 0.40   | 0.36  |
| Constraint| 0.8     | 0.30   | 0.24  |
| Success   | 0.7     | 0.30   | 0.21  |
| **Total** |         |        | **0.81** |
**Ambiguity = 1 − 0.81 = 0.19** → ✅ Ready

### Phase 4-C: 통합 판정

스코어카드(100점)와 Ambiguity Score를 결합하여 최종 판정:

| 스코어카드 | Ambiguity | 판정 |
|:---------:|:---------:|------|
| ≥ 80      | ≤ 0.2     | ✅ 착수 가능 |
| ≥ 80      | > 0.2     | ⚠️ Socratic 심화 질문 필요 |
| < 80      | any       | ❌ 추가 인터뷰 필요 |
```

#### 1.1.3 AmbiguityScore 타입 (선택적 코드 변경)

**파일**: `packages/shared/src/types.ts` (하단 추가)

```typescript
// ─── Sprint 12: Ambiguity Score (F59) ───

/** F59: ouroboros 차용 — 모호함 정량화 */
export interface AmbiguityDimension {
  name: 'goal' | 'constraint' | 'success' | 'context';
  clarity: number;  // 0.0 ~ 1.0
  weight: number;   // 0.0 ~ 1.0
}

export interface AmbiguityScore {
  dimensions: AmbiguityDimension[];
  totalClarity: number;  // Σ(clarity × weight)
  ambiguity: number;     // 1 − totalClarity
  ready: boolean;        // ambiguity ≤ 0.2
  projectType: 'greenfield' | 'brownfield';
}
```

### 1.2 Socratic Ontological Question — plan-plus 확장

> **⚠️ 의도적 미구현**: plan-plus는 bkit 플러그인 캐시(`~/.claude/plugins/cache/bkit-marketplace/`)에 위치하여 직접 수정 불가. 향후 bkit 업데이트 시 PR 제출 또는 프로젝트 로컬 스킬 오버라이드로 대응 예정.

#### 1.2.1 plan-plus SKILL.md 변경

**변경 범위**: "Intent Discovery" 단계와 "Alternatives" 단계 사이에 삽입

```markdown
### Phase 1.5: Ontological Question (ouroboros Double Diamond 차용)

Intent Discovery에서 파악한 기능 요청에 대해, "이것이 진짜 무엇인가?"를 묻는
존재론적 질문을 1~3개 생성한다.

**질문 생성 규칙**:
1. 핵심 명사를 추출한다 (예: "대시보드", "로그인", "리포트")
2. 각 명사에 대해 "What IS {noun}?" 형태의 질문을 생성한다
3. 답변에 따라 숨은 가정을 노출한다

**예시**:
- 요청: "사용자 인증 기능 추가"
  - Q: "이 시스템에서 '사용자'란 무엇인가? (사람? 에이전트? 둘 다?)"
  - Q: "'인증'의 범위는? (세션 유지? 권한 분리? API 키 관리?)"

AskUserQuestion으로 각 질문을 제시하고, 답변을 Alternatives 단계의 입력으로 활용한다.
```

### 1.3 3-stage Evaluation — gap-detector 확장

> **⚠️ 의도적 미구현**: gap-detector는 bkit 플러그인 에이전트로 캐시에 위치하여 직접 수정 불가. bkit 업데이트 시 PR 제출 또는 프로젝트 로컬 에이전트 오버라이드로 대응 예정.

#### 1.3.1 gap-detector 에이전트 프롬프트 확장

**변경 범위**: gap-detector 에이전트의 분석 결과 출력부에 Stage 2 섹션 추가

```markdown
## Stage 2: Semantic Verification (F59)

Stage 1(Mechanical)에서 "부분 일치"(50~89%) 판정된 항목에 대해
Semantic 검증을 수행한다.

**검증 방법**:
1. Design 문서의 해당 항목 설명을 읽는다
2. 구현 코드의 해당 부분을 읽는다
3. "설계 의도가 코드에 정확히 반영되었는가?" 판정한다

**판정 등급**:
- ✅ Semantically Correct: 의도 완전 반영
- ⚠️ Semantically Divergent: 동작은 하나 의도와 다름
- ❌ Semantically Missing: 핵심 의도 미반영

**결과 형식**:
| Item | Mechanical | Semantic | Final |
|------|:----------:|:--------:|:-----:|
| F59-A1 | 85% | ✅ Correct | 90% |
| F59-A2 | 70% | ⚠️ Divergent | 70% |
```

---

## 2. F60: Generative UI — 상세 설계

### 2.1 타입 설계

#### 2.1.1 UIHint 타입 (shared/agent.ts)

```typescript
// ─── Sprint 12: Generative UI Types (F60) ───

/** F60: 시각화 섹션 타입 */
export type SectionType =
  | 'text'      // 마크다운/텍스트
  | 'code'      // 코드 블록 (syntax highlight)
  | 'diff'      // 파일 diff 뷰
  | 'chart'     // 차트 데이터 (Chart.js 호환)
  | 'diagram'   // SVG 다이어그램
  | 'table'     // 정렬 가능 테이블
  | 'timeline'; // 타임라인 뷰

/** F60: UI 렌더링 힌트 */
export interface UIHint {
  layout: 'card' | 'tabs' | 'accordion' | 'flow' | 'iframe';
  sections: UISection[];
  html?: string;
  actions?: UIAction[];
}

export interface UISection {
  type: SectionType;
  title: string;
  data: unknown;
  interactive?: boolean;
}

export interface UIAction {
  type: 'approve' | 'reject' | 'edit' | 'expand';
  label: string;
  targetSection?: number;
}
```

#### 2.1.2 AgentExecutionResult 확장

```typescript
// 기존 (line 124-143)에서 output에 uiHint 추가
export interface AgentExecutionResult {
  status: 'success' | 'partial' | 'failed';
  output: {
    analysis?: string;
    generatedCode?: Array<{
      path: string;
      content: string;
      action: 'create' | 'modify';
    }>;
    reviewComments?: Array<{
      file: string;
      line: number;
      comment: string;
      severity: 'error' | 'warning' | 'info';
    }>;
    uiHint?: UIHint;  // F60 신규
  };
  tokensUsed: number;
  model: string;
  duration: number;
}
```

### 2.2 API 서버 — ClaudeApiRunner 확장

#### 2.2.1 시스템 프롬프트 확장

**파일**: `packages/api/src/services/claude-api-runner.ts`

각 taskType별 프롬프트 끝에 UIHint 생성 지시를 추가:

```typescript
const UIHINT_INSTRUCTION = `

Additionally, include a "uiHint" field in your JSON response to suggest how to render the result.
Format: {
  "layout": "card" | "tabs" | "accordion" | "iframe",
  "sections": [
    { "type": "text" | "code" | "diff" | "chart" | "table", "title": string, "data": any }
  ]
}
If the result contains numerical data or comparisons, use "chart" type with Chart.js-compatible data.
If the result is best shown as a diagram, include "html" field with self-contained HTML/SVG.`;

// 기존 TASK_SYSTEM_PROMPTS 각 항목에 UIHINT_INSTRUCTION 추가
const TASK_SYSTEM_PROMPTS: Record<AgentTaskType, string> = {
  "code-review": `...existing prompt...${UIHINT_INSTRUCTION}`,
  "spec-analysis": `...existing prompt...${UIHINT_INSTRUCTION}`,
  // etc.
};
```

#### 2.2.2 응답 파싱 확장

```typescript
// execute() 메서드 내 JSON 파싱 부분 (line 83-95)
try {
  const parsed = JSON.parse(text);
  return {
    status: "success",
    output: {
      analysis: parsed.analysis,
      generatedCode: parsed.generatedCode,
      reviewComments: parsed.reviewComments,
      uiHint: parsed.uiHint,  // F60: UIHint 추출
    },
    tokensUsed,
    model: this.model,
    duration: Date.now() - startTime,
  };
}
```

#### 2.2.3 Decision Matrix 상수

```typescript
// packages/api/src/services/claude-api-runner.ts 또는 별도 파일

/** F60: taskType별 기본 UIHint 레이아웃 매핑 */
export const DEFAULT_LAYOUT_MAP: Record<AgentTaskType, UIHint['layout']> = {
  'code-review': 'tabs',
  'code-generation': 'accordion',
  'spec-analysis': 'card',
  'test-generation': 'accordion',
};
```

#### 2.2.4 Zod 스키마 확장

**파일**: `packages/api/src/schemas/agent.ts`

```typescript
import { z } from "@hono/zod-openapi";

const uiSectionSchema = z.object({
  type: z.enum(["text", "code", "diff", "chart", "diagram", "table", "timeline"]),
  title: z.string(),
  data: z.unknown(),
  interactive: z.boolean().optional(),
});

const uiActionSchema = z.object({
  type: z.enum(["approve", "reject", "edit", "expand"]),
  label: z.string(),
  targetSection: z.number().optional(),
});

export const uiHintSchema = z.object({
  layout: z.enum(["card", "tabs", "accordion", "flow", "iframe"]),
  sections: z.array(uiSectionSchema),
  html: z.string().optional(),
  actions: z.array(uiActionSchema).optional(),
}).optional();

// 기존 executionResultSchema에 uiHint 추가
```

### 2.3 Web UI — 렌더링 컴포넌트

#### 2.3.1 WidgetRenderer (신규)

**파일**: `packages/web/src/components/feature/WidgetRenderer.tsx`

```typescript
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// OpenGenerativeUI 차용: sandboxed iframe + CSS 변수 + ResizeObserver

const THEME_CSS = `
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a1a;
  --color-border: rgba(0,0,0,0.15);
  --font-sans: system-ui, sans-serif;
  --font-mono: "SF Mono", monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a18;
    --color-text: #e8e6de;
    --color-border: rgba(255,255,255,0.15);
  }
}
body { margin: 0; padding: 16px; font-family: var(--font-sans);
       color: var(--color-text); background: var(--color-bg); }
`;

interface WidgetRendererProps {
  title: string;
  description: string;
  html: string;
  onAction?: (action: string, data: unknown) => void;
}

export function WidgetRenderer({ title, description, html, onAction }: WidgetRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  // iframe 내부 HTML 조합
  const srcDoc = `<!DOCTYPE html><html><head>
    <style>${THEME_CSS}</style>
    <script>
      new ResizeObserver(entries => {
        const h = entries[0].target.scrollHeight;
        parent.postMessage({ type: 'resize', height: h }, '*');
      }).observe(document.body);
      window.addEventListener('message', e => {
        if (e.data?.type === 'action') {
          parent.postMessage({ type: 'action', action: e.data.action, data: e.data.data }, '*');
        }
      });
    </script>
  </head><body>${html}</body></html>`;

  // postMessage 리스너
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'resize') setHeight(e.data.height + 16);
      if (e.data?.type === 'action') onAction?.(e.data.action, e.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onAction]);

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ width: '100%', height, border: 'none' }}
        title={title}
      />
    </div>
  );
}
```

#### 2.3.2 SectionRenderer (신규)

**파일**: `packages/web/src/components/feature/SectionRenderer.tsx`

```typescript
"use client";
import type { UISection } from "@/../../../shared/src/agent";

interface SectionRendererProps {
  section: UISection;
}

export function SectionRenderer({ section }: SectionRendererProps) {
  switch (section.type) {
    case 'text':
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs">
            {String(section.data)}
          </pre>
        </div>
      );

    case 'code':
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <pre className="max-h-48 overflow-auto rounded bg-zinc-900 p-3 text-xs text-green-400">
            {String(section.data)}
          </pre>
        </div>
      );

    case 'table': {
      const tableData = section.data as { headers: string[]; rows: unknown[][] };
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title}</h4>
          <table className="w-full text-xs">
            <thead>
              <tr>{tableData.headers?.map((h, i) => <th key={i} className="border-b p-1 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {tableData.rows?.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j} className="border-b p-1">{String(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return (
        <div>
          <h4 className="mb-1 text-xs font-medium">{section.title} ({section.type})</h4>
          <pre className="rounded bg-muted p-2 text-xs">{JSON.stringify(section.data, null, 2)}</pre>
        </div>
      );
  }
}
```

#### 2.3.3 DynamicRenderer (신규)

**파일**: `packages/web/src/components/feature/DynamicRenderer.tsx`

```typescript
"use client";
import type { UIHint } from "@/../../../shared/src/agent";
import { SectionRenderer } from "./SectionRenderer";
import { WidgetRenderer } from "./WidgetRenderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DynamicRendererProps {
  uiHint: UIHint;
  onAction?: (action: string, data: unknown) => void;
}

export function DynamicRenderer({ uiHint, onAction }: DynamicRendererProps) {
  // iframe 모드: html이 있으면 WidgetRenderer
  if (uiHint.layout === 'iframe' && uiHint.html) {
    return (
      <WidgetRenderer
        title={uiHint.sections[0]?.title ?? "Result"}
        description=""
        html={uiHint.html}
        onAction={onAction}
      />
    );
  }

  // tabs 모드
  if (uiHint.layout === 'tabs' && uiHint.sections.length > 1) {
    return (
      <Tabs defaultValue="0" className="w-full">
        <TabsList>
          {uiHint.sections.map((s, i) => (
            <TabsTrigger key={i} value={String(i)}>{s.title}</TabsTrigger>
          ))}
        </TabsList>
        {uiHint.sections.map((s, i) => (
          <TabsContent key={i} value={String(i)}>
            <SectionRenderer section={s} />
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  // card/accordion 기본 모드
  return (
    <div className="space-y-4">
      {uiHint.sections.map((s, i) => (
        <SectionRenderer key={i} section={s} />
      ))}
    </div>
  );
}
```

#### 2.3.4 AgentTaskResult 리팩토링

**파일**: `packages/web/src/components/feature/AgentTaskResult.tsx`

변경 전략: uiHint 존재 시 DynamicRenderer, 없으면 기존 레이아웃(LegacyRenderer)

```typescript
// 기존 코드를 LegacyContent 내부 함수로 래핑
// uiHint 분기 추가

import { DynamicRenderer } from "./DynamicRenderer";

export function AgentTaskResult({ result }: AgentTaskResultProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* 헤더: 상태 + 메타 — 공통 */}
        <div className="flex items-center justify-between">...</div>
        <div className="flex gap-4 text-xs">...</div>

        {/* F60: uiHint 분기 */}
        {result.output.uiHint ? (
          <DynamicRenderer uiHint={result.output.uiHint} />
        ) : (
          <>
            {/* 기존 3섹션: analysis, reviewComments, generatedCode */}
            {result.output.analysis && <div>...</div>}
            {result.output.reviewComments && ...}
            {result.output.generatedCode && ...}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2.4 테스트 설계

#### 2.4.1 F59 테스트 (3건)

| 파일 | 테스트 | 설명 |
|------|--------|------|
| `packages/shared/src/__tests__/types.test.ts` | AmbiguityScore 타입 검증 | greenfield/brownfield 가중치 합 = 1.0 |
| (동일) | ambiguity 계산 유틸 | clarity 입력 → ambiguity 출력 정확성 |
| (동일) | ready 판정 로직 | ≤0.2 → true, >0.2 → false |

#### 2.4.2 F60 Server 테스트 (7건)

| 파일 | 테스트 | 설명 |
|------|--------|------|
| `claude-api-runner.test.ts` | UIHINT_INSTRUCTION 포함 확인 | 각 프롬프트에 UIHint 지시 포함 |
| (동일) | uiHint 파싱 성공 | JSON에 uiHint가 있으면 추출 |
| (동일) | uiHint 없을 때 undefined | 하위 호환: 기존 응답도 정상 |
| (동일) | Decision Matrix 매핑 | taskType별 기본 layout 확인 |
| `agent.test.ts` | uiHint Zod 스키마 검증 | 유효/무효 입력 테스트 |
| (동일) | executionResult에 uiHint 포함 | API 응답에 uiHint 전달 |
| (동일) | MockRunner uiHint 없음 | Mock은 기존대로 uiHint 미반환 |

#### 2.4.3 F60 Client 테스트 (11건)

| 파일 | 테스트 | 설명 |
|------|--------|------|
| `WidgetRenderer.test.tsx` | iframe srcDoc 렌더링 | HTML이 iframe에 삽입됨 |
| (동일) | sandbox 속성 확인 | allow-scripts만, allow-same-origin 없음 |
| (동일) | ResizeObserver 높이 조정 | postMessage로 높이 갱신 |
| `SectionRenderer.test.tsx` | text 섹션 렌더링 | pre 태그에 데이터 표시 |
| (동일) | code 섹션 렌더링 | 구문 강조 스타일 적용 |
| (동일) | table 섹션 렌더링 | headers + rows 테이블 구성 |
| (동일) | unknown 타입 fallback | JSON.stringify 표시 |
| `DynamicRenderer.test.tsx` | tabs 레이아웃 | 2개 이상 섹션 → TabsList 렌더링 |
| (동일) | iframe 레이아웃 | html 있으면 WidgetRenderer 호출 |
| (동일) | card 기본 레이아웃 | 섹션 순차 렌더링 |
| `AgentTaskResult.test.tsx` | uiHint 없을 때 하위 호환 | 기존 3섹션 레이아웃 유지 |

---

## 3. Agent Teams 위임 상세

### 3.1 Worker 분할

```
┌─────────────────────────────────────────────────┐
│  W1 (F59 스킬)                                   │
│  · ax-14-req-interview/SKILL.md Phase 4 확장     │
│  · references/ambiguity-score.md 신규            │
│  · shared/types.ts AmbiguityScore 타입 추가       │
│  · types.test.ts 테스트 3건                       │
│  금지: packages/web/, packages/api/, cli/         │
├─────────────────────────────────────────────────┤
│  W2 (F60 Server)                                 │
│  · shared/agent.ts UIHint 타입 추가               │
│  · claude-api-runner.ts 프롬프트+파싱 확장         │
│  · schemas/agent.ts uiHint Zod 스키마             │
│  · execution-types.ts 내부 타입                    │
│  · claude-api-runner.test.ts + agent.test.ts 7건  │
│  금지: packages/web/, packages/cli/, ax 스킬       │
├─────────────────────────────────────────────────┤
│  Leader (F60 Client)                             │
│  · WidgetRenderer.tsx 신규                        │
│  · SectionRenderer.tsx 신규                       │
│  · DynamicRenderer.tsx 신규                       │
│  · AgentTaskResult.tsx 리팩토링                    │
│  · agents/page.tsx 통합                           │
│  · 테스트 11건                                    │
│  · SPEC 관리, 통합 검증                            │
└─────────────────────────────────────────────────┘
```

### 3.2 공유 의존성

| 파일 | W1 | W2 | Leader |
|------|:--:|:--:|:------:|
| `shared/agent.ts` | — | ✏️ UIHint | 📖 import |
| `shared/types.ts` | ✏️ AmbiguityScore | — | — |

**충돌 가능성**: W1은 `types.ts`, W2는 `agent.ts`를 수정하므로 파일 충돌 없음.

### 3.3 구현 순서

```
Phase 1 (병렬):
  W1: A1-A6 (F59 스킬 확장)
  W2: B1-B6 (F60 Server 타입+API)

Phase 2 (Leader, W1/W2 완료 후):
  Leader: C1-C6 (F60 Client 렌더링)

Phase 3 (Leader):
  통합 검증 + SPEC 갱신
```

---

## 4. 파일 변경 총괄

### 4.1 신규 파일 (5건)

| # | 파일 | 담당 | 라인 예상 |
|---|------|:----:|:--------:|
| 1 | `~/.claude/skills/ax-14-req-interview/references/ambiguity-score.md` | W1 | ~50 |
| 2 | `packages/web/src/components/feature/WidgetRenderer.tsx` | Leader | ~80 |
| 3 | `packages/web/src/components/feature/SectionRenderer.tsx` | Leader | ~70 |
| 4 | `packages/web/src/components/feature/DynamicRenderer.tsx` | Leader | ~60 |
| 5 | `packages/shared/src/__tests__/ambiguity.test.ts` | W1 | ~40 |

### 4.2 수정 파일 (9건)

| # | 파일 | 변경 내용 | 담당 |
|---|------|----------|:----:|
| 1 | `~/.claude/skills/ax-14-req-interview/SKILL.md` | Phase 4-B/C 추가 | W1 |
| 2 | bkit plan-plus SKILL.md | Ontological Question 단계 | W1 |
| 3 | bkit gap-detector agent.md | Stage 2 Semantic | W1 |
| 4 | `packages/shared/src/agent.ts` | UIHint 타입 추가 | W2 |
| 5 | `packages/shared/src/types.ts` | AmbiguityScore 타입 | W1 |
| 6 | `packages/api/src/services/claude-api-runner.ts` | 프롬프트+파싱 확장 | W2 |
| 7 | `packages/api/src/schemas/agent.ts` | uiHint Zod 스키마 | W2 |
| 8 | `packages/web/src/components/feature/AgentTaskResult.tsx` | uiHint 분기 리팩토링 | Leader |
| 9 | `packages/web/src/app/(app)/agents/page.tsx` | DynamicRenderer 통합 | Leader |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F59+F60 상세 설계 | Sinclair Seo |
| 0.2 | 2026-03-18 | 의도적 미구현 기록 — plan-plus/gap-detector는 bkit 캐시(읽기전용)로 직접 수정 불가. 향후 bkit 업데이트 또는 프로젝트 로컬 오버라이드로 대응 | Sinclair Seo |
