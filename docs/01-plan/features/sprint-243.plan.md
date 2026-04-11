---
code: FX-PLAN-S243
title: "Sprint 243 Plan — F432/F433 Sprint Pipeline 종단 자동화 + Monitor 고도화"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-243)
sprint: 243
f_items: [F432, F433]
---

# Sprint 243 Plan — Sprint Pipeline 종단 자동화 + Monitor 고도화

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 243 |
| F-items | F432, F433 |
| REQ | FX-REQ-424, FX-REQ-425 |
| 우선순위 | P0 |
| 의존성 | 독립 (F432, F433 병렬) |
| 목표 | Sprint Pipeline 전 배치 merge 후 Gap Analyze→Iterate→Session-End까지 자동 실행 + Monitor 생존 감시·재시작·Pipeline Phase 6~8 진행률 Gist 표시 |
| 대상 코드 | `.claude/skills/sprint-pipeline/` (신규 project override), `.claude/skills/sprint-watch/` (기존 override 보강), `scripts/sprint-pipeline-finalize.sh` (신규), `scripts/sprint-watch-liveness.sh` (신규) |

## 문제 정의

### 현재 상태 (Sprint 242 기준)

- `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/sprint-pipeline/SKILL.md` 는 Phase 1~5 (수집→의존성 분석→State 초기화→배치 실행→완료 보고) 까지만 정의됨.
- 모든 배치가 merge 된 후에도 "pipeline 전체 Gap 집계", "iterate 루프", "session-end (SPEC/MEMORY 동기화 + push)" 는 사람이 수동 실행해야 함.
- `sprint-pipeline-monitor.sh`는 Phase 15 전용 하드코딩 (Sprint 154→155+156→157). 재사용 불가.
- `sprint-merge-monitor.sh`는 개별 Sprint Signal 단위만 처리. Pipeline 전체 완료 이벤트가 없음.
- `.claude/skills/sprint-watch/SKILL.md` 는 Phase 6~8 진행률 표시 및 Monitor 생존 감시 UI 초안이 있으나 실제 `sprint-pipeline-state.json` 에 `phase6/phase7/phase8` 필드를 쓰는 주체가 없음. 표시 전용 UI 만 존재 (데이터 없음).

### 목표 상태 (Sprint 243)

#### F432 — Sprint Pipeline 종단 자동화

1. Pipeline Phase 확장: 5→8 (Phase 6 Gap Analyze 집계, Phase 7 Auto Iterator, Phase 8 Session-End).
2. `.claude/skills/sprint-pipeline/SKILL.md` 프로젝트 오버라이드 신규. 기존 Phase 1~5 내용 승계 + Phase 6~8 추가.
3. `scripts/sprint-pipeline-finalize.sh` 신규 — Pipeline state에서 모든 배치 completed 확인 후 Phase 6~8 순차 실행.
4. Pipeline state JSON 스키마 확장: `phase6`, `phase7`, `phase8` 필드.
5. Phase 6: 각 Sprint의 signal `MATCH_RATE` 집계 → 평균 + 최저값 산출 → `phase6.aggregate_match_rate`, `phase6.min_match_rate` 저장.
6. Phase 7: `min_match_rate < 90` 이면 `/pdca iterate` 수행 지침을 Master tmux 세션에 자동 주입, 최대 3회 반복 트리거. `>= 90` 이면 skip.
7. Phase 8: `/ax:session-end` 실행을 Master tmux 세션에 주입 (SPEC/MEMORY 동기화 + push + 배포).
8. `sprint-merge-monitor.sh` 는 기존대로 유지. 별도 `sprint-pipeline-finalize.sh` 를 sprint-watch가 감지·실행하는 방식 (관심사 분리).

#### F433 — Sprint Monitor 고도화

1. `.claude/skills/sprint-watch/SKILL.md` — Phase 6~8 진행률 표시가 실데이터(`phase6/phase7/phase8` 필드)와 연동되도록 수집 로직 보강.
2. Monitor 생존 감시 리스트에 `sprint-pipeline-finalize` 추가 (현 3종 → 4종).
3. `scripts/sprint-watch-liveness.sh` 신규 — `once` 루프에서 호출 가능한 독립 스크립트. 각 Monitor가 죽어 있으면 재시작하고 재시작 카운트를 `/tmp/sprint-signals/monitor-restart-counts` 에 기록 (3회 초과 시 stop).
4. Pipeline `sprint-pipeline-state.json` 의 `status=running` 이고 모든 배치가 `completed` 이며 `phase8.status` 가 아직 `pending` 인 경우 자동으로 `sprint-pipeline-finalize.sh` 를 실행 (트리거 역할).
5. Gist 포맷 보강: Phase 6/7/8 행에 실데이터 (match rate 평균, iterate 횟수, session-end 결과) 표시.

## 범위

### Sprint 243 IN-SCOPE

