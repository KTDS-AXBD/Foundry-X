---
code: FX-DSGN-S173
title: "Sprint 173 — 디자인 토큰 에디터 + Prototype 연동"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 173
f_items: [F381, F382]
phase: "18-E"
plan_ref: "[[FX-PLAN-S173]]"
---

# Sprint 173 Design — 디자인 토큰 에디터 + Prototype 연동

## 1. 개요

Phase 18-E (Offering Pipeline Polish) 마지막 기능 구현. 디자인 토큰을 JSON 정규 포맷으로 승격하고 실시간 에디터를 제공하며(F381), Offering에서 Prototype Builder를 자동 호출하는 연동 레이어를 추가한다(F382).

---

## 2. F381 — 디자인 토큰 Phase 2+3

### 2-1. JSON 정규 포맷 (Phase 2)

**Zod 스키마** (`packages/api/src/schemas/design-token.schema.ts`):

```typescript
import { z } from "zod";

export const TokenCategory = z.enum(["color", "typography", "layout", "spacing"]);
export type TokenCategory = z.infer<typeof TokenCategory>;

export const DesignTokenSchema = z.object({
  tokenKey: z.string().min(1).max(100),
  tokenValue: z.string().min(1).max(500),
  tokenCategory: TokenCategory,
});

export const BulkUpdateTokensSchema = z.object({
  tokens: z.array(DesignTokenSchema).min(1).max(200),
});

export type DesignToken = z.infer<typeof DesignTokenSchema>;
export type BulkUpdateTokensInput = z.infer<typeof BulkUpdateTokensSchema>;

// JSON 정규 포맷: 카테고리별 그룹
export interface DesignTokenJson {
  color: Record<string, string>;
  typography: Record<string, string>;
  layout: Record<string, string>;
  spacing: Record<string, string>;
}
```

### 2-2. API 엔드포인트

**서비스** (`packages/api/src/services/design-token-service.ts`):

| 메서드 | 설명 |
|--------|------|
| `list(offeringId)` | offering_design_tokens에서 전체 조회 |
| `getAsJson(offeringId)` | 카테고리별 그룹화된 JSON 반환 |
| `bulkUpsert(offeringId, tokens)` | UPSERT (token_key 기준 중복 시 업데이트) |
| `resetToDefaults(offeringId)` | design-tokens.md 기반 기본값으로 리셋 |

**라우트** (`packages/api/src/routes/design-tokens.ts`):

| Method | Path | 설명 |
|--------|------|------|
| GET | `/offerings/:id/tokens` | 토큰 목록 (flat) |
| GET | `/offerings/:id/tokens/json` | JSON 정규 포맷 (카테고리별) |
| PUT | `/offerings/:id/tokens` | 일괄 갱신 (BulkUpdateTokensSchema) |
| POST | `/offerings/:id/tokens/reset` | 기본값 리셋 |

### 2-3. Web 실시간 에디터 (Phase 3)

**DesignTokenEditor** (`packages/web/src/components/feature/DesignTokenEditor.tsx`):

| 영역 | 구현 |
|------|------|
| Color 탭 | ColorPicker (input[type=color]) + hex input |
| Typography 탭 | font-size input (px) + weight select |
| Layout 탭 | maxWidth/padding input (px) |
| Spacing 탭 | gap/margin input (px) |
| 저장 | PUT /offerings/:id/tokens → 성공 토스트 |
| 리셋 | POST /offerings/:id/tokens/reset → 확인 다이얼로그 |

**DesignTokenPreview** (`packages/web/src/components/feature/DesignTokenPreview.tsx`):

- 기존 offering HTML export를 iframe srcDoc으로 렌더링
- 토큰 변경 시 `iframeRef.contentDocument.documentElement.style.setProperty()` 직접 호출
- debounce 200ms로 과도한 업데이트 방지
- postMessage 불필요 — 같은 origin blob URL 사용

**offering-tokens.tsx** (`packages/web/src/routes/offering-tokens.tsx`):
- `/offerings/:id/tokens` 라우트
- 좌=DesignTokenEditor, 우=DesignTokenPreview (offering-editor.tsx와 동일한 좌우 분할 레이아웃)
- offering-editor.tsx의 "디자인 토큰" 탭/버튼에서 링크 연결

### 2-4. 라우터 등록

`packages/web/src/router.tsx`에 추가:
```typescript
{ path: "offerings/:id/tokens", lazy: () => import("./routes/offering-tokens") }
```

---

## 3. F382 — Prototype Builder 연동

### 3-1. Offering → Prototype 변환 서비스

**offering-prototype-service.ts** (`packages/api/src/services/offering-prototype-service.ts`):

```typescript
export class OfferingPrototypeService {
  constructor(private db: D1Database, private runner: AgentRunner | null) {}

  async generateFromOffering(orgId: string, offeringId: string): Promise<PrototypeResult> {
    // 1. Offering + BizItem + Sections 조회
    // 2. PrototypeGenerationInput 형식으로 변환
    // 3. PrototypeGeneratorService.generate() 호출
    // 4. offering_id → prototype 매핑 저장 (offering_prototypes 테이블)
  }

  async getLinkedPrototypes(offeringId: string): Promise<PrototypeResult[]> {
    // offering_prototypes 조인 → prototypes 조회
  }
}
```

**변환 전략**: Offering의 sections를 PrototypeGenerationInput의 각 필드에 매핑:
- `executive_summary` → problemStatement
- `market_analysis` → trendReport.marketSummary
- `product_overview` → features
- `value_proposition` → tagline + solutionOverview
- `competitive_analysis` → competitors

### 3-2. D1 마이그레이션

신규 매핑 테이블 (`packages/api/src/db/migrations/0114_offering_prototypes.sql`):

