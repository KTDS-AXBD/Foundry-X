---
code: FX-PLAN-S87
title: "Sprint 87 — 팀 계정 일괄 생성 + 온보딩 가이드 고도화"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 87: 팀 계정 일괄 생성 + 온보딩 가이드 고도화

## 목표

Phase 9 온보딩 기반을 구축하여 AX BD팀 7명 + 공용계정 1개 = **8계정**을 일괄 생성하고, 역할별 맞춤 온보딩 가이드를 제공해요.

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F251 | 팀 계정 일괄 생성 + Org 초대 | P0 | Signup API 활용, admin/member 역할 배정 |
| F252 | 온보딩 가이드 고도화 | P1 | F172 OnboardingTour + F242 ProcessStageGuide 기반 |

## 실행 계획

### F251: 팀 계정 일괄 생성 + Org 초대

#### Step 1: Bulk Signup API 엔드포인트 (~15분)

1. `packages/api/src/schemas/admin.ts` — `BulkSignupSchema` (email[], name[], role[], orgId)
2. `packages/api/src/routes/admin.ts` — `POST /admin/bulk-signup` (admin 전용)
   - 트랜잭션으로 N명 생성 + org_members 자동 등록
   - 중복 email은 스킵 (기존 계정이면 org 초대만)
   - 응답: 성공/스킵/실패 count + 상세 목록
3. `packages/api/src/services/admin-service.ts` — `BulkSignupService`
   - hashPassword, crypto.randomUUID, OrgService.createInvitation 재사용

#### Step 2: 팀 계정 데이터 + CLI 스크립트 (~10분)

1. `packages/api/src/db/seed/team-accounts.ts` — 8계정 정의 (admin 3명 + member 4명 + shared 1명)
   - 서민원/김기욱/김정원 = admin
   - 나머지 4명 = member
   - 공용계정 = member
2. `tools/seed-team.ts` — API 호출 스크립트 (CI/로컬 겸용)

#### Step 3: 테스트 (~10분)

1. `packages/api/src/__tests__/admin-bulk-signup.test.ts`
   - 정상 생성 (8명)
   - 중복 email 스킵
   - 비-admin 요청 403
   - 잘못된 email 형식 400

### F252: 온보딩 가이드 고도화

#### Step 4: 역할별 온보딩 분기 (~15분)

1. `packages/web/src/components/feature/OnboardingTour.tsx` 확장
   - TOUR_STEPS를 역할(admin/member)별로 분기
   - admin: 설정→팀관리→에이전트→프로세스 (4스텝 추가)
   - member: 기존 6스텝 + "도움 요청" 스텝
2. `packages/web/src/hooks/useUserRole.ts` — 현재 유저 역할 훅 (JWT decode)

#### Step 5: Getting Started 페이지 역할별 강화 (~15분)

1. `packages/web/src/routes/getting-started.tsx` 수정
   - admin 전용 섹션: "팀 관리 퀵가이드" (멤버 초대, 역할 변경, 프로젝트 설정)
   - member 전용 섹션: "첫 업무 시작하기" (SR 처리, 아이디어 등록)
   - 공통 섹션: 기존 3대 업무 동선 유지
2. `packages/web/src/components/feature/AdminQuickGuide.tsx` — admin 전용 가이드 카드
3. `packages/web/src/components/feature/MemberQuickStart.tsx` — member 전용 시작 가이드

#### Step 6: 테스트 (~10분)

1. `packages/web/src/__tests__/OnboardingTour.test.tsx` — 역할별 스텝 수 검증
2. `packages/web/src/__tests__/AdminQuickGuide.test.tsx` — 렌더링 검증
3. `packages/api/src/__tests__/admin-bulk-signup.test.ts` 보강 (E2E 시나리오)

## 기술 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| Bulk Signup 방식 | Admin API 단일 호출 | 개별 signup 반복보다 트랜잭션 안전, audit 용이 |
| 비밀번호 초기값 | 임시 비밀번호 생성 후 이메일 전송 or 첫 로그인 시 설정 | 보안 + UX 균형 |
| 역할별 온보딩 | JWT role 기반 분기 | 기존 인프라 활용, 추가 API 불필요 |

## 예상 변경 파일

### API (F251)
- `packages/api/src/schemas/admin.ts` (신규)
- `packages/api/src/routes/admin.ts` (신규)
- `packages/api/src/services/admin-service.ts` (신규)
- `packages/api/src/app.ts` (라우트 등록)
- `packages/api/src/db/seed/team-accounts.ts` (신규)
- `packages/api/src/__tests__/admin-bulk-signup.test.ts` (신규)

### Web (F252)
- `packages/web/src/components/feature/OnboardingTour.tsx` (수정)
- `packages/web/src/hooks/useUserRole.ts` (신규)
- `packages/web/src/routes/getting-started.tsx` (수정)
- `packages/web/src/components/feature/AdminQuickGuide.tsx` (신규)
- `packages/web/src/components/feature/MemberQuickStart.tsx` (신규)
- `packages/web/src/__tests__/OnboardingTour.test.tsx` (신규)
- `packages/web/src/__tests__/AdminQuickGuide.test.tsx` (신규)

### Tools
- `tools/seed-team.ts` (신규)

## 위험 요소

| 위험 | 대응 |
|------|------|
| D1 bulk insert 성능 | 8건이므로 무시 가능, 100건+ 시 batch 분할 |
| 임시 비밀번호 유출 | 스크립트 실행 후 콘솔 출력만, 로그 미저장 |
| 역할 없는 기존 유저 | default "member" 폴백 |
