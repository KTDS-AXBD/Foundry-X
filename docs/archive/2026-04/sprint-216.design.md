---
code: FX-DSGN-216
title: Sprint 216 Design — 사업기획서 내보내기 강화 (F446)
version: 1.0
status: Draft
category: DSGN
system-version: Sprint 216
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 216 Design — 사업기획서 내보내기 강화

## 1. 범위

- **F446**: 사업기획서 PDF/PPTX 내보내기 + 디자인 토큰 적용

## 2. 데이터 모델

### 2.1 신규 마이그레이션 없음

Sprint 215에서 이미 생성된 테이블을 읽기 전용으로 활용한다.

| 테이블 | 읽기 방식 |
|--------|----------|
| `business_plan_drafts` | `biz_item_id` 기준 최신 버전 1건 |
| `business_plan_sections` | `draft_id` 기준 전체 섹션 (section_num ASC) |
| `plan_templates` | `id` 또는 `template_type` 기준 디자인 토큰 조회 |

> **디자인 토큰 전략**: 별도 `bp_design_tokens` 테이블 대신, `plan_templates.sections_json`에 토큰 팔레트를 포함하거나 코드 내 기본 팔레트 3종을 정의한다.

### 2.2 디자인 토큰 기본 팔레트

```typescript
// BusinessPlanDesignConfig (pptx-renderer의 PptxDesignConfig 구조 재활용)
const BP_PALETTES: Record<string, BpDesignConfig> = {
  internal:  { bgColor: '#FFFFFF', primaryColor: '#1D4ED8', textColor: '#1F2937', ... },
  proposal:  { bgColor: '#F8FAFC', primaryColor: '#0F766E', textColor: '#0F172A', ... },
  'ir-pitch': { bgColor: '#0F172A', primaryColor: '#7C3AED', textColor: '#F1F5F9', ... },
};
```

## 3. API 설계

### 3.1 신규 엔드포인트

| Method | Path | 역할 |
|--------|------|------|
| `GET` | `/api/biz-items/:id/business-plan/export` | 쿼리 `?format=html\|pptx` 기반 내보내기 |

### 3.2 쿼리 파라미터 스키마

```typescript
// packages/api/src/core/offering/schemas/business-plan-export.schema.ts
import { z } from "zod";

export const BpExportQuerySchema = z.object({
  format: z.enum(["html", "pptx"]).default("html"),
});
```

### 3.3 응답 형식

| format | Content-Type | Body |
|--------|-------------|------|
| `html` | `text/html` | CSS 변수 포함 완전한 HTML 문서 |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | 첨부파일 바이너리 |

### 3.4 에러 케이스

| 상황 | HTTP |
|------|------|
| biz_item_id 없음 / 다른 org | 404 |
| 기획서 draft 없음 | 404 `"사업기획서가 없어요"` |
| format 값 오류 | 400 |

## 4. 서비스 설계

### 4.1 BusinessPlanExportService

**파일**: `packages/api/src/core/offering/services/business-plan-export-service.ts`

```typescript
export class BusinessPlanExportService {
  constructor(private db: D1Database) {}

  // 최신 draft + 섹션 + 팔레트 조합
  private async getBpData(bizItemId: string): Promise<BpData | null>

  // HTML 내보내기 (CSS 변수 + 섹션 마크다운)
  async exportHtml(bizItemId: string): Promise<string | null>

  // PPTX 내보내기 (섹션 → 슬라이드)
  async exportPptx(bizItemId: string): Promise<Uint8Array | null>
}
```

### 4.2 데이터 조회 쿼리

```sql
-- 최신 draft
SELECT * FROM business_plan_drafts
WHERE biz_item_id = ? ORDER BY version DESC LIMIT 1;

-- 최신 draft의 섹션
SELECT * FROM business_plan_sections
WHERE draft_id = ? ORDER BY section_num ASC;
```

### 4.3 PPTX 슬라이드 매핑

- 섹션 1개 → 슬라이드 1장
- 제목: `section.title` (BP_SECTIONS[sectionNum].title)
- 본문: `section.content` (최대 600자 truncate + "..." suffix)
- 디자인: `BP_PALETTES[templateType]` 기본값, 없으면 `internal` 팔레트

### 4.4 HTML 렌더링

`offering-export-service.ts::renderHtml()` 구조를 그대로 채택:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <style>
    :root {
      --primary-color: {{token}};
      /* 팔레트 CSS 변수 */
    }
    /* 섹션 스타일 */
  </style>
