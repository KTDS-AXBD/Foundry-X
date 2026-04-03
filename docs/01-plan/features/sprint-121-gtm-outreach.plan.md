---
code: FX-PLAN-121
title: Sprint 121 — 대고객 선제안 GTM (F299)
version: 1.0
status: Draft
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 121
f-items: F299
phase: "Phase 11-C"
---

# Sprint 121 — 대고객 선제안 GTM (F299)

> **Summary**: GTM 6단계에 고객 선제안 워크플로를 추가. 대상 고객 프로필 관리 + Offering Pack 기반 맞춤 제안서 자동 생성 + 아웃리치 상태 추적.
>
> **Project**: Foundry-X  |  **Sprint**: 121  |  **Author**: Sinclair Seo  |  **Date**: 2026-04-03

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Offering Pack과 Brief는 있지만 "어떤 고객에게 제안할지" 관리 체계가 없음. 고객별 맞춤 제안서를 수동 작성하고, 발송/후속 추적이 불가 |
| **Solution** | GTM 아웃리치 워크플로: 고객 프로필 등록 → Offering Pack 기반 맞춤 제안서 자동 생성 → 발송/응답 상태 추적 |
| **Function/UX Effect** | `/gtm/outreach` 고객 목록 + `/gtm/outreach/:id` 상세(제안서 생성/추적). 사이드바 GTM에 "선제안" 메뉴 추가 |
| **Core Value** | "Offering이 있으면 고객 맞춤 제안서는 자동" — 선제안 → 미팅 전환율 추적까지 일원화 |

---

## 1. Scope

### 1.1 In Scope

- [ ] D1 — `gtm_customers` + `gtm_outreach` 테이블 (0088 마이그레이션)
- [ ] Shared — `GtmCustomer`, `GtmOutreach`, `OutreachStatus` 타입 추가
- [ ] API — CRUD `/gtm/customers` (4 endpoints: list, create, get, update)
- [ ] API — CRUD `/gtm/outreach` (5 endpoints: list, create, get, update-status, delete)
- [ ] API — POST `/gtm/outreach/:id/generate` (Offering Pack 기반 맞춤 제안서 생성)
- [ ] API — GET `/gtm/outreach/stats` (아웃리치 통계)
- [ ] Web `/gtm/outreach` 페이지 — 아웃리치 목록 + 필터 + 통계 카드
- [ ] Web `/gtm/outreach/:id` 페이지 — 고객 상세 + 제안서 생성/미리보기 + 상태 변경
- [ ] Sidebar GTM 그룹에 "선제안" 메뉴 추가
- [ ] 테스트 — API ~30 tests + Web ~10 tests

### 1.2 Out of Scope

- 이메일/슬랙 발송 자동화 → 향후 (외부 서비스 연동 필요)
- 캠페인 관리 (대량 발송, A/B 테스트) → 향후
- CRM 연동 (Salesforce, HubSpot) → 향후
- 고객 자동 추천/스코어링 → AI 고도화 별도 Sprint

---

## 2. Architecture

### 2.1 변경 대상 파일

```
packages/shared/src/
└── types.ts                       ← GtmCustomer, GtmOutreach, OutreachStatus 타입

packages/api/src/
├── db/migrations/0088_gtm_outreach.sql   ← 신규 D1 마이그레이션
├── routes/gtm-customers.ts               ← 신규 (4 endpoints)
├── routes/gtm-outreach.ts                ← 신규 (6 endpoints)
├── services/gtm-customer-service.ts      ← 신규
├── services/gtm-outreach-service.ts      ← 신규
├── services/outreach-proposal-service.ts ← 신규 (맞춤 제안서 생성)
├── schemas/gtm-customer.schema.ts        ← 신규 Zod
├── schemas/gtm-outreach.schema.ts        ← 신규 Zod
└── index.ts                              ← 라우트 등록

packages/web/src/
├── routes/gtm-outreach.tsx               ← 신규 페이지 (목록)
├── routes/gtm-outreach-detail.tsx        ← 신규 페이지 (상세)
├── components/sidebar.tsx                ← GTM 그룹에 "선제안" 추가
├── lib/api-client.ts                     ← GTM API 함수 추가
└── router.tsx                            ← 라우트 등록
```

