---
code: FX-PLAN-208
title: Sprint 208 — Sprint Automation v2
version: 1.0
status: Draft
category: PLAN
system-version: Sprint 208
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 208 Plan — Sprint Automation v2

## 1. 목표

Sprint Pipeline의 종단 자동화를 완성하여, `sprint-pipeline start` 한 번으로 **배치 실행 → 전체 Gap Analyze → Auto Iterator → Session-End**까지 무인 진행되도록 한다.

## 2. F-items

| F# | 제목 | REQ | 우선순위 |
|----|------|-----|---------|
| F432 | Sprint Pipeline 종단 자동화 | FX-REQ-424 | P0 |
| F433 | Sprint Monitor 고도화 | FX-REQ-425 | P0 |

## 3. 현재 상태 (As-Is)

### sprint-pipeline 흐름
```
Phase 1: Sprint 수집
Phase 2: 의존성 분석 → 배치 계획
Phase 3: Pipeline State 초기화
Phase 4: 배치별 실행 루프 (WT생성 → autopilot → merge-monitor)
Phase 5: 완료 보고 ← ⚡ 여기서 끝
```

### Gap
1. Phase 5 이후 **수동** — `/pdca analyze` 직접 호출 필요
2. Match Rate < 90% Sprint에 대한 iterate가 **수동**
3. SPEC/MEMORY/CLAUDE.md 동기화 + 최종 커밋/push가 **수동** (`/ax:session-end`)
4. sprint-watch가 Phase 1~5만 추적 — Phase 6~8 진행률 미표시
5. merge-monitor.sh가 background 프로세스로 죽을 수 있음 — 자동 재시작 없음

## 4. 목표 상태 (To-Be)

### F432: sprint-pipeline 확장 (Phase 6~8)

```
기존 Phase 1~5 (변경 없음)
  │
  ▼
Phase 6: 전체 Gap Analyze (신규)
  ├─ 6a. 각 Sprint의 Match Rate 수집
  │    - Signal 파일에서 MATCH_RATE 필드 읽기
  │    - 누락 시 docs/03-analysis/ 에서 analysis 문서 파싱
  ├─ 6b. 집계 리포트 생성
  │    | Sprint | F-items | Match Rate | Status |
  │    |--------|---------|:----------:|:------:|
  │    | 201    | F420,F421 | 93%      | ✅      |
  │    | 202    | F422      | 87%      | ⚠️ Gap  |
  │    | 205    | F427,F428 | 95%      | ✅      |
  └─ 6c. Gap Sprint 식별 (Match Rate < 90%)
  │
  ▼
Phase 7: Auto Iterator (신규, Gap Sprint 있을 때만)
  ├─ 7a. Gap Sprint의 WT 재진입
  │    - WT가 아직 존재하면: tmux send-keys로 iterate 주입
  │    - WT가 이미 정리됐으면: 새 WT 생성 → iterate 전용 autopilot
  ├─ 7b. /pdca iterate sprint-{N} 실행 (최대 3회/Sprint)
  ├─ 7c. 재분석 후 Match Rate 갱신
  └─ 7d. Pipeline State에 iterate 결과 기록
  │     ※ 3회 iterate 후에도 < 90%이면 WARN 출력 + 계속 진행 (중단 안 함)
  ▼
Phase 8: Session-End (신규)
  ├─ 8a. SPEC.md 최종 상태 확인
  │    - 모든 F-item 🔧→✅ 전환 확인 (Phase 5 merge에서 이미 처리)
  │    - 누락된 F-item이 있으면 보정
  ├─ 8b. MEMORY.md 갱신
  │    - Pipeline 요약 (Sprint 수, 총 Match Rate, 소요시간)
  │    - "다음 작업" 항목 갱신
  ├─ 8c. CLAUDE.md 헤더 동기화
  │    - Phase 상태 업데이트 (Phase N 🔧→✅ 전환)
  ├─ 8d. 최종 커밋 + push
  │    git add SPEC.md MEMORY.md CLAUDE.md
  │    git commit -m "chore: Phase {N} 완료 — Sprint {start}~{end}"
  │    git push origin master
  └─ 8e. CI/CD 배포 확인 (gh run list)
```

### F433: sprint-watch 확장

```
현재 Gist 포맷:
  ## 활성 Sprint (Phase 4만)
  | Sprint | F-items | Status | Progress | Activity |

확장 Gist 포맷:
  ## Pipeline 전체 진행
  | Phase | 상태 | 상세 |
  |-------|:----:|------|
  | 1~3 배치 계획 | ✅ | 3 batches, 8 sprints |
  | 4 배치 실행 | 🔧 | Batch 2/3, Sprint 205 IN_PROGRESS |
  | 5 완료 보고 | ⏳ | — |
  | 6 Gap Analyze | ⏳ | — |
  | 7 Iterator | ⏳ | — |
  | 8 Session-End | ⏳ | — |

  ## 활성 Sprint (기존과 동일)
  ...

  ## Monitor 상태 (신규)
  | 프로세스 | PID | 가동시간 | 상태 |
  |----------|-----|---------|------|
  | merge-monitor | 12345 | 25m | ✅ |
  | status-monitor | 12346 | 25m | ✅ |
  | auto-approve | 12347 | 25m | ✅ |
```

