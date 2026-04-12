---
code: FX-DSGN-034
title: fx-multi-agent-session Design
version: 1.0
status: Draft
created: 2026-04-12
author: Sinclair Seo
prd: prd-final.md
feature: F510
req: FX-REQ-533
---

# fx-multi-agent-session Design Document

## 1. 설계 개요

Claude Squad(cs)를 Foundry-X 멀티 에이전트 세션 표준 도구로 도입하고, 기존 sprint/task/daemon 인프라와 연동하여 세션 lifecycle을 단일 경로로 통합한다.

### 1.1 설계 원칙

| 원칙 | 설명 |
|------|------|
| cs-first | 세션 생성·격리·정리는 cs에 위임. 기존 tmux split + ccs inject 직접 호출 제거 |
| HOME 정합성 | cs 실행 시 `HOME=/home/sinclair` 강제 (C28 패턴) |
| 병존 허용 | task-daemon.sh는 cs와 독립 유지. 충돌 방지만 설계 |
| 파싱 기반 | cs에 프로그래밍 API 없음 → tmux + git worktree CLI 파싱으로 상태 수집 |

### 1.2 PRD 오픈 이슈 해소

| 이슈 | 해소 방안 |
|------|-----------|
| #1 WSL2 PoC | S262에서 PASS 확인. cs v1.0.17 + tmux 3.5a 정상 동작 |
| #2 프로파일 매핑 | 3종(coder/reviewer/tester) 확정. 확장은 cs 프로파일 추가로 대응 |
| #3 task-daemon 공존 | cs 세션과 daemon은 독립 경로. daemon은 signal 파일 기반, cs는 tmux session 기반 — 상태 겹침 없음 |
| #4 웹 API 상태 읽기 | Workers에서 `tmux`/`cs` CLI 실행 불가 → **로컬 collector 스크립트가 D1에 주기적 sync** |
| #5 KPI 관찰 기간 | 4주 = Sprint 262~263 범위. Report 단계에서 C-track 0건 확인 |

---

## 2. 아키텍처

### 2.1 컴포넌트 구성

