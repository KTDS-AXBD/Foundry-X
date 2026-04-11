---
code: FX-PLAN-S247
title: "Sprint 247 Plan — F505 Velocity 추적 + F506 Epic(Phase) 메타데이터 구조화"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-247)
sprint: 247
f_items: [F505, F506]
---

# Sprint 247 Plan — Velocity 추적 + Epic(Phase) 메타데이터

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 247 |
| F-items | F505, F506 |
| REQ | FX-REQ-500, FX-REQ-501 |
| 우선순위 | P1 |
| 의존성 | F502(CHANGELOG, Sprint 245 완료) — gov-retro 연동 지점 공유 |
| 목표 | 거버넌스 갭 G5(Velocity), G2(Epic/Phase) 해소 |
| 대상 코드 | `scripts/velocity/*`, `scripts/epic/*`, `docs/metrics/velocity/`, `.github/phase-config.yml` |

## 문제 정의

### 거버넌스 갭 (Sprint 246 회고에서 발견)

| Gap | 설명 | 영향 |
|-----|------|------|
| G5 | Sprint 완료 시 정량 지표(F-item 수/Match Rate/소요시간)가 구조화되지 않음 | velocity 추이 분석 불가, gov-retro가 git log 재파싱 |
| G2 | Phase(Epic)가 SPEC.md §5 텍스트로만 존재 — GitHub에 Epic 개념 없음 | Issue→Phase 매핑 수동, Phase 진행률 수동 집계 |

### F505 — 현재 상태

- Sprint 완료 지표: `.sprint-context` 파일에 `MATCH_RATE`, `TEST_RESULT`만 ephemeral 저장
- Velocity 추이: `gov-retro` 회고 시 git log + SPEC.md 수동 파싱
- 집계 단위: Phase별 F-item 수는 존재하나 소요시간/Match Rate 평균 미집계

### F506 — 현재 상태

- GitHub Milestones: 미사용 (Issues에 `fx:track:*` 라벨만)
- Phase 메타데이터: SPEC.md §5 마크다운 테이블만
- Phase 진행률: 수동 계산 (닫힌 F-item / 전체 F-item)

## 목표 상태

### F505 — Velocity 추적

1. **Sprint 메트릭 JSON 기록**: Sprint 완료 시 `docs/metrics/velocity/sprint-{N}.json` 생성
   - f_items, match_rate, duration_minutes, test_result, phase, timestamp
2. **집계 스크립트**: `scripts/velocity/phase-trend.sh {phase}` — Phase 단위 velocity 요약
3. **gov-retro 연동 지점**: gov-retro가 JSON 파일을 읽어 회고 섹션에 지표 주입 (스킬 수정은 별도 커밋)
4. **autopilot 연동**: Sprint autopilot Step 7에서 `record-sprint.sh` 호출

### F506 — Epic(Phase) 메타데이터

1. **GitHub Milestones 생성**: `scripts/epic/setup-milestones.sh` — SPEC.md §5의 Phase 목록을 Milestone으로 생성/동기화
2. **Phase 라벨 체계**: `fx:phase:NN` 라벨 (Phase 1~31), 기존 `fx:track:*`와 공존
3. **Phase 진행률 계산**: `scripts/epic/phase-progress.sh {phase}` — Milestone 내 open/closed issue 기반 %
4. **설정 파일**: `.github/phase-config.yml` — Phase 번호↔제목↔기간 매핑 SSOT

## 범위

### In Scope

| F-item | 범위 |
|--------|------|
| F505 | `scripts/velocity/record-sprint.sh` + `phase-trend.sh` + `docs/metrics/velocity/README.md` + Phase 29~31 소급 JSON 3개 |
| F506 | `scripts/epic/setup-milestones.sh` + `phase-progress.sh` + `.github/phase-config.yml` + Phase 29~31 Milestone 생성 dry-run 지원 |

### Out of Scope

| 항목 | 사유 |
|------|------|
| gov-retro 스킬 본문 수정 | 플러그인 경로(`~/.claude/plugins/...`)는 worktree 외부, 별도 세션에서 처리 |
| session-end 스킬 본문 수정 | 동일 사유 — 프로젝트 쪽 훅 파일만 준비 |
| Phase 1~28 소급 Milestone | 너무 방대 — 최근 3 Phase(29~31)만 |
| Phase 전환 자동화(Actions) | Sprint 248 이후 — 먼저 CLI 수동 검증 |

## 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| Velocity 저장 포맷 | JSON (파일당 1 Sprint) | git diff 친화, jq 집계 용이 |
| 저장 위치 | `docs/metrics/velocity/` | 기존 `docs/metrics/` 없으므로 신규, 문서 폴더 하위 |
| Milestone 생성 도구 | `gh api` (not `gh milestone`) | gh CLI에 milestone 서브커맨드 없음 |
| Phase 설정 SSOT | `.github/phase-config.yml` | SPEC.md 파싱 회피, 간단 YAML |
| 진행률 계산 | open/(open+closed) | GitHub Milestone API 기본 필드 |
| 훅 주입 방식 | 스크립트만 제공, 스킬은 후속 | 플러그인 수정과 분리 |

## 검증 기준

### F505

- [ ] `scripts/velocity/record-sprint.sh 247` 실행 시 `docs/metrics/velocity/sprint-247.json` 생성
- [ ] `scripts/velocity/phase-trend.sh 31` 실행 시 Phase 31의 Sprint 수/평균 Match Rate 출력
- [ ] 소급 JSON 3개(Phase 29~31 대표 Sprint) 존재
- [ ] README로 gov-retro 연동 가이드 제공

### F506

- [ ] `.github/phase-config.yml` 에 Phase 29~31 정의
- [ ] `scripts/epic/setup-milestones.sh --dry-run` 실행 시 생성될 Milestone 목록 출력
- [ ] `scripts/epic/phase-progress.sh 31` 실행 시 % 출력 (dry-run에서도 포맷 검증)
- [ ] 스크립트가 `GH_TOKEN` 없을 때 안전하게 실패(dry-run 모드)

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| `gh api` rate limit (Milestone 생성) | 429 | Phase 단위 순차, 3 Phase만 대상 |
| `.github/phase-config.yml`과 SPEC.md drift | Phase 이름 불일치 | README에 갱신 순서 명시 + `daily-check` 후속 점검 |
| autopilot 미호출 시 velocity JSON 누락 | 지표 공백 | record-sprint.sh를 수동으로도 실행 가능 (인자 기반) |
| 플러그인 스킬 미수정 상태로 gov-retro 실행 | 지표 미반영 | README에 "스킬 수정 예정" 명시, 수동 파싱 스니펫 제공 |
