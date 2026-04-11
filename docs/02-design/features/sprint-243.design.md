---
code: FX-DSGN-S243
title: "Sprint 243 Design — F432/F433 Pipeline Phase 6~8 + Monitor 고도화"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-243)
sprint: 243
f_items: [F432, F433]
---

# Sprint 243 Design — Pipeline Phase 6~8 + Monitor 고도화

## 1. 아키텍처 개요

```
┌─────────────────────────┐  ┌──────────────────────────┐
│ sprint-pipeline (Master)│  │ sprint-watch (loop 5m)   │
│   Phase 1~5 실행        │  │   once 실행 시            │
└──────┬──────────────────┘  └────────┬─────────────────┘
       │  /tmp/sprint-pipeline-state   │
       │  .json (status, batches)      │ 1) state 읽기
       │                               │ 2) 모든 배치 completed +
       ▼                               │    phase8.status=pending?
/tmp/sprint-signals/*.signal           │ 3) liveness 확인 (재시작)
  (STATUS=DONE → merge-monitor)        │ 4) 조건 충족 시 finalize 실행
                                       ▼
                      ┌─────────────────────────────────┐
                      │ sprint-pipeline-finalize.sh     │
                      │  Phase 6: Gap 집계              │
                      │  Phase 7: Auto Iterator 판정    │
                      │  Phase 8: Session-End 주입      │
                      └─────────────────────────────────┘
                                       │
                                       ▼
                      /tmp/sprint-signals/
                        Foundry-X-pipeline.signal
                        (STATUS=PIPELINE_COMPLETE)
                      Master tmux 세션에 메시지 주입
```

관심사 분리: merge-monitor 는 Sprint 단건 merge 담당, finalize 는 Pipeline 종단 담당, watch 는 감시·트리거·UI 담당.

## 2. 데이터 모델

### 2.1 Pipeline State JSON 확장

`/tmp/sprint-pipeline-state.json`:

```json
{
  "project": "Foundry-X",
  "created": "2026-04-11T10:00:00+09:00",
  "status": "running",
  "batches": [
    { "id": 1, "sprints": [243], "status": "completed", "sprint_status": {} }
  ],
  "phase6": {
    "status": "pending",
    "aggregate_match_rate": null,
    "min_match_rate": null,
    "sprint_rates": {},
    "started_at": null,
    "completed_at": null
  },
  "phase7": {
    "status": "pending",
    "should_iterate": false,
    "iterate_count": 0,
    "max_iterate": 3,
    "reason": null,
    "started_at": null,
    "completed_at": null
  },
  "phase8": {
    "status": "pending",
    "session_end_triggered": false,
    "master_session": null,
    "started_at": null,
    "completed_at": null
  }
}
```

**Phase status 값**: `pending | running | completed | skipped | failed`.

### 2.2 Signal 확장

신규 signal: `${SIGNAL_DIR}/${PROJECT}-pipeline.signal`

```
STATUS=PIPELINE_COMPLETE
PROJECT=Foundry-X
BATCHES=1
SPRINTS=243
AGGREGATE_MATCH_RATE=94
MIN_MATCH_RATE=92
ITERATE_COUNT=0
PHASE8_STATUS=completed
COMPLETED_AT=2026-04-11T14:00:00+09:00
```

기존 Sprint signal 포맷은 변경 없음.

### 2.3 Monitor Restart Count

`/tmp/sprint-signals/monitor-restart-counts`:

```
sprint-merge-monitor=0
sprint-status-monitor=1
sprint-auto-approve=0
sprint-pipeline-finalize=0
```

- `sprint-pipeline-finalize` 는 one-shot 이므로 liveness 대상에서 **제외**. 재시작 카운트 없음.
- 재시작 3회 초과 시 `STATUS=❌` 표시, 자동 재시작 중단.

## 3. 컴포넌트 설계

### 3.1 `scripts/sprint-pipeline-finalize.sh`

