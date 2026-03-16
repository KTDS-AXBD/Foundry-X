---
code: FX-PLAN-004
title: Sprint 4 (v0.4.0) — UI 테스트 프레임워크 + Ink 실시간 업데이트
version: 0.1
status: Draft
category: PLAN
system-version: 0.4.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Sprint 4 (v0.4.0) Planning Document

> **Summary**: Ink TUI 컴포넌트에 테스트 커버리지를 확보하고, `status --watch` 실시간 모니터링 모드를 추가하는 품질+기능 스프린트
>
> **Project**: Foundry-X
> **Version**: 0.4.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-16
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 3에서 Ink TUI 컴포넌트 8개를 구현했지만 테스트 커버리지가 0%이고, `foundry-x status`를 매번 수동 실행해야 변경 사항을 확인할 수 있음 |
| **Solution** | ink-testing-library 기반 컴포넌트 테스트 프레임워크 도입 + `status --watch` 파일시스템 감시 실시간 업데이트 모드 |
| **Function/UX Effect** | UI 리그레션을 자동 감지하고, 개발 중 터미널에서 SDD Triangle 상태를 실시간으로 모니터링 |
| **Core Value** | 컴포넌트 변경 시 안전망 확보 (테스트), 개발 루프 단축 (실시간 피드백) — CLI 일일 호출 횟수 ↑ |

---

## 1. Overview

### 1.1 Purpose

Sprint 3에서 Ink v5 + React 18 기반 TUI를 성공적으로 도입했어요 (5 공통 컴포넌트 + 3 View + render.tsx 4-branch dispatcher). 하지만 UI 컴포넌트 테스트가 전무하고, vitest 설정도 `.test.ts`만 포함하여 TSX 테스트를 지원하지 않는 상태예요.

Sprint 4의 목표:
1. **ink-testing-library 도입** — Ink 컴포넌트를 프로그래밍적으로 렌더링하고 출력을 검증하는 테스트 프레임워크
2. **공통 컴포넌트 + View 테스트** — 8개 UI 컴포넌트에 대한 단위/통합 테스트 작성
3. **`status --watch` 모드** — 파일시스템 변경 감시 + Ink 실시간 리렌더링으로 SDD Triangle 상태를 라이브 표시

### 1.2 Background

- **현재 테스트**: 8파일 35테스트 (모두 비즈니스 로직 — harness, plumb, services)
- **UI 테스트 0건**: Sprint 3 plan에서 "ink-testing-library는 다음 스프린트 검토"로 명시적 이관
- **vitest.config.ts**: `include: ['src/**/*.test.ts']` — `.test.tsx` 패턴 미포함
- **ink-testing-library**: React Testing Library와 유사한 API (`render()` → `lastFrame()` → assertion)
- **Ink hooks**: `useInput()`, `useApp()` 등 Ink 내장 hook + Node.js `fs.watch` 조합으로 실시간 구현 가능

### 1.3 Related Documents

- Sprint 3 Plan: [[FX-PLAN-003]] (`docs/01-plan/features/sprint-3.plan.md`)
- Sprint 3 Design: (`docs/02-design/features/sprint-3.design.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md`)
- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F22**: ink-testing-library 도입 + vitest TSX 테스트 설정
- [ ] **F23**: 공통 컴포넌트 단위 테스트 (StatusBadge, HealthBar, ProgressStep, Header, ErrorBox)
- [ ] **F24**: View 컴포넌트 통합 테스트 (StatusView, InitView, SyncView) + render.tsx 분기 테스트
- [ ] **F25**: `status --watch` 실시간 모니터링 모드

### 2.2 Out of Scope

