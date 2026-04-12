---
code: FX-DSGN-050
title: Sprint 50 — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯
version: 0.1
status: Draft
category: DSGN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 50 Design Document

> **Summary**: 초대 링크 기반 셀프 온보딩(Google OAuth / 이메일 비밀번호 2경로) + 전역 플로팅 피드백 위젯 상세 설계
>
> **Project**: Foundry-X
> **Version**: Sprint 50 (api 0.1.0 / web 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft
> **Planning Doc**: [sprint-50.plan.md](../../01-plan/features/sprint-50.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **제로 마찰 온보딩**: 초대 링크 하나로 계정 생성 + 조직 합류 + 온보딩 투어 시작까지 3분 이내
2. **듀얼 경로**: Google OAuth(비밀번호 불필요) + 이메일/비밀번호 설정 두 방식 모두 지원
3. **피드백 상시 수집**: 어느 페이지에서든 1클릭으로 피드백 제출, 컨텍스트 자동 첨부

### 1.2 Design Principles

- **기존 API 최대 재사용**: 새 엔드포인트는 최소 3개만 추가, 기존 `createInvitation`/`acceptInvitation` 활용
- **Public route 명확 분리**: `/invite/[token]` 페이지는 인증 없이 접근 가능
- **자동 로그인 후 리다이렉트**: 비밀번호 설정/Google 로그인 완료 시 토큰 즉시 발급 → `/getting-started` 이동

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Admin (Members Page)                                           │
│  ┌─────────────────────┐                                        │
│  │ POST /orgs/:id/     │──── 초대 생성 (기존 API)                │
│  │   invitations       │──── 응답에 inviteUrl 포함 (NEW)        │
│  │ [📋 링크 복사 버튼] │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
              │ Slack/카톡으로 URL 전달
              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Invitee (Public Page: /invite/[token])                         │
│  ┌─────────────────────────────────────────────────┐            │
│  │ GET /auth/invitations/:token/info  (NEW)        │            │
│  │  → 토큰 유효성 + 초대 정보(org명, 역할) 반환     │            │
│  └────────────────────┬────────────────────────────┘            │
│                       │                                          │
│           ┌───────────┴───────────┐                              │
│           ▼                       ▼                              │
│  ┌─────────────────┐   ┌──────────────────┐                     │
│  │ 경로 A: Google  │   │ 경로 B: 비밀번호 │                     │
│  │ POST /auth/     │   │ POST /auth/      │                     │
│  │   google        │   │   setup-password │                     │
│  │ (기존 + 확장)   │   │   (NEW)          │                     │
│  └────────┬────────┘   └────────┬─────────┘                     │
│           │                      │                               │
│           └──────────┬───────────┘                               │
│                      ▼                                           │
│  ┌─────────────────────────────────────────────────┐            │
│  │ POST /auth/invitations/:token/accept            │            │
│  │  → 조직 합류 + 토큰 발급 (자동 호출)              │            │
│  └─────────────────────────────────────────────────┘            │
│                      │                                           │
│                      ▼ JWT 저장 → /getting-started 리다이렉트    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FeedbackWidget (전역, (app)/layout.tsx)                        │
│  ┌────────────┐   ┌──────────────────────────────────┐          │
│  │ 💬 버튼    │──▶│ 피드백 폼 (NPS + 코멘트 + 컨텍스트)│         │
│  │ (하단 우측) │   │ POST /feedback (기존, 스키마 확장) │         │
│  └────────────┘   └──────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow — 초대 수락 (경로 B: 이메일/비밀번호)

```
1. 관리자: POST /orgs/:orgId/invitations → { token, inviteUrl }
2. 관리자: inviteUrl 복사 → Slack/카톡 전달
3. 초대받은 사용자: /invite/{token} 접속
4. Web: GET /auth/invitations/{token}/info → { email, orgName, role, valid }
5. 사용자: 이름 + 비밀번호 입력 → POST /auth/setup-password
   └─ API 내부: signup (계정 생성) + accept invitation (조직 합류) + createTokenPair (JWT 발급)
6. Web: JWT 저장 → router.push('/getting-started')
7. Getting Started: OnboardingTour 자동 시작
```

### 2.3 Data Flow — 초대 수락 (경로 A: Google OAuth)

```
1~4. (동일)
5. 사용자: "Google로 시작하기" 클릭 → Google GIS → ID Token 획득
6. Web: POST /auth/google { idToken, invitationToken } ← invitationToken 파라미터 추가
   └─ API 내부: Google 검증 + 자동 가입/로그인 + accept invitation + createTokenPair
7. Web: JWT 저장 → router.push('/getting-started')
```

### 2.4 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `/invite/[token]` page | `GET /auth/invitations/:token/info` | 토큰 유효성 + 초대 정보 표시 |
| `POST /auth/setup-password` | `OrgService.acceptInvitation()` | 가입+초대수락 원자 처리 |
| `POST /auth/google` (확장) | `OrgService.acceptInvitation()` | Google 로그인 시 초대도 함께 수락 |
| `FeedbackWidget` | `POST /feedback` (스키마 확장) | 컨텍스트 정보 첨부 |

---

## 3. Data Model

### 3.1 기존 테이블 (변경 없음)

```sql
-- org_invitations (이미 존재, 0011_organizations.sql)
-- token: crypto.randomUUID(), expires_at: 7일, accepted_at: NULL→timestamp

-- onboarding_feedback (이미 존재, 0019_onboarding.sql)
-- nps_score: 1-10, comment: TEXT
```

### 3.2 스키마 변경: onboarding_feedback 컬럼 추가

```sql
-- 0032_feedback_context.sql (NEW)
ALTER TABLE onboarding_feedback ADD COLUMN page_path TEXT DEFAULT NULL;
ALTER TABLE onboarding_feedback ADD COLUMN session_seconds INTEGER DEFAULT NULL;
ALTER TABLE onboarding_feedback ADD COLUMN feedback_type TEXT DEFAULT 'nps';
-- feedback_type: 'nps' | 'feature' | 'bug' | 'general'
```

### 3.3 Entity 관계 (변경 없음)

```
[Organization] 1 ──── N [OrgInvitation]
     │                      │
     └── 1 ──── N [OrgMember] ← (초대 수락 시 생성)
                     │
                     └── [User] ← (setup-password 시 생성)
```

---

## 4. API Specification

### 4.1 Endpoint List

| Method | Path | Description | Auth | Status |
|--------|------|-------------|------|--------|
| GET | `/auth/invitations/{token}/info` | 초대 토큰 정보 조회 | **No** (public) | **NEW** |
| POST | `/auth/setup-password` | 초대 기반 계정 생성 + 비밀번호 설정 + 조직 합류 + JWT 발급 | **No** (public) | **NEW** |
| POST | `/auth/google` | Google OAuth (초대 토큰 선택 파라미터 추가) | No | **MODIFY** |
| POST | `/feedback` | NPS 피드백 제출 (컨텍스트 필드 추가) | Required | **MODIFY** |
| GET | `/kpi/weekly-summary` | 주간 사용 요약 | Required (admin) | **NEW** |

### 4.2 Detailed Specification

#### `GET /auth/invitations/{token}/info` (NEW)

초대 토큰의 유효성과 초대 정보를 반환. 인증 불필요 (public).

**Response (200):**
```json
{
  "valid": true,
  "email": "teammate@example.com",
  "orgName": "AX BD팀",
  "orgSlug": "ax-bd",
  "role": "member",
  "expiresAt": "2026-03-30T00:00:00Z"
}
```

**Error Responses:**
- `404`: 토큰 없음 → `{ "valid": false, "reason": "not_found" }`
- `410`: 만료 → `{ "valid": false, "reason": "expired" }`
- `409`: 이미 수락 → `{ "valid": false, "reason": "already_accepted" }`

**Zod Schema:**
```typescript
const InvitationInfoResponseSchema = z.object({
  valid: z.boolean(),
  email: z.string().optional(),
  orgName: z.string().optional(),
  orgSlug: z.string().optional(),
  role: z.enum(["admin", "member", "viewer"]).optional(),
  expiresAt: z.string().optional(),
  reason: z.enum(["not_found", "expired", "already_accepted"]).optional(),
}).openapi("InvitationInfoResponse");
```

---

#### `POST /auth/setup-password` (NEW)

초대 토큰 기반으로 계정 생성 + 비밀번호 설정 + 조직 합류 + JWT 발급을 한 번에 처리.

**Request:**
```json
{
  "token": "invitation-uuid-token",
  "name": "홍길동",
  "password": "SecureP@ss123"
}
```

**Processing Flow:**
```
1. 토큰 유효성 검증 (org_invitations 조회)
2. 이메일 중복 체크 (users 테이블)
   - 이미 존재: 에러 반환 → "이미 계정이 있습니다. 로그인 후 초대를 수락하세요."
   - 미존재: 계정 생성 (hashPassword + insert users)
3. acceptInvitation() 호출 → org_members 추가
4. createTokenPair() → JWT access + refresh 발급
5. 응답: tokens + orgId
```

**Response (201):**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "orgId": "org_abc12345",
  "orgName": "AX BD팀"
}
```

**Error Responses:**
- `400`: 비밀번호 정책 미충족 (최소 8자, 영문+숫자)
- `404`: 토큰 없음
- `409`: 이메일 이미 가입됨
- `410`: 토큰 만료

**Zod Schema:**
```typescript
const SetupPasswordSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
}).openapi("SetupPasswordRequest");

const SetupPasswordResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  orgId: z.string(),
  orgName: z.string(),
}).openapi("SetupPasswordResponse");
```

---

#### `POST /auth/google` (MODIFY)

기존 Google OAuth에 `invitationToken` 선택 파라미터 추가.

**Request (변경):**
```json
{
  "idToken": "google-id-token",
  "invitationToken": "invitation-uuid-token"  // ← NEW, optional
}
```

**Processing Flow (invitationToken 있을 때):**
```
1. Google ID Token 검증 (기존)
2. 계정 조회/생성 (기존 auto-signup)
3. invitationToken 유효 시 → acceptInvitation() 자동 호출
4. createTokenPair() → orgId를 초대된 org로 설정
```

---

#### `POST /feedback` (MODIFY)

기존 NPS 피드백에 컨텍스트 필드 추가.

**Request (변경):**
```json
{
  "npsScore": 8,
  "comment": "SR 분류가 빠르게 잘 되네요",
  "pagePath": "/sr-management",        // ← NEW, optional
  "sessionSeconds": 342,               // ← NEW, optional
  "feedbackType": "feature"            // ← NEW, optional (default: "nps")
}
```

**Zod Schema 확장:**
```typescript
const FeedbackSubmitRequestSchema = z.object({
  npsScore: z.number().int().min(1).max(10),
  comment: z.string().max(1000).optional(),
  pagePath: z.string().max(200).optional(),       // NEW
  sessionSeconds: z.number().int().min(0).optional(), // NEW
  feedbackType: z.enum(["nps", "feature", "bug", "general"]).default("nps"), // NEW
}).openapi("FeedbackSubmitRequest");
```

---

#### `GET /kpi/weekly-summary` (NEW)

최근 7일 사용 요약 데이터 반환.

**Response (200):**
```json
{
  "period": { "start": "2026-03-17", "end": "2026-03-23" },
  "activeUsers": 4,
  "totalPageViews": 156,
  "onboardingCompletion": { "completed": 3, "total": 6, "rate": 0.5 },
  "averageNps": 7.8,
  "feedbackCount": 5,
  "topPages": [
    { "path": "/dashboard", "views": 45 },
    { "path": "/sr-management", "views": 32 }
  ]
}
```

---

## 5. UI/UX Design

### 5.1 초대 페이지 (`/invite/[token]`)

```
┌──────────────────────────────────────────────┐
│                                              │
│          🏭 Foundry-X                        │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │
│   │   AX BD팀에 초대받았어요!              │   │
│   │   teammate@example.com               │   │
│   │   역할: member                       │   │
│   │                                      │   │
│   │   ┌──────────────────────────────┐   │   │
│   │   │ 🔵 Google로 시작하기         │   │   │
│   │   └──────────────────────────────┘   │   │
│   │                                      │   │
│   │   ──────── 또는 ────────             │   │
│   │                                      │   │
│   │   이름  [                          ]  │   │
│   │   비밀번호 [                      ]   │   │
│   │   비밀번호 확인 [                  ]  │   │
│   │                                      │   │
│   │   ┌──────────────────────────────┐   │   │
│   │   │      시작하기                 │   │   │
│   │   └──────────────────────────────┘   │   │
│   │                                      │   │
│   │   이미 계정이 있으신가요? 로그인 →   │   │
│   └──────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