**Monitor 생존 감시** (sprint-watch `once`에 추가):
```bash
# 각 monitor 프로세스의 PID 파일 체크
for PROC in sprint-merge-monitor sprint-status-monitor sprint-auto-approve; do
  PID=$(pgrep -f "$PROC" | head -1)
  if [ -z "$PID" ]; then
    echo "⚠️ $PROC 죽음 — 재시작"
    # 재시작 로직 (nohup + disown)
  fi
done
```

## 5. 변경 대상 파일

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `~/.claude/plugins/.../skills/sprint-pipeline/SKILL.md` | **수정** | Phase 6~8 추가 (~120줄) |
| `~/.claude/plugins/.../skills/sprint-watch/SKILL.md` | **수정** | Pipeline 진행률 + Monitor 생존 감시 추가 (~60줄) |

**신규 파일 없음** — 기존 2개 스킬 파일 수정만으로 구현.

## 6. 구현 순서

```
Step 1: sprint-pipeline Phase 6 (Gap Analyze 집계)
  - Signal 파일에서 MATCH_RATE 수집 로직
  - 집계 리포트 포맷
  - Gap Sprint 식별 알고리즘

Step 2: sprint-pipeline Phase 7 (Auto Iterator)
  - WT 재진입 로직 (존재 여부 분기)
  - iterate 실행 + 재분석
  - Pipeline State 갱신

Step 3: sprint-pipeline Phase 8 (Session-End)
  - SPEC/MEMORY/CLAUDE.md 동기화
  - 최종 커밋 + push
  - CI/CD 확인

Step 4: sprint-watch 확장
  - Pipeline 전체 Phase 진행률 Gist 표시
  - Monitor 생존 감시 + 자동 재시작
```

## 7. 설계 결정

### D1: Phase 7에서 WT가 이미 정리된 경우

**선택지:**
- A) 새 WT 생성 → iterate 전용 autopilot 주입
- B) Master에서 직접 iterate 실행 (WT 없이)

**결정: A** — iterate는 코드 수정을 포함하므로 master 직접 수정은 위험. 새 WT에서 안전하게 수행.

### D2: Phase 7 iterate 실패 시 동작

**선택지:**
- A) Pipeline 중단 + 사용자 알림
- B) WARN 출력 + Phase 8 계속 진행

**결정: B** — iterate 실패는 치명적이지 않음. Gap이 남아도 전체 Sprint 결과물은 유효. 사용자가 나중에 수동 보완 가능.

### D3: Phase 8에서 `/ax:session-end` 직접 호출 vs 로직 인라인

**선택지:**
- A) `/ax:session-end` Skill 호출
- B) session-end 핵심 로직을 Phase 8에 인라인

**결정: B** — session-end는 워크트리 감지, 배포 등 Pipeline 컨텍스트와 맞지 않는 로직 포함. Pipeline 전용 종료 로직(SPEC/MEMORY/CLAUDE 갱신 + commit + push)만 인라인.

## 8. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Phase 7 WT 재진입 시 stale 코드 | iterate가 master 최신 상태를 반영 못 함 | WT 생성 시 master rebase 후 시작 |
| Monitor 재시작 시 signal 상태 불일치 | 이미 처리된 Sprint를 재처리 | signal STATUS 필드 체크 후 skip |
| Phase 8 commit 시 merge 충돌 | 다른 세션이 master를 변경한 경우 | git pull --rebase 선행 |

## 9. 검증 기준

| 항목 | 기준 |
|------|------|
| Phase 6 집계 | 모든 Sprint의 Match Rate를 Signal/Analysis에서 수집 |
| Phase 7 iterate | Gap Sprint에 대해 WT 재진입 + iterate 실행 확인 |
| Phase 8 종료 | SPEC ✅ + MEMORY 갱신 + commit + push 완료 |
| sprint-watch | Gist에 Phase 6~8 진행률 표시 |
| Monitor 재시작 | 프로세스 죽음 감지 후 5초 이내 재시작 |

## 10. 예상 결과

Sprint Pipeline 실행 시 사용자 개입 지점:

| Before (현재) | After (목표) |
|---------------|-------------|
| `sprint-pipeline start` → 배치 완료 | `sprint-pipeline start` → **전체 자동** |
| 수동 `/pdca analyze` | Phase 6 자동 |
| 수동 `/pdca iterate` | Phase 7 자동 |
| 수동 `/ax:session-end` | Phase 8 자동 |
| sprint-watch에 Phase 4만 | Phase 1~8 전체 표시 |
| Monitor 죽으면 수동 재시작 | 자동 재시작 |
