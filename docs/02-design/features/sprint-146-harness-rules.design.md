---
code: FX-DSGN-S146
title: "Sprint 146 — Harness Rules & Git Guard Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo + Claude Opus 4.6
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
refs: "[[FX-PLAN-S146]]"
---

# Sprint 146 — Harness Rules & Git Guard Design

> F330 rules/ 5종 + F331 PreToolUse git guard — 구현 상세 설계

---

## 1. 변경 파일 목록

| # | 파일 | 작업 | F-item |
|---|------|------|--------|
| 1 | `.claude/rules/coding-style.md` | 신규 | F330 |
| 2 | `.claude/rules/git-workflow.md` | 신규 | F330 |
| 3 | `.claude/rules/testing.md` | 신규 | F330 |
| 4 | `.claude/rules/security.md` | 신규 | F330 |
| 5 | `.claude/rules/sdd-triangle.md` | 신규 | F330 |
| 6 | `.claude/hooks/pre-bash-guard.sh` | 신규 | F331 |
| 7 | `.claude/settings.json` | 수정 | F331 |
| 8 | `CLAUDE.md` | 수정 | F330+F331 |

---

## 2. F330: rules/ 5종 상세 설계

### 2.1 rules/coding-style.md

**소스**: CLAUDE.md §Architecture(Tech Stack), §Testing(ESLint 3종), §Repository Structure

```markdown
# Foundry-X Coding Style

## TypeScript 공통
- 패키지 매니저: pnpm (npm/yarn 금지)
- 빌드: Turborepo (`turbo build/test/lint/typecheck`)
- Node.js 20, TypeScript strict mode

## API (Hono + Cloudflare Workers)
- 라우트: Zod 스키마 필수 — ESLint `require-zod-schema` 룰 적용
- DB 접근: 서비스 레이어 경유 — ESLint `no-direct-db-in-route` 룰 적용
- Plumb import: 패키지 내부만 — ESLint `no-orphan-plumb-import` 룰 적용
- D1 바인딩: `env.DB`로 접근, raw SQL 대신 prepared statement 사용

## Web (Vite 8 + React 18 + React Router 7)
- 상태관리: Zustand (전역), useState (로컬)
- 라우팅: React Router 7 파일 기반 (`src/routes/`)
- 스타일: CSS Modules 또는 인라인 — Tailwind 미사용

## CLI (Commander + Ink 5)
- TUI: Ink 5 (React 18 기반), render.tsx 4-branch dispatcher
- 컴포넌트: 순수 UI(components/) + 로직(views/) 분리
- 출력: json/short/non-TTY/TTY 4가지 모드 지원
```

**줄 수**: 22줄

### 2.2 rules/git-workflow.md

**소스**: CLAUDE.md §Git Workflow, §Design Decisions, MEMORY feedback_multipane_commit

```markdown
# Foundry-X Git Workflow

## Branch & Merge
- Branch Protection: master에 직접 push 불가 — PR 필수 + 1명 Approve
- Merge 전략: Squash merge + Linear history + Auto-delete branches
- Remote: HTTPS + PAT 인증 (SSH 아님)

## Sprint Worktree
- WT 생성: `bash -i -c "sprint N"` 함수만 사용 (wt.exe/git worktree 직접 호출 금지)
- WT에서 작업 → Master에서 `/ax:sprint merge N`으로 통합

## 필수 금지 사항
- `git add .` 절대 금지 — 파일을 개별 지정 (멀티 pane 사고 방지)
- `git add -A` / `git add --all` 금지 — 동일 이유
- `--no-verify` 금지 — hook 실패 시 원인 해결 후 재시도
- `git push --force` 금지 — Linear history 파괴
- 자동 커밋 절대 금지 — NL→Spec 변환 결과는 사람 확인 후 커밋
```

**줄 수**: 18줄

### 2.3 rules/testing.md

**소스**: CLAUDE.md §Testing, MEMORY feedback_e2e_assertion_level

