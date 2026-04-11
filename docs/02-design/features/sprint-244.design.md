---
code: FX-DSGN-S244
title: "Sprint 244 Design — F499/F500 Task Orchestrator S-β + Auto Monitor+Merge"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-244)
sprint: 244
f_items: [F499, F500]
---

# Sprint 244 Design — Task Orchestrator S-β + Auto Monitor+Merge

## 1. 아키텍처 개요

### F499 — Task Orchestrator S-β 확장

```
┌──────────────────────────────────────────────────────────────┐
│                    /ax:task (Master pane)                      │
│                                                                │
│  start ──→ list ──→ doctor ──→ adopt ──→ park/resume          │
│  (S-α ✅)  (S-α→β) (S-β 신규) (S-β 신규) (S-β 신규)          │
└──────┬───────┬────────┬──────────┬──────────┬────────────────┘
       │       │        │          │          │
       ▼       ▼        ▼          ▼          ▼
  ~/.foundry-x/    lib.sh 함수       GitHub Issue labels
  ├─ tasks-cache.json  check_liveness()   fx:status:in_progress
  ├─ task-log.ndjson   update_heartbeat() fx:status:parked
  ├─ locks/            write_signal()     fx:status:reconciled
  └─ notifications.ndjson
```

### F500 — Auto Monitor+Merge 체인

```
Sprint WT                          Master pane
┌──────────────┐                   ┌──────────────────────────────┐
│ autopilot    │                   │ sprint-merge-monitor.sh      │
│  ↓           │   Signal          │   5초 poll:                   │
│ 구현 완료     │──→ STATUS=DONE ──→│   1) PR 확인                  │
│  ↓           │   /tmp/sprint-    │   2) auto-approve (옵션)      │
│ PR 생성      │   signals/        │   3) CI checks 대기           │
│  ↓           │   sprint-{N}/     │   4) squash merge             │
│ Signal 작성  │                   │   5) WT cleanup               │
└──────────────┘                   │   6) MERGED signal 기록       │
                                   └───────────┬──────────────────┘
                                               │ 모든 Sprint merged?
                                               ▼
                                   ┌──────────────────────────────┐
                                   │ sprint-pipeline-finalize.sh  │
                                   │  Phase 6~8 (기존, 변경 없음)  │
                                   └──────────────────────────────┘
```

## 2. F499 상세 설계

### 2.1 task-doctor.sh

**파일**: `scripts/task/task-doctor.sh` (신규)
**의존**: `lib.sh` (check_liveness, cache 함수)

```bash
# 실행 모드
task doctor           # 검사만 (기본 = --dry-run)
task doctor --fix     # 자동 보정 가능한 항목 수정
task doctor --task C5 # 특정 task만 검사
```

**9개 검사 항목**:

| # | 검사 | 소스 비교 | auto-fix |
|---|------|----------|:--------:|
| 1 | SPEC F-item ↔ Issue 상태 | SPEC.md grep ↔ `gh issue view` labels | ❌ (보고만) |
| 2 | Issue ↔ WT 존재 | `gh issue` ↔ `git worktree list` | ❌ (보고만) |
| 3 | WT ↔ 캐시 기록 | `git worktree list` ↔ `tasks-cache.json` | ✅ 캐시 재등록 |
| 4 | heartbeat 만료 | `check_liveness()` 60s threshold | ✅ daemon 재시작 |
| 5 | PID ↔ 프로세스 | PID 파일 ↔ `kill -0` | ✅ PID 파일 삭제 |
| 6 | Signal ↔ 캐시 상태 | Signal 파일 ↔ cache status | ✅ 캐시 갱신 |
| 7 | orphan lock | lock 파일 + `flock --nb` 시도 | ✅ lock 파일 삭제 |
| 8 | log ↔ 캐시 정합성 | task-log.ndjson ↔ tasks-cache.json | ✅ 캐시 재빌드 |
| 9 | Issue label ↔ SPEC 매핑 | `gh issue` labels ↔ SPEC 상태 | ❌ (보고만) |

**출력 포맷**:
```
🔍 Task Doctor — 14 tasks scanned

| Task | Check | Status  | Detail               | Fix? |
|------|-------|---------|-----------------------|------|
| C10  | #4    | ⚠️ STALE | heartbeat 120s ago    | --fix |
| X1   | #3    | ❌ MISS  | WT exists, no cache   | --fix |
| F497 | #1    | ✅ OK    |                       |      |

Summary: 12 OK, 1 STALE, 1 MISS
Auto-fixable: 2 (run `task doctor --fix`)
```

### 2.2 task-adopt.sh

