---
code: FX-DSGN-046
title: "Sprint 46 — Phase 5 고객 파일럿 준비 (F162+F163+F169)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-46
sprint: 46
phase: "Phase 5"
references:
  - "[[FX-PLAN-046]]"
  - "[[FX-SPEC-001]]"
  - "prd-v8-final.md"
---

# Sprint 46 Design Document

> **Summary**: Phase 5 고객 파일럿 준비 — Azure PoC, SI R&R, 데모 환경 설계
>
> **Project**: Foundry-X
> **Version**: api 0.1.0 / web 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-22
> **Status**: Draft
> **Planning Doc**: [sprint-46.plan.md](../../01-plan/features/sprint-46.plan.md)

---

## 1. Overview

### 1.1 Design Goals

이 Design은 일반적인 "코드 구현 설계"가 아닌 **검증 실험 설계서**예요:
1. **F162 (Azure PoC)**: Cloudflare → Azure 이식 가능성을 검증할 최소 실험 설계
2. **F163 (SI R&R)**: 역할 분담 정의서의 구조와 내용 설계
3. **F169 (데모 환경)**: 고객에게 보여줄 SR 자동 처리 시나리오의 기술적 구현 설계

### 1.2 Design Principles

- **최소 검증 범위(MVP)**: 전체 마이그레이션이 아닌 핵심 3개 모듈만 Azure 검증
- **기존 자산 최대 활용**: 162개 엔드포인트 중 데모에 필요한 것만 선별
- **격리(Isolation)**: Azure PoC는 기존 Cloudflare 환경에 영향 없도록 별도 구성

---

## 2. F162: Azure 마이그레이션 PoC 설계

### 2.1 검증 목표

| # | 질문 | 검증 방법 | 성공 기준 |
|:-:|------|-----------|-----------|
| Q1 | Hono가 Azure Functions에서 동작하는가? | `@hono/node-server` + Functions adapter | 5개 엔드포인트 200 OK |
| Q2 | D1 SQL이 Azure SQL에서 동작하는가? | 핵심 5테이블 마이그레이션 + CRUD 테스트 | INSERT/SELECT/UPDATE 성공 |
| Q3 | 에이전트 오케스트레이션이 Azure에서 실행되는가? | SrClassifier + SrWorkflowMapper 호출 | SR 분류 + DAG 생성 성공 |
| Q4 | Next.js가 Azure에서 호스팅 가능한가? | Static Web Apps 배포 | 대시보드 렌더링 확인 |
| Q5 | 비용 추정이 가능한가? | Azure Pricing Calculator | 월 추정 비용 산출 |

### 2.2 Azure Functions 어댑터

```
현재 Cloudflare Workers 진입점:
  packages/api/src/index.ts → export default app (Hono)

Azure Functions 진입점 (신규):
  packages/api/src/azure.ts → Azure Functions HTTP Trigger adapter
```

**구현 접근:**

```typescript
// packages/api/src/azure.ts (신규 — Azure Functions adapter)
import { azureHonoHandler } from '@hono/node-server/azure-functions'
import { app } from './app'

export default azureHonoHandler(app)
```

> Hono는 공식적으로 Azure Functions 어댑터를 제공하지 않을 수 있음.
> 대안: `@hono/node-server`의 Node.js HTTP 핸들러를 Azure Functions HttpTrigger로 래핑.

**대안 접근 (Node.js 래퍼):**

```typescript
// packages/api/src/azure.ts
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { Hono } from 'hono'
import { app } from './app'

export async function httpTrigger(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Hono Request로 변환 → 처리 → Azure Response로 변환
  const honoReq = new Request(req.url, {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    body: req.method !== 'GET' ? await req.text() : undefined,
  })

  const honoRes = await app.fetch(honoReq)

  return {
    status: honoRes.status,
    headers: Object.fromEntries(honoRes.headers.entries()),
    body: await honoRes.text(),
  }
}
```

### 2.3 D1 → Azure SQL 마이그레이션 (핵심 5테이블)

