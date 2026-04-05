---
code: FX-ANLS-S146
title: "Sprint 146 — Harness Rules & Git Guard Gap Analysis"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo + Claude Opus 4.6
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
refs: "[[FX-DSGN-S146]]"
---

# Sprint 146 — Harness Rules & Git Guard Gap Analysis

> Design ↔ Implementation 비교 검증 (PR #277 merged 후 사후 분석)

---

## 1. 분석 개요

| 항목 | 값 |
|------|-----|
| **Design** | `docs/02-design/features/sprint-146-harness-rules.design.md` |
| **PR** | #277 (merged 2026-04-05T05:15:42Z) |
| **변경 파일** | 8개 (신규 6 + 수정 2) |
| **총 변경** | +140/-1 lines |
| **Match Rate** | **100% (10/10 PASS)** |

---

## 2. 검증 매트릭스

| # | 검증 항목 | Design 기준 | 실측 | 결과 |
|---|----------|------------|------|:----:|
| V-01 | rules/ 5종 파일 존재 | `ls .claude/rules/*.md` → 5개 | 5개 (coding-style, git-workflow, testing, security, sdd-triangle) | **PASS** |
| V-02 | 각 파일 30줄 이하 | 모두 ≤ 30줄 | 최대 22줄 (coding-style, testing), 합계 97줄 | **PASS** |
| V-03 | pre-bash-guard.sh 존재 + 실행 권한 | `-rwxr-xr-x` | `-rwxr-xr-x`, 31줄 | **PASS** |
| V-04 | settings.json JSON 유효성 | JSON parse 성공 | ✅ 유효 (82줄) | **PASS** |
| V-05 | settings.json에 Bash 매처 존재 | `grep -c '"Bash"'` ≥ 1 | 1개 (L45 매처) | **PASS** |
| V-06 | `git add .` 차단 패턴 | grep -qE 패턴 | `(-A\|--all\|\.(\s\|"\|$))` — Design보다 정밀 | **PASS** |
| V-07 | `--no-verify` 차단 패턴 | grep -qE 패턴 | `'--no-verify'` 매치 | **PASS** |
| V-08 | 기존 PostToolUse hooks 정상 | format + typecheck + test-warn | 3종 모두 settings.json에 존재 (L58~76) | **PASS** |
| V-09 | CLAUDE.md rules/ 섹션 존재 | `grep 'rules/' CLAUDE.md` | L86: `.claude/rules/` 5종 목록 | **PASS** |
| V-10 | rules/ 합계 줄 수 | ≤ 130줄 | 97줄 | **PASS** |

---

## 3. 파일별 상세 비교

### 3.1 rules/ 5종 (F330)

| 파일 | Design 명세 줄 수 | 실측 줄 수 | 내용 일치 | 비고 |
|------|:-----------------:|:----------:|:---------:|------|
| coding-style.md | 22 | 22 | ✅ 완전 일치 | |
| git-workflow.md | 25 | 17 | ✅ 핵심 일치 | Design보다 간결 — 중복 내용 제거 |
| testing.md | 30 | 22 | ✅ 핵심 일치 | Design보다 간결 — 중복 내용 제거 |
| security.md | 25 | 16 | ✅ 핵심 일치 | Design보다 간결 — 중복 내용 제거 |
| sdd-triangle.md | 20 | 20 | ✅ 완전 일치 | |

> **차이 분석**: git-workflow, testing, security가 Design 명세보다 짧지만, 핵심 규칙은 모두 포함. 컨텍스트 효율(FR-03: 30줄 이하)을 초과 달성. Gap 아님 — 의도적 간결화.

### 3.2 pre-bash-guard.sh (F331)

| 항목 | Design 명세 | 실측 | 일치 |
|------|------------|------|:----:|
| 줄 수 | 30 | 31 | ✅ |
| 4종 차단 패턴 | --no-verify, git add ., push --force, reset --hard | 동일 4종 | ✅ |
| exit code | exit 2 (BLOCKED) | exit 2 | ✅ |
| 실행 권한 | chmod +x | -rwxr-xr-x | ✅ |
| git add . 패턴 | `'git\s+add\s+(\.\|--all\|-A)\b'` | `'git\s+add\s+(-A\|--all\|\.(\s\|"\|$))'` | ✅ 개선 |

> **개선 사항**: `git add .` 패턴이 Design보다 정밀해짐 — `"` 뒤의 `.`이나 줄 끝의 `.`도 정확히 매치. false positive 위험 감소.

### 3.3 settings.json 수정

| 항목 | Design 명세 | 실측 | 일치 |
|------|------------|------|:----:|
| Bash 매처 추가 | PreToolUse 배열에 Bash 객체 | L44~53 Bash 매처 존재 | ✅ |
| 기존 Edit\|Write 보존 | 병렬 배치 | L34~42 기존 유지 | ✅ |
| timeout | 5000ms | 5000 | ✅ |
| PostToolUse 영향 없음 | 3종 유지 | L56~77 3종 유지 | ✅ |

### 3.4 CLAUDE.md 갱신

| 항목 | Design 명세 | 실측 | 일치 |
|------|------------|------|:----:|
| rules/ 섹션 추가 | `.claude/ 프로젝트 설정`에 목록 | L86 1줄 추가 | ✅ |
| 기존 내용 유지 | 축약하지 않음 (Design §4.2) | 기존 내용 변경 없음 (+3/-1) | ✅ |

---

## 4. 결론

**Match Rate: 100% (10/10 PASS)**

Sprint 146은 Design 명세를 완전히 충족하며, 일부 항목(git add . 패턴)은 Design보다 개선된 구현을 보여요. rules/ 파일 줄 수가 Design 예상보다 간결하지만, 핵심 규칙은 모두 포함되어 있어 의도적 최적화로 판단해요.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-05 | Initial gap analysis — PR #277 사후 검증 | Sinclair + Claude Opus 4.6 |