**파일**: `scripts/task/task-adopt.sh` (신규)
**의존**: `lib.sh`, `task-start.sh` (daemon 시작 로직 재사용)

**흐름**:
```
1. git worktree list → WT 목록 수집
2. tasks-cache.json과 diff → "고아 WT" 식별
3. 고아 WT에서 .task-context 읽기 (있으면)
   - 있음: ID/track/title 복원
   - 없음: commit body에서 fx-task-meta JSON 파싱 (권위 소스)
4. cache_upsert_task() → 캐시 등록
5. tmux split-window → pane 생성
6. task-daemon.sh 재시작
7. GitHub Issue 라벨 fx:status:in_progress 복원
```

**인터페이스**:
```bash
task adopt              # 모든 고아 WT 탐색
task adopt --wt C5-...  # 특정 WT 지정
task adopt --dry-run    # 미리보기만
```

### 2.3 task-park.sh

**파일**: `scripts/task/task-park.sh` (신규)
**의존**: `lib.sh`

**park 동작**:
```
1. task ID로 캐시에서 PID/WT 경로 조회
2. daemon 프로세스 SIGTERM → PID 파일 삭제
3. heartbeat 파일에 "PARKED:{timestamp}" 기록
4. .task-context에 park_reason + park_timestamp 추가
5. GitHub Issue 라벨: fx:status:in_progress → fx:status:parked
6. 캐시 상태: IN_PROGRESS → PARKED
7. log_event("parked", ...)
```

**resume 동작**:
```
1. 캐시에서 PARKED 상태 task 조회
2. .task-context에서 park 정보 읽기
3. daemon 재시작 + heartbeat 재개
4. GitHub Issue 라벨: fx:status:parked → fx:status:in_progress
5. 캐시 상태: PARKED → IN_PROGRESS
6. log_event("resumed", ...)
```

**인터페이스**:
```bash
task park C5            # C5 일시정지
task park C5 --reason "waiting for dependency"
task resume C5          # C5 재개
```

### 2.4 task-list.sh liveness 보강

**변경**: `scripts/task/task-list.sh` (기존 82줄)

**추가 컬럼**:
```
| ID  | Track | Title         | Status      | LIVE | Age    |
|-----|-------|---------------|-------------|------|--------|
| C10 | C     | CC 다중 계정   | PLANNED     | —    | 1d     |
| C11 | C     | auto merge    | IN_PROGRESS | ✅   | 2h     |
| X1  | X     | heartbeat     | DONE        | —    | 3d     |
| F497| F     | Task Orch S-α | IN_PROGRESS | ⚠️   | 5d     |
```

**LIVE 컬럼 로직**:
- `—`: DONE/CANCELLED/PLANNED (감시 불필요)
- `✅`: IN_PROGRESS + heartbeat < 60s + PID alive
- `⚠️`: IN_PROGRESS + heartbeat 60~300s (stale)
- `❌`: IN_PROGRESS + heartbeat > 300s 또는 PID dead

## 3. F500 상세 설계

### 3.1 sprint-merge-monitor.sh

**파일**: `scripts/sprint-merge-monitor.sh` (신규, ~150줄 예상)

**메인 루프**:
```bash
while true; do
    for signal_dir in /tmp/sprint-signals/sprint-*/; do
        sprint_num=$(basename "$signal_dir" | sed 's/sprint-//')
        status=$(cat "$signal_dir/STATUS" 2>/dev/null)

        case "$status" in
            DONE)     handle_merge "$sprint_num" ;;
            MERGED)   : ;; # already handled
            FAILED)   : ;; # already reported
            *)        : ;; # RUNNING or unknown
        esac
    done
    sleep 5
done
```

**handle_merge 함수**:
```
1. PR 번호 조회: gh pr list --head "sprint-{N}" --json number
2. PR 없으면: Signal에 ERROR 기록 + skip
3. CI checks 대기: gh pr checks --watch (timeout 5분)
4. CI 실패: Signal FAILED + Master tmux 알림 + skip
5. auto-approve 필요 시: sprint-auto-approve.sh 호출
6. squash merge: gh pr merge {PR} --squash --delete-branch
7. merge 성공: Signal MERGED + WT cleanup + 알림
8. merge 실패: 3회 재시도 → 실패 시 Signal FAILED
```

**재시도 전략**:
```bash
MAX_RETRY=3
for attempt in $(seq 1 $MAX_RETRY); do
    if gh pr merge "$pr_num" --squash --delete-branch 2>/dev/null; then
        write_signal "$signal_dir" "MERGED"
        break
    fi
    sleep $((attempt * 10))  # 10, 20, 30초 백오프
done
```

