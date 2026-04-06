---
code: FX-DSGN-S166
title: "Sprint 166: Foundation — Agent 확장 + PPTX 설계"
version: 1.0
status: Active
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
feature: sprint-166
phase: "[[FX-PLAN-018]]"
sprint: 166
f_items: [F367, F368]
plan_ref: "[[FX-PLAN-S166]]"
---

## 1. 설계 목표

Sprint 165에서 구축한 offering-html 기반 위에 두 가지를 확장한다:
1. **F367**: offering-pptx SKILL.md를 stub에서 본구현으로 승격 — 18섹션→슬라이드 매핑 + Cowork 연동 설계
2. **F368**: ax-bd-offering-agent 에이전트 신규 생성 — 형상화 전체 라이프사이클 오케스트레이션 (6 capability)

변경 범위: `.claude/skills/` + `.claude/agents/` 인프라만. API/Web 코드 변경은 테스트 1건.

---

## 2. F367: offering-pptx SKILL.md 본구현

### 2.1 SKILL.md 구조

offering-html SKILL.md와 대칭 구조. frontmatter + 5대 섹션.

**frontmatter 갱신:**
```yaml
name: offering-pptx
domain: ax-bd
stage: shape
version: "1.0"                    # 0.1 → 1.0
description: "AX BD팀 사업기획서(PPTX) 생성 스킬 — 18섹션 표준 슬라이드, 디자인 토큰 기반"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingPPTX
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
status: Active                    # stub → Active
triggers:
  - 사업기획서 PPT
  - offering pptx
  - 형상화 PPTX
  - business proposal pptx
evolution:
  track: DERIVED
  registry_id: null
```

### 2.2 When 섹션

3가지 트리거 시나리오:
1. **대외 제안용**: 고객/파트너에게 제출하는 공식 PPTX (format="pptx", purpose="proposal")
2. **경영회의 보고용**: 본부장/대표 보고 (format="pptx", purpose="report")
3. **팀 내부 검토용**: 진행상황 공유 (format="pptx", purpose="review")

### 2.3 How 섹션 — 8단계 생성 프로세스

offering-html과 동일 8단계, PPTX 특화 사항만 다름:

| 단계 | HTML과 동일 | PPTX 특화 사항 |
|------|------------|---------------|
| [1] 아이템 확인 | ✅ 동일 | — |
| [2] 목차 확정 | ▲ 유사 | 18섹션 → 슬라이드 매핑 (§2.4) |
| [3] 핵심 정보 수집 | ✅ 동일 | — |
| [4] 초안 생성 | ▲ 다름 | PPTX 엔진으로 슬라이드 생성 |
| [5] 피드백 반영 | ✅ 동일 | — |
| [6] 교차검증 | ✅ 동일 | Agent가 validate_orchestration 호출 |
| [7] 보고용 마무리 | ▲ 유사 | 발표 노트 추가 |
| [8] 최종 확정 | ✅ 동일 | — |

### 2.4 표준 슬라이드 목차 — 18섹션→슬라이드 매핑

| 섹션 # | 섹션명 | 슬라이드 수 | 슬라이드 유형 | 필수 |
|--------|--------|------------|-------------|------|
| — | 표지 | 1 | title-slide | ● |
| — | 목차 | 1 | toc-slide | ● |
| 0 | Hero | 1 | hero-slide (KPI 3개 포함) | ● |
| 0.5 | Executive Summary | 2 | exec-summary (텍스트+도표) | ● |
| 01 | 추진 배경 및 목적 | 2 | content-slide (3축 구조) | ● |
| 02-1~02-3 | 왜 이 문제/기술/고객 | 3 | content-slide (각 1장) | ● |
| 02-4 | 기존 사업 현황 | 1 | data-slide (레버리지 차트) | ○ |
| 02-5 | Gap 분석 | 1 | compare-slide (현재 vs 목표) | ○ |
| 02-6 | 글로벌·국내 동향 | 2 | data-slide (경쟁사 매트릭스) | ● |
| 03-1 | 솔루션 개요 | 2 | before-after-slide | ● |
| 03-2 | 시나리오/Use Case | 2 | scenario-slide (PoC + 본사업) | ● |
| 03-3 | 사업화 로드맵 | 1 | roadmap-slide (타임라인) | ● |
| 04-1 | 데이터 확보 방식 | 1 | content-slide (계층별) | ● |
| 04-2 | 시장 분석 | 2 | data-slide (TAM/SAM/SOM) | ● |
| 04-3 | 매출 계획 | 2 | data-slide (3개년 시나리오) | ● |
| 04-4 | 추진 체계 | 1 | org-slide (조직·비용) | ● |
| 04-5 | 사업성 교차검증 | 2 | gan-slide (추진론/반대론) | ● |
| 04-6 | 기대효과 | 1 | impact-slide | ● |
| 05 | KT 연계 GTM | 2 | strategy-slide | ● |
| — | 마무리 | 1 | closing-slide | ● |

