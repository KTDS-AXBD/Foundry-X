# FX-BD-V1 Design Document

> **Summary**: AX BD 6단계 파이프라인 End-to-End 통합 — 대시보드·공유·의사결정·게이트·Offering Pack
>
> **Project**: Foundry-X
> **Version**: api 0.1.0 / web 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft
> **Planning Doc**: [FX-BD-V1.plan.md](../../01-plan/features/FX-BD-V1.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 기존 AX BD API(~75 endpoints)를 **end-to-end 파이프라인으로 연결**
2. 산출물 공유·알림·리뷰 워크플로 추가로 **팀 협업 활성화**
3. ORB/PRB 게이트 문서 + Offering Pack **자동 번들링** 구현
4. 기존 Hono+D1+Next.js 아키텍처 그대로 확장 (신규 프레임워크 도입 없음)

### 1.2 Design Principles

- **기존 패턴 준수**: route→service→D1 3계층, Zod 스키마 검증, tenant 미들웨어
- **점진적 구현**: Sprint 79(Core) → 80(문서) → 81(번들) 순서, 각 Sprint 독립 배포 가능
- **최소 신규 의존성**: react-md-editor(에디터), JSZip(번들링) 2개만 추가

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web (Next.js 14)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Pipeline  │ │Share     │ │BDP       │ │Offering  │           │
│  │Dashboard │ │& Review  │ │Editor    │ │Pack UI   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │            │             │                 │
│       └─────────────┴────────────┴─────────────┘                │
│                          │ api-client                            │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼──────────────────────────────────────┐
│                     API (Hono Workers)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │pipeline  │ │share     │ │bdp       │ │gate      │           │
│  │.ts       │ │.ts       │ │.ts       │ │.ts       │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │             │            │             │                 │
│  ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐           │
│  │pipeline  │ │share     │ │bdp       │ │gate      │           │
│  │-service  │ │-service  │ │-service  │ │-package  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┴────────────┴─────────────┘                │
│                          │                                       │
│                    ┌─────┴─────┐                                 │
│                    │    D1     │ (0066~0073)                     │
│                    └───────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow — 핵심 워크플로

```
아이템 등록 → [pipeline_stages] 단계 기록
    ↓
산출물 작성 (BMC/PRD/BDP) → [bdp_versions] 버전 저장
    ↓
공유/리뷰 요청 → [share_links] 링크 생성 + [notifications] 알림
    ↓
의사결정 (Go/Hold/Drop) → [decisions] 이력 + [pipeline_stages] 단계 전환
    ↓
게이트 문서 패키징 → [gate_packages] 산출물 수집 + ZIP 생성
    ↓
Offering Pack → [offering_packs] 번들 생성
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| pipeline-service | biz-item-service (기존) | 아이템 조회, 상태 연동 |
| share-service | notification-service (신규) | 공유 시 알림 발송 |
| gate-package-service | bmc-service, prd-generator, prototype-service (기존) | 산출물 수집 |
| offering-pack-service | gate-package-service, bdp-service | 게이트 패키지 + BDP 포함 |
| bdp-service | business-plan-generator (기존) | 초안 생성 활용 |

---

## 3. Data Model

### 3.1 D1 마이그레이션 (0066~0073)

#### 0066_pipeline_stages.sql — F232

```sql
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  stage TEXT NOT NULL DEFAULT 'collection',
  -- collection | discovery | shaping | validation | productization | offering
  entered_at TEXT NOT NULL DEFAULT (datetime('now')),
  exited_at TEXT,
  duration_hours REAL,
  created_by TEXT NOT NULL,
  UNIQUE(biz_item_id, stage)
);
CREATE INDEX idx_pipeline_stages_item ON pipeline_stages(biz_item_id);
```

#### 0067_share_links.sql — F233

```sql
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- bmc | prd | prototype | bdp | gate_package | offering_pack
  resource_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'read', -- read | comment | edit
  expires_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);
CREATE INDEX idx_share_links_token ON share_links(token);
```

#### 0068_notifications.sql — F233

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  type TEXT NOT NULL, -- review_request | stage_change | decision | share | mention
  title TEXT NOT NULL,
  body TEXT,
  resource_type TEXT,
  resource_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, read_at);
```

#### 0069_decisions.sql — F239

```sql
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  stage TEXT NOT NULL,
  decision TEXT NOT NULL, -- go | hold | drop
  comment TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_decisions_item ON decisions(biz_item_id);
```

#### 0070_bdp_versions.sql — F234