**목적**: Pipeline 전체 배치가 merge 된 후 Phase 6~8 를 순차 실행.

**입력**:
- 환경변수 없음 (state 파일에서 모든 정보 추출)
- `/tmp/sprint-pipeline-state.json` (필수)
- `/tmp/sprint-signals/*.signal` (MATCH_RATE 추출 시 참조)

**옵션**:
- `--dry-run` — state 업데이트는 하되 tmux 주입은 건너뜀. 로그 경로: `/tmp/sprint-pipeline-finalize.dry.log`.

**출력**:
- `/tmp/sprint-pipeline-state.json` 갱신
- `/tmp/sprint-signals/${PROJECT}-pipeline.signal` 생성
- `/tmp/sprint-pipeline-finalize.log` 에 append

**종료 코드**: 0 (정상), 1 (state 파일 없음 혹은 포맷 에러), 2 (Phase 실행 중 치명적 오류)

**알고리즘**:

```
1. state 파일 체크 — 없으면 exit 0 (no-op)
2. jq/python3 로 status, batches, phase6/7/8 파싱
3. status != "running" 이면 exit 0
4. 모든 배치 status = "completed" 확인. 아니면 exit 0 (아직 이른 시점)
5. phase8.status = "completed" 이면 exit 0 (이미 실행됨)
6. ── Phase 6: Gap 집계 ──
   - state 에서 sprint 번호 목록 추출
   - 각 Sprint 의 archived signal 또는 최근 commit 메시지에서 MATCH_RATE 추출 (signal 이 이미 삭제되었으면 /tmp/sprint-signals/archive/ 참조, 없으면 null → 경고 로그)
   - aggregate = avg, min = min
   - state.phase6 업데이트, status="completed"
7. ── Phase 7: Auto Iterator ──
   - min < 90 → should_iterate=true, status="running", Master tmux 에 iterate 명령 주입
     · iterate_count += 1, max=3, 3회 초과 시 status="failed"
   - min >= 90 → status="skipped"
8. ── Phase 8: Session-End ──
   - Master tmux 세션 탐색 (sprint- 접두 제외 세션 중 첫 번째)
   - 세션 없으면 로그만 남기고 status="skipped"
   - 세션 있으면 `/ax:session-end` 전송 + status="completed"
9. Pipeline state.status = "completed"
10. pipeline signal 작성
```

**의존**: `jq` (fallback: python3), `tmux`, `bash 5+`.

### 3.2 `scripts/sprint-watch-liveness.sh`

**목적**: Monitor 4종의 생존 여부를 확인하고 죽어 있으면 재시작. sprint-watch once 내부에서 호출.

**입력**: 없음.
**출력**: stdout 에 markdown 테이블 (`| NAME | PID | UPTIME | STATUS |`).
**종료 코드**: 0.

**감시 대상**:

```bash
MONITORS=(
  "sprint-merge-monitor:bash ~/scripts/sprint-merge-monitor.sh"
  "sprint-status-monitor:bash ~/scripts/sprint-status-monitor.sh 45 60"
  "sprint-auto-approve:bash ~/scripts/sprint-auto-approve.sh 10 120"
)
```

- `sprint-pipeline-finalize` 는 **포함하지 않음** (one-shot 이므로 생존 감시 대상 아님).
- 단 sprint-watch once 는 별도로 finalize 트리거 조건을 확인하여 필요 시 실행.

**알고리즘**:

```
1. RESTART_COUNT_FILE 없으면 touch
2. for ENTRY in MONITORS:
     NAME, CMD = split(":", 1)
     PID = pgrep -f NAME (첫 결과)
     if PID:
       UPTIME = ps -o etime=
       print | NAME | PID | UPTIME | ✅ |
     else:
       PREV = RESTART_COUNT_FILE 에서 NAME 의 카운트 (없으면 0)
       if PREV < 3:
         nohup $CMD > /tmp/sprint-signals/${NAME}-restart.log 2>&1 & disown
         NEW = PREV + 1
         RESTART_COUNT_FILE 업데이트 (sed -i /NAME=/d + append)
         print | NAME | NEW_PID | 0s | 🔄 재시작 (NEW/3) |
       else:
         print | NAME | — | — | ❌ 재시작 한도 초과 |
3. exit 0
```

