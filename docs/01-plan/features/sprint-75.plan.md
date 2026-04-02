---
code: FX-PLAN-075
title: "Sprint 75 — Brownfield-first Init + Changes Directory (F220+F222)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Sprint 75 Planning Document

> **Summary**: Brownfield-first Init 강화(F220) + Structured Changes Directory(F222) — Phase 6 Ecosystem Integration 첫 Sprint
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | `foundry-x init`의 Brownfield 모드가 package.json 수준 감지에 머물러, 기존 코드베이스의 구조·스펙·문서를 깊이 파악하지 못한다. 또한 변경 사항을 추적하는 구조가 없어 Δspec과 SDD Triangle 연동이 불가능하다. |
| **Solution** | F220: discover.ts를 확장하여 디렉토리 구조·기존 스펙 파일·CI 설정을 깊이 스캔하고 `project-context.md`를 자동 생성한다. F222: OpenSpec `changes/` 패턴을 도입하여 변경별 proposal/design/tasks/spec-delta 묶음을 관리하고 sync 시 Δspec을 자동 감지한다. |
| **Function/UX Effect** | `foundry-x init`으로 기존 프로젝트에 진입하면 즉시 프로젝트 맥락을 파악할 수 있고, 변경 사항 추적이 체계화되어 Triangle Health Score가 변경 단위로 정밀해진다. |
| **Core Value** | OpenSpec/BMAD 벤치마킹의 첫 결실 — 에이전트가 기존 코드베이스에서 자율적으로 맥락을 획득하고, 변경 이력을 구조적으로 관리할 수 있는 기반을 마련한다. |

---

## 1. Overview

### 1.1 Purpose

Phase 6 Ecosystem Integration의 첫 Sprint로, CLI의 핵심 기능인 Init과 Sync를 OpenSpec/BMAD 패턴으로 강화한다.

1. **F220 (P0)**: Brownfield-first Init 강화 — 기존 코드베이스 자동 스캔 → `project-context.md` + 향상된 `ARCHITECTURE.md` 생성
2. **F222 (P1)**: Structured Changes Directory — `changes/` 디렉토리 규약 + Δspec 감지 + Triangle Health Score 반영

### 1.2 Background

- **Phase 5** 완료 (Sprint 74) — Agent Evolution, AX BD 통합, TDD 자동화
- **Phase 6 PRD**: FX-PLAN-012 — BMAD/OpenSpec 벤치마킹 기반 Ecosystem Integration
- **현재 discover.ts**: package.json 의존성에서 언어/프레임워크/빌드도구 감지 → RepoProfile 반환
- **OpenSpec 참고**: `changes/` 디렉토리 패턴으로 변경 단위별 구조적 관리

### 1.3 Related Documents

- PRD: `docs/specs/prd-v8-final.md` (v8: AI 에이전트 오케스트레이션 플랫폼)
- Phase 6 PRD: `docs/specs/FX-PLAN-012/` (Ecosystem Integration)
- SPEC.md F220, F222 정의

---

## 2. Scope

### 2.1 In Scope

#### F220: Brownfield-first Init 강화 (FX-REQ-212, P0)
- [ ] `RepoProfile` 타입 확장 — `existingDocs`, `directoryStructure`, `projectContext` 필드 추가
- [ ] `discover.ts` 확장 — 기존 스펙 파일 탐지 (README, ADR, CHANGELOG, SPEC, docs/)
- [ ] `discover.ts` 확장 — 디렉토리 구조 분석 (src/ 패턴, 모노리포 감지, 주요 디렉토리 역할 추론)
- [ ] `project-context-builder.ts` 신규 — `project-context.md` 생성 빌더
- [ ] `architecture-builder.ts` 강화 — 감지된 구조 기반 더 정밀한 ARCHITECTURE.md 초안
- [ ] `init.ts` 파이프라인에 project-context 생성 단계 추가
- [ ] 기존 테스트 확장 + 신규 테스트

#### F222: Structured Changes Directory (FX-REQ-214, P1)
- [ ] `ChangeEntry` 타입 정의 — proposal, design, tasks, specDelta 구조
- [ ] `changes-parser.ts` 신규 (CLI) — changes/ 디렉토리 파싱, 변경 목록 추출
- [ ] `changes-scanner.ts` 신규 (CLI) — Δspec 감지, 변경 상태 판별
- [ ] `sync.ts` 확장 — changes/ 스캔 결과를 SyncRunResult에 포함
- [ ] `health-score.ts` 확장 — 변경별 Triangle 점수 반영
- [ ] API `SpecParserService` 확장 — changes/ 구조 파싱 지원
- [ ] 신규 테스트 (changes-parser, changes-scanner, sync 통합)

### 2.2 Out of Scope

- OpenSpec `/opsx:` 커맨드 UX (F225, Sprint 77)
- Agent-as-Code YAML 정의 (F221, Sprint 76)
- D1 마이그레이션 (이번 Sprint에 DB 변경 없음)
- Web 대시보드 UI 변경

---

## 3. Technical Approach

### 3.1 F220: Brownfield-first Init 강화

**현재 파이프라인:**
```
Git Check → Detect Mode → Discover Stack → Analyze Architecture → Generate Harness → Verify → Save Config
```

**강화 후 파이프라인:**
```
Git Check → Detect Mode → Discover Stack (Enhanced) → Analyze Architecture → Discover Context (NEW) → Generate Harness (Enhanced) → Verify → Save Config
```

**핵심 변경:**

