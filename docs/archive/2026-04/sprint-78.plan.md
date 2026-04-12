---
code: FX-PLAN-078
title: "Sprint 78 — F229 Agent Spec 표준 + F230 Scale-Adaptive + F231 Multi-repo Workspace [Watch]"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-REQ-221]] Agent Spec 표준 (Watch)"
  - "[[FX-REQ-222]] Scale-Adaptive Intelligence (Watch)"
  - "[[FX-REQ-223]] Multi-repo Workspace (Watch)"
  - "[[FX-PLAN-012]] Phase 6 Ecosystem Integration"
---

# Sprint 78 Plan — Watch 항목 3건 벤치마킹

## 1. 목표

Phase 6 Ecosystem Integration의 마지막 Sprint로, 장기 관찰 대상 3건의 벤치마킹 리서치를 수행한다.
각 기술/표준의 현재 성숙도, Foundry-X 적용 가능성, 관찰 트리거 조건을 문서화한다.

### 1.1 Watch 항목 정의

Watch 항목은 **즉시 구현하지 않지만**, 생태계 변화에 따라 향후 채택할 수 있는 기술/패턴이다.
산출물은 코드가 아닌 **벤치마킹 보고서 + 관찰 포인트 + 타입 스텁(선택)**이다.

### 1.2 Background

- **Phase 6 PRD**: FX-PLAN-012 — BMAD/OpenSpec 벤치마킹 기반 Ecosystem Integration
- Sprint 75~76에서 Adopt 4건(F220~F223) 구현 완료
- Sprint 77에서 Reference 5건(F224~F228) 설계 참고 문서화 완료(예정)
- Sprint 78은 P4 Watch 3건으로 Phase 6를 마무리

## 2. 범위

### 2.1 In-Scope

#### F229: Agent Spec 표준 — Oracle Open Agent Specification (FX-REQ-221, P4)

| 항목 | 설명 |
|------|------|
| **표준 분석** | Oracle Agent Spec의 YAML/JSON 선언 구조, 타입 시스템, 워크플로우 정의 방식 분석 |
| **호환성 평가** | Foundry-X `custom_agent_roles` + F221 Agent-as-Code YAML과의 구조적 비교 |
| **이식성 검토** | Agent Spec 포맷으로 내보내기/가져오기 가능성, 매핑 테이블 |
| **관찰 포인트** | 채택 트리거 조건 + 재판정 시점 정의 |

#### F230: Scale-Adaptive Intelligence — BMAD 프로젝트 규모별 조절 (FX-REQ-222, P4)

| 항목 | 설명 |
|------|------|
| **패턴 분석** | BMAD v6의 프로젝트 규모 자동 감지 → 프로세스 깊이 조절 메커니즘 분석 |
| **현재 상태 비교** | Foundry-X의 현재 harness analyze + health-score 기반 적응 방식과 비교 |
| **적용 시나리오** | 버그 수정 vs 신규 기능 vs 대규모 아키텍처 — 각 시나리오별 적용 가능성 |
| **관찰 포인트** | Phase 2+ 멀티스케일 지원 시 참고 기준 정의 |

#### F231: Multi-repo Workspace — OpenSpec 복수 저장소 확장 (FX-REQ-223, P4)

| 항목 | 설명 |
|------|------|
| **아키텍처 분석** | OpenSpec의 multi-repo workspace 모델, spec 저장소 분리, 에이전트 인식 방식 |
| **현재 제약** | Foundry-X 모노리포 전제 (`simple-git` 단일 리포) 분석 |
| **확장 경로** | 모노리포 → 멀티리포 전환 시 필요한 변경 범위 추정 |
| **관찰 포인트** | 조직 확장 시 멀티리포 전환 트리거 조건 정의 |

### 2.2 Out-of-Scope

- Agent Spec 런타임 구현 (Watch 단계에서는 분석만)
- Scale-Adaptive 자동 감지 엔진 개발 (향후 Phase에서 검토)
- Multi-repo 지원 코드 구현 (모노리포 유지 중)
- 타 벤치마킹 대상 추가 조사

## 3. 기술 접근

### 3.1 리서치 방법론

각 Watch 항목에 대해 동일한 4단계 분석을 수행한다:

```
1. 기술 현황 조사 (웹 리서치 + 공식 문서)
2. Foundry-X 현재 구현과 비교 (코드베이스 분석)
3. GAP/기회 식별 (호환 가능 영역 + 비호환 영역)
4. 관찰 포인트 정의 (트리거 조건 + 재판정 시점)
```

