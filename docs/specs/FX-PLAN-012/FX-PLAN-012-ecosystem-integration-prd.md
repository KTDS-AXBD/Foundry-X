# FX-PLAN-012: BMAD/OpenSpec 통합 반영 계획

> **Document ID**: FX-PLAN-012  
> **Version**: v1.0  
> **Date**: 2026-03-26  
> **Author**: AX BD팀  
> **Status**: Draft  
> **Phase**: Phase 6 (Ecosystem Integration)

---

## §1 요약 (Executive Summary)

**Foundry-X**는 AI 에이전트 시대의 조직 협업 플랫폼으로, 인간과 AI 에이전트가 동등한 팀원으로 협업하는 환경을 목표로 한다. 본 PRD는 외부 오픈소스 프레임워크인 **BMAD Method**(42k★, Agent-as-Code 기반 애자일 AI 개발 프레임워크)와 **OpenSpec**(24k★, YC 백드 SDD 스펙 프레임워크)을 벤치마킹하여, Foundry-X에 적극 수용(Adopt) 4건, 참고(Reference) 5건, 장기 관찰(Watch) 3건의 개선 항목을 정의한다.

**핵심 목표**: Foundry-X의 SDD Triangle과 Harness Engineering을 업계 베스트 프렉티스로 보강하여, 에이전트 컨텍스트 파악률 30% 향상, 변경 추적 정확도 90%+ 달성, 에이전트 온보딩 시간 50% 단축을 목표로 한다.

---

## §2 배경 및 동기 (Background & Motivation)

### 2.1 벤치마킹 대상

| 항목 | BMAD Method | OpenSpec (Fission) | Foundry-X (현재) |
|------|-------------|-------------------|-----------------|
| 핵심 철학 | Agent-as-Code 페르소나 | Spec이 코드의 영혼 | Git이 진실, FX는 렌즈 |
| 에이전트 모델 | 12+ 전문 에이전트 (YAML→MD 컴파일) | 에이전트 비종속 (20+ AI 도구 통합) | 7+ 빌트인 에이전트 (오케스트레이터 패턴) |
| SSOT 전략 | PRD + Architecture + Story 파일 핸드오프 | openspec/ 폴더 in Git (specs/ + changes/) | Git 저장소 SSOT, SDD Triangle 동기화 |
| 워크플로우 | Analyst→PM→Arch→SM→Dev→QA 순환 | propose→design→apply→archive | PDCA 기반, Agent Teams 병렬 |
| 변경 관리 | Story 파일 기반, SM→Dev 컨텍스트 전달 | changes/ 디렉토리, spec delta 추적 | PR 7-gate 자동 머지, Match Rate 기반 |
| GitHub 스타 | 42,100+ | 23,800+ | (내부 프로젝트) |

### 2.2 벤치마킹 핵심 발견

1. **BMAD Method** — 에이전트를 YAML으로 선언적 정의하고 IDE용 마크다운으로 컴파일하는 Agent-as-Code 패러다임을 확립. SM→Dev→QA 순환 워크플로우와 Expansion Packs 모듈 시스템을 통해 도메인 확장성을 보장한다.

2. **OpenSpec (Fission-AI)** — 코드 작성 전에 스펙을 먼저 정의하는 SDD(Spec-Driven Development) 프레임워크. Brownfield-first 철학, changes/ 디렉토리 패턴, 20+ AI 도구 통합으로 기존 코드베이스에서의 활용을 우선한다.

3. **Oracle Open Agent Specification** — 프레임워크 비종속 선언형 에이전트 정의 표준. ONNX가 ML 모델 호환성을 해결한 것처럼 에이전트 수준의 상호운용성을 목표로 한다. Foundry-X Phase 3+ 이식성 관점에서 장기 참고 대상.

---

## §3 요구사항 (Requirements)

### 3.1 적극 수용 (Adopt) — 4건

#### A1. Structured Changes Directory 패턴

