#!/usr/bin/env bash
# Sprint Pipeline Finalize — Phase 6 (Gap 집계) + Phase 7 (Auto Iterator) + Phase 8 (Session-End)
#
# 호출 주체: sprint-watch once 루프가 "모든 배치 completed + phase8.status=pending" 조건 충족 시 실행.
# 직접 호출도 가능. 어떤 경우에도 idempotent.
#
# Usage:
#   bash scripts/sprint-pipeline-finalize.sh [--dry-run]
#
# 종료 코드:
#   0  정상 (조건 미충족 no-op 포함)
#   1  state 파일 없음/포맷 에러 (정상 no-op)
#   2  Phase 실행 중 치명적 오류

set -o pipefail

STATE_FILE="${SPRINT_PIPELINE_STATE:-/tmp/sprint-pipeline-state.json}"
SIGNAL_DIR="${SPRINT_SIGNAL_DIR:-/tmp/sprint-signals}"
SIGNAL_ARCHIVE="${SIGNAL_DIR}/archive"
LOG_FILE="${SPRINT_PIPELINE_LOG:-/tmp/sprint-pipeline-finalize.log}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true; LOG_FILE="/tmp/sprint-pipeline-finalize.dry.log" ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

mkdir -p "$SIGNAL_DIR" "$SIGNAL_ARCHIVE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── 0. state 파일 확인 ──
if [ ! -f "$STATE_FILE" ]; then
  log "ℹ️ state 파일 없음 — no-op ($STATE_FILE)"
  exit 0
fi

if ! python3 -c "import json; json.load(open('$STATE_FILE'))" 2>/dev/null; then
  log "❌ state JSON 파싱 실패 — exit 1"
  exit 1
fi

PROJECT=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('project','Foundry-X'))")
PIPELINE_STATUS=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('status','unknown'))")

if [ "$PIPELINE_STATUS" = "completed" ]; then
  log "ℹ️ pipeline 이미 completed — no-op"
  exit 0
fi

BATCHES_COMPLETED=$(python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
batches = s.get("batches", [])
print("yes" if batches and all(b.get("status") == "completed" for b in batches) else "no")
PY
)

if [ "$BATCHES_COMPLETED" != "yes" ]; then
  log "ℹ️ 배치 진행 중 — no-op"
  exit 0
fi

PHASE8_STATUS=$(python3 -c "import json; s=json.load(open('$STATE_FILE')); print(s.get('phase8',{}).get('status','pending'))")
if [ "$PHASE8_STATUS" = "completed" ]; then
  log "ℹ️ phase8 이미 completed — no-op"
  exit 0
fi

log "═══════════════════════════════════════"
log "🏁 Pipeline Finalize 시작 (project=$PROJECT, dry-run=$DRY_RUN)"
log "═══════════════════════════════════════"

# ── state 초기 필드 보강 (없으면 기본값 삽입) ──
python3 <<PY
import json, os
path = "$STATE_FILE"
s = json.load(open(path))
changed = False
for k, default in [
    ("phase6", {"status":"pending","aggregate_match_rate":None,"min_match_rate":None,"sprint_rates":{},"started_at":None,"completed_at":None}),
    ("phase7", {"status":"pending","should_iterate":False,"iterate_count":0,"max_iterate":3,"reason":None,"started_at":None,"completed_at":None}),
    ("phase8", {"status":"pending","session_end_triggered":False,"master_session":None,"started_at":None,"completed_at":None}),
]:
    if k not in s:
        s[k] = default
        changed = True
if changed:
    json.dump(s, open(path, "w"), indent=2, ensure_ascii=False)
PY

# ═══ Phase 6: Gap Analyze 집계 ═══
log ""
log "── Phase 6: Gap Analyze 집계 ──"

SPRINT_NUMS=$(python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
nums = []
for b in s.get("batches", []):
    nums.extend(b.get("sprints", []))
print(" ".join(str(n) for n in nums))
PY
)

declare -A SPRINT_RATES
MIN_RATE=101
SUM_RATE=0
COUNT_RATE=0

