---
code: FX-PLAN-014
title: Team Shared Data Layer 계획
version: 1.0
status: Draft
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Team Shared Data Layer Planning Document

> **Summary**: Org 단위 데이터 격리 구조를 개선하여, 사용자가 개인 작업과 팀 공유 데이터를 하나의 통합 뷰에서 볼 수 있게 해요.
>
> **Project**: Foundry-X
> **Version**: api 0.1.0 / web 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 모든 데이터가 `org_id`로 격리되어, 개인 Org의 작업물과 팀 Org(AX BD)의 공유 데이터가 서로 보이지 않아요. 사용자는 Org를 전환해야만 다른 Org의 데이터를 확인할 수 있어요. |
| **Solution** | 사용자가 속한 모든 Org의 데이터를 통합 조회할 수 있는 "Shared Data Layer"를 도입하여, 개인 작업과 팀 공유 데이터를 하나의 뷰에서 볼 수 있게 해요. |
| **Function/UX Effect** | Org 전환 없이 "내 작업 + 팀 공유" 통합 목록을 볼 수 있고, 각 아이템의 소유 구분(개인/팀)이 명확히 표시돼요. |
| **Core Value** | BD팀 6명이 팀 공유 사업 아이템을 즉시 확인하면서도, 개인 실험/초안은 비공개로 유지할 수 있는 유연한 협업 환경 구축 |

---

## 1. Overview

### 1.1 Purpose

Foundry-X의 멀티테넌시 데이터 격리(org_id scoping)를 유지하면서, 사용자가 자신이 속한 복수 Org의 데이터를 통합 조회할 수 있는 메커니즘을 설계해요. 개인 작업의 프라이버시와 팀 공유 데이터의 가시성을 동시에 보장하는 게 핵심이에요.

### 1.2 Background

#### 현재 구조

```
┌─────────────────────┐    ┌─────────────────────┐
│  Personal Org       │    │  AX BD Team Org     │
│  (org_id: user-xxx) │    │  (org_id: axbd-001) │
│                     │    │                     │
│  - 내 BMC 초안      │    │  - 팀 공유 아이템    │
│  - 개인 Discovery   │    │  - 공식 BMC          │
│  - 개인 PRD 실험    │    │  - 팀 Pipeline       │
│                     │    │  - 공유 Offering     │
└─────────────────────┘    └─────────────────────┘
        ↕ Org 전환 필요 (수동)
```

- **0011_organizations.sql**: `organizations` + `org_members` 테이블로 멀티테넌시 구현
- **모든 비즈니스 테이블**: `org_id` 또는 `tenant_id` 컬럼으로 데이터 격리
  - `ax_ideas`, `ax_bmcs`, `ax_evaluations`, `pipeline_stages`, `offering_packs` 등
- **SSO 토큰**: `orgId` + `orgRole` 포함 (HubTokenPayload)
- **현재 동작**: API 요청 시 현재 활성 Org의 `org_id`로만 쿼리 → 다른 Org 데이터 불가시

#### 문제점

1. **컨텍스트 단절**: 개인 Org에서 아이디어를 작성하고, 팀 Org에서 공식화할 때 수동 복사 필요
2. **팀 현황 파악 불가**: 팀 Org로 전환하지 않으면 동료의 공유 아이템을 볼 수 없음
3. **중복 작업**: 같은 아이템을 개인/팀 양쪽에서 관리하면 동기화 부담
4. **온보딩 혼란**: 신규 팀원이 "팀 데이터가 어디 있는지" 파악하기 어려움

### 1.3 Related Documents

- 멀티테넌시 마이그레이션: `packages/api/src/db/migrations/0011_organizations.sql`
- SSO 타입: `packages/shared/src/sso.ts` (HubTokenPayload)
- 현재 서비스 패턴: `packages/api/src/services/bmc-service.ts` (org_id 기반 CRUD)
- BD Pipeline Plan: `docs/01-plan/features/FX-BD-V1.plan.md`

---

## 2. Problem Statement

### 2.1 현재 Org 격리의 한계

```
사용자 A (AX BD팀 소속)
├── Personal Org (org: user-a)
│   ├── BMC 초안 3건      ← 팀원에게 안 보임
│   ├── Discovery 실험 2건 ← 팀원에게 안 보임
│   └── PRD 드래프트 1건   ← 팀원에게 안 보임
│
└── AX BD Team Org (org: axbd-001)
    ├── 공식 BMC 5건       ← Org 전환해야 보임
    ├── Pipeline 아이템 8건 ← Org 전환해야 보임
    └── Offering Pack 2건  ← Org 전환해야 보임
```