```
┌─────────────────────────────────────────────────────┐
│  WSL2 Host (localhost)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ sprint()     │  │ cs (Go)      │  │ task-daemon │ │
│  │ bash 함수    │→ │ 세션 관리     │  │ (독립 유지) │ │
│  └──────────────┘  └──────┬───────┘  └────────────┘ │
│                           │                          │
│  ┌──────────────────────────────────────────┐       │
│  │ tmux 3.5a                                │       │
│  │  session: sprint-262-coder               │       │
│  │  session: sprint-262-reviewer            │       │
│  │  session: sprint-262-tester              │       │
│  └──────────────────────────────────────────┘       │
│                           │                          │
│  ┌──────────────────────────────────────────┐       │
│  │ session-collector.sh (cron 30s)          │       │
│  │  → tmux list-sessions + git worktree list│       │
│  │  → curl POST /api/work/sessions/sync     │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Workers (API)                            │
│  ┌──────────────────────────┐                       │
│  │ GET  /api/work/sessions  │──→ D1 sessions 테이블 │
│  │ POST /api/work/sessions/sync │                   │
│  └──────────────────────────┘                       │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  Cloudflare Pages (Web)                              │
│  ┌──────────────────────────────────────────┐       │
│  │ /work-management                         │       │
│  │  기존 Kanban + [Sessions] 탭 추가        │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

1. `sprint 262` → sprint() bash 함수 → cs 세션 생성 (WT + tmux session)
2. `session-collector.sh` (cron 30s) → tmux/git 파싱 → D1 sync API 호출
3. Web /work-management → `GET /api/work/sessions` (5s polling) → Sessions 패널 렌더링

---

## 3. M1: cs 설치 + 프로파일 3종

### 3.1 현재 상태

- cs v1.0.17 설치 완료 (`~/.claude-work/.local/bin/cs`)
- config: `~/.claude-work/.claude-squad/config.json`
- `HOME=/home/sinclair` prefix 필수 (S262 PoC 확인)

### 3.2 프로파일 정의

cs는 `--program` 플래그로 실행 프로그램을 지정. 프로파일은 bash alias로 구현:

```bash
# ~/.bashrc에 추가
cs-coder()    { HOME=/home/sinclair cs -p "claude --model claude-sonnet-4-6" "$@"; }
cs-reviewer() { HOME=/home/sinclair cs -p "claude --model claude-opus-4-6" "$@"; }
cs-tester()   { HOME=/home/sinclair cs -p "claude --model claude-haiku-4-5-20251001" "$@"; }
```

| 프로파일 | 모델 | 용도 | 근거 |
|----------|------|------|------|
| coder | Sonnet 4.6 | 구현 (sprint autopilot) | 비용 효율 + 속도. feedback_sprint_model.md |
| reviewer | Opus 4.6 | 코드 리뷰, 아키텍처 | 깊은 추론 필요 |
| tester | Haiku 4.5 | 테스트 작성, lint | 반복 작업 최적화 |

### 3.3 agent 매핑

`.claude/agents/*.md` 21종 중 cs 프로파일에 직접 매핑할 3종은 없음 (agents는 Foundry-X 내부 도메인 에이전트). cs 프로파일은 **Claude Code 실행 모델 계층**이므로 별도 차원. agent 파일은 각 세션 내부에서 Claude Code가 자동 참조.

### 3.4 파일 변경

| 파일 | 변경 | 내용 |
|------|------|------|
| `~/.bashrc` | 수정 | cs-coder/cs-reviewer/cs-tester 3 alias 추가 |
| 없음 (cs config) | 유지 | `config.json` default_program은 현행 유지 |

---

## 4. M2: sprint N 훅 연동

### 4.1 현재 sprint() 흐름

```
sprint N → git worktree add → wt.exe 탭 열기 → tmux fallback
```

### 4.2 변경 후 흐름

```
sprint N → git worktree add (기존 유지) → cs 세션 생성 (wt.exe/tmux 대체)
```

**핵심 변경**: sprint() 함수의 Windows Terminal 탭 + tmux fallback 구간을 cs 호출로 대체.

### 4.3 sprint() 함수 수정 설계

```bash
sprint() {
  [ $# -eq 0 ] && { echo "Usage: sprint <N> [N2 N3 ...]"; return 1; }
  local project
  project=$(_cw_project) || { echo "❌ git 프로젝트 안에서 실행해주세요"; return 1; }

  for num in "$@"; do
    local branch="sprint/${num}"
    local wt_dir="$CLAUDE_WT_BASE/$project/sprint-${num}"

    # ── 1. 워크트리 생성 (기존 로직 유지) ──
    if [ ! -d "$wt_dir" ]; then
      mkdir -p "$CLAUDE_WT_BASE/$project"
      if git rev-parse --verify "$branch" >/dev/null 2>&1; then
        git worktree add "$wt_dir" "$branch" || continue
      else
        git worktree add -b "$branch" "$wt_dir" HEAD || continue
      fi
      echo "✅ Sprint $num 워크트리: $wt_dir"
    else
      echo "📂 Sprint $num 이미 존재: $wt_dir"
    fi

    # ── 2. F-item 추출 (기존 로직 유지) ──
    local f_items="" f_title=""
    # ... (기존 awk/grep 로직 그대로)

    # ── 3. cs 세션 생성 (NEW — wt.exe/tmux fallback 대체) ──
    local session_name="sprint-${num}"
    [ -n "$f_items" ] && session_name="sprint-${num}-${f_items}"

    # cs는 cwd 기반으로 worktree를 감지하므로 cd 후 실행
    (
      cd "$wt_dir" || exit 1
      HOME=/home/sinclair cs -p "claude --model claude-sonnet-4-6" &
      disown
    )
    echo "🤖 cs 세션 시작: $session_name (coder 프로파일)"
  done

  _sprint_ensure_monitor
}
```

### 4.4 기존 task-start.sh와의 비충돌

| 구분 | task-start.sh | cs 세션 |
|------|---------------|---------|
| WT 생성 | task-start.sh가 직접 생성 | sprint()가 선행 생성 → cs는 기존 WT 사용 |
| tmux 관리 | split-window + pane ID | cs가 자체 tmux session 관리 |
| 상태 파일 | `/tmp/task-signals/` | cs 내부 상태 (`~/.claude-squad/`) |
| daemon 연동 | daemon이 signal 모니터링 | cs와 무관 — 독립 경로 |

**충돌 방지**: task-start.sh의 `tmux split-window` 경로와 cs의 tmux session 생성은 namespace가 다르므로(task-start는 기존 window 내 pane split, cs는 독립 session 생성) 간섭 없음.

### 4.5 파일 변경

| 파일 | 변경 | 내용 |
|------|------|------|
| `~/.bashrc` sprint() | 수정 | wt.exe/tmux fallback → cs 호출로 교체 |
| `scripts/wt-claude-worktree.sh` | 미변경 | sprint 함수에서 호출 제거되지만 파일은 유지 (rollback용) |

---

## 5. M3: git-workflow.md 연동 규칙

### 5.1 cs 환경 제약 규칙

cs는 `--autoyes` 플래그로 자동 수락 모드를 제공하지만, Foundry-X git-workflow.md 원칙과 충돌:

| 규칙 | cs 적용 방법 |
|------|-------------|
| `git add .` 금지 | cs CLAUDE.md에 명시 → Claude Code가 준수 |
| `--no-verify` 금지 | 동일 |
| 자동 커밋 금지 | `--autoyes` 사용 금지. cs config `auto_yes: false` 유지 |
| Squash merge | cs가 관여 안 함 — PR merge는 기존 경로 |

### 5.2 파일 변경

| 파일 | 변경 | 내용 |
|------|------|------|
| `.claude/rules/git-workflow.md` | 추가 | "cs 운영 규칙" 섹션 — autoyes 금지, HOME prefix 필수 |
| `CLAUDE.md` | 추가 | Architecture 섹션에 cs 도구 설명 1줄 |

### 5.3 변경 내용 상세

**git-workflow.md 추가 섹션:**

```markdown
## Claude Squad (cs) 운영 규칙

- cs 실행 시 `HOME=/home/sinclair` prefix 필수 (multi-account HOME 정합성)
- `--autoyes` (-y) 사용 금지 — 자동 커밋/push 방지
- cs config `auto_yes: false` 유지 확인
- cs 세션 내부에서도 git-workflow.md 전체 규칙 동일 적용
- cs 세션 정리: `HOME=/home/sinclair cs reset` (worktree 잔존 방지)
```

---

## 6. M4: 웹 Kanban 세션 상태 노출

### 6.1 문제: Workers에서 로컬 CLI 실행 불가

Cloudflare Workers는 서버리스 환경으로 `tmux`/`cs`/`git` CLI 실행이 불가능. 따라서 **로컬 collector → D1 sync** 아키텍처를 채택.

### 6.2 session-collector.sh 설계

```bash
#!/usr/bin/env bash
# session-collector.sh — cs/tmux 세션 상태를 D1에 동기화
# cron: */1 * * * * (1분 간격)