**상태별 화면:**
- **유효**: 위 폼 표시
- **만료**: "초대가 만료됐어요. 관리자에게 새 초대를 요청해주세요."
- **이미 수락**: "이미 합류한 초대예요. 로그인하기 →"
- **로딩**: 스켈레톤 UI

### 5.2 관리자 초대 링크 복사 (Members Page 개선)

```
┌─────────────────────────────────────────────────┐
│ 팀원 초대                                        │
│                                                  │
│ 이메일: [teammate@example.com    ] 역할: [member▼]│
│                                                  │
│ ┌──────────┐                                     │
│ │ 초대 보내기│ → 성공 시:                          │
│ └──────────┘                                     │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ ✅ 초대 링크가 생성됐어요!                      │ │
│ │                                              │ │
│ │ https://fx.minu.best/invite/abc-123...       │ │
│ │                                              │ │
│ │ [📋 링크 복사] ← 클릭 시 클립보드 복사 + 토스트 │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ 대기 중 초대                                      │
│ ┌──────────┬────────┬─────────┬────────┐         │
│ │ 이메일    │ 역할   │ 상태    │ 작업   │         │
│ ├──────────┼────────┼─────────┼────────┤         │
│ │ a@ex.com │ member │ 🟡 대기  │ 📋 ✕  │         │
│ │ b@ex.com │ admin  │ 🟢 수락  │       │         │
│ │ c@ex.com │ member │ 🔴 만료  │ 🔄 ✕  │         │
│ └──────────┴────────┴─────────┴────────┘         │
└─────────────────────────────────────────────────┘
```