### 2.2 Implementation Order

1. D1 마이그레이션 (0088) — gtm_customers + gtm_outreach 테이블
2. Shared 타입 추가
3. Zod 스키마 2개
4. gtm-customer-service + gtm-outreach-service + outreach-proposal-service
5. API 라우트 2개 (10 endpoints)
6. API 테스트 (~30)
7. Web 페이지 2개 + 라우터 + 사이드바 + api-client
8. Web 테스트 (~10) + typecheck + build

---

## 3. D1 Migration (0088)

### gtm_customers

```sql
CREATE TABLE IF NOT EXISTS gtm_customers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_role TEXT,
  company_size TEXT CHECK(company_size IN ('startup', 'smb', 'mid', 'enterprise')),
  notes TEXT,
  tags TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gtm_customers_org ON gtm_customers(org_id);
CREATE INDEX idx_gtm_customers_industry ON gtm_customers(org_id, industry);
```

### gtm_outreach

```sql
CREATE TABLE IF NOT EXISTS gtm_outreach (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES gtm_customers(id),
  offering_pack_id TEXT REFERENCES offering_packs(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'proposal_ready', 'sent', 'opened', 'responded', 'meeting_set', 'converted', 'declined', 'archived')),
  proposal_content TEXT,
  proposal_generated_at TEXT,
  sent_at TEXT,
  response_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_gtm_outreach_org ON gtm_outreach(org_id);
CREATE INDEX idx_gtm_outreach_customer ON gtm_outreach(customer_id);
CREATE INDEX idx_gtm_outreach_status ON gtm_outreach(org_id, status);
```

---

## 4. Shared Types

```typescript
// packages/shared/src/types.ts에 추가

export type CompanySize = "startup" | "smb" | "mid" | "enterprise";

export type OutreachStatus =
  | "draft"           // 초안 — 고객+Offering 선택만
  | "proposal_ready"  // 제안서 생성 완료
  | "sent"            // 고객에게 발송
  | "opened"          // 고객이 열람
  | "responded"       // 고객 회신
  | "meeting_set"     // 미팅 확정
  | "converted"       // 계약/진행 전환
  | "declined"        // 거절
  | "archived";       // 보관

export interface GtmCustomer {
  id: string;
  orgId: string;
  companyName: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactRole: string | null;
  companySize: CompanySize | null;
  notes: string | null;
  tags: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GtmOutreach {
  id: string;
  orgId: string;
  customerId: string;
  offeringPackId: string | null;
  title: string;
  status: OutreachStatus;
  proposalContent: string | null;
  proposalGeneratedAt: string | null;
  sentAt: string | null;
  responseNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional)
  customerName?: string;
  offeringPackTitle?: string;
}
```

---

## 5. API Endpoints

### 5.1 GTM Customers (`/api/gtm/customers`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/gtm/customers` | 고객 목록 (org_id 필터, 검색, 페이지네이션) |
| POST | `/gtm/customers` | 고객 등록 |
| GET | `/gtm/customers/:id` | 고객 상세 |
| PATCH | `/gtm/customers/:id` | 고객 수정 |

### 5.2 GTM Outreach (`/api/gtm/outreach`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/gtm/outreach` | 아웃리치 목록 (status 필터, 페이지네이션) |
| POST | `/gtm/outreach` | 아웃리치 생성 (고객 + Offering Pack 선택) |
| GET | `/gtm/outreach/:id` | 아웃리치 상세 (고객 정보 join) |
| PATCH | `/gtm/outreach/:id/status` | 상태 변경 + 메모 |
| DELETE | `/gtm/outreach/:id` | 아웃리치 삭제 (draft만) |
| POST | `/gtm/outreach/:id/generate` | 맞춤 제안서 생성 (Offering Pack + 고객 정보 → LLM) |
| GET | `/gtm/outreach/stats` | 파이프라인 통계 (상태별 건수 + 전환율) |

