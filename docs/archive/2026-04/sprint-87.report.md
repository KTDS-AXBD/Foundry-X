---
code: FX-RPRT-S87
title: "Sprint 87 완료 보고서 — 팀 계정 일괄 생성 + 온보딩 가이드 고도화"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S87]], [[FX-DSGN-S87]]"
---

# Sprint 87 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F251 팀 계정 일괄 생성 + F252 온보딩 가이드 고도화 |
| 시작일 | 2026-03-31 |
| 완료일 | 2026-03-31 |
| Match Rate | **97%** |

### Results

| 지표 | 값 |
|------|-----|
| 신규 파일 | 8개 |
| 수정 파일 | 5개 |
| API 테스트 | 2119 → **2125** (+6) |
| Web 테스트 | 207 + 9 = **216** (신규 2파일 9테스트) |
| Typecheck | Pass |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 팀 온보딩 시 개별 계정 생성이 번거롭고, 역할별 가이드가 없어 혼란 |
| Solution | Admin-only Bulk Signup API + 역할별 OnboardingTour/Getting Started 분기 |
| Function/UX Effect | 8계정 일괄 생성 (1 API call), admin/member별 맞춤 온보딩 경험 |
| Core Value | Phase 9 팀 온보딩 기반 완성, 실사용 진입 장벽 대폭 감소 |

## F251: 팀 계정 일괄 생성

### 구현 내역

| 파일 | 설명 |
|------|------|
| `packages/api/src/schemas/admin.ts` | BulkSignup Zod 스키마 (accounts 배열, orgId, defaultPassword) |
| `packages/api/src/routes/admin.ts` | POST /admin/bulk-signup (roleGuard admin) |
| `packages/api/src/services/admin-service.ts` | 중복 확인 + 생성/스킵 로직 |
| `packages/api/src/app.ts` | adminRoute 등록 |
| `packages/api/src/db/seed/team-accounts.ts` | 8계정 시드 데이터 |

### 테스트 (6개)

1. 다중 계정 정상 생성 (3명)
2. 이미 org 멤버인 유저 스킵
3. 비-admin 403 거부
4. 빈 accounts 배열 400
5. 잘못된 email 형식 400
6. 기존 유저를 org에 추가 (added_to_org)

## F252: 온보딩 가이드 고도화

### 구현 내역

| 파일 | 설명 |
|------|------|
| `packages/web/src/hooks/useUserRole.ts` | JWT role claim 기반 역할 훅 |
| `packages/web/src/components/feature/OnboardingTour.tsx` | 역할별 투어 스텝 분기 (admin 11, member 8) |
| `packages/web/src/routes/getting-started.tsx` | 역할별 가이드 섹션 추가 |
| `packages/web/src/components/feature/AdminQuickGuide.tsx` | admin 전용 3카드 가이드 |
| `packages/web/src/components/feature/MemberQuickStart.tsx` | member 전용 3카드 시작 가이드 |

### 테스트 (9개)

1. Admin 투어 11스텝 확인
2. Member 투어 8스텝 확인
3. Admin 투어에 settings/agents/tokens 포함
4. Member 투어에 admin 전용 스텝 미포함
5. 양쪽 투어 모두 getting-started로 시작
6. AdminQuickGuide 3카드 렌더링
7. AdminQuickGuide 헤딩 렌더링
8. MemberQuickStart 3카드 렌더링
9. MemberQuickStart 헤딩 렌더링

## Gap Analysis

| Category | Score |
|----------|-------|
| File Existence | 13/13 (100%) |
| Design Match | 95% |
| Test Coverage | 100% |
| **Overall** | **97%** |

차이점: OnboardingTour FINISH_STEP 추가 (Design 대비 각 1스텝 증가), admin 추가 스텝 내용을 실제 사이드바 메뉴에 맞춰 조정. 모두 Design에 소급 반영 완료.

## 기술적 발견

- 이 프로젝트의 Button 컴포넌트는 CVA 기반 (Radix Slot/asChild 미지원) → Link 직접 사용
- tenantGuard가 DB role을 JWT orgRole보다 우선 → 403 테스트 시 DB에 적절한 role 설정 필수
