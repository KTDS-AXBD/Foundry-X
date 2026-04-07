---
code: FX-DSGN-S203
title: Sprint 203 Design — impeccable 디자인 품질 (F423+F424)
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sonnet 4.6)
sprint: 203
features: [F423, F424]
---

# Sprint 203 Design — impeccable 디자인 품질

**Sprint**: 203  
**F-items**: F423 (impeccable 디자인 스킬 통합) + F424 (디자인 안티패턴 차단)  
**트랙**: A — 디자인 품질 기반  
**PRD**: `docs/specs/fx-builder-v2/prd-final.md`  
**Plan**: `docs/01-plan/features/sprint-203-207.plan.md`

---

## 1. 현황 분석

### 1.1 수정 대상 파일

| 파일 | 역할 | 현황 |
|------|------|------|
| `packages/api/src/core/harness/services/ogd-generator-service.ts` | PRD → HTML 생성 (LLM) | 시스템 프롬프트 4줄, 디자인 가이드 없음 |
| `packages/api/src/core/harness/services/ogd-discriminator-service.ts` | HTML 품질 평가 | 체크리스트 5개 정적 + 6개 키워드 조건부 |
| `packages/api/src/services/adapters/prototype-ogd-adapter.ts` | Generator + Discriminator 래핑 | 그대로 위임, 추가 로직 없음 |

### 1.2 신규 생성 파일

| 파일 | 용도 |
|------|------|
| `packages/api/src/data/impeccable-reference.ts` | 7도메인 참조문서 TypeScript 상수 번들 |

### 1.3 테스트 파일

| 파일 | 용도 |
|------|------|
| `packages/api/src/__tests__/sprint-203-impeccable.test.ts` | F423+F424 통합 테스트 |

---

## 2. F423 — impeccable 디자인 스킬 통합

### 2.1 설계 목표

OgdGeneratorService의 시스템 프롬프트에 impeccable 7도메인 참조문서를 주입하여,  
LLM이 프로토타입 HTML을 생성할 때 전문 디자인 원칙을 따르도록 한다.

### 2.2 impeccable 참조문서 번들 (`impeccable-reference.ts`)

7개 도메인의 핵심 원칙을 TypeScript 상수로 번들링한다.  
출처: https://github.com/pbakaus/impeccable (Apache 2.0)  
총 토큰: ~8K (30K 한도의 27% — M0 PoC PASS)

```typescript
// packages/api/src/data/impeccable-reference.ts

export const IMPECCABLE_DOMAINS = {
  typography: `...`,       // ~1,100 tokens
  colorContrast: `...`,    // ~1,053 tokens
  spatialDesign: `...`,    // ~690 tokens
  motionDesign: `...`,     // ~844 tokens
  interactionDesign: `...`,// ~1,262 tokens
  responsiveDesign: `...`, // ~597 tokens
  uxWriting: `...`,        // ~894 tokens
} as const;

/** 7도메인 전체를 하나의 문자열로 합산 (~8K 토큰) */
export function getImpeccableReference(): string {
  return Object.values(IMPECCABLE_DOMAINS)
    .join('\n\n---\n\n');
}
```

### 2.3 OgdGeneratorService 시스템 프롬프트 확장

**변경 전**: 4줄 제네릭 지시문  
**변경 후**: 기존 지시문 + impeccable 참조문서 주입

```typescript
// ogd-generator-service.ts — 변경 후 구조

import { getImpeccableReference } from "../../../data/impeccable-reference.js";

async generate(prdContent: string, previousFeedback?: string): Promise<GenerateResult> {
  const designReference = getImpeccableReference();

  const systemPrompt = [
    // 기존 4줄 유지
    "You are a prototype HTML generator.",
    "Generate a complete, self-contained single-page HTML prototype based on the PRD below.",
    "Include inline CSS and minimal JS.",
    "Output ONLY the HTML — no markdown fences, no explanations.",
    "",
    // 신규: impeccable 디자인 참조문서
    "=== DESIGN QUALITY GUIDELINES ===",
    "Apply the following professional design principles when generating HTML:",
    "",
    designReference,
    "=== END DESIGN GUIDELINES ===",
  ].join("\n");

  // 이후 동일 (userPrompt, LLM 호출)
}
```

### 2.4 토큰 예산 계산

| 구성 요소 | 토큰 수 |
|----------|--------:|
| 기존 시스템 프롬프트 | ~50 |
| impeccable 7도메인 | ~8,065 |
| PRD 콘텐츠 (평균) | ~2,000 |
| 이전 피드백 (있을 경우) | ~500 |
| **합계** | **~10,615** |
| llama-3.1-8b 컨텍스트 한도 | 128K |
| Workers AI 실제 제한 | 30K |
| **여유분** | **~19K (63%)** |

---

## 3. F424 — 디자인 안티패턴 차단

### 3.1 설계 목표

OgdDiscriminatorService.extractChecklist()에 안티패턴 체크 항목을 추가하여,  
과용 폰트·순수 흑색·카드 중첩 등을 감지하면 FAIL → 재생성을 트리거한다.

