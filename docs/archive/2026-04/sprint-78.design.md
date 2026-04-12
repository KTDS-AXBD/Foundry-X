---
code: FX-DSGN-078
title: "Sprint 78 — Watch 항목 3건 벤치마킹 보고서"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-078]] Sprint 78 Plan"
  - "[[FX-REQ-221]] Agent Spec 표준 (Watch)"
  - "[[FX-REQ-222]] Scale-Adaptive Intelligence (Watch)"
  - "[[FX-REQ-223]] Multi-repo Workspace (Watch)"
---

# Sprint 78 Design — Watch 벤치마킹 보고서

## 1. 개요

Phase 6 Ecosystem Integration의 마지막 Sprint로, 장기 관찰 대상 3건의 기술 표준/패턴을 벤치마킹한다.
각 항목에 대해 **기술 분석 → Foundry-X 비교 → GAP/기회 → 관찰 포인트** 4단계 분석을 수행한다.

---

## 2. F229: Oracle Open Agent Specification (Agent Spec)

### 2.1 기술 현황

| 항목 | 값 |
|------|---|
| **소유** | Oracle (오픈소스, GitHub: oracle/agent-spec) |
| **발표** | 2025.10 (Technical Report: arxiv.org/html/2510.04173v1) |
| **현재 버전** | PyAgentSpec 26.2.0.dev1 |
| **핵심 목표** | 프레임워크 비종속 AI 에이전트/워크플로우 선언적 정의 |
| **참여사** | Oracle, Google, CopilotKit (AG-UI 통합) |

**핵심 구성요소:**

```
Agent Spec
├── Agent Definition          # 단독 에이전트 정의
│   ├── name, description
│   ├── model, system_prompt
│   ├── tools[]               # 도구 목록
│   └── guardrails[]          # 안전장치
├── Workflow Definition       # 구조화된 워크플로우
│   ├── steps[]               # DAG 기반 실행 단계
│   ├── transitions[]         # 조건부 전환
│   └── error_handling        # 에러 처리 전략
├── Multi-Agent Composition   # 멀티에이전트 합성
│   ├── orchestrator          # 오케스트레이터 패턴
│   ├── pipeline              # 순차 파이프라인
│   └── group_chat            # 그룹 대화
└── Serialization             # YAML/JSON + JSON Schema
```

**설계 원칙:**
- **ONNX 철학**: ML 모델이 ONNX로 프레임워크 간 이동하듯, 에이전트도 Agent Spec으로 이식
- **강타입**: JSON Schema 기반 유효성 검증
- **모듈화**: 에이전트, 도구, 워크플로우를 독립 컴포넌트로 정의
- **제어/데이터 흐름 분리**: 오케스트레이션 로직과 데이터 파이프라인 분리

### 2.2 Foundry-X 현재 구현 비교

| 영역 | Agent Spec | Foundry-X (F221) | GAP |
|------|-----------|-------------------|-----|
| **에이전트 정의** | name, model, system_prompt, tools, guardrails | name, persona, systemPrompt, allowedTools, dependencies | 유사 — guardrails 없음 |
| **직렬화** | YAML/JSON + JSON Schema | YAML/JSON + Zod (OpenAPI) | 동등 수준 |
| **도구 정의** | 도구 스키마 + 실행 바인딩 | allowedTools (문자열 목록만) | **큰 GAP** — 도구 스키마 없음 |
| **워크플로우** | DAG, transitions, error_handling | 없음 (코드 기반 오케스트레이션) | **핵심 GAP** — 선언적 워크플로우 미지원 |
| **멀티에이전트** | orchestrator, pipeline, group_chat | custom_agent_roles + runner | **GAP** — 합성 패턴 없음 |
| **커스터마이징** | guardrails, 정책 분리 | customization (key-value) | 부분적 |
| **메뉴/UI** | AG-UI 프로토콜 통합 | menu_config (액션 목록) | 부분적 |

### 2.3 호환 가능 영역

1. **에이전트 정의 Export**: `AgentDefinitionSchema` → Agent Spec YAML 변환 가능 (필드 매핑 90%+)
2. **도구 목록**: `allowedTools` → Agent Spec `tools[]` 변환 시 스키마 추가 필요
3. **YAML 포맷**: 양쪽 모두 YAML 기반 — 구문 레벨 호환

### 2.4 비호환 영역

1. **워크플로우 정의**: Foundry-X에 선언적 워크플로우 레이어 없음 → 전면 신규 개발 필요
2. **가드레일**: 안전장치 개념 자체가 없음 → 에이전트 보안 모델 설계 선행 필요
3. **도구 스키마**: 도구의 입출력 타입 정의 없음 → MCP 도구 정의 표준과 조율 필요
4. **멀티에이전트 합성**: 코드 기반 오케스트레이션 → 선언적 전환 시 대규모 리팩토링