| 항목 | 값 |
|------|-----|
| F-item | FX-REQ-171 |
| Priority | **P1** |
| 출처 | OpenSpec (Fission-AI) |
| FX 매핑 | SDD Triangle, `foundry-x sync` |

**설명**: OpenSpec의 `changes/` 디렉토리 패턴을 Foundry-X에 도입한다. 각 기능 변경별로 `proposal.md`, `design.md`, `tasks.md`, `spec-delta.md`를 하나의 변경 디렉토리에 묶어 관리하며, `foundry-x sync` 시 spec delta를 자동 감지하여 Triangle Health Score에 반영한다.

**수용 근거**: 현재 `docs/` 하위에 산재된 변경 추적을 구조화하면 에이전트의 컨텍스트 파악이 크게 개선된다. SDD Triangle과 자연스럽게 매핑되며, 기존 PDCA 문서 체계와 병행 가능하다.

**인수 조건**:
- `foundry-x sync`가 `changes/` 디렉토리의 `spec-delta.md`를 자동 감지
- Triangle Health Score에 Δspec 반영 (Δ미반영 시 score 감점)
- 기존 PDCA 문서와 `changes/` 간 충돌 없음 검증

---

#### A2. Agent-as-Code 선언적 정의 레이어

| 항목 | 값 |
|------|-----|
| F-item | FX-REQ-172 |
| Priority | **P1** |
| 출처 | BMAD Method v6 |
| FX 매핑 | Custom Role Manager (F146), Agent Marketplace (F152) |

**설명**: BMAD의 `.agent.yaml` → `.md` 컴파일 패턴을 참고하여, Foundry-X 에이전트를 YAML/JSON으로 선언적 정의할 수 있는 레이어를 추가한다. `custom_agent_roles` D1 테이블 스키마를 확장하여 `metadata`, `persona`, `customization`, `dependencies` 필드를 추가한다.

**수용 근거**: 현재 TypeScript 서비스 클래스로 하드코딩된 에이전트를 선언적 정의로 분리하면, 커스텀 에이전트 생성과 마켓플레이스 배포가 용이해진다.

---

#### A3. Brownfield-first Init 강화

| 항목 | 값 |
|------|-----|
| F-item | FX-REQ-173 |
| Priority | **P0** |
| 출처 | OpenSpec (Fission-AI) |
| FX 매핑 | PRD v4 Brownfield/Greenfield init 분기 |

**설명**: OpenSpec의 `project.md` 패턴을 참고하여, `foundry-x init` 시 기존 코드베이스 자동 스캔(tech stack, 파일 구조, 기존 스펙) 결과를 `project-context.md`로 생성하는 기능을 강화한다. 첫 타겟(KT DS SM 변경 요청 처리)이 전형적인 Brownfield이므로 P0.

**수용 근거**: KT DS SM 변경 요청 처리 자동화가 첫 타겟 유스케이스이며, 이는 기존 코드베이스에 Foundry-X를 도입하는 전형적 Brownfield 시나리오이다.

**인수 조건**:
- Tech Stack 자동 감지: `package.json`, `requirements.txt`, `Dockerfile` 등에서 주요 기술 + 버전 추출
- 기존 스펙 스캔: `README`, `docs/`, 기존 ADR 등을 파싱하여 `project-context.md` 자동 생성
- 파일 구조 분석: 디렉토리 트리에서 모듈/레이어 자동 인식 → `ARCHITECTURE.md` 초안 생성

---

#### A4. 문서 Sharding 자동화

| 항목 | 값 |
|------|-----|
| F-item | FX-REQ-174 |
| Priority | **P2** |
| 출처 | BMAD Method v6 |
| FX 매핑 | `foundry-x init`, 에이전트 컨텍스트 관리 |

**설명**: BMAD의 `shard-doc` 태스크를 참고하여, `foundry-x init` 시 대형 스펙 문서(PRD 등)를 에이전트별 관련 섹션만 참조하도록 자동 분할한다. PRD v8이 이미 상당히 커졌으므로, 에이전트 컨텍스트 윈도우 한계를 고려하면 실용적이다.

