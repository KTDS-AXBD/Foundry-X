---
code: FX-DSGN-S88
title: "Sprint 88 — 팀 데이터 공유(Org-scope) + NPS 피드백 수집"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S88]]"
---

# Sprint 88: 상세 설계

## §1. 개요

| 항목 | 내용 |
|------|------|
| Sprint | 88 |
| F-Items | F253 (Org-scope 팀 데이터 공유), F254 (NPS 피드백 수집) |
| 영향 패키지 | api, web, shared |
| 예상 변경 파일 | 20개 (신규 12, 수정 8) |

## §2. F253 — Org-scope 팀 데이터 공유

### 2.1 API 설계

#### `GET /orgs/:orgId/shared/bmcs` — 팀 전체 BMC 목록

```
Authorization: Bearer <jwt>
```

tenantGuard 적용 (orgId 검증). 기존 BMC 목록(`GET /ax-bd/bmc`)이 현재 사용자 관계 없이 `org_id` 기준 조회이므로, 이 엔드포인트는 **작성자 정보를 조인**하여 "누가 만든 BMC인지" 명확히 보여주는 팀 뷰에요.

**응답** (200):
```json
{
  "items": [
    {
      "id": "bmc_xxx",
      "title": "My BMC",
      "authorId": "user_xxx",
      "authorName": "홍길동",
      "authorEmail": "hong@example.com",
      "syncStatus": "synced",
      "createdAt": 1711900000,
      "updatedAt": 1711900000
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

**SQL**:
```sql
SELECT b.id, b.title, b.author_id, b.sync_status, b.created_at, b.updated_at,
       u.name as author_name, u.email as author_email
FROM ax_bmcs b
LEFT JOIN users u ON b.author_id = u.id
WHERE b.org_id = ? AND b.is_deleted = 0
ORDER BY b.updated_at DESC
LIMIT ? OFFSET ?
```

#### `GET /orgs/:orgId/shared/activity` — 팀 활동 피드

최근 Org 내 활동을 타임라인으로 반환. D1에 별도 activity 테이블을 만들지 않고, 기존 테이블들의 `created_at`/`updated_at`을 UNION으로 조합해요.

**응답** (200):
```json
{
  "items": [
    {
      "type": "bmc_created",
      "resourceId": "bmc_xxx",
      "title": "My BMC",
      "actorId": "user_xxx",
      "actorName": "홍길동",
      "timestamp": "2026-03-31T10:00:00Z"
    }
  ]
}
```

**SQL** (UNION approach):
```sql
SELECT 'bmc_created' as type, b.id as resource_id, b.title, b.author_id as actor_id,
       u.name as actor_name, b.created_at as timestamp
FROM ax_bmcs b
LEFT JOIN users u ON b.author_id = u.id
WHERE b.org_id = ? AND b.is_deleted = 0
UNION ALL
SELECT 'feedback_submitted' as type, f.id as resource_id,
       'NPS ' || f.nps_score as title, f.user_id as actor_id,
       u2.name as actor_name, f.created_at as timestamp
FROM onboarding_feedback f
LEFT JOIN users u2 ON f.user_id = u2.id
WHERE f.tenant_id = ?
ORDER BY timestamp DESC
LIMIT ?
```

### 2.2 서비스 레이어

**`packages/api/src/services/org-shared-service.ts`**

```typescript
export class OrgSharedService {
  constructor(private db: D1Database) {}

  async getSharedBmcs(orgId: string, opts: { page: number; limit: number }): Promise<PaginatedResult>
  async getActivityFeed(orgId: string, limit: number): Promise<ActivityItem[]>
}
```

### 2.3 스키마

**`packages/api/src/schemas/org-shared.ts`**

- `OrgSharedBmcItemSchema`: id, title, authorId, authorName, authorEmail, syncStatus, createdAt, updatedAt
- `OrgSharedBmcsResponseSchema`: items[], total, page, limit
- `OrgActivityItemSchema`: type, resourceId, title, actorId, actorName, timestamp
- `OrgActivityFeedResponseSchema`: items[]

### 2.4 프론트엔드

**`packages/web/src/app/(app)/team-shared/page.tsx`**

- 탭 2개: **BMC** | **활동**
- BMC 탭: 카드 그리드, 작성자 이름 + 생성일 표시
- 활동 탭: 타임라인 리스트 (아이콘 + 설명 + 시간)
- `packages/web/src/lib/api-client.ts`에 `getOrgSharedBmcs()`, `getOrgActivityFeed()` 추가
- 사이드바 메뉴에 "팀 공유" 항목 추가 (`layout.tsx`)

## §3. F254 — NPS 피드백 수집 + 주간 서베이

### 3.1 D1 마이그레이션

**`0075_nps_surveys.sql`**:
```sql
CREATE TABLE nps_surveys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  dismissed_at TEXT,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX idx_nps_surveys_user ON nps_surveys(org_id, user_id, triggered_at DESC);
```

### 3.2 API 설계

#### `GET /nps/check` — 서베이 표시 여부

사용자별 7일 간격 체크. 마지막 서베이(completed/triggered)로부터 7일이 지났으면 새 서베이 레코드를 생성하고 `shouldShow: true` 반환.

**응답**:
```json
{ "shouldShow": true, "surveyId": "nps_xxx" }
// or
{ "shouldShow": false, "surveyId": null }
```

#### `POST /nps/dismiss` — 서베이 닫기

```json
{ "surveyId": "nps_xxx" }
```

#### `GET /orgs/:orgId/nps/summary` — 팀 NPS 집계 (admin+)

```json
{
  "averageNps": 7.8,
  "totalResponses": 24,
  "responseRate": 0.85,
  "weeklyTrend": [
    { "week": "2026-W13", "avgNps": 7.5, "count": 6 },
    { "week": "2026-W12", "avgNps": 8.0, "count": 5 }
  ],
  "recentFeedback": [...]
}
```

### 3.3 서비스 레이어

**`packages/api/src/services/nps-service.ts`**

```typescript
export class NpsService {
  constructor(private db: D1Database) {}

