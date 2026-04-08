---
code: FX-DSGN-BDQ
title: "Phase 27 Design — BD Quality System"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-BDQ]]"
---

# Phase 27: BD Quality System 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F461~F470 (10 F-items, 4 Milestones) |
| Sprint | 224~229 |
| 핵심 전략 | DomainAdapterInterface 패턴으로 QSA 3종 구현 + 기존 서비스 간 연결 코드 추가 + Sentinel 메타 오케스트레이터 |
| 참조 Plan | [[FX-PLAN-BDQ]] |
| 참조 PRD | `docs/specs/fx-bd-quality-system/prd-final.md` |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 산출물 파이프라인 구성요소가 단절되어 품질 일관성 부재 |
| Solution | QSA 3종(전문 Discriminator) + GAP 7건 복구 + BD Sentinel(자율 감시) |
| Function UX Effect | 산출물 생성 → QSA 자동 판별 → 피드백 자동 반영 → 전문가 수준 보장 |
| Core Value | "AI가 만들었다는 느낌이 절대 없는" 고객 대면 산출물 |

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    BD Sentinel (F468)                         │
│              자율 메타 오케스트레이터 — 9 Sector              │
│     DDPEV: Detect → Diagnose → Prescribe → Execute → Verify │
└───────────┬──────────────────┬──────────────────┬───────────┘
            │                  │                  │
    ┌───────▼────────┐ ┌──────▼────────┐ ┌───────▼────────┐
    │  PRD QSA (F463) │ │Offering QSA   │ │Prototype QSA   │
    │  PR-1~PR-5      │ │(F462)         │ │(F461)          │
    │  완결성/논리성   │ │OR-1~OR-5      │ │QSA-R1~R5       │
    │                 │ │구조/톤/디자인  │ │보안/Pitch/디자인│
    └────────┬────────┘ └──────┬────────┘ └───────┬────────┘
             │                 │                  │
    ┌────────▼─────────────────▼──────────────────▼────────┐
    │              DomainAdapterInterface                    │
    │   generate(input, feedback?) → {output}               │
    │   discriminate(output, rubric) → {score, feedback}    │
    │   getDefaultRubric() → string                         │
    └──────────────────────────┬───────────────────────────┘
                               │
    ┌──────────────────────────▼───────────────────────────┐
    │              기존 O-G-D 인프라                         │
    │  OgdOrchestratorService → Generator ↔ Discriminator   │
    │  + FeedbackConverter → StructuredInstruction[]         │
    │  + ogd_rounds 테이블 → prototype_quality 연동 (F467)  │
    └──────────────────────────────────────────────────────┘
```

---

## Sprint 224: F461 + F462 (QSA 2종, 병렬)

### F461: Prototype QSA

**인터페이스:**

```typescript
// packages/api/src/services/adapters/prototype-qsa-adapter.ts
export class PrototypeQsaAdapter implements DomainAdapterInterface {
  readonly domain = "prototype-qsa";
  readonly displayName = "Prototype 품질/보안 판별";

  async generate(input: { prototypeHtml: string; prdContent: string }, feedback?: string): Promise<{ output: unknown }>;
  async discriminate(output: unknown, rubric: string): Promise<{ score: number; feedback: string; pass: boolean }>;
  getDefaultRubric(): string; // QSA-R1~R5 기반
}
```

**CSS 정적 분석기:**

```typescript
// packages/api/src/core/harness/services/css-static-analyzer.ts
export interface CssAnalysisResult {
  aiDefaultFonts: string[];      // 검출된 AI 기본 폰트
  pureColors: string[];           // 순수 흑/백/회색
  nonGridSpacing: string[];       // 4/8px 비배수 간격
  nestedCards: boolean;           // 카드 중첩 여부
  hasMediaQueries: boolean;       // 반응형 여부
  score: number;                  // 0.0~1.0 (1.0 = 문제 없음)
}