### 2.5 관찰 포인트

| # | 트리거 조건 | 대응 액션 | 재판정 시점 |
|---|-----------|----------|------------|
| 1 | Agent Spec v1.0 정식 릴리스 + 3개 이상 주요 프레임워크 채택 | Export 어댑터 개발 검토 | 2026-09 |
| 2 | AG-UI 프로토콜 안정화 + 실사용 사례 3건+ | UI 통합 검토 | 2026-09 |
| 3 | Foundry-X 에이전트가 외부 시스템과 교류 필요 발생 | Import/Export 파이프라인 우선 개발 | 즉시 |
| 4 | Oracle 외 주요 벤더(Microsoft, Google 독자 참여) 채택 | 표준 채택 격상 (Watch → Reference) | 2026-12 |

**추천 등급: Watch 유지** — 2025.10 발표 후 약 5개월, 아직 초기 단계. Oracle 자체 제품 채택은 시작했으나 범용 생태계 형성 미흡.

---

## 3. F230: BMAD Scale-Adaptive Intelligence

### 3.1 기술 현황

| 항목 | 값 |
|------|---|
| **프로젝트** | BMAD Method (Build More Architect Dreams) |
| **소스** | github.com/bmad-code-org/BMAD-METHOD |
| **도입 버전** | v6 |
| **핵심 목표** | 프로젝트 규모에 따른 개발 프로세스 자동 조절 |
| **NPM** | bmad-method (공개) |

**Scale-Adaptive 동작 원리:**

```
프로젝트 입력 → 규모 감지 엔진 → 복잡도 등급 산출 → 프로세스 깊이 조절
                    │                      │                    │
              LOC, 의존성 수,        Quick Fix /         에이전트 수 조절
              파일 구조 분석        Standard /          문서 깊이 조절
                                   Enterprise           워크플로우 단계 조절
```

**규모별 프로세스 차이:**

| 규모 | 에이전트 | 문서 | 리뷰 |
|------|---------|------|------|
| **Quick Fix** | 1~2명 (Developer + Tester) | 변경 노트만 | 자동 |
| **Standard Feature** | 5~8명 (PM, Architect, Dev, QA 등) | Plan + Design | 동료 리뷰 |
| **Enterprise Platform** | 15~21명 (전체 팀) | 풀 PDCA + 아키텍처 리뷰 | 크로스팀 리뷰 |

### 3.2 Foundry-X 현재 구현 비교

| 영역 | BMAD | Foundry-X | GAP |
|------|------|-----------|-----|
| **규모 감지** | LOC + 의존성 + 파일 구조 자동 분석 | `RepoProfile` (언어/프레임워크/빌드도구) | **GAP** — 복잡도 등급 산출 없음 |
| **프로세스 조절** | 3단계 자동 조절 (Quick/Standard/Enterprise) | 단일 프로세스 (항상 풀 PDCA) | **핵심 GAP** — 적응 메커니즘 없음 |
| **에이전트 할당** | 규모별 에이전트 수/역할 자동 결정 | `custom_agent_roles` 수동 할당 | **GAP** — 자동 할당 없음 |
| **문서 깊이** | 규모별 필수 문서 차등 | 항상 동일 템플릿 | **GAP** — 적응형 템플릿 없음 |
| **토큰 최적화** | Document sharding 자동 적용 | F223 Document Sharding 구현 완료 | 동등 수준 |
| **Health Score** | 없음 (프로세스 깊이로 대체) | Triangle Health Score (Spec-Code-Test) | **Foundry-X 우위** |

### 3.3 적용 가능 시나리오

**단기 (현재 코드 기반):**
- `RepoProfile.architecturePattern`에 복잡도 등급 필드 추가 가능
- `health-score.ts` 결과와 연계하여 프로세스 깊이 추천 가능

**중기 (Phase 2+ 멀티스케일 지원 시):**
- `harness/analyze.ts` 확장 → LOC/의존성/파일 수 기반 복잡도 자동 산출
- PDCA 템플릿 3종 (Quick/Standard/Enterprise) 분리
- Sprint 자동 크기 조절 (1 F-item vs 4 F-items)

**장기:**
- 에이전트 풀에서 규모별 자동 할당 (오케스트레이션 레이어)
- 팀 규모/역량에 따른 동적 프로세스 조절

### 3.4 관찰 포인트

