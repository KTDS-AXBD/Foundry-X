---
code: FX-PLAN-026
title: Sprint 23 — 테스트 커버리지 확장 (E2E 멀티테넌시 + GitHub/Slack 흐름 + API 보강)
version: 1.0
status: Draft
category: PLAN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F97
req: FX-REQ-097
priority: P2
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F97: 테스트 커버리지 확장 — E2E (멀티테넌시, GitHub/Slack 흐름) + API 보강 |
| 시작일 | 2026-03-19 |
| 예상 범위 | Sprint 23 (E2E +8~10 specs + API +20~30건 + fixture 확장) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Sprint 18~22에서 멀티테넌시(16 endpoints), GitHub 양방향 동기화, Slack interactive 등 핵심 기능을 구현했지만, E2E 검증이 전혀 없고 API 테스트도 org 4/16 endpoints만 커버하여 프로덕션 배포 시 회귀 리스크가 높음 |
| **Solution** | Playwright E2E에 멀티테넌시(org 전환/멤버 관리), GitHub(PR 리뷰/webhook), Slack(interactive 버튼/알림 설정) 흐름 테스트를 추가하고, API 테스트에서 org 멤버 관리/초대 + GitHub webhook + Slack config 엣지 케이스를 보강 |
| **Function UX Effect** | CI에서 org 전환→에이전트 실행→PR 자동 리뷰→Slack 알림까지의 전체 사용자 흐름이 자동 검증되어, 코드 변경 시 즉시 회귀 감지 가능 |
| **Core Value** | 프로덕션 배포 전 핵심 비즈니스 흐름의 자동 검증 안전망을 확보하여, Sprint 20~22 코드의 v1.8.1 배포 신뢰도를 높임 |

## 1. 배경 및 목표

### 1.1 현재 테스트 현황

| 영역 | 파일 수 | 테스트 수 | 커버리지 상태 |
|------|:-------:|:---------:|:-------------:|
| API 단위 | 60 | 471 | ✅ 양호 |
| CLI 단위 | — | 106 | ✅ 안정 |
| Web 단위 | — | 48 | ✅ 기본 |
| E2E (로컬) | 10 | 27 | ⚠️ 기본 흐름만 |
| E2E (프로덕션) | 2 | 9 | ✅ smoke + critical path |
| **합계** | — | **661** (E2E 포함) | — |

### 1.2 E2E 커버리지 갭 분석

| 기능 영역 | API 테스트 | E2E 테스트 | 갭 |
|-----------|:----------:|:----------:|:---:|
| 랜딩/대시보드 | ✅ | ✅ | — |
| 에이전트 실행 | ✅ | ✅ | — |
| 인증 (로그인) | ✅ | ✅ | — |
| Spec Generator | ✅ | ✅ | — |
| MCP 서버 | ✅ | ✅ | — |
| AgentInbox 스레드 | ✅ | ✅ | — |
| **멀티테넌시 (org)** | ⚠️ 4/16 ep | ❌ 없음 | 🔴 |
| **GitHub 동기화** | ✅ 5 files | ❌ 없음 | 🔴 |
| **Slack interactive** | ✅ 2 files | ❌ 없음 | 🔴 |
| org 멤버 관리/초대 | ❌ 없음 | ❌ 없음 | 🔴 |
| 토큰 관리 | ✅ | ❌ 없음 | 🟡 |

### 1.3 Sprint 23 목표

1. **E2E 멀티테넌시**: org 생성→전환→멤버 초대→역할 기반 접근 제어 흐름 검증
2. **E2E GitHub 연동**: PR 리뷰 트리거→결과 표시, webhook 수신→Task 생성 흐름 검증
3. **E2E Slack 연동**: 알림 설정 CRUD, interactive 버튼 응답 흐름 검증
4. **API 보강**: org 멤버 관리(8 endpoints), 초대(4 endpoints), Slack config 엣지 케이스
5. **Fixture 확장**: `orgContext` fixture 추가 — authenticatedPage + org 생성/전환 통합

## 2. 구현 범위

### 2.1 E2E 테스트 추가 (Playwright)

#### E2E-01: 멀티테넌시 org 흐름 (`e2e/org-management.spec.ts`)

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| 1 | org 생성 폼 → 성공 메시지 | POST /api/orgs 호출, org 목록에 표시 |
| 2 | org 전환 (OrgSwitcher) | 대시보드 헤더에 선택 org 표시 |
| 3 | org 설정 페이지 접근 (owner) | 설정 폼 렌더링, 수정 가능 |
| 4 | org 설정 접근 거부 (member) | 403 또는 redirect |

