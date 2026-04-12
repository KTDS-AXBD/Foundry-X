---
code: FX-DSGN-208
title: Sprint 208 Design — Sprint Automation v2
version: 1.0
status: Draft
category: DSGN
system-version: Sprint 208
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references:
  - "[[FX-PLAN-208]]"
---

# Sprint 208 Design — Sprint Automation v2

## 1. 개요

기존 `sprint-pipeline` 스킬에 Phase 6(Gap Analyze 집계) + Phase 7(Auto Iterator) + Phase 8(Session-End)을 추가하고, `sprint-watch` 스킬에 Pipeline 전체 Phase 진행률과 Monitor 생존 감시를 추가한다.

## 2. 변경 대상 파일

| # | 파일 | 변경 유형 | 변경량 |
|---|------|----------|--------|
| 1 | `~/.claude/plugins/.../skills/sprint-pipeline/SKILL.md` | 수정 | +120줄 |
| 2 | `~/.claude/plugins/.../skills/sprint-watch/SKILL.md` | 수정 | +60줄 |

## 3. F432 — sprint-pipeline Phase 6~8

### Phase 6: 전체 Gap Analyze
- Signal 파일 MATCH_RATE 1순위, analysis 문서 fallback 2순위
- 4단계 판정: Pass(>=90%) / Gap(80~89%) / Fail(<80%) / Unknown(N/A)
- Pipeline State JSON `phase6` 필드 갱신

### Phase 7: Auto Iterator
- Gap Sprint WT 재진입 (3케이스: WT+tmux 존재 / WT만 존재 / WT 부재)
- `sprint/{N}-iterate` 브랜치로 새 WT 생성 (Case B)
- Signal ITERATE_STATUS/COUNT/FINAL_RATE 필드로 완료 감지 (20분 타임아웃)
- 3회 iterate 후 <90%이면 WARN + 계속 (non-blocking)
- iterate WT 자동 정리

### Phase 8: Session-End (Pipeline 전용)
- SPEC.md F-item 🔧→✅ 자동 보정
- MEMORY.md Pipeline 요약 추가
- CLAUDE.md 헤더 동기화 (sync-claude-md.sh)
- `git pull --rebase` → 파일 개별 add → commit → push
- CI/CD 배포 확인 (gh run list)
- Pipeline State 최종 갱신 + 완료 리포트

### 추가 변경
- Pipeline State JSON 초기화 시 phase6/7/8 필드 포함
- Signal 파일 ITERATE_* 3필드 추가
- --resume Phase 6~8 재개 지원
- --dry-run Phase 6~8 예상 동작 출력

## 4. F433 — sprint-watch 확장

### Pipeline Phase 진행률
- Pipeline State JSON에서 Phase 1~8 상태 읽기
- Gist에 Pipeline 진행 테이블 추가 (활성 시에만)

### Monitor 생존 감시
- 3개 Monitor (merge/status/auto-approve) pgrep 감시
- 죽으면 nohup+disown 자동 재시작, 3회 한도
- Gist에 Monitor 상태 테이블 추가

## 5. 검증 체크리스트

15개 항목 — Plan §9 검증 기준 + Design 추가 항목. Gap Analysis에서 전체 Pass 확인.

## 6. 설계 결정

| ID | 결정 | 근거 |
|----|------|------|
| D1 | WT 부재 시 새 WT 생성 | master 직접 수정 위험 |
| D2 | iterate 실패 = non-blocking | Gap 남아도 결과물 유효 |
| D3 | session-end 인라인 | session-end 범용 로직이 Pipeline과 충돌 |
