---
code: FX-PLAN-S244
title: "Sprint 244 Plan — F499/F500 Task Orchestrator S-β + Auto Monitor+Merge"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-244)
sprint: 244
f_items: [F499, F500]
---

# Sprint 244 Plan — Task Orchestrator S-β + Auto Monitor+Merge

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 244 |
| F-items | F499, F500 |
| REQ | FX-REQ-495, FX-REQ-494 |
| 우선순위 | P1 |
| 의존성 | 독립 (F499, F500 병렬) |
| 목표 | S-α(start+list) → S-β(doctor/adopt/park + IPC) 확장 + Sprint WT Signal→merge 자동 체인 구축 |
| 대상 코드 | F499: `scripts/task/{task-doctor.sh,task-adopt.sh,task-park.sh}` (신규) + `task-list.sh` (보강) / F500: `scripts/sprint-merge-monitor.sh` (신규) + `scripts/sprint-auto-approve.sh` (신규) |

## 문제 정의

### F499 — 현재 상태 (S-α 기준)

- `task-start.sh` (345줄): 8단계 완전 구현 (ID 할당→SPEC 등록→WT 생성→tmux split→Claude 주입→Issue 생성→daemon 시작)
- `task-list.sh` (82줄): 캐시 읽기 + 테이블 출력만. liveness probe 없음 — 죽은 task도 PLANNED/IN_PROGRESS로 표시
- `task-daemon.sh` (486줄): signal 처리 + pane 감시 + 자동 복구. S-α에서 이미 기동 중
- `task-complete.sh` (131줄): signal 작성 + PR 생성 완료
- `lib.sh` (238줄): `check_liveness`, `write_signal`, `update_heartbeat` 등 IPC 기반 함수 구현 완료
- **미구현**: doctor(split-brain reconcile), adopt(고아 WT 인수), park(일시정지/재개), quick(경량 등록)
- **PRD 참조**: `docs/specs/fx-task-orchestrator/prd-draft.md` §S-β에 설계 정의 존재

### F500 — 현재 상태

- `sprint-pipeline-finalize.sh`: Phase 6(Gap 집계) + Phase 7(iterate) + Phase 8(session-end) 자동화 구현 완료
- `sprint-watch-liveness.sh`: 3개 Monitor 프로세스 생존 감시 + 자동 재시작 (최대 3회) 구현 완료
- Signal 구조 (`/tmp/sprint-signals/`): Sprint별 STATUS, MATCH_RATE, TIMESTAMP 파일
- Pipeline State (`/tmp/sprint-pipeline-state.json`): 배치 + Phase 상태 추적
- **미구현**: `sprint-merge-monitor.sh` (Signal STATUS=DONE 감지→PR review→squash merge 실행), `sprint-status-monitor.sh` (WT 상태 수집), `sprint-auto-approve.sh` (권한 프롬프트 자동 승인)
- **체인 끊김**: WT가 STATUS=DONE Signal을 쓰면 아무도 읽지 않음 → 수동 merge 필요

## 목표 상태

### F499 — Task Orchestrator S-β

#### 1. `/ax:task doctor` — Split-brain Reconcile (9개 검사)

PRD에 정의된 9개 검사를 구현:
1. SPEC F-item vs GitHub Issue 상태 불일치
2. GitHub Issue vs WT 존재 불일치
3. WT 존재 vs 캐시 기록 불일치
4. daemon heartbeat 만료 (60s 이상 미갱신)
5. PID 파일 vs 실제 프로세스 불일치
6. Signal 파일 vs 캐시 상태 불일치
7. lock 파일 orphan (프로세스 부재 + lock 잔존)
8. task-log.ndjson vs 캐시 정합성
9. GitHub Issue label vs SPEC 상태 매핑 정합성

자동 수정 가능한 항목은 `--fix` 플래그로 자동 보정.

#### 2. `/ax:task adopt` — 고아 WT 인수

기존 WT가 있지만 캐시/daemon이 없는 경우:
- WT 디렉토리에서 `.task-context` 읽기
- 캐시 재등록 + daemon 재시작 + tmux pane 재연결
- GitHub Issue 라벨 `fx:status:in_progress` 재부여

#### 3. `/ax:task park` — 일시정지 + 재개

- `park`: daemon 중지 + heartbeat 정지 + GitHub Issue 라벨 `fx:status:parked` 부여
- `resume`: daemon 재시작 + heartbeat 재개 + 라벨 `fx:status:in_progress` 복원
- 중간 상태 보존: `.task-context`에 park 시점 기록

#### 4. `task-list.sh` liveness 보강

- 각 task에 대해 `check_liveness()` 호출 → 실시간 상태 표시
- 컬럼 추가: `LIVE` (✅ alive / ⚠️ stale / ❌ dead)
- dead task에 대해 `doctor --fix` 또는 `adopt` 안내 메시지

### F500 — Sprint auto Monitor+Merge

