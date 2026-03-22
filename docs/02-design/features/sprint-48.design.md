---
code: FX-DSGN-048
title: "Sprint 48 — ML 하이브리드 SR 분류기 + SR 대시보드 UI (F167+F168)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
feature: sprint-48
sprint: 48
phase: "Phase 5"
references:
  - "[[FX-PLAN-048]]"
  - "[[FX-SPEC-001]]"
---

## 1. 설계 개요

Sprint 48은 F167(ML 하이브리드 SR 분류기) + F168(SR 관리 대시보드 UI)를 2-Worker Agent Team으로 병렬 구현.

### 1.1 설계 원칙

1. **기존 서비스 래핑** — SrClassifier를 직접 수정하지 않고, HybridSrClassifier가 래핑하여 LLM 폴백 추가
2. **LLMService 재사용** — 기존 `LLMService`(Workers AI + Claude 폴백)를 활용, PromptGateway는 sanitization 목적이므로 분류에는 직접 LLM 호출
3. **대시보드 일관성** — 기존 tokens/analytics 페이지와 동일한 레이아웃/API 클라이언트 패턴 사용

---

## 2. F167 — HybridSrClassifier 상세 설계

### 2.1 서비스 구조

```
packages/api/src/services/
├── sr-classifier.ts             # 기존 — 변경 없음
├── sr-workflow-mapper.ts        # 기존 — 변경 없음
└── hybrid-sr-classifier.ts      # 신규 — 규칙+LLM 2-pass 분류기
```

### 2.2 HybridSrClassifier 인터페이스

```typescript
// packages/api/src/services/hybrid-sr-classifier.ts

import type { ClassificationResult, SrClassifier } from "./sr-classifier.js";
import type { LLMService } from "./llm.js";
import type { SrType } from "../schemas/sr.js";

export interface HybridClassificationResult extends ClassificationResult {
  method: "rule" | "llm" | "hybrid";
  llmConfidence?: number;
  ruleConfidence?: number;
}

export class HybridSrClassifier {
  private confidenceThreshold = 0.7;

  constructor(
    private ruleClassifier: SrClassifier,
    private llm: LLMService | null,
  ) {}

  async classify(title: string, description: string): Promise<HybridClassificationResult> {
    // Phase 1: 규칙 기반
    const ruleResult = this.ruleClassifier.classify(title, description);

    if (ruleResult.confidence >= this.confidenceThreshold || !this.llm) {
      return { ...ruleResult, method: "rule", ruleConfidence: ruleResult.confidence };
    }

    // Phase 2: LLM 폴백
    try {
      const llmResult = await this.classifyWithLlm(title, description);
      return this.mergeResults(ruleResult, llmResult);
    } catch {
      // LLM 실패 시 규칙 기반 결과 반환
      return { ...ruleResult, method: "rule", ruleConfidence: ruleResult.confidence };
    }
  }

  private async classifyWithLlm(title: string, description: string): Promise<{
    srType: SrType; confidence: number;
  }> {
    const systemPrompt = `You are an SR (Service Request) classifier for an IT operations team.
Classify the following SR into exactly one of these types:
- security_patch: security vulnerabilities, CVE patches
- bug_fix: bug reports, errors, crashes
- env_config: environment/infrastructure changes
- doc_update: documentation updates
- code_change: new features, code modifications