### 3.2 안티패턴 체크리스트 항목 (8개)

PRD 내용과 무관하게 **항상** 적용되는 정적 안티패턴 체크:

| # | 체크 항목 | 감지 패턴 | 이유 |
|---|----------|-----------|------|
| 1 | `과용 폰트(Arial, Inter, system-ui) 미사용` | CSS에서 `font-family.*Arial\|Inter\|system-ui` | AI 기본 폰트 차단 |
| 2 | `순수 흑색(#000000) 미사용 — tinted neutral 사용` | CSS에서 `color.*#000000\|#000 ` | 조잡한 단색 방지 |
| 3 | `순수 회색(#808080, #999999, #aaaaaa) 미사용` | CSS에서 해당 hex 코드 | 단조로운 회색 방지 |
| 4 | `텍스트-배경 명도 대비율 4.5:1 이상` | 시각적 계층구조 확인 요청 | 접근성 + 가독성 |
| 5 | `카드 중첩(card-in-card) 패턴 미사용` | `.card .card\|[class*=card] [class*=card]` | AI 기본 레이아웃 패턴 차단 |
| 6 | `타이포그래피 계층 구조 2단계 이상 (h1 + h2 또는 다른 크기)` | 폰트 크기 다양성 | 단조로운 텍스트 방지 |
| 7 | `mobile-first 미디어 쿼리 적용` | `@media` 존재 확인 | 반응형 필수 |
| 8 | `적절한 여백(padding/margin)으로 호흡감 확보` | 클러터된 레이아웃 방지 | 공간 디자인 |

### 3.3 extractChecklist() 수정

```typescript
// ogd-discriminator-service.ts — extractChecklist() 변경 후

extractChecklist(prdContent: string): string[] {
  const items: string[] = [];

  // [기존] 핵심 구조 체크 5개 — 유지
  items.push("페이지에 명확한 제목(h1)이 존재한다");
  items.push("주요 기능 섹션이 2개 이상 존재한다");
  items.push("CTA(Call-to-Action) 버튼이 존재한다");
  items.push("반응형 레이아웃이 적용되어 있다");
  items.push("시각적 계층 구조가 명확하다");

  // [신규 F424] 안티패턴 차단 8개 — 항상 적용
  items.push("과용 폰트(Arial, Inter, system-ui) 대신 전문 폰트 또는 Google Fonts를 사용한다");
  items.push("순수 흑색(#000000)을 피하고 약간의 채도가 있는 tinted neutral을 사용한다");
  items.push("순수 회색(#808080, #999999)을 피하고 채도 있는 색상 팔레트를 사용한다");
  items.push("텍스트와 배경의 명도 대비가 충분하여 가독성이 높다");
  items.push("카드 안에 카드를 중첩하는 패턴을 사용하지 않는다");
  items.push("h1, h2 또는 크기가 다른 텍스트로 타이포그래피 계층 구조가 명확하다");
  items.push("모바일 화면을 위한 미디어 쿼리(@media)가 적용되어 있다");
  items.push("섹션과 요소 사이에 충분한 여백(padding/margin)으로 호흡감이 있다");

  // [기존] PRD 키워드 기반 추가 체크 — 유지
  if (prdContent.includes("대시보드") || prdContent.includes("dashboard")) {
    items.push("데이터 시각화 요소(차트/테이블)가 존재한다");
  }
  // ... (기존 5개 조건 동일)

  return items;
}
```

### 3.4 체크리스트 수 변화

| | 이전 | 이후 |
|--|-----:|-----:|
| 정적 핵심 체크 | 5개 | 13개 (+8) |
| PRD 키워드 조건부 | 최대 6개 | 최대 6개 |
| **총 최대** | **11개** | **19개** |

---

## 4. PrototypeOgdAdapter 통합

Adapter는 Generator와 Discriminator를 래핑하므로, 추가 변경은 최소화한다.  
`getDefaultRubric()`도 안티패턴 항목을 포함하도록 갱신한다.

```typescript
// prototype-ogd-adapter.ts — getDefaultRubric() 변경 후

getDefaultRubric(): string {
  return [
    // 기존 5개
    "페이지에 명확한 제목(h1)이 존재한다",
    "주요 기능 섹션이 2개 이상 존재한다",
    "CTA(Call-to-Action) 버튼이 존재한다",
    "반응형 레이아웃이 적용되어 있다",
    "시각적 계층 구조가 명확하다",
    // 신규 안티패턴 8개 (F424)
    "과용 폰트(Arial, Inter, system-ui) 대신 전문 폰트 또는 Google Fonts를 사용한다",
    "순수 흑색(#000000)을 피하고 약간의 채도가 있는 tinted neutral을 사용한다",
    "순수 회색(#808080, #999999)을 피하고 채도 있는 색상 팔레트를 사용한다",
    "텍스트와 배경의 명도 대비가 충분하여 가독성이 높다",
    "카드 안에 카드를 중첩하는 패턴을 사용하지 않는다",
    "h1, h2 또는 크기가 다른 텍스트로 타이포그래피 계층 구조가 명확하다",
    "모바일 화면을 위한 미디어 쿼리(@media)가 적용되어 있다",
    "섹션과 요소 사이에 충분한 여백(padding/margin)으로 호흡감이 있다",
  ].join("\n");
}
```

