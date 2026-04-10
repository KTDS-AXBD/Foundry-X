#!/usr/bin/env bash
# scripts/task/agent-manage.sh — 작업 관리 Agent
#
# 활성 task 모니터링 + 상태 대시보드 + 자동 개입.
# task-watch.sh + task-monitor.sh를 통합 관리하는 상위 레이어.
#
# Usage:
#   agent-manage.sh                    # 대시보드 1회 출력
#   agent-manage.sh --loop [interval]  # 루프 모드 (기본 60s)
#   agent-manage.sh --health           # 데몬 건강 점검
#   agent-manage.sh --recover <id>     # 죽은 task 복구 시도
#   agent-manage.sh --cleanup          # 유령 WT/pane 정리

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

CMD="${1:---dashboard}"
REPO_ROOT=$(_repo_root)
PROJECT=$(basename "$REPO_ROOT")

# ─── Colors (if terminal supports) ──────────────────────────────────────────
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; NC=''
fi

# ─── Dashboard ──────────────────────────────────────────────────────────────
dashboard() {
  local now; now=$(date +%s)

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}  📊 작업 관리 Agent — Dashboard ($(date +%H:%M:%S))              ${CYAN}║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

  # WIP summary
  local wip; wip=$(wip_count)
  local total; total=$(jq -r '.tasks | length' "$FX_CACHE" 2>/dev/null || echo 0)
  local merged; merged=$(jq -r '[.tasks[] | select(.status=="merged")] | length' "$FX_CACHE" 2>/dev/null || echo 0)

  echo -e "${CYAN}║${NC}  WIP: ${wip}/${WIP_CAP}  |  Total: ${total}  |  Merged: ${merged}       ${CYAN}║${NC}"
  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

  # Active tasks detail
  local tasks
  tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.pane)|\(.value.wt)|\(.value.branch)|\(.value.started_at)"' "$FX_CACHE" 2>/dev/null || true)

  if [ -z "$tasks" ]; then
    echo -e "${CYAN}║${NC}  ${YELLOW}활성 task 없음${NC}                                          ${CYAN}║${NC}"
  else
    printf "${CYAN}║${NC}  %-6s %-8s %-10s %-8s %-14s ${CYAN}║${NC}\n" "ID" "Pane" "Liveness" "Runtime" "Branch"
    echo -e "${CYAN}║${NC}  ────── ──────── ────────── ──────── ────────────── ${CYAN}║${NC}"

    while IFS='|' read -r tid pane wt branch started; do
      [ -z "$tid" ] && continue

      # Pane alive check
      local pane_status="❓"
      if [ -n "$pane" ] && [ "$pane" != "unknown" ]; then
        if tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane}$"; then
          pane_status="${GREEN}alive${NC}"
        else
          pane_status="${RED}dead${NC}"
        fi
      fi

      # Liveness check
      local liveness="—"
      if [ -d "$wt" ] && [ -f "$wt/.task-context" ]; then
        liveness=$(check_liveness "$wt/.task-context")
        case "$liveness" in
          ok) liveness="${GREEN}ok${NC}" ;;
          stale) liveness="${YELLOW}stale${NC}" ;;
          dead) liveness="${RED}dead${NC}" ;;
        esac
      elif [ ! -d "$wt" ]; then
        liveness="${RED}no-wt${NC}"
      fi

      # Runtime
      local runtime="—"
      if [ -n "$started" ]; then
        local start_epoch
        start_epoch=$(date -d "$started" +%s 2>/dev/null || echo 0)
        if [ "$start_epoch" -gt 0 ]; then
          local elapsed=$(( now - start_epoch ))
          local mins=$(( elapsed / 60 ))
          if [ "$mins" -ge 60 ]; then
            runtime="$(( mins / 60 ))h$((mins % 60))m"
          else
            runtime="${mins}m"
          fi
        fi
      fi

      # Short branch
      local short_branch
      short_branch=$(echo "$branch" | sed 's|task/||' | cut -c1-14)

      printf "${CYAN}║${NC}  %-6s %-8s %-10b %-8s %-14s ${CYAN}║${NC}\n" \
        "$tid" "${pane:-—}" "$liveness" "$runtime" "$short_branch"
    done <<< "$tasks"
  fi

  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

  # Recent completions
  local recent
  recent=$(jq -r '.tasks | to_entries[] | select(.value.status=="merged") | "\(.key)|\(.value.updated_at)|\(.value.issue_url)"' "$FX_CACHE" 2>/dev/null | tail -3)
  if [ -n "$recent" ]; then
    echo -e "${CYAN}║${NC}  최근 완료:                                               ${CYAN}║${NC}"
    while IFS='|' read -r tid updated url; do
      [ -z "$tid" ] && continue
      local pr_num
      pr_num=$(echo "$url" | grep -oE '[0-9]+$' || echo "—")
      printf "${CYAN}║${NC}    ${GREEN}✅${NC} %-6s  PR#%-5s  %s        ${CYAN}║${NC}\n" "$tid" "$pr_num" "${updated:-—}"
    done <<< "$recent"
  fi

  echo -e "${CYAN}╠══════════════════════════════════════════════════════════════╣${NC}"

  # Daemon health
  local mon_ok=false watch_ok=false
  if [ -f /tmp/task-signals/.monitor.pid ] && kill -0 "$(cat /tmp/task-signals/.monitor.pid)" 2>/dev/null; then
    mon_ok=true
  fi
  if [ -f /tmp/task-signals/.watch.pid ] && kill -0 "$(cat /tmp/task-signals/.watch.pid)" 2>/dev/null; then
    watch_ok=true
  fi

  local mon_label watch_label
  [ "$mon_ok" = true ] && mon_label="${GREEN}✅ running${NC}" || mon_label="${RED}❌ stopped${NC}"
  [ "$watch_ok" = true ] && watch_label="${GREEN}✅ running${NC}" || watch_label="${RED}❌ stopped${NC}"

  echo -e "${CYAN}║${NC}  데몬 상태:                                               ${CYAN}║${NC}"
  echo -e "${CYAN}║${NC}    monitor: ${mon_label}   watch: ${watch_label}          ${CYAN}║${NC}"

  # Pending signals
  local sig_count=0
  sig_count=$(find "${FX_SIGNAL_DIR}" -name "${PROJECT}-*.signal" 2>/dev/null | wc -l)
  if [ "$sig_count" -gt 0 ]; then
    echo -e "${CYAN}║${NC}    ${YELLOW}⚡ 미처리 signal: ${sig_count}건${NC}                              ${CYAN}║${NC}"
  fi

  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ─── Health check (daemon + WTs) ───────────────────────────────────────────