**대상 테이블 선정 기준**: 데모 시나리오(SR 처리)에 필수적인 테이블만

| # | 테이블 | 역할 | SQLite→T-SQL 리스크 |
|:-:|--------|------|:-------------------:|
| 1 | `users` | 인증/사용자 | 낮음 |
| 2 | `organizations` | 멀티테넌시 | 낮음 |
| 3 | `projects` | 프로젝트 메타 | 낮음 |
| 4 | `sr_classifications` | SR 분류 결과 | 낮음 |
| 5 | `agent_tasks` | 에이전트 작업 | 중간 (JSON 컬럼) |

**SQL 변환 주요 포인트:**

| SQLite (D1) | Azure SQL (T-SQL) | 변환 방법 |
|-------------|-------------------|-----------|
| `TEXT` | `NVARCHAR(MAX)` | 1:1 대체 |
| `INTEGER` | `INT` | 1:1 대체 |
| `REAL` | `FLOAT` | 1:1 대체 |
| `json()` 함수 | `JSON_VALUE()` / `OPENJSON()` | 수동 변환 필요 |
| `datetime('now')` | `GETUTCDATE()` | 수동 변환 |
| `lower(hex(randomblob(16)))` | `NEWID()` | 수동 변환 |
| `AUTOINCREMENT` | `IDENTITY(1,1)` | 수동 변환 |

**마이그레이션 스크립트 구조:**

```
packages/api/src/db/
├── migrations/       # 기존 D1 마이그레이션 (유지)
└── azure/            # 신규 Azure SQL 마이그레이션
    ├── 001_create_core_tables.sql  # 5테이블 T-SQL 버전
    ├── 002_seed_demo_data.sql      # 데모용 시드 데이터
    └── migrate.sh                   # Azure SQL 마이그레이션 실행 스크립트
```

### 2.4 환경 변수 분기

```typescript
// packages/api/src/config.ts (기존 파일에 추가)
export const isAzure = process.env.AZURE_FUNCTIONS_ENVIRONMENT !== undefined

export function getDbClient() {
  if (isAzure) {
    // Azure SQL 클라이언트 (mssql 또는 tedious)
    return createAzureSqlClient(process.env.AZURE_SQL_CONNECTION_STRING!)
  }
  // 기존 D1 클라이언트
  return env.DB
}
```

### 2.5 PoC 폴더 구조

```
packages/api/
├── src/
│   ├── azure.ts           # 신규: Azure Functions 진입점
│   ├── config.ts          # 수정: isAzure 분기 추가
│   └── db/
│       └── azure/         # 신규: Azure SQL 마이그레이션
├── azure/                 # 신규: Azure Functions 프로젝트 설정
│   ├── host.json
│   ├── local.settings.json
│   └── function.json
└── wrangler.toml          # 기존 유지 (Cloudflare)
```

---

## 3. F169: 데모 환경 설계

### 3.1 데모 시나리오 상세

```
데모 시나리오: "KT DS SR 자동 처리"
─────────────────────────────────────

Step 1: 로그인 (데모 계정)
  → 이메일: demo@foundry-x.dev / 비밀번호: 데모용 고정값
  → 대시보드 랜딩

Step 2: 프로젝트 선택
  → 시드된 "KT DS ITSM 파일럿" 프로젝트
  → 프로젝트 개요 페이지

Step 3: SR 제출 (2건)
  → SR-1: "사용자 로그인 시 간헐적 500 에러 발생" → Bug 유형
  → SR-2: "API 응답시간 P95 3초 → 1초 이내로 개선" → Performance 유형

Step 4: 자동 분류 확인
  → POST /sr/classify 호출
  → SrClassifier 결과: SR-1 → Bug, SR-2 → Performance

Step 5: 에이전트 워크플로우 실행
  → POST /sr/workflow 호출
  → SrWorkflowMapper가 에이전트 DAG 생성:
    SR-1 (Bug): SecurityAgent → TestAgent → ReviewerAgent
    SR-2 (Perf): ArchitectAgent → InfraAgent → TestAgent

Step 6: 대시보드에서 결과 확인
  → 에이전트별 분석 보고서
  → 자동 PR 생성 (GitHub 연동)
  → KPI 대시보드: 처리 시간, 성공률
```

