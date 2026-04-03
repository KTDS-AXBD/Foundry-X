---
code: FX-PLAN-117
title: Sprint 117 — 통합 평가 결과서 (F296)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 117
f-items: F296
phase: "Phase 11-B"
---

# Sprint 117 — 통합 평가 결과서 (F296)

> **Summary**: 2단계 발굴 스킬 결과(2-1~2-8)를 종합하여 통합 평가 결과서를 자동 생성. F261 산출물 시스템과 연동.
>
> **Project**: Foundry-X  |  **Sprint**: 117  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 2단계 발굴에서 2-1~2-8 스킬이 각각 산출물을 생성하지만, 종합 평가 보고서가 없어 의사결정자가 개별 문서를 일일이 확인해야 함 |
| **Solution** | /discovery/report 페이지에서 biz-item별 발굴 결과를 종합한 통합 평가 결과서 자동 생성 (AI 요약 + 스킬별 점수 + 신호등 이력) |
| **Function/UX Effect** | 원클릭으로 평가 결과서 생성 → PDF/HTML 뷰 → 공유 링크. 의사결정자가 1페이지 요약으로 Go/Hold/Drop 판단 |
| **Core Value** | "8개 스킬 결과가 한 장의 결과서로" — 의사결정 속도와 품질 동시 향상 |

---

## 1. Overview

### 1.1 Purpose

SPEC F296(FX-REQ-288, P2) — 발굴 스킬 결과를 종합한 평가 결과서 자동 생성.
F261(산출물 저장 + 버전 관리, Sprint 90)을 기반으로 산출물 데이터를 읽어 요약.

### 1.2 Related Documents

- SPEC: [[FX-SPEC-001]] §5 Phase 11-B — F296
- 선행: F261 (Sprint 90, 산출물 저장 + 버전 관리) ✅
- API: `packages/api/src/routes/ax-bd-discovery.ts`, `discovery-stage-service.ts`
- AX Discovery Process v8.2: 2-1~2-8 스킬 단계

---

## 2. Scope

### 2.1 In Scope

- [ ] **F296-1**: API — POST /discovery/report/generate (biz_item_id → AI 종합 평가서 생성)
- [ ] **F296-2**: API — GET /discovery/report/:id (결과서 조회)
- [ ] **F296-3**: API — GET /discovery/report/list (biz_item별 결과서 목록)
- [ ] **F296-4**: 결과서 생성 서비스 — F261 산출물 조회 → 스킬별 요약 취합 → AI 종합 평가 + 신호등 집계
- [ ] **F296-5**: D1 migration — evaluation_reports 테이블
- [ ] **F296-6**: Web `/discovery/report` 페이지 — 결과서 목록 + 생성 버튼 + 상세 뷰
- [ ] **F296-7**: sidebar 2단계 발굴에 "평가 결과서" 메뉴 추가
- [ ] **F296-8**: 테스트 — API + Web 추가분

### 2.2 Out of Scope

- PDF 내보내기 → HTML 뷰 우선, PDF는 향후
- 결과서 기반 자동 Go/Hold/Drop 추천 → AI 추천은 이 Sprint에서 점수 표시만
- 결과서 버전 관리 → F261 산출물 버전 관리 재활용

---

## 3. D1 Migration (0087)

```sql
CREATE TABLE IF NOT EXISTS evaluation_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  skill_scores TEXT NOT NULL DEFAULT '{}',
  traffic_light TEXT NOT NULL DEFAULT 'yellow',
  recommendation TEXT,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

---

## 4. Architecture

### 4.1 변경 대상 파일

```
packages/api/src/
├── routes/evaluation-report.ts        ← 신규 (3 endpoints)
├── services/evaluation-report-service.ts ← 신규 (생성 + 조회)
├── schemas/evaluation-report.schema.ts  ← 신규
└── db/migrations/0087_evaluation_reports.sql  ← D1 신규

packages/web/src/
├── routes/discovery-report.tsx        ← 신규 페이지
├── components/sidebar.tsx             ← /discovery/report 메뉴 추가
└── router.tsx                         ← discovery/report 라우트 등록
```

### 4.2 Implementation Order

1. D1 마이그레이션 작성
2. API 스키마 정의
3. evaluation-report-service 구현
4. API 라우트 3건
5. API 테스트
6. Web 페이지 + 라우터 + 사이드바
7. Web 테스트
8. typecheck + lint + build

---

## 5. Success Criteria

- [ ] 결과서 생성 API 동작 (산출물 취합 + AI 요약)
- [ ] D1 0087 마이그레이션 적용
- [ ] Web `/discovery/report` 페이지 렌더링
- [ ] 기존 테스트 전체 통과
- [ ] typecheck + lint + build 성공

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F296 통합 평가 결과서 | Sinclair Seo |