health_check() {
  echo "[agent-manage] 건강 점검 시작..."
  local issues=0

  # 1. Daemon health
  if ! [ -f /tmp/task-signals/.monitor.pid ] || ! kill -0 "$(cat /tmp/task-signals/.monitor.pid)" 2>/dev/null; then
    echo "  ❌ task-monitor 중단 — 재시작 중..."
    nohup bash "$REPO_ROOT/scripts/task/task-monitor.sh" --interval 30 \
      > "/tmp/task-signals/monitor-${PROJECT}.log" 2>&1 &
    echo $! > /tmp/task-signals/.monitor.pid
    disown
    echo "  ✅ task-monitor 재시작 (PID $(cat /tmp/task-signals/.monitor.pid))"
    issues=$((issues + 1))
  else
    echo "  ✅ task-monitor 정상 (PID $(cat /tmp/task-signals/.monitor.pid))"
  fi

  if ! [ -f /tmp/task-signals/.watch.pid ] || ! kill -0 "$(cat /tmp/task-signals/.watch.pid)" 2>/dev/null; then
    echo "  ❌ task-watch 중단 — 재시작 중..."
    nohup bash "$REPO_ROOT/scripts/task/task-watch.sh" --interval 20 \
      > "/tmp/task-signals/watch-${PROJECT}.log" 2>&1 &
    echo $! > /tmp/task-signals/.watch.pid
    disown
    echo "  ✅ task-watch 재시작 (PID $(cat /tmp/task-signals/.watch.pid))"
    issues=$((issues + 1))
  else
    echo "  ✅ task-watch 정상 (PID $(cat /tmp/task-signals/.watch.pid))"
  fi

  # 2. WT integrity
  local tasks
  tasks=$(jq -r '.tasks | to_entries[] | select(.value.status=="in_progress") | "\(.key)|\(.value.wt)|\(.value.pane)"' "$FX_CACHE" 2>/dev/null || true)

  if [ -n "$tasks" ]; then
    while IFS='|' read -r tid wt pane; do
      [ -z "$tid" ] && continue

      # WT exists?
      if [ ! -d "$wt" ]; then
        echo "  ⚠️  ${tid}: WT 경로 없음 (${wt})"
        issues=$((issues + 1))
        continue
      fi

      # Pane alive?
      if [ -n "$pane" ] && [ "$pane" != "unknown" ]; then
        if ! tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane}$"; then
          echo "  ⚠️  ${tid}: pane ${pane} 소멸 — Claude 세션 crash 가능성"
          issues=$((issues + 1))
        else
          echo "  ✅ ${tid}: pane ${pane} 정상"
        fi
      fi

      # Heartbeat
      if [ -f "$wt/.task-context" ]; then
        local live; live=$(check_liveness "$wt/.task-context")
        if [ "$live" = "dead" ]; then
          echo "  ❌ ${tid}: heartbeat dead — 복구 필요 (--recover ${tid})"
          issues=$((issues + 1))
        elif [ "$live" = "stale" ]; then
          echo "  ⚠️  ${tid}: heartbeat stale (5~10분 무응답)"
          issues=$((issues + 1))
        fi
      fi
    done <<< "$tasks"
  fi

  # 3. Ghost worktrees
  local wt_list
  wt_list=$(git worktree list 2>/dev/null | grep -v '\[master\]' || true)
  if [ -n "$wt_list" ]; then
    while read -r wt_path _ _; do
      local wt_base; wt_base=$(basename "$wt_path")
      local wt_tid
      wt_tid=$(echo "$wt_base" | grep -oE '^[FBCX][0-9]+' || true)
      if [ -n "$wt_tid" ]; then
        local cache_status
        cache_status=$(jq -r --arg id "$wt_tid" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
        if [ "$cache_status" = "merged" ] || [ "$cache_status" = "cancelled" ]; then
          echo "  🧟 ghost WT: ${wt_path} (cache=${cache_status}) — --cleanup으로 제거"
          issues=$((issues + 1))
        fi
      fi
    done <<< "$wt_list"
  fi

  echo ""
  if [ "$issues" -eq 0 ]; then
    echo "  🎉 모든 점검 통과 — 이상 없음"
  else
    echo "  ⚠️  ${issues}건 이슈 감지"
  fi
}