</head>
<body>
  <h1>{{draft.title}}</h1>
  {{#each sections}}
  <section class="bp-section">
    <h2>{{section.title}}</h2>
    <div class="bp-content">{{section.content}}</div>
  </section>
  {{/each}}
</body>
</html>
```

## 5. Worker 파일 매핑

| Worker | 담당 파일 | 작업 |
|--------|----------|------|
| Worker A | `packages/api/src/core/offering/services/business-plan-export-service.ts` | 신규 생성 |
| Worker A | `packages/api/src/core/offering/schemas/business-plan-export.schema.ts` | 신규 생성 |
| Worker A | `packages/api/src/core/offering/routes/business-plan-export.ts` | 신규 생성 |
| Worker A | `packages/api/src/app.ts` | 라우트 마운트 추가 |
| Worker A | `packages/api/src/__tests__/business-plan-export.test.ts` | 신규 생성 |
| Worker B | `packages/web/src/components/feature/discovery/BusinessPlanViewer.tsx` | 내보내기 버튼 추가 |
| Worker B | `packages/web/src/lib/api-client.ts` | `exportBusinessPlan()` 함수 추가 |

## 6. 프론트엔드 설계

### 6.1 BusinessPlanViewer 확장

```tsx
// 기존 우측 상단 버튼 영역에 추가
<div className="export-actions">
  <Button variant="outline" size="sm" onClick={handleHtmlExport}>
    PDF 내보내기
  </Button>
  <Button variant="outline" size="sm" onClick={handlePptxExport} disabled={isExporting}>
    {isExporting ? "변환 중..." : "PPTX 내보내기"}
  </Button>
</div>
```

### 6.2 다운로드 처리 패턴 (PPTX)

```typescript
const handlePptxExport = async () => {
  setIsExporting(true);
  try {
    const blob = await exportBusinessPlanPptx(bizItemId); // GET /export?format=pptx → blob
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-plan-${bizItemId}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setIsExporting(false);
  }
};
```

### 6.3 PDF 내보내기 전략

- 별도 서버 변환 없이 **HTML 새탭 열기 → 브라우저 인쇄(Ctrl+P)**
- `window.open(`/api/biz-items/${bizItemId}/business-plan/export?format=html`, '_blank')`

### 6.4 API 클라이언트 함수

```typescript
// packages/web/src/lib/api-client.ts 추가
export async function exportBusinessPlanPptx(bizItemId: string): Promise<Blob> {
  const res = await apiFetch(`/biz-items/${bizItemId}/business-plan/export?format=pptx`);
  if (!res.ok) throw new Error("PPTX 내보내기 실패");
  return res.blob();
}
```

## 7. 테스트 계획

### 7.1 API 테스트 (`business-plan-export.test.ts`)

| 케이스 | 기대 결과 |
|--------|---------|
| `GET /export?format=html` (정상) | 200, `text/html`, `<html` 포함 |
| `GET /export?format=pptx` (정상) | 200, `.pptx` Content-Type, 바이너리 > 0 bytes |
| `GET /export?format=html` (draft 없음) | 404 |
| `GET /export?format=invalid` | 400 |

### 7.2 E2E 테스트 (Playwright)

- `packages/web/e2e/` 내 `business-plan-export.spec.ts` 신규 추가
- "PPTX 내보내기" 버튼 존재 확인 (functional 수준)

## 8. 라우트 마운트 (`app.ts`)

```typescript
// 기존 businessPlanRoute 아래에 추가
import { businessPlanExportRoute } from "./core/offering/routes/business-plan-export.js";
// ...
app.route("/api", businessPlanExportRoute);
```

## 9. Gap 분석 체크리스트

| 항목 | 파일 | 검증 방법 |
|------|------|----------|
| API 라우트 등록 | `app.ts` | GET /export 200 |
| HTML 내보내기 | `business-plan-export-service.ts` | CSS 변수 포함 확인 |
| PPTX 내보내기 | `business-plan-export-service.ts` | 바이너리 > 0 bytes |
| 버튼 UI | `BusinessPlanViewer.tsx` | DOM에 버튼 존재 |
| PPTX 다운로드 | `api-client.ts` | blob 타입 반환 |
| 테스트 통과 | `business-plan-export.test.ts` | vitest pass |