Respond in JSON: {"sr_type": "<type>", "confidence": <0.0-1.0>}`;

    const userPrompt = `Title: ${title}\nDescription: ${description}`;
    const response = await this.llm!.generate(systemPrompt, userPrompt);

    // JSON 파싱 (LLM 응답에서 추출)
    const json = this.extractJson(response.content);
    return {
      srType: this.validateSrType(json.sr_type),
      confidence: Math.min(Math.max(json.confidence ?? 0.5, 0), 1),
    };
  }

  private mergeResults(
    rule: ClassificationResult,
    llm: { srType: SrType; confidence: number },
  ): HybridClassificationResult {
    // 규칙과 LLM이 같은 유형이면 confidence 보정
    if (rule.srType === llm.srType) {
      const merged = rule.confidence * 0.4 + llm.confidence * 0.6;
      return {
        srType: llm.srType,
        confidence: Math.round(merged * 100) / 100,
        matchedKeywords: rule.matchedKeywords,
        suggestedWorkflow: rule.suggestedWorkflow,
        method: "hybrid",
        ruleConfidence: rule.confidence,
        llmConfidence: llm.confidence,
      };
    }

    // 다른 유형이면 confidence가 높은 쪽 선택
    if (llm.confidence > rule.confidence) {
      return {
        srType: llm.srType,
        confidence: llm.confidence,
        matchedKeywords: rule.matchedKeywords,
        suggestedWorkflow: `sr-${llm.srType.replace(/_/g, "-")}`,
        method: "llm",
        ruleConfidence: rule.confidence,
        llmConfidence: llm.confidence,
      };
    }

    return {
      ...rule,
      method: "rule",
      ruleConfidence: rule.confidence,
      llmConfidence: llm.confidence,
    };
  }

  private extractJson(content: string): { sr_type: string; confidence: number } {
    const match = content.match(/\{[^}]+\}/);
    if (!match) return { sr_type: "code_change", confidence: 0.5 };
    try { return JSON.parse(match[0]); }
    catch { return { sr_type: "code_change", confidence: 0.5 }; }
  }

  private validateSrType(type: string): SrType {
    const valid: SrType[] = ["code_change", "bug_fix", "env_config", "doc_update", "security_patch"];
    return valid.includes(type as SrType) ? (type as SrType) : "code_change";
  }
}
```

### 2.3 D1 마이그레이션 (0031)

```sql
-- 0031_sr_classification_feedback.sql — SR 분류 피드백 수집 (F167)

CREATE TABLE sr_classification_feedback (
  id TEXT PRIMARY KEY,
  sr_id TEXT NOT NULL,
  original_type TEXT NOT NULL,
  corrected_type TEXT NOT NULL,
  corrected_by TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sr_id) REFERENCES sr_requests(id)
);

CREATE INDEX idx_sr_feedback_sr_id ON sr_classification_feedback(sr_id);
CREATE INDEX idx_sr_feedback_types ON sr_classification_feedback(original_type, corrected_type);
```

### 2.4 SR Routes 확장

기존 `packages/api/src/routes/sr.ts`에 추가:

#### POST /api/sr — 변경

```typescript
// SrClassifier → HybridSrClassifier로 교체
const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
const hybridClassifier = new HybridSrClassifier(classifier, llm);
const result = await hybridClassifier.classify(title, description ?? "");
// 응답에 method 필드 추가
```

#### GET /api/sr/stats — 신규

