---
code: FX-DSGN-S229
title: Sprint 229 Design — BD Sentinel 구현 (F468)
version: "1.0"
status: Active
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 229
---

# Sprint 229 Design — BD Sentinel 구현

## 1. 아키텍처 개요

```
.claude/agents/
  ├── prototype-sentinel.md  ← 기존 유지 (Prototype 파이프라인 전문 감시)
  └── bd-sentinel.md         ← 신규 작성 (BD 전체 파이프라인 메타 감시)
```

BD Sentinel은 **별도 에이전트 파일**로 작성된다. `prototype-sentinel.md`는 변경하지 않는다.  
bd-sentinel이 상위 메타 오케스트레이터로서 prototype-sentinel을 하위 에이전트로 조율한다.

```
BD Sentinel (메타 오케스트레이터)
├── prototype-sentinel → Prototype 파이프라인 전문 감시 위임
├── prototype-qsa      → Prototype HTML 5차원 품질 판별 위임
├── offering-qsa       → Offering HTML/PPTX 판별 위임
└── prd-qsa            → PRD 완결성/논리성 판별 위임
```

## 2. bd-sentinel.md 상세 설계

### 2.1 메타데이터

```yaml
---
name: bd-sentinel
description: BD 산출물 전체 자율 감시 메타 오케스트레이터 — 7+ Sector 감시, DDPEV 사이클, PRD·Offering·Prototype 품질 통합 관리
model: opus
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - WebSearch
color: red
role: meta-orchestrator
---
```

- `color: red` — CRITICAL 판정 권한을 가진 최상위 에이전트임을 시각적으로 구별
- `model: opus` — 7+ Sector 종합 분석에 최고 성능 모델 필요
- `role: meta-orchestrator` — prototype-sentinel의 `role: orchestrator`보다 상위 계층

### 2.2 8 Sector 구성

prototype-sentinel의 7 Sector를 5개로 통합·재구성하고, 3개 신규 Sector를 추가한다.

| Sector | 이름 | 원천 | 변화 |
|--------|------|------|------|
| 1 | Generation–Evaluation 정합성 | prototype-sentinel S1 | BD 전체로 확장 (Prototype만 → PRD+Offering+Prototype) |
| 2 | Design Token → Generation 연결 | prototype-sentinel S2 | 동일 유지 |
| 3 | Feedback → Regeneration 루프 | prototype-sentinel S3 | 동일 유지 |
| 4 | Quality 데이터 통합 | prototype-sentinel S4 | 동일 유지 |
| 5 | 에이전트 스펙 일관성 | prototype-sentinel S6 | BD 에이전트 전체로 확장 |
| **6** | **PRD QSA 정합성** | 신규 | PRD 품질 체계 감시 |
| **7** | **Offering QSA 정합성** | 신규 | Offering 품질 체계 감시 |
| **8** | **Cross-Artifact 일관성** | 신규 | PRD↔Offering↔Prototype 시각 언어·내용 일치 감시 |

> prototype-sentinel의 Sector 5(CSS 정적 품질)와 Sector 7(엔드투엔드 산출물 품질)은  
> bd-sentinel에서 Sector 5(에이전트 스펙 일관성)로 흡수·통합된다.  
> CSS 정적 분석은 prototype-qsa(QSA-R3)와 Sector 6(Offering QSA)에서 커버한다.

### 2.3 신규 Sector 상세 설계

#### Sector 6: PRD QSA 정합성

**감시 대상:**
- `.claude/agents/prd-qsa.md` 에이전트 스펙
- `packages/api/src/services/adapters/prd-qsa-adapter.ts` 구현
- `packages/api/src/core/harness/services/ogd-discriminator-service.ts` (PRD 도메인)
- `docs/specs/*/prd-final.md` 최근 생성된 PRD 산출물

**감지 패턴:**
- prd-qsa.md의 Rubric이 PRD-QSA 표준(완결성/논리성/실행가능성)과 drift
- prd-qsa-adapter.ts가 에이전트 스펙과 다른 Rubric 사용
- 최근 PRD가 prd-qsa 기준으로 명백한 약점 포함 (착수 판단 기준 미충족)