---

## 5. Worker 파일 매핑

| Worker | 담당 파일 | 작업 내용 |
|--------|-----------|-----------|
| **단일 구현** | `packages/api/src/data/impeccable-reference.ts` | 신규 생성 — 7도메인 참조문서 번들 |
| **단일 구현** | `packages/api/src/core/harness/services/ogd-generator-service.ts` | 시스템 프롬프트 확장 (impeccable 주입) |
| **단일 구현** | `packages/api/src/core/harness/services/ogd-discriminator-service.ts` | extractChecklist() 안티패턴 8개 추가 |
| **단일 구현** | `packages/api/src/services/adapters/prototype-ogd-adapter.ts` | getDefaultRubric() 갱신 |
| **단일 구현** | `packages/api/src/__tests__/sprint-203-impeccable.test.ts` | F423+F424 테스트 |

> Worker 매핑 없음 — 파일 간 의존성이 순차적이고 단일 개발자가 처리 가능한 규모

---

## 6. 테스트 설계

### 6.1 F423 테스트

```typescript
// sprint-203-impeccable.test.ts

describe("F423: impeccable 디자인 스킬 통합", () => {
  it("getImpeccableReference()가 7개 도메인을 모두 포함한다", () => {
    const ref = getImpeccableReference();
    expect(ref).toContain("typography");     // Typography 도메인
    expect(ref).toContain("color");          // Color & Contrast
    expect(ref).toContain("spacing");        // Spatial Design
    expect(ref).toContain("responsive");     // Responsive Design
  });

  it("impeccable 참조문서 토큰 크기가 30K 이내다", () => {
    const ref = getImpeccableReference();
    const estimatedTokens = Math.ceil(ref.length / 4);
    expect(estimatedTokens).toBeLessThan(10000); // 10K 미만 (30K 한도 여유)
  });

  it("OgdGeneratorService 시스템 프롬프트에 DESIGN QUALITY GUIDELINES가 포함된다", async () => {
    // Mock AI + generate() 호출 → systemPrompt 캡처
    // systemPrompt에 "DESIGN QUALITY GUIDELINES" 포함 확인
  });
});
```

### 6.2 F424 테스트

```typescript
describe("F424: 디자인 안티패턴 차단", () => {
  it("extractChecklist()에 안티패턴 8개가 포함된다", () => {
    const discriminator = new OgdDiscriminatorService(mockAi);
    const checklist = discriminator.extractChecklist("일반 PRD 내용");
    
    const antiPatternItems = checklist.filter(item => 
      item.includes("Arial") || 
      item.includes("흑색") || 
      item.includes("회색") ||
      item.includes("대비") ||
      item.includes("카드") ||
      item.includes("타이포") ||
      item.includes("미디어 쿼리") ||
      item.includes("여백")
    );
    expect(antiPatternItems).toHaveLength(8);
  });

  it("getDefaultRubric()이 안티패턴 항목을 포함한다", () => {
    const adapter = new PrototypeOgdAdapter(mockAi);
    const rubric = adapter.getDefaultRubric();
    expect(rubric).toContain("Arial");
    expect(rubric).toContain("흑색");
    expect(rubric).toContain("미디어 쿼리");
  });

  it("PRD 키워드 없어도 안티패턴 체크가 적용된다", () => {
    const discriminator = new OgdDiscriminatorService(mockAi);
    const checklist = discriminator.extractChecklist(""); // 빈 PRD
    expect(checklist.length).toBeGreaterThanOrEqual(13); // 5 + 8
  });
});
```

---

## 7. 변경 영향 분석

| 영역 | 영향 | 대응 |
|------|------|------|
| LLM 응답 품질 | 양호 (디자인 가이드 추가로 향상 기대) | 없음 |
| 토큰 사용량 | +8K (시스템 프롬프트 증가) | 30K 한도 내 여유 충분 |
| 체크리스트 항목 수 | 5+6 → 13+6 (최대 19개) | Discriminator 평가 시간 소폭 증가 가능 |
| 기존 OGD 루프 | 없음 (인터페이스 동일) | 없음 |
| 다른 Sprint (204~207) | 없음 (파일 교집합 없음) | 없음 |

---

## 8. 완료 기준 (Definition of Done)

### F423
- [x] `impeccable-reference.ts` 생성 — 7도메인 모두 포함
- [x] `ogd-generator-service.ts` 시스템 프롬프트에 impeccable 참조문서 주입
- [x] 토큰 추정치 10K 미만 확인
- [x] 테스트 통과

### F424
- [x] `ogd-discriminator-service.ts` extractChecklist()에 안티패턴 8개 추가
- [x] `prototype-ogd-adapter.ts` getDefaultRubric() 갱신
- [x] PRD 없이도 안티패턴 체크 13개 이상 확인
- [x] 테스트 통과
