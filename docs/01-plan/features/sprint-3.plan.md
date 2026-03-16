---
code: FX-PLAN-003
title: Sprint 3 (v0.3.0) — Ink TUI, eslint, 안정화
version: 0.1
status: Draft
category: PLAN
system-version: 0.3.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Sprint 3 (v0.3.0) Planning Document

> **Summary**: CLI 출력을 Ink TUI로 전환하여 UX를 개선하고, eslint를 설정하여 코드 품질 기반을 완성하는 안정화 스프린트
>
> **Project**: Foundry-X
> **Version**: 0.3.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-16
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | CLI 출력이 console.log 텍스트뿐이라 Health Score/Integrity 정보를 한눈에 파악하기 어렵고, eslint 미설정으로 코드 품질 검증이 불가능한 상태 |
| **Solution** | 이미 설치된 Ink v5 + React 18 기반 TUI 컴포넌트 도입, eslint flat config 설정으로 TD-02 해소 |
| **Function/UX Effect** | 색상·레이아웃·스피너가 있는 구조화된 터미널 출력, 린트 자동 검증으로 코드 일관성 확보 |
| **Core Value** | 개발자 온보딩 시 첫인상 개선 (CLI 호출 경험↑), 코드 기여 품질 게이트 확보 |

---

## 1. Overview

### 1.1 Purpose

Sprint 2에서 핵심 커맨드 3개(init, sync, status)를 구현했지만, 출력이 `console.log` 평문 텍스트에 의존해요. 이미 `ink@5.1.0`과 `react@18.3.0`이 dependency로 설치되어 있지만 사용되지 않는 상태예요.

Sprint 3의 목표:
1. **Ink TUI 컴포넌트**로 CLI 출력 UX를 대폭 개선
2. **eslint 설정**으로 TD-02를 해소하고 코드 품질 게이트 확보
3. 사용자 피드백 대비 **안정화** (에러 메시지 개선, 엣지 케이스 처리)

### 1.2 Background

- Ink은 React 컴포넌트 모델로 터미널 UI를 구축하는 라이브러리 — 이미 dep에 있으나 미사용
- `tsconfig.json`에 `"jsx": "react-jsx"` 설정 완료 → 즉시 TSX 파일 작성 가능
- eslint는 `package.json`의 `"lint": "eslint src/"` 스크립트만 존재, 패키지 미설치
- Sprint 2 PDCA Match Rate 93% — 안정적 기반 위에서 UX 개선 진행

### 1.3 Related Documents

- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)
- Sprint 2 Design: `docs/archive/2026-03/foundry-x-cli/` (archived)
- Tech Stack: `docs/02-design/features/tech-stack-review.md`
- SPEC: [[FX-SPEC-001]] (`SPEC.md`)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F15**: Ink TUI 공통 컴포넌트 (`packages/cli/src/ui/`)
- [ ] **F16**: status 커맨드 Ink TUI 전환
- [ ] **F17**: init 커맨드 Ink TUI 전환
- [ ] **F18**: sync 커맨드 Ink TUI 전환
- [ ] **F19**: eslint flat config 설정 + 기존 코드 린트 수정 (TD-02 해소)
- [ ] **F20**: non-TTY 폴백 (CI/파이프라인 환경 대응)
- [ ] **F21**: 프로젝트 관리 점검 및 개선 — BluePrint/WBS/요구사항/산출물 현행화 + 팀 공유·리뷰 시스템

### 2.2 Out of Scope

