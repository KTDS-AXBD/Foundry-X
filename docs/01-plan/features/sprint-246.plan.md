---
code: FX-PLAN-S246
title: "Sprint 246 Plan — F503/F504 Projects Board 연동 (todo + session-end)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-246)
sprint: 246
f_items: [F503, F504]
---

# Sprint 246 Plan — Projects Board 연동 스크립트

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 246 |
| F-items | F503, F504 |
| REQ | FX-REQ-498, FX-REQ-499 |
| 우선순위 | P1 |
| 의존성 | F501(Board 구성) 완료 필요 — Sprint 245에서 선행 |
| 목표 | 거버넌스 갭 G3(Board↔SPEC 단절) + G6(merge 후 수동 이동) 해소 |
| 대상 코드 | `scripts/board/` 하위 신규 헬퍼 스크립트 2종, ax 스킬은 별도 관리 |

## 문제 정의

### 거버넌스 갭 (Sprint 245 완료 후 잔여)

| Gap | 설명 | 영향 |
|-----|------|------|
| G3 | Board Backlog ↔ SPEC F-item 상태가 수동 동기화 | `/ax:todo` 호출 시 매번 SPEC 파싱 |
| G6 | PR merge 후 Board 컬럼 수동 이동(In Progress→Done) | auto-merge 파이프라인과 Board 상태 drift |

### F503 — 현재 상태

- `/ax:todo`(가칭): ax 스킬셋에 미존재 — Backlog 수집/할당 흐름 없음
- Board 컬럼 조회는 `gh project item-list` 수동 실행 필요
- SPEC.md F-item ↔ Issue 번호 매핑은 commit 메시지에만 존재

### F504 — 현재 상태

- `/ax:session-end`: SPEC.md + MEMORY.md + CHANGELOG 갱신까지 완료 (F502)
- PR 본문: autopilot이 F-items/Match Rate를 포함해 생성하지만, session-end 이후 갱신 로직 없음
- merge-monitor: merge 완료 후 Board 컬럼 이동 스텝 없음

## 목표 상태

### F503 — `/ax:todo` Board 연동

1. **Backlog 수집**: `scripts/board/board-list.sh --column "Backlog"` → JSON
2. **Sprint Ready 할당**: `scripts/board/board-move.sh <issue> "Sprint Ready"` + 라벨 갱신
3. **Board↔SPEC 매핑**: Issue 본문에서 F-item 코드(F503 등) 추출 → SPEC.md 상태 컬럼과 비교
4. ax 스킬(`/ax:todo`)은 위 스크립트만 호출 — 스킬 파일은 별도 관리(marketplace+cache)

### F504 — `/ax:session-end` Board 동기화

1. **merge 감지**: PR merge 완료 이벤트 → 연관 Issue 추출 (`fixes #N`, `closes #N`)
2. **컬럼 이동**: `scripts/board/board-move.sh <issue> "Done"`
3. **PR 본문 enrich**: Sprint 번호/F-items/Match Rate가 누락된 PR 본문에 표준 섹션 주입
4. `sprint-merge-monitor.sh` 또는 `/ax:session-end` 훅에서 호출

## 범위

### In Scope

| F-item | 범위 |
|--------|------|
| F503 | `board-list.sh`, `board-move.sh`, `board-sync-spec.sh` (3개 신규 스크립트) |
| F504 | `board-on-merge.sh`, `pr-body-enrich.sh` (2개 신규 스크립트), `sprint-merge-monitor.sh` 호출부 |

### Out of Scope

| 항목 | 사유 |
|------|------|
| ax 스킬 파일 직접 수정 | marketplace+cache 동기화는 별도 관리 (Sprint 245 전례) |
| GitHub Actions workflow | merge-monitor가 이미 로컬에서 처리 — Actions 추가는 후속 Sprint |
| Board 컬럼 커스터마이즈 | Sprint 245에서 이미 6컬럼 고정 |
| 양방향 실시간 동기화 | on-demand 호출로 충분, webhook은 후속 |

## 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 스크립트 위치 | `scripts/board/` | F501 `scripts/github-project-setup.sh`와 분리 — `board/` 네임스페이스로 확장 여지 |
| 호출 인터페이스 | bash + JSON(jq) | 기존 `task-start.sh` 패턴과 일관 |
| Board 식별 | title="Foundry-X Kanban" (F501과 동일) | 환경변수 불필요, 안정적 재사용 |
| PR 본문 갱신 | `gh pr edit --body` | append-only 패턴, 중복 방지용 marker 사용 |
| F-item 추출 | 정규식 `F[0-9]{3,4}` (Issue 본문 + PR 제목) | SPEC.md 포맷과 일치 |

## 검증 기준

### F503

- [ ] `board-list.sh --column "Backlog"` 실행 → JSON 출력에 number/title/labels 포함
- [ ] `board-move.sh <issue> "Sprint Ready"` 실행 후 `gh project item-list`에서 컬럼 확인
- [ ] `board-sync-spec.sh` 실행 → SPEC.md F-item 상태와 Board 컬럼 매핑 리포트 출력

### F504

- [ ] `board-on-merge.sh <pr_num>` 실행 후 연관 Issue 컬럼이 Done으로 이동
- [ ] `pr-body-enrich.sh <pr> <sprint> <f-items> <match-rate>` 실행 후 PR 본문에 표준 섹션 존재
- [ ] 재실행 시 중복 섹션 미생성 (idempotent)

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| `gh project` API rate limit | 대량 동기화 시 429 | 배치 간 0.3초 sleep (F501 전례) |
| Status 필드 이름 변경 | Board 이동 실패 | 스크립트 시작 시 field-list 검증 |
| PR 본문 marker 포맷 drift | 중복 삽입 | 고정 marker `<!-- fx-pr-enrich -->` 사용 |
| ax 스킬 파일 미동기화 | 스크립트만 존재, 사용자 호출 경로 부재 | 보고서에 marketplace 수동 반영 TODO 기록 |
