---
code: FX-DSGN-S240
title: "Sprint 240 Design — F488 Phase 29 요구사항 거버넌스 자동화"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6 (autopilot)
sprint: 240
f_items: [F488]
plan_ref: "[[FX-PLAN-S240]]"
---

# Sprint 240 Design — F488 Phase 29 요구사항 거버넌스 자동화

## 1. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-manage/SKILL.md` | 수정 | `--create-issue` 기본화, `--no-issue` opt-out, skip.log |
| `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-integrity/SKILL.md` | 수정 | 2카테고리 분리 리포트 |
| `~/.claude/plugins/cache/ax-marketplace/ax/1.0.0/skills/req-manage/SKILL.md` | 동기화 | 캐시 |
| `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/req-manage/SKILL.md` | 동기화 | 캐시 (현재 활성) |
| `~/.claude/plugins/cache/ax-marketplace/ax/1.0.0/skills/req-integrity/SKILL.md` | 동기화 | 캐시 |
| `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/req-integrity/SKILL.md` | 동기화 | 캐시 (현재 활성) |

## 2. req-manage 수정 설계

### 2.1 `new` 서브커맨드 — GitHub Issue 생성 기본화

**현재 (opt-in):**
```
Step 6: GitHub Issue 생성 (gh CLI + GitHub remote 존재 시)
if [ "$GH_AVAILABLE" = "true" ] && [ -n "$GITHUB_REPO" ]; then
  ISSUE_URL=$(gh issue create ...)
fi
```

**변경 후 (스마트 기본값 β):**
```
Step 6: GitHub Issue 생성 (스마트 기본값 β)

-- --no-issue 플래그가 없을 때 기본값 동작:
if [ "${NO_ISSUE:-false}" = "false" ]; then
  if [ "$GH_AVAILABLE" = "true" ] && [ -n "$GITHUB_REPO" ]; then
    # gh/token 존재 → 자동 Issue 생성
    ISSUE_URL=$(gh issue create ...)
  else
    # gh 없거나 GITHUB_REPO 없음 → skip.log 기록
    mkdir -p /tmp
    echo "[$(date -Iseconds)] SKIP Issue 생성 — gh CLI 없음 또는 GITHUB_REPO 미설정. F{N}: {제목}" >> /tmp/req-issue-skip.log
    echo "⚠️  Issue 생성 건너뜀 (gh CLI 없음 또는 remote 미설정). /tmp/req-issue-skip.log 참조"
  fi
else
  # --no-issue opt-out
  echo "ℹ️  --no-issue 옵션: Issue 생성 건너뜀"
fi
```

**`--no-issue` 플래그 감지:**
```
AskUserQuestion 단계에서 설명에 `--no-issue` 옵션 안내 추가:
"GitHub Issue를 자동 생성합니다. 생성하지 않으려면 --no-issue를 사용하세요."

실제 플래그 파싱은 argument에서:
ARGS="${ARGUMENTS:-}"
NO_ISSUE=false
if echo "$ARGS" | grep -q -- "--no-issue"; then
  NO_ISSUE=true
fi
```

**등록 결과 출력 변경:**
```
F{N} ({REQ코드}) 등록 완료:
- SPEC.md: ✅ 추가
- MEMORY.md: ✅ (P0/P1) / ⏭️ (P2/P3)
- 앱 DB: ✅ / ⏭️
- GitHub Issue: ✅ #{issue_num} / ⚠️ 건너뜀 (skip.log 참조) / ℹ️ --no-issue
- GitHub Project: ✅ / ⏭️
```

### 2.2 `new` 서브커맨드 — Step 순서 재배치

Step 1에서 `--no-issue` 안내를 포함한 사전 조건 표시:
```
## 사전 확인
- GitHub Issue 자동 생성: ✅ 기본값 (β)
  - gh CLI 있음: 자동 생성
  - gh CLI 없음: /tmp/req-issue-skip.log 기록
  - 건너뛰려면: --no-issue 옵션 사용
```

## 3. req-integrity 수정 설계

### 3.1 Step 1 리포트 2카테고리 분리

**현재 (합산):**
```
| 1 | F-item ↔ GitHub Issue | ✅/⚠️/❌ | N건 |
```
→ 구조적 공백(F-item 미등록)과 실시간 drift(상태 불일치)가 한 행에 합산

