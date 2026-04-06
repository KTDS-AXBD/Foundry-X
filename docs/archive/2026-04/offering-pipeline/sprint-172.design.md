---
code: FX-DSGN-S172
title: "Sprint 172 — offering-pptx 구현 Design"
version: 1.0
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-PLAN-S172]], [[FX-REQ-372]]"
---

# Sprint 172 Design: offering-pptx 구현 (F380)

## 1. 개요

F380은 기존 HTML-only export 경로에 PPTX 포맷을 추가한다.
pptxgenjs 엔진으로 18섹션 표준 목차를 15종 슬라이드 타입으로 변환한다.

### 변경 범위

| 구분 | 파일 | 변경 유형 |
|------|------|----------|
| Schema | `schemas/offering-export.schema.ts` | 수정 |
| Service | `services/offering-export-service.ts` | 수정 |
| Service | `services/pptx-renderer.ts` | **신규** |
| Service | `services/pptx-slide-types.ts` | **신규** |
| Route | `routes/offering-export.ts` | 수정 |
| Test | `__tests__/offering-export-pptx.test.ts` | **신규** |
| Dep | `packages/api/package.json` | pptxgenjs 추가 |

## 2. Schema 확장

### 2.1 offering-export.schema.ts

```typescript
// Before
export const ExportFormatSchema = z.enum(["html"]);

// After
export const ExportFormatSchema = z.enum(["html", "pptx"]);
```

## 3. 슬라이드 타입 시스템 (pptx-slide-types.ts)

### 3.1 SlideType enum

```typescript
export type SlideType =
  | "title-slide"
  | "toc-slide"
  | "hero-slide"
  | "exec-summary"
  | "content-slide"
  | "data-slide"
  | "compare-slide"
  | "before-after-slide"
  | "scenario-slide"
  | "roadmap-slide"
  | "org-slide"
  | "gan-slide"
  | "impact-slide"
  | "strategy-slide"
  | "closing-slide";
```

### 3.2 섹션→슬라이드 매핑 (SECTION_SLIDE_MAP)

SKILL.md §표준 슬라이드 목차에 정의된 매핑을 상수로 구현한다.

```typescript
export interface SlideMapping {
  sectionKey: string;     // STANDARD_SECTIONS key 또는 특수키 (cover, toc, closing)
  slideType: SlideType;
  slideCount: number;     // 해당 섹션이 차지하는 슬라이드 수
  isRequired: boolean;
}

export const SECTION_SLIDE_MAP: SlideMapping[] = [
  { sectionKey: "_cover",       slideType: "title-slide",       slideCount: 1, isRequired: true },
  { sectionKey: "_toc",         slideType: "toc-slide",         slideCount: 1, isRequired: true },
  { sectionKey: "hero",         slideType: "hero-slide",        slideCount: 1, isRequired: true },
  { sectionKey: "exec_summary", slideType: "exec-summary",      slideCount: 2, isRequired: true },
  { sectionKey: "s01",          slideType: "content-slide",     slideCount: 2, isRequired: true },
  { sectionKey: "s02_1",        slideType: "content-slide",     slideCount: 1, isRequired: true },
  { sectionKey: "s02_2",        slideType: "content-slide",     slideCount: 1, isRequired: true },
  { sectionKey: "s02_3",        slideType: "content-slide",     slideCount: 1, isRequired: true },
  { sectionKey: "s02_4",        slideType: "data-slide",        slideCount: 1, isRequired: false },
  { sectionKey: "s02_5",        slideType: "compare-slide",     slideCount: 1, isRequired: false },
  { sectionKey: "s02_6",        slideType: "data-slide",        slideCount: 2, isRequired: true },
  { sectionKey: "s03_1",        slideType: "before-after-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s03_2",        slideType: "scenario-slide",    slideCount: 2, isRequired: true },
  { sectionKey: "s03_3",        slideType: "roadmap-slide",     slideCount: 1, isRequired: true },
  { sectionKey: "s04_1",        slideType: "content-slide",     slideCount: 1, isRequired: true },
  { sectionKey: "s04_2",        slideType: "data-slide",        slideCount: 2, isRequired: true },
  { sectionKey: "s04_3",        slideType: "data-slide",        slideCount: 2, isRequired: true },
  { sectionKey: "s04_4",        slideType: "org-slide",         slideCount: 1, isRequired: true },
  { sectionKey: "s04_5",        slideType: "gan-slide",         slideCount: 2, isRequired: true },
  { sectionKey: "s04_6",        slideType: "impact-slide",      slideCount: 1, isRequired: true },
  { sectionKey: "s05",          slideType: "strategy-slide",    slideCount: 2, isRequired: true },
  { sectionKey: "_closing",     slideType: "closing-slide",     slideCount: 1, isRequired: true },
];
```