**총 슬라이드**: 필수 31장 + 선택 2장 = 33장 (최대)

### 2.5 Cowork PPTX 연동 설계

PPTX 공유·편집을 위한 Cowork 연동 인터페이스:

```
CoworkPPTXInterface:
  upload(pptxBuffer: Buffer, metadata: OfferingMeta): CoworkDocId
  share(docId: CoworkDocId, users: string[]): ShareLink
  getComments(docId: CoworkDocId): Comment[]
  exportVersion(docId: CoworkDocId, version: string): Buffer
```

> 실구현은 Cowork MCP 연동 시점에 확정. Sprint 166에서는 인터페이스 정의만.

### 2.6 PPTX 엔진 비교 매트릭스

| 기준 | pptxgenjs | python-pptx |
|------|----------|-------------|
| 언어 | TypeScript/JS | Python |
| 런타임 | Node.js / Browser | Python subprocess |
| 차트 지원 | ● 내장 | ● 내장 |
| 슬라이드 마스터 | ○ 제한적 | ● 완전 지원 |
| 한국어 폰트 | ● Pretendard embed 가능 | ● 가능 |
| Workers 호환 | ✅ (ESM) | ❌ (subprocess 필요) |
| 패키지 크기 | ~300KB | ~50MB (Python 환경) |
| 커뮤니티 | 활발 | 매우 활발 |

> **의사결정**: Sprint 172 F380에서 최종 선택. Workers 환경에서 직접 실행 가능한 pptxgenjs가 유력하나, 슬라이드 마스터 복잡도에 따라 python-pptx subprocess도 후보.

### 2.7 Output Format

```
AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.pptx
```

버전 관리: HTML과 동일 (v0.1 초안 → v0.5+ 보고용 → v1.0 최종).

---

## 3. F368: ax-bd-offering-agent 에이전트 정의

### 3.1 에이전트 메타데이터

```yaml
name: ax-bd-offering-agent
description: 형상화 라이프사이클 오케스트레이터 — DiscoveryPackage → Offering(HTML/PPTX) 전체 관리
model: opus
tools: [Read, Write, Edit, Glob, Grep, Agent, Bash, WebSearch]
color: cyan
role: orchestrator
```

### 3.2 shaping-orchestrator와의 관계

```
ax-bd-offering-agent (신규)
├── 형상화 전체 라이프사이클 관리 (Phase 0~4)
├── 6 capability 보유
└── 위임 관계:
    ├── shaping-orchestrator — Phase C O-G-D 루프 (기존, 변경 없음)
    ├── ogd-orchestrator — Offering 품질 검증 (validate_orchestration)
    ├── six-hats-moderator — 교차검증 토론 (validate_orchestration)
    └── expert-ta~qa — 5인 전문가 리뷰 (validate_orchestration)
```

**핵심 차이**: shaping-orchestrator는 O-G-D 루프만 관리하고, ax-bd-offering-agent는 DiscoveryPackage 로드부터 최종 확정까지 전체 워크플로우를 관리한다.

### 3.3 6 Capability 상세 설계

#### C1: format_selection

OfferingConfig.format + 컨텍스트에 따라 출력 포맷을 결정한다.

```
Input:
  - OfferingConfig.format: "html" | "pptx" | "auto"
  - context: { audience, occasion, deliveryMethod }

Logic:
  if format == "auto":
    if audience == "external_client" → "pptx" (발표 포맷)
    if audience == "internal_exec" → "pptx" (보고 포맷)
    if audience == "team_review" → "html" (빠른 공유)
    default → "html"
  else:
    use specified format

Output: { format: "html" | "pptx", reason: string }
```

#### C2: content_adapter

DiscoveryPackage에서 목적별 톤으로 콘텐츠를 변환한다.