**자율 행동:**
```
IF prd-qsa.md Rubric ≠ prd-qsa-adapter.ts Rubric:
  → 코드(prd-qsa-adapter)가 진실, 에이전트 스펙을 코드 기준으로 갱신
  → 단, 코드에서 명백히 누락된 항목은 코드에 추가

IF 최근 PRD가 3개 이상 QSA 기준 미충족:
  → 🟡 WARNING 발령
  → 미충족 패턴 분석 (어떤 섹션이 반복 FAIL?)
  → PRD 생성 프롬프트 또는 템플릿 개선 제안
```

**검증 파일:**
- `.claude/agents/prd-qsa.md`
- `packages/api/src/services/adapters/prd-qsa-adapter.ts`
- `packages/api/src/__tests__/adapters/prd-qsa-adapter.test.ts`

#### Sector 7: Offering QSA 정합성

**감시 대상:**
- `.claude/agents/offering-qsa.md` 에이전트 스펙
- `packages/api/src/services/adapters/offering-qsa-adapter.ts` 구현
- `.claude/agents/ax-bd-offering-agent.md` (Offering 생성 에이전트)
- `packages/api/src/core/offering/` (Offering 서비스 전체)

**감지 패턴:**
- offering-qsa.md의 18섹션 검증 기준이 ax-bd-offering-agent.md 생성 스펙과 불일치
- offering-qsa-adapter.ts가 에이전트 스펙에 비해 덜 구현됨
- Offering 생성 에이전트가 QSA 체크리스트를 참조하지 않고 생성

**자율 행동:**
```
IF ax-bd-offering-agent.md의 출력 섹션 수 ≠ offering-qsa.md의 검증 섹션 수:
  → 불일치 목록 작성
  → offering-qsa.md에 누락 섹션 추가 (검증 강화)
  → 또는 ax-bd-offering-agent.md에 누락 섹션 생성 지시 추가

IF offering-qsa-adapter.ts의 구현이 에이전트 스펙 기능 대비 50% 미만:
  → 🟡 WARNING 발령
  → 미구현 기능 목록 제시 + 구현 우선순위 추천
```

**검증 파일:**
- `.claude/agents/offering-qsa.md`
- `.claude/agents/ax-bd-offering-agent.md`
- `packages/api/src/services/adapters/offering-qsa-adapter.ts`
- `packages/api/src/core/offering/`

#### Sector 8: Cross-Artifact 일관성

**감시 대상:**
- 동일 BD 아이템의 PRD → Offering → Prototype 흐름
- 각 산출물의 핵심 메시지, 시각 언어, 브랜딩 일치도
- `DesignTokenService`가 Offering과 Prototype 양쪽에 전달되는지

**감지 패턴:**
- Offering의 `designTokenOverrides`가 Prototype 생성에 미전달
- PRD의 핵심 가치 제안(Value Proposition)이 Offering에 반영되지 않음
- Offering 색상 팔레트와 Prototype CSS 색상이 상이

**자율 행동:**
```
IF DesignTokenService 토큰이 Prototype 생성에 전달되지 않음:
  → 🔴 CRITICAL 발령 (브랜드 일관성 파괴)
  → prototype-styles.ts에 토큰 주입 인터페이스 확인 (Sector 2와 연동)
  → 연결 코드가 없으면 즉시 구현

IF PRD의 Value Proposition이 Offering에 미반영:
  → 🟡 WARNING 발령
  → ax-bd-offering-agent.md에 PRD VP 참조 지시 추가 제안
```

**검증 파일:**
- `packages/api/src/core/offering/services/design-token-service.ts`
- `packages/api/src/services/prototype-styles.ts`
- `packages/api/src/routes/prototype.ts` (토큰 전달 경로)

### 2.4 DDPEV 사이클 (BD 확장판)

prototype-sentinel의 5단계와 동일하되, 범위가 BD 전체로 확장된다.

```
Detect   → 8 Sector 전체 스캔
           │ 스캔 순서: S1(정합성) → S6(PRD) → S7(Offering) → S8(Cross) → S2~S5
Diagnose → 근본 원인 추적
           │ 단절: 코드 경로 부재 → 즉시 Execute
           │ 열화: 점진적 품질 하락 → 패턴 분석 후 Prescribe
           │ 설계 미비: 스펙 outdated → 사람 확인 후 Execute
Prescribe → 수정 방안 결정
           │ 자율 행동 범위: 에이전트 스펙 갱신, 코드 수정, 테스트 추가
           │ 사람 확인 필요: DB 스키마, 새 에이전트 생성, 외부 서비스 변경
Execute  → 직접 수정 실행
           │ 우선순위: CRITICAL > DRIFT > WARNING > INFO
Verify   → 검증
           │ 코드 수정: build-validator에 위임
           │ 에이전트 스펙 수정: gap-detector에 위임 (선택적)
           │ 전체 재스캔으로 최종 확인
```

