---
code: FX-PLAN-S159
title: "Sprint 159 — Prototype Auto-Gen Core Pipeline + API"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-PROTO-001]]"
---

# Sprint 159: Prototype Auto-Gen Core Pipeline + API

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F353 (D1 마이그레이션 + Prototype API) + F354 (Fallback 아키텍처 + 비용 모니터링) |
| Sprint | 159 |
| 우선순위 | P0 |
| 의존성 | F351 선행 (Sprint 158 — React SPA 템플릿 + Builder Server 스캐폴딩) |
| PRD | docs/specs/prototype-auto-gen/prd-final.md §4.1 #4~#8, §7 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | PRD→Prototype 파이프라인에 Job 큐/API/상태 관리/Fallback이 부재 |
| Solution | D1 기반 Job 큐 + REST API + State Machine + CLI↔API Fallback + 비용 추적 |
| Function UX Effect | Builder Server가 Job을 수신·실행·추적할 수 있는 API 인프라 완성 |
| Core Value | Phase 16 Core — 이후 O-G-D 루프(F355)와 대시보드(F356)의 기반 |

## F353: D1 마이그레이션 + Prototype API

### 신규 테이블: `prototype_jobs`

기존 `prototypes` 테이블(0043, biz_item 기반 HTML)과 별도. 빌드 파이프라인 Job 관리용.

```sql
CREATE TABLE IF NOT EXISTS prototype_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prd_content TEXT NOT NULL,
  prd_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  builder_type TEXT NOT NULL DEFAULT 'cli',
  pages_project TEXT,
  pages_url TEXT,
  build_log TEXT DEFAULT '',
  error_message TEXT,
  cost_input_tokens INTEGER DEFAULT 0,
  cost_output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  model_used TEXT DEFAULT 'haiku',
  fallback_used INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER
);
```

**상태 전환 (State Machine):**

```
queued ──→ building ──→ deploying ──→ live
  │           │            │
  │           ▼            ▼
  │        failed      deploy_failed
  │           │            │
  └───────────┴────────────┘
              ▼
         dead_letter (timeout / max retry 초과)
```

- `queued`: 생성 직후 대기
- `building`: Builder가 픽업하여 코드 생성 중
- `deploying`: 빌드 성공 → Pages 배포 중
- `live`: 배포 완료, URL 접근 가능
- `failed`: 빌드/생성 실패 (retry 가능)
- `deploy_failed`: Pages 배포 실패 (retry 가능)
- `dead_letter`: timeout 또는 max retry(3) 초과 → 수동 검토 필요

### API 엔드포인트 (3개)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/prototype-jobs` | Job 생성 (PRD content → queued) |
| GET | `/api/prototype-jobs` | Job 목록 (org_id 필터, status 필터, 페이지네이션) |
| GET | `/api/prototype-jobs/:id` | Job 상세 (빌드 로그 포함) |
| PATCH | `/api/prototype-jobs/:id` | Job 상태 변경 (Builder Server → status/log/url 업데이트) |

### 파일 목록

| # | 경로 | 설명 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0102_prototype_jobs.sql` | D1 마이그레이션 |
| 2 | `packages/api/src/schemas/prototype-job.ts` | Zod 스키마 (Create/Update/Response) |
| 3 | `packages/api/src/services/prototype-job-service.ts` | PrototypeJobService (CRUD + State Machine) |
| 4 | `packages/api/src/routes/prototype-jobs.ts` | Hono 라우트 (4 endpoints) |
| 5 | `packages/api/src/__tests__/prototype-job-service.test.ts` | 서비스 단위 테스트 |
| 6 | `packages/api/src/__tests__/prototype-jobs-route.test.ts` | 라우트 통합 테스트 |

## F354: Fallback 아키텍처 + 비용 모니터링

### 신규 테이블: `prototype_usage_logs`

```sql
CREATE TABLE IF NOT EXISTS prototype_usage_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  job_id TEXT NOT NULL REFERENCES prototype_jobs(id),
  builder_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  duration_ms INTEGER DEFAULT 0,
  fallback_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Fallback 전략 (3단계)

```
Primary:   CLI --bare (Haiku, ~$0.5~1/건)
    │ 실패 (timeout / CLI 오류 / 빌드 3회 실패)
    ▼
Fallback 1: Claude API 직접 호출 (Sonnet, ~$2~5/건)
    │ 실패 (API 장애 / rate limit)
    ▼
Fallback 2: dead_letter (수동 검토)
```

### 비용 모니터링 API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/prototype-usage` | 사용량 요약 (일별/월별 비용, 모델별 통계) |
| GET | `/api/prototype-usage/budget` | 예산 상태 (월 한도 대비 현재 사용량) |

### 파일 목록

| # | 경로 | 설명 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0103_prototype_usage_logs.sql` | D1 마이그레이션 |
| 2 | `packages/api/src/schemas/prototype-usage.ts` | Zod 스키마 |
| 3 | `packages/api/src/services/prototype-usage-service.ts` | UsageService (로깅 + 집계 + 예산 체크) |
| 4 | `packages/api/src/services/prototype-fallback.ts` | FallbackStrategy (CLI→API 전환 로직) |
| 5 | `packages/api/src/routes/prototype-usage.ts` | 사용량 라우트 |
| 6 | `packages/api/src/__tests__/prototype-usage-service.test.ts` | 사용량 서비스 테스트 |
| 7 | `packages/api/src/__tests__/prototype-fallback.test.ts` | Fallback 전략 테스트 |

## app.ts 라우트 등록

```typescript
// prototype-jobs + prototype-usage 라우트를 app.ts에 등록
import { prototypeJobsRoute } from "./routes/prototype-jobs.js";
import { prototypeUsageRoute } from "./routes/prototype-usage.js";
```

## 사전 조건

- [x] Sprint 158 (F351+F352) merge 완료 — 템플릿 + Builder 스캐폴딩
- [x] 기존 prototypes 테이블(0043)과 별도 네이밍 (`prototype_jobs`)
- [x] D1 마이그레이션 최신 번호 확인: 0101 → 다음 0102, 0103

## 성공 기준

- [ ] D1 마이그레이션 2건 적용 (prototype_jobs, prototype_usage_logs)
- [ ] API 6 endpoints 동작 (POST/GET/GET:id/PATCH + usage 2건)
- [ ] State Machine 전이 테스트 통과 (7개 상태, 유효/무효 전이)
- [ ] Fallback 전략 테스트 통과 (CLI 실패 → API 전환 시뮬레이션)
- [ ] 비용 집계 쿼리 테스트 통과 (일별/월별 + 예산 체크)
- [ ] typecheck + lint + test 전체 통과
