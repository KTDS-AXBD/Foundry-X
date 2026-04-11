---
name: sprint-pipeline
description: Master에서 복수 Sprint를 의존성 분석→배치 병렬 실행→자동 merge→Gap 집계→Auto Iterate→Session-End까지 종단 자동화
user-invocable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, Skill, AskUserQuestion
argument-hint: "<N,N,...> [--resume] [--dry-run]"
---

# Sprint Pipeline — Master 오케스트레이터 (Phase 1~8)

복수 Sprint를 의존성 분석하여 병렬 배치로 자동 실행하고, **모든 배치 merge 후 Gap 집계 → Auto Iterate → Session-End** 까지 자동 수행한다.

> 이 파일은 Foundry-X project override. 플러그인 기본(`~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/sprint-pipeline/SKILL.md`) 의 Phase 1~5 를 승계하고 **Phase 6/7/8 (Sprint 243, F432)** 을 추가한다.

## Arguments

- `61 62 65 66 67` — Sprint 번호 목록
- `next` — SPEC.md에서 📋 상태인 Sprint 자동 수집
- `--resume` — pipeline-state.json에서 이어서 실행
- `--dry-run` — 배치 계획만 출력, 실행 안 함

## 사전 조건

1. Master 브랜치에서 실행 (worktree에서 실행 금지)
2. `wt.exe` 사용 가능 (Windows Terminal)
3. `tmux` 사용 가능

## Phase 개요

| Phase | 이름 | 주체 | 입력 | 출력 |
|-------|------|------|------|------|
| 1 | Sprint 수집 | sprint-pipeline | SPEC.md F-item | Sprint+의존성 |
| 2 | 의존성 분석/배치 계획 | sprint-pipeline | 수집 결과 | 배치 JSON |
| 3 | Pipeline State 초기화 | sprint-pipeline | 배치 계획 | state.json |
| 4 | 배치 실행 | ccw-auto + merge-monitor | state.json | signal DONE |
| 5 | 완료 보고 (배치 단위) | merge-monitor | signal DONE | master merge |
| **6** | **Gap Analyze 집계** | **finalize.sh** | **Sprint signals** | **phase6.aggregate** |
| **7** | **Auto Iterator** | **finalize.sh + Master Claude** | **min match rate** | **phase7.status** |
| **8** | **Session-End** | **finalize.sh + Master Claude** | **phase7 ok** | **SPEC/MEMORY sync + push** |

## 실행 흐름

### Phase 1: Sprint 수집

**번호 직접 지정 시**: 해당 Sprint의 SPEC.md F-item 정보 수집
**`next` 지정 시**: SPEC.md에서 📋 상태인 Sprint 번호를 자동 수집

각 Sprint에 대해:
- F-items (F번호 + 제목)
- 의존성 (비고 컬럼에서 "선행", "의존" 키워드 파싱)
- Plan/Design 존재 여부 확인

### Phase 2: 의존성 분석 + 배치 계획

**의존성 그래프 생성**: SPEC.md F-item 비고 컬럼에서 `선행`, `의존`, `순차`, `병렬 가능` 키워드 파싱.

**배치 생성 알고리즘** (위상 정렬):
```
1. 의존성 없는 Sprint = Batch 1
2. Batch 1 완료 후 의존 해소된 Sprint = Batch 2
3. 반복
```

**배치 계획 출력** (예):
```
### 배치 계획
| Batch | Sprint | F-items | 병렬 | Plan | Design |
|-------|--------|---------|:----:|:----:|:------:|
| 1 | 61, 66, 67 | F197~F198, F203~F204+F208, F209~F210 | 3 병렬 | ✅/📋 | ✅/📋 |
| 2 | 62 | F199+F200 | 1 | ✅ | ✅ |
| 3 | 65 | F201+F202+F207 | 1 | 📋 | 📋 |
```

AskUserQuestion으로 실행 여부 확인.

### Phase 3: Pipeline State 초기화

```
STATE_FILE=/tmp/sprint-pipeline-state.json
```

```json
{
  "project": "Foundry-X",
  "created": "<iso>",
  "status": "running",
  "batches": [ { "id": 1, "sprints": [...], "status": "pending", "sprint_status": {} } ],
  "phase6": { "status": "pending", "aggregate_match_rate": null, "min_match_rate": null, "sprint_rates": {} },
  "phase7": { "status": "pending", "should_iterate": false, "iterate_count": 0, "max_iterate": 3 },
  "phase8": { "status": "pending", "session_end_triggered": false, "master_session": null }
}
```

> **중요**: `phase6/phase7/phase8` 필드를 초기화 시점에 포함시켜야 sprint-watch 가 진행률 표시에 사용 가능.

### Phase 4: 배치별 실행 루프

각 배치 단위로:

**4a. Worktree 생성 + WT 탭 열기**: `sprint N` 함수 + `.sprint-context` 생성 + 초기 signal(`STATUS=CREATED`).

**4b. Sprint WT에서 ccw-auto 자동 시작**: tmux send-keys 로 `ccw-auto` 주입 → autopilot.

**4c. Merge Monitor 시작 (background)**:
```bash
bash ~/scripts/sprint-merge-monitor.sh
```

**4d. Monitor 완료 알림 수신**: Monitor 가 배치 내 모든 Sprint signal 처리하면 master merge 완료.

**4e. SPEC.md 갱신**: Merge 완료된 Sprint 의 F-item 을 📋→✅. 수치(endpoints/services/tests) 갱신.

**4f. Pipeline State 갱신**: 배치 status 를 `completed / partial / failed` 로.