### 3.2 데모 시드 데이터

```sql
-- 데모용 시드 데이터 (D1 remote에 직접 삽입)

-- 1. 데모 조직
INSERT INTO organizations (id, name, slug)
VALUES ('demo-org-001', 'KT DS 파일럿', 'kt-ds-pilot');

-- 2. 데모 사용자
INSERT INTO users (id, email, name, password_hash, role)
VALUES ('demo-user-001', 'demo@foundry-x.dev', 'Demo User', '{hashed}', 'admin');

-- 3. 데모 프로젝트
INSERT INTO projects (id, name, org_id, git_url)
VALUES ('demo-proj-001', 'KT DS ITSM 파일럿', 'demo-org-001', 'https://github.com/KTDS-AXBD/demo-itsm');

-- 4. 데모 에이전트 설정
INSERT INTO agent_tasks (id, project_id, agent_type, status)
VALUES
  ('demo-task-001', 'demo-proj-001', 'architect', 'ready'),
  ('demo-task-002', 'demo-proj-001', 'security', 'ready'),
  ('demo-task-003', 'demo-proj-001', 'test', 'ready'),
  ('demo-task-004', 'demo-proj-001', 'infra', 'ready'),
  ('demo-task-005', 'demo-proj-001', 'reviewer', 'ready');
```

### 3.3 데모 URL 배포 전략

| 옵션 | URL | 장점 | 단점 |
|:----:|-----|------|------|
| **A: 기존 Cloudflare** | `demo.fx.minu.best` | 즉시 가능, 추가 비용 없음 | Azure 요구 고객 대응 불가 |
| B: Azure | `foundry-x-demo.azurewebsites.net` | Azure 요구 충족 | PoC 완료 후 가능 |

**권장: 옵션 A(Cloudflare) 먼저 → B(Azure)는 PoC 성공 시 추가**

데모 서브도메인 설정:
```
# Cloudflare Pages 환경 분기
- 프로덕션: fx.minu.best (기존)
- 데모: demo.fx.minu.best (신규 — 별도 Pages 프로젝트 또는 브랜치 배포)
```

### 3.4 데모 시나리오 스크립트 문서 구조

```
docs/specs/demo/
├── demo-scenario-sr.md       # SR 자동 처리 데모 스크립트
├── demo-account-setup.md     # 데모 계정/데이터 셋업 가이드
└── demo-troubleshooting.md   # 데모 중 문제 발생 시 대응
```

---

## 4. F163: SI 파트너 R&R 정의서 설계

### 4.1 문서 구조

```markdown
# Foundry-X SI 파트너 역할 분담 정의서

## 1. 목적
## 2. 역할 분류
  - 2.1 개발 (Feature 구현)
  - 2.2 커스터마이징 (고객사별 맞춤)
  - 2.3 운영 (배포/모니터링)
  - 2.4 보안 (인증/인가/컴플라이언스)
  - 2.5 교육 (온보딩/사용자 교육)
## 3. 담당 배분 (내부 vs 외부)
## 4. 비용 추정
## 5. 일정
## 6. 합의 서명
```

### 4.2 역할 매트릭스

| 역할 | 내부(AX BD) | 외부(SI 파트너) | 비고 |
|------|:----------:|:-------------:|------|
| 아키텍처 결정 | ✅ | — | 핵심 의사결정은 내부 |
| API 개발 | ✅ | 보조 | 에이전트 자동화 활용 |
| 프론트엔드 개발 | ✅ | 보조 | |
| Azure 마이그레이션 | ✅ | ✅ | 공동 수행 |
| 고객사 커스터마이징 | — | ✅ | 고객 대면은 SI |
| 운영/모니터링 | ✅ | ✅ | 인프라는 내부, 장애대응은 공동 |
| 보안 검토 | — | ✅ | KT DS 보안팀 또는 외부 |
| 사용자 교육 | ✅ | ✅ | 교재는 내부, 교육 실행은 공동 |