```
Input:
  - DiscoveryPackage (2-0 ~ 2-8 산출물)
  - OfferingConfig.purpose: "report" | "proposal" | "review"

Tone Rules:
  report:   경영 언어 ("~를 추진", "약 XX억원"), Exec Summary 강조
  proposal: 기술 상세 (솔루션 아키텍처, PoC 시나리오), 구현 가능성 강조
  review:   리스크 중심 (No-Go 기준, 리스크 매트릭스), 비판적 검토

Section Mapping: INDEX.md §DiscoveryPackage Schema 참조
  2-0 item_overview → Hero, Exec Summary, §02-3
  2-1 reference_analysis → §02-6
  2-2 market_validation → §04-2
  2-3 competition_analysis → §04-2, §05
  2-4 item_derivation → §02-1~02-2
  2-5 core_selection → §01
  2-6 customer_profile → §02-3, §03-2
  2-7 business_model → §04-3
  2-8 packaging → 전체 기초 자료

Output: SectionContent[] (18섹션별 톤 적용 콘텐츠)
```

#### C3: structure_crud

Offering 섹션 목차를 관리한다. Sprint 167+ API 연동 전에는 로컬 파일 기반.

```
Input: offering_id + SectionToggle[]
Operations:
  create: 18섹션 기본 목차 초기화
  read: 현재 목차 + 필수/선택 상태
  update: 섹션 토글 (활성/비활성), 커스텀 섹션 추가
  delete: 커스텀 섹션 삭제 (표준 섹션은 비활성만 가능)
Output: SectionList (순서 + 활성 상태)
```

#### C4: design_management

디자인 토큰을 적용하고 브랜드 커스터마이징을 관리한다.

```
Input:
  - design-tokens.md (기본 39 토큰)
  - OfferingConfig.designTokenOverrides (선택, Partial)

Logic:
  1. design-tokens.md에서 기본 토큰 로드
  2. designTokenOverrides 병합 (존재하는 키만 오버라이드)
  3. 안전성 검증:
     - 변경 가능 토큰만 허용 (§7 커스터마이징 가이드 준수)
     - typography.body 변경 시 경고
     - animation 변경 시 접근성 경고
  4. HTML: CSS variables로 변환 → base.html 주입
     PPTX: 슬라이드 마스터 스타일로 변환

Output: AppliedTokens (최종 적용된 토큰 세트)
```

#### C5: validate_orchestration

기존 O-G-D + Six Hats + Expert 인프라를 활용해 Offering 품질을 검증한다.

```
Input: Offering draft (HTML 또는 PPTX 콘텐츠)

Execution:
  Step 1: O-G-D Loop 호출 (ogd-orchestrator → ogd-generator ↔ ogd-discriminator)
    - Offering 콘텐츠를 PRD처럼 취급하여 추진론/반대론 생성
    - max_rounds: 3, convergence: quality_score >= 0.85

  Step 2: Six Hats 토론 (six-hats-moderator)
    - O-G-D 결과 + Offering 콘텐츠 입력
    - 6색 모자별 의견 수집 → 합의안 도출

  Step 3: Expert 5인 리뷰 (expert-ta, aa, ca, da, qa)
    - TA: 기술 실현성
    - AA: 아키텍처 적합성
    - CA: 클라우드 인프라
    - DA: 데이터 전략
    - QA: 품질/테스트 관점

  Step 4: 종합 판정
    - 3단계 결과 종합 → §04-5 교차검증 섹션 자동 구성
    - Pass/Conditional/Fail 판정

Output: ValidationResult { verdict, ganResult, sixHatsResult, expertResults }
```

#### C6: version_guide

피드백 기반 버전 관리를 가이드한다.

```
Input: Offering + Feedback[]

Logic:
  1. 피드백 분류: 구조적 (목차 변경) / 내용적 (데이터 수정) / 어조 (톤 조정)
  2. 영향 범위 분석: 전체 재생성 vs 부분 수정
  3. 버전 결정:
     - 구조적 변경 → major 버전 (v0.1 → v0.2)
     - 내용적 변경 → minor 수정 (v0.1 내 업데이트)
     - 어조 변경 → content_adapter 재실행
  4. 변경 이력 기록

Output: VersionPlan { nextVersion, changeScope, regenerateStrategy }
```

### 3.4 실행 프로토콜