### 2.5 하위 에이전트 위임 구조

```
BD Sentinel (최상위)
│
├── Sector 1~5 직접 실행 (prototype-sentinel 로직 흡수)
│   └── prototype-sentinel → Prototype 파이프라인 심층 감시 위임
│
├── Sector 6: prd-qsa → PRD 심층 판별 위임
├── Sector 7: offering-qsa → Offering 심층 판별 위임
├── Sector 8: Cross-Artifact 직접 분석
│
├── build-validator → 코드 수정 후 빌드 검증
└── spec-checker → SPEC.md 정합성 확인
```

### 2.6 Sentinel Report 확장 (BD 버전)

prototype-sentinel Report에 다음 섹션 추가:

```yaml
bd_artifacts_health:
  prd:
    recent_count: 5
    avg_quality: 0.88
    failing_items: []
  offering:
    recent_count: 3
    avg_quality: 0.76
    failing_items: ["섹션 12 (경쟁사 분석) 누락", "브랜드 색상 불일치"]
  prototype:
    recent_count: 8
    avg_quality: 0.82
    failing_items: ["AI 기본 폰트 1건"]

cross_artifact_consistency:
  prd_to_offering: 0.91   # VP 반영률
  offering_to_prototype: 0.73  # 디자인 토큰 전달률
  overall: 0.82
```

### 2.7 호출 방식 (prototype-sentinel 계승 + BD 확장)

| 호출 방식 | 설명 |
|-----------|------|
| 자율 Audit (정기 점검) | 8 Sector 전체 순차 스캔 |
| 타겟 점검 | 특정 Sector만 점검 (`"BD Sentinel, Sector 6 점검"`) |
| 사후 분석 (Post-Generation) | 특정 산출물 유형 생성 후 분석 |
| 파이프라인 재설계 | 구조적 문제 발견 시 재설계 수행 |
| **BD 품질 리포트** | PRD+Offering+Prototype 전체 품질 종합 보고 (신규) |

## 3. 구현 파일 목록

| 파일 | 유형 | 작업 |
|------|------|------|
| `.claude/agents/bd-sentinel.md` | Agent MD | 신규 작성 |

> TypeScript 코드 구현 없음 — Claude Agent 스펙 문서만 작성.  
> 기존 TypeScript 서비스(QSA Adapter 등)는 이미 F461~F463에서 완성됨.

## 4. Gap Analysis 기준 (Design ↔ 구현)

| 항목 | Design 요구사항 | 검증 방법 |
|------|----------------|-----------|
| 메타데이터 완결성 | name, description, model, tools, color, role 모두 포함 | 파일 파싱 |
| 8 Sector 모두 포함 | Sector 1~8 전체 섹션 존재 | 섹션 헤더 확인 |
| DDPEV 사이클 명시 | Detect→Diagnose→Prescribe→Execute→Verify 5단계 | 텍스트 확인 |
| 경보 등급 4단계 | CRITICAL/WARNING/INFO/DRIFT | 텍스트 확인 |
| 자율 판단 기준 | 사람 확인 필요 vs. 자율 행동 명시 | 텍스트 확인 |
| 하위 에이전트 위임 규칙 | prototype-sentinel/prd-qsa/offering-qsa 위임 명시 | 텍스트 확인 |
| Sentinel Report 형식 | BD artifacts health + cross-artifact 섹션 포함 | 텍스트 확인 |
| bd-sentinel vs. prototype-sentinel 관계 | 계층 관계 명확히 기술 | 텍스트 확인 |

## 5. Worker 파일 매핑

Worker 불필요 — 단일 Agent 마크다운 파일 작성이므로 Claude가 직접 구현한다.

| 구현 대상 | 작업 내용 |
|-----------|-----------|
| `.claude/agents/bd-sentinel.md` | 메타데이터 + 8 Sector + DDPEV + 위임 구조 + Report 형식 작성 |
