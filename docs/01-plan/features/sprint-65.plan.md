---
code: FX-PLAN-065
title: "Sprint 65 — F201 BMC 블록 인사이트 + F202 시장 키워드 요약 + F207 평가관리 MVP"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 65
features: [F201, F202, F207]
req: [FX-REQ-AX-005, FX-REQ-AX-006, FX-REQ-199]
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
depends-on: Sprint 62 (F199 BMCAgent ✅), Sprint 61 (F197 BMC CRUD ✅, F198 아이디어 ✅)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | BMC 편집 시 개선 방향을 스스로 판단해야 하고, 시장 동향 파악은 별도 검색 필요. 사업 아이템 평가/Go-Kill 판단 체계 없이 구두 의사결정 |
| **Solution** | BMCAgent를 재사용해 블록별 인사이트 추천, InsightAgent로 키워드 기반 시장 요약 제공, 평가관리 프레임워크로 KPI+Go/Kill+이력 관리 |
| **Function UX Effect** | 블록 편집→5초 후 인사이트 3개 사이드패널 / 키워드 입력→비동기 시장 요약 / 사업 아이템→KPI 입력→현황판→Go/Kill 판단 |
| **Core Value** | AI 보조로 BMC 품질 향상 + 시장 데이터 기반 의사결정 + 체계적 평가로 포트폴리오 관리 가능 |

| 항목 | 값 |
|------|-----|
| Feature | F201 BMC 블록 인사이트 + F202 시장 키워드 요약 + F207 평가관리 MVP |
| Sprint | 65 |
| PRD | FX-PLAN-AX-BD-001 v1.4 (Phase 1) + FX-REQ-199 (A-to-Z 7단계 평가) |
| 선행 조건 | F199 BMCAgent ✅, F197 BMC CRUD ✅, F149 PromptGateway ✅ |
| 병렬 구성 | Track A: F201+F202 (인사이트 2건), Track B: F207 (평가관리) |
| Worker 구성 | W1: F201+F202 (Agent 도메인), W2: F207 (평가 도메인) |

---

## 1. Feature 상세

### F201 — BMC 블록 인사이트 추천 (FX-REQ-AX-005, P1)

**목표**: BMC 블록 편집 중 BMCAgent가 해당 블록의 개선 제안 3개를 사이드패널에 표시.

**트리거 조건**:
- 블록 내용 20자 이상
- 마지막 편집 후 5초 디바운스

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/bmcs/:bmcId/blocks/:blockType/insights` | 블록 인사이트 생성 (BMCAgent 활용) |

**핵심 로직**:
- `bmc-insight-service.ts`: BMCAgent의 generateDraft 대신 전용 인사이트 프롬프트 사용
- PromptGateway 경유 필수 (F149)
- Rate Limit: 분당 5회 (기존 BMCAgent와 공유)
- 응답: 개선 제안 3개 (title + description + suggestedContent)

### F202 — 시장 키워드 요약, InsightAgent (FX-REQ-AX-006, P1)

**목표**: 키워드 기반 시장 동향 요약. 비동기 Job + 결과 조회.

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/insights/market-summary` | 시장 요약 Job 생성 |
| 2 | GET | `/api/ax-bd/insights/jobs/:jobId` | Job 상태 조회 |

**핵심 로직**:
- `insight-agent-service.ts`: LLM에 시장 분석 프롬프트 + 키워드 전달
- PromptGateway 경유 필수
- Rate Limit: 분당 3회 (별도 KV 키)
- Job 상태: pending → processing → completed / failed
- D1 `ax_insight_jobs` 테이블로 Job 관리
- BMC 블록에 결과 붙여넣기 기능 (클라이언트 처리)

### F207 — 평가관리 프레임워크 MVP (FX-REQ-199, P0)

