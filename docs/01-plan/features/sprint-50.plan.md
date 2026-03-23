---
code: FX-PLAN-050
title: Sprint 50 — 팀원 셀프 온보딩 플로우 + 인앱 피드백 강화
version: 0.1
status: Draft
category: PLAN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 50 Planning Document

> **Summary**: 내부 팀원 6명이 초대 링크만으로 비밀번호를 설정하고 즉시 대시보드를 사용할 수 있는 셀프 온보딩 플로우를 완성하고, 어디서든 피드백을 남길 수 있는 인앱 위젯을 제공하여 Phase 5 Conditional #4(Adoption 데이터 수집)를 실질적으로 해소한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 50 (api 0.1.0 / web 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 초대 API와 온보딩 UI가 각각 존재하지만 연결되지 않음 — 초대 토큰을 전달할 방법이 없고, 비밀번호 설정 페이지가 없어 실 사용자가 접속할 수 없다. 피드백은 Getting Started 페이지에서만 가능하여 일상 사용 중 수집이 불가. |
| **Solution** | F173: 초대 링크 생성→복사→비밀번호 설정 페이지→자동 로그인→온보딩 투어 E2E 플로우 구현. F174: 플로팅 피드백 위젯 + 컨텍스트별 NPS + 주간 사용 요약 자동 생성. |
| **Function/UX Effect** | 관리자가 초대 링크를 1클릭으로 복사하여 Slack/메일로 전달 → 팀원이 링크 접속 → 비밀번호 설정 → 자동 로그인 → 온보딩 투어 시작. 어떤 페이지에서든 피드백 버튼으로 즉시 의견 제출 가능. |
| **Core Value** | "초대 링크 하나면 3분 안에 팀원이 온보딩 완료" — 채택 장벽을 제로로 만들어 Phase 5 Adoption 데이터 수집을 본격 시작 |

---

## 1. Overview

### 1.1 Purpose

Phase 5 Conditional #4(Adoption 데이터 수집)의 **실질적 해소**를 위해, 내부 팀원 6명이 **관리자 도움 없이** 스스로 계정을 활성화하고 대시보드를 사용 시작할 수 있는 E2E 온보딩 플로우를 구축한다. 동시에, 사용 과정에서 발생하는 피드백을 실시간으로 수집하여 서비스 개선 루프를 가동한다.

### 1.2 Background

- **기존 인프라 (Sprint 29~49)**:
  - ✅ 초대 관리 API: `POST /orgs/:orgId/invitations`, `POST /auth/invitations/:token/accept`
  - ✅ 온보딩 API: progress 3개 + feedback 2개 엔드포인트
  - ✅ Getting Started 페이지: 체크리스트 + FAQ + NPS 폼
  - ✅ OnboardingTour: 6스텝 가이드 투어 (Sprint 49 F172)
  - ✅ KPI 자동 수집: 페이지뷰 + CLI 로깅 + Cron 집계 (Sprint 45)
  - ✅ Adoption KPI 대시보드 (Sprint 47 F170)
- **빠진 연결 고리**:
  - ❌ 초대 토큰 전달 메커니즘 (이메일/링크 복사)
  - ❌ 비밀번호 설정 페이지 (`/setup-password?token=xxx`)
  - ❌ 초대 수락 후 자동 로그인 + 투어 자동 시작
  - ❌ 페이지 전역 피드백 위젯 (Getting Started에만 NPS 폼 존재)
  - ❌ 주간 사용 요약 리포트 자동 생성
- **Conditional #4**: "내부 6명 실제 온보딩 시작" — 시드 데이터는 준비됐지만 실 접속 0명

### 1.3 Related Documents

- SPEC.md §5: F173, F174 (신규 등록 예정)
- PRD v8: `docs/specs/prd-v8-final.md`
- Sprint 29 Plan: Getting Started + 피드백 (archived)
- Sprint 49 Plan: IA 재설계 + 온보딩 투어 (`docs/01-plan/features/sprint-49.plan.md`)

---

## 2. Scope

### 2.1 In Scope

- [ ] F173: 초대 링크 생성 UI + 복사 버튼 (관리자 화면)
- [ ] F173: 비밀번호 설정 페이지 (`/invite/[token]`)
- [ ] F173: 초대 수락 → 자동 로그인 → Getting Started 리다이렉트
- [ ] F173: 초대 상태 표시 (대기중/수락/만료) UI 개선
- [ ] F174: 플로팅 피드백 위젯 (전역, 모든 페이지에서 접근)
- [ ] F174: 컨텍스트 정보 자동 첨부 (현재 페이지, 사용 시간)
- [ ] F174: 주간 사용 요약 API (`GET /api/kpi/weekly-summary`)
- [ ] 운영: Sprint 48~49 코드 Workers/Pages 프로덕션 배포

### 2.2 Out of Scope