### 3.3 `.claude/skills/sprint-pipeline/SKILL.md` (신규 override)

**위치**: `.claude/skills/sprint-pipeline/SKILL.md` (디렉토리도 신규 생성)

**구조**:

1. Frontmatter (name: sprint-pipeline, argument-hint, allowed-tools — 플러그인 버전과 호환)
2. Phase 1~5: 캐시 버전 그대로 승계 (축약 없이 전문 복사 — 프로젝트 override 이므로 완결성 유지)
3. **Phase 6 Gap Analyze 집계 (신규)**
4. **Phase 7 Auto Iterator (신규)**
5. **Phase 8 Session-End (신규)**
6. `--resume` 모드 표 확장: phase5→phase6→phase7→phase8 재개 지점 추가
7. Gotchas 섹션: state.phase8 완료 전까지 Master 변경 자제 경고 추가

각 Phase 6~8 설명에는 `sprint-pipeline-finalize.sh` 가 실제 실행 주체이며 sprint-watch 가 트리거한다는 것을 명시.

### 3.4 `.claude/skills/sprint-watch/SKILL.md` 편집

기존 대부분 유지하고 아래 지점 보강:

#### (a) "4. Monitor 생존 감시" 섹션

현재 bash 인라인 코드 → `bash scripts/sprint-watch-liveness.sh` 호출로 치환 (유지보수 단일화).

```bash
# 4. Monitor 생존 감시 + 자동 재시작 (스크립트 위임)
MONITOR_TABLE=$(bash scripts/sprint-watch-liveness.sh)
```

#### (b) "5. Pipeline State 읽기" 섹션

`phase6/phase7/phase8` 실데이터 출력 추가:

```bash
PIPELINE_STATUS=$(python3 <<'PY'
import json
with open('/tmp/sprint-pipeline-state.json') as f:
    s = json.load(f)
if s.get('status') == 'completed':
    print('COMPLETED')
else:
    rows = []
    rows.append(('1~3 배치 계획', 'done' if s.get('batches') else 'pending'))
    batches = s.get('batches', [])
    b_all = all(b.get('status') == 'completed' for b in batches) if batches else False
    rows.append(('4 배치 실행', 'done' if b_all else 'running'))
    rows.append(('5 완료 보고', 'done' if b_all else 'pending'))
    p6 = s.get('phase6', {})
    p7 = s.get('phase7', {})
    p8 = s.get('phase8', {})
    p6_label = f"6 Gap Analyze (avg {p6.get('aggregate_match_rate','-')}%, min {p6.get('min_match_rate','-')}%)"
    p7_label = f"7 Iterator (count {p7.get('iterate_count',0)}/{p7.get('max_iterate',3)})"
    p8_label = "8 Session-End"
    rows.append((p6_label, p6.get('status', 'pending')))
    rows.append((p7_label, p7.get('status', 'pending')))
    rows.append((p8_label, p8.get('status', 'pending')))
    icons = {'completed': '✅', 'done': '✅', 'running': '🔧', 'pending': '⏳',
             'skipped': '⏭️', 'failed': '❌'}
    for name, st in rows:
        print(f"| {name} | {icons.get(st, '?')} |")
    print('ACTIVE')
PY
)
```

#### (c) 신규 섹션: "6. Pipeline Finalize 트리거"

`once` 실행 시 state 조건 충족하면 finalize 를 background 로 실행:

```bash
# 6. Pipeline Finalize 트리거
if [ -f /tmp/sprint-pipeline-state.json ]; then
  NEEDS_FINALIZE=$(python3 <<'PY'
import json
try:
    with open('/tmp/sprint-pipeline-state.json') as f:
        s = json.load(f)
except Exception:
    print('no'); exit()
if s.get('status') == 'completed':
    print('no'); exit()
batches = s.get('batches', [])
if not batches:
    print('no'); exit()
b_all = all(b.get('status') == 'completed' for b in batches)
p8 = s.get('phase8', {}).get('status', 'pending')
print('yes' if (b_all and p8 == 'pending') else 'no')
PY
)
  if [ "$NEEDS_FINALIZE" = "yes" ]; then
    if ! pgrep -f sprint-pipeline-finalize > /dev/null; then
      nohup bash "$(git rev-parse --show-toplevel)/scripts/sprint-pipeline-finalize.sh" \
        > /tmp/sprint-pipeline-finalize.log 2>&1 & disown
      echo "🚀 sprint-pipeline-finalize 자동 실행 (PID: $!)"
    fi
  fi
fi
```

## 4. 시퀀스

### 4.1 Pipeline 정상 경로 (iterate 불필요)

```
T+0m   /ax:sprint-pipeline 243 실행 (Master)
T+0m   sprint-watch /loop 5m 실행 (Master)
T+0m   Phase 1~5: 배치 계획 + WT 생성 + 243 실행
T+5m   sprint-watch once: Monitor 생존 확인, state.running
T+25m  Sprint 243 signal=DONE
T+26m  sprint-merge-monitor: PR merge, D1, deploy
T+27m  sprint-watch once: batches[0].status=completed, phase8.status=pending
       → finalize 트리거
T+27m  finalize:
         Phase 6: MATCH_RATE=94 집계 → phase6.completed
         Phase 7: min=94 >= 90 → phase7.status=skipped
         Phase 8: Master tmux → /ax:session-end 전송
         state.status=completed
         pipeline.signal 생성
T+28m  sprint-watch once: state.status=completed → Gist "COMPLETED" 배너
```

### 4.2 Iterate 필요 경로

```
...
Phase 6: MATCH_RATE=85 (min)
Phase 7: min < 90 → Master tmux "/pdca iterate sprint-243" 전송
         iterate_count=1, phase7.status=running
→ Master Claude iterate 실행 후 재 analyze
→ 재분석 결과 match rate 갱신 (사용자 또는 Claude 가 state 수동 업데이트 가능)
→ 다음 sprint-watch once 가 Phase 7 재평가
iterate_count >= 3 && min < 90 → phase7.status=failed, Phase 8 skip
```

> **주의**: 현 스펙에서 Phase 7 의 반복 루프는 sprint-watch 의 5분 주기로 자연스럽게 구동됨. finalize.sh 는 매 호출마다 idempotent.

### 4.3 Master 세션 부재 경로

```
Phase 8: tmux list-sessions 결과에서 'sprint-' 접두 제외 후 첫 세션 없음
         → phase8.status=skipped
         → 로그: "⚠️ Master session not found — manual session-end required"
         → pipeline.signal 에 PHASE8_STATUS=skipped 기록
         → 정상 종료 (exit 0)
```

## 5. 파일 매핑

| # | 파일 | 종류 | 작업 |
|---|------|------|------|
| 1 | `scripts/sprint-pipeline-finalize.sh` | Bash | 신규 작성 (~200 LOC) |
| 2 | `scripts/sprint-watch-liveness.sh` | Bash | 신규 작성 (~60 LOC) |
| 3 | `.claude/skills/sprint-pipeline/SKILL.md` | Markdown | 신규 작성 (~350 LOC, 캐시 승계 + Phase 6~8) |
| 4 | `.claude/skills/sprint-watch/SKILL.md` | Markdown | 편집 (Monitor 생존 → script 위임, Pipeline State 출력 강화, finalize 트리거 추가) |
| 5 | `docs/01-plan/features/sprint-243.plan.md` | Markdown | Plan (완료) |
| 6 | `docs/02-design/features/sprint-243.design.md` | Markdown | 본 문서 |