set -euo pipefail
API_URL="${FOUNDRY_API_URL:-https://foundry-x-api.ktds-axbd.workers.dev}"
API_TOKEN="${FOUNDRY_API_TOKEN}"  # JWT

# 1. tmux 세션 목록 수집
sessions=$(tmux list-sessions -F '#{session_name}|#{session_activity}|#{session_windows}' 2>/dev/null || echo "")

# 2. git worktree 목록
worktrees=$(git -C ~/work/axbd/Foundry-X worktree list --porcelain 2>/dev/null | \
  awk '/^worktree /{wt=$2} /^branch /{br=$2; print wt"|"br}')

# 3. cs 상태 추론 (tmux session name 패턴)
# cs 세션은 "claude-squad-*" 또는 "sinclair/*" 패턴
payload='{"sessions":['
first=true
while IFS='|' read -r name activity windows; do
  [[ -z "$name" ]] && continue
  # cs 세션 감지: branch_prefix "sinclair/" 매칭
  local status="idle"
  local profile="unknown"
  # 활동 시간 기반 busy/idle 판정 (60초 이내 활동 = busy)
  local now=$(date +%s)
  local diff=$((now - activity))
  [[ $diff -lt 60 ]] && status="busy"

  # 프로파일 추론: session name에서 모델명 파싱
  case "$name" in
    *sonnet*|*coder*)    profile="coder" ;;
    *opus*|*reviewer*)   profile="reviewer" ;;
    *haiku*|*tester*)    profile="tester" ;;
    *sprint-*)           profile="coder" ;;  # sprint 기본 = coder
  esac

  $first || payload+=','
  first=false
  payload+="{\"name\":\"$name\",\"status\":\"$status\",\"profile\":\"$profile\",\"windows\":$windows,\"last_activity\":$activity}"
