---
code: FX-RPT-S248
title: "Sprint 248 Report — F507 Priority 변경 이력 자동 기록"
version: "1.0"
status: Active
category: RPT
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-248)
sprint: 248
f_items: [F507]
---

# Sprint 248 Report — Priority 변경 이력 자동 기록

## Summary

| 항목 | 값 |
|------|----|
| Sprint | 248 |
| F-items | F507 |
| REQ | FX-REQ-502 |
| Phase | 32-D 거버넌스 완성 (M4) |
| Gap 해소 | G7 (Priority 변경 추적 부재) |
| Match Rate | **100%** |
| Test | PASS (smoke 4/4) |

## 산출물

### 스크립트 (2)
- `scripts/priority/record-change.sh` — 이력 append + Issue comment + 라벨 교체
- `scripts/priority/list-history.sh` — `--f/--since/--priority` 필터 조회

### 자동화 (1)
- `.github/workflows/priority-change.yml` — Issue 라벨 변경 감지 → 자동 PR

### 문서 (5)
- `docs/priority-history/README.md` — 저장소 형식/불변 규칙/사용법
- `docs/01-plan/features/sprint-248.plan.md`
- `docs/02-design/features/sprint-248.design.md`
- `docs/03-analysis/features/sprint-248.analysis.md`
- `docs/04-report/features/sprint-248.report.md` (본 문서)

## 주요 설계 결정

1. **append-only 정책** — 과거 행 수정 금지, 정정은 새 행으로. 감사 신뢰성 우선.
2. **GitHub 동기화 실패는 경고만** — history file 기록이 primary, remote sync는 best-effort.
3. **플러그인 분리** — `/ax:req-manage` 측 수정은 별도 PR. Sprint 248은 스크립트 인터페이스 고정까지만.
4. **workflow bot 루프 방어** — `github.actor != 'github-actions[bot]'` + `sender.type != 'Bot'` 이중 필터.

## 검증 스냅샷

```
$ bash scripts/priority/record-change.sh F507 P2 P1 "smoke test" --no-issue
✅ history: .../docs/priority-history/F507.md
ℹ️  --no-issue: GitHub Issue 동기화 건너뜀

$ bash scripts/priority/list-history.sh --f F507
| 시각 | F# | 변경 | 사유 | 변경자 |
|------|----|------|------|--------|
| 2026-04-11T13:25:56+09:00 | F507 | P1 → P2 | smoke 원복 | ktds.axbd@gmail.com |
| 2026-04-11T13:25:51+09:00 | F507 | P2 → P1 | smoke test | ktds.axbd@gmail.com |
```

## Phase 32-D 상태

| F | 제목 | 상태 |
|---|------|------|
| F501 | CHANGELOG 자동화 | ✅ (Sprint 245) |
| F502 | gov-retro Quality Gate | ✅ (Sprint 246) |
| F503 | SPEC 감사 로그 | ✅ (Sprint 246) |
| F504 | 문서 거버넌스 강화 | ✅ (Sprint 246) |
| F505 | Velocity 추적 | ✅ (Sprint 247) |
| F506 | Epic(Phase) 메타데이터 | ✅ (Sprint 247) |
| **F507** | **Priority 변경 이력** | **✅ (Sprint 248)** |

**Phase 32 Work Management: 7/7 완료** 🎉

## 후속 작업

- [ ] `/ax:req-manage status` 플러그인 패치 — Priority 변경 감지 + 스크립트 호출 (별도 PR)
- [ ] 기존 F-item에 대한 초기 이력 백필 여부 검토 — 감사 관점에서 필요 시

## Lessons

- **Append-only 감사 로그는 단일 스크립트로 충분** — history file이 SSOT고 Github는 얇은 동기화 레이어.
- **GitHub Action에서 bot 루프 방어는 두 겹** (`actor` + `sender.type`). 하나만으로는 실패 사례 존재.
- **REQ 자동 추출**에 grep `| F507 |` 정확 매칭 필요 — `F_NUM[^|]*` 패턴은 파이프 구분자를 넘지 못함.
