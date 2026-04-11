---
code: FX-ANAL-S247
title: "Sprint 247 Analysis — Gap Analysis (F505/F506)"
version: "1.0"
status: Active
category: ANAL
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-247)
sprint: 247
f_items: [F505, F506]
---

# Sprint 247 Gap Analysis

## 요약

| 항목 | 결과 |
|------|------|
| Match Rate | **100%** (9/9 파일, 8/8 검증 기준 PASS) |
| Test Result | pass (dry-run 검증) |
| Iterate 필요 | No |

## 파일 매핑 (Design §4 ↔ Implementation)

| Design 지정 | 구현 파일 | 상태 |
|------------|-----------|------|
| `scripts/velocity/record-sprint.sh` | ✅ 존재 (2619 bytes, +x) | PASS |
| `scripts/velocity/phase-trend.sh` | ✅ 존재 (1662 bytes, +x) | PASS |
| `docs/metrics/velocity/README.md` | ✅ 존재 (2377 bytes) | PASS |
| `docs/metrics/velocity/sprint-242.json` | ✅ 존재 (Phase 30 소급) | PASS |
| `docs/metrics/velocity/sprint-244.json` | ✅ 존재 (Phase 31 소급) | PASS |
| `docs/metrics/velocity/sprint-245.json` | ✅ 존재 (Phase 31 소급) | PASS |
| `.github/phase-config.yml` | ✅ 존재 (936 bytes) | PASS |
| `scripts/epic/setup-milestones.sh` | ✅ 존재 (2695 bytes, +x) | PASS |
| `scripts/epic/phase-progress.sh` | ✅ 존재 (1652 bytes, +x) | PASS |
| `docs/metrics/velocity/sprint-247.json` | ✅ 존재 (self-record 검증 산출물) | BONUS |

**총 9/9 = 100%**. 보너스로 record-sprint.sh 자기검증 결과 sprint-247.json도 생성.

## 검증 기준 충족

### F505 (Plan §검증 기준)

- [x] `bash scripts/velocity/record-sprint.sh 247` → `docs/metrics/velocity/sprint-247.json` 생성 확인 (phase=31 자동 추출)
- [x] `bash scripts/velocity/phase-trend.sh 31` → `Sprints: 3 (244,245,247) / F-items: 6 / Match Rate 평균: 95.5% / 평균 소요: 27분 / Test pass rate: 2/3` 출력
- [x] 소급 JSON 3개(sprint-242/244/245) 존재
- [x] README로 gov-retro 연동 가이드 제공

### F506 (Plan §검증 기준)

- [x] `.github/phase-config.yml`에 Phase 29/30/31 정의
- [x] `bash scripts/epic/setup-milestones.sh --dry-run` 실행 시 3개 Phase 출력
- [x] `bash scripts/epic/phase-progress.sh 31 --dry-run` 실행 시 title + placeholder 포맷 출력
- [x] `gh` 미설치 환경에서도 `--dry-run`으로 안전 동작 (스크립트 상단 체크)

## 실행 로그

```
$ bash scripts/velocity/record-sprint.sh 247
✅ Velocity 기록: docs/metrics/velocity/sprint-247.json
{
  "sprint": 247, "phase": 31, "f_items": "F505,F506", "f_count": 2,
  "match_rate": null, "duration_minutes": 0, "test_result": "unknown",
  "created": "2026-04-11T13:07:13+09:00", "recorded_at": "2026-04-11T13:14:05+09:00"
}

$ bash scripts/velocity/phase-trend.sh 31
Phase 31 Velocity
- Sprints: 3 (244, 245, 247)
- F-items: 6
- Match Rate 평균: 95.5%
- 평균 소요: 27분
- Test pass rate: 2/3

$ bash scripts/velocity/phase-trend.sh 30
Phase 30 Velocity
- Sprints: 1 (242)
- F-items: 1
- Match Rate 평균: 92.0%
- 평균 소요: 55분
- Test pass rate: 1/1

$ bash scripts/epic/setup-milestones.sh --dry-run
=== DRY RUN — Milestones to create/update in KTDS-AXBD/Foundry-X ===
  • #29 Phase 29 — Discovery Item Detail  [closed, 2026-04-08]
  • #30 Phase 30 — 발굴/형상화 2-stage 재구조화  [closed, 2026-04-09]
  • #31 Phase 31 — Task Orchestrator + Governance  [open, 2026-04-15]

$ bash scripts/epic/phase-progress.sh 31 --dry-run
Phase 31 — Task Orchestrator + Governance
- Open: (dry-run)
- Closed: (dry-run)
- Progress: (dry-run)%
```

## 구현 중 수정 (드리프트 ≠ Gap)

| 파일 | 변경 | 사유 |
|------|------|------|
| `record-sprint.sh` | `read_ctx()` grep 실패 시 `|| true` 추가 | `set -euo pipefail` + grep no-match 상호작용 수정 |
| `record-sprint.sh` | Phase 추출 로직 변경 (MEMORY.md 최대 Phase 번호) | 초기 `head -1` 버그 — "Phase 1~29" 텍스트에서 1 추출 문제 |

두 수정 모두 Design의 의도(Phase 자동 추출, .sprint-context 기반 기록)는 유지. 표면 구현 디테일 차이만 발생.

## 의도적 제외 (Gap 아님)

Design §7에 명시된 OOS 항목 — gov-retro/session-end 스킬 수정, Phase 1~28 소급, Actions workflow, 실제 gh api 호출. 모두 후속 Sprint로 이월.

## 결론

**Match Rate 100% — iterate 불필요, Report 단계로 진행.**