- 인터랙티브 프롬프트 / 설정 위자드 — Phase 2
- init/sync 커맨드 watch 모드 — status만 우선 구현, 확장은 이후
- E2E 테스트 (실제 Git repo에서 CLI 실행) — 별도 스프린트
- 스냅샷 테스트 — 초기에는 output assertion으로 시작, 스냅샷은 필요시 도입
- F21 프로젝트 관리 점검 — 별도 진행

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | vitest 설정이 `.test.tsx` 파일을 인식하고 JSX 변환을 처리 | High | Pending |
| FR-02 | ink-testing-library `render()` → `lastFrame()` 패턴으로 컴포넌트 출력 검증 가능 | High | Pending |
| FR-03 | 5개 공통 컴포넌트가 각각 주요 prop 조합에 대한 테스트 보유 | High | Pending |
| FR-04 | 3개 View 컴포넌트가 정상 데이터/에러 데이터에 대한 렌더링 테스트 보유 | High | Pending |
| FR-05 | render.tsx의 4-branch 분기(json/short/non-TTY/TTY) 각각에 대한 테스트 | Medium | Pending |
| FR-06 | `foundry-x status --watch` 옵션으로 파일시스템 변경 감시 + 자동 리렌더링 | High | Pending |
| FR-07 | watch 모드에서 `q` 키 또는 Ctrl+C로 정상 종료 | High | Pending |
| FR-08 | watch 모드에서 debounce 적용 (연속 변경 시 과도한 리렌더링 방지) | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Test Coverage | UI 컴포넌트 테스트 커버리지 > 80% (라인 기준) | vitest --coverage |
| Performance | watch 모드 파일 변경 → 화면 업데이트 < 500ms | 수동 측정 |
| Performance | watch 모드 idle CPU 사용량 < 1% | top 관찰 |
| Compatibility | watch 모드 non-TTY에서 자동 비활성화 + 경고 메시지 | CI 환경 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] ink-testing-library 설치 + vitest TSX 설정 완료
- [ ] 공통 컴포넌트 5개 × 최소 3 테스트케이스 = 15+ 테스트
- [ ] View 컴포넌트 3개 × 최소 2 테스트케이스 = 6+ 테스트
- [ ] render.tsx 분기 테스트 4+ 테스트
- [ ] `status --watch` 정상 동작 (파일 변경 → 리렌더링 → q 종료)
- [ ] 기존 35개 테스트 + 신규 테스트 전부 통과
- [ ] typecheck + build + lint 0 error

### 4.2 Quality Criteria

- [ ] UI 테스트 커버리지 > 80%
- [ ] lint error 0
- [ ] 신규 코드 eslint 규칙 준수
- [ ] npm publish 가능 상태

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ink-testing-library가 Ink v5와 호환 안 됨 | High | Low | ink v5용 `@inkjs/testing-library` 확인, 호환 안 되면 직접 `render()` 래퍼 작성 |
| TSX 테스트에서 JSX 변환 오류 | Medium | Medium | vitest의 esbuild 기본 JSX 변환 활용, 필요시 `vitest.config.ts`에 `esbuild: { jsx: 'automatic' }` 추가 |
| watch 모드에서 fs.watch 플랫폼 차이 (WSL) | Medium | Medium | chokidar 대신 Node.js 내장 `fs.watch` 우선, 문제 시 chokidar 폴백 |
| watch 모드 무한 리렌더링 (자체 출력이 파일 변경 트리거) | High | Low | .foundry-x/ 디렉토리만 감시, 출력 파일은 감시 제외 |
| 테스트 실행 시간 증가로 DX 저하 | Low | Low | UI 테스트를 별도 파일로 분리, `vitest --run --grep ui` 필터 가능 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Selected |
|-------|:--------:|
| **Dynamic** | **✅** |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| UI 테스트 라이브러리 | ink-testing-library / 자체 render wrapper / snapshot only | ink-testing-library | React Testing Library와 동일 패턴, Ink 공식 권장 |
| 테스트 파일 위치 | 소스 옆 (co-located) / 별도 tests/ | 소스 옆 | 기존 패턴과 일치 (*.test.ts가 src/ 내 위치) |
| Watch 구현 | Ink useInput + fs.watch / chokidar / nodemon 래핑 | Ink useInput + fs.watch | 외부 dep 최소화, Ink 생태계 내 해결 |
| Watch 대상 | 전체 프로젝트 / .foundry-x/ + src/ | 설정 가능 (기본: cwd) | `--watch-path` 옵션으로 커스텀, 기본은 현재 디렉토리 |
| Debounce 전략 | setTimeout / lodash.debounce / 자체 구현 | setTimeout (자체) | 단순 구현, 외부 dep 불필요 |
| 리렌더링 방식 | Ink 전체 재렌더 / 상태 업데이트만 | React state 업데이트 | Ink의 React 모델 활용, useState + useEffect로 데이터만 갱신 |

### 6.3 Test Architecture

```
packages/cli/src/
├── ui/
│   ├── components/
│   │   ├── StatusBadge.tsx
│   │   ├── StatusBadge.test.tsx      ← NEW
│   │   ├── HealthBar.tsx
│   │   ├── HealthBar.test.tsx        ← NEW
│   │   ├── ProgressStep.tsx
│   │   ├── ProgressStep.test.tsx     ← NEW
│   │   ├── Header.tsx
│   │   ├── Header.test.tsx           ← NEW
│   │   ├── ErrorBox.tsx
│   │   └── ErrorBox.test.tsx         ← NEW
│   ├── views/
│   │   ├── StatusView.tsx
│   │   ├── StatusView.test.tsx       ← NEW
│   │   ├── InitView.tsx
│   │   ├── InitView.test.tsx         ← NEW
│   │   ├── SyncView.tsx
│   │   └── SyncView.test.tsx         ← NEW
│   ├── render.tsx
│   └── render.test.tsx               ← NEW
├── commands/
│   ├── status.ts                     ← MODIFY: --watch 옵션 추가
│   └── ...
└── ui/
    └── views/
        └── StatusWatchView.tsx        ← NEW: watch 모드 전용 뷰
```