```
Phase 0: 초기화
  └── DiscoveryPackage 존재 확인 (2-0~2-8 산출물)
  └── OfferingConfig 파싱 (purpose, format, sections, tokens)

Phase 1: 콘텐츠 준비
  └── C1 format_selection → 포맷 결정
  └── C2 content_adapter → 톤 변환 콘텐츠 생성
  └── C3 structure_crud → 목차 초기화

Phase 2: 생성
  └── C4 design_management → 토큰 적용
  └── offering-html 또는 offering-pptx 스킬 호출 → 초안 생성 (v0.1)

Phase 3: 검증 (자동)
  └── C5 validate_orchestration → O-G-D + Six Hats + Expert
  └── §04-5 교차검증 섹션 자동 구성

Phase 4: 반복 개선
  └── C6 version_guide → 피드백 분석 + 버전 전략
  └── Phase 1~3 반복 (최대 4회 = v0.1~v0.4)
  └── v0.5+ 보고용 마무리 → v1.0 최종 확정
```

### 3.5 에러 처리

| 상황 | 조치 |
|------|------|
| DiscoveryPackage 불완전 (2-8 미완) | 부족한 단계 목록 + AskUserQuestion |
| O-G-D Loop 수렴 실패 | shaping-orchestrator FORCED_STOP → 사용자 에스컬레이션 |
| 디자인 토큰 오버라이드 무효 | 무효 키 무시 + 경고 메시지 |
| Expert Agent 호출 실패 | 실패 Expert 건너뛰기 + 부분 결과 반환 |

---

## 4. Skill Registry 연동

### 4.1 offering-pptx 등록 테스트

`packages/api/src/__tests__/skill-registry-offering-pptx.test.ts` (신규):

```typescript
// 테스트 4건
describe('Skill Registry — offering-pptx', () => {
  it('POST /api/skill-registry — offering-pptx 등록');
  it('GET /api/skill-registry — offering-pptx 조회');
  it('GET /api/skill-registry?category=shape — 카테고리 필터');
  it('GET /api/skill-registry?q=pptx — 검색');
});
```

### 4.2 테스트 데이터

```typescript
const offeringPptxSkill = {
  name: 'offering-pptx',
  domain: 'ax-bd',
  stage: 'shape',
  version: '1.0',
  description: 'AX BD팀 사업기획서(PPTX) 생성 스킬',
  input_schema: 'DiscoveryPackage + OfferingConfig',
  output_schema: 'OfferingPPTX',
  status: 'Active',
  evolution_track: 'DERIVED',
};
```

---

## 5. 파일 매핑

| # | 파일 경로 | 동작 | F# |
|---|----------|------|-----|
| 1 | `.claude/skills/ax-bd/shape/offering-pptx/SKILL.md` | 수정 (stub → 본구현) | F367 |
| 2 | `.claude/agents/ax-bd-offering-agent.md` | 🆕 신규 생성 | F368 |
| 3 | `packages/api/src/__tests__/skill-registry-offering-pptx.test.ts` | 🆕 신규 생성 | F367 |

---

## 6. 검증 체크리스트

- [ ] F367: offering-pptx SKILL.md version 1.0, status Active
- [ ] F367: When/How/표준슬라이드목차/Cowork연동/엔진비교 5섹션 완비
- [ ] F367: 18섹션→슬라이드 매핑 테이블 (31+2장)
- [ ] F368: ax-bd-offering-agent.md 에이전트 정의 완비
- [ ] F368: 6 capability (C1~C6) 상세 설계 포함
- [ ] F368: 실행 프로토콜 Phase 0~4 명시
- [ ] F368: shaping-orchestrator 위임 관계 명시
- [ ] F368: 에러 처리 4건 명시
- [ ] 테스트: skill-registry-offering-pptx 4건 통과
- [ ] typecheck: `turbo typecheck` 통과
- [ ] INDEX.md: agent 섹션이 F368 반영 여부 확인

---

## 7. 참조 문서

| 문서 | 경로 |
|------|------|
| Phase 18 PRD | `docs/specs/fx-offering-pipeline/prd-final.md` |
| Sprint 166 Plan | `docs/01-plan/features/sprint-166.plan.md` |
| offering-html SKILL.md | `.claude/skills/ax-bd/shape/offering-html/SKILL.md` |
| shaping-orchestrator Agent | `.claude/agents/shaping-orchestrator.md` |
| design-tokens.md | `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` |
| INDEX.md (Shape Stage) | `.claude/skills/ax-bd/shape/INDEX.md` |