#### E2E-02: 멀티테넌시 멤버 관리 (`e2e/org-members.spec.ts`)

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| 1 | 멤버 목록 표시 | GET /api/orgs/:orgId/members |
| 2 | 멤버 초대 (이메일) | POST /api/orgs/:orgId/invitations |
| 3 | 초대 수락 흐름 | POST /api/orgs/:orgId/invitations/:id/accept |
| 4 | 역할 변경 (owner→admin) | PATCH /api/orgs/:orgId/members/:userId |

#### E2E-03: GitHub 연동 흐름 (`e2e/github-integration.spec.ts`)

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| 1 | GitHub 설정 페이지 렌더링 | 토큰 입력 폼, 연동 상태 표시 |
| 2 | PR 리뷰 트리거 → 결과 표시 | POST /api/github/pr/:prNumber/review 호출 |

> **범위 제한**: 실제 GitHub API 호출은 mock. webhook 수신 E2E는 API 테스트로 대체.

#### E2E-04: Slack 알림 설정 (`e2e/slack-settings.spec.ts`)

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| 1 | Slack 알림 설정 페이지 렌더링 | 5개 카테고리 토글 표시 |
| 2 | 카테고리별 webhook 설정 | PUT /api/orgs/:orgId/slack/configs/:category |
| 3 | 설정 삭제 | DELETE /api/orgs/:orgId/slack/configs/:category |

#### E2E-05: 토큰 관리 (`e2e/token-management.spec.ts`)

| # | 테스트 케이스 | 검증 포인트 |
|---|-------------|------------|
| 1 | API 토큰 생성 | POST /api/tokens, 토큰 값 표시 |
| 2 | 토큰 목록 + 삭제 | GET + DELETE /api/tokens/:id |

### 2.2 API 테스트 보강

#### API-01: org 멤버 관리 보강 (`__tests__/org-members.test.ts` 신규)

| # | 테스트 케이스 | 대상 endpoint |
|---|-------------|--------------|
| 1 | 멤버 목록 조회 | GET /api/orgs/:orgId/members |
| 2 | 멤버 역할 변경 (owner→admin, admin→member) | PATCH /api/orgs/:orgId/members/:userId |
| 3 | 멤버 제거 (owner만 가능) | DELETE /api/orgs/:orgId/members/:userId |
| 4 | 비멤버의 멤버 목록 접근 거부 | GET → 403 |
| 5 | 자기 자신 제거 불가 | DELETE → 400 |
| 6 | owner 역할 양도 | PATCH role=owner (기존 owner→admin 전환) |

#### API-02: org 초대 흐름 (`__tests__/org-invitations.test.ts` 신규)

| # | 테스트 케이스 | 대상 endpoint |
|---|-------------|--------------|
| 1 | 초대 생성 (admin+) | POST /api/orgs/:orgId/invitations |
| 2 | 초대 목록 조회 | GET /api/orgs/:orgId/invitations |
| 3 | 초대 수락 | POST /api/orgs/:orgId/invitations/:id/accept |
| 4 | 초대 거절 | POST /api/orgs/:orgId/invitations/:id/reject |
| 5 | 중복 초대 방지 | POST → 409 |
| 6 | member 권한으로 초대 시도 → 403 | roleGuard 검증 |

#### API-03: Slack config 엣지 케이스 (`__tests__/slack-config.test.ts` 확장)