- 인터랙티브 프롬프트 (모드 선택, 설정 위자드) — Phase 2
- `ink-testing-library` 기반 컴포넌트 테스트 — 다음 스프린트 검토
- Web Dashboard — Phase 2
- 새 커맨드 추가 — v0.3.0은 기존 3개 커맨드 UX 개선에 집중

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | status 커맨드가 색상 코드된 Health Score, Integrity 바를 Ink으로 렌더링 | High | Pending |
| FR-02 | init 커맨드가 단계별 진행 상태를 스피너/체크마크로 표시 | High | Pending |
| FR-03 | sync 커맨드가 Plumb 연동 진행률을 실시간 표시 | Medium | Pending |
| FR-04 | `--json` / `--short` 옵션은 기존과 동일하게 plain text 출력 유지 | High | Pending |
| FR-05 | non-TTY 환경(CI, pipe)에서 자동으로 plain text 폴백 | High | Pending |
| FR-06 | eslint flat config로 TypeScript 린트 규칙 적용 | High | Pending |
| FR-07 | `pnpm lint` 실행 시 0 error 달성 | High | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | Ink 렌더링으로 인한 startup 지연 < 100ms | `time foundry-x status --short` 비교 |
| Compatibility | Node.js 20+ 필수, non-TTY 자동 감지 | CI 환경 테스트 |
| Maintainability | UI 컴포넌트 재사용률 > 70% (3개 커맨드 공통) | 컴포넌트 사용 횟수 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 3개 커맨드 모두 Ink TUI로 전환 완료
- [ ] `--json` / `--short` 옵션 기존 동작 유지 (regression 없음)
- [ ] non-TTY 환경에서 plain text 자동 폴백
- [ ] eslint 0 error, 0 warning
- [ ] 기존 35개 테스트 전부 통과
- [ ] typecheck + build 성공

### 4.2 Quality Criteria

- [ ] 테스트 커버리지 기존 수준 유지 (신규 UI 컴포넌트 단위 테스트는 optional)
- [ ] lint error 0
- [ ] Build 성공
- [ ] npm publish 가능 상태 (dist/ 정상)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Ink v5 + React 18 호환성 이슈 | Medium | Low | 이미 dep에 설치됨, TSX 컴파일 확인 완료 |
| non-TTY 감지 실패로 CI 깨짐 | High | Medium | `process.stdout.isTTY` 체크 + `--no-color` 옵션 |
| eslint flat config 마이그레이션 복잡도 | Low | Low | 신규 설정이라 레거시 없음 |
| Ink 렌더링 성능 오버헤드 | Medium | Low | `--short` 모드는 Ink 우회, 벤치마크 측정 |
| 기존 테스트와 Ink 출력 충돌 | Medium | Medium | 커맨드 함수를 로직/렌더링 분리, 로직만 테스트 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | |
| **Dynamic** | Feature-based modules, BaaS | Web apps | **✅** |
| **Enterprise** | Strict layer separation, DI | Complex systems | |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| TUI Framework | Ink / blessed / raw ANSI | Ink v5 | 이미 dep에 존재, React 모델로 컴포넌트화 용이 |
| **로직/UI 분리** | **완전 분리 / 점진 래퍼 / 프로토타입** | **완전 분리** | **커맨드는 데이터 객체만 반환, ui/views/가 렌더링 담당. 기존 테스트 100% 유지, non-TTY 분기 한 곳** |
| 컴포넌트 구조 | 모놀리식 / 공통+커맨드별 분리 | 공통+커맨드별 | 재사용 가능한 공통 컴포넌트 + 커맨드별 조합 |
| non-TTY 전략 | 별도 렌더러 / 조건부 분기 | 조건부 분기 | `isTTY` 체크로 Ink/plain 분기, 코드 중복 최소화 |
| eslint 설정 | Legacy (.eslintrc) / Flat config | Flat config | eslint 9.x 기본, 미래 호환성 |
| 린트 규칙 | strict / recommended / custom | recommended + strict 일부 | 초기 설정은 보수적, 점진적 강화 |

### 6.3 UI Component Architecture