**핵심 Pain Point**: 사용자 A가 대시보드를 열면, 현재 활성 Org의 데이터만 보여요. 팀 공유 아이템을 보면서 동시에 개인 초안을 확인하려면 Org를 번갈아 전환해야 해요.

### 2.2 바람직한 상태 (To-Be)

```
사용자 A의 통합 뷰
├── 🏢 팀 공유 (AX BD)
│   ├── BMC 5건
│   ├── Pipeline 아이템 8건
│   └── Offering Pack 2건
│
├── 👤 내 작업 (Personal)
│   ├── BMC 초안 3건
│   ├── Discovery 실험 2건
│   └── PRD 드래프트 1건
│
└── 필터: [전체] [팀 공유만] [내 것만]
```

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사용자가 속한 모든 Org의 데이터를 통합 조회할 수 있어야 함 | P0 | Pending |
| FR-02 | 팀 Org 데이터가 기본(default)으로 표시돼야 함 — 팀 공유가 주 화면 | P0 | Pending |
| FR-03 | 개인 Org 데이터는 "내 작업" 영역으로 구분되어 표시 | P0 | Pending |
| FR-04 | 각 아이템에 소유 구분 태그 표시 (팀/개인, 아이콘 또는 배지) | P0 | Pending |
| FR-05 | 필터링: 전체 / 팀 공유만 / 내 것만 전환 가능 | P1 | Pending |
| FR-06 | 개인 아이템을 팀 Org로 "공유/이관" 가능 (ownership transfer) | P1 | Pending |
| FR-07 | 팀 Org에서 개인 Org로 "포크/복사" 가능 (실험용) | P2 | Pending |
| FR-08 | 개인 아이템의 가시성 설정: private(나만) / shared(팀에 읽기 공유) | P2 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 통합 뷰 로딩 < 2초 (3개 Org, 각 50건 기준) | Lighthouse, 실측 |
| Security | 다른 사용자의 개인 Org 데이터는 절대 노출 금지 | 보안 리뷰 + E2E |
| Backward Compat | 기존 단일 Org API 호출은 동일하게 동작 | 기존 테스트 pass |
| Data Integrity | Org 간 데이터 이동 시 원본 보존 + 이력 기록 | 통합 테스트 |

---

## 4. Approach Options

### 4.1 Option B1: Multi-Org Query (API가 사용자의 모든 Org 데이터를 반환)

#### 개요

기존 API 엔드포인트에 `multi-org` 모드를 추가하여, 단일 요청으로 사용자가 속한 모든 Org의 데이터를 조회해요.

```
GET /api/ax/ideas?scope=all        ← 모든 Org
GET /api/ax/ideas?scope=team       ← 팀 Org만
GET /api/ax/ideas?scope=personal   ← 개인 Org만
GET /api/ax/ideas?orgId=xxx        ← 기존 호환 (특정 Org)
```

#### 구현 방식

```sql
-- 기존
SELECT * FROM ax_ideas WHERE org_id = ? AND is_deleted = 0

-- Multi-org (사용자가 속한 org_id 목록으로 IN 쿼리)
SELECT i.*, o.name as org_name, o.slug as org_slug,
       CASE WHEN o.id = ? THEN 'personal' ELSE 'team' END as ownership
FROM ax_ideas i
JOIN organizations o ON i.org_id = o.id
WHERE i.org_id IN (SELECT org_id FROM org_members WHERE user_id = ?)
  AND i.is_deleted = 0
ORDER BY i.updated_at DESC
```

#### 장단점

| 항목 | 평가 |
|------|------|
| **장점** | 기존 스키마 변경 최소, 점진적 적용 가능 (엔드포인트별 `scope` 파라미터 추가) |
| **장점** | 기존 단일 Org 호출 완전 호환 (`orgId` 파라미터 유지) |
| **장점** | 권한 모델 단순 — org_members 테이블만으로 접근 범위 결정 |
| **단점** | IN 쿼리 성능 — Org 수가 많아지면 쿼리 복잡도 증가 (현재 6명이라 문제 없음) |
| **단점** | 모든 서비스에 scope 로직 반복 필요 (153개 서비스 중 관련 서비스 ~30개) |
| **단점** | 개인 아이템의 세밀한 가시성 제어(private/shared) 추가 구현 필요 |