for N in $SPRINT_NUMS; do
  SIG_ACTIVE="${SIGNAL_DIR}/${PROJECT}-${N}.signal"
  SIG_ARCHIVED="${SIGNAL_ARCHIVE}/${PROJECT}-${N}.signal"
  RATE=""
  for F in "$SIG_ACTIVE" "$SIG_ARCHIVED"; do
    if [ -f "$F" ]; then
      RATE=$(grep "^MATCH_RATE=" "$F" 2>/dev/null | cut -d= -f2)
      [ -n "$RATE" ] && break
    fi
  done
  if [ -z "$RATE" ]; then
    COMMIT_RATE=$(git log --oneline -50 2>/dev/null | grep -i "sprint ${N}" | grep -oP 'match[= ]\K\d+' | head -1)
    RATE="$COMMIT_RATE"
  fi
  if [ -n "$RATE" ] && [[ "$RATE" =~ ^[0-9]+$ ]]; then
    SPRINT_RATES[$N]=$RATE
    SUM_RATE=$((SUM_RATE + RATE))
    COUNT_RATE=$((COUNT_RATE + 1))
    [ "$RATE" -lt "$MIN_RATE" ] && MIN_RATE=$RATE
    log "   Sprint $N: MATCH_RATE=${RATE}%"
  else
    log "   ⚠️ Sprint $N: MATCH_RATE unknown"
  fi
done

if [ "$COUNT_RATE" -gt 0 ]; then
  AGG_RATE=$((SUM_RATE / COUNT_RATE))
else
  AGG_RATE=0
  MIN_RATE=0
fi

log "   ▶ aggregate=${AGG_RATE}%, min=${MIN_RATE}%, sprints=${COUNT_RATE}"

SPRINT_RATES_JSON="{"
FIRST=true
for N in "${!SPRINT_RATES[@]}"; do
  $FIRST || SPRINT_RATES_JSON+=","
  SPRINT_RATES_JSON+="\"${N}\":${SPRINT_RATES[$N]}"
  FIRST=false
done
SPRINT_RATES_JSON+="}"

NOW=$(date -Iseconds)

python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase6"].update({
    "status": "completed",
    "aggregate_match_rate": $AGG_RATE,
    "min_match_rate": $MIN_RATE,
    "sprint_rates": json.loads('$SPRINT_RATES_JSON'),
    "started_at": s["phase6"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY

log "✅ Phase 6 completed"

# ═══ Phase 7: Auto Iterator ═══
log ""
log "── Phase 7: Auto Iterator ──"

P7_STATE=$(python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
p7 = s.get("phase7", {})
print(p7.get("status","pending"), p7.get("iterate_count",0), p7.get("max_iterate",3))
PY
)
read -r P7_STATUS P7_COUNT P7_MAX <<<"$P7_STATE"

if [ "$P7_STATUS" = "completed" ] || [ "$P7_STATUS" = "skipped" ] || [ "$P7_STATUS" = "failed" ]; then
  log "   ℹ️ phase7 이미 $P7_STATUS — 건너뜀"
else
  if [ "$MIN_RATE" -ge 90 ]; then
    log "   ✅ min ${MIN_RATE}% ≥ 90% — iterate 불필요, skipped"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase7"].update({
    "status": "skipped",
    "should_iterate": False,
    "reason": "aggregate ok (min ${MIN_RATE}% >= 90%)",
    "started_at": s["phase7"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
  elif [ "$P7_COUNT" -ge "$P7_MAX" ]; then
    log "   ❌ iterate_count ${P7_COUNT} ≥ max ${P7_MAX} — failed"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase7"].update({
    "status": "failed",
    "should_iterate": False,
    "reason": "max iterations exceeded",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
  else
    NEW_COUNT=$((P7_COUNT + 1))
    log "   🔄 min ${MIN_RATE}% < 90% — iterate 요청 (count=${NEW_COUNT}/${P7_MAX})"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase7"].update({
    "status": "running",
    "should_iterate": True,
    "iterate_count": $NEW_COUNT,
    "reason": "min match rate ${MIN_RATE}% < 90%",
    "started_at": s["phase7"].get("started_at") or "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
    # Master tmux 에 iterate 명령 주입
    if [ "$DRY_RUN" = false ] && command -v tmux &>/dev/null; then
      MASTER_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -v '^sprint-' | head -1)
      if [ -n "$MASTER_SESSION" ]; then
        MSG="Pipeline Phase 7: min match rate ${MIN_RATE}% < 90%. /pdca iterate sprint-${SPRINT_NUMS// /,} 실행 후 재분석해주세요. (iterate ${NEW_COUNT}/${P7_MAX})"
        tmux send-keys -t "$MASTER_SESSION" "$MSG" Enter 2>/dev/null && log "   📡 Master($MASTER_SESSION) iterate 메시지 전송"
      else
        log "   ⚠️ Master session 없음 — 수동 iterate 필요"
      fi
    else
      log "   (dry-run 또는 tmux 없음 — 주입 생략)"
    fi
  fi
fi

# ═══ Phase 8: Session-End ═══
log ""
log "── Phase 8: Session-End ──"

# phase7.status 가 running 이면 아직 iterate 중 → phase8 보류
P7_NOW=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['phase7']['status'])")
if [ "$P7_NOW" = "running" ]; then
  log "   ⏳ phase7 running — phase8 보류 (다음 finalize 호출 시 재평가)"