| # | 트리거 조건 | 대응 액션 | 재판정 시점 |
|---|-----------|----------|------------|
| 1 | Foundry-X 사용 프로젝트 3개+ (규모 다양) | 복잡도 등급 필드 추가 검토 | Phase 2 시작 시 |
| 2 | 소형 프로젝트에서 풀 PDCA가 과도하다는 피드백 3건+ | Quick Fix 프로세스 도입 | 즉시 |
| 3 | 에이전트 자동 할당 요구 발생 | Scale-Adaptive 엔진 본격 설계 | Phase 3 |
| 4 | BMAD v7+ 릴리스 | 업데이트된 패턴 재벤치마킹 | 2026-12 |

**추천 등급: Watch 유지** — 개념은 매력적이나, Foundry-X 사용자 풀이 아직 작아(6명 내부) 규모별 차등 프로세스의 ROI가 불분명.

---

## 4. F231: OpenSpec Multi-repo Workspace

### 4.1 기술 현황

| 항목 | 값 |
|------|---|
| **프로젝트** | OpenSpec (YC-backed) |
| **소스** | github.com/Fission-AI/OpenSpec |
| **핵심 목표** | Spec-Driven Development를 복수 저장소로 확장 |
| **현재 상태** | Multi-repo 기능 개발 중 (2026 예정) |
| **사이트** | openspec.dev |

**Multi-repo Workspace 아키텍처:**

```
Organization Workspace
├── Spec Repository (독립)     # specs/{capability}/spec.md
│   ├── frontend-specs/
│   ├── backend-specs/
│   └── shared-specs/
├── Frontend Repository        # 코드 + spec 참조 링크
├── Backend Repository         # 코드 + spec 참조 링크
├── Infrastructure Repository  # IaC + spec 참조 링크
└── Agent Awareness Layer      # 어떤 spec이 어떤 repo에 영향을 미치는지 매핑
```