1. `.claude/skills/sprint-pipeline/SKILL.md` 신규 project override (Phase 1~5 기존 캐시 내용 베이스 + Phase 6~8 신규).
2. `.claude/skills/sprint-watch/SKILL.md` 편집 — Phase 6~8 실데이터 수집 + finalize 자동 트리거 로직 + liveness 스크립트 호출.
3. `scripts/sprint-pipeline-finalize.sh` 신규 — Phase 6/7/8 실행기.
4. `scripts/sprint-watch-liveness.sh` 신규 — Monitor 생존 감시 재사용 가능 스크립트.
5. `scripts/README.md` (있으면) 에 두 신규 스크립트 엔트리 추가 — 없으면 건너뜀.
6. Bash 문법 검증 (`bash -n`) + `shellcheck` (있으면).
7. SKILL.md frontmatter 유효성 확인 (name, description, user-invocable, allowed-tools 필드).

### OUT-OF-SCOPE

- ax-plugin 저장소(`KTDS-AXBD/ax-plugin`) 직접 수정 — 별도 PR로 분리.
- sprint-merge-monitor.sh 수정 — 기존 동작 유지 (리스크 회피).
- Phase 1~5 동작 변경 — Phase 6~8 추가만 수행.
- TypeScript 빌드 산출물 변경 — Bash + Markdown 만 변경하므로 turbo build 불필요.
- D1 migration / schema 변경 없음.
- E2E 테스트 추가 — 검증 대상이 bash 스크립트이므로 스크립트 레벨 dry-run 으로 대체.

## Acceptance Criteria

| # | 항목 | 기준 |
|---|------|------|
| A1 | sprint-pipeline override 존재 | `.claude/skills/sprint-pipeline/SKILL.md` 에 Phase 1~8 모두 정의 |
| A2 | finalize 스크립트 실행 가능 | `bash -n scripts/sprint-pipeline-finalize.sh` 통과 |
| A3 | Phase 6 집계 동작 | 테스트 signal 2개(MATCH_RATE=95, 88)로 Phase 6 dry-run 시 `aggregate=91`, `min=88` 출력 |
| A4 | Phase 7 iterate 트리거 | `min_match_rate=88` (<90) 인 state 입력 시 `phase7.should_iterate=true` 저장 |
| A5 | Phase 7 skip | `min_match_rate=92` (>=90) 인 state 입력 시 `phase7.status=skipped` 저장 |
| A6 | Phase 8 session-end 주입 | Phase 8 실행 시 Master tmux 세션이 없으면 로그만 남기고 정상 종료 (exit 0) |
| A7 | sprint-watch liveness 스크립트 | `bash -n scripts/sprint-watch-liveness.sh` 통과. 4종 Monitor 감시 (pipeline-finalize 포함) |
| A8 | Phase 6~8 Gist 표시 | sprint-watch once 실행 시 Pipeline ACTIVE 인 경우 Phase 6~8 행이 실데이터로 채워짐 (샘플 state JSON 기준 수동 확인) |
| A9 | finalize 자동 트리거 | sprint-watch once 가 state 조건 충족 시 `sprint-pipeline-finalize.sh` 를 background로 실행 (nohup + disown) |
| A10 | 재시작 카운트 3회 제한 | liveness 3회 연속 재시작 시도 후 STATUS=❌ 로 기록 |

## 위험 요소

| 리스크 | 완화책 |
|--------|--------|
| tmux 세션 주입 실패 (Master 세션 없음) | Phase 8 에서 MASTER_SESSION 검색 실패 시 `PIPELINE_COMPLETE.signal` 만 남기고 정상 종료. 수동 복구 가능 |
| Phase 7 iterate 무한 루프 | `phase7.iterate_count` 최대 3회 hard limit. 3회 후 `status=failed` 전환 |
| sprint-pipeline-state.json 부재 | finalize 스크립트 진입 시 state 파일 없으면 즉시 exit 0 (no-op) |
| 재시작 스팸 | restart-counts 파일로 monitor별 3회 상한. pipeline-finalize는 재시작 대상에서 제외 (one-shot) |
| Bash 문법 깨짐 (자동 hook) | `.sh` 파일은 hook 대상 아님 확인됨. 수동 `bash -n` 으로 검증 |

## 작업 계획

1. Design 문서 (sprint-243.design.md) — 시퀀스 다이어그램, state 스키마, 파일 매핑.
2. `scripts/sprint-pipeline-finalize.sh` 구현.
3. `scripts/sprint-watch-liveness.sh` 구현.
4. `.claude/skills/sprint-pipeline/SKILL.md` 작성 (Phase 1~8).
5. `.claude/skills/sprint-watch/SKILL.md` 편집 (Phase 6~8 실데이터 연동 + finalize 트리거).
6. `bash -n` + shellcheck 검증.
7. 수동 dry-run (샘플 state JSON 으로 finalize 각 Phase 확인).
8. Gap analyze → report → session-end.

## 레퍼런스

- 기존 plugin skill: `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/sprint-pipeline/SKILL.md`
- 기존 project override: `.claude/skills/sprint-watch/SKILL.md` (349 lines, Phase 6~8 UI 초안)
- Pipeline state 소비자: `~/scripts/sprint-merge-monitor.sh` (참조만, 수정 안 함)
- 1회용 Phase 15 구현: `~/scripts/sprint-pipeline-monitor.sh` (일반화 대상)