#### 예상 규모

- API 변경: ~30개 서비스 + ~20개 라우트에 scope 파라미터 추가
- 공통 유틸: `buildMultiOrgQuery()` 헬퍼 1개
- Web 변경: 목록 컴포넌트에 ownership 태그 + 필터 UI
- D1 마이그레이션: 없음 (기존 스키마 활용)

---

### 4.2 Option B2: Shared Workspace Layer (Org 구조와 별도의 공유 레이어)

#### 개요

Org 구조 위에 "Workspace"라는 상위 개념을 도입해요. Workspace는 여러 Org의 데이터를 논리적으로 묶는 뷰 레이어예요.

```
┌─────────────────────────────────────────┐
│  AX BD Workspace                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Team Org │  │ User A   │  │ User B │ │
│  │ (공유)   │  │ (개인)   │  │ (개인) │ │
│  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────┘
```

#### 구현 방식

```sql
-- 새 테이블
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('team', 'personal')),
  created_at INTEGER NOT NULL
);

CREATE TABLE workspace_orgs (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  org_id TEXT NOT NULL REFERENCES organizations(id),
  role TEXT NOT NULL CHECK(role IN ('primary', 'member')),
  PRIMARY KEY (workspace_id, org_id)
);

-- 데이터 조회: workspace에 연결된 모든 org의 데이터
SELECT * FROM ax_ideas
WHERE org_id IN (
  SELECT org_id FROM workspace_orgs WHERE workspace_id = ?
)
```

#### 장단점

| 항목 | 평가 |
|------|------|
| **장점** | Org와 뷰 레이어 분리 — 데이터 소유(Org)와 가시성(Workspace) 관심사 분리 |
| **장점** | 유연한 확장 — 부서별, 프로젝트별 Workspace 추가 가능 |
| **장점** | 기존 Org 구조 변경 없음 |
| **단점** | 새로운 추상화 레이어 추가 → 개념 복잡도 증가 |
| **단점** | D1 마이그레이션 필요 (workspaces, workspace_orgs) |
| **단점** | 현재 6명 팀에는 과도한 설계 (Over-engineering) |
| **단점** | UI에서 "Org 전환" + "Workspace 전환" 두 가지 개념을 이해해야 함 |

#### 예상 규모

- D1 마이그레이션: 2~3개 (workspaces, workspace_orgs, workspace_settings)
- 신규 서비스: workspace-service.ts
- API 변경: 기존 서비스에 workspace 컨텍스트 주입
- Web 변경: Workspace 선택 UI + 통합 뷰

---

### 4.3 Option B3: Org Hierarchy (부모 Org = 팀, 자식 Org = 개인)

#### 개요

organizations 테이블에 `parent_id`를 추가하여, 팀 Org 아래에 개인 Org가 종속되는 트리 구조를 만들어요.

```
AX BD Team Org (parent)
├── User A Personal Org (child)
├── User B Personal Org (child)
└── User C Personal Org (child)
```

#### 구현 방식

```sql
-- 기존 organizations 테이블에 parent_id 추가
ALTER TABLE organizations ADD COLUMN parent_id TEXT REFERENCES organizations(id);

-- 팀 Org + 하위 개인 Org 데이터 통합 조회
SELECT * FROM ax_ideas
WHERE org_id IN (
  SELECT id FROM organizations
  WHERE id = ? OR parent_id = ?  -- 팀 Org + 모든 자식 Org
)
```

#### 장단점

| 항목 | 평가 |
|------|------|
| **장점** | 계층 관계가 명확 — 팀/개인 관계가 데이터 모델에 내재 |
| **장점** | 1개 컬럼 추가만으로 구현 가능 |
| **장점** | 향후 부서/팀/파트 계층 확장 자연스러움 |
| **단점** | 기존 "독립 Org" 개념을 깨뜨림 — 개인 Org가 팀 Org에 종속 |
| **단점** | 한 사용자가 여러 팀 Org에 속할 때 개인 Org의 부모가 모호해짐 |
| **단점** | 재귀 쿼리 필요 (D1/SQLite는 CTE 지원하지만 성능 주의) |
| **단점** | 기존 데이터 마이그레이션 복잡 — 이미 생성된 개인 Org에 parent_id 설정 필요 |

#### 예상 규모

- D1 마이그레이션: 1개 (ALTER TABLE + 기존 데이터 parent_id 설정)
- API 변경: Org 생성/조회 로직 수정 + 하위 Org 포함 쿼리
- Web 변경: Org 선택 UI를 트리 구조로 변경

