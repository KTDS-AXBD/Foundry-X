---
code: FX-DSGN-S87
title: "Sprint 87 — 팀 계정 일괄 생성 + 온보딩 가이드 고도화"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S87]]"
---

# Sprint 87: 상세 설계

## §1. 개요

| 항목 | 내용 |
|------|------|
| Sprint | 87 |
| F-Items | F251 (팀 계정 일괄 생성), F252 (온보딩 가이드 고도화) |
| 영향 패키지 | api, web |
| 예상 변경 파일 | 13개 (신규 8, 수정 5) |

## §2. F251 — Bulk Signup API + 팀 시드

### 2.1 API 설계

**엔드포인트**: `POST /admin/bulk-signup`

```
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "orgId": "org_xxxxxxxx",
  "accounts": [
    { "email": "user@example.com", "name": "홍길동", "role": "admin" },
    ...
  ],
  "defaultPassword": "TempPass123!"  // optional, 미지정 시 자동생성
}
```

**응답** (201):
```json
{
  "created": 3,
  "skipped": 2,
  "failed": 0,
  "details": [
    { "email": "a@b.com", "status": "created", "tempPassword": "..." },
    { "email": "c@d.com", "status": "skipped", "reason": "already_member" }
  ]
}
```

**권한**: `roleGuard("admin")` — admin 이상만 호출 가능

### 2.2 Schema (`packages/api/src/schemas/admin.ts`)

```typescript
export const BulkAccountSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export const BulkSignupSchema = z.object({
  orgId: z.string().min(1),
  accounts: z.array(BulkAccountSchema).min(1).max(50),
  defaultPassword: z.string().min(8).optional(),
});

export const BulkSignupResultSchema = z.object({
  created: z.number(),
  skipped: z.number(),
  failed: z.number(),
  details: z.array(z.object({
    email: z.string(),
    status: z.enum(["created", "skipped", "failed"]),
    tempPassword: z.string().optional(),
    reason: z.string().optional(),
  })),
});
```

### 2.3 Service (`packages/api/src/services/admin-service.ts`)

```typescript
export class AdminService {
  constructor(private db: D1Database) {}

  async bulkSignup(params: {
    orgId: string;
    accounts: Array<{ email: string; name: string; role: string }>;
    defaultPassword?: string;
  }): Promise<BulkSignupResult>
}
```

로직:
1. 각 account에 대해 users 테이블에서 email 중복 확인
2. 존재하면 → org_members에 이미 있는지 확인 → 있으면 skip, 없으면 org 멤버 추가
3. 미존재 → users INSERT + org_members INSERT
4. 비밀번호: defaultPassword || `crypto.randomUUID().slice(0, 12) + "!A1"`
5. 결과 집계하여 반환

### 2.4 Route (`packages/api/src/routes/admin.ts`)

- `tenantGuard` + `roleGuard("admin")` 미들웨어 적용
- `app.route("/api", adminRoute)` 으로 app.ts에 등록

### 2.5 팀 시드 데이터 (`packages/api/src/db/seed/team-accounts.ts`)

```typescript
export const TEAM_ACCOUNTS = [
  { email: "minwon.seo@kt.com", name: "서민원", role: "admin" },
  { email: "kiwook.kim@kt.com", name: "김기욱", role: "admin" },
  { email: "jungwon.kim@kt.com", name: "김정원", role: "admin" },
  { email: "kyungim.lee@kt.com", name: "이경임", role: "member" },
  { email: "hyunwoo.park@kt.com", name: "박현우", role: "member" },
  { email: "jimin.choi@kt.com", name: "최지민", role: "member" },
  { email: "sungho.jung@kt.com", name: "정성호", role: "member" },
  { email: "axbd.shared@kt.com", name: "AX BD 공용", role: "member" },
];
```

> 실제 이메일은 API 호출 시 지정 — 시드 파일은 구조 예시

### 2.6 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| 1 | 8명 정상 생성 | created: 8, skipped: 0, failed: 0 |
| 2 | 3명 중 1명 기존 계정 | created: 2, skipped: 1 |
| 3 | 비-admin 요청 | 403 Forbidden |
| 4 | 빈 accounts 배열 | 400 Validation Error |
| 5 | email 형식 오류 | 400 Validation Error |
| 6 | 기존 유저가 org 미멤버 | created: 0, skipped: 0 (org 멤버로 추가) |

