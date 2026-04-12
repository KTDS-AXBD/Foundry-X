---
code: FX-PLAN-045
title: Sprint 45 — KPI 자동 수집 인프라
version: 1.0
status: Active
category: PLAN
sprint: 45
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | Sprint 45 — KPI 자동 수집 인프라 |
| Sprint | 45 |
| F-items | F158, F159, F160, F161 |
| 예상 산출물 | 웹 자동 추적 훅 + CLI 로깅 + Cron 집계 + 대시보드 실데이터 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | KPI 인프라(F100)가 있지만 자동 수집이 없어 kpi_events 테이블이 비어있고, 온보딩 4주 추적(F157)을 데이터 기반으로 수행할 수 없음 |
| **Solution** | 웹/CLI 사용 이벤트를 자동 수집하고, Cron으로 K7/K8/K11을 일별 집계하여 KPI 대시보드에 실데이터 표시 |
| **Function UX Effect** | 관리자가 /analytics 페이지에서 실시간 사용 현황(WAU, 에이전트 완료율, SDD 정합률)을 바로 확인 가능 |
| **Core Value** | 온보딩 효과를 정량적으로 측정하여 Phase 5 Go/Kill 판정의 데이터 기반 마련 |

## 1. 배경 및 목적

### 1.1 현재 상태 (AS-IS)

Sprint 27(F100)에서 KPI 측정 인프라를 구축했으나 **자동 수집 파이프라인이 없는 상태**:

| 구성요소 | 상태 | 문제 |
|----------|:----:|------|
| KpiLogger 서비스 | ✅ 구현됨 | 수동 호출 전용 — 프론트엔드/CLI에서 호출하는 곳 없음 |
| POST /kpi/track | ✅ 구현됨 | 인증 선택적, 누구나 호출 가능하나 아무도 안 함 |
| GET /kpi/summary | ✅ 구현됨 | kpi_events가 비어있어 WAU=0, 에이전트완료율=0 |
| GET /kpi/trends | ✅ 구현됨 | 동일 — 빈 데이터 반환 |
| GET /kpi/phase4 | ✅ 구현됨 | Phase 4 KPI UI(F125)에 연결됐으나 빈 데이터 |
| analytics 페이지 | ✅ 구현됨 | KPI 카드가 전부 0이나 Loading 표시 |
| trackKpiEvent() | ✅ api-client에 함수 존재 | **웹 앱 어디에서도 호출되지 않음** |
| CLI KPI 로깅 | ❌ 없음 | init/status/sync 후 이벤트 전송 코드 없음 |
| Cron 집계 | ❌ 없음 | scheduled.ts에 reconciliation + prune만 있음 |
| kpi_snapshots | ❌ 없음 | 일별 스냅샷 테이블 부재 |

### 1.2 목표 (TO-BE)

사용자가 웹 대시보드를 방문하거나 CLI를 실행하면 **자동으로** KPI 이벤트가 쌓이고, Cron이 K7/K8/K11을 일별 집계하여 /analytics 대시보드에 실데이터가 표시되는 상태.

| KPI | 측정 방법 | 자동화 수준 |
|-----|-----------|:----------:|
| K7 (WAU) | page_view의 distinct user_id / 주 | 완전 자동 |
| K8 (에이전트 완료율) | agent_task completed / total | 완전 자동 |
| K11 (SDD 정합률) | sdd_check metadata.rate 최신값 | 완전 자동 |
| K1 (CLI 호출) | cli_invoke 이벤트 수 / 주 / 사용자 | 완전 자동 |

## 2. F-item 상세

### F158: 웹 대시보드 페이지뷰 자동 추적 (P0)

**목표**: Next.js 라우트 변경 시 `page_view` 이벤트를 POST /kpi/track에 자동 전송

**구현 방안**:
1. `packages/web/src/hooks/useKpiTracker.ts` — React 훅 생성
   - `usePathname()` + `useEffect()`로 경로 변경 감지
   - `trackKpiEvent('page_view', { path, referrer })` 호출
   - debounce 300ms (빠른 네비게이션 중복 방지)
   - 인증 토큰이 없으면 anonymous 모드 (userId=null)
2. `packages/web/src/app/(app)/layout.tsx`에 훅 삽입
   - 대시보드 영역(`(app)`) 전체에 적용
   - 랜딩 페이지(`(landing)`)는 제외 (내부 사용자만 추적)
3. api-client.ts의 `trackKpiEvent()` 함수 활용 (이미 존재)

**비기능 요구사항**:
- 페이지뷰 추적 실패 시 무시 (fire-and-forget) — UX 차단 금지
- 초당 최대 1회 제한 (throttle)

### F159: CLI 호출 자동 KPI 로깅 (P1)

**목표**: `foundry-x init/status/sync` 실행 완료 후 `cli_invoke` 이벤트 자동 전송

**구현 방안**:
1. `packages/cli/src/services/kpi-reporter.ts` — CLI KPI 전송 서비스
   - API URL은 `.foundry-x/config.json`에서 읽거나 기본값 사용
   - `reportCliInvoke(command, duration, success)` 메서드
   - HTTP POST (fetch/undici) — Node.js 20 built-in fetch 활용
2. 각 커맨드(init, status, sync)의 실행 후 단계에 호출 삽입
   - 실패해도 CLI 종료에 영향 없음 (catch + ignore)
   - `--no-telemetry` 플래그로 비활성화 가능