  async checkEligibility(orgId: string, userId: string): Promise<{ shouldShow: boolean; surveyId: string | null }>
  async completeSurvey(surveyId: string): Promise<void>
  async dismissSurvey(surveyId: string): Promise<void>
  async getOrgSummary(orgId: string): Promise<NpsOrgSummary>
}
```

- `checkEligibility`: 최근 7일 내 triggered 레코드 확인 → 없으면 새 레코드 INSERT → shouldShow: true
- `completeSurvey`: 기존 feedback submit 시 연동 — `POST /feedback` 호출 시 surveyId가 있으면 completed_at 기록
- `getOrgSummary`: 30일 내 `onboarding_feedback` 데이터 기준 집계

### 3.4 스키마

**`packages/api/src/schemas/nps.ts`**

- `NpsSurveyCheckResponseSchema`: shouldShow, surveyId
- `NpsDismissRequestSchema`: surveyId
- `NpsWeeklyTrendItemSchema`: week, avgNps, count
- `NpsOrgSummaryResponseSchema`: averageNps, totalResponses, responseRate, weeklyTrend[], recentFeedback[]

### 3.5 기존 Feedback 확장

**`packages/api/src/schemas/feedback.ts`**: `FeedbackSubmitRequestSchema`에 `surveyId` (optional) 추가
**`packages/api/src/routes/feedback.ts`**: submit 시 surveyId가 있으면 `npsService.completeSurvey(surveyId)` 호출

### 3.6 프론트엔드

**`packages/web/src/components/feature/NpsSurveyTrigger.tsx`**:
- 앱 레이아웃에 마운트 → 로드 시 `GET /nps/check` 호출
- shouldShow=true → FeedbackWidget을 NPS 모드로 자동 오픈 (기존 위젯 재사용)
- dismiss 시 `POST /nps/dismiss` 호출
- surveyId를 FeedbackWidget에 전달 → submit 시 포함

**`packages/web/src/app/(app)/settings/nps-dashboard.tsx`**:
- admin 전용 NPS 대시보드
- 팀 평균 NPS, 응답률, 주간 트렌드 (간단 bar chart)
- 최근 피드백 목록

## §4. 변경 파일 목록

### 신규 파일 (11개)

| # | 파일 | F-Item | 설명 |
|---|------|--------|------|
| 1 | `packages/api/src/schemas/org-shared.ts` | F253 | Org 공유 데이터 스키마 |
| 2 | `packages/api/src/services/org-shared-service.ts` | F253 | Org 공유 서비스 |
| 3 | `packages/api/src/routes/org-shared.ts` | F253 | Org 공유 라우트 |
| 4 | `packages/api/src/__tests__/org-shared-routes.test.ts` | F253 | 공유 라우트 테스트 |
| 5 | `packages/web/src/routes/team-shared.tsx` | F253 | 팀 공유 페이지 |
| 6 | `packages/api/src/db/migrations/0075_nps_surveys.sql` | F254 | NPS 서베이 테이블 |
| 7 | `packages/api/src/schemas/nps.ts` | F254 | NPS 스키마 |
| 8 | `packages/api/src/services/nps-service.ts` | F254 | NPS 서비스 |
| 9 | `packages/api/src/routes/nps.ts` | F254 | NPS 라우트 |
| 10 | `packages/api/src/__tests__/nps-routes.test.ts` | F254 | NPS 테스트 |
| 11 | `packages/web/src/components/feature/NpsSurveyTrigger.tsx` | F254 | NPS 트리거 컴포넌트 |
| 12 | `packages/web/src/routes/nps-dashboard.tsx` | F254 | NPS 대시보드 (admin) |

### 수정 파일 (6개)

| # | 파일 | F-Item | 변경 내용 |
|---|------|--------|----------|
| 1 | `packages/api/src/app.ts` | F253+F254 | orgSharedRoute, npsRoute 등록 |
| 2 | `packages/api/src/schemas/feedback.ts` | F254 | surveyId 필드 추가 |
| 3 | `packages/api/src/routes/feedback.ts` | F254 | completeSurvey 연동 |
| 4 | `packages/api/src/__tests__/helpers/mock-d1.ts` | F254 | nps_surveys 테이블 추가 |
| 5 | `packages/web/src/lib/api-client.ts` | F253+F254 | 신규 API 함수 |
| 6 | `packages/web/src/components/sidebar.tsx` | F253 | 사이드바 "팀 공유" 메뉴 |
| 7 | `packages/web/src/layouts/AppLayout.tsx` | F254 | NpsSurveyTrigger 마운트 |
| 8 | `packages/web/src/router.tsx` | F253+F254 | team-shared, nps 라우트 추가 |

## §5. Worker 파일 매핑 (단일 구현)

이번 Sprint는 파일 간 의존성이 높아 단일 구현이 적합해요 (F254의 feedback 수정이 F253의 activity feed에 영향).

**구현 순서**:
1. D1 마이그레이션 (0075)
2. 스키마 (org-shared, nps)
3. 서비스 (org-shared-service, nps-service)
4. 라우트 (org-shared, nps) + feedback 수정
5. app.ts 라우트 등록
6. 테스트 (org-shared, nps)
7. 웹 (api-client → team-shared page → NpsSurveyTrigger → layout 수정)
