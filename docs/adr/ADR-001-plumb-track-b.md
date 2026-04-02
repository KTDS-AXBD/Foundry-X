---
code: FX-ADR-001
title: "Plumb Track B 전환 판정"
version: 1.0
status: Accepted
category: ADR
created: 2026-03-21
updated: 2026-03-21
author: AX BD팀
---

# ADR-001: Plumb Track B 전환 판정

## Status

Accepted — Track A 유지 — 2026-03-21

## Context

Plumb는 Python 기반 SDD Triangle 엔진으로, Foundry-X CLI에서 subprocess로 호출한다.

- **Track A (현재)**: Plumb을 그대로 사용. CLI에서 PlumbBridge를 통해 `python3 -m plumb` 실행.
- **Track B (대안)**: Plumb 핵심 알고리즘을 TypeScript로 재구현하여 subprocess 의존 제거.

**전환 기준 (PRD v4 원문 유지):** Plumb 버그로 인한 장애 주 2회 이상.

## Data

### 분석 기간

8주 (Sprint 24~27 기간, 2026-01-25 ~ 2026-03-21)

### 코드베이스 분석

| 항목 | 값 |
|------|-----|
| PlumbBridge 호출 파일 수 | 4개 (bridge.ts, types.ts, status.ts, sync.ts) |
| 실제 사용 지점 | 2개 (status.ts, sync.ts) |
| 에러 타입 수 | 4개 (NotInstalled, Timeout, Execution, Output) |
| 에러 핸들링 | 모든 호출 지점에서 try/catch + graceful fallback |

### Git 이력 분석

| 항목 | 값 |
|------|-----|
| Plumb 관련 전체 커밋 | 3건 |
| 버그 수정 커밋 | 1건 (에러 계약 문서화, 런타임 장애 아님) |
| 주간 장애 횟수 | **0.125회/주** (기준: ≥2회) |
| 에러율 | 33.3% (표본 3건으로 통계적 의미 없음) |

### KPI 데이터

**실사용자 KPI 데이터 없음** — KPI 인프라(F100)는 Sprint 27에서 구축 중이나, 실사용자 미참여로 Plumb 호출 기록 없음. 내부 개발 과정에서 Plumb 관련 런타임 장애는 보고된 적 없음.

### 추가 분석

- PlumbBridge는 Sprint 1(v0.1.0)에서 구현 후 **Sprint 2 이후 변경 없음** — 안정적 상태
- `sync` 커맨드에서만 Plumb 실제 실행 (status는 `isAvailable()` 확인만)
- 모든 에러 경로에 `PlumbNotInstalledError` → 사용자 안내 메시지 포함
- Phase 2(API/Web)에서는 Plumb을 직접 호출하지 않음 (MCP 경유 설계)

## Decision

**Stay Track A — Plumb 유지**

주간 장애 0.125회/주 (기준 2회 대비 94% 하회), 런타임 장애 보고 0건. 표본 수가 적어 에러율(33.3%)은 통계적으로 무의미. 실사용자 피드백 데이터 없는 현 시점에서 TypeScript 재구현의 ROI를 정당화할 수 없음.

**재판정**: 2026-09-21 (6개월 후) 또는 다음 조건 발생 시 즉시:
- Plumb 런타임 장애 주 2회 이상 (K1 CLI 호출 로그 기반)
- 실사용자 온보딩(F114) 후 피드백에서 Plumb 관련 불만 2건 이상

## Consequences

- Plumb Track A 유지 — subprocess 호출 방식 계속 사용
- 2026-09-21에 재판정 (6개월 후, 또는 F114 온보딩 피드백 기반 즉시 판정 가능)
- KPI 이벤트(F100)에 `cli_invoke` type으로 Plumb 호출 성공/실패 자동 로깅 추가 권장
- PlumbBridge 에러 핸들링은 현재 수준 유지 (4종 에러 타입 + graceful fallback)
- `no-orphan-plumb-import` ESLint 룰(F103)로 CLI 외부 패키지에서의 직접 호출 방지 유지