## 4. PPTX 렌더러 (pptx-renderer.ts)

### 4.1 인터페이스

```typescript
interface PptxRenderInput {
  offering: OfferingRow;
  sections: SectionRow[];
  tokens: DesignTokenRow[];
}

export async function renderPptx(input: PptxRenderInput): Promise<Uint8Array>
```

### 4.2 렌더링 흐름

```
[1] PptxGenJS 인스턴스 생성
    └── 레이아웃: LAYOUT_WIDE (13.33" x 7.5")
    └── 기본 폰트: Pretendard
    └── 마스터 슬라이드: designTokens → 배경색, 폰트 색상 등 적용
        ↓
[2] 표지 슬라이드 (title-slide)
    └── offering.title + purpose + created_at
        ↓
[3] 목차 슬라이드 (toc-slide)
    └── 포함된 섹션(is_included=1) 목록
        ↓
[4] 섹션별 슬라이드 생성 (SECTION_SLIDE_MAP 순회)
    └── 각 섹션의 content(markdown) → 텍스트 파싱
    └── slideType에 따라 레이아웃 적용
    └── slideCount > 1이면 content를 분할
        ↓
[5] 마무리 슬라이드 (closing-slide)
        ↓
[6] pres.write({ outputType: "uint8array" }) → Uint8Array 반환
```

### 4.3 슬라이드 타입별 렌더링 전략

| 슬라이드 타입 | 레이아웃 전략 | 토큰 매핑 |
|-------------|-------------|----------|
| title-slide | 중앙 정렬 텍스트 (제목 + 부제 + 날짜) | typography.hero, color.bg.default |
| toc-slide | 2열 번호 목록 | typography.section |
| hero-slide | 한줄 요약 + 하단 KPI 3개 박스 | typography.hero, typography.kpi |
| exec-summary | 좌 50% 텍스트 + 우 50% 키 포인트 박스 | typography.body |
| content-slide | 제목 + 본문 텍스트 (불릿) | typography.section, typography.body |
| data-slide | 제목 + 테이블 또는 차트 영역 | color.data.* |
| compare-slide | 좌: Before / 우: After 2열 | color.border.strong |
| before-after-slide | 상: Before / 하: After + 화살표 | color.data.positive/negative |
| scenario-slide | 시나리오 카드 2~3개 가로 배치 | layout.cardRadius |
| roadmap-slide | 타임라인 3단계 (단기→중기→장기) | color.data.* |
| org-slide | 상: 조직도 / 하: 비용 테이블 | typography.body |
| gan-slide | 좌: 추진론 / 우: 반대론 + 하단 판정 | color.data.positive/negative |
| impact-slide | 기대효과 리스트 + 핵심 수치 강조 | typography.kpi |
| strategy-slide | GTM 전략 단계 + KT 연계 구조도 | typography.section |
| closing-slide | 감사 인사 + 연락처 | typography.hero |

### 4.4 디자인 토큰 매핑

