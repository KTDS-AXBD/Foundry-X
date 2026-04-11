---
code: FX-PLAN-S248
title: "Sprint 248 Plan — F507 Priority 변경 이력 자동 기록"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-248)
sprint: 248
f_items: [F507]
---

# Sprint 248 Plan — Priority 변경 이력 자동 기록

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 248 |
| F-items | F507 |
| REQ | FX-REQ-502 |
| 우선순위 | P2 |
| Phase | 32-D 거버넌스 완성 (M4) |
| 의존성 | F506 Epic 메타데이터(Sprint 247) — Issue/Project Priority 필드 재사용 |
| 목표 | 거버넌스 갭 G7(Priority 변경 추적 부재) 해소 |
| 대상 코드 | `scripts/priority/*`, `docs/priority-history/`, `.github/workflows/priority-change.yml` |

## 문제 정의

### 거버넌스 갭 G7

| 항목 | 현재 상태 | 문제 |
|-----|----------|------|
| SPEC.md F-item Priority | P0~P3 단일 셀 — 최근 값만 존재 | 과거 Priority 추적 불가, 변경 사유 유실 |
| GitHub Issue Priority Label | 라벨 추가/제거 이벤트는 API에 남지만 가시성 없음 | 회고/감사 시 수동 조회 필요 |
| `/ax:req-manage status` | 상태만 변경, Priority 변경 미지원 | Priority 승격·강등 워크플로 부재 |

**영향**: Sprint 회고 시 "이 기능이 왜 P1에서 P3로 강등됐나"에 답할 수 없음 → 의사결정 학습 루프 단절.

## 목표

1. **SPEC.md 기록**: Priority 변경 시 `docs/priority-history/F{N}.md`에 자동 append
2. **GitHub Issue 동기화**: 변경 즉시 Issue comment + Priority 라벨 갱신
3. **req-manage 연동 지점**: 스크립트 단일 호출로 모든 동기화 완료 — 플러그인 스킬이 호출하기만 하면 됨
4. **자동 감지**: GitHub Actions가 Issue 라벨 변경을 감지 → 스크립트 호출로 역방향 동기화

## 비목표 (Out of Scope)

- 플러그인 스킬(`~/.claude/plugins/cache/ax-marketplace/.../req-manage/SKILL.md`) 직접 수정 — 별도 PR
- Web UI Priority 변경 (Phase 33 대기)
- Priority 변경 권한 RBAC 검증 — 감사 로그에만 집중

## 작업 범위

| 파일 | 역할 | 유형 |
|------|------|------|
| `scripts/priority/record-change.sh` | 핵심 — 이력 append + Issue comment + 라벨 갱신 | 신규 |
| `scripts/priority/list-history.sh` | 이력 조회/필터 | 신규 |
| `docs/priority-history/README.md` | 저장소 형식 설명 | 신규 |
| `.github/workflows/priority-change.yml` | Issue 라벨 변경 감지 → 스크립트 트리거 | 신규 |
| `docs/02-design/features/sprint-248.design.md` | Design | 신규 |
| `docs/03-analysis/features/sprint-248.analysis.md` | Analysis | 신규 |
| `docs/04-report/features/sprint-248.report.md` | Report | 신규 |

## 검증 기준

- `record-change.sh F507 P2 P1 "스코프 확장"` 실행 시:
  - `docs/priority-history/F507.md`에 entry append
  - Issue comment 추가 (gh CLI 있을 때)
  - Priority 라벨 교체 (P2-medium → P1-high)
- `list-history.sh` — F번호/기간/Priority 필터 지원
- Workflow lint: `actionlint` 또는 yaml 문법 통과
- 스크립트 shellcheck 통과

## 완료 조건

- Match Rate ≥ 90%
- SPEC.md F507 📋 → ✅
- PDCA 4 문서 + 3 스크립트 + 1 workflow + README 커밋