---

## 5. Approach Comparison

| 기준 | B1: Multi-Org Query | B2: Shared Workspace | B3: Org Hierarchy |
|------|:-------------------:|:--------------------:|:-----------------:|
| **구현 복잡도** | ⭐ 낮음 | ⭐⭐⭐ 높음 | ⭐⭐ 중간 |
| **스키마 변경** | 없음 | 2~3 테이블 추가 | 1 컬럼 추가 |
| **기존 호환성** | ⭐⭐⭐ 완전 호환 | ⭐⭐ 호환 (별도 레이어) | ⭐ Org 개념 변경 |
| **확장성** | ⭐⭐ 보통 | ⭐⭐⭐ 높음 | ⭐⭐ 보통 |
| **UX 단순성** | ⭐⭐⭐ 단순 | ⭐ 복잡 | ⭐⭐ 보통 |
| **현재 팀 규모 적합** | ⭐⭐⭐ 적합 | ⭐ 과도 | ⭐⭐ 적합 |
| **점진적 적용** | ⭐⭐⭐ 용이 | ⭐⭐ 보통 | ⭐ 어려움 |

---

## 6. Recommended Approach

### 선택: Option B1 — Multi-Org Query

#### 선택 근거

1. **현실 적합성**: AX BD팀 6명, Org 수 최대 7개(팀 1 + 개인 6). IN 쿼리 성능 문제 없음
2. **점진적 적용**: 엔드포인트별로 `scope` 파라미터를 하나씩 추가할 수 있어, 빅뱅 배포 불필요
3. **기존 호환**: `orgId` 파라미터를 그대로 유지하면 기존 클라이언트 코드가 깨지지 않음
4. **D1 마이그레이션 불필요**: 신규 테이블/컬럼 없이 쿼리 로직만 변경
5. **UX 단순**: 사용자는 "필터 전환"만 하면 됨 — 새로운 개념(Workspace, 부모 Org) 학습 불필요

#### Trade-offs

| 수용하는 단점 | 대응 방안 |
|---------------|----------|
| 서비스마다 scope 로직 반복 | 공통 `MultiOrgQueryBuilder` 헬퍼로 중복 최소화 |
| 세밀한 가시성(private/shared) 미지원 | Phase 2에서 `visibility` 컬럼 추가로 대응 |
| 확장성 한계 (Org 수 100+ 시 IN 쿼리 비효율) | 현재 6명 → 중장기 필요 시 B2로 전환. YAGNI 원칙 |

#### 향후 전환 가능성

B1을 먼저 구현하고, 팀 규모가 20명+ 또는 교차 팀 Workspace가 필요해지면 B2(Shared Workspace)로 마이그레이션해요. B1의 `scope` 파라미터 인터페이스를 B2 내부에서도 재활용할 수 있어서, API 클라이언트 쪽 변경이 최소화돼요.

---

## 7. Implementation Phases

### Phase A: 기반 구축 (1 Sprint)

> 핵심 유틸 + 주요 엔티티 3개에 Multi-Org 적용

| Task | 상세 | 예상 규모 |
|------|------|----------|
| A-1 | `MultiOrgQueryBuilder` 유틸 구현 — org_members에서 사용자의 Org 목록 조회 + IN 쿼리 빌드 | 서비스 1개 |
| A-2 | `scope` 파라미터 Zod 스키마 정의 (`all` / `team` / `personal` / 특정 orgId) | 스키마 1개 |
| A-3 | `ax_ideas` 서비스에 Multi-Org 적용 (PoC 검증) | 서비스 수정 1개 |
| A-4 | `ax_bmcs` 서비스에 Multi-Org 적용 | 서비스 수정 1개 |
| A-5 | `pipeline_stages` 서비스에 Multi-Org 적용 | 서비스 수정 1개 |
| A-6 | 통합 테스트 — Multi-Org 쿼리 정확성 + 권한 경계 검증 | 테스트 ~20개 |

### Phase B: 웹 통합 뷰 (1 Sprint)

> 프론트엔드에 통합 뷰 + 소유 구분 태그 + 필터

