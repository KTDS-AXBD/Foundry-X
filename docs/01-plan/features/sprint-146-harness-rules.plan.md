---
code: FX-PLAN-S146
title: "Sprint 146 — Harness Rules & Git Guard"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo + Claude Opus 4.6
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 146 — Harness Rules & Git Guard Planning Document

> **Summary**: .claude/rules/ 5종 + PreToolUse git guard 구현 — ECC 분석 기반 하네스 고도화
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0
> **Author**: Sinclair Seo + Claude Opus 4.6
> **Date**: 2026-04-05
> **Status**: Active

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 코딩 규약이 CLAUDE.md 215줄에 산재 — AI 에이전트 일관성 저하, 팀원 온보딩 1~2일, git 위험 명령(add ., --no-verify) 강제 차단 수단 없음 |
| **Solution** | .claude/rules/ 5종으로 규칙 분리(CC 자동 로딩) + PreToolUse bash guard로 git 위험 명령 4종 차단 |
| **Function/UX Effect** | 새 세션마다 rules/ 자동 적용 → 에이전트 규칙 준수율 향상, git add ./--no-verify 시도 시 즉시 BLOCKED 메시지 |
| **Core Value** | 하네스 안전망 완성 — 규칙의 문서화(rules/)와 강제화(hooks)를 동시에 달성하여 멀티 에이전트 환경의 안정성 확보 |

---

## 1. Overview

### 1.1 Purpose

ECC(Everything Claude Code) 분석 결과 Foundry-X .claude/ 하네스의 마지막 2개 Gap을 해소:
1. `rules/` — 코딩 규약을 독립 파일로 분리하여 CC 세션 시작 시 자동 로딩
2. `PreToolUse git guard` — git 위험 명령을 hook으로 강제 차단

### 1.2 Background

- **ECC 분석**: `docs/specs/ECC-to-FX-Analysis-Plan.md` — 13개 Gap 중 10개 이미 해소, 남은 2개
- **실측 결과**: agents 16종, skills 15종, hooks 4종, settings.json 모두 구현 완료
- **Sprint 17 교훈**: `git add .`로 다른 pane 변경 포함 사고 (MEMORY feedback_multipane_commit)
- **팀 규모**: AX BD팀 7명 + AI 에이전트 다수 동시 작업

### 1.3 Related Documents

- PRD: [[FX-SPEC-HRR-001]] `docs/specs/fx-harness-rules/prd-final.md`
- ECC 분석: `docs/specs/ECC-to-FX-Analysis-Plan.md`
- SPEC.md: F330 (FX-REQ-322), F331 (FX-REQ-323)

---

## 2. Scope

### 2.1 In Scope

- [x] F330: `.claude/rules/` 5종 신규 작성
  - [x] `coding-style.md` — TS/React 코딩 규약 (Hono, Zustand, Ink, ESLint 3종)
  - [x] `git-workflow.md` — Squash merge, Linear history, Sprint Worktree
  - [x] `testing.md` — Vitest, ink-testing-library, D1 mock, E2E functional
  - [x] `security.md` — JWT, CORS, Workers 보안, secrets
  - [x] `sdd-triangle.md` — Spec ↔ Code ↔ Test 동기화 (Foundry-X 고유)
- [x] F331: PreToolUse git guard
  - [x] `.claude/hooks/pre-bash-guard.sh` 스크립트 작성
  - [x] `settings.json` PreToolUse Bash 매처 추가
- [x] CLAUDE.md 갱신 — rules/ 섹션 추가, 기존 산재 규칙을 "상세: rules/ 참조"로 축약

### 2.2 Out of Scope

- `contexts/` 4종 (인터뷰 결정: 나중에)
- Skills ECC 표준화 (별도 트랙)
- MCP 설정 (장기)
- CLAUDE.md 대폭 리팩토링 (rules/ 분리 외의 구조 변경)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `.claude/rules/` 디렉토리에 5개 .md 파일 생성 | High | Pending |
| FR-02 | 각 rules 파일은 CLAUDE.md + 기존 코드에서 실제 규칙 추출 | High | Pending |
| FR-03 | 각 rules 파일 30줄 이하 (컨텍스트 효율) | Medium | Pending |
| FR-04 | `pre-bash-guard.sh`가 4종 git 명령 차단 (--no-verify, add ., push --force, reset --hard) | High | Pending |
| FR-05 | 차단 시 사유 메시지 출력 + exit 2 (CC BLOCKED 프로토콜) | High | Pending |
| FR-06 | `settings.json`에 PreToolUse Bash 매처 추가 | High | Pending |
| FR-07 | CLAUDE.md에 `.claude/rules/` 섹션 추가 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 성능 | pre-bash-guard.sh 실행 < 1초 | timeout 5000ms 이내 |
| 컨텍스트 효율 | rules/ 5종 합계 < 200줄 | wc -l 확인 |
| 호환성 | 기존 PreToolUse Edit|Write hook과 공존 | settings.json 배열 병렬 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] `.claude/rules/` 5종 파일 존재 (coding-style, git-workflow, testing, security, sdd-triangle)
- [ ] `pre-bash-guard.sh` 존재 + 실행 권한 (+x)
- [ ] `settings.json` PreToolUse에 Bash 매처 추가
- [ ] CLAUDE.md에 rules/ 섹션 반영
- [ ] 새 CC 세션에서 rules/ 내용이 로딩되는 것 확인