export function analyzeCss(html: string): CssAnalysisResult;
```

**구현 전략:**
- CSS 분석은 **Rule-based** (LLM 미사용) — `<style>` 태그 파싱 후 정규식 매칭
- 보안 점검도 **Rule-based** — HTML 소스에서 패턴 매칭 (URL, 내부 코드명 등)
- LLM은 QSA-R2(Pitch Deck)과 QSA-R4(내러티브)에만 사용 — 비용 최소화

**5차원 Rubric 가중치:**

| Rubric | 가중치 | 판별 방식 |
|--------|--------|----------|
| QSA-R1: 보안 | 0.25 | Rule-based (패턴 매칭) |
| QSA-R2: Pitch Deck 품질 | 0.25 | LLM (Workers AI) |
| QSA-R3: 디자인 품질 | 0.25 | Rule-based CSS 분석 + LLM 보조 |
| QSA-R4: 구조 & 내러티브 | 0.15 | LLM (Workers AI) |
| QSA-R5: 기술 건전성 | 0.10 | Rule-based (HTML 유효성) |

**verdict 결정 로직:**

```typescript
function determineVerdict(scores: RubricScores, firstPrinciples: FirstPrinciplesResult): Verdict {
  if (firstPrinciples.confidentialLeak) return "SECURITY_FAIL";
  
  const criticals = findings.filter(f => f.severity === "critical");
  if (criticals.length > 0) return "MAJOR_ISSUE";
  
  const majors = findings.filter(f => f.severity === "major");
  if (majors.length >= 2) return "MAJOR_ISSUE";
  if (majors.length === 1) return "MINOR_FIX";
  
  if (!firstPrinciples.firstImpression || !firstPrinciples.coreValueFelt) return "MINOR_FIX";
  
  const totalScore = weightedSum(scores);
  return totalScore >= 0.85 ? "PASS" : "MINOR_FIX";
}
```

**테스트 시나리오:**

| # | 시나리오 | 기대 verdict |
|---|---------|-------------|
| 1 | HTML에 내부 API URL 포함 | SECURITY_FAIL |
| 2 | Arial 폰트 + #000000 배경 | MAJOR_ISSUE (R3 Critical x2) |
| 3 | 구조는 좋지만 CTA 부재 | MINOR_FIX (R2 Major x1) |
| 4 | 모든 기준 충족 | PASS |

### F462: Offering QSA

**인터페이스:**

```typescript
// packages/api/src/services/adapters/offering-qsa-adapter.ts
export class OfferingQsaAdapter implements DomainAdapterInterface {
  readonly domain = "offering-qsa";
  readonly displayName = "Offering 품질/보안 판별";