| # | 테스트 케이스 | 비고 |
|---|-------------|------|
| 1 | 존재하지 않는 카테고리 → 400 | Zod enum 검증 |
| 2 | webhook_url 형식 검증 (https:// 필수) | URL validation |
| 3 | 비멤버의 config 접근 → 403 | roleGuard |
| 4 | enabled=false config → 알림 미발송 확인 | SSE→Slack 라우팅 |

#### API-04: GitHub webhook 엣지 케이스 (`__tests__/webhook-extended.test.ts` 신규)

| # | 테스트 케이스 | 비고 |
|---|-------------|------|
| 1 | signature 누락 → 401 | HMAC 검증 |
| 2 | signature 불일치 → 401 | 변조 감지 |
| 3 | 지원하지 않는 이벤트 타입 → 200 (무시) | graceful skip |
| 4 | Issue→Task 자동 생성 + 중복 방지 | idempotency |

### 2.3 Fixture 확장

#### orgContext fixture (`e2e/fixtures/org.ts`)

```typescript
// authenticatedPage를 확장하여 org 컨텍스트 추가
// 1. 로그인 (기존 authenticatedPage)
// 2. org 생성 (POST /api/orgs)
// 3. orgId를 localStorage에 저장 (fx-org-id)
// 4. page + orgId를 반환
```

- 기존 `authenticatedPage` fixture를 상속
- 멀티테넌시 E2E에서 공통으로 사용
- org 정리(teardown)는 테스트 격리를 위해 매 테스트마다 새 org 생성

## 3. 요구사항

### 3.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|:--------:|:----:|
| FR-01 | E2E 멀티테넌시 org CRUD + 전환 검증 | High | Pending |
| FR-02 | E2E 멀티테넌시 멤버 관리 + 초대 흐름 검증 | High | Pending |
| FR-03 | E2E GitHub 설정 + PR 리뷰 트리거 검증 | Medium | Pending |
| FR-04 | E2E Slack 알림 설정 CRUD 검증 | Medium | Pending |
| FR-05 | E2E 토큰 관리 검증 | Low | Pending |
| FR-06 | API org 멤버 관리 12 테스트 | High | Pending |
| FR-07 | API org 초대 흐름 6 테스트 | High | Pending |
| FR-08 | API Slack config 엣지 케이스 4 테스트 | Medium | Pending |
| FR-09 | API GitHub webhook 엣지 케이스 4 테스트 | Medium | Pending |
| FR-10 | orgContext Playwright fixture | High | Pending |

### 3.2 비기능 요구사항

| 카테고리 | 기준 | 검증 방법 |
|----------|------|-----------|
| 안정성 | E2E flaky rate < 5% | 3회 연속 실행 |
| 속도 | E2E 전체 < 60초 (로컬) | `pnpm e2e` 실행 시간 |
| 격리 | 테스트 간 상태 누출 없음 | 병렬 실행 확인 |

## 4. 성공 기준

### 4.1 Definition of Done

- [ ] E2E 테스트 +14 케이스 이상 추가 (5개 spec 파일)
- [ ] API 테스트 +26건 이상 추가 (4개 test 파일)
- [ ] orgContext fixture 구현
- [ ] 전체 E2E 통과 (`pnpm e2e`)
- [ ] 전체 API 테스트 통과 (`pnpm test`)
- [ ] typecheck 통과

### 4.2 품질 기준

- [ ] E2E flaky rate 0% (3회 연속 통과)
- [ ] 기존 테스트 회귀 없음
- [ ] lint 0 error

## 5. 리스크 및 완화

| 리스크 | 영향 | 가능성 | 완화 |
|--------|:----:|:------:|------|
| E2E에서 org API mock 복잡도 | Medium | Medium | authenticatedPage fixture 확장으로 실 API 호출, mock 최소화 |
| GitHub/Slack E2E에서 외부 API 의존 | High | High | API 레벨에서 mock, E2E는 UI 렌더링+내부 API 호출만 검증 |
| 테스트 실행 시간 증가 | Low | Medium | Playwright 병렬 실행 (workers: 4) 유지 |
| D1 mock 복잡도 (org + member + invitation) | Medium | Medium | 기존 mock-d1.ts 확장, 테이블 초기화 헬퍼 추가 |

## 6. 구현 순서

```
Phase 1: Fixture + API 보강 (선행)
├── orgContext fixture 구현
├── API-01: org 멤버 관리 테스트
├── API-02: org 초대 흐름 테스트
└── mock-d1.ts 헬퍼 확장

Phase 2: E2E 멀티테넌시
├── E2E-01: org 관리 흐름
└── E2E-02: 멤버 관리 흐름

Phase 3: E2E 외부 도구 + API 엣지
├── E2E-03: GitHub 연동
├── E2E-04: Slack 설정
├── E2E-05: 토큰 관리
├── API-03: Slack config 엣지
└── API-04: GitHub webhook 엣지
```

## 7. 예상 산출물

| 산출물 | 경로 | 비고 |
|--------|------|------|
| E2E: org 관리 | `packages/web/e2e/org-management.spec.ts` | 4 케이스 |
| E2E: 멤버 관리 | `packages/web/e2e/org-members.spec.ts` | 4 케이스 |
| E2E: GitHub | `packages/web/e2e/github-integration.spec.ts` | 2 케이스 |
| E2E: Slack | `packages/web/e2e/slack-settings.spec.ts` | 3 케이스 |
| E2E: 토큰 | `packages/web/e2e/token-management.spec.ts` | 2 케이스 |
| Fixture | `packages/web/e2e/fixtures/org.ts` | orgContext |
| API: org 멤버 | `packages/api/src/__tests__/org-members.test.ts` | 6 케이스 |
| API: org 초대 | `packages/api/src/__tests__/org-invitations.test.ts` | 6 케이스 |
| API: Slack 확장 | `packages/api/src/__tests__/slack-config.test.ts` | +4 케이스 |
| API: webhook 확장 | `packages/api/src/__tests__/webhook-extended.test.ts` | 4 케이스 |

**예상 테스트 증가**: E2E +15건, API +20건 → 총 696건 (현재 661건 → +35건)

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 1.0 | 2026-03-19 | 초안 — F97 테스트 커버리지 확장 Plan | Sinclair Seo |
