---
code: FX-PLAN-S190
title: "Sprint 190 — Queue+DO PoC + JWT/API Key/RBAC/CI/CD"
version: 1.0
status: Active
category: PLAN
phase: "Phase 21: Gate-X 독립 서비스"
sprint: 190
f-items: [F404, F405]
req-codes: [FX-REQ-396, FX-REQ-397]
created: 2026-04-07
updated: 2026-04-07
author: Sinclair + Claude
---

# Sprint 190 Plan — Queue+DO PoC + JWT/API Key/RBAC/CI/CD

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F404: O-G-D 비동기 아키텍처 PoC, F405: JWT/API Key/RBAC/CI/CD |
| Sprint | 190 |
| Phase | Phase 21-A: 코어 API + 독립 배포 (M1, P0) |
| 예상 산출물 | Queues+DO PoC 코드 + API Key 인증 시스템 + gate-x CI/CD 워크플로우 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Workers CPU time 제한으로 O-G-D 장시간 루프 실패 + Gate-X 독립 인증/배포 미비 |
| Solution | Queues 비동기 오프로드 + DO 상태 조율 PoC + API Key 인증 + GitHub Actions CI/CD |
| Function UX Effect | O-G-D 루프 타임아웃 없이 비동기 실행 + API Key로 외부 연동 가능 |
| Core Value | Phase 21 Conditional 착수 조건 해소 — 기술 리스크 검증 완료 |

## 2. 범위

### 2.1 F404 — O-G-D 루프 비동기 아키텍처 (Queues + Durable Objects PoC)

**배경:** Cloudflare Workers는 CPU time 10ms/request 제한이 있어, O-G-D 루프의 다중 LLM 호출(수십 초)이 타임아웃됨. Queue 기반 비동기 처리와 Durable Objects 상태 조율로 이 제약을 해소한다.

**산출물:**
- `packages/gate-x/src/durable-objects/ogd-coordinator.ts` — DO 상태 조율 (job 생성/완료/조회)
- `packages/gate-x/src/workers/ogd-queue-worker.ts` — Queue consumer (O-G-D 단계별 실행)
- `packages/gate-x/src/services/async-ogd-service.ts` — 비동기 O-G-D 오케스트레이션 서비스
- `packages/gate-x/src/routes/ogd-poc.ts` — PoC REST API (job submit/status/result)
- `wrangler.toml` 업데이트 — Queues binding + DO 클래스 등록
- 테스트: DO 상태 머신 + Queue consumer 단위 테스트

**PoC 검증 기준:**
- Job 제출 → Queue enqueue → Consumer 실행 → DO 상태 갱신 → 결과 조회 흐름 동작
- CPU time 제한 없는 비동기 처리 확인 (DO 기반 상태 지속)
- 실패 시 재시도(Queues 자동 retry) 동작 확인

### 2.2 F405 — JWT 독립 인증 + API Key 발급 + RBAC + CI/CD

**배경:** Sprint 189에서 harness-kit JWT 미들웨어는 연결했지만, API Key 발급/검증 시스템이 없고 Gate-X 전용 CI/CD도 없다.

**산출물:**
- `packages/gate-x/src/db/migrations/0002_api_keys.sql` — api_keys + api_key_usage 테이블
- `packages/gate-x/src/services/api-key-service.ts` — API Key CRUD + 사용량 추적
- `packages/gate-x/src/middleware/api-key.ts` — API Key 검증 미들웨어 (JWT fallback 포함)
- `packages/gate-x/src/routes/api-keys.ts` — API Key 관리 엔드포인트 (발급/조회/폐기)
- `packages/gate-x/src/middleware/auth.ts` — JWT + API Key 통합 인증 미들웨어
- `.github/workflows/deploy-gate-x.yml` — Gate-X 전용 CI/CD (D1 마이그레이션 + deploy + smoke test)
- 테스트: API Key 발급/검증 + RBAC + CI/CD smoke test

## 3. 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 비동기 패턴 | Queues + DO | Workers CPU time 해소 공식 패턴. Cron Trigger 대안보다 job 단위 추적 가능 |
| DO 상태 저장 | D1 + DO storage (하이브리드) | 장기 보존은 D1, 실시간 조율은 DO storage |
| API Key 형식 | `gx_` prefix + crypto.getRandomValues (32바이트 hex) | 서비스 식별 + 충돌 방지 |
| API Key 저장 | SHA-256 해시 (단방향) | 평문 저장 금지 — 발급 시 1회만 원문 반환 |
| 인증 우선순위 | Bearer JWT → X-API-Key 헤더 → 실패 | JWT가 사용자 세션, API Key가 서비스 연동 |
| CI/CD | Gate-X 독립 workflow (deploy-gate-x.yml) | deploy.yml(FX)와 분리 — 독립 배포 사이클 |

## 4. D1 마이그레이션 계획

### 0002_api_keys.sql (신규)

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,   -- SHA-256
  key_prefix TEXT NOT NULL,        -- 'gx_' + 8자 (조회용)
  role TEXT NOT NULL DEFAULT 'member',
  scopes TEXT NOT NULL DEFAULT '[]', -- JSON array
  last_used_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);

CREATE TABLE api_key_usage (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 5. 실행 순서

| # | 작업 | 파일 |
|---|------|------|
| 1 | DO 상태 조율 클래스 구현 | `src/durable-objects/ogd-coordinator.ts` |
| 2 | Queue consumer worker 구현 | `src/workers/ogd-queue-worker.ts` |
| 3 | 비동기 O-G-D 서비스 구현 | `src/services/async-ogd-service.ts` |
| 4 | PoC REST API 라우트 | `src/routes/ogd-poc.ts` |
| 5 | wrangler.toml Queues+DO 바인딩 추가 | `wrangler.toml` |
| 6 | D1 마이그레이션 (api_keys) | `src/db/migrations/0002_api_keys.sql` |
| 7 | API Key 서비스 구현 | `src/services/api-key-service.ts` |
| 8 | API Key 미들웨어 | `src/middleware/api-key.ts` |
| 9 | 통합 auth 미들웨어 | `src/middleware/auth.ts` |
| 10 | API Key 라우트 | `src/routes/api-keys.ts` |
| 11 | app.ts 라우트 등록 업데이트 | `src/app.ts` |
| 12 | CI/CD 워크플로우 | `.github/workflows/deploy-gate-x.yml` |
| 13 | 테스트 (DO + Queue + API Key) | `src/test/` |
| **합계** | | **~13 파일** |

## 6. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| DO/Queues가 로컬 vitest에서 미지원 | 높음 | 중 | 인터페이스 mock으로 로직 단위 테스트 분리 |
| wrangler.toml D1 database_id가 TBD | 중 | 중 | CI/CD에서 `--local` 모드 먼저, remote는 별도 설정 |
| API Key 해시 충돌 | 낮음 | 낮음 | crypto.randomUUID + 32바이트 → 충돌 확률 무시 가능 |

## 7. 성공 기준

- [ ] DO 상태 조율 클래스 동작 (job PENDING→RUNNING→DONE)
- [ ] Queue consumer 실행 흐름 (enqueue → consume → status update)
- [ ] PoC API: POST /api/ogd/jobs (submit) + GET /api/ogd/jobs/:id (status)
- [ ] API Key 발급/조회/폐기 엔드포인트
- [ ] API Key + JWT 통합 인증 동작
- [ ] `pnpm typecheck` 성공
- [ ] 단위 테스트 통과 (vitest mock 기반)
- [ ] `.github/workflows/deploy-gate-x.yml` 생성