---

### 3.2 참고 (Reference) — 5건

| ID | 항목 | 출처 | FX 매핑 | 활용 방안 |
|----|------|------|---------|-----------|
| R1 | SM→Dev 컨텍스트 전달 구조 | BMAD | Sprint 워크플로우 F142 | Story 파일 컨텍스트 전달 방식 참고 |
| R2 | 슬래시 커맨드 UX | OpenSpec | Phase 2 MCP/IDE 통합 | `/opsx:` 커맨드 패턴, IDE 통합 시 참고 |
| R3 | Party Mode (다중 에이전트 세션) | BMAD | Ensemble Voting F147 | 자유형 토론 방식 보완적 참고 |
| R4 | Spec Library 구조 | OpenSpec | Wiki 동기화 F46 | 기능 단위 스펙 조직 방식 참고 |
| R5 | Expansion Packs 모델 | BMAD | Agent Marketplace F152 | 패키징/배포 방식 참고 |

### 3.3 장기 관찰 (Watch) — 3건

| ID | 항목 | 출처 | 검토 시점 | 비고 |
|----|------|------|-----------|------|
| W1 | Agent Spec 표준 | Oracle | Phase 3+ 에이전트 이식성 | YAML/JSON 내보내기 포맷 검토 |
| W2 | Scale-Adaptive Intelligence | BMAD | Phase 2+ 멀티스케일 지원 | 프로젝트 규모별 자동 조절 |
| W3 | Multi-repo Workspace | OpenSpec | 조직 전체 복수 저장소 확장 | 모노리포 넘어선 확장 시 필요 |

---

## §4 기술 설계 (Technical Design)

### 4.1 Changes Directory 구조 (A1)

OpenSpec의 `openspec/changes/` 패턴을 Foundry-X 컨벤션에 맞게 조정한다:

```
foundry-x/changes/{feature-name}/
├── proposal.md      — 변경 목적, 영향 범위, 승인 기준
├── design.md        — 기술 설계 결정사항 (ADR 경량판)
├── tasks.md         — 구현 체크리스트 (에이전트 실행 단위)
└── spec-delta.md    — 이 변경으로 인해 바뀌는 스펙 항목 목록
```

**통합 포인트**: `foundry-x sync` 시 `SpecParserService`가 `changes/` 디렉토리를 스캔하여 미반영 `spec-delta`를 감지하고, Triangle Health Score 계산에 Δspec 가중치를 반영한다. 완료된 변경은 `changes/archive/`로 이동.

### 4.2 Agent Definition Schema 확장 (A2)

기존 `custom_agent_roles` D1 테이블에 BMAD 스타일의 필드를 추가:

- `persona`: identity, communication_style, principles (YAML/JSON)
- `dependencies`: 참조 templates, tasks, checklists 목록
- `customization`: systemPromptOverride, 허용/차단 섹션 목록
- `menu`: 에이전트가 제공하는 커맨드/워크플로우 목록

**통합 포인트**: D1 migration 신규 테이블 또는 `custom_agent_roles` 컬럼 확장. Agent Marketplace(F152)의 publish/install 시 이 스키마를 활용하여 에이전트 이식성 보장.

### 4.3 Brownfield Init 강화 (A3)

`foundry-x init`의 Discover 단계에 다음 기능 추가:

- **Tech Stack 자동 감지**: `package.json`, `requirements.txt`, `Dockerfile` 등에서 주요 기술 + 버전 추출
- **기존 스펙 스캔**: `README`, `docs/`, 기존 ADR 등을 파싱하여 `project-context.md` 자동 생성
- **파일 구조 분석**: 디렉토리 트리에서 모듈/레이어 자동 인식 → `ARCHITECTURE.md` 초안 생성

**통합 포인트**: CLI `packages/cli/src/harness/discover.ts` 확장. 기존 `RepoProfile` 타입에 `techStack`, `existingSpecs`, `fileStructureHints` 필드 추가.