1. **RepoProfile 확장** (`packages/shared/src/types.ts`):
   ```typescript
   // 기존 필드 유지 + 추가
   existingDocs: DocFile[];          // 발견된 문서 파일들
   directoryStructure: DirNode[];    // 주요 디렉토리 트리
   projectContext: ProjectContext;    // 요약된 프로젝트 컨텍스트
   ```

2. **discover.ts 확장**: `discoverDocs()` + `discoverDirectoryStructure()` 함수 추가
   - README.md, CHANGELOG.md, ADR/, docs/, .github/ 등 탐지
   - src/ 하위 패턴 분석 (routes/, services/, components/ 등)

3. **project-context-builder.ts** (신규 빌더):
   - RepoProfile의 확장 데이터를 기반으로 `project-context.md` 생성
   - 내용: 프로젝트 요약, 기술 스택, 디렉토리 구조, 기존 문서 목록, 주요 진입점

### 3.2 F222: Structured Changes Directory

**changes/ 디렉토리 규약:**
```
.foundry-x/changes/
  ├── {change-id}/
  │   ├── proposal.md      # 변경 제안 (what & why)
  │   ├── design.md         # 설계 (how)
  │   ├── tasks.md          # 작업 항목
  │   └── spec-delta.md     # 스펙 변경분 (Δspec)
  └── index.json            # 변경 목록 인덱스
```

**Δspec 감지 흐름:**
```
foundry-x sync
  → changes-scanner: .foundry-x/changes/ 스캔
  → 각 change의 spec-delta.md 파싱
  → 현재 스펙과 비교하여 drift 감지
  → SyncResult.changes 필드에 결과 포함
  → HealthScore에 changes 가중치 반영
```

---

## 4. Implementation Plan

### 4.1 구현 순서

| # | 작업 | 패키지 | 파일 | 의존성 |
|---|------|--------|------|--------|
| 1 | RepoProfile 타입 확장 | shared | `types.ts` | — |
| 2 | DocFile, DirNode, ProjectContext 타입 | shared | `types.ts` | — |
| 3 | ChangeEntry, ChangesIndex 타입 | shared | `types.ts` | — |
| 4 | discoverDocs() 구현 | cli | `harness/discover.ts` | #1 |
| 5 | discoverDirectoryStructure() 구현 | cli | `harness/discover.ts` | #1 |
| 6 | project-context-builder 구현 | cli | `harness/builders/project-context-builder.ts` | #4,#5 |
| 7 | generate.ts에 빌더 등록 | cli | `harness/generate.ts` | #6 |
| 8 | init.ts 파이프라인 확장 | cli | `commands/init.ts` | #7 |
| 9 | changes-parser.ts 구현 | cli | `harness/changes-parser.ts` | #3 |
| 10 | changes-scanner.ts 구현 | cli | `harness/changes-scanner.ts` | #9 |
| 11 | sync.ts 확장 | cli | `commands/sync.ts` | #10 |
| 12 | health-score.ts 확장 | cli | `services/health-score.ts` | #10 |
| 13 | API SpecParserService 확장 | api | `services/spec-parser.ts` | #3 |
| 14 | 테스트 작성 (discover 확장) | cli | `harness/discover.test.ts` | #4,#5 |
| 15 | 테스트 작성 (project-context-builder) | cli | `harness/builders/project-context-builder.test.ts` | #6 |
| 16 | 테스트 작성 (changes-parser/scanner) | cli | `harness/changes-parser.test.ts`, `changes-scanner.test.ts` | #9,#10 |
| 17 | 테스트 작성 (sync 통합) | cli | `commands/sync.test.ts` 확장 | #11 |

### 4.2 예상 변경 파일

**신규 파일 (5개):**
- `packages/cli/src/harness/builders/project-context-builder.ts`
- `packages/cli/src/harness/builders/project-context-builder.test.ts`
- `packages/cli/src/harness/changes-parser.ts`
- `packages/cli/src/harness/changes-scanner.ts`
- `packages/cli/src/harness/changes-parser.test.ts`

**수정 파일 (8개):**
- `packages/shared/src/types.ts` — 타입 확장
- `packages/cli/src/harness/discover.ts` — discoverDocs, discoverDirectoryStructure
- `packages/cli/src/harness/discover.test.ts` — 테스트 추가
- `packages/cli/src/harness/generate.ts` — 빌더 등록
- `packages/cli/src/commands/init.ts` — 파이프라인 확장
- `packages/cli/src/commands/sync.ts` — changes 스캔 통합
- `packages/cli/src/services/health-score.ts` — changes 가중치
- `packages/api/src/services/spec-parser.ts` — changes 파싱

---

## 5. Risk & Mitigation

| 리스크 | 영향 | 대응 |
|--------|------|------|
| discover.ts 확장이 다양한 프로젝트 구조에서 실패 | 중 | 감지 실패 시 graceful fallback (빈 배열 반환), 로깅 |
| changes/ 디렉토리 규약이 사용자에게 복잡 | 중 | `foundry-x change new` 커맨드로 scaffold 제공 (이번 Sprint 이후) |
| RepoProfile 타입 확장이 기존 코드 깨뜨림 | 저 | 모든 신규 필드는 optional, 기존 인터페이스 유지 |

---

## 6. Success Criteria

- [ ] `foundry-x init` Brownfield 모드에서 `project-context.md` 자동 생성
- [ ] 다양한 프로젝트 구조 (모노리포, 단일 패키지, Go, Python)에서 discover 정상 동작
- [ ] `.foundry-x/changes/` 파싱 → 변경 목록 + Δspec 추출
- [ ] `foundry-x sync`에서 changes/ 결과가 SyncRunResult에 포함
- [ ] 전체 테스트 통과 (기존 + 신규)
- [ ] typecheck 통과
