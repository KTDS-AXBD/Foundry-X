---
code: FX-DSGN-S226
title: Sprint 226 Design — Prototype QSA Adapter + Offering QSA Agent/Adapter
version: "1.0"
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 226
---

# Sprint 226 Design

## 1. 아키텍처 개요

```
.claude/agents/
  ├── prototype-qsa.md  ← 기존 설계 완료 (F461)
  └── offering-qsa.md   ← 신규 설계 (F462)

packages/api/src/services/adapters/
  ├── prd-qsa-adapter.ts       [F463, 기존]
  ├── prototype-qsa-adapter.ts [F461, 신규]
  └── offering-qsa-adapter.ts  [F462, 신규]

packages/api/src/__tests__/adapters/
  ├── prd-qsa-adapter.test.ts       [F463, 기존]
  ├── prototype-qsa-adapter.test.ts [F461, 신규]
  └── offering-qsa-adapter.test.ts  [F462, 신규]
```

두 어댑터 모두 `DomainAdapterInterface`를 구현한다.  
Worker AI(`@cf/meta/llama-3.1-8b-instruct`)를 통해 LLM 기반 판별을 수행한다.

## 2. F461: PrototypeQsaAdapter

### 2.1 클래스 설계

```typescript
export class PrototypeQsaAdapter implements DomainAdapterInterface {
  readonly domain = "prototype-qsa"
  readonly displayName = "Prototype QSA 판별"
  readonly description = "..."

  constructor(private ai: Ai) {}

  async generate(input, feedback?): Promise<{ output: unknown }>
  async discriminate(output, rubric): Promise<{ score, feedback, pass }>
  getDefaultRubric(): string

  // 내부 헬퍼
  private analyzeCss(html: string): CssAnalysisResult
  private parseDiscriminatorResponse(raw: string): DiscriminateResult
}
```

### 2.2 5차원 Rubric 가중치

```
QSA-R1 (Security)    → 0.25
QSA-R2 (Content)     → 0.25
QSA-R3 (Design)      → 0.25
QSA-R4 (Structure)   → 0.15
QSA-R5 (Technical)   → 0.10
```

### 2.3 CSS 정적 분석 (analyzeCss)

입력: HTML 문자열  
출력: `CssAnalysisResult`

```typescript
interface CssAnalysisResult {
  aiDefaultFonts: string[]      // Arial, Inter, system-ui, Helvetica
  pureColors: string[]          // #000000, #ffffff, #808080, #999999, #aaaaaa, #cccccc
  nonGridSpacing: string[]      // 4/8px 비배수 spacing 값
  hasNestedCards: boolean       // .card > .card 패턴
  hasMediaQueries: boolean      // @media 존재 여부
}
```

LLM 없이 정규식 기반으로 HTML에서 추출 — 빠르고 결정론적.

### 2.4 discriminate() 프롬프트 설계

System: "Prototype QSA 판별 전문가. JSON 반환."

JSON 구조:
```json
{
  "scores": {
    "QSA-R1": 0.0~1.0,
    "QSA-R2": 0.0~1.0,
    "QSA-R3": 0.0~1.0,
    "QSA-R4": 0.0~1.0,
    "QSA-R5": 0.0~1.0
  },
  "securityFail": false,
  "feedback": "한국어 개선 사항",
  "verdict": "PASS|MINOR_FIX|MAJOR_ISSUE|SECURITY_FAIL"
}
```

PASS 조건: `weightedScore >= 0.85 && !securityFail`

### 2.5 generate() 설계

prototype-qsa-adapter의 `generate()`는 Improvement Generator 역할:  
- 입력: `{ htmlContent: string, prdContent?: string }`  
- feedback을 받아 개선된 HTML을 반환  
- LLM에 개선 지시 + 기존 HTML + feedback 전달

## 3. F462: OfferingQsaAdapter

### 3.1 Offering QSA 5차원 Rubric

```
OQ-R1 (Structure)   → 0.25  18섹션 구조 검증
OQ-R2 (Content)     → 0.25  콘텐츠 충실도 (사업 아이디어 반영)
OQ-R3 (Design)      → 0.20  시각 디자인 품질 (Prototype QSA R3 기준 준용)
OQ-R4 (Brand)       → 0.20  브랜드 일관성 + 콘텐츠 어댑터 톤 적합성
OQ-R5 (Security)    → 0.10  기밀 정보 노출 여부
```

### 3.2 18섹션 구조 검증 (OQ-R1)

Offering HTML에서 다음 18개 섹션의 존재 여부를 검증:

| # | 섹션 | 키워드 |
|---|------|--------|
| 1 | Hero/표지 | hero, cover, headline |
| 2 | 문제 정의 | problem, 문제, 현재 |
| 3 | 솔루션 | solution, 솔루션, 해결 |
| 4 | 시장 기회 | market, TAM, 시장 |
| 5 | 비즈니스 모델 | business model, 수익, revenue |
| 6 | 경쟁 우위 | competitive, 차별화, moat |
| 7 | 고객 페르소나 | persona, customer, 고객 |
| 8 | 검증 데이터 | validation, 검증, evidence |
| 9 | 팀/조직 | team, 팀, 조직 |
| 10 | 로드맵 | roadmap, 로드맵, timeline |
| 11 | 재무 계획 | financial, 재무, 투자 |
| 12 | GTM 전략 | go-to-market, GTM, 마케팅 |
| 13 | 파트너십 | partner, 파트너, 협력 |
| 14 | 리스크 | risk, 리스크, 위험 |
| 15 | 성공 지표 | KPI, metric, 목표 |
| 16 | CTA | CTA, 연락처, contact |
| 17 | Q&A | Q&A, 질의, appendix |
| 18 | 부록 | appendix, 참고, reference |

P0 섹션(1~10): 필수 — 없으면 FAIL  
P1 섹션(11~18): 권장 — 없으면 Minor

### 3.3 클래스 설계

```typescript
export class OfferingQsaAdapter implements DomainAdapterInterface {
  readonly domain = "offering-qsa"
  readonly displayName = "Offering QSA 판별"
  readonly description = "..."

  constructor(private ai: Ai) {}

  async generate(input, feedback?): Promise<{ output: unknown }>
  async discriminate(output, rubric): Promise<{ score, feedback, pass }>
  getDefaultRubric(): string

  private checkSections(html: string): SectionCheckResult
  private parseDiscriminatorResponse(raw: string): DiscriminateResult
}
```

### 3.4 discriminate() JSON 구조

```json
{
  "scores": {
    "OQ-R1": 0.0~1.0,
    "OQ-R2": 0.0~1.0,
    "OQ-R3": 0.0~1.0,
    "OQ-R4": 0.0~1.0,
    "OQ-R5": 0.0~1.0
  },
  "missingSections": ["팀/조직", "재무 계획"],
  "securityFail": false,
  "feedback": "한국어 개선 사항"
}
```

PASS 조건: `weightedScore >= 0.80 && !securityFail`  
(Offering은 Prototype보다 threshold 낮음 — 사업 문서이므로 디자인보다 내용 충실도 중시)

## 4. 테스트 설계

### 4.1 prototype-qsa-adapter.test.ts (12 케이스)

```
describe("PrototypeQsaAdapter")
  인터페이스 기본값
    - domain = 'prototype-qsa'
    - displayName = 'Prototype QSA 판별'
    - description 존재
  getDefaultRubric()
    - QSA-R1~R5 5개 차원 포함
    - 가중치 합 = 1.0 (0.25+0.25+0.25+0.15+0.10)
  analyzeCss()
    - Arial 폰트 검출
    - #000000 순수 흑색 검출
    - @media 쿼리 존재 감지
    - 중첩 카드 패턴 검출
  discriminate()
    - 우수 HTML → pass=true, score≥0.85
    - 기밀 노출 HTML → securityFail 처리
    - LLM JSON 파싱 실패 fallback
```

### 4.2 offering-qsa-adapter.test.ts (10 케이스)

```
describe("OfferingQsaAdapter")
  인터페이스 기본값
    - domain = 'offering-qsa'
    - displayName = 'Offering QSA 판별'
    - description 존재
  getDefaultRubric()
    - OQ-R1~R5 5개 차원 포함
  checkSections()
    - 10개 P0 섹션 존재 → pass
    - P0 섹션 누락 → fail
    - P1 섹션 누락 → minor
  discriminate()
    - 완전한 Offering HTML → pass=true
    - LLM 파싱 실패 fallback
```

## 5. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|-----------|
| 단일 구현 (Claude 직접) | `.claude/agents/offering-qsa.md` |
| | `packages/api/src/services/adapters/prototype-qsa-adapter.ts` |
| | `packages/api/src/services/adapters/offering-qsa-adapter.ts` |
| | `packages/api/src/__tests__/adapters/prototype-qsa-adapter.test.ts` |
| | `packages/api/src/__tests__/adapters/offering-qsa-adapter.test.ts` |

## 6. 비고

- `generate()` 메서드: HTML 개선 생성 (O-G-D Generator 역할)
- `discriminate()` 메서드: LLM 기반 5차원 Rubric 판별 (O-G-D Discriminator 역할)
- CSS 정적 분석은 LLM 없이 정규식으로 수행 — 테스트 가능성 확보
- 두 어댑터 모두 F464~(GAP 복구)에서 EvaluatorOptimizer에 연결될 예정