**비기능 요구사항**:
- 네트워크 비가용 시 로컬 큐(`~/.foundry-x/kpi-queue.json`) 저장 → 다음 실행 시 flush
- 타임아웃 3초

### F160: K7/K8/K11 자동 집계 Cron (P0)

**목표**: 기존 Cron(6시간)에 KPI 자동 집계 로직 추가, kpi_snapshots D1 테이블 생성

**구현 방안**:
1. D1 migration 0028 — `kpi_snapshots` 테이블 생성
   ```sql
   CREATE TABLE kpi_snapshots (
     id TEXT PRIMARY KEY,
     tenant_id TEXT NOT NULL,
     snapshot_date TEXT NOT NULL,
     k7_wau INTEGER NOT NULL DEFAULT 0,
     k8_agent_completion_rate REAL NOT NULL DEFAULT 0,
     k11_sdd_integrity_rate REAL NOT NULL DEFAULT 0,
     k1_cli_invocations INTEGER NOT NULL DEFAULT 0,
     total_events INTEGER NOT NULL DEFAULT 0,
     metadata TEXT DEFAULT '{}',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     UNIQUE(tenant_id, snapshot_date)
   );
   ```
2. KpiLogger에 `generateDailySnapshot(tenantId, date)` 메서드 추가
   - getSummary() 로직 재활용하여 일별 스냅샷 생성
   - UPSERT (INSERT OR REPLACE) — 중복 실행 안전
3. scheduled.ts에 집계 호출 추가
   - `await kpiLogger.generateDailySnapshot(org.id, today)` — Cron 6시간마다
   - 같은 날 여러 번 실행돼도 최신 값으로 덮어씀

**비기능 요구사항**:
- Cron 실행 시간 증가 < 500ms (기존 reconciliation 대비)

### F161: KPI 대시보드 실데이터 연결 (P1)

**목표**: F125에서 만든 KPI 대시보드 UI에 자동 수집 데이터 바인딩

**구현 방안**:
1. GET /kpi/phase4 응답에 kpi_snapshots 기반 트렌드 데이터 포함
   - KpiLogger에 `getPhase4Kpi(tenantId, days)` — 이미 있으나 kpi_snapshots 활용으로 강화
2. analytics 페이지의 Phase4KPI 위젯이 실데이터 표시
   - K7 WAU 주간 트렌드 차트
   - K8 에이전트 완료율 게이지
   - K11 SDD 정합률 게이지
3. 빈 데이터 상태 처리: "아직 수집된 데이터가 없습니다" 메시지 → 데이터 수집 가이드 안내

## 3. 구현 순서

```
F160 (D1 migration + Cron 집계)
  ↓
F158 (웹 자동 추적 — 데이터 유입 시작)
  ↓
F159 (CLI 로깅 — 추가 데이터 유입)
  ↓
F161 (대시보드 실데이터 연결 — 시각화)
```

**이유**: D1 스키마와 집계 로직이 먼저 있어야 수집된 데이터가 의미 있는 스냅샷으로 변환됨.

## 4. 영향 범위

| 패키지 | 변경 파일 | 종류 |
|--------|-----------|------|
| api | `services/kpi-logger.ts` | 수정 — generateDailySnapshot() 추가 |
| api | `scheduled.ts` | 수정 — 집계 호출 추가 |
| api | `db/migrations/0028_kpi_snapshots.sql` | 신규 |
| api | `__tests__/kpi-*.test.ts` | 수정/신규 — 집계 + 스냅샷 테스트 |
| web | `hooks/useKpiTracker.ts` | 신규 |
| web | `app/(app)/layout.tsx` | 수정 — 훅 삽입 |
| web | `app/(app)/analytics/page.tsx` | 수정 — 빈 상태 UX |
| cli | `services/kpi-reporter.ts` | 신규 |
| cli | `index.ts` 또는 각 커맨드 파일 | 수정 — postRun 호출 |

## 5. 테스트 전략

| 구분 | 대상 | 방법 |
|------|------|------|
| Unit | KpiLogger.generateDailySnapshot | vitest — mock D1, 일별 집계 정확성 |
| Unit | useKpiTracker | vitest — 라우트 변경 시 trackKpiEvent 호출 확인 |
| Unit | kpi-reporter | vitest — fetch mock, 큐 저장/flush |
| Integration | Cron 집계 | handleScheduled 호출 후 kpi_snapshots 확인 |
| Integration | analytics 페이지 | kpi_events에 데이터 삽입 후 UI 렌더링 확인 |

## 6. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| CLI→API 네트워크 불가용 | CLI 이벤트 손실 | 로컬 큐 + 재전송 (F159) |
| Cron 집계 성능 | Workers 실행 시간 초과 | 쿼리 최적화 + 인덱스 활용 |
| kpi_events 데이터 없는 초기 | 대시보드 빈 상태 | 안내 메시지 + 가이드 (F161) |

## 7. PRD 정합성

| PRD KPI | F-item | 측정 방법 |
|---------|--------|-----------|
| K1 CLI 호출/사용자 | F159 | cli_invoke 이벤트 카운트 |
| K7 WAU | F158+F160 | page_view distinct user_id |
| K8 에이전트 완료율 | F160 | agent_task completed/total |
| K11 SDD 정합률 | F160 | sdd_check metadata.rate |

K9(서비스 전환 없는 워크플로우), K10(탐색→구축 핸드오프), K12(NPS)는 이번 Sprint 범위 외 — 설문/행동 분석 기반으로 별도 Sprint에서 다룸.