**핵심 과제 (OpenSpec 공개 이슈):**
- **Spec 위치**: 독립 spec 리포 vs 코드 리포 내 공존 → 하이브리드 모델 개발 중
- **에이전트 인식**: 에이전트가 spec 변경 시 관련 코드 리포를 자동 식별
- **계층적 spec**: 현재 flat 구조(`specs/`)에서 도메인/팀/네임스페이스 계층 지원 필요 (Issue #662)
- **크로스 리포 변경**: 단일 feature가 여러 리포에 걸쳐 변경 필요 시 조율

### 4.2 Foundry-X 현재 구현 비교

| 영역 | OpenSpec Multi-repo | Foundry-X | GAP |
|------|-------------------|-----------|-----|
| **리포 범위** | 조직 전체 복수 리포 | 단일 리포 (`simple-git`) | **핵심 GAP** — 멀티리포 미지원 |
| **Spec 관리** | 독립 spec 리포 + 코드 리포 매핑 | SPEC.md 단일 파일 | **GAP** — 분산 spec 미지원 |
| **에이전트 인식** | 크로스 리포 spec→code 매핑 | 단일 리포 내 매핑 | **GAP** |
| **변경 추적** | 크로스 리포 변경 세트 | `changes/` 디렉토리 (F222, 단일 리포) | **GAP** |
| **계층적 조직** | 도메인/팀/네임스페이스 계층 | F-item flat 번호 체계 | **GAP** |
| **SDD 철학** | Spec-Driven Development | "Git이 진실" + SDD Triangle | **공통 기반** |

### 4.3 확장 경로

**단기 (모노리포 유지 중):**
- 현재 모노리포 전략 유지 — 멀티리포 전환 필요 없음
- `packages/` 구조가 이미 모듈 분리를 제공

**중기 (조직 확장 시):**
1. `RepoProfile`에 `repositories: RepoRef[]` 필드 추가
2. `simple-git` 래퍼를 멀티리포 지원 서비스로 추상화
3. SPEC.md의 F-item에 리포 참조 컬럼 추가
4. 크로스 리포 `changes/` 동기화 메커니즘

**장기 (엔터프라이즈):**
- 독립 spec 리포 + 코드 리포 매핑 레이어
- 조직 단위 대시보드 (복수 Foundry-X 인스턴스 연합)
- 크로스 리포 SDD Triangle Health Score

### 4.4 관찰 포인트

| # | 트리거 조건 | 대응 액션 | 재판정 시점 |
|---|-----------|----------|------------|
| 1 | Foundry-X 적용 리포 3개+ (같은 조직 내) | 멀티리포 워크스페이스 MVP 검토 | 즉시 |
| 2 | OpenSpec multi-repo 기능 GA 릴리스 | 아키텍처 재벤치마킹 | 2026 하반기 |
| 3 | 모노리포 → 멀티리포 분리 결정 | `simple-git` 추상화 레이어 설계 | 분리 결정 시 |
| 4 | 조직 간 Foundry-X 공유 요구 | 연합 워크스페이스 설계 | Phase 3+ |

**추천 등급: Watch 유지** — Foundry-X는 현재 단일 모노리포 전용. 멀티리포 필요성은 조직 확장 시 발생할 것이나, 현재 6명 내부 사용자 규모에서는 과도.

---

## 5. 종합 비교 매트릭스

| 차원 | F229 Agent Spec | F230 Scale-Adaptive | F231 Multi-repo |
|------|----------------|--------------------|-----------------|
| **성숙도** | 초기 (2025.10~) | 성숙 (BMAD v6) | 개발 중 (2026) |
| **Foundry-X GAP** | 중간 (에이전트 정의 유사, 워크플로우 GAP) | 큰 (적응 메커니즘 전무) | 큰 (단일 리포 전제) |
| **채택 긴급도** | 낮음 (표준 형성 중) | 중간 (사용자 증가 시 필요) | 낮음 (모노리포 유지 중) |
| **구현 복잡도** | 중간 (Export 어댑터) | 높음 (프로세스 엔진 전체 변경) | 매우 높음 (아키텍처 변경) |
| **선행 조건** | F221 Agent-as-Code 완료 ✅ | 사용자 풀 확대 | 멀티리포 전환 결정 |
| **추천 등급** | Watch 유지 | Watch 유지 | Watch 유지 |
| **재판정** | 2026-09 | Phase 2 시작 시 | 2026 하반기 |

## 6. 산출물 목록

Watch 항목이므로 코드 구현은 최소화하고, 벤치마킹 결과를 코드레벨에서 참조 가능하도록 한다.

### 6.1 타입 스텁 (packages/shared/src/types.ts)

```typescript
// ─── F229: Agent Spec 호환성 타입 (Watch — 향후 Export 어댑터 개발 시 사용) ───

/** Oracle Agent Spec 호환 에이전트 정의 (최소 매핑) */
export interface AgentSpecCompat {
  name: string;
  description?: string;
  model?: string;
  system_prompt: string;
  tools?: AgentSpecTool[];
  guardrails?: string[];
}

/** Agent Spec 도구 정의 (스키마 포함) */
export interface AgentSpecTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

// ─── F230: Scale-Adaptive 복잡도 등급 (Watch — 향후 프로세스 조절 시 사용) ───

/** 프로젝트 복잡도 등급 (BMAD 참고) */
export type ProjectComplexity = 'quick-fix' | 'standard' | 'enterprise';

/** 복잡도 감지 결과 */
export interface ComplexityAssessment {
  grade: ProjectComplexity;
  factors: {
    loc: number;
    dependencies: number;
    fileCount: number;
    moduleCount: number;
  };
  recommendedAgentCount: number;
  recommendedDocDepth: 'minimal' | 'standard' | 'full';
}

// ─── F231: Multi-repo 참조 타입 (Watch — 향후 멀티리포 지원 시 사용) ───

/** 리포지토리 참조 */
export interface RepoRef {
  name: string;
  url: string;
  role: 'primary' | 'spec' | 'infrastructure' | 'shared';
  branch?: string;
}

/** 멀티리포 워크스페이스 (향후 확장) */
export interface WorkspaceConfig {
  name: string;
  repositories: RepoRef[];
  specRepository?: string;  // 독립 spec 리포 이름
}
```

### 6.2 SPEC.md 비고 컬럼 갱신

F229~F231의 비고 컬럼에 벤치마킹 결과 요약과 재판정 시점을 추가한다.

### 6.3 벤치마킹 참고 문서

본 Design 문서가 벤치마킹 보고서 역할을 겸한다.
`docs/02-design/features/sprint-78.design.md` 단일 파일에 3건 분석 모두 포함.

## 7. Executive Summary

| 항목 | 값 |
|------|---|
| **Feature** | F229+F230+F231 (Watch 3건) |
| **Sprint** | 78 |
| **분석 대상** | Oracle Agent Spec / BMAD Scale-Adaptive / OpenSpec Multi-repo |
| **결론** | 3건 모두 Watch 유지, 재판정 2026-09~12 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 외부 에이전트 표준/패턴 빠른 진화 vs Foundry-X 관찰 체계 부재 |
| **Solution** | 3건 벤치마킹 — 기술 현황, GAP, 호환성, 관찰 트리거 체계적 정리 |
| **Function UX Effect** | 향후 채택 결정 시 Design 문서 참조로 즉시 판단 가능 |
| **Core Value** | 기술 부채 예방 + 생태계 변화 선제 대응 체계 구축 |
