---
code: FX-PLAN-057
title: Sprint 57 — 수집 채널 통합 + 시장/트렌드 데이터 자동 연동 (F179, F190)
version: 0.1
status: Draft
category: PLAN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 57 Planning Document

> **Summary**: 사업 아이템 수집의 3채널(Agent 자동 수집 / Field-driven / IDEA Portal)을 통합 파이프라인으로 구축하고, 외부 시장·경쟁사·트렌드 데이터를 API로 자동 연동하여 발굴 분석의 기초 데이터를 자동화한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 57 (api 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-24
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업 아이템 수집이 수동 등록(Field-driven)에만 의존하고 있다. Agent 자동 수집과 IDEA Portal 연계는 스키마만 정의되어 있고 실제 파이프라인이 없어, 수집 커버리지가 낮고 담당자가 직접 뉴스/트렌드를 검색해서 입력해야 한다. 시장·트렌드 데이터도 수동 조사에 의존해 2단계 발굴의 입력 품질이 들쭉날쭉하다. |
| **Solution** | F179: 3채널 수집 파이프라인(Agent 자동 수집 + Field-driven 강화 + IDEA Portal Webhook 연동) + 수집 대시보드. F190: 외부 데이터 연동 서비스(뉴스/트렌드 API + 경쟁사 자동 탐색 + LLM 요약) + 트렌드 리포트 API. |
| **Function/UX Effect** | 담당자가 대시보드에서 3채널 수집 현황을 한눈에 보고, Agent가 자동 수집한 아이템을 Screening 큐에서 승인/반려. 시장·트렌드 데이터는 사업 아이템에 자동 첨부되어 2-2 수요시장검증, 2-3 경쟁·자사분석 진입 시 기초 데이터로 즉시 활용. |
| **Core Value** | "수집은 자동, 분석은 사람" — 수집 커버리지 3배 확대(1채널→3채널) + 트렌드 데이터 수동 조사 시간 제거로 2주/아이템 → 1주/아이템 목표 달성 기반 마련 |

---

## 1. Overview

### 1.1 Purpose

BDP-001 (AX-Discovery-Process v0.8) 1단계 수집의 3가지 채널(1-1 Agent 자동 수집, 1-2 Field-driven, 1-3 IDEA Portal)을 Foundry-X에 통합 구현하고, 2단계 발굴에 필요한 외부 시장·트렌드 데이터를 자동으로 수집·요약하여 분석 기초 데이터를 자동화한다.

### 1.2 Background

- **BDP-001 §3 1단계**: 수집 3채널 정의 — Agent 자동(🤖), Field-driven(👤), IDEA Portal(👥)
- **BDP-001 §3 2단계**: 2-2 수요시장검증, 2-3 경쟁·자사분석에서 시장 데이터가 핵심 입력
- **기존 인프라**:
  - ✅ `biz_items` 테이블 + `source` enum (`agent`, `field`, `idea_portal`) — 스키마 준비 완료
  - ✅ `BizItemService` CRUD + 분류/평가/시작점 저장
  - ✅ `ItemClassifier` + `StartingPointClassifier` — LLM 기반 분류 파이프라인
  - ✅ `AgentRunner` — LLM 호출 래퍼
  - ✅ `biz-items` 라우트 (9개 엔드포인트)
- **빠진 부분**:
  - ❌ Agent 자동 수집 로직 (외부 소스 크롤링 → biz_items 자동 등록)
  - ❌ IDEA Portal Webhook 수신 엔드포인트
  - ❌ 수집 채널별 통계 API + 대시보드
  - ❌ 외부 시장·트렌드 데이터 연동 서비스
  - ❌ 트렌드 요약 API + UI

### 1.3 Related Documents

- SPEC.md §5: F179 (FX-REQ-179, P1), F190 (FX-REQ-190, P2)
- [[FX-SPEC-BDP-001]]: `docs/specs/bizdevprocess/AX-Discovery-Process-v0.8-summary.md` §3 1단계+2단계
- Sprint 52 Plan: `docs/01-plan/features/sprint-52.plan.md` (F182 시작점 분류)
- Sprint 51: biz_items 인프라 구축 (F175, F178)

---

## 2. Scope

### 2.1 In Scope

#### F179: 수집 채널 통합 (P1)

| # | 항목 | 설명 |
|---|------|------|
| 1 | **CollectionPipelineService** | 3채널 수집 오케스트레이터. 채널별 수집 → 정규화 → biz_items 저장 → Screening 큐 등록 |
| 2 | **AgentCollector** | LLM 기반 자동 수집기. 뉴스/기술블로그/리서치 키워드로 사업 아이템 후보를 자동 탐색·등록 (`source='agent'`) |
| 3 | **IDEA Portal Webhook** | `POST /webhooks/idea-portal` — 전사 IDEA Portal로부터 아이디어 수신 (`source='idea_portal'`) |
| 4 | **Screening 큐 API** | 자동 수집된 아이템의 승인/반려 워크플로우. `status: 'pending_review'` → `'draft'` or `'rejected'` |
| 5 | **수집 통계 API** | `GET /collection/stats` — 채널별 수집 건수, 기간별 추이, 승인율 |
| 6 | **수집 대시보드 UI** | 채널별 파이프 차트 + Screening 큐 테이블 + 통계 카드 |
| 7 | **D1 스키마 확장** | `collection_jobs` 테이블 (수집 작업 이력), `biz_items.status` enum 확장 (`pending_review`) |

#### F190: 시장/트렌드 데이터 자동 연동 (P2)

| # | 항목 | 설명 |
|---|------|------|
| 8 | **TrendDataService** | 외부 시장·트렌드 데이터 수집 + LLM 요약. 키워드 기반 뉴스/트렌드 검색 → 구조화된 인사이트 반환 |
| 9 | **CompetitorScanner** | 경쟁사·유사 서비스 자동 탐색. 사업 아이템 제목/설명에서 키워드 추출 → 관련 기업/제품 매핑 |
| 10 | **트렌드 리포트 API** | `POST /biz-items/:id/trend-report` (트렌드 분석 실행), `GET /biz-items/:id/trend-report` (결과 조회) |
| 11 | **D1 스키마 확장** | `biz_item_trend_reports` 테이블 (트렌드 분석 결과 저장) |
| 12 | **트렌드 요약 UI** | 사업 아이템 상세 페이지에 트렌드 카드 (시장규모, 경쟁사, 핵심 트렌드) |

### 2.2 Out of Scope

| 항목 | 이유 |
|------|------|
| IDEA Portal 실제 시스템 구축 | 전사 플랫폼 — Webhook 수신만 구현 |
| 유료 데이터 API 연동 (Gartner, CB Insights 등) | MVP 단계에서는 무료/공개 소스 활용 |
| Agent 자동 수집의 스케줄링 (Cron) | 기존 Cron Trigger(6시간)에 추가하는 것은 Sprint 58+ |
| 실시간 뉴스 스트리밍 | 배치 수집 방식으로 충분 |

---

## 3. Technical Approach

### 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Collection Pipeline                         │
│                                                                 │
│  ┌──────────┐   ┌──────────────┐   ┌───────────────┐          │
│  │ Agent    │   │ Field-driven │   │ IDEA Portal   │          │
│  │ Collector│   │ (기존 POST)  │   │ Webhook       │          │
│  │ (LLM)   │   │              │   │               │          │
│  └────┬─────┘   └──────┬───────┘   └──────┬────────┘          │
│       │                │                   │                    │
│       ▼                ▼                   ▼                    │
│  ┌─────────────────────────────────────────────┐               │
│  │         CollectionPipelineService            │               │
│  │   normalize → deduplicate → save → queue     │               │
│  └──────────────────────┬──────────────────────┘               │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │              biz_items (D1)                  │               │
│  │  source: agent|field|idea_portal             │               │
│  │  status: pending_review|draft|...            │               │
│  └──────────────────────┬──────────────────────┘               │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────┐               │
│  │          Screening Queue (담당자 검토)        │               │
│  │  approve → draft   /   reject → rejected     │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Trend Data Pipeline                           │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐                           │
│  │ TrendData    │   │ Competitor   │                           │
│  │ Service      │   │ Scanner      │                           │
│  │ (News/Trend) │   │ (LLM)       │                           │
│  └──────┬───────┘   └──────┬───────┘                           │
│         │                  │                                    │
│         ▼                  ▼                                    │
│  ┌─────────────────────────────────────────────┐               │
│  │       biz_item_trend_reports (D1)            │               │
│  │  market_size, competitors, trends, summary   │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Implementation Strategy

**Phase A: F179 수집 채널 통합 (우선)**
1. D1 마이그레이션 — `collection_jobs`, `biz_items.status` 확장
2. `CollectionPipelineService` — 채널 정규화 + 중복 제거
3. `AgentCollector` — LLM 기반 자동 수집 (AgentRunner 활용)
4. IDEA Portal Webhook 엔드포인트
5. Screening 큐 API (approve/reject)
6. 수집 통계 API
7. 수집 대시보드 UI

**Phase B: F190 트렌드 데이터 연동**
8. `TrendDataService` — 키워드 → 트렌드 검색 + LLM 요약
9. `CompetitorScanner` — 경쟁사 자동 탐색
10. 트렌드 리포트 API (생성 + 조회)
11. D1 마이그레이션 — `biz_item_trend_reports`
12. 트렌드 요약 UI

### 3.3 Key Design Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| Agent 수집 방식 | On-demand (API 호출) | Cron은 Sprint 58+로 이관. MVP에서는 수동 트리거로 충분 |
| 외부 데이터 소스 | LLM 내장 지식 + 웹 검색 시뮬레이션 | Workers 환경에서 외부 크롤링 제한 → LLM의 학습 데이터 + 프롬프트 기반 생성 |
| 중복 제거 | 제목 유사도 (LLM 판단) | 정확한 중복 = 동일 제목, 유사 중복 = LLM semantic 비교 |
| Webhook 인증 | HMAC-SHA256 시그니처 | 기존 `webhook-registry` 인프라 활용 |
| 트렌드 데이터 캐싱 | 24시간 TTL | 트렌드 데이터는 빠르게 변하지만 분석 단위에서는 일 단위 갱신 충분 |

---

## 4. Data Model

### 4.1 새 테이블

#### collection_jobs (수집 작업 이력)

```sql
CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('agent', 'field', 'idea_portal')),
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  keywords TEXT,               -- JSON array: 수집 키워드
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX idx_collection_jobs_org ON collection_jobs(org_id);
CREATE INDEX idx_collection_jobs_channel ON collection_jobs(channel);
```

#### biz_item_trend_reports (트렌드 분석 결과)

```sql
CREATE TABLE IF NOT EXISTS biz_item_trend_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  market_summary TEXT,          -- LLM 생성 시장 요약
  market_size_estimate TEXT,    -- JSON: { tam, sam, som, currency, year }
  competitors TEXT,             -- JSON array: [{ name, description, url, relevance }]
  trends TEXT,                  -- JSON array: [{ title, description, impact, source }]
  keywords_used TEXT,           -- JSON array: 검색에 사용된 키워드
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,              -- 캐시 만료 시간
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_trend_reports_biz_item ON biz_item_trend_reports(biz_item_id);
```

### 4.2 기존 테이블 변경

```sql
-- biz_items.status enum 확장: 'pending_review' 추가
-- (D1은 CHECK 제약 없으므로 애플리케이션 레벨에서 관리)
```

스키마(`biz-item.ts`) `bizItemStatus` enum에 `'pending_review'`, `'rejected'` 추가.

---

## 5. API Design

### 5.1 F179 — 수집 채널 통합

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | `POST` | `/collection/agent-collect` | Agent 자동 수집 실행 (키워드 기반) |
| 2 | `GET` | `/collection/jobs` | 수집 작업 이력 조회 |
| 3 | `GET` | `/collection/stats` | 채널별 수집 통계 |
| 4 | `GET` | `/collection/screening-queue` | 검토 대기 아이템 목록 (`status=pending_review`) |
| 5 | `POST` | `/collection/screening-queue/:id/approve` | 아이템 승인 → `draft` |
| 6 | `POST` | `/collection/screening-queue/:id/reject` | 아이템 반려 → `rejected` |
| 7 | `POST` | `/webhooks/idea-portal` | IDEA Portal Webhook 수신 |

### 5.2 F190 — 트렌드 데이터 연동

| # | Method | Path | 설명 |
|---|--------|------|------|
| 8 | `POST` | `/biz-items/:id/trend-report` | 트렌드 분석 실행 (LLM 기반) |
| 9 | `GET` | `/biz-items/:id/trend-report` | 트렌드 분석 결과 조회 |
| 10 | `POST` | `/biz-items/:id/competitor-scan` | 경쟁사 스캔 실행 |

---

## 6. UI Components

### 6.1 수집 대시보드 (`/app/(app)/discovery/collection`)

| 컴포넌트 | 설명 |
|---------|------|
| **ChannelOverview** | 3채널 파이프라인 카드 (Agent/Field/IDEA Portal) — 건수 + 최근 수집일 |
| **ScreeningQueue** | 검토 대기 아이템 테이블 — 제목, 소스, 등록일, 승인/반려 버튼 |
| **CollectionStats** | 기간별 수집 추이 차트 + 채널별 비율 도넛 차트 |
| **AgentCollectDialog** | Agent 수집 실행 다이얼로그 — 키워드 입력 + 수집 시작 |

### 6.2 트렌드 요약 (사업 아이템 상세 페이지 확장)

| 컴포넌트 | 설명 |
|---------|------|
| **TrendReportCard** | 시장 요약 + TAM/SAM/SOM 수치 + 핵심 트렌드 목록 |
| **CompetitorTable** | 경쟁사/유사 서비스 테이블 — 이름, 설명, 관련도 |
| **TrendAnalyzeButton** | "트렌드 분석 실행" 버튼 (LLM 호출, 로딩 상태) |

---

## 7. Testing Strategy

| 영역 | 접근 | 예상 테스트 수 |
|------|------|--------------|
| **CollectionPipelineService** | 단위 테스트 — 정규화, 중복 제거, 상태 전이 | ~15 |
| **AgentCollector** | LLM mock — 프롬프트 구성, JSON 파싱 | ~8 |
| **IDEA Portal Webhook** | 라우트 테스트 — HMAC 검증, 페이로드 파싱 | ~6 |
| **Screening 큐 API** | 라우트 테스트 — approve/reject 워크플로우 | ~8 |
| **수집 통계 API** | 라우트 테스트 — 기간 필터, 채널 필터 | ~5 |
| **TrendDataService** | LLM mock — 키워드 추출, 요약 생성 | ~8 |
| **CompetitorScanner** | LLM mock — 경쟁사 매핑 | ~5 |
| **트렌드 리포트 API** | 라우트 테스트 — 생성/조회, 캐시 TTL | ~8 |
| **Web 컴포넌트** | 렌더링 테스트 — 6개 컴포넌트 | ~12 |
| **합계** | | **~75** |

---

## 8. Risk & Mitigation

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Workers에서 외부 URL fetch 제한 | Agent 수집 품질 저하 | LLM 학습 데이터 기반 생성 + 향후 외부 API 연동 |
| LLM 환각으로 가짜 사업 아이템 생성 | Screening 부담 증가 | 자동 수집 아이템은 반드시 `pending_review` 상태로 진입, 담당자 검토 필수 |
| IDEA Portal Webhook 스펙 미확정 | 연동 지연 | 범용 JSON 페이로드 수신 + 매핑 로직 분리 (어댑터 패턴) |
| 트렌드 데이터 시의성 | 오래된 데이터로 분석 | 24시간 TTL + 수동 갱신 버튼 |

---

## 9. Implementation Order

### 9.1 Phase A: F179 수집 채널 통합

```
1. D1 migration 0038: collection_jobs + biz_items status 확장
2. CollectionPipelineService (normalize + deduplicate)
3. AgentCollector (LLM 기반 자동 수집)
4. collection 라우트 (agent-collect, jobs, stats)
5. IDEA Portal Webhook 엔드포인트
6. Screening 큐 API (approve/reject)
7. Web: ChannelOverview + ScreeningQueue + AgentCollectDialog
8. Web: CollectionStats
9. 테스트 (API ~42 + Web ~6)
```

### 9.2 Phase B: F190 트렌드 데이터 연동

```
10. D1 migration 0039: biz_item_trend_reports
11. TrendDataService (키워드 추출 + LLM 요약)
12. CompetitorScanner (경쟁사 탐색)
13. 트렌드 리포트 API (biz-items 라우트 확장)
14. Web: TrendReportCard + CompetitorTable + TrendAnalyzeButton
15. 테스트 (API ~21 + Web ~6)
```

---

## 10. Success Criteria

| 지표 | 목표 |
|------|------|
| Agent 수집 → 아이템 등록 성공률 | ≥ 80% (JSON 파싱 성공 기준) |
| Screening 큐 → 승인 응답 시간 | < 1일 (UX 목표) |
| IDEA Portal Webhook 수신 → 등록 지연 | < 5초 |
| 트렌드 분석 응답 시간 | < 30초 (LLM 호출 포함) |
| 전체 테스트 통과 | ≥ 75 tests, 100% pass |
| Match Rate (Gap Analysis) | ≥ 90% |

---

## 11. Dependencies

| 의존성 | 상태 | 비고 |
|--------|------|------|
| biz_items 테이블 (0033) | ✅ 완료 | Sprint 51 |
| biz_item_classifications (0033) | ✅ 완료 | Sprint 51 |
| BizItemService CRUD | ✅ 완료 | Sprint 51 |
| AgentRunner (LLM 호출) | ✅ 완료 | Sprint 51 |
| biz-items 라우트 | ✅ 완료 | Sprint 51 (9 endpoints) |
| webhook-registry 라우트 | ✅ 완료 | Sprint 39 |
| F183~F185 (Discovery 9기준 + pm-skills) | ⚠️ Sprint 53 미머지 | 독립 구현 가능, 머지 후 연동 |