```typescript
// 유형별 건수, 평균 confidence, 오분류율 집계
srRoute.get("/sr/stats", async (c) => {
  const orgId = c.get("orgId");

  // 유형별 건수 + 평균 confidence
  const typeStats = await c.env.DB.prepare(`
    SELECT sr_type, COUNT(*) as count, AVG(confidence) as avg_confidence
    FROM sr_requests WHERE org_id = ? GROUP BY sr_type
  `).bind(orgId).all();

  // 피드백(오분류) 건수
  const feedbackCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM sr_classification_feedback f
    JOIN sr_requests s ON f.sr_id = s.id WHERE s.org_id = ?
  `).bind(orgId).first<{ count: number }>();

  const totalSr = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM sr_requests WHERE org_id = ?"
  ).bind(orgId).first<{ count: number }>();

  return c.json({
    typeDistribution: typeStats.results,
    totalCount: totalSr?.count ?? 0,
    feedbackCount: feedbackCount?.count ?? 0,
    misclassificationRate: totalSr?.count
      ? Math.round(((feedbackCount?.count ?? 0) / totalSr.count) * 100) / 100
      : 0,
  });
});
```

#### POST /api/sr/:id/feedback — 신규

```typescript
srRoute.post("/sr/:id/feedback", async (c) => {
  const srId = c.req.param("id");
  const body = await c.req.json();
  const parsed = srFeedbackRequest.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request" }, 400);

  // SR 존재 확인
  const sr = await c.env.DB.prepare(
    "SELECT sr_type FROM sr_requests WHERE id = ?"
  ).bind(srId).first<{ sr_type: string }>();
  if (!sr) return c.json({ error: "SR not found" }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO sr_classification_feedback (id, sr_id, original_type, corrected_type, corrected_by, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, srId, sr.sr_type, parsed.data.corrected_type, parsed.data.corrected_by ?? null, parsed.data.reason ?? null).run();

  // SR 자체의 sr_type도 갱신
  await c.env.DB.prepare(
    "UPDATE sr_requests SET sr_type = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(parsed.data.corrected_type, srId).run();

  return c.json({ id, sr_id: srId, original_type: sr.sr_type, corrected_type: parsed.data.corrected_type }, 201);
});
```

#### GET /api/sr/:id/feedback — 신규

```typescript
srRoute.get("/sr/:id/feedback", async (c) => {
  const srId = c.req.param("id");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM sr_classification_feedback WHERE sr_id = ? ORDER BY created_at DESC"
  ).bind(srId).all();
  return c.json({ items: rows.results });
});
```

### 2.5 스키마 확장

```typescript
// packages/api/src/schemas/sr.ts에 추가

export const srFeedbackRequest = z.object({
  corrected_type: srTypeEnum,
  corrected_by: z.string().optional(),
  reason: z.string().max(1000).optional(),
});
export type SrFeedbackRequest = z.infer<typeof srFeedbackRequest>;

export interface SrStatsResponse {
  typeDistribution: Array<{ sr_type: string; count: number; avg_confidence: number }>;
  totalCount: number;
  feedbackCount: number;
  misclassificationRate: number;
}
```

---

## 3. F168 — SR 대시보드 UI 상세 설계

### 3.1 페이지 구조

```
packages/web/src/
├── app/(app)/sr/
│   ├── page.tsx                 # SR 목록 + 통계 카드
│   └── [id]/
│       └── page.tsx             # SR 상세 + 워크플로우 DAG + 피드백
├── components/feature/
│   ├── SrListTable.tsx          # SR 목록 테이블 (필터 + 페이지네이션)
│   ├── SrStatsCards.tsx         # 분류 통계 카드 3종
│   ├── SrWorkflowDag.tsx        # 워크플로우 DAG 시각화 (CSS Grid 기반)
│   └── SrFeedbackDialog.tsx     # 분류 수정 다이얼로그
```

### 3.2 Sidebar 메뉴 추가

```typescript
// packages/web/src/components/sidebar.tsx — fxNavItems 배열에 추가
import { ClipboardList } from "lucide-react";

const fxNavItems = [
  // ... 기존 항목
  { href: "/sr", label: "SR Management", icon: ClipboardList },
];
```

### 3.3 SR 목록 페이지 (`/sr`)

```
┌──────────────────────────────────────────────────┐
│  SR Management                                    │
├──────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌──────────────────────┐ │
│ │ Total   │ │ Avg     │ │ Misclassification    │ │
│ │ 42 SRs  │ │ Conf    │ │ Rate: 5.2%           │ │
│ │         │ │ 0.82    │ │ (2/42 feedback)      │ │
│ └─────────┘ └─────────┘ └──────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Filter: [Type ▼] [Status ▼] [Priority ▼]        │
├──────────────────────────────────────────────────┤
│ Title        │ Type       │ Conf  │ Status │ Date │
│ 보안 패치 요청│ security   │ 0.95  │ done   │ 3/22 │
│ API 버그 수정 │ bug_fix    │ 0.78  │ review │ 3/22 │
│ 설정 변경    │ env_config │ 0.62↓ │ open   │ 3/23 │
│              │  [LLM 폴백]│       │        │      │
└──────────────────────────────────────────────────┘
```

### 3.4 SR 상세 페이지 (`/sr/[id]`)

```
┌──────────────────────────────────────────────────┐
│  SR-abc123: 보안 패치 요청                         │
├──────────────────────────────────────────────────┤
│ Type: security_patch    Confidence: 0.95 (rule)  │
│ Keywords: [보안] [패치] [취약점]                    │
│ Status: done            Priority: high           │
│                                                   │
│ [분류 수정] 버튼 → SrFeedbackDialog               │
├──────────────────────────────────────────────────┤
│ Workflow: Security Patch (15min)                  │
│                                                   │
│ ┌──────────┐   ┌──────────┐   ┌──────────┐      │
│ │ Security │──→│ Test     │──→│ Reviewer │      │
│ │ Agent    │   │ Agent    │   │ Agent    │      │
│ │ ✅ done  │   │ ✅ done  │   │ ✅ done  │      │
│ └──────────┘   └──────────┘   └──────────┘      │
├──────────────────────────────────────────────────┤
│ Feedback History                                  │
│ (없음)                                            │
└──────────────────────────────────────────────────┘
```

### 3.5 SrWorkflowDag 컴포넌트 설계

CSS Grid 기반 간단한 DAG 시각화 (SVG 라이브러리 의존성 없음):

```typescript
interface SrWorkflowDagProps {
  nodes: Array<{
    id: string;
    label: string;
    type: "agent" | "condition" | "end";
    status?: "pending" | "running" | "done" | "failed";
    dependsOn?: string[];
  }>;
}

// 노드를 dependsOn 기준으로 레벨(열)에 배치
// 각 레벨은 CSS Grid 열, 노드 간 화살표는 CSS border/pseudo-element
```

### 3.6 SrFeedbackDialog 컴포넌트 설계

shadcn/ui Dialog + Select 사용:

```typescript
interface SrFeedbackDialogProps {
  srId: string;
  currentType: SrType;
  onSubmit: (feedback: { corrected_type: SrType; reason?: string }) => void;
}

// 1. Dialog open
// 2. Select로 올바른 유형 선택
// 3. reason(선택) 입력
// 4. POST /api/sr/:id/feedback 호출
// 5. 성공 시 SR 카드 갱신
```

### 3.7 API 클라이언트 확장

```typescript
// packages/web/src/lib/api-client.ts에 추가

export async function fetchSrList(params?: {
  status?: string; sr_type?: string; limit?: number; offset?: number;
}): Promise<{ items: SrResponse[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.sr_type) query.set("sr_type", params.sr_type);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  return fetchApi(`/sr?${query}`);
}

export async function fetchSrStats(): Promise<SrStatsResponse> {
  return fetchApi("/sr/stats");
}

export async function fetchSrDetail(id: string): Promise<SrDetailResponse> {
  return fetchApi(`/sr/${id}`);
}

export async function submitSrFeedback(
  srId: string, body: { corrected_type: string; reason?: string },
): Promise<{ id: string }> {
  return postApi(`/sr/${srId}/feedback`, body);
}
```

---

## 4. 구현 순서 (Worker별)

### Worker 1: F167 백엔드

| 순서 | 파일 | 작업 |
|:----:|------|------|
| 1 | `src/db/migrations/0031_sr_classification_feedback.sql` | D1 마이그레이션 |
| 2 | `src/schemas/sr.ts` | `srFeedbackRequest` + `SrStatsResponse` 타입 추가 |
| 3 | `src/services/hybrid-sr-classifier.ts` | HybridSrClassifier 클래스 (규칙+LLM 2-pass) |
| 4 | `src/routes/sr.ts` | POST /sr 전환 + GET /sr/stats + POST,GET /sr/:id/feedback |
| 5 | `src/__tests__/hybrid-sr-classifier.test.ts` | 단위 테스트 (~15건: rule, llm, hybrid, fallback) |
| 6 | `src/__tests__/sr-feedback.test.ts` | API 테스트 (~15건: stats, feedback CRUD, validation) |

### Worker 2: F168 프론트엔드

| 순서 | 파일 | 작업 |
|:----:|------|------|
| 1 | `src/components/sidebar.tsx` | SR Management 메뉴 항목 추가 |
| 2 | `src/lib/api-client.ts` | SR 전용 API 함수 4개 추가 |
| 3 | `src/components/feature/SrStatsCards.tsx` | 통계 카드 3종 (총 건수, 평균 confidence, 오분류율) |
| 4 | `src/components/feature/SrListTable.tsx` | SR 목록 테이블 + 필터 + 페이지네이션 |
| 5 | `src/app/(app)/sr/page.tsx` | SR 목록 페이지 (Stats + List 조합) |
| 6 | `src/components/feature/SrWorkflowDag.tsx` | 워크플로우 DAG 시각화 (CSS Grid) |
| 7 | `src/components/feature/SrFeedbackDialog.tsx` | 분류 수정 다이얼로그 |
| 8 | `src/app/(app)/sr/[id]/page.tsx` | SR 상세 페이지 (DAG + 피드백) |
| 9 | `src/__tests__/sr-dashboard.test.tsx` | 컴포넌트 테스트 (~10건) |

---

## 5. Worker 프롬프트 (Agent Team용)

### Worker 1 수정 허용 파일

```
packages/api/src/services/hybrid-sr-classifier.ts (신규)
packages/api/src/routes/sr.ts (수정)
packages/api/src/schemas/sr.ts (수정)
packages/api/src/db/migrations/0031_sr_classification_feedback.sql (신규)
packages/api/src/__tests__/hybrid-sr-classifier.test.ts (신규)
packages/api/src/__tests__/sr-feedback.test.ts (신규)
```

### Worker 2 수정 허용 파일

```
packages/web/src/app/(app)/sr/page.tsx (신규)
packages/web/src/app/(app)/sr/[id]/page.tsx (신규)
packages/web/src/components/feature/SrStatsCards.tsx (신규)
packages/web/src/components/feature/SrListTable.tsx (신규)
packages/web/src/components/feature/SrWorkflowDag.tsx (신규)
packages/web/src/components/feature/SrFeedbackDialog.tsx (신규)
packages/web/src/components/sidebar.tsx (수정: 메뉴 1줄 추가)
packages/web/src/lib/api-client.ts (수정: 함수 4개 추가)
packages/web/src/__tests__/sr-dashboard.test.tsx (신규)
```

---

## 6. 테스트 전략

### 6.1 API 테스트 (~30건)

| 카테고리 | 항목 | 건수 |
|----------|------|:----:|
| HybridSrClassifier 단위 | rule only (high confidence), llm fallback, hybrid merge, llm failure fallback, json parse error | 8 |
| POST /sr (hybrid) | 기존 규칙 분류 호환 + method 필드 포함 | 3 |
| GET /sr/stats | 빈 결과, 유형별 집계, 오분류율 계산 | 4 |
| POST /sr/:id/feedback | 정상, 존재하지 않는 SR, 유효하지 않은 type, SR type 갱신 확인 | 5 |
| GET /sr/:id/feedback | 빈 결과, 피드백 목록 | 2 |
| 통합 | SR 생성→피드백→stats 반영 전체 흐름 | 3 |
| LLM 응답 파싱 | 다양한 JSON 형식, 마크다운 래핑 | 5 |

### 6.2 Web 테스트 (~10건)

| 컴포넌트 | 항목 | 건수 |
|----------|------|:----:|
| SrStatsCards | 렌더링 + 수치 표시 | 2 |
| SrListTable | 렌더링 + 필터 동작 | 3 |
| SrWorkflowDag | 노드 렌더링 + 레벨 배치 | 2 |
| SrFeedbackDialog | 열기/닫기 + 유형 선택 | 2 |
| SR 페이지 | 통합 렌더링 | 1 |

---

## 7. 성공 기준 (검증 체크리스트)

| # | 항목 | 기준 |
|---|------|------|
| 1 | HybridSrClassifier confidence >= 0.7 → 규칙만 사용 | ✅ LLM 호출 없음 |
| 2 | confidence < 0.7 → LLM 폴백 → 결과 병합 | ✅ method="hybrid" |
| 3 | LLM 실패 시 규칙 결과 반환 (graceful degradation) | ✅ method="rule" |
| 4 | GET /sr/stats → 유형별 건수 + 오분류율 | ✅ JSON 응답 |
| 5 | POST /sr/:id/feedback → SR type 자동 갱신 | ✅ 201 응답 |
| 6 | SR 목록 페이지 렌더링 + 필터 | ✅ 데이터 표시 |
| 7 | SR 상세 + 워크플로우 DAG | ✅ 노드 시각화 |
| 8 | 피드백 다이얼로그 → API 호출 성공 | ✅ 유형 변경 반영 |
| 9 | API 테스트 ~30건 통과 | ✅ 전체 green |
| 10 | Web 테스트 ~10건 통과 | ✅ 전체 green |
| 11 | Sidebar에 SR Management 메뉴 표시 | ✅ 클릭 시 /sr 이동 |
| 12 | typecheck 0 errors | ✅ |