### 3.2 sprint-auto-approve.sh

**파일**: `scripts/sprint-auto-approve.sh` (신규, ~40줄)

```bash
#!/usr/bin/env bash
# Sprint PR self-approve (Branch protection 대응)
# Usage: sprint-auto-approve.sh <PR_NUMBER>

pr_num="$1"
[[ -z "$pr_num" ]] && { echo "Usage: $0 <PR_NUMBER>"; exit 1; }

# Branch protection에 approve 필요한지 확인
required_approvals=$(gh api "repos/{owner}/{repo}/branches/master/protection" \
    --jq '.required_pull_request_reviews.required_approving_review_count' 2>/dev/null || echo "0")

if [[ "$required_approvals" -gt 0 ]]; then
    gh pr review "$pr_num" --approve --body "Auto-approved by sprint-merge-monitor"
fi
```

### 3.3 sprint-watch-liveness.sh 보강

**변경**: `scripts/sprint-watch-liveness.sh` (기존)

**추가 감시 대상**: merge-monitor 프로세스
```bash
# 기존 3종 → 4종
MONITORS=(
    "sprint-merge-monitor"
    "sprint-status-monitor"    # 향후 F500+ 추가 시
    "sprint-auto-approve"      # 단발성이므로 감시 제외 가능
    "sprint-pipeline-finalize"
)
```

실질적으로 merge-monitor만 상시 프로세스이므로, 이것만 liveness 감시 대상에 추가.

### 3.4 Sprint-watch Gist 연동

**기존 Gist 포맷에 merge 상태 행 추가**:
```
## Sprint Pipeline Status

| Sprint | 상태 | PR | Merge | Match |
|--------|------|-----|-------|-------|
| 244-A  | DONE | #452| ⏳    | 95%   |
| 244-B  | RUNNING | — | —   | —     |

Phase 6: ⏳ | Phase 7: — | Phase 8: —
```

## 4. 파일 목록

### F499 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `scripts/task/task-doctor.sh` | split-brain 9개 검사 + auto-fix | ~200 |
| `scripts/task/task-adopt.sh` | 고아 WT 인수 | ~100 |
| `scripts/task/task-park.sh` | park/resume 서브커맨드 | ~120 |

### F499 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/task/task-list.sh` | LIVE 컬럼 추가 (~30줄) |
| `scripts/task/lib.sh` | `list_orphan_wts()`, `rebuild_cache()` 함수 추가 (~40줄) |
| `.claude/skills/ax-task/SKILL.md` | doctor/adopt/park 사용법 문서 |

### F500 신규 파일

| 파일 | 용도 | 예상 줄 수 |
|------|------|-----------|
| `scripts/sprint-merge-monitor.sh` | Signal→merge 자동 실행 루프 | ~150 |
| `scripts/sprint-auto-approve.sh` | PR self-approve | ~40 |

### F500 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/sprint-watch-liveness.sh` | merge-monitor 감시 추가 (~10줄) |
| `.claude/skills/sprint-watch/SKILL.md` | merge 상태 Gist 표시 문서 |

## 5. 구현 순서

### F499 (Sprint 244-A WT)

```
1. lib.sh 함수 추가 (list_orphan_wts, rebuild_cache)
2. task-doctor.sh — 9개 검사 구현 + --fix 모드
3. task-adopt.sh — 고아 WT 인수
4. task-park.sh — park/resume
5. task-list.sh — LIVE 컬럼 보강
6. SKILL.md 문서 갱신
```

### F500 (Sprint 244-B WT)

```
1. sprint-merge-monitor.sh — Signal 폴링 + merge 실행
2. sprint-auto-approve.sh — PR approve
3. sprint-watch-liveness.sh — merge-monitor 감시 추가
4. sprint-watch SKILL.md 문서 갱신
5. 통합 테스트: Signal STATUS=DONE → merge → MERGED 체인 검증
```

## 6. 의도적 제외 (Gap Analysis 참고용)

| 항목 | 사유 |
|------|------|
| `/ax:task quick` | S-γ 범위 — doctor/adopt/park 안정화 후 |
| merge gate 정확성 체인 | S-γ 범위 — typecheck/test/build/D1 dry-run은 별도 F-item |
| deploy hard gate | S-γ 범위 |
| `sprint-status-monitor.sh` 별도 스크립트 | sprint-watch가 이미 상태 수집 담당 — 중복 방지 |
| inotifywait 기반 Signal 감시 | `/tmp` tmpfs에서 불안정 — poll 방식 채택 |