```sql
CREATE TABLE IF NOT EXISTS bdp_versions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version_num INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL, -- markdown
  is_final INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, version_num)
);
```

#### 0071_gate_packages.sql — F235

```sql
CREATE TABLE IF NOT EXISTS gate_packages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  gate_type TEXT NOT NULL, -- orb | prb
  items TEXT NOT NULL, -- JSON: [{type, id, title}]
  status TEXT NOT NULL DEFAULT 'draft', -- draft | ready | submitted
  download_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 0072_offering_packs.sql — F236

```sql
CREATE TABLE IF NOT EXISTS offering_packs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  bundle_items TEXT NOT NULL, -- JSON: [{type, id, title}]
  price_info TEXT, -- JSON: {model, amount, currency, notes}
  status TEXT NOT NULL DEFAULT 'draft', -- draft | ready | shared
  share_link_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 0073_mvp_tracking.sql — F238

```sql
CREATE TABLE IF NOT EXISTS mvp_tracking (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  status TEXT NOT NULL DEFAULT 'planned', -- planned | in_dev | testing | released | cancelled
  poc_env_id TEXT,
  deployed_at TEXT,
  test_result TEXT, -- JSON
  notes TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2 Entity Relationships

```
[biz_items] 1 ──── N [pipeline_stages]
     │
     ├── 1 ──── N [decisions]
     ├── 1 ──── N [bdp_versions]
     ├── 1 ──── N [gate_packages]
     ├── 1 ──── 1 [offering_packs]
     └── 1 ──── 1 [mvp_tracking]

[share_links] N ──── 1 [any resource] (polymorphic via resource_type+resource_id)
[notifications] N ──── 1 [users] (via recipient_id)
```

---

## 4. API Specification

### Sprint 79 — F232 파이프라인 (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/pipeline/dashboard | 전체 아이템 파이프라인 뷰 (단계별 그룹핑) | tenant |
| GET | /api/pipeline/:bizItemId | 아이템별 단계 이력 조회 | tenant |
| POST | /api/pipeline/:bizItemId/advance | 다음 단계로 전환 | tenant |
| POST | /api/pipeline/:bizItemId/revert | 이전 단계로 되돌리기 | tenant+admin |
| GET | /api/pipeline/stats | 파이프라인 통계 (완주율, 평균 체류시간) | tenant |

### Sprint 79 — F233 공유+알림 (8 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/share | 공유 링크 생성 (resource_type + resource_id) | tenant |
| GET | /api/share/:token | 공유 링크로 리소스 접근 | share token |
| DELETE | /api/share/:id | 공유 링크 회수 | tenant |
| GET | /api/notifications | 내 알림 목록 (미읽음 우선) | tenant |
| PATCH | /api/notifications/:id/read | 읽음 처리 | tenant |
| POST | /api/notifications/read-all | 전체 읽음 | tenant |
| POST | /api/review-request | 리뷰 요청 생성 (→ 알림 발송) | tenant |
| GET | /api/review-request/:bizItemId | 아이템별 리뷰 요청 목록 | tenant |

### Sprint 79 — F239 의사결정 (4 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/decisions | Go/Hold/Drop 결정 기록 (→ 알림 + 단계 전환) | tenant+admin |
| GET | /api/decisions/:bizItemId | 아이템별 결정 이력 | tenant |
| GET | /api/decisions/summary | 전체 결정 통계 | tenant |
| PATCH | /api/decisions/:id | 결정 코멘트 수정 | tenant+admin |

### Sprint 80 — F234 BDP (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/bdp/:bizItemId | BDP 최신 버전 조회 | tenant |
| GET | /api/bdp/:bizItemId/versions | 버전 히스토리 | tenant |
| POST | /api/bdp/:bizItemId | BDP 새 버전 저장 | tenant |
| PATCH | /api/bdp/:bizItemId/finalize | 최종본 잠금 | tenant+admin |
| GET | /api/bdp/:bizItemId/diff/:v1/:v2 | 두 버전 간 diff | tenant |

### Sprint 80 — F235 게이트 + F237 사업제안서 (5 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/gate-package/:bizItemId | 게이트 패키지 자동 구성 (산출물 수집) | tenant |
| GET | /api/gate-package/:bizItemId | 패키지 내용 조회 | tenant |
| GET | /api/gate-package/:bizItemId/download | ZIP 다운로드 | tenant |
| PATCH | /api/gate-package/:bizItemId/status | 상태 변경 (draft→ready→submitted) | tenant+admin |
| POST | /api/bdp/:bizItemId/generate-proposal | BDP에서 사업제안서 요약본 LLM 생성 | tenant |

### Sprint 81 — F236 Offering Pack + F238 MVP + F240 IR (8 endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/offering-pack/:bizItemId | Offering Pack 생성 | tenant |
| GET | /api/offering-pack/:bizItemId | Pack 조회 | tenant |
| PATCH | /api/offering-pack/:bizItemId | Pack 수정 (가격 정보 등) | tenant |
| POST | /api/offering-pack/:bizItemId/share | Pack 공유 링크 생성 | tenant+admin |
| GET | /api/mvp/:bizItemId | MVP 상태 조회 | tenant |
| PATCH | /api/mvp/:bizItemId | MVP 상태 변경 | tenant |
| POST | /api/mvp/:bizItemId/deploy | PoC 배포 트리거 | tenant |
| POST | /api/ir-proposals | IR Bottom-up 제안 등록 (→ biz-item 자동 변환) | tenant |

**총 신규 API: ~35 endpoints**

---

## 5. UI/UX Design

### 5.1 파이프라인 대시보드 (F232) — `/ax-bd/pipeline`

```
┌──────────────────────────────────────────────────────────────────┐
│ AX BD Pipeline                              [칸반 뷰] [리스트 뷰] │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│ 수집 (3) │ 발굴 (5) │ 형상화(2)│ 검증 (1) │ 제품화(1)│ Offering │
│          │          │          │          │          │   (0)    │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │
│ │Item A│ │ │Item B│ │ │Item E│ │ │Item G│ │ │Item H│ │          │
│ │ 📋   │ │ │ 🔍   │ │ │ 📝   │ │ │ ✅❌  │ │ │ 🚀   │ │          │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │          │
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │          │          │          │
│ │Item B│ │ │Item C│ │ │Item F│ │          │          │          │
│ └──────┘ │ └──────┘ │ └──────┘ │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 5.2 아이템 상세 — 의사결정 패널 (F239)