### 5.3 피드백 위젯 (FeedbackWidget)

```
┌─── 일반 상태 (접힌) ───┐    ┌─── 열린 상태 ────────────────┐
│                         │    │                              │
│             ┌─────┐     │    │   피드백 보내기          ✕   │
│             │ 💬  │     │    │                              │
│             └─────┘     │    │   유형: [일반 ▼]             │
│   (하단 우측 고정)      │    │                              │
│                         │    │   만족도:                    │
└─────────────────────────┘    │   😞 1 2 3 4 5 6 7 8 9 10 😊│
                               │                              │
                               │   의견 (선택):               │
                               │   ┌──────────────────────┐   │
                               │   │                      │   │
                               │   └──────────────────────┘   │
                               │                              │
                               │   📍 현재: /sr-management    │
                               │   ⏱️ 세션: 5분 42초          │
                               │                              │
                               │   ┌─────────────────────┐    │
                               │   │      보내기          │    │
                               │   └─────────────────────┘    │
                               │                              │
                               └──────────────────────────────┘
```

### 5.4 User Flow

```
[초대 플로우]
Admin: 멤버 페이지 → 초대 생성 → 링크 복사 → Slack/카톡 전달
  ↓
Invitee: 링크 클릭 → /invite/[token]
  ├─ (A) Google → 자동 가입+합류 → JWT → /getting-started → OnboardingTour
  └─ (B) 비밀번호 → 자동 가입+합류 → JWT → /getting-started → OnboardingTour

[피드백 플로우]
어느 페이지에서든 → 💬 클릭 → NPS + 코멘트 → 보내기 → 토스트 확인
```