## 6. 검증 계획

### 6.1 자동 검증

- `bash -n scripts/sprint-pipeline-finalize.sh`
- `bash -n scripts/sprint-watch-liveness.sh`
- `command -v shellcheck && shellcheck scripts/sprint-pipeline-finalize.sh scripts/sprint-watch-liveness.sh` (있으면)
- SKILL.md frontmatter: `head -20` 으로 수동 확인

### 6.2 Dry-run 검증

```bash
# 1) 샘플 state 준비
cat > /tmp/sprint-pipeline-state.json <<JSON
{"project":"Foundry-X","status":"running",
 "batches":[{"id":1,"sprints":[243],"status":"completed"}],
 "phase6":{"status":"pending"},
 "phase7":{"status":"pending","iterate_count":0,"max_iterate":3},
 "phase8":{"status":"pending"}}
JSON

# 2) 샘플 signal 준비
mkdir -p /tmp/sprint-signals/archive
cat > /tmp/sprint-signals/archive/Foundry-X-243.signal <<SIG
STATUS=DONE
SPRINT_NUM=243
MATCH_RATE=95
TEST_RESULT=pass
SIG

# 3) dry-run 실행
bash scripts/sprint-pipeline-finalize.sh --dry-run

# 4) 검증
python3 -c "import json; s=json.load(open('/tmp/sprint-pipeline-state.json')); assert s['phase6']['status']=='completed'; assert s['phase7']['status']=='skipped'; print('OK')"
```

A3~A7, A9, A10 은 이 dry-run 으로 확인 가능.

### 6.3 수동 확인

- A1: `ls .claude/skills/sprint-pipeline/SKILL.md && head -10`
- A8: sprint-watch once 수동 호출 후 Gist 내용 육안 확인 (optional).

## 7. 롤백 계획

- 모든 변경은 신규 파일 또는 project-level override. 플러그인 캐시 무변경.
- 문제 발생 시: 신규 파일 4개 삭제 + `.claude/skills/sprint-watch/SKILL.md` git revert → 즉시 이전 상태.
- Pipeline state JSON 손상 시: `rm /tmp/sprint-pipeline-state.json` 으로 완전 초기화 가능 (Pipeline 은 idempotent).

## 8. Out-of-Scope 재확인

- ax-plugin 저장소 업스트림 PR (별도 관리)
- sprint-merge-monitor.sh 수정
- Phase 1~5 동작 변경
- D1 / Workers / Web / CLI 코드 변경 없음

## 9. Gap 분석 매핑 (Acceptance Criteria → 구현)

| AC | 파일 | 검증 방법 |
|----|------|-----------|
| A1 | `.claude/skills/sprint-pipeline/SKILL.md` | `grep -c "^## Phase" SKILL.md` ≥ 8 |
| A2 | `scripts/sprint-pipeline-finalize.sh` | `bash -n` |
| A3 | finalize.sh Phase 6 로직 | dry-run + jq 조회 |
| A4 | finalize.sh Phase 7 로직 | dry-run (min=88) |
| A5 | finalize.sh Phase 7 로직 | dry-run (min=92) |
| A6 | finalize.sh Phase 8 로직 | MASTER_SESSION=없음 시 exit 0 |
| A7 | `scripts/sprint-watch-liveness.sh` | `bash -n` + grep 4종 |
| A8 | sprint-watch SKILL.md Phase 5 섹션 | `grep -c "phase6\|phase7\|phase8"` |
| A9 | sprint-watch SKILL.md Phase 6 트리거 | `grep "sprint-pipeline-finalize" sprint-watch/SKILL.md` |
| A10 | liveness.sh restart 로직 | `grep "lt 3" liveness.sh` |
