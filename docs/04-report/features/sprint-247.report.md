---
code: FX-RPT-S247
title: "Sprint 247 Report — F505 Velocity 추적 + F506 Epic(Phase) 메타데이터"
version: "1.0"
status: Done
category: RPT
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-247)
sprint: 247
f_items: [F505, F506]
match_rate: 100
---

# Sprint 247 Report

## TL;DR

거버넌스 갭 **G5**(Velocity 미구조화) + **G2**(Epic/Phase 메타데이터 부재) 해소. Sprint 완료 시 JSON 메트릭 기록 + Phase 단위 집계 스크립트 + GitHub Milestones 자동 생성 스크립트 도입. 신규 9파일, 기존 코드 미변경. **Match Rate 100%**.

## 산출물

### F505 — Velocity 추적

| 파일 | 역할 |
|------|------|
| `scripts/velocity/record-sprint.sh` | `.sprint-context` 기반 `docs/metrics/velocity/sprint-{N}.json` 자동 생성 |
| `scripts/velocity/phase-trend.sh` | Phase 단위 Sprint 수/F-item/Match Rate/소요시간 집계 |
| `docs/metrics/velocity/README.md` | JSON 스키마 + 자동/수동 사용법 + gov-retro 연동 가이드 |
| `docs/metrics/velocity/sprint-{242,244,245,247}.json` | Phase 29~31 소급 데이터 + Sprint 247 self-record |

### F506 — Epic(Phase) 메타데이터

| 파일 | 역할 |
|------|------|
| `.github/phase-config.yml` | Phase(Epic) SSOT — 번호/제목/설명/due/state |
| `scripts/epic/setup-milestones.sh` | phase-config.yml → GitHub Milestones 생성/동기화 (dry-run 지원) |
| `scripts/epic/phase-progress.sh` | Milestone open/closed 기반 진행률 계산 (dry-run 지원) |

## 검증

- `record-sprint.sh 247` → `sprint-247.json` 생성 (phase=31 자동 추출)
- `phase-trend.sh 31` → 3 Sprints / 6 F-items / 95.5% 평균 / 27분 평균 출력
- `phase-trend.sh 30` → 1 Sprint / 92.0% / 55분 출력
- `setup-milestones.sh --dry-run` → Phase 29/30/31 3건 출력
- `phase-progress.sh 31 --dry-run` → title + placeholder 포맷 정상

## 거버넌스 갭 해소

| Gap | 상태 전 | 상태 후 |
|-----|---------|---------|
| **G5** Sprint 지표 미구조화 | `.sprint-context` ephemeral, git log 재파싱 | JSON append-only, jq 집계 가능 |
| **G2** Phase Epic 부재 | SPEC.md 텍스트만 | GitHub Milestones 연동 + phase-config.yml SSOT |

## 후속 과제

| 항목 | 이유 |
|------|------|
| gov-retro 스킬 본문 수정 (record-sprint 자동 호출) | 플러그인 경로(`~/.claude/plugins/ax-marketplace/`) 외부 — 별도 세션 |
| session-end 스킬에 record-sprint 훅 주입 | 동일 |
| Actions workflow — 라벨 변경 시 Milestone 자동 이동 | Sprint 248+ |
| Phase 1~28 소급 Milestone/JSON | 방대 — 수요 시 일괄 배치 |
| 실제 `gh api` Milestone 생성 (live) | 인증 + 팀 승인 필요 |

## 메트릭

| 항목 | 값 |
|------|-----|
| 신규 파일 | 10 (docs/scripts/.github) |
| 수정 파일 | 0 |
| Match Rate | 100% |
| Iterate 횟수 | 0 |
| Test 결과 | pass (dry-run) |
| 대상 언어 | bash + YAML + JSON + Markdown |
| typecheck/test 필요 | 아니요 (TypeScript 미변경) |

## 교훈

1. **Bash `pipefail` + `grep` no-match 함정** — `read_ctx()` 초기 버전이 grep 실패로 스크립트 전체 abort. `|| true` 패턴 필수.
2. **Phase 번호 추출은 "첫 매치"가 아닌 "최대값"** — `Phase 1~29` 같은 범위 표현 때문에 `head -1`은 1을 반환. `sort -n | tail -1`로 수정.
3. **플러그인 수정은 프로젝트 커밋 범위 밖** — `~/.claude/plugins/`는 worktree 외부이므로 이 Sprint에서는 "훅 주입 지점"만 준비하고 실제 스킬 수정은 분리.