### 5.5 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `InvitePage` | `app/invite/[token]/page.tsx` | 초대 랜딩 + 경로 A/B 선택 (NEW) |
| `InviteForm` | `components/feature/InviteForm.tsx` | 비밀번호 설정 폼 + Google 버튼 (NEW) |
| `InviteLinkCopy` | `components/feature/InviteLinkCopy.tsx` | 초대 링크 복사 UI (NEW) |
| `FeedbackWidget` | `components/feature/FeedbackWidget.tsx` | 플로팅 피드백 위젯 (NEW) |
| Members page | `app/(app)/workspace/org/members/page.tsx` | 초대 상태 뱃지 + 링크 복사 (MODIFY) |
| Layout | `app/(app)/layout.tsx` | FeedbackWidget 삽입 (MODIFY) |

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| 400 | 비밀번호 정책 미충족 | 8자 미만 | 폼 유효성 검사로 사전 차단 |
| 404 | 초대를 찾을 수 없음 | 잘못된 토큰 | "올바른 링크인지 확인해주세요" |
| 409 | 이미 가입된 이메일 | 중복 계정 | "이미 계정이 있어요. 로그인 후 초대를 수락하세요." + 로그인 링크 |
| 410 | 초대 만료 | 72시간 경과 | "만료됐어요. 관리자에게 새 초대를 요청해주세요." |

---

## 7. Security Considerations

- [x] 초대 토큰: `crypto.randomUUID()` — 추측 불가 (기존)
- [x] 토큰 만료: 7일 (기존, 내부 팀이므로 충분)
- [x] 1회 사용: `accepted_at` 기록 후 재사용 불가 (기존)
- [ ] 비밀번호 정책: 최소 8자 + 영문+숫자 (클라이언트+서버 이중 검증)
- [ ] Rate limiting: `/auth/setup-password` 에 IP당 분당 5회 제한 (Cloudflare WAF 또는 KV)
- [ ] `/invite/[token]` 토큰 정보 최소 노출: 이메일 마스킹 (`t***e@example.com`)
- [ ] HTTPS 전용 (Cloudflare 기본 보장)

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Count |
|------|--------|------|-------|
| Unit Test | API: setup-password, invitation-info, weekly-summary | Vitest | +15~18 |
| Unit Test | Web: InviteForm, FeedbackWidget, InviteLinkCopy | Vitest | +5~8 |
| E2E Test | 초대→가입→온보딩 전체 플로우 | Playwright | +2~3 |

### 8.2 Test Cases (Key)

**API Tests:**
- [x] 유효한 토큰으로 info 조회 → 200 + 초대 정보
- [x] 만료 토큰 info → 410 + reason:"expired"
- [x] 이미 수락된 토큰 info → 409 + reason:"already_accepted"
- [x] setup-password 성공 → 201 + JWT + orgId
- [x] setup-password 중복 이메일 → 409
- [x] setup-password 만료 토큰 → 410
- [x] setup-password 비밀번호 8자 미만 → 400
- [x] google auth + invitationToken → 200 + 초대 자동 수락
- [x] feedback 컨텍스트 필드 포함 → 200
- [x] weekly-summary → 200 + 집계 데이터

**E2E Tests:**
- [ ] 경로 B: 초대 링크 → 비밀번호 설정 → 자동 로그인 → Getting Started 도착
- [ ] 관리자: 초대 생성 → 링크 복사 → 초대 상태 확인