**4g. 다음 배치로** (Phase 4a 부터 반복).

### Phase 5: 배치 단위 완료 보고

각 배치 완료 시 요약 출력:
```
| Batch | Sprint | 상태 | Match Rate | PR |
|-------|--------|:----:|:----------:|:--:|
| 1 | 61 | ✅ | 93% | #183 |
```

배치 종료마다 state.batches[id].status 갱신. **모든 배치가 `completed` 가 되면 sprint-watch 가 Phase 6 을 자동 트리거**.

### Phase 6: Gap Analyze 집계 (F432)

**주체**: `scripts/sprint-pipeline-finalize.sh` (sprint-watch once 가 트리거)

**트리거 조건**: `status=running` + 모든 `batches[].status=completed` + `phase8.status=pending`.

**동작**:
1. state 파일에서 Sprint 번호 목록 추출.
2. 각 Sprint 의 signal (`/tmp/sprint-signals/${PROJECT}-${N}.signal` → 없으면 `archive/` → 없으면 최근 master 커밋 메시지 `match=NN` 패턴) 에서 `MATCH_RATE` 추출.
3. `aggregate = avg`, `min = min` 계산.
4. `state.phase6.{status,aggregate_match_rate,min_match_rate,sprint_rates,completed_at}` 업데이트.

**idempotency**: `phase6.status=completed` 이면 재실행 시 no-op 처럼 통과.

### Phase 7: Auto Iterator (F432)

**주체**: `scripts/sprint-pipeline-finalize.sh` + Master tmux 세션

**분기**:
- `min_match_rate >= 90` → `phase7.status=skipped`, `reason="aggregate ok"`.
- `min_match_rate < 90` + `iterate_count < max_iterate(3)`:
  - `iterate_count += 1`, `status=running`.
  - Master tmux 세션(이름이 `sprint-` 로 시작하지 않는 첫 세션) 에 메시지 전송:
    ```
    Pipeline Phase 7: min match rate NN% < 90%.
    /pdca iterate sprint-N,N,... 실행 후 재분석해주세요. (iterate k/3)
    ```
  - 다음 sprint-watch once 가 5 분 후 재평가.
- `iterate_count >= max_iterate` → `status=failed`, `reason="max iterations exceeded"`.

**재진입**: finalize.sh 는 매번 idempotent. `phase7.status=running` 이면 Phase 8 은 보류.

### Phase 8: Session-End (F432)

**주체**: `scripts/sprint-pipeline-finalize.sh` + Master tmux 세션

**분기**:
- `phase7.status in {completed, skipped}` + Master tmux 세션 존재:
  - tmux send-keys `/ax:session-end` + Enter.
  - `phase8.status=completed`.
- Master 세션 없음: `phase8.status=skipped`, 로그만 남김, 사람이 수동 실행.
- `phase7.status=failed`: `phase8.status=skipped`.
- `phase7.status=running`: 보류 (다음 finalize 호출 시 재평가).

**완료 시**:
- `state.status=completed`.
- `/tmp/sprint-signals/${PROJECT}-pipeline.signal` 작성 (`STATUS=PIPELINE_COMPLETE`, sprints, match rate, phase8 status).

## --resume 모드

`/tmp/sprint-pipeline-state.json` 의 상태와 `phase*.status` 를 읽어 재개:

| state            | 재개 시작 |
|------------------|-----------|
| (state 없음)     | Phase 1 |
| batches pending  | Phase 4 |
| batches partial  | 미완 Sprint 만 재실행 |
| batches all done, phase6 pending | Phase 6 (finalize) |
| phase6 done, phase7 pending | Phase 7 |
| phase7 running (iterate 중) | Phase 7 재평가 |
| phase7 done, phase8 pending | Phase 8 |
| phase8 done      | no-op (이미 completed) |

## --dry-run 모드

Phase 1~2 만 실행해 배치 계획을 출력한 뒤 종료. finalize.sh 는 `--dry-run` 옵션으로 별도 dry 실행 가능.

## 안전 장치 요약

1. **Worktree 격리**: master 는 merge 전까지 불변.
2. **Signal 상태 머신**: CREATED → IN_PROGRESS → DONE/FAILED/TIMEOUT.
3. **Checkpoint 재개**: 각 단계 완료 시 기록, `--resume` 로 이어서.
4. **Merge Gate**: test pass + Match Rate ≥ 90% 필수.
5. **Pipeline State**: JSON 으로 배치+Phase 6~8 상태 추적.
6. **Auto Iterate hard limit**: `iterate_count < 3`.
7. **finalize idempotency**: state 기반 → 반복 호출 안전.
8. **타임아웃**: Sprint 30분, Pipeline 배치 45분.

## Gotchas

- Master 브랜치에서만 실행 (worktree 에서 실행하면 에러).
- Pipeline 실행 중 master 에 다른 변경 push 하면 충돌 위험 — Pipeline 중 master 변경 자제.
- 병렬 배치 Sprint 수 ≥ 3 이면 WT 탭 다수 → 모니터 해상도 확인.
- ccw-auto 미적용 시 자동 시작 불가 → 수동 모드 fallback.
- **Phase 7 iterate 주입 후 Master Claude 가 수동으로 match rate 갱신 필요**. 현재 finalize.sh 는 signal 재 reading 으로만 재평가함.
- **sprint-pipeline-finalize.sh 트리거 주체는 sprint-watch**. sprint-watch 가 동작 중이어야 Phase 6~8 가 자동 실행됨. 단독 호출도 가능: `bash scripts/sprint-pipeline-finalize.sh`.