  // HTML 포맷: CSS 분석 + 구조 검증
  // PPTX 포맷: 구조 검증만 (시각 판별 제외)
}
```

**Offering 특화 Rubric:**

| Rubric | 가중치 | 검증 대상 |
|--------|--------|----------|
| OR-1: 보안 & 기밀 | 0.25 | QSA-R1과 동일 기반 + Offering 특화 (고객사명 마스킹 등) |
| OR-2: 콘텐츠 충실도 | 0.25 | DiscoveryPackage 2-0~2-8 매핑 완전성 |
| OR-3: 디자인 품질 | 0.20 | impeccable 7도메인 + design-tokens 일치 |
| OR-4: 18섹션 구조 | 0.15 | 필수 16섹션 존재 + 순서 + 분량 균형 |
| OR-5: 톤 & 워딩 | 0.15 | purpose(report/proposal/review)별 적합성 |

**기존 코드 재활용:**
- `offering-structure-validator.ts` → OR-4 기반 (기존 offering_sections 검증 확장)
- `css-static-analyzer.ts` → OR-3 (F461에서 구현한 것 재사용)
- `security-checker.ts` → OR-1 (F461에서 구현한 것 재사용)

---

## Sprint 225: F463 (PRD QSA)

### F463: PRD QSA

**인터페이스:**

```typescript
// packages/api/src/services/adapters/prd-qsa-adapter.ts
export class PrdQsaAdapter implements DomainAdapterInterface {
  readonly domain = "prd-qsa";
  readonly displayName = "PRD 완결성 판별";
}
```

**PRD 특화 Rubric:**

| Rubric | 가중치 | 검증 대상 |
|--------|--------|----------|
| PR-1: 문제 정의 | 0.25 | As-Is/To-Be/시급성 존재 + 구체성 |
| PR-2: 기능 범위 | 0.25 | Must Have + Out-of-scope 명시 |
| PR-3: 성공 기준 | 0.20 | KPI 정량성 + MVP 기준 + 실패 조건 |
| PR-4: 기술 실현성 | 0.15 | 기술 스택 명시 + 의존성 식별 |
| PR-5: 논리적 일관성 | 0.15 | 문제→해결책→성공기준 흐름 |

**기존 인프라 관계:**
- `ogd-discriminator`의 R1~R7과 역할 분리: ogd-discriminator = O-G-D 루프 내 빠른 게이트키핑, PRD QSA = 심층 완결성 판별
- ogd-discriminator는 기존대로 유지, PRD QSA는 별도 엔드포인트로 운영

---

## Sprint 226: F464 + F465 (GAP 복구 A, 병렬)

### F464: Generation–Evaluation 정합성

**변경 파일:**

```typescript
// packages/api/src/data/impeccable-reference.ts — 신규 함수 추가
export function getDiscriminatorChecklist(): string[] {
  // 7도메인에서 체크리스트 자동 도출
  // typography → 4항목, colorContrast → 4항목, spatialDesign → 3항목,
  // motionDesign → 2항목, interactionDesign → 2항목, responsiveDesign → 3항목, uxWriting → 2항목
  // 총 20항목 (기존 13 → 20으로 확장)
}

// packages/api/src/services/adapters/prototype-ogd-adapter.ts — 수정
getDefaultRubric(): string {
  // 기존 하드코딩 13항목 → getDiscriminatorChecklist() 동적 호출
  return getDiscriminatorChecklist().join("\n");
}
```

**정합성 보장 테스트:**

```typescript
// impeccable 도메인 수 === 체크리스트 도메인 커버리지
test("체크리스트가 impeccable 7도메인 전체를 커버한다", () => {
  const domains = Object.keys(IMPECCABLE_DOMAINS); // 7개
  const checklist = getDiscriminatorChecklist();
  // 각 도메인에서 최소 2개 항목 도출 확인
  for (const domain of domains) {
    const covered = checklist.filter(item => item.includes(domain));
    expect(covered.length).toBeGreaterThanOrEqual(2);
  }
});
```

### F465: Design Token → Generation 연결

**변경 파일:**

```typescript
// packages/api/src/services/prototype-styles.ts — 시그니처 확장
export interface DesignTokenOverride {
  'color.text.primary'?: string;
  'color.bg.default'?: string;
  'typography.hero.size'?: string;
  'spacing.grid.gap'?: string;
  // ... DesignTokenService의 14 토큰 키와 일치
}