done <<< "$sessions"
payload+='],"worktrees":['

first=true
while IFS='|' read -r wt_path wt_branch; do
  [[ -z "$wt_path" ]] && continue
  $first || payload+=','
  first=false
  payload+="{\"path\":\"$wt_path\",\"branch\":\"$wt_branch\"}"
done <<< "$worktrees"
payload+='],"collected_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

# 4. API로 전송
curl -s -X POST "$API_URL/api/work/sessions/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d "$payload" >/dev/null
```

### 6.3 D1 스키마

```sql
-- Migration: 0126_agent_sessions.sql

CREATE TABLE IF NOT EXISTS agent_sessions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'idle',  -- busy | idle | done
  profile     TEXT NOT NULL DEFAULT 'coder', -- coder | reviewer | tester
  worktree    TEXT,
  branch      TEXT,
  windows     INTEGER DEFAULT 1,
  last_activity TEXT,
  collected_at TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
```

### 6.4 API 설계

#### POST /api/work/sessions/sync

collector가 호출. 전체 세션 목록을 upsert.

- **Request**: `{ sessions: [...], worktrees: [...], collected_at: string }`
- **Response**: `{ synced: number, removed: number }`
- **로직**: 기존 세션 목록과 diff → INSERT/UPDATE/DELETE (stale 세션 제거)

#### GET /api/work/sessions

웹 Kanban에서 polling으로 호출.

- **Response**: `{ sessions: AgentSession[], worktrees: Worktree[], last_sync: string }`
- **Zod 스키마**:

```typescript
// packages/api/src/schemas/work.ts 에 추가

export const AgentSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["busy", "idle", "done"]),
  profile: z.enum(["coder", "reviewer", "tester", "unknown"]),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  windows: z.number(),
  last_activity: z.string().optional(),
  collected_at: z.string(),
});

export const SessionListSchema = z.object({
  sessions: z.array(AgentSessionSchema),
  worktrees: z.array(z.object({
    path: z.string(),
    branch: z.string(),
  })),
  last_sync: z.string(),
});