### 4.4 문서 Sharding (A4)

BMAD의 `shard-doc` 태스크를 참고하여, **에이전트별 관련 섹션만 참조하도록** 문서를 자동 분할한다. 예: `ArchitectAgent`는 PRD의 아키텍처 섹션만, `SecurityAgent`는 보안 요구사항 섹션만 참조.

---

## §5 성공 지표 (Success Metrics)

| ID | 지표 | 목표 | 측정 방법 | 매핑 F-item |
|----|------|------|-----------|-------------|
| K13 | 에이전트 컨텍스트 파악률 | ≥30% 향상 | sync 시 Δspec 반영률 | A1 (FX-REQ-171) |
| K14 | 변경 추적 정확도 | ≥90% | changes/ ↔ 코드 정합성 | A1 (FX-REQ-171) |
| K15 | 에이전트 온보딩 시간 | ≥50% 단축 | init → 첫 산출물 시간 | A3 (FX-REQ-173) |
| K16 | 커스텀 에이전트 생성 시간 | ≤30분 | YAML 정의 → 작동 | A2 (FX-REQ-172) |

---

## §6 실행 계획 (Execution Plan)

| Sprint | Priority | F-item | 작업 내용 | 산출물 |
|--------|----------|--------|-----------|--------|
| Sprint 48 | P0 | FX-REQ-173 | A3: Brownfield-first init 강화 | `discover.ts` 확장, `project-context.md` 생성기 |
| Sprint 49 | P1 | FX-REQ-171 | A1: changes/ 디렉토리 패턴 | `SpecParserService` 확장, Triangle Score Δspec 반영 |
| Sprint 50 | P1 | FX-REQ-172 | A2: Agent-as-Code 선언적 정의 | D1 스키마 확장, YAML → 에이전트 로더 |
| Sprint 51+ | P2 | FX-REQ-174 | A4: 문서 Sharding | `shard-doc` 서비스, 에이전트별 컨텍스트 분배 |

---

## §7 제약조건 및 관심사 (Constraints & Considerations)

### 7.1 불변 제약

- **Git이 SSOT**: 이 원칙은 변경되지 않는다. `changes/` 디렉토리도 Git에서 관리된다.
- **자동 커밋 절대 금지**: `changes/` 생성도 에이전트가 작성하되 사람이 확인 후 커밋.
- **Phase 1 CLI 3개 커맨드 범위 유지**: 신규 커맨드 추가 없이 기존 `init/sync/status` 확장으로 구현.

### 7.2 위험 요소

- **BMAD/OpenSpec과의 철학적 차이**: Foundry-X는 조직 협업 플랫폼이고, BMAD는 개발 프레임워크, OpenSpec은 스펙 관리 도구이다. 이식 시 컨텍스트 조정 필수.
- **기존 PDCA 문서 체계와의 병행**: `changes/`와 `docs/01-plan ~ 04-report` 간 역할 중복 방지 필요.
- **Agent-as-Code YAML의 표현력 한계**: 복잡한 에이전트 로직을 YAML만으로 표현하는 것의 한계. TypeScript 서비스와 하이브리드 방식 필요.

### 7.3 Open Questions

| ID | 질문 | 해결 방향 |
|----|------|-----------|
| Q15 | `changes/`와 기존 PDCA 문서 체계의 역할 분담은? | changes/ = 실시간 변경 추적, PDCA = Sprint 단위 공식 보고 |
| Q16 | Agent YAML 정의의 스키마 버전 관리는? | `agent-schema-v1.json` 정의 후 SemVer 적용 |
| Q17 | 문서 Sharding의 최적 청크 크기는? | 에이전트 컨텍스트 윈도우 A/B 테스트로 결정 |

---

## §8 변경 이력 (Revision History)

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1.0 | 2026-03-26 | 초안 작성 — BMAD Method / OpenSpec (Fission-AI) / Oracle Agent Spec 벤치마킹, 수용 4건 + 참고 5건 + 관찰 3건 정의 |