```
packages/cli/src/
├── ui/                          # ← NEW: Ink TUI 컴포넌트
│   ├── components/
│   │   ├── StatusBadge.tsx       # PASS/WARN/FAIL 뱃지
│   │   ├── HealthBar.tsx         # Health Score 시각화 바
│   │   ├── ProgressStep.tsx      # 단계별 진행 (✓/●/○)
│   │   ├── Spinner.tsx           # 로딩 스피너
│   │   ├── Header.tsx            # Foundry-X 헤더
│   │   └── ErrorBox.tsx          # 에러 메시지 박스
│   ├── views/
│   │   ├── StatusView.tsx        # status 커맨드 전체 뷰
│   │   ├── InitView.tsx          # init 커맨드 전체 뷰
│   │   └── SyncView.tsx          # sync 커맨드 전체 뷰
│   └── render.tsx                # Ink render 유틸 + TTY 분기
├── commands/
│   ├── init.ts                   # 로직 유지, 출력을 UI로 위임
│   ├── status.ts                 # 로직 유지, 출력을 UI로 위임
│   └── sync.ts                   # 로직 유지, 출력을 UI로 위임
└── ...
```

**핵심 패턴**: 커맨드 파일은 비즈니스 로직만 담당하고, 출력은 `ui/views/`의 Ink 컴포넌트에 위임. `render.tsx`가 TTY 여부에 따라 Ink/plain text를 분기.

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists — 미존재
- [ ] `CONVENTIONS.md` exists at project root — 미존재
- [ ] ESLint configuration — **미설정 (TD-02)**
- [ ] Prettier configuration — 미설정
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | 암묵적 (camelCase) | TSX 컴포넌트: PascalCase, 파일명: PascalCase.tsx | High |
| **Folder structure** | commands/harness/plumb/services | + ui/components/, ui/views/ | High |
| **Import order** | 미정의 | node → 외부 → 내부 → 상대 | Medium |
| **JSX/TSX** | 미사용 | Ink 컴포넌트 패턴, FC 타입 | High |

---

## 8. Implementation Plan

### Phase A: 기반 설정 (Day 1)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 1 | eslint + @typescript-eslint + eslint.config.js 설정 | F19 |
| 2 | 기존 코드 lint fix | F19 |
| 3 | `ui/render.tsx` — TTY 감지 + Ink/plain 분기 유틸 | F15, F20 |

### Phase B: 공통 컴포넌트 (Day 1-2)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 4 | `ui/components/` — StatusBadge, HealthBar, ProgressStep, Header, ErrorBox | F15 |
| 5 | status 커맨드 Ink TUI 전환 (가장 출력이 풍부) | F16 |

### Phase C: 나머지 커맨드 전환 (Day 2-3)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 6 | init 커맨드 Ink TUI 전환 | F17 |
| 7 | sync 커맨드 Ink TUI 전환 | F18 |

### Phase D: 검증 + 마무리 (Day 3)

| 순서 | 작업 | F# |
|:----:|------|:--:|
| 8 | 기존 35개 테스트 전부 통과 확인 | — |
| 9 | non-TTY 폴백 검증 (pipe, CI 시뮬레이션) | F20 |
| 10 | typecheck + build + lint 전부 통과 | — |
| 11 | v0.3.0 버전 범프 + CHANGELOG 업데이트 | — |

---

## 9. F-Item Summary

| F# | 제목 | REQ | Priority | 예상 LOC |
|----|------|-----|----------|----------|
| F15 | Ink TUI 공통 컴포넌트 | FX-REQ-015 | P1 | ~200 |
| F16 | status 커맨드 Ink TUI 전환 | FX-REQ-016 | P1 | ~100 |
| F17 | init 커맨드 Ink TUI 전환 | FX-REQ-017 | P1 | ~100 |
| F18 | sync 커맨드 Ink TUI 전환 | FX-REQ-018 | P1 | ~80 |
| F19 | eslint flat config 설정 (TD-02) | FX-REQ-019 | P1 | ~50 |
| F20 | non-TTY 폴백 | FX-REQ-020 | P2 | ~40 |
| F21 | 프로젝트 관리 점검 및 개선 | FX-REQ-021 | P0 | — |

**예상 총 변경**: ~570 LOC 추가, ~100 LOC 수정 (커맨드 파일 출력 부분) + F21 문서 작업

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`sprint-3.design.md`) — 컴포넌트 상세 설계
2. [ ] 팀 리뷰 및 승인
3. [ ] 구현 착수

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft — F15~F21, 로직/렌더링 완전 분리 확정 | Sinclair Seo |