```
┌──────────────────────────────────────────────┐
│ Item G: AI 챗봇 고객 서비스          [검증]  │
├──────────────────────────────────────────────┤
│ 산출물: BMC ✅ | PRD ✅ | Prototype ✅        │
│ 평가: 9기준 7/9 | Six Hats Complete          │
├──────────────────────────────────────────────┤
│ 의사결정:                                     │
│  [🟢 Go]  [🟡 Hold]  [🔴 Drop]              │
│  코멘트: ________________________             │
│                           [결정 기록]         │
├──────────────────────────────────────────────┤
│ 결정 이력:                                    │
│  2026-03-28 | 팀장 | Hold | "가격 검증 필요"  │
│  2026-03-25 | 팀원A | Go 제안 | "시장 적합"   │
└──────────────────────────────────────────────┘
```

### 5.3 Component List

| Component | Location | Sprint | Responsibility |
|-----------|----------|--------|----------------|
| PipelineDashboard | `(app)/ax-bd/pipeline/page.tsx` | 79 | 칸반/리스트 뷰 전환 |
| PipelineCard | `components/feature/pipeline-card.tsx` | 79 | 아이템 카드 (단계·진행률) |
| ShareButton | `components/feature/share-button.tsx` | 79 | 공유 링크 생성 + 복사 |
| NotificationBell | `components/feature/notification-bell.tsx` | 79 | 알림 벨 + 드롭다운 |
| ReviewRequestForm | `components/feature/review-request.tsx` | 79 | 리뷰 요청 폼 |
| DecisionPanel | `components/feature/decision-panel.tsx` | 79 | Go/Hold/Drop 버튼 + 이력 |
| BdpEditor | `(app)/ax-bd/bdp/[id]/page.tsx` | 80 | 마크다운 에디터 + 버전 |
| GatePackageView | `(app)/ax-bd/gate/[id]/page.tsx` | 80 | 패키지 구성 + 다운로드 |
| OfferingPackBuilder | `(app)/ax-bd/offering/[id]/page.tsx` | 81 | 번들 구성 + 공유 |
| MvpTracker | `components/feature/mvp-tracker.tsx` | 81 | MVP 상태 카드 |

---

## 6. Error Handling

| Code | Scenario | Handling |
|------|----------|----------|
| 400 | 잘못된 단계 전환 (예: 수집→제품화 건너뛰기) | "순차 단계 전환만 가능해요" |
| 403 | 의사결정 권한 없음 (팀원이 Go/Drop 시도) | "팀장만 의사결정을 기록할 수 있어요" |
| 404 | 존재하지 않는 아이템/공유 링크 | 표준 404 |
| 410 | 만료된 공유 링크 | "이 링크는 만료됐어요" |
| 422 | 게이트 패키지 구성 실패 (필수 산출물 누락) | "BMC와 PRD가 필요해요" |