**변경 후 (2카테고리):**
```
| 1a | 구조적 공백 (Issue 미등록) | ✅/⚠️/❌ | N건 |
| 1b | 실시간 Drift (상태 불일치) | ✅/⚠️/❌ | N건 |
```

**구조적 공백 판정:**
```
SPEC 존재 + GitHub Issue 없음 = 구조적 공백
- 특히 F100+ 대규모 미등록 범위 감지
- 집계: "F{start}~F{end} N건 미등록" 형식
```

**실시간 Drift 판정:**
```
SPEC 존재 + GitHub Issue 있음 + 상태 불일치 = 실시간 drift
- SPEC ✅ + GitHub OPEN = ⚠️ Issue 미닫힘
- SPEC 📋 + GitHub CLOSED = ⚠️ Issue 선닫힘
```

### 3.2 분리 집계 출력 형식

```
## 요구사항 정합성 검증 결과

### 1. F-item ↔ GitHub Issue (2카테고리)

#### 1a. 구조적 공백 (Issue 미등록)
> SPEC에 F-item이 있지만 GitHub Issue가 생성되지 않은 항목

| F# | 제목 | SPEC 상태 | Issue 존재 |
|----|------|----------|-----------|
| F488 | req-manage 기본화 | 📋 | ❌ 미생성 |
...

구조적 공백: **N건** {범위가 크면: "F{start}~F{end} 연속 N건"}

#### 1b. 실시간 Drift (상태 불일치)
> GitHub Issue가 있지만 SPEC 상태와 다른 항목

| F# | 제목 | SPEC 상태 | Issue 상태 | 불일치 유형 |
|----|------|----------|-----------|------------|
| F123 | ... | ✅ DONE | OPEN | Issue 미닫힘 |
...

실시간 Drift: **N건**
```

### 3.3 요약 테이블 변경

```
| # | 검증 항목 | 상태 | 불일치 |
|---|----------|:----:|--------|
| 1a | 구조적 공백 (Issue 미등록) | ✅/⚠️/❌ | N건 |
| 1b | 실시간 Drift (상태 불일치) | ✅/⚠️/❌ | N건 |
| 2 | Execution Plan ↔ REQ | ✅/⚠️/❌ | N건 |
| 3 | SPEC 수치 ↔ 코드 실제 | ✅/⚠️/❌ | N건 |
| 4 | MEMORY ↔ SPEC 일관성 | ✅/⚠️/❌ | N건 |
| 5 | TD 해소 추적 | ✅/⚠️/❌ | N건 |
```

## 4. 캐시 동기화 설계 (8곳 중 관련 4곳)

S185 교훈 기준 수정 시 동기화 위치:

| # | 위치 | 동작 |
|---|------|------|
| 1 | `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-manage/SKILL.md` | 소스 수정 |
| 2 | `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-integrity/SKILL.md` | 소스 수정 |
| 3 | `~/.claude/plugins/cache/ax-marketplace/ax/1.0.0/skills/req-manage/SKILL.md` | 캐시 동기화 |
| 4 | `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/req-manage/SKILL.md` | 캐시 동기화 (활성) |
| 5 | `~/.claude/plugins/cache/ax-marketplace/ax/1.0.0/skills/req-integrity/SKILL.md` | 캐시 동기화 |
| 6 | `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/req-integrity/SKILL.md` | 캐시 동기화 (활성) |

> help 스킬, CLAUDE.md: 스킬 수 변경 없음 → 불필요

## 5. 검증 항목 (Gap Analysis 기준)

| # | 항목 | 검증 방법 |
|---|------|----------|
| D01 | req-manage `--no-issue` 플래그 파싱 | SKILL.md grep |
| D02 | gh 없을 때 skip.log 기록 로직 | SKILL.md grep |
| D03 | gh 있을 때 기본 Issue 생성 | SKILL.md grep |
| D04 | 등록 결과 출력에 Issue 상태 표시 | SKILL.md grep |
| D05 | req-integrity 1a 구조적 공백 섹션 | SKILL.md grep |
| D06 | req-integrity 1b 실시간 Drift 섹션 | SKILL.md grep |
| D07 | 요약 테이블에 1a/1b 두 행 | SKILL.md grep |
| D08 | 캐시 1.0.0 req-manage 동기화 | diff 확인 |
| D09 | 캐시 1.1.0 req-manage 동기화 | diff 확인 |
| D10 | 캐시 1.0.0 req-integrity 동기화 | diff 확인 |
| D11 | 캐시 1.1.0 req-integrity 동기화 | diff 확인 |