export function getBaseCSS(
  theme: ThemeColors,
  tokens?: DesignTokenOverride, // 신규 파라미터
): string {
  // tokens가 있으면 CSS custom properties로 오버라이드
  // 없으면 기존 하드코딩 유지 (하위호환)
  const textColor = tokens?.['color.text.primary'] ?? theme.text;
  const bgColor = tokens?.['color.bg.default'] ?? '#ffffff';
  // ...
}
```

**prototype-generator.ts 변경:**

```typescript
// generate() 메서드에서 offering의 design tokens 조회
async generate(input: PrototypeGenerationInput): Promise<PrototypeResult> {
  const protoData = this.extractPrototypeData(input);
  
  // 신규: offering의 design tokens 조회
  let tokenOverride: DesignTokenOverride | undefined;
  if (input.offeringId) {
    const tokenService = new DesignTokenService(this.db);
    const tokens = await tokenService.getAsJson(input.offeringId);
    tokenOverride = flattenTokens(tokens);
  }
  
  const content = renderPrototypeHtml(protoData, templateType, tokenOverride);
  // ...
}
```

---

## Sprint 227: F466 + F467 (GAP 복구 B, 병렬)

### F466: Feedback → Regeneration 루프

**변경 파일:**

```typescript
// packages/api/src/core/harness/services/prototype-feedback-service.ts
async triggerRegeneration(jobId: string, orgId: string): Promise<void> {
  // 1. Job의 feedback_content 추출
  const job = await this.jobService.getById(jobId, orgId);
  if (job.status !== "feedback_pending") throw new Error("Not in feedback_pending");
  
  // 2. feedback_pending → building 전환
  await this.jobService.transition(jobId, orgId, "building", {});
  
  // 3. O-G-D 루프 재실행 (피드백을 previousFeedback으로 전달)
  const result = await this.orchestrator.runLoop(
    job.prdContent,
    job.feedbackContent, // previousFeedback
  );
  
  // 4. 결과 반영
  await this.jobService.transition(jobId, orgId, result.passed ? "live" : "failed", {
    qualityScore: result.bestScore,
    ogdRounds: result.totalRounds,
  });
}
```

### F467: Quality 데이터 통합

**변경 파일:**

```typescript
// packages/api/src/core/harness/services/ogd-orchestrator-service.ts
// runLoop() 완료 시점에 추가:

async runLoop(prdContent: string, previousFeedback?: string): Promise<OgdLoopResult> {
  // ... 기존 루프 로직 ...
  
  // 신규: 완료 시 prototype_quality 자동 적재
  if (this.qualityService && jobId) {
    await this.qualityService.insert({
      jobId,
      round: bestRound,
      totalScore: bestScore,
      buildScore: 1.0, // 빌드 성공이면 1.0
      uiScore: bestScore, // O-G-D 스코어 = UI 품질
      functionalScore: bestScore * 0.9, // 근사치
      prdScore: bestScore * 0.95, // 근사치
      codeScore: 1.0, // HTML 유효하면 1.0
      generationMode: "ogd-loop",
      costUsd: totalCost,
    });
  }
  
  return result;
}
```

---

## Sprint 228: F468 (BD Sentinel)

### F468: BD Sentinel

**서비스 구조:**

```typescript
// packages/api/src/core/harness/services/sentinel-audit-service.ts
export class SentinelAuditService {
  constructor(private db: D1Database, private ai: Ai) {}

  async fullAudit(): Promise<SentinelReport> {
    const results: SectorResult[] = [];
    
    // 9 Sector 순차 점검
    results.push(await this.auditSector1_GenerationEvaluation());
    results.push(await this.auditSector2_DesignTokenConnection());
    results.push(await this.auditSector3_FeedbackLoop());
    results.push(await this.auditSector4_QualityDataConsistency());
    results.push(await this.auditSector5_CssStaticQuality());
    results.push(await this.auditSector6_AgentSpecConsistency());
    results.push(await this.auditSector7_E2eOutputQuality());
    results.push(await this.auditSector8_OfferingPipeline());
    results.push(await this.auditSector9_PrdToPrototypeFlow());
    
    return this.compileReport(results);
  }
  