**목표**: 사업 아이템별 KPI 입력 + 현황판 + Go/Kill 판단 + 이력 관리.

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/evaluations` | 평가 항목 생성 |
| 2 | GET | `/api/ax-bd/evaluations` | 평가 목록 (필터/정렬) |
| 3 | GET | `/api/ax-bd/evaluations/:evalId` | 평가 상세 |
| 4 | PATCH | `/api/ax-bd/evaluations/:evalId` | 평가 상태 변경 (Go/Kill/Hold) |
| 5 | POST | `/api/ax-bd/evaluations/:evalId/kpis` | KPI 입력 |
| 6 | GET | `/api/ax-bd/evaluations/:evalId/kpis` | KPI 목록 |
| 7 | PATCH | `/api/ax-bd/evaluations/:evalId/kpis/:kpiId` | KPI 실적 갱신 |
| 8 | GET | `/api/ax-bd/evaluations/:evalId/history` | 평가 이력 조회 |
| 9 | GET | `/api/ax-bd/evaluations/portfolio` | 포트폴리오 현황판 |

**핵심 로직**:
- `evaluation-service.ts`: 평가 CRUD + 상태 전이 + 이력 기록
- `kpi-service.ts`: KPI CRUD + 달성률 계산
- D1 `ax_evaluations`, `ax_kpis`, `ax_evaluation_history` 테이블
- 상태 전이: Draft → Active → Go / Kill / Hold
- 이력: 상태 변경 시 자동 기록 (who/when/from/to/reason)

---

## 2. D1 마이그레이션

### 0051_ax_insight_jobs.sql
```sql
CREATE TABLE ax_insight_jobs (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  keywords    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  result      TEXT,
  error       TEXT,
  created_at  INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX idx_insight_jobs_org ON ax_insight_jobs(org_id);
CREATE INDEX idx_insight_jobs_user ON ax_insight_jobs(user_id, status);
```

### 0052_ax_evaluations.sql
```sql
CREATE TABLE ax_evaluations (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  idea_id     TEXT,
  bmc_id      TEXT,
  title       TEXT NOT NULL,
  description TEXT,
  owner_id    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK(status IN ('draft', 'active', 'go', 'kill', 'hold')),
  decision_reason TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_eval_org ON ax_evaluations(org_id);
CREATE INDEX idx_eval_status ON ax_evaluations(org_id, status);
CREATE INDEX idx_eval_idea ON ax_evaluations(idea_id);
```

### 0053_ax_kpis.sql
```sql
CREATE TABLE ax_kpis (
  id          TEXT PRIMARY KEY,
  eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK(category IN ('market', 'tech', 'revenue', 'risk', 'custom')),
  target      REAL NOT NULL,
  actual      REAL,
  unit        TEXT NOT NULL DEFAULT '%',
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_kpi_eval ON ax_kpis(eval_id);
```

### 0054_ax_evaluation_history.sql
```sql
CREATE TABLE ax_evaluation_history (
  id          TEXT PRIMARY KEY,
  eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT,
  reason      TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_eval_history ON ax_evaluation_history(eval_id);
```

---

## 3. Worker Plan

| Worker | Feature | 파일 범위 | 테스트 |
|--------|---------|-----------|--------|
| W1 | F201+F202 인사이트 | bmc-insight-service.ts, insight-agent-service.ts, ax-bd-insights.ts, schemas 2, migration 0051, tests | ~20 tests |
| W2 | F207 평가관리 | evaluation-service.ts, kpi-service.ts, ax-bd-evaluations.ts, schemas 2, migrations 0052~0054, tests | ~25 tests |

**파일 충돌 없음**: W1은 insights, W2는 evaluations — 독립 도메인.
**app.ts 라우트 등록**: 리더가 merge 후 일괄 추가.

---

## 4. 테스트 전략

- API 테스트: `ax-bd-insights.test.ts` (F201+F202), `ax-bd-evaluations.test.ts` (F207)
- F201: 인사이트 생성, 블록 타입 유효성, Rate Limit, Gateway 처리
- F202: Job 생성, 상태 조회, 결과 반환, Rate Limit (분당 3회)
- F207: 평가 CRUD, 상태 전이 (Draft→Active→Go/Kill/Hold), KPI CRUD, 달성률 계산, 이력 기록, 포트폴리오 현황판, 권한 체크

---

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| LLM 응답 불안정 (F201/F202) | 인사이트 품질 저하 | 타임아웃 15초 + 재시도 없음 (사용자 재요청) |
| InsightAgent 비동기 Job 복잡도 | 구현 시간 증가 | Job 테이블로 단순화 (SSE 제외, polling) |
| F207 상태 전이 로직 | 잘못된 전이 허용 | 서비스 레벨 유효성 검증 + 테스트 커버리지 |
