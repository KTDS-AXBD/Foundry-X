---
code: FX-PLAN-115
title: Sprint 115 — Discovery-X Agent 자동 수집 (F291)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 115
f-items: F291
phase: "Phase 11-B"
---

# Sprint 115 — Discovery-X Agent 자동 수집 (F291)

> **Summary**: 1단계 수집에 시장/뉴스/기술 트렌드 자동 수집 Agent를 추가. 기존 F179 수집 채널 통합(agent-collector)을 확장하여 주기적 수집 + 결과 목록 UI 구현.
>
> **Project**: Foundry-X  |  **Sprint**: 115  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 수집은 사용자가 키워드를 입력해야 시작됨. 시장/기술 트렌드를 놓칠 수 있고, 수동 수집에 의존 |
| **Solution** | Discovery-X Agent가 주기적(6h cron 또는 수동 트리거)으로 시장/뉴스/기술 트렌드를 자동 수집하여 1단계 수집 파이프라인에 투입 |
| **Function/UX Effect** | `/collection/agent` 페이지에서 Agent 수집 이력 조회 + 수동 트리거. 새 트렌드 알림 뱃지 |
| **Core Value** | 사업개발 팀이 시장 변화를 놓치지 않고 선제적으로 포착 — "알아서 모아주는 트렌드 레이더" |

---

## 1. Overview

### 1.1 Purpose

SPEC F291(FX-REQ-283, P2) — F179(수집 채널 통합) 기반으로 Discovery-X Agent 자동 수집 기능 추가.
기존 `agent-collector.ts` (106줄)와 `collection-pipeline.ts` (323줄)을 확장.

### 1.2 Related Documents

- SPEC: [[FX-SPEC-001]] §5 Phase 11-B — F291
- 선행: F179 (Sprint 57, 수집 채널 통합) ✅
- API: `packages/api/src/routes/collection.ts` (7 endpoints)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F291-1**: Agent 자동 수집 스케줄 설정 API — POST /collection/agent-schedule (sources, interval, keywords)
- [ ] **F291-2**: Agent 수집 이력 조회 API — GET /collection/agent-runs (pagination, status filter)
- [ ] **F291-3**: 수동 트리거 API — POST /collection/agent-trigger (즉시 수집 실행)
- [ ] **F291-4**: agent-collector 확장 — 시장(market), 뉴스(news), 기술(tech) 3개 소스 타입 지원
- [ ] **F291-5**: D1 마이그레이션 — agent_collection_runs, agent_collection_schedules 테이블
- [ ] **F291-6**: Web `/collection/agent` 페이지 — 수집 이력 목록 + 수동 트리거 버튼
- [ ] **F291-7**: sidebar 1단계 수집에 "Agent 수집" 메뉴 추가
- [ ] **F291-8**: 테스트 — API + Web 추가분

### 2.2 Out of Scope

- 실제 외부 API 연동 (뉴스 API, 트렌드 API) → 목 데이터 + 인터페이스만 정의
- Cron Trigger 자동 실행 → 기존 6h cron에 연결은 별도 Sprint
- 수집 결과 자동 분류/태깅 → Phase 11-B 이후

---

## 3. Requirements

### 3.1 API Endpoints (신규 3건 + 기존 확장 1건)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/collection/agent-schedule` | 자동 수집 스케줄 설정 |
| GET | `/collection/agent-runs` | 수집 실행 이력 조회 |
| POST | `/collection/agent-trigger` | 즉시 수집 실행 |
| PATCH | `/collection/agent-collect` (기존) | sources 파라미터에 market/news/tech 추가 |

### 3.2 D1 Migration (0085)

```sql
CREATE TABLE IF NOT EXISTS agent_collection_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '["market","news","tech"]',
  keywords TEXT NOT NULL DEFAULT '[]',
  interval_hours INTEGER NOT NULL DEFAULT 6,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS agent_collection_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  schedule_id TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  items_found INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

---

## 4. Architecture

### 4.1 변경 대상 파일

```
packages/api/src/
├── routes/collection.ts              ← 3 endpoint 추가
├── services/agent-collector.ts       ← sources 타입 확장
├── services/collection-pipeline.ts   ← runs 이력 저장 로직
├── schemas/collection.ts             ← 새 스키마 추가
└── db/migrations/0085_agent_collection.sql  ← D1 신규

packages/web/src/
├── routes/collection-agent.tsx       ← 신규 페이지
├── components/sidebar.tsx            ← /collection/agent 메뉴 추가
└── router.tsx                        ← collection/agent 라우트 등록
```

### 4.2 Implementation Order

1. D1 마이그레이션 작성
2. API 스키마 + 서비스 확장
3. API 라우트 3건 추가
4. API 테스트
5. Web 페이지 + 라우터 + 사이드바
6. Web 테스트
7. typecheck + lint + build

---

## 5. Success Criteria

- [ ] API 3 endpoints 동작 + 테스트 통과
- [ ] D1 0085 마이그레이션 적용
- [ ] Web `/collection/agent` 페이지 렌더링
- [ ] 기존 테스트 전체 통과
- [ ] typecheck + lint + build 성공

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F291 Discovery-X Agent 자동 수집 | Sinclair Seo |