  async auditSector(sectorId: number): Promise<SectorResult>;
}
```

**Sector 점검 로직 (예: Sector 4):**

```typescript
async auditSector4_QualityDataConsistency(): Promise<SectorResult> {
  // 1. ogd_rounds에서 최근 N건 조회
  const rounds = await this.db.prepare(
    "SELECT job_id, MAX(round_number) as last_round FROM ogd_rounds GROUP BY job_id ORDER BY rowid DESC LIMIT 20"
  ).all();
  
  // 2. 대응하는 prototype_quality 레코드 존재 확인
  const orphans: string[] = [];
  for (const r of rounds.results) {
    const quality = await this.db.prepare(
      "SELECT id FROM prototype_quality WHERE job_id = ?"
    ).bind(r.job_id).first();
    if (!quality) orphans.push(r.job_id as string);
  }
  
  // 3. 판정
  const score = orphans.length === 0 ? 1.0 : 1.0 - (orphans.length / rounds.results.length);
  return {
    sector: 4,
    name: "Quality 데이터 일관성",
    status: orphans.length === 0 ? "HEALTHY" : orphans.length > 5 ? "CRITICAL" : "WARNING",
    score,
    findings: orphans.map(id => ({
      level: "WARNING",
      description: `ogd_rounds에 job_id=${id} 존재하나 prototype_quality에 대응 레코드 없음`,
    })),
  };
}
```

**API 엔드포인트:**

```
POST /sentinel/audit              — 전체 9 Sector audit
POST /sentinel/sector/:id         — 개별 Sector 점검
GET  /sentinel/report/latest      — 최근 audit 결과 조회
```

---

## Sprint 229: F469 + F470 (P1 디자인 고도화, 병렬)

### F469: CSS Anti-Pattern Guard

```typescript
// packages/api/src/core/harness/services/css-anti-pattern-guard.ts
export function guardCss(html: string): { fixed: string; corrections: Correction[] } {
  let fixed = html;
  const corrections: Correction[] = [];
  
  // 1. AI 기본 폰트 교체
  const fontReplacements: Record<string, string> = {
    "Arial": "'Plus Jakarta Sans', sans-serif",
    "Inter": "'DM Sans', sans-serif",
    "Helvetica": "'Space Grotesk', sans-serif",
    "system-ui": "'Outfit', sans-serif",
  };
  // ...
  
  // 2. 순수 흑백 → tinted neutral
  fixed = fixed.replace(/#000000/g, "#0f172a"); // slate-950
  fixed = fixed.replace(/#ffffff/g, "#fafbfc"); // tinted white
  // ...
  
  // 3. 비배수 spacing → 가장 가까운 4px 배수로 정규화
  // ...
  
  return { fixed, corrections };
}
```

### F470: HITL Review → Action 연결

```typescript
// packages/api/src/core/harness/services/prototype-review-service.ts — 확장
async reviewSection(...): Promise<PrototypeSectionReview> {
  const review = await this.insertReview(...);
  
  // 신규: revision_requested 시 자동 피드백 생성
  if (input.action === "revision_requested" && input.comment) {
    await this.feedbackService.create(orgId, prototypeId, {
      category: "design",
      content: `[HITL Review] Section ${input.sectionId}: ${input.comment}`,
      source: "hitl-review",
    });
  }
  
  return review;
}
```

---

## 공통 인프라

### 신규 DB 마이그레이션 (필요 시)

현재 분석으로는 **새 마이그레이션 불필요** — 기존 테이블 구조로 충분:
- `prototype_quality` — 이미 존재, INSERT 경로만 추가
- `prototype_feedback` — 이미 존재, triggerRegeneration 메서드만 추가
- `ogd_rounds` — 변경 없음

Sentinel report 저장이 필요하면 Sprint 228에서 마이그레이션 추가 검토.

### 라우트 등록

```typescript
// packages/api/src/core/harness/index.ts — 신규 라우트 추가
import { prototypeQsaRoutes } from "./routes/prototype-qsa.js";
import { sentinelRoutes } from "./routes/sentinel.js";

app.route("/prototype-qsa", prototypeQsaRoutes);
app.route("/sentinel", sentinelRoutes);

// packages/api/src/core/offering/index.ts — 신규 라우트 추가
import { offeringQsaRoutes } from "./routes/offering-qsa.js";
app.route("/offering-qsa", offeringQsaRoutes);
```

### 비용 제어

| 구성요소 | LLM 사용 | 비용 전략 |
|----------|---------|----------|
| CSS 정적 분석 | 없음 (Rule-based) | 무료 |
| 보안 점검 | 없음 (Rule-based) | 무료 |
| QSA-R2/R4/R5 판별 | Workers AI | ~$0 (무료 티어) |
| Sentinel Sector 1~6 | 없음 (코드 분석) | 무료 |
| Sentinel Sector 7~9 | Workers AI (선택적) | ~$0 |
| 총 추가 비용/산출물 | | **~$0** (Workers AI 무료 티어 내) |
