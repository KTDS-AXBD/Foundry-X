---
code: FX-RPRT-S146
title: "Sprint 146 — Harness Rules & Git Guard 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo + Claude Opus 4.6
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
refs: "[[FX-PLAN-S146]] [[FX-DSGN-S146]] [[FX-ANLS-S146]]"
---

# Sprint 146 — Harness Rules & Git Guard 완료 보고서

---

## Executive Summary

### 1.1 프로젝트 개요

| 항목 | 값 |
|------|-----|
| **Feature** | F330 (rules/ 5종) + F331 (git guard) |
| **Sprint** | 146 |
| **Phase** | Phase 13 (인프라 독립 트랙) |
| **시작** | 2026-04-05 |
| **완료** | 2026-04-05 (PR #277 merged) |
| **소요** | ~12분 (Full Auto autopilot) |

### 1.2 결과 요약

| 지표 | 값 |
|------|-----|
| **Match Rate** | 100% (10/10 PASS) |
| **변경 파일** | 8개 (신규 6 + 수정 2) |
| **변경 줄** | +140 / -1 |
| **Iteration** | 0회 (1차 구현에서 100% 달성) |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 코딩 규약이 CLAUDE.md 215줄에 산재 → AI 에이전트 일관성 저하 + git 위험 명령 강제 차단 수단 없음 |
| **Solution** | `.claude/rules/` 5종 (97줄) + `pre-bash-guard.sh` (31줄) + settings.json Bash 매처 |
| **Function/UX Effect** | CC 세션 시작 시 rules/ 자동 로딩 (5종 규칙 강제), git add ./--no-verify/force push/reset --hard 즉시 BLOCKED |
| **Core Value** | 하네스 안전망 완성 — 문서화(rules/)와 강제화(hooks)를 동시에 달성. ECC 분석 13개 Gap 중 마지막 2개 해소 → .claude/ Gap 0 |

---

## 2. 배경

### 2.1 동기

ECC(Everything Claude Code, 138K+ stars) 분석 결과, Foundry-X `.claude/` 하네스의 13개 항목 중 10개가 이미 구현 완료. 남은 실제 Gap은 `rules/`(규칙 분리)와 `git guard`(위험 명령 차단) 2개 영역이었음.

### 2.2 기존 상태

- agents: 16종 ✅ (deploy-verifier, spec-checker, build-validator + BD 형상화 13종)
- skills: 15종 ✅ (ai-biz 11 + discovery + shaping + tdd + npm-release)
- hooks: PreToolUse 1종 + PostToolUse 3종 ✅
- settings.json: permissions + worktree + hooks ✅
- **rules/: 0종 ❌** → 이번 Sprint에서 해소
- **git guard: 미구현 ❌** → 이번 Sprint에서 해소

---

## 3. 구현 상세

### 3.1 F330: rules/ 5종

| 파일 | 줄 수 | 소스 | 핵심 내용 |
|------|:-----:|------|----------|
| `coding-style.md` | 22 | CLAUDE.md §Architecture, ESLint 3종 | Hono+Zod, Zustand, Ink 5, pnpm |
| `git-workflow.md` | 17 | CLAUDE.md §Git Workflow, MEMORY | Squash merge, git add . 금지, WT 규칙 |
| `testing.md` | 22 | CLAUDE.md §Testing, S124 교훈 | Vitest, ink-testing-library, E2E functional |
| `security.md` | 16 | CLAUDE.md §Deployment, §Gotchas | JWT, CORS, Secrets, D1 migrations |
| `sdd-triangle.md` | 20 | CLAUDE.md §Architecture 핵심 5축 | SSOT, F-item 선행, Gap ≥90% |
| **합계** | **97** | | 30줄 이하 제약 충족 (최대 22줄) |

### 3.2 F331: PreToolUse git guard

| 항목 | 상세 |
|------|------|
| **스크립트** | `.claude/hooks/pre-bash-guard.sh` (31줄, +x) |
| **차단 패턴 4종** | `--no-verify`, `git add ./-A/--all`, `git push --force`, `git reset --hard` |
| **exit code** | exit 2 (CC BLOCKED 프로토콜) |
| **settings.json** | PreToolUse Bash 매처 추가 (timeout 5000ms) |
| **개선점** | Design의 `git add .` 패턴보다 정밀한 구현 (`(\s\|"\|$)` 매치) |

### 3.3 CLAUDE.md

L86에 1줄 추가: `.claude/rules/` 5종 목록 + CC 자동 로딩 설명. 기존 내용은 유지(중복 허용 — 사람용 가이드 vs AI용 규칙 강제의 역할 분리).

---

## 4. 프로세스 분석

### 4.1 PDCA 사이클

| Phase | 소요 | 비고 |
|-------|------|------|
| **req-interview** | ~5분 | ECC 분석 → 실측 Gap 비교 → 범위 확정 (인터뷰 4회) |
| **Plan** | ~3분 | PRD 기반 Plan 작성 (Phase A~D) |
| **Design** | ~5분 | 각 파일 정확한 내용 확정 (V-01~V-10 체크리스트) |
| **Do** | ~12분 | Sprint 146 Full Auto (autopilot) |
| **Check** | ~3분 | 사후 Gap Analysis (10/10 PASS) |
| **Report** | ~2분 | 본 보고서 |
| **합계** | **~30분** | req-interview 포함 전체 PDCA |

### 4.2 Full Auto 효과

- Plan/Design을 master에서 미리 작성 → WT autopilot이 즉시 구현(Do)부터 시작
- 앱 코드 변경 없음(`.claude/` 인프라만) → 빌드/테스트 영향 0
- merge-monitor가 signal DONE 감지 → PR merge → cleanup 자동 처리
- Iteration 0회 — 1차 구현에서 Match 100%

### 4.3 의사결정 요약

| # | 결정 | 근거 |
|---|------|------|
| D1 | 코드베이스에서 규칙 추출 | ECC 템플릿보다 실제 규칙이 정확 |
| D2 | contexts/ 제외 | ax plugin 스킬이 이미 모드 역할 수행 |
| D3 | CLAUDE.md 기존 내용 유지 | 사람용 가이드 vs AI용 규칙 강제는 역할이 다름 |
| D4 | 5종 한번에 + git guard 동일 Sprint | 소규모(~140줄) — 분할 불필요 |

---

## 5. 성과 측정

### 5.1 목표 달성

| 지표 | 목표 | 달성 |
|------|------|------|
| rules/ 파일 수 | 5종 | ✅ 5종 (97줄) |
| 새 팀원 규칙 파악 | 반나절 | ✅ rules/ 자동 로딩으로 즉시 적용 |
| git add . 차단 | PreToolUse | ✅ BLOCKED + exit 2 |
| --no-verify 차단 | PreToolUse | ✅ BLOCKED + exit 2 |
| .claude/ Gap | 0 | ✅ 13개 항목 전체 해소 |

### 5.2 .claude/ 하네스 최종 현황

| 항목 | 수량 | 상태 |
|------|:----:|:----:|
| CLAUDE.md | 1 | ✅ |
| agents/ | 16종 | ✅ |
| skills/ | 15종 | ✅ |
| hooks/PreToolUse | 2종 (Edit\|Write + Bash) | ✅ |
| hooks/PostToolUse | 3종 (format + typecheck + test-warn) | ✅ |
| **rules/** | **5종** | ✅ **신규** |
| settings.json | 1 | ✅ |
| **Gap** | **0** | ✅ **완전 해소** |

---

## 6. PDCA 문서 인덱스

| 문서 | 경로 |
|------|------|
| PRD | `docs/specs/fx-harness-rules/prd-final.md` |
| Plan | `docs/01-plan/features/sprint-146-harness-rules.plan.md` |
| Design | `docs/02-design/features/sprint-146-harness-rules.design.md` |
| Analysis | `docs/03-analysis/sprint-146-harness-rules.analysis.md` |
| Report | `docs/04-report/sprint-146-harness-rules.report.md` |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-05 | Initial completion report | Sinclair + Claude Opus 4.6 |