elif [ "$P7_NOW" = "failed" ]; then
  log "   ❌ phase7 failed — phase8 skip"
  python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase8"].update({
    "status": "skipped",
    "session_end_triggered": False,
    "started_at": s["phase8"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
else
  MASTER_SESSION=""
  if command -v tmux &>/dev/null; then
    MASTER_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep -v '^sprint-' | head -1)
  fi
  if [ "$DRY_RUN" = true ]; then
    log "   (dry-run) phase8 → completed (session=${MASTER_SESSION:-none})"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase8"].update({
    "status": "completed",
    "session_end_triggered": True,
    "master_session": "${MASTER_SESSION}",
    "started_at": s["phase8"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
  elif [ -n "$MASTER_SESSION" ]; then
    tmux send-keys -t "$MASTER_SESSION" "/ax:session-end" Enter 2>/dev/null
    log "   📡 Master($MASTER_SESSION) /ax:session-end 전송"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase8"].update({
    "status": "completed",
    "session_end_triggered": True,
    "master_session": "$MASTER_SESSION",
    "started_at": s["phase8"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
  else
    log "   ⚠️ Master session not found — manual session-end required"
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["phase8"].update({
    "status": "skipped",
    "session_end_triggered": False,
    "master_session": None,
    "started_at": s["phase8"].get("started_at") or "$NOW",
    "completed_at": "$NOW",
})
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
  fi
fi

# ═══ Pipeline state.status 갱신 ═══
FINAL_P8=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['phase8']['status'])")
FINAL_P7=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['phase7']['status'])")

if [ "$FINAL_P8" = "completed" ] || [ "$FINAL_P8" = "skipped" ]; then
  if [ "$FINAL_P7" != "running" ]; then
    python3 <<PY
import json
s = json.load(open("$STATE_FILE"))
s["status"] = "completed"
s["completed_at"] = "$NOW"
json.dump(s, open("$STATE_FILE", "w"), indent=2, ensure_ascii=False)
PY
    log "✅ Pipeline status → completed"

    # Pipeline signal 작성
    SIGNAL_FILE="${SIGNAL_DIR}/${PROJECT}-pipeline.signal"
    cat > "$SIGNAL_FILE" <<SIG
STATUS=PIPELINE_COMPLETE
PROJECT=${PROJECT}
BATCHES=$(python3 -c "import json; print(len(json.load(open('$STATE_FILE'))['batches']))")
SPRINTS=${SPRINT_NUMS// /,}
AGGREGATE_MATCH_RATE=${AGG_RATE}
MIN_MATCH_RATE=${MIN_RATE}
ITERATE_COUNT=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['phase7']['iterate_count'])")
PHASE7_STATUS=${FINAL_P7}
PHASE8_STATUS=${FINAL_P8}
COMPLETED_AT=${NOW}
SIG
    log "📡 pipeline signal 작성: $SIGNAL_FILE"
  fi
fi

log "═══════════════════════════════════════"
log "🏁 Pipeline Finalize 종료"
log "═══════════════════════════════════════"
exit 0