# ─── Recover dead task ─────────────────────────────────────────────────────
recover_task() {
  local tid="$1"
  [ -z "$tid" ] && { echo "Usage: agent-manage.sh --recover <task_id>" >&2; exit 1; }

  local wt pane branch
  wt=$(jq -r --arg id "$tid" '.tasks[$id].wt // ""' "$FX_CACHE" 2>/dev/null)
  pane=$(jq -r --arg id "$tid" '.tasks[$id].pane // ""' "$FX_CACHE" 2>/dev/null)
  branch=$(jq -r --arg id "$tid" '.tasks[$id].branch // ""' "$FX_CACHE" 2>/dev/null)

  echo "[agent-manage] ${tid} 복구 시도..."

  # Check WT
  if [ ! -d "$wt" ]; then
    echo "  ❌ WT 없음 — 복구 불가. task-complete --no-pr 실행 권장" >&2
    return 1
  fi

  # Kill old pane if exists
  if [ -n "$pane" ] && tmux list-panes -a -F '#{pane_id}' 2>/dev/null | grep -q "^${pane}$"; then
    echo "  기존 pane ${pane} 종료"
    tmux kill-pane -t "$pane" 2>/dev/null || true
  fi

  # Create new pane
  local new_pane
  new_pane=$(tmux split-window -h -P -F '#{pane_id}' -c "$wt" 2>/dev/null || echo "")
  if [ -z "$new_pane" ]; then
    echo "  ❌ tmux pane 생성 실패" >&2
    return 1
  fi

  tmux select-pane -t "$new_pane" -T "${tid} (recovered)" 2>/dev/null || true
  tmux set -p -t "$new_pane" @fx-task-id "$tid" 2>/dev/null || true

  # Update cache with new pane
  local track; track=$(jq -r --arg id "$tid" '.tasks[$id].track // ""' "$FX_CACHE" 2>/dev/null)
  local issue; issue=$(jq -r --arg id "$tid" '.tasks[$id].issue_url // ""' "$FX_CACHE" 2>/dev/null)
  cache_upsert_task "$tid" "in_progress" "$track" "$new_pane" "$wt" "$branch" "$issue"

  # Read prompt from .task-prompt and re-inject
  local prompt_file="$wt/.task-prompt"
  if [ -f "$prompt_file" ]; then
    local prompt; prompt=$(cat "$prompt_file")
    (
      tmux send-keys -t "$new_pane" "ccs" Enter
      sleep 8
      local rename_label="${tid} (recovered)"
      tmux send-keys -t "$new_pane" "/rename ${rename_label}" Enter
      sleep 1
      tmux send-keys -t "$new_pane" "/ax:session-start $(printf '%s' "$prompt" | tr '\n' ' ')" Enter
    ) &
    disown
    echo "  ✅ ${tid} 복구 완료 — new pane: ${new_pane}, ccs 주입 중"
  else
    echo "  ⚠️  ${tid} pane 생성 완료 (${new_pane}) — .task-prompt 없어서 수동 시작 필요"
  fi

  log_event "$tid" "recovered" "$(jq -nc --arg old "$pane" --arg new "$new_pane" '{old_pane:$old, new_pane:$new}')"
}