```markdown
# Foundry-X Testing Rules

## Runner & Framework
- Runner: Vitest 3.x (`vitest.config.ts` per package)
- TSX 지원: `.test.tsx` 패턴, tsconfig `jsx: "react-jsx"`

## CLI UI 테스트
- ink-testing-library: `render()` → `lastFrame()` → assertion
- Mock 전략: Ink 컴포넌트는 실제 렌더링, 외부 서비스만 mock

## API 테스트
- Hono `app.request()` 직접 호출 (supertest 아님)
- D1 mock: in-memory SQLite (`better-sqlite3`)

## E2E 테스트
- Playwright (`packages/web/e2e/`), `pnpm e2e`로 실행
- Assertion 수준: smoke(title 확인)가 아닌 **functional**(badge/tag/link/content 검증)
- Skip 사유: 코드로 해결 불가한 skip은 Design 문서에 사유 기록

## Test Data
- 중앙 fixture factory: `test-data.ts` (CLI), `mock-factory.ts` (E2E)
- 패턴: `make*()` + spread override
```

**줄 수**: 22줄

### 2.4 rules/security.md

**소스**: CLAUDE.md §Deployment, §Gotchas, §Design Decisions

```markdown
# Foundry-X Security Rules

## 인증
- JWT + PBKDF2 + RBAC + SSO Hub Token + Google OAuth
- Secrets: `wrangler secret put`으로만 등록 — 코드에 하드코딩 절대 금지
- 등록된 Secrets: JWT_SECRET, GITHUB_TOKEN, WEBHOOK_SECRET, ANTHROPIC_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENROUTER_API_KEY

## CORS
- Pages(fx.minu.best) → Workers(foundry-x-api) 크로스오리진
- `packages/api/src/app.ts` CORS 미들웨어 필수
- `VITE_API_URL`에 `/api` 경로 포함 필수 (빠뜨리면 404)

## Cloudflare Workers
- D1 migrations: CI/CD 자동 적용, 수동 시 `--remote` 필수 (누락 = 프로덕션 500)
- 보호 파일: `.env`, `credentials`, `pnpm-lock.yaml` 편집 차단 (PreToolUse hook)
- wrangler.toml에 `account_id` 명시 필수 (환경변수 의존 금지)
```

**줄 수**: 18줄

### 2.5 rules/sdd-triangle.md

**소스**: CLAUDE.md §Architecture 핵심 5축, MEMORY feedback_claude_md_drift

```markdown
# Foundry-X SDD Triangle

> Spec(명세) ↔ Code ↔ Test 상시 동기화 — Foundry-X 핵심 철학

## SPEC.md = 권위 소스(SSOT)
- SPEC.md가 권위 소스, MEMORY.md는 캐시 — 불일치 시 SPEC 기준 보정
- 수치(routes/services/schemas/tests/D1) 하드코딩 금지 — `/ax:daily-check`가 실측

## F-item 등록 선행 원칙
- Plan/Design 작성 전 반드시 SPEC.md에 F-item + REQ코드 먼저 등록
- SPEC 등록 → 커밋 → push → WT 생성 순서 (S149 교훈)

## Gap Analysis
- Design ↔ Implementation 일치율 90% 이상 목표
- Gap < 90%: pdca-iterator 자동 개선
- Gap ≥ 90%: 완료 보고서 작성

## 동기화 주기
- 5세션마다 1회 또는 수동 운영(벌크 승인, DB 직접 조작) 후 즉시 점검
- 수치/상태/리스크/Phase 명칭/REQ 완전성 확인
```

**줄 수**: 20줄

---

## 3. F331: PreToolUse Git Guard 상세 설계

### 3.1 pre-bash-guard.sh

```bash
#!/bin/bash
# PreToolUse hook: git 위험 명령 차단
# 차단 대상: --no-verify, git add ., git push --force, git reset --hard

INPUT="$CLAUDE_TOOL_INPUT"

# --no-verify 차단 (git commit, git push 등 어디에서든)
if echo "$INPUT" | grep -qE -- '--no-verify'; then
  echo "BLOCKED: --no-verify는 프로젝트 정책으로 차단됨 — hook 실패 시 원인을 해결하세요"
  exit 2
fi

# git add . 차단 (git add 뒤에 . 또는 -A 또는 --all)
if echo "$INPUT" | grep -qE 'git\s+add\s+(\.|--all|-A)\b'; then
  echo "BLOCKED: 'git add .'은 금지 — 파일을 개별 지정하세요 (멀티 pane 사고 방지)"
  exit 2
fi

# git push --force 차단 (--force-with-lease 포함)
if echo "$INPUT" | grep -qE 'git\s+push\s+.*--force'; then
  echo "BLOCKED: force push는 프로젝트 정책으로 차단됨 — Linear history 보호"
  exit 2
fi

# git reset --hard 차단
if echo "$INPUT" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard는 프로젝트 정책으로 차단됨 — 데이터 손실 위험"
  exit 2
fi

exit 0
```