```typescript
interface PptxDesignConfig {
  bgColor: string;         // color.bg.default → 슬라이드 배경
  primaryColor: string;    // color.primary → 강조색
  textColor: string;       // color.text.primary → 본문 색상
  headingColor: string;    // color.heading → 제목 색상
  fontFamily: string;      // 기본 Pretendard
  titleFontSize: number;   // 24pt
  bodyFontSize: number;    // 14pt
  kpiFontSize: number;     // 32pt
  dataPositive: string;    // color.data.positive → 긍정 데이터
  dataNegative: string;    // color.data.negative → 부정 데이터
}
```

토큰 DB 값을 `PptxDesignConfig`로 변환하는 `buildDesignConfig(tokens)` 헬퍼를 제공한다.

## 5. Export Service 확장

### 5.1 exportPptx 메서드

`OfferingExportService`에 추가:

```typescript
async exportPptx(orgId: string, offeringId: string): Promise<Uint8Array | null> {
  // 1. Offering 조회 (exportHtml과 동일)
  // 2. Sections 조회 (is_included=1, sort_order ASC)
  // 3. Design tokens 조회
  // 4. renderPptx({ offering, sections, tokens })
  return renderPptx({ offering, sections, tokens });
}
```

### 5.2 공통 쿼리 리팩토링

`exportHtml`과 `exportPptx`가 동일한 3-query를 사용하므로, private helper로 추출:

```typescript
private async getOfferingData(orgId: string, offeringId: string):
  Promise<{ offering: OfferingRow; sections: SectionRow[]; tokens: DesignTokenRow[] } | null>
```

## 6. Route 확장

### 6.1 offering-export.ts 분기

```typescript
offeringExportRoute.get("/offerings/:id/export", async (c) => {
  const parsed = ExportQuerySchema.safeParse(c.req.query());
  // ...validation...

  const svc = new OfferingExportService(c.env.DB);
  const { format } = parsed.data;

  if (format === "pptx") {
    const buffer = await svc.exportPptx(orgId, id);
    if (!buffer) return c.json({ error: "Offering not found" }, 404);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${id}.pptx"`,
      },
    });
  }

  // 기존 HTML 경로
  const html = await svc.exportHtml(orgId, id);
  if (!html) return c.json({ error: "Offering not found" }, 404);
  return c.html(html);
});
```

## 7. 테스트 설계

### 7.1 offering-export-pptx.test.ts

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | format=pptx → 200 + PPTX Content-Type | 응답 헤더 |
| 2 | format=pptx → 바이너리 응답 (PK zip 시그니처) | 첫 4바이트 = 50 4B 03 04 |
| 3 | 존재하지 않는 offering → 404 | JSON error |
| 4 | format 파라미터 없음 → 기본 html 응답 | HTML Content-Type |
| 5 | renderPptx가 모든 included 섹션을 포함하는지 | 섹션 수 일치 |
| 6 | 디자인 토큰 적용 확인 | PptxDesignConfig 빌드 결과 |
| 7 | SECTION_SLIDE_MAP 매핑 정합성 | STANDARD_SECTIONS와 교차 검증 |

### 7.2 Mock 전략

- D1: in-memory SQLite (기존 API 테스트 패턴)
- pptxgenjs: 실제 라이브러리 사용 (mock 불필요 — 바이너리 출력 검증)

## 8. 구현 순서

```
[1] pptxgenjs 의존성 추가 (package.json)
[2] pptx-slide-types.ts — 타입 + 매핑 상수
[3] pptx-renderer.ts — 렌더러 구현
[4] offering-export.schema.ts — format enum 확장
[5] offering-export-service.ts — exportPptx + 공통 쿼리 추출
[6] offering-export.ts — route 분기
[7] 테스트 작성 + 검증
```

## 9. 제외 사항

| 항목 | 사유 |
|------|------|
| Cowork PPTX 연동 | F367 SKILL.md에 인터페이스만 정의, 실구현은 Cowork MCP 연동 시점 |
| 차트 실제 렌더링 | data-slide에 테이블 형태로 구현, 동적 차트는 Phase 후반 |
| 슬라이드 애니메이션 | SKILL.md 원칙: 기본 없음 |
| 폰트 임베딩 | Pretendard 참조만 설정, 뷰어 측 폰트 사용 |