**총 11 endpoints**

---

## 6. 핵심 서비스 설계

### 6.1 OutreachProposalService

기존 `ProposalGenerator`(BDP→요약)와 `OfferingBriefService`(미팅 브리프)를 조합하여, **고객 맞춤 제안서**를 생성하는 서비스.

**입력**: Offering Pack 산출물 + 고객 프로필 (industry, companySize, contactRole)
**출력**: 맞춤 제안서 Markdown (고객 이름/업종 맞춤 어투, 핵심 가치 제안 강조)

```
generateProposal(offeringPackId, customerId, orgId)
  → OfferingPack 조회 (items 포함)
  → GtmCustomer 조회
  → 고객 특성 기반 프롬프트 구성
  → AI (Workers AI) 또는 extractive fallback
  → proposal_content에 저장 + status → 'proposal_ready'
```

### 6.2 상태 전이 규칙

```
draft → proposal_ready  (제안서 생성 시 자동)
proposal_ready → sent    (수동: 발송 표시)
sent → opened            (수동: 열람 확인)
sent → responded         (수동: 회신 수신)
opened → responded       (수동: 회신 수신)
responded → meeting_set  (수동: 미팅 일정 확정)
meeting_set → converted  (수동: 전환 성공)
* → declined             (수동: 어느 단계에서든 거절)
* → archived             (수동: 보관)
```

---

## 7. Web 페이지

### 7.1 `/gtm/outreach` — 아웃리치 목록

- 상단: 파이프라인 통계 카드 (Draft N / Sent N / Responded N / Converted N)
- 필터: 상태별, 검색(고객명/제목)
- 테이블: 제목, 고객사, 상태 배지, 생성일, 최종 변경일
- "+새 선제안" 버튼 → 모달(고객 선택 + Offering Pack 선택 + 제목)

### 7.2 `/gtm/outreach/:id` — 아웃리치 상세

- 좌측: 고객 정보 카드 (companyName, industry, contact, size)
- 중앙: 제안서 미리보기 (Markdown 렌더링) + "제안서 생성" 버튼
- 우측: 상태 타임라인 (상태 변경 이력)
- 하단: 메모/노트 입력 + 상태 변경 드롭다운

---

## 8. 테스트 계획

| 영역 | 파일 | 건수 |
|------|------|------|
| gtm-customer-service | `__tests__/services/gtm-customer-service.test.ts` | ~8 |
| gtm-outreach-service | `__tests__/services/gtm-outreach-service.test.ts` | ~10 |
| outreach-proposal-service | `__tests__/services/outreach-proposal-service.test.ts` | ~5 |
| gtm-customers route | `__tests__/routes/gtm-customers.test.ts` | ~6 |
| gtm-outreach route | `__tests__/routes/gtm-outreach.test.ts` | ~10 |
| Web | `__tests__/routes/gtm-outreach.test.tsx` | ~8 |
| **합계** | | **~47** |

---

## 9. 예상 산출물 요약

| 항목 | 수량 |
|------|------|
| D1 마이그레이션 | 1 (0088) |
| API routes | 2 (gtm-customers, gtm-outreach) |
| API services | 3 (gtm-customer, gtm-outreach, outreach-proposal) |
| API schemas | 2 (Zod) |
| API endpoints | 11 |
| Web pages | 2 (outreach list, outreach detail) |
| Shared types | 4 (GtmCustomer, GtmOutreach, OutreachStatus, CompanySize) |
| Tests | ~47 (API ~39 + Web ~8) |
| Sidebar | 1 메뉴 추가 |

---

## 10. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Workers AI 호출 실패 | 제안서 생성 불가 | Extractive fallback (기존 ProposalGenerator 패턴) |
| Offering Pack 없는 아웃리치 | 제안서 생성 불가 | offeringPackId nullable — 수동 제안서 입력 허용 |
| 상태 전이 복잡성 | UX 혼란 | 단순 드롭다운 + 전이 규칙 서버 검증 |