```sql
-- F382: Offering → Prototype 연동 (Sprint 173)
CREATE TABLE IF NOT EXISTS offering_prototypes (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  prototype_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, prototype_id),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE,
  FOREIGN KEY (prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_prototypes_offering ON offering_prototypes(offering_id);
```

### 3-3. API 엔드포인트

**라우트** (`packages/api/src/routes/offering-prototype.ts`):

| Method | Path | 설명 |
|--------|------|------|
| POST | `/offerings/:id/prototype` | Offering→Prototype 생성 |
| GET | `/offerings/:id/prototypes` | 연동된 Prototype 목록 |

### 3-4. Web — Prototype 연동 패널

**OfferingPrototypePanel** (`packages/web/src/components/feature/OfferingPrototypePanel.tsx`):

- offering-editor.tsx 하단에 배치
- "프로토타입 생성" 버튼 → POST /offerings/:id/prototype
- 생성된 prototype 목록 표시 (카드: 버전, 생성일, 프리뷰 링크)
- 프로토타입 상세 페이지 링크 (`/prototype/${prototypeId}`)

---

## 4. app.ts 라우트 등록

```typescript
// Sprint 173: Design Token Editor + Offering→Prototype (F381, F382, Phase 18)
import { designTokensRoute } from "./routes/design-tokens.js";
import { offeringPrototypeRoute } from "./routes/offering-prototype.js";

// ... (인증 미들웨어 이후)
app.route("/api", designTokensRoute);
app.route("/api", offeringPrototypeRoute);
```

---

## 5. Worker 파일 매핑

### Worker 1: F381 — 디자인 토큰 API + Web
**수정 허용 파일:**
1. `packages/api/src/schemas/design-token.schema.ts` (신규)
2. `packages/api/src/services/design-token-service.ts` (신규)
3. `packages/api/src/routes/design-tokens.ts` (신규)
4. `packages/api/src/__tests__/design-tokens.test.ts` (신규)
5. `packages/web/src/components/feature/DesignTokenEditor.tsx` (신규)
6. `packages/web/src/components/feature/DesignTokenPreview.tsx` (신규)
7. `packages/web/src/routes/offering-tokens.tsx` (신규)
8. `packages/api/src/app.ts` (수정 — import + route 등록)
9. `packages/web/src/router.tsx` (수정 — 라우트 추가)

### Worker 2: F382 — Prototype 연동
**수정 허용 파일:**
1. `packages/api/src/services/offering-prototype-service.ts` (신규)
2. `packages/api/src/routes/offering-prototype.ts` (신규)
3. `packages/api/src/db/migrations/0114_offering_prototypes.sql` (신규)
4. `packages/api/src/__tests__/offering-prototype.test.ts` (신규)
5. `packages/web/src/components/feature/OfferingPrototypePanel.tsx` (신규)
6. `packages/api/src/app.ts` (수정 — import + route 등록)
7. `packages/web/src/routes/offering-editor.tsx` (수정 — Panel 추가)
8. `packages/api/src/__tests__/helpers/mock-d1.ts` (수정 — offering_prototypes 테이블 추가)

---

## 6. 검증 매트릭스

| # | 검증 항목 | 파일 | 기대 결과 |
|---|-----------|------|-----------|
| V1 | GET /offerings/:id/tokens — 토큰 목록 | design-tokens.test.ts | 200 + array |
| V2 | GET /offerings/:id/tokens/json — JSON 정규 포맷 | design-tokens.test.ts | 200 + {color,typography,layout,spacing} |
| V3 | PUT /offerings/:id/tokens — 일괄 갱신 | design-tokens.test.ts | 200 + upserted count |
| V4 | POST /offerings/:id/tokens/reset — 리셋 | design-tokens.test.ts | 200 + default tokens |
| V5 | PUT 검증 실패 (빈 배열) | design-tokens.test.ts | 400 |
| V6 | DesignTokenEditor 렌더링 | offering-tokens.tsx | 4 카테고리 탭 표시 |
| V7 | DesignTokenPreview iframe 반영 | offering-tokens.tsx | CSS variable 변경 |
| V8 | POST /offerings/:id/prototype — 생성 | offering-prototype.test.ts | 201 + prototype id |
| V9 | GET /offerings/:id/prototypes — 목록 | offering-prototype.test.ts | 200 + array |
| V10 | 존재하지 않는 offering → 404 | 양쪽 test | 404 |
| V11 | OfferingPrototypePanel 렌더링 | offering-editor.tsx | 생성 버튼 + 목록 |
| V12 | typecheck 통과 | turbo typecheck | 0 errors |
| V13 | lint 통과 | turbo lint | 0 errors |

---

## 7. API Client 확장

`packages/web/src/lib/api-client.ts`에 추가:

```typescript
// F381: Design Token API
export async function fetchDesignTokens(offeringId: string) { ... }
export async function fetchDesignTokensJson(offeringId: string) { ... }
export async function updateDesignTokens(offeringId: string, tokens: DesignToken[]) { ... }
export async function resetDesignTokens(offeringId: string) { ... }

// F382: Offering Prototype API
export async function generateOfferingPrototype(offeringId: string) { ... }
export async function fetchOfferingPrototypes(offeringId: string) { ... }
```

---

## 8. 참조

- Plan: `[[FX-PLAN-S173]]`
- PRD: `docs/specs/fx-offering-pipeline/prd-final.md` §2-5, §6 R4
- 디자인 토큰 Phase 1: `.claude/skills/ax-bd/shape/offering-html/design-tokens.md`
- Offering Export Service: `packages/api/src/services/offering-export-service.ts`
- Prototype Generator: `packages/api/src/services/prototype-generator.ts`
- Offering Editor: `packages/web/src/routes/offering-editor.tsx`