#### 1. `sprint-merge-monitor.sh` (신규)

Sprint Signal 폴링 루프:
1. `/tmp/sprint-signals/sprint-{N}/STATUS` 파일 감시 (inotifywait 또는 poll)
2. STATUS=DONE 감지 시:
   a. PR 번호 확인 (`gh pr list --head sprint-{N}`)
   b. CI checks 통과 대기 (`gh pr checks`)
   c. Squash merge 실행 (`gh pr merge --squash --auto`)
   d. WT cleanup (`git worktree remove`)
   e. Signal에 MERGED 상태 기록
3. 에러 시 3회 재시도 후 FAILED 기록 + Master tmux에 알림

#### 2. `sprint-auto-approve.sh` (신규)

- `gh pr review --approve` 자동 실행 (self-approve)
- Branch protection rule에 따라 approve 필요 시에만 동작
- `--dry-run` 모드 지원

#### 3. 자동 트리거 체인

```
Sprint WT: autopilot → 구현 → PR 생성 → Signal STATUS=DONE
                                              ↓
Master: sprint-merge-monitor.sh (Signal 폴링)
                                              ↓
        PR approve → CI 대기 → squash merge → WT cleanup
                                              ↓
        sprint-pipeline-finalize.sh (Phase 6~8)
                                              ↓
        Gap 집계 → iterate (필요시) → session-end
```

#### 4. sprint-watch 연동

- sprint-watch가 merge-monitor 프로세스도 생존 감시 대상에 추가
- Gist에 merge 진행 상태 표시 (대기/진행/완료/실패)

## 범위

### In Scope

| F-item | 범위 |
|--------|------|
| F499 | `task-doctor.sh`, `task-adopt.sh`, `task-park.sh` 신규 + `task-list.sh` liveness 보강 |
| F500 | `sprint-merge-monitor.sh`, `sprint-auto-approve.sh` 신규 + `sprint-watch-liveness.sh` 보강 |

### Out of Scope

| 항목 | 사유 |
|------|------|
| `/ax:task quick` (경량 등록) | S-γ 이후 — doctor/adopt/park 안정화 후 |
| merge gate 정확성 체인 (typecheck/test/build/D1 dry-run) | S-γ 이후 — hard gate는 별도 F-item |
| deploy hard gate | S-γ 이후 |
| conflict-resolver subagent | S-δ 이후 |
| `sprint-status-monitor.sh` | sprint-watch가 이미 상태 수집 — 중복 방지 |

## 기술 결정

### F499

| 결정 | 선택 | 근거 |
|------|------|------|
| doctor 검사 구현 | bash 스크립트 (`task-doctor.sh`) | 기존 S-α 패턴 일관성 (lib.sh 함수 재사용) |
| 자동 수정 범위 | orphan lock/cache만 auto-fix, SPEC/Issue는 보고만 | SPEC 수정은 사람 확인 필수 (SDD Triangle) |
| park 상태 저장 | `.task-context` + GitHub Issue label | state.json 신설 금지 (SSOT 철학) |

### F500

| 결정 | 선택 | 근거 |
|------|------|------|
| Signal 감시 방식 | poll (5초 간격) | inotifywait는 `/tmp` tmpfs에서 불안정. poll이 단순하고 안정적 |
| merge 방식 | `gh pr merge --squash --auto` | squash merge = 프로젝트 표준 (Linear history) |
| 자동 approve | 별도 스크립트 분리 | Branch protection 유무에 따라 선택적 실행 |
| 에러 처리 | 3회 재시도 + FAILED signal | Master tmux 알림으로 사람 개입 유도 |

## 검증 기준

### F499

- [ ] `task doctor` 9개 검사 중 최소 7개 구현 + `--fix` 자동 보정 3개 이상
- [ ] `task adopt` 고아 WT에서 daemon 재기동 + 캐시 복원 확인
- [ ] `task park` → `task resume` 라운드트립 + daemon 재시작 확인
- [ ] `task list` LIVE 컬럼에 alive/stale/dead 정확 표시

### F500

- [ ] Signal STATUS=DONE 작성 후 60초 이내 merge 실행 시작
- [ ] squash merge 성공 + WT cleanup + Signal MERGED 기록
- [ ] CI 실패 시 merge 보류 + FAILED signal + Master 알림
- [ ] sprint-watch Gist에 merge 상태 실시간 반영

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| doctor `--fix`가 정상 task를 잘못 보정 | 데이터 손실 | `--dry-run` 기본, `--fix` 명시 필요 |
| merge-monitor가 CI 완료 전 merge 시도 | merge 실패 | `gh pr checks --watch` 대기 + timeout 5분 |
| park 후 WT가 stale 되어 merge 충돌 | 재작업 | park 시 경고 메시지 + 최대 park 기간 권고 |
| Branch protection이 self-approve 차단 | 자동 체인 중단 | approve 실패 시 수동 안내 fallback |