**줄 수**: 30줄
**실행 권한**: `chmod +x` 필수

### 3.2 settings.json 수정

기존 PreToolUse 배열에 Bash 매처 추가:

```json
{
  "PreToolUse": [
    {
      "matcher": "Edit|Write",
      "hooks": [
        { "...기존 보호 파일 차단..." }
      ]
    },
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash .claude/hooks/pre-bash-guard.sh",
          "timeout": 5000
        }
      ]
    }
  ]
}
```

**주의**: 기존 `Edit|Write` 매처와 병렬 배치. Bash 매처는 별도 객체로 추가.

---

## 4. CLAUDE.md 갱신

### 4.1 추가할 내용

`.claude/ 프로젝트 설정` 섹션에 rules/ 목록 추가:

```markdown
- `.claude/rules/` — 코딩 규칙 5종 (coding-style, git-workflow, testing, security, sdd-triangle) — CC 세션 시작 시 자동 로딩
```

### 4.2 축약할 내용

기존 §Testing, §Git Workflow, §Gotchas 등에서 rules/에 이미 포함된 상세 규칙은 "상세: `.claude/rules/{파일}` 참조"로 **축약하지 않는다**. 

**이유**: CLAUDE.md는 프로젝트 개요 + 개발 가이드이고, rules/는 AI 에이전트용 규칙 강제 파일. 역할이 다르므로 중복 허용. CLAUDE.md에서 내용을 삭제하면 사람이 읽을 때 정보 손실.

→ 따라서 CLAUDE.md 기존 내용은 유지하고, `.claude/ 프로젝트 설정` 섹션에 rules/ + hooks/ 목록만 추가.

---

## 5. 검증 체크리스트

| # | 검증 항목 | 방법 | 기대 결과 |
|---|----------|------|----------|
| V-01 | rules/ 5종 파일 존재 | `ls .claude/rules/*.md \| wc -l` | 5 |
| V-02 | 각 파일 30줄 이하 | `wc -l .claude/rules/*.md` | 모두 ≤ 30 |
| V-03 | pre-bash-guard.sh 존재 + 실행 권한 | `ls -la .claude/hooks/pre-bash-guard.sh` | -rwxr-xr-x |
| V-04 | settings.json JSON 유효성 | `python3 -c "import json; json.load(open('.claude/settings.json'))"` | exit 0 |
| V-05 | settings.json에 Bash 매처 존재 | `grep -c '"Bash"' .claude/settings.json` | ≥ 1 |
| V-06 | `git add .` 차단 테스트 | Bash tool로 `git add .` 시도 | BLOCKED 메시지 + exit 2 |
| V-07 | `--no-verify` 차단 테스트 | Bash tool로 `git commit --no-verify` 시도 | BLOCKED 메시지 + exit 2 |
| V-08 | 기존 PostToolUse hooks 정상 | .ts 파일 편집 후 format+typecheck 실행 확인 | 정상 동작 |
| V-09 | CLAUDE.md rules/ 섹션 존재 | `grep 'rules/' CLAUDE.md` | 매치 |
| V-10 | rules/ 합계 줄 수 | `cat .claude/rules/*.md \| wc -l` | ≤ 130 |

---

## 6. 구현 순서 (Do 가이드)

```
Phase A: rules/ 5종 작성 (F330)
  ① coding-style.md  → §2.1 내용 그대로 Write
  ② git-workflow.md   → §2.2 내용 그대로 Write
  ③ testing.md        → §2.3 내용 그대로 Write
  ④ security.md       → §2.4 내용 그대로 Write
  ⑤ sdd-triangle.md   → §2.5 내용 그대로 Write

Phase B: git guard (F331)
  ⑥ pre-bash-guard.sh → §3.1 코드 Write + chmod +x
  ⑦ settings.json     → §3.2 PreToolUse Bash 매처 추가 (Edit)

Phase C: CLAUDE.md 갱신
  ⑧ CLAUDE.md → §4.1 rules/ 섹션 추가 (Edit)

Phase D: 검증
  ⑨ V-01~V-10 체크리스트 실행
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-05 | Initial design — 각 파일 정확한 내용 확정 | Sinclair + Claude Opus 4.6 |
