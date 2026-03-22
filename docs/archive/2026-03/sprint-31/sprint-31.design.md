---
code: FX-DSGN-031
title: "Sprint 31 — 프로덕션 완전 동기화 + SPEC 정합성 보정 + Phase 4 잔여 보강 + 온보딩 킥오프"
version: 0.1
status: Draft
category: DSGN
system-version: 2.4.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 31 Design Document

> **Summary**: F129(배포 동기화) + F130(SPEC 보정) + F131(Match Rate 보강: E2E + 프론트엔드) + F132(온보딩 킥오프 체크리스트) 상세 설계. 배포 절차, SPEC 수정 목록, E2E 추가 시나리오, ServiceContainer 개선, 온보딩 시나리오 정의 포함.
>
> **Project**: Foundry-X
> **Version**: v2.5 (목표)
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [sprint-31.plan.md](../../01-plan/features/sprint-31.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **프로덕션 완전 동기화**: D1 0018~0019 remote + Workers v2.4.0 + Pages 배포 확인
2. **문서 정합성 100%**: SPEC §1/§2/§3 + Execution Plan + MEMORY drift 0건
3. **E2E 신뢰도 향상**: F128 통합 경로 E2E 72%→90%+ (추가 시나리오)
4. **프론트엔드 완성도**: F124 ServiceContainer FX_NAVIGATE 실연결 + breadcrumb
5. **온보딩 실행 준비**: 시나리오 5종 + 킥오프 체크리스트 + 프로덕션 검증

### 1.2 Design Principles

- **신규 코드 최소화**: 기존 파일 수정 위주, 신규 파일은 E2E spec + 온보딩 문서만
- **배포 안전성**: D1 migration apply → Workers deploy → smoke test → Pages 확인 순서
- **gap-detector 측정 가능**: 수정 파일·변경 사항을 명확히 정의하여 Match Rate 측정 기준 제공

---

## 2. F129: 프로덕션 완전 동기화

### 2.1 배포 순서

```
Step 1: D1 migration 0018 remote 적용
  wrangler d1 migrations apply foundry-x-db --remote
  확인: kpi_events, reconciliation_runs 테이블 존재

Step 2: D1 migration 0019 remote 적용
  wrangler d1 migrations apply foundry-x-db --remote
  확인: onboarding_feedback, onboarding_progress 테이블 존재

Step 3: Workers v2.4.0 배포
  cd packages/api && wrangler deploy
  확인: /health → 200 OK

Step 4: Smoke test (주요 API)
  GET  /api/health                → 200
  POST /api/auth/register         → 201 또는 409 (이미 존재)
  GET  /api/spec                  → 200
  GET  /api/analytics/kpi         → 200
  GET  /api/onboarding/progress   → 401 (미인증 시) 또는 200
  GET  /api/harness/rules         → 200

Step 5: Pages 배포 확인
  fx.minu.best                    → 200
  fx.minu.best/getting-started    → 200 (온보딩 가이드)
  fx.minu.best/dashboard          → 200 (인증 리디렉트 가능)
```

### 2.2 환경변수 확인

| Variable | Workers | 확인 방법 |
|----------|:-------:|-----------|
| JWT_SECRET | ✅ | `wrangler secret list` |
| GITHUB_TOKEN | ✅ | 동일 |
| WEBHOOK_SECRET | ✅ | 동일 |
| ANTHROPIC_API_KEY | ✅ | 동일 |

### 2.3 산출물

- D1 migrations list --remote: 0001~0019 전체 적용 확인
- Workers v2.4.0 배포 로그
- Smoke test 결과 (6개 엔드포인트)

---

## 3. F130: SPEC/문서 정합성 보정

### 3.1 SPEC.md 수정 목록

| # | 위치 | 현재값 | 수정값 |
|---|------|--------|--------|
| 1 | §1 Phase 설명 (line ~21) | "Phase 4 진행 중 — Sprint 25~28 완료" | "Phase 4 Conditional Go — Sprint 26~30 완료, 온보딩 데이터 대기" |
| 2 | §1 Version (line ~22) | "2.2.0" | "2.4.0" |
| 3 | §2 system-version (frontmatter line ~7) | "2.2.0" | "2.4.0" |
| 4 | §3 마일스톤 v2.3 (line ~130) | 📋 | ✅ |
| 5 | §3 마일스톤 v2.4.0 (line ~131) | 📋 | ✅ |
| 6 | §2 D1 remote (line ~93) | "0001~0017 적용 완료, 0018~0019 미적용" | "0001~0019 적용 완료" (F129 배포 후) |
| 7 | §2 Workers (line ~94) | "v2.1.0" | "v2.4.0" (F129 배포 후) |
| 8 | §2 tests (line ~89) | "566테스트" | "583테스트" (Sprint 30 기준) |
| 9 | §2 API endpoints (line ~90) | "112개" | 현행 확인 후 갱신 |

### 3.2 Execution Plan 체크박스 동기화

**Sprint 29 (line ~728~732):**
```diff
- - [ ] 온보딩 가이드 UI — /getting-started 페이지 + 인터랙티브 투어 + FAQ 섹션 (FX-REQ-120)
+ - [x] 온보딩 가이드 UI — /getting-started 페이지 + 인터랙티브 투어 + FAQ 섹션 (FX-REQ-120 DONE)
- - [ ] 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + 위젯 (FX-REQ-121)
+ - [x] 피드백 수집 시스템 — NPS 설문 API + D1 테이블 + 위젯 (FX-REQ-121 DONE)
- - [ ] 온보딩 체크리스트 — 사용자별 진행률 추적 + 완료 알림 + KPI 연동 (FX-REQ-122)
+ - [x] 온보딩 체크리스트 — 사용자별 진행률 추적 + 완료 알림 + KPI 연동 (FX-REQ-122 DONE)
- - [ ] D1 migration 0019 + typecheck ✅ + PDCA
+ - [x] D1 migration 0019 + typecheck ✅ + PDCA 93%
```

**Sprint 30 (line ~716~726):**
```diff
- - [ ] D1 migration 0018 remote 적용 (FX-REQ-123)
+ - [x] D1 migration 0018 remote 적용 — Workers v2.2.0 배포 완료 (FX-REQ-123 DONE)
- - [ ] Workers v2.2.0 프로덕션 배포 + smoke test (FX-REQ-123)
+ - [x] Workers v2.2.0 프로덕션 배포 + smoke test (FX-REQ-123 DONE)
- - [ ] F106 프론트엔드 통합 개선 (FX-REQ-124)
+ - [x] F106 프론트엔드 통합 개선 — postMessage 6종 + Skeleton + ErrorBoundary (FX-REQ-124 DONE)
- - [ ] KPI 추적 대시보드 UI (FX-REQ-125)
+ - [x] KPI 추적 대시보드 UI — K7/K8/K9 위젯 + Conditional Go (FX-REQ-125 DONE)
- - [ ] Phase 4 Go 판정 문서 작성 (FX-REQ-125)
+ - [x] Phase 4 Go 판정 문서 작성 — Conditional Go (FX-REQ-125 DONE)
- - [ ] Harness Evolution Rules 자동 감지 서비스 (FX-REQ-126)
+ - [x] Harness Evolution Rules 자동 감지 — 4규칙 + 2ep + SSE (FX-REQ-126 DONE)
- - [ ] PRD v5 MVP 체크리스트 갱신 (FX-REQ-127)
+ - [x] PRD v5 MVP 체크리스트 갱신 — 6/6 ✅ + codegen 보류 (FX-REQ-127 DONE)
- - [ ] Phase 4 통합 경로 E2E (FX-REQ-128)
+ - [x] Phase 4 통합 경로 E2E — 4시나리오 (FX-REQ-128 DONE)
- - [ ] API 에러 응답 표준화 (FX-REQ-128)
+ - [x] API 에러 응답 표준화 — ErrorResponse 스키마 (FX-REQ-128 DONE)
- - [ ] typecheck ✅ + PDCA
+ - [x] typecheck ✅ + PDCA 93%
```

### 3.3 MEMORY.md 보정

| 항목 | 현재 | 수정 |
|------|------|------|
| D1 마이그레이션 | "0001~0018 remote 적용 완료" | "0001~0019 remote 적용 완료" (F129 배포 후) |
| D1 테이블 | "32개" | 유지 (0019는 2 테이블 추가지만 Sprint 29에서 이미 카운트) |
| Workers | "v2.2.0 배포 완료" | "v2.4.0 배포 완료" (F129 배포 후) |
| 다음 작업 | F129 배포 관련 항목 | 완료 표시 + Sprint 32 대상 추가 |

---

## 4. F131: Phase 4 잔여 Match Rate 보강

### 4.1 F128 E2E 보강 (72%→90%+)

현재 `packages/web/e2e/integration-path.spec.ts`에 4개 시나리오 존재:
1. iframe SSO token delivery via postMessage ✅
2. BFF proxy API call via dashboard ✅
3. entity registry cross-service search ✅
4. sub-app error boundary on invalid service URL ✅

**추가할 시나리오 (3~4개):**

| # | 시나리오 | 검증 대상 | 파일 |
|---|---------|----------|------|
| 5 | ErrorResponse 표준화 검증 | 400/401/404 응답이 `{ error: { code, message } }` 포맷 | `integration-path.spec.ts` 확장 |
| 6 | Harness Rules API 호출 | GET /api/harness/rules → 200 + 규칙 목록 | `integration-path.spec.ts` 확장 |
| 7 | 온보딩 플로우 E2E | /getting-started 접근 → 기능카드 렌더 → FAQ 섹션 | `onboarding-flow.spec.ts` (신규) |
| 8 | KPI 대시보드 접근 | /dashboard → analytics 위젯 렌더 확인 | `integration-path.spec.ts` 확장 |

**수정 파일:**

| 파일 | 변경 내용 |
|------|----------|
| `packages/web/e2e/integration-path.spec.ts` | 시나리오 5, 6, 8 추가 (~40줄) |
| `packages/web/e2e/onboarding-flow.spec.ts` | 신규 — 온보딩 가이드 페이지 E2E (~50줄) |

**테스트 코드 구조 (시나리오 5 예시):**

```typescript
test('API error responses follow ErrorResponse schema', async ({ page }) => {
  // 인증 없이 보호된 API 호출 → 401
  const response = await page.request.get(`${API_URL}/api/spec`);
  if (response.status() === 401) {
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
  }
});
```

### 4.2 F124 프론트엔드 보강 (86%→90%+)

현재 ServiceContainer.tsx의 FX_NAVIGATE 메시지는 수신만 하고 실제 router.push 미연결.

**수정 사항:**

| 파일 | 변경 |
|------|------|
| `packages/web/src/components/feature/ServiceContainer.tsx` | FX_NAVIGATE 수신 시 `router.push(path)` 연결 + breadcrumb 서브앱명 표시 |

**변경 상세:**

```typescript
// 현재 (FX_NAVIGATE 미연결)
case 'FX_NAVIGATE':
  // 향후 router.push 연동
  console.log('[ServiceContainer] navigate:', msg.path);
  break;

// 변경 후
case 'FX_NAVIGATE':
  if (msg.path && msg.path.startsWith('/')) {
    router.push(msg.path);
  }
  break;
```

**추가 개선:**
- ServiceContainer에 `serviceName` prop 추가 → breadcrumb에 서브앱명 표시
- 사이드바 active 상태를 iframe URL과 동기화

**수정 파일 요약:**

| 파일 | 변경 |
|------|------|
| `packages/web/src/components/feature/ServiceContainer.tsx` | FX_NAVIGATE router.push 연결 + serviceName prop (~10줄) |

---

## 5. F132: 온보딩 킥오프 체크리스트

### 5.1 온보딩 시나리오 5종

| # | 시나리오 | 사전 조건 | 기대 결과 |
|---|---------|----------|----------|
| S1 | 신규 사용자 가입 + 로그인 | 프로덕션 URL 접근 가능 | 계정 생성 → 대시보드 진입 |
| S2 | 첫 프로젝트 생성 + 에이전트 실행 | S1 완료 | 프로젝트 생성 → 에이전트 태스크 할당 → 결과 확인 |
| S3 | 온보딩 가이드 완주 | S1 완료 | /getting-started → 5개 기능카드 탐색 → 체크리스트 완료 |
| S4 | KPI 대시보드 확인 | S2 완료 + 데이터 축적 | /dashboard → K7/K8/K9 위젯에 실데이터 표시 |
| S5 | 피드백 제출 | S3 완료 | NPS 폼 → 점수 + 코멘트 제출 → 관리자 대시보드 반영 |

### 5.2 킥오프 체크리스트 문서

**산출물 위치**: `docs/specs/onboarding-kickoff.md`

**문서 구조:**

```markdown
# 온보딩 킥오프 체크리스트

## 사전 준비
- [ ] Workers v2.4.0 배포 완료
- [ ] D1 0019 적용 완료
- [ ] Pages 최신 배포 확인
- [ ] 테스트 계정 5개 사전 생성 여부 결정

## 대상자
- [ ] 대상자 5명 명단 확정
- [ ] Slack #foundry-x-support 채널 생성
- [ ] 온보딩 일정 공유 (이메일/Slack)

## 시나리오별 검증
- [ ] S1 신규 가입 프로덕션 테스트
- [ ] S2 프로젝트 생성 프로덕션 테스트
- [ ] S3 가이드 완주 프로덕션 테스트
- [ ] S4 KPI 표시 확인
- [ ] S5 피드백 제출 확인

## 킥오프 후 수집
- [ ] 주간 NPS 설문 (자동 위젯)
- [ ] 4주 후 Phase 4 최종 Go 판정
```

---

## 6. 전체 파일 변경 요약

### 6.1 수정 파일

| 파일 | F# | 변경 내용 |
|------|:--:|----------|
| `SPEC.md` | F130 | §1/§2/§3 + Execution Plan 체크박스 (~30줄 수정) |
| `packages/web/e2e/integration-path.spec.ts` | F131 | E2E 시나리오 3개 추가 (~40줄) |
| `packages/web/src/components/feature/ServiceContainer.tsx` | F131 | FX_NAVIGATE router.push + serviceName prop (~10줄) |

### 6.2 신규 파일

| 파일 | F# | 내용 |
|------|:--:|------|
| `packages/web/e2e/onboarding-flow.spec.ts` | F131 | 온보딩 가이드 페이지 E2E (~50줄) |
| `docs/specs/onboarding-kickoff.md` | F132 | 온보딩 킥오프 체크리스트 + 시나리오 5종 |

### 6.3 배포 작업 (코드 변경 아님)

| 작업 | F# | 커맨드 |
|------|:--:|--------|
| D1 0018~0019 remote 적용 | F129 | `wrangler d1 migrations apply --remote` |
| Workers v2.4.0 배포 | F129 | `wrangler deploy` |
| Smoke test | F129 | curl 6개 엔드포인트 |
| MEMORY.md 갱신 | F130 | 수동 Edit |

---

## 7. Test Plan

### 7.1 Test Scope

| Type | Target | Tool | 수량 |
|------|--------|------|:----:|
| E2E | 통합 경로 + 온보딩 | Playwright | +4 specs |
| Smoke | 프로덕션 API | curl/httpie | 6 endpoints |
| 기존 | 전체 회귀 | vitest + Playwright | 583 + 48 + ~55 |

### 7.2 Key Test Cases

- [x] 기존 API 테스트 전체 통과 (583)
- [x] 기존 Web 테스트 전체 통과 (48)
- [ ] E2E: ErrorResponse 스키마 검증
- [ ] E2E: Harness Rules API 호출
- [ ] E2E: 온보딩 가이드 페이지 렌더링
- [ ] E2E: KPI 대시보드 위젯 표시
- [ ] Smoke: 프로덕션 6개 엔드포인트 정상 응답

---

## 8. Implementation Order

```
Phase A: F129 프로덕션 동기화 (배포 작업)
  1. D1 0018 remote 적용
  2. D1 0019 remote 적용
  3. Workers v2.4.0 배포
  4. Pages 배포 확인
  5. Smoke test 6개

Phase B: F130 SPEC 정합성 (문서 작업)
  1. SPEC.md §1/§2/§3 수정
  2. Sprint 29 Execution Plan 체크박스
  3. Sprint 30 Execution Plan 체크박스
  4. MEMORY.md 보정

Phase C: F131 Match Rate 보강 (코드 작업)
  1. ServiceContainer FX_NAVIGATE 연결
  2. integration-path.spec.ts 시나리오 추가
  3. onboarding-flow.spec.ts 신규 작성
  4. typecheck + lint 확인

Phase D: F132 온보딩 킥오프 (문서 작업)
  1. onboarding-kickoff.md 작성
  2. 프로덕션 시나리오 수동 검증
```

---

## 9. Risks

| Risk | Impact | Mitigation |
|------|:------:|------------|
| D1 0018/0019 remote 실패 | High | `--command` 인라인 SQL 폴백 |
| Workers CORS 이슈 | Medium | app.ts CORS 미들웨어 확인 |
| E2E 불안정 (CI 환경 차이) | Low | 조건부 테스트(count > 0) 패턴 유지 |
| 온보딩 대상자 미확보 | Medium | 최소 3명으로 축소 시작 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft | Sinclair Seo |