## §3. F252 — 온보딩 가이드 고도화

### 3.1 useUserRole 훅 (`packages/web/src/hooks/useUserRole.ts`)

```typescript
export function useUserRole(): { role: "admin" | "member" | "viewer"; isAdmin: boolean }
```

- localStorage의 JWT access token에서 role claim 추출
- 토큰 없으면 default "member"

### 3.2 OnboardingTour 역할별 분기

기존 `TOUR_STEPS` (6스텝)에 역할별 추가:

**Admin 추가 스텝** (기존 6 + 4 + 완료 1 = 11):
1. "⚙️ 팀 설정" — /settings에서 Org 설정, 멤버 관리
2. "🤖 에이전트 설정" — 팀 에이전트 커스터마이징
3. "📊 워크스페이스" — KPI, 워크플로우 분석
4. "🔑 토큰 관리" — API 토큰, SSO 설정

**Member 추가 스텝** (기존 6 + 1 + 완료 1 = 8):
1. "💬 도움이 필요할 때" — 업무 가이드/FAQ 안내

### 3.3 Getting Started 역할별 분기

`getting-started.tsx`에 역할 기반 조건부 렌더링:

```tsx
{isAdmin && <AdminQuickGuide />}
{!isAdmin && <MemberQuickStart />}
{/* 공통: 3대 업무 동선 카드 (기존 유지) */}
```

### 3.4 AdminQuickGuide 컴포넌트

3개 카드:
1. **팀 멤버 관리** — /settings → 멤버 탭으로 이동
2. **프로젝트 설정** — /projects → 새 프로젝트 생성
3. **에이전트 구성** — /agents → 에이전트 목록

### 3.5 MemberQuickStart 컴포넌트

3개 카드:
1. **첫 SR 처리하기** — /sr → SR 접수 흐름
2. **아이디어 등록하기** — /ax-bd/ideas → 아이디어 등록
3. **내 프로필 설정** — /settings → 프로필 수정

### 3.6 Web 테스트

| # | 시나리오 | 기대 결과 |
|---|---------|-----------|
| 1 | OnboardingTour admin 역할 | 10스텝 렌더링 |
| 2 | OnboardingTour member 역할 | 7스텝 렌더링 |
| 3 | AdminQuickGuide 렌더링 | 3카드 표시, 링크 정확 |
| 4 | MemberQuickStart 렌더링 | 3카드 표시, 링크 정확 |

## §4. 변경 파일 전체 목록

| # | 파일 | 동작 | F-Item |
|---|------|------|--------|
| 1 | `packages/api/src/schemas/admin.ts` | 신규 | F251 |
| 2 | `packages/api/src/routes/admin.ts` | 신규 | F251 |
| 3 | `packages/api/src/services/admin-service.ts` | 신규 | F251 |
| 4 | `packages/api/src/app.ts` | 수정 (import + route 등록) | F251 |
| 5 | `packages/api/src/db/seed/team-accounts.ts` | 신규 | F251 |
| 6 | `packages/api/src/__tests__/admin-bulk-signup.test.ts` | 신규 | F251 |
| 7 | `packages/web/src/hooks/useUserRole.ts` | 신규 | F252 |
| 8 | `packages/web/src/components/feature/OnboardingTour.tsx` | 수정 (역할별 분기) | F252 |
| 9 | `packages/web/src/routes/getting-started.tsx` | 수정 (역할별 섹션) | F252 |
| 10 | `packages/web/src/components/feature/AdminQuickGuide.tsx` | 신규 | F252 |
| 11 | `packages/web/src/components/feature/MemberQuickStart.tsx` | 신규 | F252 |
| 12 | `packages/web/src/__tests__/OnboardingTour.test.tsx` | 신규 | F252 |
| 13 | `packages/web/src/__tests__/AdminQuickGuide.test.tsx` | 신규 | F252 |

## §5. Worker 파일 매핑

단일 구현 (Worker 분할 불필요 — 변경 영역이 api/web으로 명확히 분리, 공유 충돌 없음)

| 순서 | 영역 | 파일 |
|------|------|------|
| 1 | API (F251) | #1~#6 |
| 2 | Web (F252) | #7~#13 |
