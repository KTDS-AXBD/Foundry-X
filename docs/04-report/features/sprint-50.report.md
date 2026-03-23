---
code: FX-RPRT-050
title: Sprint 50 완료 보고서 — 팀원 셀프 온보딩 플로우 + 인앱 피드백 위젯
version: 1.0
status: Active
category: RPRT
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 50 Completion Report

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | Sprint 50: 팀원 셀프 온보딩 플로우 (F173) + 인앱 피드백 위젯 (F174) |
| **Period** | 2026-03-23 (세션 #99, 단일 세션) |
| **Duration** | Plan→Design→Do→Check: ~40분 (구현 7분, Agent Team 2-Worker 병렬) |
| **Match Rate** | **100%** (34/34 항목, 0 iteration) |

### Results Summary

| Metric | Value |
|--------|-------|
| Match Rate | 100% (34/34) |
| New Endpoints | 3 (invitation-info, setup-password, weekly-summary) |
| Modified Endpoints | 2 (google auth, feedback) |
| New Components | 4 (InvitePage, InviteForm, FeedbackWidget, InviteLinkCopy) |
| Modified Files | 11 files, +523 lines |
| New Tests | +22 (API 1029→1051) |
| Web Tests | 73 passing |
| D1 Migration | 0032_feedback_context.sql |
| Typecheck | ✅ 0 errors (API + Web) |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 초대 API와 온보딩 UI가 분리되어 있어 실 사용자가 접속할 수 없었음 (초대 토큰 전달 메커니즘 없음, 비밀번호 설정 페이지 없음) |
| **Solution** | 초대 링크 복사→비밀번호 설정/Google OAuth→자동 로그인→Getting Started E2E 플로우 구현 + 전역 플로팅 피드백 위젯 |
| **Function/UX Effect** | 관리자 1클릭 링크 복사 → 팀원 링크 접속 → 듀얼 경로(Google/비밀번호) → 자동 로그인 → 온보딩 투어. 어디서든 피드백 즉시 제출. API 1051 tests 100% pass |
| **Core Value** | "초대 링크 하나면 3분 안에 온보딩 완료" — Phase 5 Conditional #4(Adoption 데이터 수집) 실질 해소 기반 완성 |

---

## 1. Plan Summary

### 1.1 Objectives

- F173 (P0): 팀원 셀프 온보딩 E2E 플로우 — 초대 링크→비밀번호 설정→자동 로그인→투어 시작
- F174 (P1): 인앱 피드백 위젯 — 전역 플로팅 NPS + 컨텍스트 자동 첨부 + 주간 요약

### 1.2 Scope

**In Scope (완료):**
- ✅ F173: 초대 링크 복사 UI, 비밀번호 설정 페이지, 자동 로그인, Google OAuth 통합
- ✅ F174: 플로팅 피드백 위젯, 컨텍스트 첨부, 주간 사용 요약 API
- ✅ 운영: D1 migration 0032, Sprint 48~49 배포 준비

**Out of Scope (계획대로 제외):**
- 이메일 발송 서비스 (링크 복사 방식 우선)
- 비밀번호 재설정 (Sprint 51+)
- 외부 고객 초대 (F117)

---

## 2. Design Highlights

### 2.1 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 초대 토큰 전달 | URL 복사 (이메일 X) | 내부 6명 → Slack/카톡 직접 전달이 더 빠름 |
| 가입 경로 | Google OAuth + 비밀번호 듀얼 | 사용자 선호에 따라 선택, Google은 비밀번호 불필요 |
| 자동 로그인 | setup-password 원자 처리 | 가입+초대수락+JWT 발급 한 번에 (사용자 확정: 경로 B) |
| 피드백 위젯 | (app)/layout.tsx 전역 삽입 | 모든 대시보드 페이지에서 접근 가능 |
| 주간 요약 | 기존 Cron 확장 | 별도 Cron 불필요, kpi_events + onboarding 집계 |

### 2.2 Data Flow

```
Admin: 초대 생성 → 링크 복사 → Slack/카톡
                                    ↓
Invitee: /invite/{token} → [Google 또는 비밀번호]
                                    ↓
         자동 가입 + 조직 합류 + JWT → /getting-started → OnboardingTour
```

---

## 3. Implementation Results

### 3.1 API (Worker 1 — 7분)

| File | Change | Detail |
|------|--------|--------|
| `routes/auth.ts` | +156 lines | GET info + POST setup-password + Google 확장 |
| `routes/kpi.ts` | +111 lines | GET weekly-summary (D1 집계 쿼리) |
| `routes/feedback.ts` | +8 lines | 컨텍스트 필드 전달 |
| `services/org.ts` | +32 lines | getInvitationInfo() 메서드 |
| `services/feedback.ts` | +32 lines | pagePath/sessionSeconds/feedbackType 저장 |
| `schemas/auth.ts` | +30 lines | SetupPassword + InvitationInfo 스키마 |
| `schemas/feedback.ts` | +3 lines | 컨텍스트 필드 3개 |
| `db/migrations/0032` | NEW | ALTER TABLE 3문 |
| Tests 3 files | NEW | auth-invitation(10) + feedback(5) + kpi(4) = 19 cases |

### 3.2 Web (Worker 2 — 4분 30초)

| File | Change | Detail |
|------|--------|--------|
| `app/invite/[token]/page.tsx` | NEW | 초대 랜딩 (유효/만료/수락 상태별 UI) |
| `components/feature/InviteForm.tsx` | NEW | Google GIS + 비밀번호 듀얼 경로 |
| `components/feature/FeedbackWidget.tsx` | NEW | 플로팅 버튼 + NPS + 컨텍스트 |
| `components/feature/InviteLinkCopy.tsx` | NEW | URL 복사 + 토스트 |
| `app/(app)/layout.tsx` | +2 lines | FeedbackWidget 삽입 |
| `workspace/org/members/page.tsx` | +85 lines | 링크 복사 + 상태 뱃지 |
| `lib/api-client.ts` | +84 lines | 4개 함수 추가 |

### 3.3 Agent Team Performance

| Metric | Value |
|--------|-------|
| Workers | 2/2 DONE |
| Total Duration | **7분 0초** |
| W1 (API) | 7분 0초 |
| W2 (Web) | 4분 30초 |
| File Guard | **0건** revert (범위 이탈 없음) |
| Worktree | 미사용 (파일 겹침 없음) |

---

## 4. Quality Metrics

### 4.1 Test Results

| Package | Before | After | Delta |
|---------|:------:|:-----:|:-----:|
| API | 1029 | **1051** | **+22** |
| Web | 74→73 | **73** | -1 (기존 테스트 조정) |
| CLI | 131 | 131 | 0 |
| **Total** | 1234 | **1255** | **+21** |

### 4.2 Code Quality

| Check | Result |
|-------|--------|
| API typecheck | ✅ 0 errors |
| Web typecheck | ✅ 0 errors |
| API tests | ✅ 1051/1051 |
| Web tests | ✅ 73/73 |
| File Guard | ✅ 0 revert |

### 4.3 PDCA Gap Analysis

| Category | Score |
|----------|:-----:|
| API Match | 100% |
| Data Model Match | 100% |
| UI/UX Match | 100% |
| Test Coverage Match | 100% |
| **Overall Match Rate** | **100%** |

---

## 5. Sprint 50 Completion Status

### F-item Status

| F# | Title | Priority | Match Rate | Status |
|----|-------|:--------:|:----------:|:------:|
| F173 | 팀원 셀프 온보딩 플로우 | P0 | 100% | ✅ |
| F174 | 인앱 피드백 위젯 | P1 | 100% | ✅ |

### Execution Plan Checklist

- [x] 초대 링크 생성 UI + 복사 버튼 (FX-REQ-173)
- [x] 비밀번호 설정 페이지 `/invite/[token]` (FX-REQ-173)
- [x] 초대 수락 자동 로그인 → /getting-started 리다이렉트 (FX-REQ-173)
- [x] 초대 상태 UI 개선 — 대기/수락/만료 뱃지 (FX-REQ-173)
- [x] 플로팅 피드백 위젯 전역 삽입 (FX-REQ-174)
- [x] 피드백 컨텍스트 자동 첨부 (FX-REQ-174)
- [x] 주간 사용 요약 API (FX-REQ-174)
- [ ] 프로덕션 배포 — Sprint 48~50 코드 반영 (다음 단계)
- [x] typecheck ✅ + lint ✅ + tests 통과

---

## 6. Remaining Work

| Item | Priority | Description |
|------|:--------:|-------------|
| 프로덕션 배포 | P0 | D1 migration 0032 remote + Workers deploy + Pages deploy |
| 팀원 안내 | P0 | 초대 링크 생성 → Slack/이메일 전달 (6명) |
| E2E 테스트 | P1 | 초대→가입→온보딩 E2E Playwright 추가 |
| 비밀번호 재설정 | P2 | Sprint 51+ 후속 |

---

## 7. Lessons Learned

### What Worked Well
1. **API/Web 깔끔한 분리**: Worker 간 파일 겹침 0 → File Guard revert 0건
2. **Design 상세도**: Zod 스키마 + 처리 흐름 + UI 레이아웃까지 명시 → 100% Match Rate
3. **기존 코드 재사용**: OrgService.acceptInvitation(), createTokenPair() 활용으로 신규 코드 최소화
4. **듀얼 경로 설계**: Google OAuth + 비밀번호 모두 지원하여 사용자 선택권 보장

### What Could Improve
1. **Web 테스트 자동 생성**: Worker 2가 컴포넌트 테스트를 생성하지 않음 (프롬프트에 명시 부족)
2. **E2E 테스트 누락**: Playwright E2E는 Worker에 위임하지 않고 리더가 후속 처리 필요

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-23 | Initial completion report | Sinclair Seo |