---

## 7. Security Considerations

- [x] 기존 JWT + RBAC 활용 (tenant 미들웨어)
- [ ] 공유 링크: 별도 JWT 토큰 발급, 만료 시간 필수 (기본 7일)
- [ ] 의사결정: admin 역할만 Go/Hold/Drop 기록 가능
- [ ] Offering Pack 외부 공유: 팀장 승인 필수
- [ ] 알림: 본인 알림만 조회 가능 (recipient_id 필터)
- [ ] 데이터 보안: 사업 아이템 외부 유출 방지 (공유 링크에 org_id 바인딩)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Sprint |
|------|--------|------|--------|
| Unit | pipeline-service, share-service, decision-service | Vitest | 79 |
| Unit | bdp-service, gate-package-service | Vitest | 80 |
| Unit | offering-pack-service, mvp-service | Vitest | 81 |
| Integration | API 35 endpoints | Hono app.request() | 79~81 |
| E2E | 파이프라인 대시보드 + 공유 + 의사결정 | Playwright | 79 |

### 8.2 Key Test Cases

- [ ] 아이템 등록 → 파이프라인 대시보드에 표시
- [ ] 단계 전환(순차만 가능, 건너뛰기 불가)
- [ ] 공유 링크 생성 → 토큰으로 접근 → 만료 후 410
- [ ] 리뷰 요청 → 알림 생성 → 알림 읽음 처리
- [ ] Go 결정 → 자동 단계 전환 + 알림
- [ ] BDP 편집 → 버전 저장 → diff 조회
- [ ] 게이트 패키지: 필수 산출물 누락 시 422
- [ ] Offering Pack 생성 → 공유 링크 연결

---

## 9. Implementation Order

### Sprint 79 — P0 Core (F232+F233+F239)

```
1. [ ] D1 마이그레이션: 0066 pipeline_stages, 0067 share_links, 0068 notifications, 0069 decisions
2. [ ] Zod 스키마: pipeline.ts, share-link.ts, notification.ts, decision.ts
3. [ ] 서비스: pipeline-service.ts, share-service.ts, notification-service.ts, decision-service.ts
4. [ ] 라우트: pipeline.ts (5ep), share.ts (6ep), notification.ts (3ep), decision.ts (4ep)
5. [ ] 테스트: 서비스 단위 + 라우트 통합 (목표 ~80 tests)
6. [ ] Web: PipelineDashboard + ShareButton + NotificationBell + DecisionPanel
7. [ ] E2E: 파이프라인 크리티컬 패스 1 spec
```

### Sprint 80 — P0 문서 (F234+F235+F237)

```
1. [ ] D1 마이그레이션: 0070 bdp_versions, 0071 gate_packages
2. [ ] Zod 스키마: bdp.ts, gate-package.ts
3. [ ] 서비스: bdp-service.ts, gate-package-service.ts, proposal-generator.ts
4. [ ] 라우트: bdp.ts (5ep), gate-package.ts (4ep) + bdp generate-proposal (1ep)
5. [ ] 테스트: ~50 tests
6. [ ] Web: BdpEditor (react-md-editor) + GatePackageView + 다운로드
```

### Sprint 81 — P0+P1+P2 (F236+F238+F240)

```
1. [ ] D1 마이그레이션: 0072 offering_packs, 0073 mvp_tracking
2. [ ] Zod 스키마: offering-pack.ts, mvp.ts, ir-proposal.ts
3. [ ] 서비스: offering-pack-service.ts, mvp-service.ts, ir-proposal-service.ts
4. [ ] 라우트: offering-pack.ts (4ep), mvp.ts (3ep), ir-proposal.ts (1ep)
5. [ ] 테스트: ~40 tests
6. [ ] Web: OfferingPackBuilder + MvpTracker + IR 등록 폼
7. [ ] JSZip 통합: Offering Pack ZIP 다운로드
```

---

## 10. New Dependencies

| Package | Purpose | Sprint | Size |
|---------|---------|--------|------|
| `@uiw/react-md-editor` | BDP 마크다운 에디터 | 80 | ~200KB |
| `jszip` | 게이트 패키지 + Offering Pack ZIP 생성 | 80 | ~100KB |
| `diff` | BDP 버전 diff | 80 | ~30KB |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | Plan 기반 초안 — 전체 Sprint 79~81 설계 | Sinclair Seo |
