---
code: FX-SPEC-HRR-001
title: "Foundry-X Harness Rules & Git Guard PRD"
version: "1.0"
status: Active
category: SPEC
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo + Claude Opus 4.6
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Foundry-X Harness Rules & Git Guard PRD

> ECC-to-FX 분석 결과 중 실제 Gap 기반 선별 도입

---

## 1. 배경 및 동기

### 1.1 문제 정의

ECC(Everything Claude Code, 138K+ stars) 분석 결과, Foundry-X `.claude/` 하네스에는 Hooks, Agents, Skills, Settings가 이미 구현되어 있으나, **rules/**와 **git guard**가 누락된 상태:

| 구현 현황 | 수량 |
|-----------|------|
| agents/ | 16종 ✅ |
| skills/ | 15종 (4 카테고리) ✅ |
| hooks/ | PreToolUse 1종 + PostToolUse 3종 ✅ |
| settings.json | permissions + worktree + hooks ✅ |
| **rules/** | **0종 ❌** |
| **PreToolUse bash guard** | **미구현 ❌** |

### 1.2 왜 rules/가 필요한가

현재 코딩 규약은 **CLAUDE.md**에 산재:
- Testing 섹션: Vitest 패턴, ink-testing-library, D1 mock 전략
- Git Workflow 섹션: Squash merge, Linear history
- Design Decisions: 모노리포 규약, hook 우회 금지
- Gotchas: CORS, D1, Zone.Identifier

**문제점:**
1. CLAUDE.md가 215줄+ → AI 에이전트가 모든 규칙을 일관되게 따르기 어려움
2. 새 팀원(AX BD팀 7명) 온보딩 시 규칙 파악에 1~2일 소요
3. Sprint Worktree에서 CLAUDE.md 전체를 읽지 않으면 규칙 누락 발생
4. rules/는 CC(Claude Code)가 세션 시작 시 자동 로딩 → 강제력 높음

### 1.3 왜 git guard가 필요한가

CLAUDE.md에 "git add . 절대 금지", "--no-verify 비율 < 20%" 규칙이 명시되어 있지만:
- 현재 PreToolUse는 `.env/credentials/lock` 파일 편집만 차단
- **Bash 명령에 대한 검사 없음** → `git add .`, `git --no-verify` 통과
- 멀티 pane 환경에서 `git add .`로 다른 세션 변경이 포함되는 사고 이력 있음 (Sprint 17 교훈)

---

## 2. 목표

| 지표 | 현재 | 목표 |
|------|------|------|
| rules/ 파일 수 | 0 | 5종 |
| 새 팀원 규칙 파악 시간 | 1~2일 | 반나절 |
| `git add .` 사용 | 무제한 | 차단 (PreToolUse) |
| `--no-verify` 우회 | 무제한 | 차단 (PreToolUse) |
| AI 에이전트 규칙 준수율 | 측정 안 됨 | rules/ 자동 로딩으로 향상 |

---

## 3. 범위

### 3.1 포함 (In Scope)

**F330: rules/ 5종 신규 작성**
- `rules/coding-style.md` — TS/React 코딩 규약 (Hono, Zustand, Ink, ESLint 3종)
- `rules/git-workflow.md` — Squash merge, Linear history, Sprint Worktree 규칙
- `rules/testing.md` — Vitest, ink-testing-library, D1 mock, E2E functional 수준
- `rules/security.md` — JWT, CORS, Workers 보안, secrets 관리
- `rules/sdd-triangle.md` — Spec ↔ Code ↔ Test 동기화 (Foundry-X 고유)

**F331: PreToolUse git guard 구현**
- `git --no-verify` 차단
- `git add .` 차단 (구체적 파일 지정 강제)
- `git push --force` 차단 (settings.json deny와 중복 방어)
- `git reset --hard` 차단 (settings.json deny와 중복 방어)

### 3.2 제외 (Out of Scope)

| 항목 | 제외 이유 |
|------|----------|
| contexts/ 4종 | 인터뷰 결과 "나중에" — ax plugin 스킬이 이미 모드 역할 수행 |
| Skills ECC 표준화 | 기존 스킬 구조 변경은 별도 트랙 |
| MCP 설정 | 장기 과제, Phase 11 이후 |
| Instinct 학습 체계 | 복잡도 대비 ROI 낮음 (ECC 분석 §4.3과 동일 결론) |

---

## 4. 상세 설계

### 4.1 F330: rules/ 5종

**소스 전략:** CLAUDE.md + ESLint 규칙 + 기존 코드 패턴에서 추출하여 rules/로 분리.

#### rules/coding-style.md (~30줄)
```
소스: CLAUDE.md §Architecture, §Testing, ESLint 커스텀 룰 3종
내용:
- Hono 라우트: Zod 스키마 필수 (require-zod-schema)
- DB 접근: 서비스 레이어 경유 (no-direct-db-in-route)
- Plumb import: 패키지 내부만 (no-orphan-plumb-import)
- React: Zustand(전역) + useState(로컬), Ink 5 TUI
- 테스트 데이터: make*() factory + spread override
```

#### rules/git-workflow.md (~25줄)
```
소스: CLAUDE.md §Git Workflow, MEMORY.md 피드백
내용:
- Squash merge + Linear history
- Sprint Worktree: bash sprint() 함수로만 생성
- git add: 파일 개별 지정 (절대 git add . 금지)
- SPEC 등록 → 커밋 → push → WT 생성 순서
- 자동 커밋 절대 금지 (사람 확인 필수)
```

#### rules/testing.md (~30줄)
```
소스: CLAUDE.md §Testing, MEMORY feedback_e2e_assertion_level
내용:
- Runner: Vitest 3.x
- CLI UI: ink-testing-library (render → lastFrame → assertion)
- API: Hono app.request() + D1 in-memory SQLite mock
- E2E: Playwright, functional 수준 (smoke 아닌 badge/tag/link 검증)
- Test Data: 중앙 fixture factory (test-data.ts, mock-factory.ts)
- Mock 전략: Ink 실제 렌더링, 외부만 mock
```

#### rules/security.md (~25줄)
```
소스: CLAUDE.md §Deployment, §Gotchas
내용:
- JWT + PBKDF2 + RBAC + SSO Hub Token + Google OAuth
- CORS: Pages→Workers 크로스오리진 미들웨어 필수
- Secrets: wrangler secret put (절대 코드에 하드코딩 금지)
- API URL: VITE_API_URL에 /api 경로 포함 필수
- D1 migrations: --remote 별도 실행 (CI/CD 자동이지만 수동 시 누락 주의)
```

#### rules/sdd-triangle.md (~20줄)
```
소스: CLAUDE.md §Architecture 핵심 5축, SPEC.md, 세션 교훈
내용:
- Spec(SPEC.md) ↔ Code ↔ Test 상시 동기화
- SPEC.md = 권위 소스(SSOT)
- F-item 등록 선행: Plan/Design 작성 전 SPEC 등록 필수
- 수치 하드코딩 금지: /ax:daily-check가 실측
- Gap Analysis ≥ 90% 기준
```

### 4.2 F331: PreToolUse git guard

**settings.json hooks 섹션에 추가:**

```json
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
```

**`.claude/hooks/pre-bash-guard.sh` 구현:**

```bash
#!/bin/bash
# PreToolUse: git 위험 명령 차단
# 차단 대상: --no-verify, git add ., git push --force, git reset --hard

INPUT="$CLAUDE_TOOL_INPUT"

# --no-verify 차단
if echo "$INPUT" | grep -qE '\-\-no-verify'; then
  echo "BLOCKED: --no-verify는 프로젝트 정책으로 차단됨"
  exit 2
fi

# git add . 차단 (git add 뒤에 . 또는 -A 또는 --all)
if echo "$INPUT" | grep -qE 'git\s+add\s+(\.|--all|-A)'; then
  echo "BLOCKED: 'git add .'은 금지 — 파일을 개별 지정하세요"
  exit 2
fi

# git push --force 차단
if echo "$INPUT" | grep -qE 'git\s+push\s+.*--force'; then
  echo "BLOCKED: force push는 프로젝트 정책으로 차단됨"
  exit 2
fi

# git reset --hard 차단
if echo "$INPUT" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard는 프로젝트 정책으로 차단됨"
  exit 2
fi

exit 0
```

---

## 5. 구현 계획

### Sprint 할당

| F-item | 제목 | REQ | 우선순위 | Sprint |
|--------|------|-----|---------|--------|
| F330 | rules/ 5종 신규 작성 | FX-REQ-322 | P1 | Sprint 146 |
| F331 | PreToolUse git guard | FX-REQ-323 | P2 | Sprint 146 |

**Sprint 146 예상 범위:**
- rules/ 5종 (각 20~30줄, 총 ~130줄)
- pre-bash-guard.sh 1개 (~25줄)
- settings.json PreToolUse 항목 추가
- CLAUDE.md 갱신 (rules/ 섹션 추가)

**예상 시간:** Sprint 1개 (20~30분, autopilot 가능)

### 의존성

- 선행 없음 (독립 인프라 트랙)
- Phase 13 F322~F328과 병렬 가능

---

## 6. 검증 계획

| 항목 | 검증 방법 |
|------|----------|
| rules/ 5종 존재 | `ls .claude/rules/*.md` → 5개 |
| rules/ CC 자동 로딩 | 새 세션에서 규칙 참조 확인 |
| pre-bash-guard.sh 차단 | `git add .` 시도 → BLOCKED 메시지 |
| `--no-verify` 차단 | `git commit --no-verify` 시도 → BLOCKED |
| CLAUDE.md 반영 | rules/ 섹션 존재 확인 |

---

## 7. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| rules/ 과잉으로 컨텍스트 소모 | 중 | 각 파일 30줄 이하 유지, 핵심만 |
| pre-bash-guard false positive | 중 | grep 패턴을 정밀하게 작성, 테스트 |
| CLAUDE.md와 rules/ 중복 | 낮 | rules/ 분리 후 CLAUDE.md에서 해당 내용 제거 또는 "상세: rules/ 참조"로 변경 |

---

## 8. 결정 사항

| # | 결정 | 근거 |
|---|------|------|
| D1 | rules/ 소스를 코드베이스에서 추출 | ECC 템플릿보다 실제 규칙이 정확 (인터뷰 결정) |
| D2 | contexts/ 제외 | ax plugin 스킬이 이미 모드 역할 수행 (인터뷰 결정) |
| D3 | Phase 13에 포함 | 별도 Phase 불필요, 인프라 개선 성격 (인터뷰 결정) |
| D4 | 5종 한번에 | 각 20~30줄로 소규모, 분할 불필요 (인터뷰 결정) |
| D5 | git guard 예방 차원 | 사고 이력은 Sprint 17이지만, 규칙 강제 필요 (인터뷰 결정) |

---

## 9. 참고

- **원본 분석:** `docs/specs/ECC-to-FX-Analysis-Plan.md`
- **ECC Repository:** github.com/affaan-m/everything-claude-code
- **관련 피드백:** MEMORY.md feedback_multipane_commit (Sprint 17 교훈)
- **Phase 13 근거:** `docs/specs/FX-IA-Change-Plan-v1.3.docx`
