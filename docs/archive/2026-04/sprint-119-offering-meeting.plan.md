---
code: FX-PLAN-119
title: Sprint 119 — 초도 미팅용 Offering (F293)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 119
f-items: F293
phase: "Phase 11-B"
---

# Sprint 119 — 초도 미팅용 Offering (F293)

> **Summary**: 3단계 형상화에 고객 미팅용 자료(Offering Brief)를 자동 생성하는 페이지 추가.
>
> **Project**: Foundry-X  |  **Sprint**: 119  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 고객 초도 미팅 시 Offering Pack 전체를 보여주기엔 분량이 많고, 미팅용 요약 자료를 수동 작성 |
| **Solution** | Offering Pack에서 핵심 정보를 추출하여 1~2페이지 Offering Brief를 AI 자동 생성 |
| **Function/UX Effect** | `/shaping/offering/:id/brief` 에서 미팅 브리프 생성 + 프린트 최적화 레이아웃 |
| **Core Value** | 미팅 준비 시간 대폭 절감 — "Offering Pack이 있으면 미팅 자료는 자동" |

---

## 1. Scope

### 1.1 In Scope

- [ ] API — POST /offering-packs/:id/brief (AI 브리프 생성)
- [ ] API — GET /offering-packs/:id/brief (브리프 조회)
- [ ] API — GET /offering-packs/:id/briefs (브리프 목록)
- [ ] D1 — offering_briefs 테이블
- [ ] Web `/shaping/offering/:id/brief` 페이지 — 브리프 생성 + 뷰 + 프린트
- [ ] offering-pack-detail 페이지에 "미팅 브리프 생성" 버튼 추가

### 1.2 Out of Scope

- PDF 내보내기 → 프린트 CSS로 대체
- 슬라이드(PPT) 형태 생성 → 향후

---

## 2. Architecture

### 2.1 변경 대상 파일

```
packages/api/src/
├── routes/offering-packs.ts       ← 3 endpoint 추가
├── services/offering-brief-service.ts  ← 신규
├── schemas/offering-brief.schema.ts    ← 신규
└── db/migrations/0089_offering_briefs.sql

packages/web/src/
├── routes/offering-brief.tsx      ← 신규 페이지
├── routes/offering-pack-detail.tsx ← "브리프 생성" 버튼 추가
└── router.tsx                     ← shaping/offering/:id/brief 등록
```

### 2.2 Implementation Order

1. D1 마이그레이션 (0089)
2. offering-brief-service 구현
3. API 3 endpoints
4. API 테스트
5. Web 브리프 페이지 + offering-pack-detail 버튼
6. Web 테스트 + typecheck + build

---

## 3. D1 Migration (0089)

```sql
CREATE TABLE IF NOT EXISTS offering_briefs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  offering_pack_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  target_audience TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'initial',
  generated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```

---

## 4. Success Criteria

- [ ] 브리프 생성 + 조회 API 동작
- [ ] Web 브리프 페이지 렌더링 + 프린트 레이아웃
- [ ] 기존 테스트 전체 통과 + typecheck + build

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial draft — F293 Offering Brief | Sinclair Seo |