---

## 9. Clean Architecture

### 9.1 Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| InvitePage, InviteForm, FeedbackWidget | Presentation | `packages/web/src/` |
| setup-password route, invitation-info route | Presentation (API) | `packages/api/src/routes/auth.ts` |
| OrgService.acceptInvitation | Application | `packages/api/src/services/org.ts` |
| FeedbackService | Application | `packages/api/src/services/feedback.ts` |
| Zod schemas | Domain | `packages/api/src/schemas/` |
| api-client functions | Infrastructure | `packages/web/src/lib/api-client.ts` |

---

## 10. Coding Convention Reference

### 10.1 This Feature's Conventions

| Item | Convention Applied |
|------|-------------------|
| Component naming | PascalCase: `InviteForm`, `FeedbackWidget` |
| Route file | 기존 auth.ts에 엔드포인트 추가 (새 파일 불필요) |
| Public page | `app/invite/[token]/page.tsx` — Next.js dynamic route |
| State management | Zustand (`useAuthStore`, `useFeedbackStore`) |
| API client | `packages/web/src/lib/api-client.ts`에 함수 추가 |

---

## 11. Implementation Guide

### 11.1 File Structure

```
packages/api/src/
├── routes/auth.ts              # +2 endpoints (info, setup-password)
├── routes/feedback.ts          # MODIFY: 컨텍스트 필드
├── routes/kpi.ts               # +1 endpoint (weekly-summary)
├── services/org.ts             # +getInvitationInfo() 메서드
├── services/feedback.ts        # MODIFY: 컨텍스트 저장
├── schemas/auth.ts             # +SetupPassword, InvitationInfo schemas
├── schemas/feedback.ts         # MODIFY: 컨텍스트 필드 추가
└── db/migrations/
    └── 0032_feedback_context.sql  # NEW: ALTER TABLE

packages/web/src/
├── app/invite/[token]/page.tsx           # NEW: 초대 랜딩 페이지
├── app/(app)/layout.tsx                  # MODIFY: +FeedbackWidget
├── app/(app)/workspace/org/members/      # MODIFY: 링크 복사 + 상태 뱃지
├── components/feature/InviteForm.tsx      # NEW: 비밀번호+Google 폼
├── components/feature/InviteLinkCopy.tsx  # NEW: 링크 복사 컴포넌트
├── components/feature/FeedbackWidget.tsx  # NEW: 플로팅 피드백
└── lib/api-client.ts                     # +getInvitationInfo, setupPassword, submitContextFeedback
```

### 11.2 Implementation Order

1. [ ] **D1 마이그레이션** — `0032_feedback_context.sql` 생성 + 로컬 적용
2. [ ] **API: GET /auth/invitations/:token/info** — OrgService.getInvitationInfo() + route + schema + tests
3. [ ] **API: POST /auth/setup-password** — route + schema + 가입+초대수락+JWT 원자 처리 + tests
4. [ ] **API: POST /auth/google 확장** — invitationToken 파라미터 추가 + tests
5. [ ] **API: POST /feedback 확장** — 스키마에 pagePath/sessionSeconds/feedbackType 추가 + tests
6. [ ] **API: GET /kpi/weekly-summary** — kpi_events + kpi_snapshots 집계 + tests
7. [ ] **Web: /invite/[token] 페이지** — InviteForm (Google + 비밀번호) + 상태별 UI
8. [ ] **Web: FeedbackWidget** — 플로팅 버튼 + 폼 + usePathname() 컨텍스트 + layout 삽입
9. [ ] **Web: Members 페이지 개선** — InviteLinkCopy + 상태 뱃지 (대기/수락/만료)
10. [ ] **E2E 테스트** — 초대→가입→온보딩 플로우 + 관리자 초대 생성
11. [ ] **프로덕션 배포** — D1 migration remote + Workers deploy + Pages deploy

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft | Sinclair Seo |