export const SessionSyncInputSchema = z.object({
  sessions: z.array(z.object({
    name: z.string(),
    status: z.string(),
    profile: z.string(),
    windows: z.number(),
    last_activity: z.number(),
  })),
  worktrees: z.array(z.object({
    path: z.string(),
    branch: z.string(),
  })),
  collected_at: z.string(),
});
```

### 6.5 Web 컴포넌트 설계

`/work-management` 기존 Kanban에 "Sessions" 탭 추가:

```
┌─────────────────────────────────────────────────────┐
│  Work Management                                     │
│  [Kanban] [Context] [Classify] [Sessions]  ← NEW    │
│                                                      │
│  Sessions 탭 내용:                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ 🟢 busy   │  │ 🟡 idle   │  │ ⚫ done   │       │
│  │           │  │           │  │           │       │
│  │ sprint-262│  │           │  │ sprint-261│       │
│  │ coder     │  │           │  │ coder     │       │
│  │ branch:   │  │           │  │           │       │
│  │ sprint/262│  │           │  │           │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                      │
│  Worktrees:                                          │
│  └ ~/work/worktrees/Foundry-X/sprint-262 (sprint/262)│
│                                                      │
│  Last sync: 30s ago                                  │
└─────────────────────────────────────────────────────┘
```

### 6.6 파일 변경 목록

| 패키지 | 파일 | 변경 | 내용 |
|--------|------|------|------|
| scripts | `scripts/session-collector.sh` | 신규 | tmux/git 파싱 → D1 sync |
| api | `src/db/migrations/0126_agent_sessions.sql` | 신규 | agent_sessions 테이블 |
| api | `src/schemas/work.ts` | 수정 | AgentSession/SessionList/SessionSync 스키마 추가 |
| api | `src/routes/work.ts` | 수정 | GET /sessions + POST /sessions/sync 2 엔드포인트 추가 |
| api | `src/services/work.service.ts` | 수정 | getSessions(), syncSessions() 메서드 추가 |
| web | `src/routes/work-management.tsx` | 수정 | Sessions 탭 + SessionCard 컴포넌트 추가 |
| — | `.claude/rules/git-workflow.md` | 수정 | cs 운영 규칙 섹션 추가 |
| — | `CLAUDE.md` | 수정 | Architecture에 cs 1줄 추가 |

---

## 7. 테스트 전략

### 7.1 M1~M3 (bash/운영 정책)

| 항목 | 검증 방법 |
|------|-----------|
| cs alias 동작 | `cs-coder --help` 정상 출력 |
| sprint → cs 연동 | `sprint 262` 실행 → `tmux list-sessions` 에서 sprint-262 확인 |
| HOME 정합성 | cs 세션 내에서 `echo $HOME` → `/home/sinclair` |
| git-workflow 준수 | cs 세션 내에서 CLAUDE.md 규칙 참조 확인 |

### 7.2 M4 (API + Web)

| 항목 | 검증 방법 |
|------|-----------|
| D1 migration | `wrangler d1 migrations apply` 성공 |
| GET /sessions | Vitest — 빈 목록 + 데이터 있을 때 + 스키마 검증 |
| POST /sessions/sync | Vitest — upsert + stale 삭제 + 스키마 검증 |
| Sessions 탭 | E2E (Playwright) — mock API + 카드 렌더링 + polling |
| Collector | bash 스크립트 단독 실행 → API 호출 성공 확인 (수동) |

---

## 8. 롤백 계획

| 단계 | 롤백 방법 |
|------|-----------|
| M1 (alias) | alias 삭제, cs config 원복 |
| M2 (sprint 함수) | sprint() 함수를 기존 wt.exe/tmux 경로로 원복 (코드 보존됨) |
| M3 (문서) | git revert |
| M4 (API/Web) | D1 migration은 forward-only이므로 agent_sessions 테이블만 남음 (무해). 라우트/컴포넌트 revert |

---

## 9. 구현 순서 (Sprint 262)

```
Step 1: M1 — cs alias 3종 + bashrc 추가 (10분)
Step 2: M2 — sprint() 함수 수정 + 실행 테스트 (30분)
Step 3: M3 — git-workflow.md + CLAUDE.md 갱신 (10분)
Step 4: M4-API — D1 0126 + schema + route + service (1시간)
Step 5: M4-Web — Sessions 탭 + SessionCard (1시간)
Step 6: M4-Collector — session-collector.sh + cron (30분)
Step 7: E2E + 통합 테스트 (30분)
```

**총 예상**: ~4시간 (Sprint 1개 범위)

---

## 10. 리스크 메모

| 리스크 | 대응 |
|--------|------|
| cs가 기존 WT를 무시하고 자체 WT 생성 | sprint()에서 WT를 먼저 생성 후 cs는 해당 디렉토리에서 실행 — cs의 `--program` 모드는 cwd 기준 |
| collector cron이 죽으면 D1 stale | `last_sync` 타임스탬프로 웹에서 "동기화 끊김" 경고 표시 |
| cs reset이 branch 안 지움 | sprint merge 또는 orphan-scan L2가 처리 (기존 4-layer 방어선) |
| HOME 불일치 재발 | cs alias에 `HOME=` 하드코딩 + daily-check에서 검증 |