- 이메일 발송 서비스 연동 (SendGrid/Resend 등) — 현재 단계에서는 링크 복사 방식 우선
- 비밀번호 재설정 (Password Reset) — Sprint 51+ 후속
- 외부 고객 초대 (F117) — 내부 팀 완료 후
- 역할별 온보딩 분기 — 현재 6명 동일 역할, 필요 시 후속
- 자동 리마인더 알림 — Slack 연동은 있으나 온보딩 리마인더는 후속

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 관리자가 초대 생성 시 고유 URL이 생성되고 1클릭 복사 가능 | High | Pending |
| FR-02 | 초대 링크 접속 시 비밀번호 설정 폼 표시 (토큰 유효성 검증 포함) | High | Pending |
| FR-03 | 비밀번호 설정 완료 시 자동 로그인 + /getting-started 리다이렉트 | High | Pending |
| FR-04 | 초대 토큰 만료(72시간) 시 안내 메시지 + 재발급 요청 안내 | Medium | Pending |
| FR-05 | 멤버 목록에서 초대 상태(대기/수락/만료) 실시간 표시 | Medium | Pending |
| FR-06 | 플로팅 피드백 버튼이 모든 (app) 레이아웃 페이지에 표시 | High | Pending |
| FR-07 | 피드백 제출 시 현재 페이지 경로 + 세션 시간 자동 첨부 | Medium | Pending |
| FR-08 | 주간 사용 요약 API: 활성 사용자 수, 페이지뷰, 완료 체크리스트, NPS 평균 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 초대 링크 생성 < 200ms | API 응답 시간 |
| Security | 초대 토큰 crypto.randomUUID, 72h 만료, 1회 사용 | 코드 리뷰 |
| UX | 비밀번호 설정 → 대시보드 진입 3분 이내 | E2E 테스트 |
| Accessibility | 피드백 위젯 키보드 접근 가능 | 수동 검증 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] F173 전체 플로우 E2E 테스트 통과 (초대 생성 → 링크 접속 → 비밀번호 설정 → 자동 로그인 → 투어 시작)
- [ ] F174 피드백 위젯 전역 렌더링 + 제출 API 연동 확인
- [ ] 기존 테스트 회귀 없음 (API 1029 + Web 74 + E2E ~55)
- [ ] typecheck + lint + build 통과
- [ ] Workers/Pages 프로덕션 배포 완료

### 4.2 Quality Criteria

- [ ] Match Rate ≥ 90% (PDCA Check 기준)
- [ ] 신규 테스트 추가 (API +15~20, Web +5~8, E2E +2~3)
- [ ] Zero lint errors
- [ ] Build succeeds

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 초대 토큰이 Slack 링크 프리뷰에서 노출 | Medium | Medium | 토큰을 URL fragment(`#token=xxx`)로 전달하여 서버 로그에 남기지 않음 |
| 비밀번호 설정 페이지가 로그인 미들웨어에 차단됨 | High | High | `/invite/[token]` 경로를 public route로 명시적 제외 |
| 피드백 위젯이 모바일에서 콘텐츠 가림 | Low | Medium | 하단 우측 고정 + 최소화 가능 + z-index 관리 |
| Sprint 49 미커밋 변경과 충돌 | Medium | Low | Sprint 49 먼저 커밋 후 Sprint 50 시작 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 모노리포 + Hono API + Next.js 14 + D1 아키텍처 유지.

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 초대 토큰 전달 | URL 복사 (이메일 X) | 내부 팀 6명 → Slack/카톡으로 직접 전달이 더 빠름. 이메일 서비스 도입은 외부 고객 시점으로 연기 |
| 비밀번호 설정 페이지 위치 | `/invite/[token]` (public route) | 인증 미들웨어 바깥, 토큰 기반 접근 |
| 피드백 위젯 구현 | Layout 컴포넌트에 전역 삽입 | `(app)/layout.tsx`에 `<FeedbackWidget />` 추가, Zustand 상태 관리 |
| 주간 요약 생성 | Cron Trigger 확장 | 기존 6시간 Cron(F160)에 주간 요약 로직 추가, 별도 Cron 불필요 |

### 6.3 구현 범위 (파일 수준)

```
packages/api/src/
├── routes/org.ts          # 초대 링크 URL 생성 엔드포인트 추가
├── routes/auth.ts         # POST /auth/setup-password 추가
├── routes/kpi.ts          # GET /kpi/weekly-summary 추가
├── services/org.ts        # 초대 토큰 URL 생성 + 만료 체크 로직
└── schemas/auth.ts        # setup-password 스키마 추가

packages/web/src/
├── app/invite/[token]/page.tsx         # 비밀번호 설정 페이지 (NEW)
├── app/(app)/layout.tsx                # FeedbackWidget 삽입
├── app/(app)/workspace/org/members/    # 초대 링크 복사 UI 개선
├── components/feature/FeedbackWidget.tsx  # 플로팅 피드백 위젯 (NEW)
└── lib/api-client.ts                   # setupPassword, submitContextFeedback 추가
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config, 3 custom rules)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Vitest + Playwright 테스트 인프라

### 7.2 Conventions to Define/Verify

| Category | Current State | Priority |
|----------|---------------|:--------:|
| Public route 관리 | middleware.ts에 하드코딩 | Medium — `/invite/[token]` 추가 필요 |
| Feedback context schema | 미정의 | Medium — 페이지 경로 + 세션 시간 포맷 |

### 7.3 Environment Variables

| Variable | Purpose | Scope | Status |
|----------|---------|-------|:------:|
| `NEXT_PUBLIC_API_URL` | API endpoint | Client | ✅ 기존 |
| `NEXT_PUBLIC_APP_URL` | 초대 링크 base URL | Client | NEW |

---

## 8. Next Steps

1. [ ] SPEC.md에 F173, F174 등록 (📋 → 🔧)
2. [ ] Design 문서 작성 (`sprint-50.design.md`)
3. [ ] Sprint 49 미커밋 변경 커밋 (선행 조건)
4. [ ] Workers/Pages 프로덕션 배포 (Sprint 48~49 코드 반영)
5. [ ] 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft | Sinclair Seo |