### 6.4 Watch Mode Architecture

```
foundry-x status --watch [--watch-path <path>] [--interval <ms>]

┌─────────────────────────────────────────────┐
│  StatusWatchView (Ink Component)            │
│  ┌───────────────────────────────────────┐  │
│  │  Header: "Foundry-X Status (watching)"│  │
│  ├───────────────────────────────────────┤  │
│  │  StatusView (기존 컴포넌트 재사용)      │  │
│  ├───────────────────────────────────────┤  │
│  │  Footer: "Last update: 14:32:05       │  │
│  │           Press q to quit"            │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

Flow:
1. fs.watch(targetPath) → file change event
2. debounce(300ms) → runStatus() 재실행
3. React setState(newData) → Ink 자동 리렌더
4. useInput('q') → process.exit(0)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (Sprint 3에서 확립)

- [x] TSX 컴포넌트: PascalCase 파일명
- [x] 테스트: 소스 옆 co-located `*.test.ts`
- [x] eslint flat config 적용
- [x] 로직/렌더링 완전 분리 패턴

### 7.2 신규 컨벤션

| Category | Convention | Priority |
|----------|-----------|:--------:|
| **테스트 파일명** | UI 테스트는 `*.test.tsx` (TSX import 필요) | High |
| **테스트 구조** | `describe(컴포넌트명)` > `it('렌더링 조건')` | High |
| **Mock 패턴** | Ink 컴포넌트는 mock 없이 실제 render, 외부 서비스만 mock | Medium |

---

## 8. Implementation Plan

### Phase A: 테스트 인프라 (Day 1)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 1 | ink-testing-library 설치 + vitest.config.ts TSX 패턴 추가 | F22 |
| 2 | 테스트 헬퍼 작성 (공통 test data factory) | F22 |
| 3 | Header.test.tsx — 첫 번째 컴포넌트 테스트로 파이프라인 검증 | F23 |

### Phase B: 공통 컴포넌트 테스트 (Day 1-2)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 4 | StatusBadge.test.tsx — PASS/WARN/FAIL 3상태 | F23 |
| 5 | HealthBar.test.tsx — 0%/50%/100% + 색상 경계값 | F23 |
| 6 | ProgressStep.test.tsx — pending/running/done/error 4상태 | F23 |
| 7 | ErrorBox.test.tsx — 메시지 + 에러코드 표시 | F23 |

### Phase C: View + Render 테스트 (Day 2-3)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 8 | StatusView.test.tsx — 정상/저점수/에러 데이터 | F24 |
| 9 | InitView.test.tsx — 성공/부분성공/실패 시나리오 | F24 |
| 10 | SyncView.test.tsx — 동기화 결과 + gap 표시 | F24 |
| 11 | render.test.tsx — 4-branch 분기 테스트 | F24 |

### Phase D: Watch 모드 구현 (Day 3-4)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 12 | StatusWatchView.tsx — fs.watch + debounce + Ink 리렌더 | F25 |
| 13 | status.ts에 `--watch` 옵션 추가 + render.tsx 연동 | F25 |
| 14 | useInput('q') 종료 + non-TTY 경고 처리 | F25 |

### Phase E: 검증 + 마무리 (Day 4)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 15 | 전체 테스트 실행 (기존 35 + 신규 25+) | — |
| 16 | typecheck + build + lint 0 error 확인 | — |
| 17 | v0.4.0 버전 범프 + CHANGELOG 업데이트 | — |

---

## 9. F-Item Summary

| F# | 제목 | REQ | Priority | 예상 LOC |
|----|------|-----|----------|----------|
| F22 | ink-testing-library 도입 + vitest TSX 설정 | FX-REQ-022 | P1 | ~50 |
| F23 | 공통 컴포넌트 단위 테스트 (5개) | FX-REQ-023 | P1 | ~300 |
| F24 | View + render.tsx 통합 테스트 | FX-REQ-024 | P1 | ~250 |
| F25 | status --watch 실시간 모니터링 모드 | FX-REQ-025 | P1 | ~200 |

**예상 총 변경**: ~800 LOC 추가 (테스트 ~600 + watch ~200), ~30 LOC 수정 (vitest config, status.ts)

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`sprint-4.design.md`) — 컴포넌트 테스트 상세 + watch 아키텍처
2. [ ] 구현 착수
3. [ ] Gap Analysis

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft — F22~F25, UI 테스트 + watch 모드 | Sinclair Seo |