### 3.2 산출물

| 산출물 | 형식 | 위치 |
|--------|------|------|
| 벤치마킹 보고서 | Markdown | `docs/02-design/features/sprint-78.design.md` |
| 관찰 포인트 요약 | SPEC.md 비고 컬럼 갱신 | `SPEC.md` F229~F231 |
| 타입 스텁 (선택) | TypeScript 인터페이스 | `packages/shared/types.ts` (필요 시) |

### 3.3 F229 — Agent Spec 표준 조사 범위

**Oracle Open Agent Specification** (oracle/agent-spec):
- 프레임워크 비종속 선언적 언어
- YAML/JSON 직렬화 + JSON Schema 강타입
- 단독 에이전트 + 구조화된 워크플로우 + 멀티에이전트 합성
- AG-UI 프로토콜 통합 (Oracle + Google + CopilotKit 공동)
- PyAgentSpec 26.2.0 런타임 (Python)

**비교 대상** (Foundry-X 현재):
- F221 Agent-as-Code: `.agent.yaml` 자체 포맷 (BMAD 참고)
- `custom_agent_roles` D1 테이블 + `agent-definition-loader.ts`
- YAML 파서 + Import/Export API

### 3.4 F230 — Scale-Adaptive 조사 범위

**BMAD v6 Scale-Adaptive Intelligence**:
- 프로젝트 규모 자동 감지 (LOC, 복잡도, 의존성 수)
- 버그 수정 → 경량 워크플로우, 엔터프라이즈 → 풀 세레모니
- 21개 전문 에이전트 역할별 활성화 조절
- Document sharding으로 토큰 최적화

**비교 대상** (Foundry-X 현재):
- `harness/analyze.ts` — RepoProfile 생성 (언어/프레임워크/빌드도구)
- `health-score.ts` — Triangle Health Score (Spec-Code-Test 동기화율)
- 단일 프로세스 깊이 (규모별 조절 없음)

### 3.5 F231 — Multi-repo 조사 범위

**OpenSpec Multi-repo Workspace**:
- 복수 저장소에 걸친 spec 관리
- 독립 spec 저장소 + 코드 저장소 매핑
- 에이전트의 크로스 리포 인식
- 계층적 spec 조직 (도메인/팀/네임스페이스)

**비교 대상** (Foundry-X 현재):
- 모노리포 전제 (`simple-git` 단일 리포)
- SPEC.md 단일 파일에 모든 F-item
- 프로젝트 = 1 리포 매핑

## 4. 일정

| # | 단계 | 산출물 |
|---|------|--------|
| 1 | Plan (본 문서) | `sprint-78.plan.md` |
| 2 | Design (벤치마킹 보고서) | `sprint-78.design.md` — 3건 분석 + 관찰 포인트 |
| 3 | Implement | 타입 스텁 + SPEC.md 갱신 + 벤치마킹 참고 문서 |
| 4 | Analyze | Gap 분석 (Design vs 산출물) |
| 5 | Report | PDCA 완료 보고서 |

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Agent Spec 표준이 아직 초기 (2025.10 발표) | 분석 시점의 스냅샷만 가능 | 재판정 시점 명시 (6개월 후) |
| BMAD Scale-Adaptive 구현 세부사항 비공개 | 개념 수준 분석만 가능 | 공개 문서 + GitHub 소스 기반 |
| OpenSpec multi-repo는 개발 중 (2026 예정) | 미완성 기능 분석 | 로드맵 + 이슈 트래커 기반 |

## 6. Executive Summary

| 항목 | 값 |
|------|---|
| **Feature** | F229+F230+F231 (Watch 3건) |
| **Sprint** | 78 |
| **시작일** | 2026-03-30 |
| **유형** | 벤치마킹 리서치 (Watch) |
| **산출물** | 벤치마킹 보고서 + 관찰 포인트 + 타입 스텁(선택) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 외부 에이전트 표준/패턴이 빠르게 진화하나, Foundry-X의 관찰 체계가 없음 |
| **Solution** | 3건의 기술 트렌드를 구조적으로 분석하고 관찰 포인트를 정의 |
| **Function UX Effect** | 향후 채택 결정 시 즉시 참고 가능한 벤치마킹 자산 확보 |
| **Core Value** | 기술 부채 예방 — 생태계 변화에 선제적 대응 체계 구축 |
