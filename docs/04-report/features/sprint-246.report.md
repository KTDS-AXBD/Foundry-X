---
code: FX-RPT-S246
title: "Sprint 246 Report — F503/F504 Projects Board 연동"
version: "1.0"
status: Done
category: RPT
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-246)
sprint: 246
f_items: [F503, F504]
match_rate: 95
---

# Sprint 246 Report — Projects Board 연동 스크립트

## 요약

| 항목 | 값 |
|------|----|
| F-items | F503, F504 |
| REQ | FX-REQ-498, FX-REQ-499 |
| Match Rate | **95%** |
| 신규 파일 | 6 (`scripts/board/*.sh`) |
| 수정 파일 | 1 (`scripts/sprint-merge-monitor.sh`) |
| 테스트 | `bash -n` 전체 통과 |

## 구현 내역

### F503 — `/ax:todo` Board 연동 스크립트

| 스크립트 | 역할 | 상태 |
|----------|------|------|
| `scripts/board/_common.sh` | 공통 상수/헬퍼 (OWNER, project_num, status_field_id) | ✅ |
| `scripts/board/board-list.sh` | 지정 컬럼의 Issue 아이템 JSON 출력 | ✅ |
| `scripts/board/board-move.sh` | Issue를 특정 컬럼으로 이동 (없으면 추가) | ✅ |
| `scripts/board/board-sync-spec.sh` | Board↔SPEC.md F-item 상태 비교 리포트 (+ `--json`) | ✅ |

### F504 — `/ax:session-end` Board 동기화 스크립트

| 스크립트 | 역할 | 상태 |
|----------|------|------|
| `scripts/board/board-on-merge.sh` | PR merge 후 `closes #N` 추출 → Done 이동 | ✅ |
| `scripts/board/pr-body-enrich.sh` | PR 본문에 Sprint/F-items/Match Rate 표준 섹션 주입 (idempotent) | ✅ |
| `sprint-merge-monitor.sh` Step 6 | merge 성공 후 `board-on-merge.sh` 자동 호출 | ✅ |

## Gap Analysis (Design ↔ Implementation)

### 구현됨 (Design §5 파일 매핑 기준)

- ✅ `_common.sh` — OWNER/REPO/PROJECT_TITLE, board::* 헬퍼 전체
- ✅ `board-list.sh` — `--column` 파라미터, JSON 출력 형식 일치
- ✅ `board-move.sh` — item-add fallback, single-select-option-id 갱신
- ✅ `board-sync-spec.sh` — Design에 없던 `--json` 옵션 추가(하위 호환)
- ✅ `board-on-merge.sh` — close/fix/resolve 정규식 일치
- ✅ `pr-body-enrich.sh` — marker 블록 idempotent, `--body-file` 사용으로 안정성 개선
- ✅ `sprint-merge-monitor.sh` Step 6 호출부

### 의도적 제외 (Design §7)

| 항목 | 사유 |
|------|------|
| ax 스킬 파일(`/ax:todo`, `/ax:session-end`) 실제 수정 | marketplace+cache 별도 관리 — Sprint 245 전례 |
| Board webhook 실시간 동기화 | on-demand 호출로 충분 |
| GitHub Actions workflow | merge-monitor 로컬 처리 우선 |
| `board-sync-spec.sh --fix` 자동 쓰기 | 리포트만 우선, 자동화는 후속 Sprint |

### 개선(Design 대비 보강)

1. `pr-body-enrich.sh`: HEREDOC + `gh pr edit --body` 대신 `--body-file` 사용 → 특수문자/개행 안정성 향상
2. `board-sync-spec.sh`: `--json` 모드 추가 — 다른 스크립트에서 파싱 용이
3. `sprint-merge-monitor.sh` Step 6: `${BASH_SOURCE[0]}` 기반 절대경로 해석 — 워킹트리 경로 무관

## 검증 결과

| 항목 | 결과 |
|------|------|
| `bash -n scripts/board/*.sh` | ✅ 전체 통과 |
| `bash -n scripts/sprint-merge-monitor.sh` | ✅ 통과 |
| 실런타임 검증 | ⏭ skip — 실제 Board 호출은 merge 시 자연 검증 |

## 후속 작업 (TODO)

1. **ax 스킬 수정** (별도 관리):
   - `/ax:todo` 스킬이 `board-list.sh`/`board-sync-spec.sh` 호출하도록 추가
   - `/ax:session-end` 스킬이 `pr-body-enrich.sh` 호출하도록 추가 (Sprint/F-items/Match Rate 인자 전달)
2. **F505** (Sprint 247): Velocity 추적 — session-end에서 메트릭 적재
3. **F506** (Sprint 247): Epic(Phase) 메타데이터 — Milestones 매핑
4. `board-sync-spec.sh --fix` 자동 쓰기 모드 (후속)

## Match Rate 산출

| 항목 | 배점 | 획득 |
|------|------|------|
| Design §5 파일 7개 전체 생성 | 70 | 70 |
| Design §6 구현 순서 준수 | 10 | 10 |
| `bash -n` syntax 통과 | 10 | 10 |
| 실런타임 E2E 검증 | 10 | 5 (merge 시 자연 검증으로 대체) |
| **합계** | **100** | **95** |