# ─── Cleanup ghosts ───────────────────────────────────────────────────────
cleanup_ghosts() {
  echo "[agent-manage] 유령 WT/pane 정리..."
  local cleaned=0

  # Ghost panes (no matching task)
  local all_panes
  all_panes=$(tmux list-panes -a -F '#{pane_id}' 2>/dev/null || true)
  for pane in $all_panes; do
    local fx_tid
    fx_tid=$(tmux show -p -t "$pane" @fx-task-id 2>/dev/null || true)
    if [ -n "$fx_tid" ]; then
      local status
      status=$(jq -r --arg id "$fx_tid" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
      if [ "$status" = "merged" ] || [ "$status" = "cancelled" ]; then
        echo "  🧟 pane ${pane} (task=${fx_tid}, status=${status}) 종료"
        tmux kill-pane -t "$pane" 2>/dev/null || true
        cleaned=$((cleaned + 1))
      fi
    fi
  done

  # Ghost worktrees
  local wt_list
  wt_list=$(git worktree list 2>/dev/null | grep -v '\[master\]' || true)
  if [ -n "$wt_list" ]; then
    while read -r wt_path _ _; do
      local wt_tid
      wt_tid=$(basename "$wt_path" | grep -oE '^[FBCX][0-9]+' || true)
      if [ -n "$wt_tid" ]; then
        local status
        status=$(jq -r --arg id "$wt_tid" '.tasks[$id].status // "unknown"' "$FX_CACHE" 2>/dev/null)
        if [ "$status" = "merged" ] || [ "$status" = "cancelled" ]; then
          echo "  🧟 WT ${wt_path} (${wt_tid}, ${status}) 제거"
          git worktree remove "$wt_path" --force 2>/dev/null || true
          cleaned=$((cleaned + 1))
        fi
      fi
    done <<< "$wt_list"
  fi

  echo "  정리 완료: ${cleaned}건"
}

# ─── Main dispatch ──────────────────────────────────────────────────────────
case "$CMD" in
  --dashboard|"") dashboard ;;
  --loop)
    INTERVAL="${2:-60}"
    echo "[agent-manage] 루프 모드 — ${INTERVAL}s 간격"
    while true; do
      clear
      dashboard
      sleep "$INTERVAL"
    done
    ;;
  --health) health_check ;;
  --recover) recover_task "$2" ;;
  --cleanup) cleanup_ghosts ;;
  *)
    echo "Usage: agent-manage.sh [--dashboard|--loop [sec]|--health|--recover <id>|--cleanup]" >&2
    exit 1
    ;;
esac