| Task | 상세 | 예상 규모 |
|------|------|----------|
| B-1 | API Client에 `scope` 파라미터 지원 추가 | lib 수정 1개 |
| B-2 | 목록 컴포넌트에 소유 구분 배지 (팀 🏢 / 개인 👤) | 컴포넌트 수정 ~5개 |
| B-3 | 필터 바 구현 — 전체/팀/개인 토글 | 컴포넌트 1개 |
| B-4 | 대시보드 홈에 통합 요약 카드 | 페이지 수정 1개 |
| B-5 | Org 전환 없이 기본 뷰가 `scope=all`로 동작하도록 변경 | 레이아웃 수정 |

### Phase C: 확장 엔티티 + 이관 기능 (1 Sprint)

> 나머지 엔티티 적용 + 개인→팀 이관

| Task | 상세 | 예상 규모 |
|------|------|----------|
| C-1 | 나머지 BD 엔티티에 Multi-Org 적용 (evaluations, prds, offering_packs 등) | 서비스 수정 ~15개 |
| C-2 | "팀에 공유" 기능 — 개인 아이템을 팀 Org로 복사/이관 | API 2 ep + 서비스 1개 |
| C-3 | 이관 이력 기록 (origin_org_id, transferred_at) | 옵션: 기존 audit_logs 활용 |
| C-4 | E2E 테스트 — 통합 뷰 + 필터 + 이관 크리티컬 패스 | E2E ~5개 |

---

## 8. Estimated Scope

### 총량

| 영역 | 신규 | 수정 | 비고 |
|------|------|------|------|
| D1 마이그레이션 | 0개 | 0개 | 스키마 변경 없음 (Phase A~B) |
| API 서비스 | 1개 (MultiOrgQueryBuilder) | ~30개 | scope 파라미터 적용 |
| API 라우트 | 0개 | ~20개 | scope 쿼리 파라미터 추가 |
| Zod 스키마 | 1개 (scope 스키마) | ~15개 | scope 파라미터 포함 |
| Web 컴포넌트 | 1개 (필터 바) | ~10개 | 소유 태그 + 통합 뷰 |
| 테스트 | ~40개 | ~30개 수정 | Multi-Org 시나리오 추가 |

### 예상 기간

- Phase A: 1 Sprint (~3일)
- Phase B: 1 Sprint (~3일)
- Phase C: 1 Sprint (~3일)
- **총 3 Sprint, ~9일 (1인 개발 + AI 지원 기준)**

---

## 9. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IN 쿼리 성능 저하 (Org 수 증가 시) | Medium | Low | 현재 7개 Org — 50개까지는 문제 없음. 이후 B2 전환 검토 |
| 권한 경계 누출 (다른 사용자의 개인 데이터 노출) | Critical | Low | org_members 기반 접근 제어 + 보안 테스트 필수 |
| 기존 클라이언트 호환성 깨짐 | High | Low | `scope` 기본값을 현재 동작(단일 Org)으로 설정하여 호환 유지 |
| 30개 서비스 수정 범위 | Medium | Medium | 공통 헬퍼로 패턴화 + 서비스별 점진 적용 (빅뱅 금지) |
| 통합 뷰 UX 혼란 (어떤 데이터가 어디 소속인지) | Medium | Medium | 소유 구분 배지 + 색상 코딩으로 시각적 구분 강화 |

---

## 10. Success Criteria

### 10.1 Definition of Done

- [ ] 주요 BD 엔티티(ideas, bmcs, pipeline) Multi-Org 쿼리 동작 확인
- [ ] 통합 뷰에서 팀 + 개인 데이터 동시 표시
- [ ] 소유 구분 태그(팀/개인) 정확히 표시
- [ ] 필터(전체/팀/개인) 동작 확인
- [ ] 기존 단일 Org API 호출 하위 호환 유지 (기존 테스트 전체 pass)
- [ ] 보안: 미가입 Org 데이터 접근 불가 검증

### 10.2 Quality Criteria

- [ ] typecheck 0 error
- [ ] lint 0 error
- [ ] API 전체 테스트 pass (기존 2119+ 신규 ~40)
- [ ] E2E 크리티컬 패스 pass

---

## 11. Next Steps

1. [ ] SPEC.md에 F-item 등록 (F246~)
2. [ ] `MultiOrgQueryBuilder` 프로토타입 구현 + ax_ideas 서비스 PoC
3. [ ] Design 문서 작성 — 쿼리 패턴 상세 + Web 컴포넌트 와이어프레임
4. [ ] 보안 리뷰 — Multi-Org 쿼리의 권한 경계 검증 체크리스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-30 | 초안 작성 — 3가지 접근법 비교 + B1 권장 | Sinclair Seo |
