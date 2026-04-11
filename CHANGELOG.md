# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_(비어있음 — 다음 Phase 착수 시 여기부터 기록)_

## [Phase 32] - 2026-04-11

거버넌스 갭 G1~G7 전건 해소 — Work Management System 4-Layer (Intake→Planning→Execution→Tracking).
Sprint 244~248, 7 F-items, 평균 Match Rate ~99%.

### Added
- F499: Task Orchestrator S-β — doctor/adopt/park + Master IPC (Sprint 244)
- F500: Sprint auto Monitor+Merge 파이프라인 — signal 감시→PR review→squash→cleanup (Sprint 244, C11 승격)
- F501: GitHub Projects Board 초기 설정 — Kanban 6컬럼 + 자동 라벨링 (Sprint 245, G1/G3/G6 해소)
- F502: CHANGELOG.md 도입 — Keep a Changelog 형식 + session-end/gov-retro 연동 (Sprint 245, G4 해소)
- F503: `/ax:todo` Board 연동 — `scripts/board/{list,move,sync-spec}` + 양방향 동기화 (Sprint 246, G3 해소)
- F504: `/ax:session-end` Board 동기화 — `scripts/board/{on-merge,pr-body-enrich}` + sprint-merge-monitor 통합 (Sprint 246, G6 해소)
- F505: Velocity 추적 — `scripts/velocity/{record-sprint,phase-trend}` + `docs/metrics/velocity/sprint-*.json` (Sprint 247, G5 해소)
- F506: Epic(Phase) 메타데이터 — `scripts/epic/{setup-milestones,phase-progress}` + GitHub Milestones 매핑 (Sprint 247, G2 해소)
- F507: Priority 변경 이력 — `scripts/priority/{record-change,list-history}` + `.github/workflows/priority-change.yml` + `docs/priority-history/` (Sprint 248, G7 해소)

### Fixed
- merge-monitor branch protection 404 정수 비교 오류 (S251)
- merge-monitor wait_ci timeout이 gh --watch 프로세스를 kill하지 못하던 문제 (S251)
- sprint-autopilot Step 1 `/rename` 명시화 — 세션 식별 안정화 (S251)

## [Phase 31] - 2026-04-10

### Added
- F497: Task Orchestrator MVP (S-α) — start/list + daemon + 4-track

## [Phase 30] - 2026-04-09

### Added
- F493: 발굴 단계 평가결과서 v2 — 9탭 리치 리포트

### Fixed
- F494: 파이프라인 단계 전진 구조 버그
- F492: FileUploadZone API 경로 drift

### Changed
- F495: 파이프라인 재구조화 — 발굴/형상화 2-stage
- F496: 발굴 9기준 체크리스트 정보형 재설계

## [Phase 29] - 2026-04-08

### Added
- F488: req-manage --create-issue 기본화
- F489: gov-retro 회고 통합 소급 등록

### Fixed
- F490: E2E workflow shard 병렬화

### Changed
- F491: 테스트 공유 Org 모드