### 4.2 Quality Criteria

- [ ] rules/ 각 파일 30줄 이하
- [ ] pre-bash-guard.sh가 4종 명령 모두 차단 (수동 테스트)
- [ ] 기존 hooks (post-edit-format, typecheck, test-warn) 정상 동작
- [ ] settings.json JSON 유효성

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| pre-bash-guard false positive (정상 명령 차단) | Medium | Low | grep 패턴을 정밀하게 작성, `git add` 뒤에 `.` 또는 `--all`만 차단 |
| rules/ + CLAUDE.md 중복으로 혼란 | Low | Medium | CLAUDE.md에서 해당 내용을 "상세: rules/ 참조"로 축약 |
| rules/ 컨텍스트 소모 | Medium | Low | 각 파일 30줄 이하 유지 (5종 합계 ~130줄) |
| settings.json 구문 오류로 기존 hooks 비활성화 | High | Low | 편집 후 즉시 JSON 유효성 검증 |

---

## 6. Architecture Considerations

### 6.1 Project Level

이 Sprint은 Foundry-X 모노리포의 `.claude/` 인프라 영역 — 앱 코드 변경 없음.

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| rules/ 소스 | 코드베이스 추출 | CLAUDE.md + ESLint + 코드 패턴에서 실제 규칙 추출 (인터뷰 결정 D1) |
| hook 위치 | `.claude/hooks/pre-bash-guard.sh` | 기존 post-edit-*.sh와 동일 패턴 |
| hook 등록 | `settings.json` hooks 섹션 | 기존 PreToolUse Edit|Write와 병렬 배치 |
| CLAUDE.md 처리 | 축약 참조 | rules/ 분리 후 "상세: rules/ 참조"로 중복 제거 |

### 6.3 파일 구조

```
.claude/
├── rules/                    ← 신규
│   ├── coding-style.md       ← FR-01: TS/React 규약
│   ├── git-workflow.md       ← FR-01: Git 규칙
│   ├── testing.md            ← FR-01: 테스트 규약
│   ├── security.md           ← FR-01: 보안 규칙
│   └── sdd-triangle.md       ← FR-01: SDD 동기화
├── hooks/
│   ├── post-edit-format.sh   (기존)
│   ├── post-edit-typecheck.sh (기존)
│   ├── post-edit-test-warn.sh (기존)
│   └── pre-bash-guard.sh     ← 신규 FR-04
├── settings.json              ← 수정 FR-06
└── agents/                    (기존 16종, 변경 없음)
```

---

## 7. Implementation Order

### Phase A: rules/ 5종 작성 (F330)

CLAUDE.md에서 해당 규칙을 추출하여 독립 파일로 분리.

| 순서 | 파일 | 소스 | 예상 줄수 |
|------|------|------|----------|
| 1 | `rules/coding-style.md` | CLAUDE.md §Architecture, §Testing, ESLint 3종 | ~30 |
| 2 | `rules/git-workflow.md` | CLAUDE.md §Git Workflow, MEMORY 피드백 | ~25 |
| 3 | `rules/testing.md` | CLAUDE.md §Testing, E2E assertion 교훈 | ~30 |
| 4 | `rules/security.md` | CLAUDE.md §Deployment, §Gotchas | ~25 |
| 5 | `rules/sdd-triangle.md` | CLAUDE.md §Architecture 핵심 5축 | ~20 |

### Phase B: git guard 구현 (F331)

| 순서 | 작업 | 상세 |
|------|------|------|
| 6 | `pre-bash-guard.sh` 작성 | 4종 패턴 차단 + exit 2 |
| 7 | `chmod +x` 실행 권한 | 기존 post-edit-*.sh와 동일 |
| 8 | `settings.json` 수정 | PreToolUse Bash 매처 추가 |

### Phase C: CLAUDE.md 갱신

| 순서 | 작업 | 상세 |
|------|------|------|
| 9 | CLAUDE.md에 rules/ 섹션 추가 | `.claude/` 프로젝트 설정 하위에 규칙 목록 |
| 10 | 기존 산재 규칙에 "상세: rules/ 참조" 추가 | 중복 최소화 |

### Phase D: 검증

| 순서 | 작업 | 검증 방법 |
|------|------|----------|
| 11 | rules/ 파일 존재 확인 | `ls .claude/rules/*.md` → 5개 |
| 12 | pre-bash-guard.sh 차단 테스트 | `git add .` 시도 → BLOCKED |
| 13 | settings.json 유효성 | JSON parse 확인 |
| 14 | 기존 hooks 정상 동작 | .ts 파일 편집 → format+typecheck 실행 |

---

## 8. Next Steps

1. [ ] `/pdca design fx-harness-rules` — Design 문서 작성
2. [ ] Sprint 146 실행 (`/ax:sprint 146`)
3. [ ] Gap Analysis (`/pdca analyze fx-harness-rules`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-05 | Initial draft — PRD 기반 Plan 작성 | Sinclair + Claude Opus 4.6 |