---

## 5. 구현 순서 (Implementation Order)

### Phase A: 데모 환경 (F169) — 우선 실행

| # | 파일/작업 | 유형 | 의존성 |
|:-:|----------|:----:|:------:|
| 1 | `packages/api/src/db/demo-seed.sql` | 신규 | — |
| 2 | 데모 시드 데이터 D1 remote 삽입 | 실행 | 1 |
| 3 | `docs/specs/demo/demo-scenario-sr.md` | 신규 | — |
| 4 | 데모 서브도메인 설정 (Cloudflare DNS) | 설정 | — |
| 5 | 데모 환경 엔드투엔드 테스트 | 검증 | 2, 4 |

### Phase B: Azure PoC (F162)

| # | 파일/작업 | 유형 | 의존성 |
|:-:|----------|:----:|:------:|
| 6 | `packages/api/azure/host.json` | 신규 | — |
| 7 | `packages/api/src/azure.ts` | 신규 | — |
| 8 | `packages/api/src/db/azure/001_create_core_tables.sql` | 신규 | — |
| 9 | `packages/api/src/db/azure/002_seed_demo_data.sql` | 신규 | 8 |
| 10 | Azure Functions 배포 + SQL 마이그레이션 | 실행 | 6~9 |
| 11 | Azure 환경 E2E 스모크 테스트 | 검증 | 10 |
| 12 | `docs/specs/azure-migration-guide.md` | 신규 | 11 |

### Phase C: SI R&R (F163) — 병행

| # | 파일/작업 | 유형 | 의존성 |
|:-:|----------|:----:|:------:|
| 13 | `docs/specs/si-partner-rr.md` | 신규 | — |
| 14 | 내부 리뷰 + 수정 | 검토 | 13 |

---

## 6. 테스트 계획

### 6.1 F162 Azure PoC 테스트

| # | 테스트 | 대상 | 기대 결과 |
|:-:|--------|------|-----------|
| 1 | Health check | `GET /health` | 200 OK |
| 2 | Auth 엔드포인트 | `POST /auth/login` | JWT 발급 |
| 3 | SR 분류 | `POST /sr/classify` | 분류 결과 반환 |
| 4 | SR 워크플로우 | `POST /sr/workflow` | DAG 생성 |
| 5 | 프로젝트 조회 | `GET /projects` | 프로젝트 목록 |

### 6.2 F169 데모 환경 테스트

| # | 테스트 | 기대 결과 |
|:-:|--------|-----------|
| 1 | 데모 계정 로그인 | JWT 발급 + 대시보드 렌더링 |
| 2 | SR 제출 → 분류 | 자동 분류 결과 표시 |
| 3 | 워크플로우 실행 | 에이전트 DAG 실행 + 상태 표시 |
| 4 | 외부 네트워크 접근 | 사무실 외부에서 URL 접근 가능 |

---

## 7. 산출물 목록

| # | 산출물 | 경로 | F# |
|:-:|--------|------|:--:|
| 1 | Azure Functions 어댑터 | `packages/api/src/azure.ts` | F162 |
| 2 | Azure SQL 마이그레이션 | `packages/api/src/db/azure/` | F162 |
| 3 | Azure Functions 설정 | `packages/api/azure/` | F162 |
| 4 | Azure 마이그레이션 가이드 | `docs/specs/azure-migration-guide.md` | F162 |
| 5 | 데모 시드 데이터 | `packages/api/src/db/demo-seed.sql` | F169 |
| 6 | 데모 시나리오 스크립트 | `docs/specs/demo/demo-scenario-sr.md` | F169 |
| 7 | SI R&R 정의서 | `docs/specs/si-partner-rr.md` | F163 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | 초안 작성 — PRD v8 Conditional 선결 조건 기반 | Sinclair Seo |
